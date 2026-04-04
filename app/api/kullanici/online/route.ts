import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { allowed } = await checkRateLimit(rateLimiters.genel, ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMIT", message: "Çok fazla istek" } },
        { status: 429 }
      );
    }
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: {
        lastSeen: { gt: fiveMinutesAgo },
      },
      select: {
        username: true,
        lastSeen: true,
      },
      orderBy: { lastSeen: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
