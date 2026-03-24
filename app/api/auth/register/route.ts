import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

type RegisterRequest = {
  email?: string;
  password?: string;
  name?: string;
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
  const body = (await request.json().catch(() => ({}))) as RegisterRequest;
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";

  if (!email || !password) {
    return withCors(
      NextResponse.json(
        { status: "error", message: "Email and password are required." },
        { status: 400 }
      )
    );
  }

  if (password.length < 6) {
    return withCors(
      NextResponse.json(
        { status: "error", message: "Password must be at least 6 characters." },
        { status: 400 }
      )
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return withCors(
        NextResponse.json(
          { status: "error", message: "Email already registered." },
          { status: 409 }
        )
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

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
    console.error("/api/auth/register error", error);
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
