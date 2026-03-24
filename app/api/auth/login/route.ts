import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

type LoginRequest = {
  email?: string;
  password?: string;
};

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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LoginRequest;
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return withCors(
      NextResponse.json(
        { status: "error", message: "Email and password are required." },
        { status: 400 }
      )
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });

    if (!user || !user.password) {
      return withCors(
        NextResponse.json(
          { status: "error", message: "Invalid email or password." },
          { status: 401 }
        )
      );
    }

    const isValidPassword = await bcrypt.compare(String(password), String(user.password));

    if (!isValidPassword) {
      return withCors(
        NextResponse.json(
          { status: "error", message: "Invalid email or password." },
          { status: 401 }
        )
      );
    }

    const token = await createToken(user.id, user.email);

    return withCors(
      NextResponse.json({
        status: "ok",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      })
    );
  } catch (error) {
    console.error("/api/auth/login error", error);
    return withCors(
      NextResponse.json(
        { status: "error", message: "Internal server error." },
        { status: 500 }
      )
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
