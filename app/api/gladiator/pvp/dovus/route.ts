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

const schema = z.object({ opponentId: z.string().min(1) });

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

  const me = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
    include: { ogrenilen: { include: { skill: true } } },
  });
  if (!me) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "karakter yok" } },
      { status: 404 }
    );
  }

  const opp = await prisma.spotGladiator.findUnique({
    where: { id: parsed.data.opponentId },
    include: { ogrenilen: { include: { skill: true } } },
  });
  if (!opp) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "rakip yok" } },
      { status: 404 }
    );
  }
  if (opp.id === me.id) {
    return NextResponse.json(
      { success: false, error: { code: "SELF", message: "kendinle dövüşemezsin" } },
      { status: 400 }
    );
  }

  const myEquip = await getEquippedBonuses(me.id);
  const oppEquip = await getEquippedBonuses(opp.id);

  const meCombat = makeCombatant({
    id: me.id,
    name: me.name,
    level: me.level,
    stats: { strength: me.strength, agility: me.agility, vitality: me.vitality, intelligence: me.intelligence, charisma: me.charisma },
    equip: myEquip,
    skills: me.ogrenilen.map((o) => o.skill.slug),
    refresh: true,
  });
  const oppCombat = makeCombatant({
    id: opp.id,
    name: opp.name,
    level: opp.level,
    stats: { strength: opp.strength, agility: opp.agility, vitality: opp.vitality, intelligence: opp.intelligence, charisma: opp.charisma },
    equip: oppEquip,
    skills: opp.ogrenilen.map((o) => o.skill.slug),
    refresh: true,
  });

  const seed = Math.floor(Math.random() * 2 ** 31);
  const result = simulateBattle(meCombat, oppCombat, seed, null); // PvP full-auto — aksiyon yok

  const iWon = result.outcome === "player_win";
  const gold = iWon ? Math.round(20 + opp.level * 8) : 0;
  const xp = iWon ? Math.round(30 + opp.level * 10) : 5;

  const lvl = computeLevelUp(me.level, me.xp, xp);
  const vitals = syncCurrentVitals(
    { strength: me.strength, agility: me.agility, vitality: me.vitality, intelligence: me.intelligence },
    myEquip,
    lvl.newLevel
  );

  await prisma.$transaction([
    prisma.spotGladiator.update({
      where: { id: me.id },
      data: {
        level: lvl.newLevel,
        xp: lvl.newXp,
        gold: { increment: gold },
        statPoints: { increment: lvl.statPointsGained },
        skillPoints: { increment: lvl.skillPointsGained },
        pvpWins: iWon ? { increment: 1 } : undefined,
        pvpLosses: !iWon ? { increment: 1 } : undefined,
        currentHp: vitals.currentHp,
        currentMana: vitals.currentMana,
        currentStamina: vitals.currentStamina,
        lastFight: new Date(),
      },
    }),
    // rakibin stat'ı da güncellenir (kaybettiyse pvpLosses++)
    prisma.spotGladiator.update({
      where: { id: opp.id },
      data: {
        pvpLosses: iWon ? { increment: 1 } : undefined,
        pvpWins: !iWon ? { increment: 1 } : undefined,
      },
    }),
    prisma.spotGladiatorMac.create({
      data: {
        gladiatorId: me.id,
        opponentType: "PVP",
        opponentRef: opp.id,
        opponentName: opp.name,
        result: iWon ? "WIN" : "LOSS",
        roundsElapsed: result.rounds.length,
        goldEarned: gold,
        xpEarned: xp,
        log: JSON.stringify(result.rounds).slice(0, 8000),
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      battle: result,
      reward: { gold, xp, leveledUp: lvl.statPointsGained > 0, newLevel: lvl.newLevel },
    },
  });
}
