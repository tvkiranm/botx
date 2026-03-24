import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import yaml from "js-yaml";
import crypto from "crypto";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";

type IngestItem = {
  id?: string;
  text: string;
  source?: string;
  name?: string;
};

type IngestRequest = {
  apiKey?: string;
  items?: IngestItem[];
  namespace?: string;
  text?: string;
  source?: string;
  name?: string;
};

type DocumentItem = {
  text: string;
  source?: string;
  name?: string;
};

type StoredDocuments = {
  config?: {
    theme?: { primaryColor?: string };
    welcomeMessage?: string;
  };
  items?: DocumentItem[];
};

const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndex = process.env.PINECONE_INDEX;

const groqApiKey = process.env.GROQ_API_KEY;

function chunkText(text: string, size = 900, overlap = 120) {
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    const slice = text.slice(index, index + size);
    chunks.push(slice.trim());
    index += size - overlap;
  }
  return chunks.filter(Boolean);
}

async function createEmbedding(input: string) {
  if (!groqApiKey) {
    throw new Error("Groq API key not configured for embeddings.");
  }
  return null;
}

async function extractTextFromFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    try {
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.mjs",
          import.meta.url
        ).toString();
      }

      const loadingTask = (pdfjs as any).getDocument({
        data: new Uint8Array(buffer),
        disableWorker: true,
        useWorkerFetch: false,
        isEvalSupported: false,
      });

      const pdf = await loadingTask.promise;
      let text = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: { str?: string }) => (item.str ? item.str : ""))
          .join(" ");
        text += `${pageText}\n\n`;
        await page.cleanup();
      }
      await pdf.destroy();
      return text.trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown PDF error";
      throw new Error(`PDF extraction failed: ${message}`);
    }
  }

  if (ext === "xlsx") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [];
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const text = rows
        .map((row) => (Array.isArray(row) ? row.join(" ") : ""))
        .filter(Boolean)
        .join("\n");
      if (text) {
        parts.push(`Sheet: ${sheetName}\n${text}`);
      }
    });
    return parts.join("\n\n");
  }

  if (ext === "yml" || ext === "yaml") {
    const parsed = yaml.load(buffer.toString("utf8"));
    return JSON.stringify(parsed, null, 2);
  }

  return buffer.toString("utf8");
}

function normalizeStoredDocuments(documents: unknown): StoredDocuments {
  if (!documents) return {};
  if (Array.isArray(documents)) {
    return { items: documents as DocumentItem[] };
  }
  if (typeof documents === "object") {
    return documents as StoredDocuments;
  }
  return {};
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  try {
    let apiKey = "";
    let items: IngestItem[] = [];
    let namespace: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      apiKey = String(form.get("apiKey") || "").trim();
      namespace = String(form.get("namespace") || "").trim() || undefined;
      const file = form.get("file");
      console.log("File-->" , file)
      if (file && file instanceof File) {
        const text = await extractTextFromFile(file);
        const chunks = chunkText(text);
        items = chunks.map((chunk, index) => ({
          id: `${file.name}-${index}`,
          text: chunk,
          source: file.name,
          name: file.name,
        }));
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as IngestRequest;
      apiKey = body.apiKey?.trim() ?? "";
      namespace = body.namespace?.trim() || undefined;
      if (body.text) {
        const chunks = chunkText(body.text);
        items = chunks.map((chunk, index) => ({
          id: `text-${index}`,
          text: chunk,
          source: body.source,
          name: body.name,
        }));
      } else {
        items = body.items ?? [];
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { status: "error", message: "apiKey is required." },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        { status: "error", message: "No content to ingest." },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { apiKey },
    });

    if (!organization) {
      return NextResponse.json(
        { status: "error", message: "Invalid API key." },
        { status: 401 }
      );
    }

    const resolvedNamespace = namespace || `org_${organization.id}`;

    const existing = await prisma.chatbotData.findFirst({
      where: { organizationId: organization.id },
    });

    const stored = normalizeStoredDocuments(existing?.documents);
    const newDocs: DocumentItem[] = items.map((item) => ({
      text: item.text,
      source: item.source,
      name: item.name,
    }));

    const updatedDocs: StoredDocuments = {
      ...stored,
      items: [...(stored.items ?? []), ...newDocs],
    };

    if (existing) {
      await prisma.chatbotData.update({
        where: { id: existing.id },
        data: { documents: updatedDocs },
      });
    } else {
      await prisma.chatbotData.create({
        data: {
          organizationId: organization.id,
          documents: updatedDocs,
        },
      });
    }

    const canEmbed =
      pineconeApiKey && pineconeIndex && groqApiKey;

    if (canEmbed) {
      const pinecone = new Pinecone({ apiKey: pineconeApiKey! });
      const index = pinecone.index(pineconeIndex!);
      const vectors = [] as Array<{
        id: string;
        values: number[];
        metadata?: { text: string; source?: string; name?: string };
      }>;

      for (const item of items) {
        if (!item.text) continue;
        const values = await createEmbedding(item.text);
        if (!values) continue;
        vectors.push({
          id: item.id || crypto.randomBytes(8).toString("hex"),
          values,
          metadata: { text: item.text, source: item.source, name: item.name },
        });
      }

      if (vectors.length) {
        await index.namespace(resolvedNamespace).upsert(vectors);
      }
    }

    return NextResponse.json({
      status: "ok",
      ingested: items.length,
      namespace: resolvedNamespace,
      vectorized: Boolean(canEmbed),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
