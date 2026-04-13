import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  const [byLevel, byWins, byPvp] = await Promise.all([
    prisma.spotGladiator.findMany({
      orderBy: [{ level: "desc" }, { xp: "desc" }],
      take: 20,
      include: { user: { select: { username: true, avatarUrl: true } } },
    }),
    prisma.spotGladiator.findMany({
      orderBy: [{ winCount: "desc" }, { level: "desc" }],
      take: 20,
      include: { user: { select: { username: true, avatarUrl: true } } },
    }),
    prisma.spotGladiator.findMany({
      where: { pvpWins: { gt: 0 } },
      orderBy: [{ pvpWins: "desc" }],
      take: 20,
      include: { user: { select: { username: true, avatarUrl: true } } },
    }),
  ]);

  const mapRow = (g: typeof byLevel[number]) => ({
    name: g.name,
    username: g.user.username,
    avatarUrl: g.user.avatarUrl,
    level: g.level,
    winCount: g.winCount,
    lossCount: g.lossCount,
    pvpWins: g.pvpWins,
    pvpLosses: g.pvpLosses,
    bossKills: g.bossKills,
  });

  return NextResponse.json({
    success: true,
    data: {
      byLevel: byLevel.map(mapRow),
      byWins: byWins.map(mapRow),
      byPvp: byPvp.map(mapRow),
    },
  });
}
