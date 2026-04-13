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
    select: { id: true },
  });
  if (!me) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "karakter yok" } },
      { status: 404 }
    );
  }

  // Tüm rakipler — level gate YOK, kullanıcı kendine güvenen seçsin
  const list = await prisma.spotGladiator.findMany({
    where: { id: { not: me.id } },
    include: { user: { select: { username: true, avatarUrl: true } } },
    orderBy: [{ winCount: "desc" }, { xp: "desc" }],
    take: 40,
  });

  // Bugünkü pvp sayaçları
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const maclar = await prisma.spotGladiatorMac.groupBy({
    by: ["opponentRef"],
    where: {
      gladiatorId: me.id,
      opponentType: "PVP",
      createdAt: { gte: start },
    },
    _count: true,
  });
  const countMap = new Map(maclar.map((m) => [m.opponentRef, m._count]));

  return NextResponse.json({
    success: true,
    data: list.map((g) => {
      const total = g.strength + g.agility + g.vitality + g.intelligence;
      return {
        id: g.id,
        username: g.user.username,
        avatarUrl: g.user.avatarUrl,
        name: g.name,
        level: g.level,
        strength: g.strength,
        agility: g.agility,
        vitality: g.vitality,
        intelligence: g.intelligence,
        totalPower: total,
        winCount: g.winCount,
        lossCount: g.lossCount,
        pvpWins: g.pvpWins,
        todayCount: countMap.get(g.id) ?? 0,
        fightsRemaining: Math.max(0, 3 - (countMap.get(g.id) ?? 0)),
      };
    }),
  });
}
