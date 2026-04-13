import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getEquippedBonuses, computeLevelUp, syncCurrentVitals } from "@/lib/gladiator/helpers";

// Client-side interactive combat sonunda çağrılır.
// Kazanç ve stat güncellemesi server'da yapılır.
const schema = z.object({
  dusmanSlug: z.string(),
  result: z.enum(["player_win", "enemy_win", "flee"]),
  roundsElapsed: z.number().int().min(0).max(200),
  playerHpLeft: z.number().int().min(0),
  playerManaLeft: z.number().int().min(0),
  playerStaminaLeft: z.number().int().min(0),
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

  const dusman = await prisma.spotDusman.findUnique({ where: { slug: parsed.data.dusmanSlug } });
  if (!dusman) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "düşman yok" } },
      { status: 404 }
    );
  }

  // Rate limiting: son dövüşten sonra en az 2 saniye geçmeli (anti-spam)
  if (g.lastFight && Date.now() - g.lastFight.getTime() < 1500) {
    return NextResponse.json(
      { success: false, error: { code: "TOO_FAST", message: "çok hızlısın" } },
      { status: 429 }
    );
  }

  const iWon = parsed.data.result === "player_win";
  const gold = iWon ? Math.round(dusman.goldReward * (0.9 + Math.random() * 0.2)) : 0;
  const xp = iWon ? dusman.xpReward : Math.round(dusman.xpReward * 0.1);

  const lvl = computeLevelUp(g.level, g.xp, xp);
  const equip = await getEquippedBonuses(g.id);
  const vitals = syncCurrentVitals(
    { strength: g.strength, agility: g.agility, vitality: g.vitality, intelligence: g.intelligence },
    equip,
    lvl.newLevel
  );

  await prisma.$transaction([
    prisma.spotGladiator.update({
      where: { id: g.id },
      data: {
        level: lvl.newLevel,
        xp: lvl.newXp,
        gold: { increment: gold },
        statPoints: { increment: lvl.statPointsGained },
        skillPoints: { increment: lvl.skillPointsGained },
        winCount: iWon && !dusman.isBoss ? { increment: 1 } : undefined,
        lossCount: parsed.data.result === "enemy_win" ? { increment: 1 } : undefined,
        bossKills: iWon && dusman.isBoss ? { increment: 1 } : undefined,
        currentHp: vitals.currentHp,
        currentMana: vitals.currentMana,
        currentStamina: vitals.currentStamina,
        lastFight: new Date(),
      },
    }),
    prisma.spotGladiatorMac.create({
      data: {
        gladiatorId: g.id,
        opponentType: dusman.isBoss ? "BOSS" : "ARENA",
        opponentRef: dusman.slug,
        opponentName: dusman.name,
        result: iWon ? "WIN" : parsed.data.result === "enemy_win" ? "LOSS" : "FLED",
        roundsElapsed: parsed.data.roundsElapsed,
        goldEarned: gold,
        xpEarned: xp,
        log: "interactive",
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      reward: { gold, xp, leveledUp: lvl.statPointsGained > 0, newLevel: lvl.newLevel, statPointsGained: lvl.statPointsGained, skillPointsGained: lvl.skillPointsGained },
    },
  });
}
