import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";

export async function GET() {
  try {
    // 30 saniye cache
    const cached = await getCache<unknown>("online:users");
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
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

    await setCache("online:users", users, 30);

    return NextResponse.json({ success: true, data: users });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
