import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Pinecone } from "@pinecone-database/pinecone";

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

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiBaseUrl =
  process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
const geminiChatModel =
  process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash";
const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL;
const geminiEmbeddingDim = process.env.GEMINI_EMBEDDING_DIM;

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

function normalizeModel(model: string) {
  return model.startsWith("models/") ? model : `models/${model}`;
}

async function createEmbedding(input: string) {
  if (!geminiApiKey || !geminiEmbeddingModel) {
    return null;
  }

  const outputDimensionality = geminiEmbeddingDim
    ? Number.parseInt(geminiEmbeddingDim, 10)
    : undefined;

  if (geminiEmbeddingDim && Number.isNaN(outputDimensionality)) {
    throw new Error("GEMINI_EMBEDDING_DIM must be a number.");
  }

  const response = await fetch(
    `${geminiBaseUrl}/v1beta/${normalizeModel(geminiEmbeddingModel)}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        content: {
          parts: [{ text: input }],
        },
        ...(outputDimensionality ? { outputDimensionality } : {}),
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini embeddings failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    embedding?: { values?: number[] };
  };

  return data.embedding?.values ?? null;
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
  if (!geminiApiKey) {
    throw new Error("Gemini API key not configured.");
  }

  const response = await fetch(
    `${geminiBaseUrl}/v1beta/${normalizeModel(geminiChatModel)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  "You are a helpful assistant for an AI chatbot SaaS. Answer using only the provided context. If the answer is not in the context, say you don't have that information.",
              },
              {
                text: `Context:\n${context || "No context found."}\n\nQuestion: ${input}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini chat failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
    const sources: string[] = [];

    const canVectorSearch =
      pineconeApiKey && pineconeIndex && geminiApiKey && geminiEmbeddingModel;

    if (canVectorSearch) {
      const vector = await createEmbedding(message);
      if (vector) {
        const pinecone = new Pinecone({ apiKey: pineconeApiKey! });
        const index = pinecone.index(pineconeIndex!);
        const namespace = `org_${organization.id}`;
        const result = await index.namespace(namespace).query({
          vector,
          topK: 5,
          includeMetadata: true,
        });
        const matches = result.matches ?? [];
        const vectorText = matches
          .map((match) => {
            const meta = match.metadata as { text?: string; source?: string };
            if (meta?.source) sources.push(meta.source);
            return meta?.text;
          })
          .filter(Boolean)
          .join("\n\n");
        if (vectorText) {
          context = [context, vectorText].filter(Boolean).join("\n\n");
        }
      }
    }

    const reply = await createChatCompletion(message, context);

    return withCors(NextResponse.json({ reply, sources, status: "ok" }));
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
