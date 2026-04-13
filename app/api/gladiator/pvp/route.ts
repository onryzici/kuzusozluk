import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PvP rakip listesi: benzer seviye diğer yazarların gladyatörleri
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  const me = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
    select: { id: true, level: true },
  });
  if (!me) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "karakter yok" } },
      { status: 404 }
    );
  }

  const list = await prisma.spotGladiator.findMany({
    where: {
      id: { not: me.id },
      level: { gte: Math.max(1, me.level - 3), lte: me.level + 3 },
    },
    include: { user: { select: { username: true, avatarUrl: true } } },
    orderBy: [{ winCount: "desc" }, { level: "desc" }],
    take: 20,
  });

  return NextResponse.json({
    success: true,
    data: list.map((g) => ({
      id: g.id,
      username: g.user.username,
      avatarUrl: g.user.avatarUrl,
      name: g.name,
      level: g.level,
      winCount: g.winCount,
      lossCount: g.lossCount,
      pvpWins: g.pvpWins,
    })),
  });
}
