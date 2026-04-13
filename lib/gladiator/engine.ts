// Spot Gladyatörü — combat engine.
// Deterministic given a seed; runs on server for authoritative results.

export type SpotStats = {
  strength: number;
  agility: number;
  vitality: number;
  intelligence: number;
  charisma?: number;
};

export type SpotEquipBonuses = {
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  manaBonus: number;
  critBonus: number;
  dodgeBonus: number;
};

export type SpotCombatant = {
  id: string;
  name: string;
  level: number;
  stats: SpotStats;
  equip: SpotEquipBonuses;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  skills: string[]; // ogrenilen skill slug listesi
};

export type SpotSide = "player" | "enemy";
export type SpotBodyPart = "head" | "torso" | "leg";

export type SpotAction =
  | { kind: "attack"; target: SpotBodyPart }
  | { kind: "guard"; target: SpotBodyPart }
  | { kind: "rest" }
  | { kind: "skill"; slug: string }
  | { kind: "potion"; kind2: "hp" | "mana" }
  | { kind: "flee" };

export type SpotTurnResult = {
  round: number;
  actor: SpotSide;
  action: SpotAction;
  dodged: boolean;
  critical: boolean;
  damage: number;
  healing: number;
  staminaDelta: number;
  manaDelta: number;
  playerHp: number;
  enemyHp: number;
  note?: string;
};

export type SpotBattleResult = {
  outcome: "player_win" | "enemy_win" | "flee";
  rounds: SpotTurnResult[];
  startingSeed: number;
};

// ---------- Derived stats ----------

export function deriveMaxHp(s: SpotStats, equip: SpotEquipBonuses, level: number): number {
  return 30 + s.vitality * 6 + equip.hpBonus + level * 5;
}
export function deriveMaxMana(s: SpotStats, equip: SpotEquipBonuses): number {
  return 10 + s.intelligence * 3 + equip.manaBonus;
}
export function deriveMaxStamina(s: SpotStats): number {
  return 20 + s.vitality * 2 + s.agility * 1;
}
export function deriveAttack(s: SpotStats, equip: SpotEquipBonuses): number {
  return 3 + s.strength * 2 + equip.attackBonus;
}
export function deriveDefense(s: SpotStats, equip: SpotEquipBonuses): number {
  return s.vitality + Math.floor(s.strength / 2) + equip.defenseBonus;
}
export function deriveCritChance(s: SpotStats, equip: SpotEquipBonuses): number {
  return Math.min(60, 3 + Math.floor(s.agility * 0.8) + equip.critBonus);
}
export function deriveDodgeChance(s: SpotStats, equip: SpotEquipBonuses): number {
  return Math.min(50, 2 + Math.floor(s.agility * 0.6) + equip.dodgeBonus);
}

// ---------- RNG (Mulberry32) ----------

export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Skill catalog ----------

type SkillDef = {
  slug: string;
  staminaCost: number;
  manaCost: number;
  apply: (actor: SpotCombatant, target: SpotCombatant, rnd: () => number) => Partial<SpotTurnResult>;
};

