import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  getEquippedBonuses,
  syncCurrentVitals,
  rewardFromEnemy,
  todayFightCount,
  diminishingMultiplier,
} from "@/lib/gladiator/helpers";

const MAX_PER_ENEMY_PER_DAY = 3;

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

  // Günlük limit kontrolü
  const opponentType = dusman.isBoss ? "BOSS" : "ARENA";
  const countBefore = await todayFightCount(g.id, dusman.slug, opponentType);
  if (countBefore >= MAX_PER_ENEMY_PER_DAY) {
    return NextResponse.json(
      { success: false, error: { code: "DAILY_LIMIT", message: `bugünlük ${dusman.name} ile yeterince dövüştün (3/3)` } },
      { status: 429 }
    );
  }

  // Aşınan ödül
  const iWon = parsed.data.result === "player_win";
  const baseReward = rewardFromEnemy(dusman.tier, dusman.isBoss);
  const mul = iWon ? diminishingMultiplier(countBefore) : 0;
  const statPoints = Math.floor(baseReward.statPoints * mul);
  const skillPoints = countBefore === 0 ? baseReward.skillPoints : 0;
  const gold = Math.round(baseReward.gold * mul);
  const glory = Math.round(baseReward.glory * mul);

  const equip = await getEquippedBonuses(g.id);
  const vitals = syncCurrentVitals(
    { strength: g.strength, agility: g.agility, vitality: g.vitality, intelligence: g.intelligence },
    equip
  );

  // "level" alanını xp toplam'ına eşitlemeden sadece gösterim için winCount+bossKills'ten türetebiliriz.
  // Şimdilik level'ı winCount/5 + 1 olarak güncelleyeyim (puan değil, sadece flavor)
  await prisma.$transaction([
    prisma.spotGladiator.update({
      where: { id: g.id },
      data: {
        gold: { increment: gold },
        xp: { increment: glory }, // xp artık "şan" sayacı
        statPoints: { increment: statPoints },
        skillPoints: { increment: skillPoints },
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
        opponentType,
        opponentRef: dusman.slug,
        opponentName: dusman.name,
        result: iWon ? "WIN" : parsed.data.result === "enemy_win" ? "LOSS" : "FLED",
        roundsElapsed: parsed.data.roundsElapsed,
        goldEarned: gold,
        xpEarned: glory,
        log: "interactive",
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      reward: {
        gold,
        xp: glory,
        statPointsGained: statPoints,
        skillPointsGained: skillPoints,
        fightsRemaining: MAX_PER_ENEMY_PER_DAY - (countBefore + 1),
        diminishedMultiplier: mul,
      },
    },
  });
}
