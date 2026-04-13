import { prisma } from "@/lib/prisma";
import type { SpotEquipBonuses, SpotCombatant } from "./engine";
import {
  deriveMaxHp,
  deriveMaxMana,
  deriveMaxStamina,
  makeCombatant,
} from "./engine";
import { DUSMANLAR, ESYALAR, YETENEKLER } from "./seedData";

// Katalog boşsa seed verisini yükler. Idempotent.
export async function ensureCatalog(): Promise<void> {
  const [dCount, eCount, yCount] = await Promise.all([
    prisma.spotDusman.count(),
    prisma.spotEsya.count(),
    prisma.spotYetenek.count(),
  ]);

  if (dCount === 0) {
    await prisma.spotDusman.createMany({ data: DUSMANLAR, skipDuplicates: true });
  }
  if (eCount === 0) {
    await prisma.spotEsya.createMany({ data: ESYALAR, skipDuplicates: true });
  }
  if (yCount === 0) {
    await prisma.spotYetenek.createMany({ data: YETENEKLER, skipDuplicates: true });
  }
}

export async function getEquippedBonuses(gladiatorId: string): Promise<SpotEquipBonuses> {
  const equip = await prisma.spotGladiatorKusanmis.findUnique({
    where: { gladiatorId },
  });
  const bonus: SpotEquipBonuses = {
    attackBonus: 0,
    defenseBonus: 0,
    hpBonus: 0,
    manaBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
  };
  if (!equip) return bonus;

  const ids = [
    equip.weaponItemId,
    equip.armorItemId,
    equip.helmetItemId,
    equip.shieldItemId,
    equip.bootsItemId,
  ].filter((v): v is string => !!v);

  if (ids.length === 0) return bonus;

  const items = await prisma.spotEsya.findMany({ where: { id: { in: ids } } });
  for (const it of items) {
    bonus.attackBonus += it.attackBonus;
    bonus.defenseBonus += it.defenseBonus;
    bonus.hpBonus += it.hpBonus;
    bonus.manaBonus += it.manaBonus;
    bonus.critBonus += it.critBonus;
    bonus.dodgeBonus += it.dodgeBonus;
  }
  return bonus;
}

export async function loadGladiatorCombatant(
  gladiatorId: string,
  opts: { refresh?: boolean } = {}
): Promise<SpotCombatant | null> {
  const g = await prisma.spotGladiator.findUnique({
    where: { id: gladiatorId },
    include: { ogrenilen: { include: { skill: true } } },
  });
  if (!g) return null;
  const equip = await getEquippedBonuses(g.id);
  return makeCombatant({
    id: g.id,
    name: g.name,
    stats: {
      strength: g.strength,
      agility: g.agility,
      vitality: g.vitality,
      intelligence: g.intelligence,
      charisma: g.charisma,
    },
    equip,
    skills: g.ogrenilen.map((o) => o.skill.slug),
    currentHp: g.currentHp,
    currentMana: g.currentMana,
    currentStamina: g.currentStamina,
    refresh: opts.refresh,
  });
}

// Rakip difficulty → stat puanı + altın
// tier 1 → 1 stat, tier 2 → 1 stat, tier 3 → 2 stat, boss → 3 stat + 1 skill
export function rewardFromEnemy(tier: number, isBoss: boolean): {
  statPoints: number;
  skillPoints: number;
  gold: number;
  glory: number;
} {
  if (isBoss) {
    return { statPoints: 3, skillPoints: 1, gold: 200 + tier * 100, glory: 100 + tier * 30 };
  }
  if (tier >= 4) return { statPoints: 2, skillPoints: 0, gold: 80 + tier * 20, glory: 35 };
  if (tier >= 2) return { statPoints: 1, skillPoints: 0, gold: 40 + tier * 10, glory: 15 };
  return { statPoints: 1, skillPoints: 0, gold: 25, glory: 8 };
}

// Günde bu rakibi kaç kez dövdü?
export async function todayFightCount(
  gladiatorId: string,
  opponentRef: string,
  opponentType: "ARENA" | "BOSS" | "PVP" | "TOURNAMENT"
): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return await prisma.spotGladiatorMac.count({
    where: {
      gladiatorId,
      opponentRef,
      opponentType,
      createdAt: { gte: start },
    },
  });
}

// Aşınan ödül: 1. galibiyet tam, 2. %50, 3. %25, sonrası 0
export function diminishingMultiplier(countBefore: number): number {
  if (countBefore === 0) return 1;
  if (countBefore === 1) return 0.5;
  if (countBefore === 2) return 0.25;
  return 0;
}

export function syncCurrentVitals(stats: {
  strength: number;
  agility: number;
  vitality: number;
  intelligence: number;
}, equip: SpotEquipBonuses) {
  return {
    currentHp: deriveMaxHp(stats, equip),
    currentMana: deriveMaxMana(stats, equip),
    currentStamina: deriveMaxStamina(stats),
  };
}
