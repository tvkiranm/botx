import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Pinecone } from "@pinecone-database/pinecone";
import { Groq } from "groq-sdk";

type ChatRequest = {
  apiKey?: string;
  message?: string;
};

type FaqItem = {
  question?: string;
  answer?: string;
  q?: string;
  a?: string;
  keywords?: string[];
};

type ChatbotDataPayload = {
  faqs?: unknown;
  documents?: unknown;
};

type DocumentItem = {
  text?: string;
  source?: string;
  name?: string;
};

const groqApiKey = process.env.GROQ_API_KEY;
const groqChatModel = process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";

const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndex = process.env.PINECONE_INDEX;

const DEFAULT_FALLBACK_MESSAGE =
  "I don't have that information right now. Please contact support.";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

async function createEmbedding(input: string) {
  return null;
}

function normalizeFaqs(input: unknown): FaqItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const faq = item as FaqItem;
      const question = faq.question ?? faq.q;
      const answer = faq.answer ?? faq.a;
      if (!question || !answer) return null;
      return {
        question: String(question),
        answer: String(answer),
        keywords: Array.isArray(faq.keywords)
          ? faq.keywords.map((k) => String(k))
          : undefined,
      };
    })
    .filter(Boolean) as FaqItem[];
}

function matchFaq(message: string, faqs: FaqItem[]) {
  const needle = message.toLowerCase();
  for (const faq of faqs) {
    const question = faq.question?.toLowerCase() ?? "";
    if (question && needle.includes(question)) {
      return faq.answer ?? null;
    }

    if (faq.keywords && faq.keywords.length > 0) {
      const hit = faq.keywords.some((kw) =>
        needle.includes(String(kw).toLowerCase())
      );
      if (hit) {
        return faq.answer ?? null;
      }
    }
  }
  return null;
}

async function createChatCompletion(input: string, context: string) {
  if (!groq) {
    throw new Error("Groq API key not configured.");
  }

  const chatCompletion = await groq.chat.completions.create({
    model: groqChatModel,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant for an AI chatbot SaaS. Answer using only the provided context. If the answer is not in the context, say you don't have that information.",
      },
      {
        role: "user",
        content: `Context:\n${context || "No context found."}\n\nQuestion: ${input}`,
      },
    ],
    temperature: 0.2,
  });

  const reply = chatCompletion.choices?.[0]?.message?.content;
  return reply || DEFAULT_FALLBACK_MESSAGE;
}

function extractDocuments(documents: unknown): DocumentItem[] {
  if (!documents) return [];
  if (Array.isArray(documents)) {
    return documents as DocumentItem[];
  }
  if (typeof documents === "object") {
    const doc = documents as { items?: DocumentItem[] };
    return Array.isArray(doc.items) ? doc.items : [];
  }
  return [];
}

function rankDocuments(message: string, docs: DocumentItem[]) {
  const needle = message.toLowerCase();
  return docs
    .map((doc) => {
      const text = doc.text ?? "";
      if (!text) return { doc, score: 0 };
      const haystack = text.toLowerCase();
      const score = needle
        .split(/\s+/)
        .filter(Boolean)
        .reduce((acc, word) => (haystack.includes(word) ? acc + 1 : acc), 0);
      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.doc);
}

function buildContext(faqs: FaqItem[], documents: unknown, message: string) {
  const faqText = faqs
    .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join("\n\n");

  const docs = extractDocuments(documents);
  const ranked = rankDocuments(message, docs).slice(0, 5);
  const selected = ranked.length ? ranked : docs.slice(0, 3);
  const docsText = selected
    .map((doc, idx) => {
      const header = doc.name || doc.source ? `Document ${idx + 1}` : "";
      const source = doc.source ? `Source: ${doc.source}` : "";
      return [header, source, doc.text].filter(Boolean).join("\n");
    })
    .join("\n\n");

  return [faqText, docsText].filter(Boolean).join("\n\n");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ChatRequest;
  const apiKey = body.apiKey?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!apiKey || !message) {
    return withCors(
      NextResponse.json(
        { reply: "apiKey and message are required.", status: "error" },
        { status: 400 }
      )
    );
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { apiKey },
    });

    if (!organization) {
      return withCors(
        NextResponse.json(
          { reply: "Invalid API key.", status: "error" },
          { status: 401 }
        )
      );
    }

    const chatbotData = await prisma.chatbotData.findFirst({
      where: { organizationId: organization.id },
    });

    const payload = (chatbotData ?? {}) as ChatbotDataPayload;
    const faqs = normalizeFaqs(payload.faqs);

    const matchedAnswer = matchFaq(message, faqs);
    if (matchedAnswer) {
      return withCors(NextResponse.json({ reply: matchedAnswer, status: "ok" }));
    }

    let context = buildContext(faqs, payload.documents, message);

    const reply = await createChatCompletion(message, context);

    return withCors(NextResponse.json({ reply, status: "ok" }));
  } catch (error) {
    console.error("/api/chat error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return withCors(
      NextResponse.json(
        { reply: message || DEFAULT_FALLBACK_MESSAGE, status: "error" },
        { status: 500 }
      )
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