export const SKILLS: Record<string, SkillDef> = {
  "guc-vurusu": {
    slug: "guc-vurusu",
    staminaCost: 10,
    manaCost: 0,
    apply(actor, target, rnd) {
      const atk = deriveAttack(actor.stats, actor.equip);
      const def = deriveDefense(target.stats, target.equip);
      const base = Math.max(1, atk * 2 - def);
      const crit = rnd() < deriveCritChance(actor.stats, actor.equip) / 100;
      const dmg = Math.round(base * (crit ? 1.75 : 1) * (0.9 + rnd() * 0.2));
      return { damage: dmg, critical: crit, note: "güç vuruşu!" };
    },
  },
  "hizli-darbe": {
    slug: "hizli-darbe",
    staminaCost: 6,
    manaCost: 0,
    apply(actor, target, rnd) {
      // 2 hit
      const atk = deriveAttack(actor.stats, actor.equip);
      const def = deriveDefense(target.stats, target.equip);
      const base = Math.max(1, Math.round(atk * 0.8 - def * 0.5));
      const dmg = base * 2;
      return { damage: dmg, critical: false, note: "hızlı darbe (x2)" };
    },
  },
  "iyilesme": {
    slug: "iyilesme",
    staminaCost: 0,
    manaCost: 15,
    apply(actor) {
      const heal = Math.round(actor.maxHp * 0.35);
      return { healing: heal, damage: 0, note: "iyileşme" };
    },
  },
  "yildirim": {
    slug: "yildirim",
    staminaCost: 0,
    manaCost: 20,
    apply(actor, target, rnd) {
      const base = 8 + actor.stats.intelligence * 3;
      const crit = rnd() < 0.25;
      const dmg = Math.round(base * (crit ? 2 : 1));
      return { damage: dmg, critical: crit, note: "yıldırım!" };
    },
  },
  "kan-emici": {
    slug: "kan-emici",
    staminaCost: 8,
    manaCost: 5,
    apply(actor, target) {
      const atk = deriveAttack(actor.stats, actor.equip);
      const def = deriveDefense(target.stats, target.equip);
      const dmg = Math.max(1, Math.round(atk * 1.3 - def * 0.8));
      const heal = Math.round(dmg * 0.6);
      return { damage: dmg, healing: heal, note: "kan emici" };
    },
  },
  "bicak-firlat": {
    slug: "bicak-firlat",
    staminaCost: 5,
    manaCost: 0,
    apply(actor, target, rnd) {
      const atk = deriveAttack(actor.stats, actor.equip);
      const base = Math.max(1, Math.round(atk * 1.2));
      // bıçak savunmayı by-pass eder
      const crit = rnd() < deriveCritChance(actor.stats, actor.equip) / 100;
      const dmg = Math.round(base * (crit ? 1.8 : 1));
      return { damage: dmg, critical: crit, note: "bıçak fırlat" };
    },
  },
  "kalkan-kiran": {
    slug: "kalkan-kiran",
    staminaCost: 12,
    manaCost: 0,
    apply(actor, target) {
      const atk = deriveAttack(actor.stats, actor.equip);
      const dmg = Math.max(1, Math.round(atk * 1.1));
      // rakibin savunmasını düşür (debuff simülasyonu: aksiyon olarak negatif def uygulanacak normal attack'a yansır ama tek turda bu basit)
      return { damage: dmg, note: "kalkan kıran — rakip savunması kırılıyor" };
    },
  },
};

// ---------- Normal saldırı/savunma çözümü ----------

function resolveAttack(
  attacker: SpotCombatant,
  defender: SpotCombatant,
  attackerAction: Extract<SpotAction, { kind: "attack" }>,
  defenderAction: SpotAction | null,
  rnd: () => number
): { damage: number; dodged: boolean; critical: boolean; note?: string } {
  // Dodge
  const dodge = deriveDodgeChance(defender.stats, defender.equip);
  if (rnd() * 100 < dodge) {
    return { damage: 0, dodged: true, critical: false, note: "savuşturdu" };
  }

  const atk = deriveAttack(attacker.stats, attacker.equip);
  let def = deriveDefense(defender.stats, defender.equip);

  // Guard bonus: doğru bölgeyi savunuyorsa ekstra savunma
  if (defenderAction && defenderAction.kind === "guard") {
    if (defenderAction.target === attackerAction.target) {
      def *= 1.8;
    } else {
      def *= 1.1;
    }
  }

  // Body part çarpanları
  const partMul =
    attackerAction.target === "head" ? 1.4 : attackerAction.target === "leg" ? 0.85 : 1;

  const crit = rnd() < deriveCritChance(attacker.stats, attacker.equip) / 100;
  const variance = 0.85 + rnd() * 0.3;

  let damage = (atk * partMul - def) * variance;
  if (crit) damage *= 1.75;
  damage = Math.max(1, Math.round(damage));

  return { damage, dodged: false, critical: crit, note: undefined };
}

// ---------- Basit AI ----------

