import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", prisma: "connected" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", prisma: "disconnected" },
      { status: 500 }
    );
  }
}
