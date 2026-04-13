import { prisma } from "@/lib/prisma";
import type { SpotEquipBonuses, SpotCombatant } from "./engine";
import {
  deriveMaxHp,
  deriveMaxMana,
  deriveMaxStamina,
  makeCombatant,
  xpForLevel,
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
    level: g.level,
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

export function computeLevelUp(
  currentLevel: number,
  currentXp: number,
  gainedXp: number
): { newLevel: number; newXp: number; statPointsGained: number; skillPointsGained: number } {
  let level = currentLevel;
  let xp = currentXp + gainedXp;
  let statPoints = 0;
  let skillPoints = 0;

  while (level < 30) {
    const need = xpForLevel(level);
    if (xp >= need) {
      xp -= need;
      level++;
      statPoints += 3;
      // her 2 seviyede 1 skill puanı
      if (level % 2 === 0) skillPoints += 1;
    } else break;
  }

  return { newLevel: level, newXp: xp, statPointsGained: statPoints, skillPointsGained: skillPoints };
}

export function syncCurrentVitals(stats: {
  strength: number;
  agility: number;
  vitality: number;
  intelligence: number;
}, equip: SpotEquipBonuses, level: number) {
  return {
    currentHp: deriveMaxHp(stats, equip, level),
    currentMana: deriveMaxMana(stats, equip),
    currentStamina: deriveMaxStamina(stats),
  };
}
