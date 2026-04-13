import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computeLevelUp, getEquippedBonuses, syncCurrentVitals } from "@/lib/gladiator/helpers";

const schema = z.object({
  roundsCompleted: z.number().int().min(0).max(8),
  wonBracket: z.boolean(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "geçersiz" } },
      { status: 400 }
    );
  }

  const g = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
  });
  if (!g) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "karakter yok" } },
      { status: 404 }
    );
  }

  // Her bitirilen rakip için orta ödül, bracket tamamında büyük bonus
  const perRound = 50 + g.level * 10;
  const gold = parsed.data.roundsCompleted * perRound + (parsed.data.wonBracket ? 500 + g.level * 50 : 0);
  const xp = parsed.data.roundsCompleted * Math.round(perRound * 1.2) + (parsed.data.wonBracket ? 500 + g.level * 80 : 0);

  const lvl = computeLevelUp(g.level, g.xp, xp);
  const equip = await getEquippedBonuses(g.id);
  const vitals = syncCurrentVitals(
    { strength: g.strength, agility: g.agility, vitality: g.vitality, intelligence: g.intelligence },
    equip,
    lvl.newLevel
  );

  await prisma.spotGladiator.update({
    where: { id: g.id },
    data: {
      level: lvl.newLevel,
      xp: lvl.newXp,
      gold: { increment: gold },
      statPoints: { increment: lvl.statPointsGained },
      skillPoints: { increment: lvl.skillPointsGained },
      winCount: { increment: parsed.data.roundsCompleted },
      ...vitals,
      lastFight: new Date(),
    },
  });

  await prisma.spotGladiatorMac.create({
    data: {
      gladiatorId: g.id,
      opponentType: "TOURNAMENT",
      opponentRef: "turnuva",
      opponentName: parsed.data.wonBracket ? "TURNUVA ŞAMPİYONU" : `turnuva (${parsed.data.roundsCompleted}/8)`,
      result: parsed.data.wonBracket ? "WIN" : parsed.data.roundsCompleted > 0 ? "WIN" : "LOSS",
      roundsElapsed: parsed.data.roundsCompleted,
      goldEarned: gold,
      xpEarned: xp,
      log: "tournament",
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      reward: {
        gold,
        xp,
        leveledUp: lvl.statPointsGained > 0,
        newLevel: lvl.newLevel,
      },
    },
  });
}