export function aiChoose(self: SpotCombatant, opp: SpotCombatant, rnd: () => number): SpotAction {
  const hpPct = self.hp / self.maxHp;

  // Düşük HP + iyileşme biliyor + yeterli mana
  if (hpPct < 0.35 && self.skills.includes("iyilesme") && self.mana >= 15) {
    return { kind: "skill", slug: "iyilesme" };
  }
  // Çok düşük stamina → rest
  if (self.stamina < 8) return { kind: "rest" };

  // Bazen savun
  if (rnd() < 0.18) {
    const t: SpotBodyPart[] = ["head", "torso", "leg"];
    return { kind: "guard", target: t[Math.floor(rnd() * 3)] };
  }

  // Skill tercihi
  const skillCandidates = self.skills.filter((s) => {
    const def = SKILLS[s];
    if (!def) return false;
    return def.staminaCost <= self.stamina && def.manaCost <= self.mana;
  });
  if (skillCandidates.length && rnd() < 0.35) {
    return { kind: "skill", slug: skillCandidates[Math.floor(rnd() * skillCandidates.length)] };
  }

  // Normal saldırı — target seçimi
  const roll = rnd();
  const target: SpotBodyPart = roll < 0.35 ? "head" : roll < 0.8 ? "torso" : "leg";
  return { kind: "attack", target };
}

// ---------- Tur işlemi (1 aksiyon) ----------

export function applyAction(
  round: number,
  actor: SpotCombatant,
  opp: SpotCombatant,
  action: SpotAction,
  oppReaction: SpotAction | null,
  rnd: () => number,
  actorSide: SpotSide
): SpotTurnResult {
  const result: SpotTurnResult = {
    round,
    actor: actorSide,
    action,
    dodged: false,
    critical: false,
    damage: 0,
    healing: 0,
    staminaDelta: 0,
    manaDelta: 0,
    playerHp: 0,
    enemyHp: 0,
  };

  if (action.kind === "attack") {
    const base = resolveAttack(actor, opp, action, oppReaction, rnd);
    if (base.dodged) {
      result.dodged = true;
      result.note = base.note;
    } else {
      opp.hp = Math.max(0, opp.hp - base.damage);
      result.damage = base.damage;
      result.critical = base.critical;
    }
    actor.stamina = Math.max(0, actor.stamina - 4);
    result.staminaDelta = -4;
  } else if (action.kind === "guard") {
    actor.stamina = Math.min(actor.maxStamina, actor.stamina + 3);
    result.staminaDelta = 3;
    result.note = `${action.target} korunuyor`;
  } else if (action.kind === "rest") {
    const regen = Math.round(actor.maxStamina * 0.3);
    const manaRegen = Math.round(actor.maxMana * 0.2);
    actor.stamina = Math.min(actor.maxStamina, actor.stamina + regen);
    actor.mana = Math.min(actor.maxMana, actor.mana + manaRegen);
    result.staminaDelta = regen;
    result.manaDelta = manaRegen;
    result.note = "dinleniyor";
  } else if (action.kind === "skill") {
    const def = SKILLS[action.slug];
    if (!def) {
      result.note = "bilinmeyen yetenek";
    } else if (def.staminaCost > actor.stamina || def.manaCost > actor.mana) {
      result.note = "enerjisi yetmedi (atladı)";
    } else {
      actor.stamina -= def.staminaCost;
      actor.mana -= def.manaCost;
      const eff = def.apply(actor, opp, rnd);
      if (eff.damage) {
        // dodge
        if (rnd() * 100 < deriveDodgeChance(opp.stats, opp.equip)) {
          result.dodged = true;
          result.note = `${eff.note} — savuşturuldu`;
        } else {
          opp.hp = Math.max(0, opp.hp - eff.damage);
          result.damage = eff.damage;
          result.critical = !!eff.critical;
          result.note = eff.note;
        }
      }
      if (eff.healing) {
        actor.hp = Math.min(actor.maxHp, actor.hp + eff.healing);
        result.healing = eff.healing;
        result.note = eff.note;
      }
      result.staminaDelta = -def.staminaCost;
      result.manaDelta = -def.manaCost;
    }
  } else if (action.kind === "potion") {
    // UI tarafı önceden check etmeli; motor sadece HP/mana artırır.
    if (action.kind2 === "hp") {
      const heal = 35;
      actor.hp = Math.min(actor.maxHp, actor.hp + heal);
      result.healing = heal;
      result.note = "hp iksiri";
    } else {
      const mana = 25;
      actor.mana = Math.min(actor.maxMana, actor.mana + mana);
      result.manaDelta = mana;
      result.note = "mana iksiri";
    }
  } else if (action.kind === "flee") {
    result.note = "kaçış denemesi";
  }

  result.playerHp = actorSide === "player" ? actor.hp : opp.hp;
  result.enemyHp = actorSide === "player" ? opp.hp : actor.hp;
  return result;
}

