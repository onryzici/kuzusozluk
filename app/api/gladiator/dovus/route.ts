import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { simulateBattle, makeCombatant } from "@/lib/gladiator/engine";
import {
  getEquippedBonuses,
  computeLevelUp,
  syncCurrentVitals,
} from "@/lib/gladiator/helpers";

const startSchema = z.object({
  dusmanSlug: z.string().min(1).max(80),
  // clientActionList gönderirse onu sırayla oyna. yoksa AI vs AI simüle et.
  actions: z
    .array(
      z.object({
        kind: z.enum(["attack", "guard", "rest", "skill", "potion", "flee"]),
        target: z.enum(["head", "torso", "leg"]).optional(),
        slug: z.string().optional(),
        kind2: z.enum(["hp", "mana"]).optional(),
      })
    )
    .optional(),
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
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "geçersiz istek" } },
      { status: 400 }
    );
  }

  const g = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
    include: { ogrenilen: { include: { skill: true } } },
  });
  if (!g) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "önce karakter yarat" } },
      { status: 404 }
    );
  }

  const dusman = await prisma.spotDusman.findUnique({ where: { slug: parsed.data.dusmanSlug } });
  if (!dusman) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "düşman bulunamadı" } },
      { status: 404 }
    );
  }

  // Combatant kur
  const playerEquip = await getEquippedBonuses(g.id);
  const player = makeCombatant({
    id: g.id,
    name: g.name,
    level: g.level,
    stats: { strength: g.strength, agility: g.agility, vitality: g.vitality, intelligence: g.intelligence, charisma: g.charisma },
    equip: playerEquip,
    skills: g.ogrenilen.map((o) => o.skill.slug),
    refresh: true, // arenaya tam vital ile giriyor
  });

  const enemy = makeCombatant({
    id: dusman.slug,
    name: dusman.name,
    level: Math.round((dusman.levelMin + dusman.levelMax) / 2),
    stats: { strength: dusman.strength, agility: dusman.agility, vitality: dusman.vitality, intelligence: dusman.intelligence },
    equip: {
      attackBonus: dusman.attackBonus,
      defenseBonus: dusman.defenseBonus,
      hpBonus: dusman.hpBonus,
      manaBonus: 0,
      critBonus: 0,
      dodgeBonus: 0,
    },
    skills: [],
    refresh: true,
  });

  const seed = Math.floor(Math.random() * 2 ** 31);
  // Motor aksiyon tipini tam istiyor — basit mapping
  const actions = parsed.data.actions?.map((a) => {
    if (a.kind === "attack" && a.target) return { kind: "attack" as const, target: a.target };
    if (a.kind === "guard" && a.target) return { kind: "guard" as const, target: a.target };
    if (a.kind === "rest") return { kind: "rest" as const };
    if (a.kind === "skill" && a.slug) return { kind: "skill" as const, slug: a.slug };
    if (a.kind === "potion" && a.kind2) return { kind: "potion" as const, kind2: a.kind2 };
    if (a.kind === "flee") return { kind: "flee" as const };
    return { kind: "attack" as const, target: "torso" as const };
  }) ?? null;

  const result = simulateBattle(player, enemy, seed, actions);

  // Ödül
  let gold = 0;
  let xp = 0;
  if (result.outcome === "player_win") {
    gold = dusman.isBoss ? dusman.goldReward : Math.round(dusman.goldReward * (0.8 + Math.random() * 0.4));
    xp = dusman.xpReward;
  } else if (result.outcome === "enemy_win") {
    xp = Math.round(dusman.xpReward * 0.1);
  }

  // Level up hesabı
  const lvl = computeLevelUp(g.level, g.xp, xp);
  const newStats = {
    strength: g.strength,
    agility: g.agility,
    vitality: g.vitality,
    intelligence: g.intelligence,
  };
  const vitals = syncCurrentVitals(newStats, playerEquip, lvl.newLevel);

  const updated = await prisma.spotGladiator.update({
    where: { id: g.id },
    data: {
      level: lvl.newLevel,
      xp: lvl.newXp,
      gold: { increment: gold },
      statPoints: { increment: lvl.statPointsGained },
      skillPoints: { increment: lvl.skillPointsGained },
      winCount: result.outcome === "player_win" && !dusman.isBoss ? { increment: 1 } : undefined,
      lossCount: result.outcome === "enemy_win" ? { increment: 1 } : undefined,
      bossKills: result.outcome === "player_win" && dusman.isBoss ? { increment: 1 } : undefined,
      currentHp: vitals.currentHp, // refresh between fights
      currentMana: vitals.currentMana,
      currentStamina: vitals.currentStamina,
      lastFight: new Date(),
    },
  });

  // Maç log'u
  await prisma.spotGladiatorMac.create({
    data: {
      gladiatorId: g.id,
      opponentType: dusman.isBoss ? "BOSS" : "ARENA",
      opponentRef: dusman.slug,
      opponentName: dusman.name,
      result: result.outcome === "player_win" ? "WIN" : result.outcome === "enemy_win" ? "LOSS" : "FLED",
      roundsElapsed: result.rounds.length,
      goldEarned: gold,
      xpEarned: xp,
      log: JSON.stringify(result.rounds).slice(0, 8000),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      battle: result,
      reward: { gold, xp, leveledUp: lvl.statPointsGained > 0, newLevel: lvl.newLevel, statPointsGained: lvl.statPointsGained, skillPointsGained: lvl.skillPointsGained },
      gladiator: updated,
    },
  });
}
