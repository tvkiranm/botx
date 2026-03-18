import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ChatbotConfig = {
  name: string;
  theme: {
    primaryColor: string;
  };
  welcomeMessage: string;
};

type ChatbotDocuments = {
  theme?: { primaryColor?: string };
  welcomeMessage?: string;
};

const DEFAULT_THEME_COLOR = "#000";
const DEFAULT_WELCOME = "Hello! How can I help you?";

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

function extractConfig(name: string, documents: unknown): ChatbotConfig {
  const doc = (documents ?? {}) as ChatbotDocuments;
  const primaryColor = doc.theme?.primaryColor || DEFAULT_THEME_COLOR;
  const welcomeMessage = doc.welcomeMessage || DEFAULT_WELCOME;

  return {
    name,
    theme: {
      primaryColor,
    },
    welcomeMessage,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("key")?.trim() ?? "";

  if (!apiKey) {
    return withCors(
      NextResponse.json(
      { error: "API key is required." },
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
        { error: "Invalid API key." },
        { status: 401 }
        )
      );
    }

    const chatbotData = await prisma.chatbotData.findFirst({
      where: { organizationId: organization.id },
    });

    const config = extractConfig(organization.name, chatbotData?.documents);

    return withCors(NextResponse.json(config));
  } catch (error) {
    console.error("/api/chatbot error", error);
    return withCors(
      NextResponse.json(
      { error: "Failed to load chatbot configuration." },
      { status: 500 }
      )
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