// ---------- Tam simülasyon ----------

/**
 * Tam bir dövüş simüle eder. Kullanıcı aksiyonları dizisi verilirse onları
 * oynatır; yoksa her iki taraf da AI ile oynatılır.
 */
export function simulateBattle(
  player: SpotCombatant,
  enemy: SpotCombatant,
  seed: number,
  playerActions: SpotAction[] | null = null,
  maxRounds = 30
): SpotBattleResult {
  const rnd = makeRng(seed);
  const rounds: SpotTurnResult[] = [];

  // Initiative: agility yüksek olan önce
  const playerFirst = player.stats.agility + rnd() * 2 >= enemy.stats.agility + rnd() * 2;

  let round = 0;
  let actionIdx = 0;

  while (player.hp > 0 && enemy.hp > 0 && round < maxRounds) {
    round++;

    const playerAction: SpotAction = playerActions
      ? playerActions[actionIdx] ?? aiChoose(player, enemy, rnd)
      : aiChoose(player, enemy, rnd);
    actionIdx++;
    const enemyAction = aiChoose(enemy, player, rnd);

    // Flee?
    if (playerAction.kind === "flee") {
      rounds.push({
        round,
        actor: "player",
        action: playerAction,
        dodged: false,
        critical: false,
        damage: 0,
        healing: 0,
        staminaDelta: 0,
        manaDelta: 0,
        playerHp: player.hp,
        enemyHp: enemy.hp,
        note: "kaçtı",
      });
      return { outcome: "flee", rounds, startingSeed: seed };
    }

    if (playerFirst) {
      rounds.push(applyAction(round, player, enemy, playerAction, enemyAction, rnd, "player"));
      if (enemy.hp <= 0) break;
      rounds.push(applyAction(round, enemy, player, enemyAction, playerAction, rnd, "enemy"));
    } else {
      rounds.push(applyAction(round, enemy, player, enemyAction, playerAction, rnd, "enemy"));
      if (player.hp <= 0) break;
      rounds.push(applyAction(round, player, enemy, playerAction, enemyAction, rnd, "player"));
    }
  }

  const outcome: SpotBattleResult["outcome"] =
    player.hp <= 0 && enemy.hp > 0 ? "enemy_win" : enemy.hp <= 0 ? "player_win" : "enemy_win";

  return { outcome, rounds, startingSeed: seed };
}

// ---------- Combatant kurulum ----------

export function makeCombatant(base: {
  id: string;
  name: string;
  level: number;
  stats: SpotStats;
  equip: SpotEquipBonuses;
  skills: string[];
  currentHp?: number;
  currentMana?: number;
  currentStamina?: number;
  refresh?: boolean;
}): SpotCombatant {
  const maxHp = deriveMaxHp(base.stats, base.equip, base.level);
  const maxMana = deriveMaxMana(base.stats, base.equip);
  const maxStamina = deriveMaxStamina(base.stats);
  return {
    id: base.id,
    name: base.name,
    level: base.level,
    stats: base.stats,
    equip: base.equip,
    hp: base.refresh ? maxHp : base.currentHp ?? maxHp,
    maxHp,
    mana: base.refresh ? maxMana : base.currentMana ?? maxMana,
    maxMana,
    stamina: base.refresh ? maxStamina : base.currentStamina ?? maxStamina,
    maxStamina,
    skills: base.skills,
  };
}

// ---------- XP eğrisi ----------

export function xpForLevel(level: number): number {
  // Level 1→2 = 100, her level +50 artar, 10'dan sonra yavaşlar
  if (level <= 10) return 50 + level * 50;
  return 550 + (level - 10) * 120;
}
