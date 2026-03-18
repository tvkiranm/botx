import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

type IngestItem = {
  id: string;
  text: string;
  source?: string;
};

type IngestRequest = {
  items?: IngestItem[];
  namespace?: string;
};

const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndex = process.env.PINECONE_INDEX;
const pineconeNamespace = process.env.PINECONE_NAMESPACE || "default";

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiBaseUrl =
  process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL;
const geminiEmbeddingDim = process.env.GEMINI_EMBEDDING_DIM;

function normalizeModel(model: string) {
  return model.startsWith("models/") ? model : `models/${model}`;
}

async function createEmbedding(input: string) {
  if (!geminiApiKey || !geminiEmbeddingModel) {
    throw new Error("Gemini embeddings not configured.");
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

  const vector = data.embedding?.values;
  if (!vector) {
    throw new Error("Gemini embeddings returned no vector.");
  }

  return vector;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as IngestRequest;
  const items = body.items ?? [];
  const namespace = body.namespace?.trim() || pineconeNamespace;

  if (!pineconeApiKey || !pineconeIndex) {
    return NextResponse.json(
      {
        status: "error",
        message: "Pinecone is not configured. Add PINECONE_API_KEY and PINECONE_INDEX.",
      },
      { status: 500 }
    );
  }

  if (!geminiApiKey || !geminiEmbeddingModel) {
    return NextResponse.json(
      {
        status: "error",
        message: "Gemini embeddings are not configured.",
      },
      { status: 500 }
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { status: "error", message: "items[] is required." },
      { status: 400 }
    );
  }

  try {
    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    const index = pinecone.index(pineconeIndex);

    const vectors = [] as Array<{
      id: string;
      values: number[];
      metadata?: { text: string; source?: string };
    }>;

    for (const item of items) {
      if (!item.id || !item.text) {
        throw new Error("Each item requires id and text.");
      }
      const values = await createEmbedding(item.text);
      vectors.push({
        id: item.id,
        values,
        metadata: { text: item.text, source: item.source },
      });
    }

    await index.namespace(namespace).upsert(vectors);

    return NextResponse.json({ status: "ok", upserted: vectors.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
