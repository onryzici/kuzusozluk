import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
