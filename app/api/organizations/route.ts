import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type CreateOrgRequest = {
  name?: string;
};

function generateApiKey(prefix: string) {
  const safePrefix = prefix.replace(/\s+/g, "").slice(0, 4).toUpperCase();
  return `org_${safePrefix}_${crypto.randomBytes(16).toString("hex")}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateOrgRequest;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { status: "error", message: "Organization name is required." },
        { status: 400 }
      );
    }

    const apiKey = generateApiKey(name);

    const organization = await prisma.organization.create({
      data: {
        name,
        apiKey,
      },
    });

    return NextResponse.json({ status: "ok", organization });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to create organization." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ status: "ok", organizations });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to load organizations." },
      { status: 500 }
    );
  }
}
