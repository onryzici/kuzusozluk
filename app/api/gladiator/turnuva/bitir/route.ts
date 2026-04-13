import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getEquippedBonuses, syncCurrentVitals } from "@/lib/gladiator/helpers";

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

  // Turnuva ödülü: her raund +stat puanı, bracket tamamı bonus skill puanı
  const statPoints = parsed.data.roundsCompleted + (parsed.data.wonBracket ? 2 : 0);
  const skillPoints = parsed.data.wonBracket ? 1 : 0;
  const gold = parsed.data.roundsCompleted * 80 + (parsed.data.wonBracket ? 1500 : 0);
  const glory = parsed.data.roundsCompleted * 60 + (parsed.data.wonBracket ? 400 : 0);

  const equip = await getEquippedBonuses(g.id);
  const vitals = syncCurrentVitals(
    { strength: g.strength, agility: g.agility, vitality: g.vitality, intelligence: g.intelligence },
    equip
  );

  await prisma.spotGladiator.update({
    where: { id: g.id },
    data: {
      xp: { increment: glory },
      gold: { increment: gold },
      statPoints: { increment: statPoints },
      skillPoints: { increment: skillPoints },
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
      xpEarned: glory,
      log: "tournament",
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      reward: { gold, xp: glory, statPointsGained: statPoints, skillPointsGained: skillPoints },
    },
  });
}
