// Spot gladyatörü — statik kataloglar. DB'ye seed/upsert edilir.

export const DUSMANLAR = [
  { slug: "caylak-kuzu", name: "çaylak kuzu", tier: 1, levelMin: 1, levelMax: 2, isBoss: false,
    strength: 4, agility: 4, vitality: 3, intelligence: 3, attackBonus: 0, defenseBonus: 0, hpBonus: 0, goldReward: 15, xpReward: 20, taunt: "mee?" },
  { slug: "sokak-serserisi", name: "sokak serserisi", tier: 1, levelMin: 1, levelMax: 3, isBoss: false,
    strength: 6, agility: 5, vitality: 4, intelligence: 3, attackBonus: 1, defenseBonus: 0, hpBonus: 5, goldReward: 22, xpReward: 30, taunt: "cebinde ne var?" },
  { slug: "fani-hirsiz", name: "fani hırsız", tier: 2, levelMin: 2, levelMax: 4, isBoss: false,
    strength: 5, agility: 8, vitality: 4, intelligence: 4, attackBonus: 2, defenseBonus: 1, hpBonus: 0, goldReward: 30, xpReward: 40, taunt: "hızlıyım." },
  { slug: "koyun-kiligi", name: "kurt (koyun kılığında)", tier: 2, levelMin: 3, levelMax: 5, isBoss: false,
    strength: 9, agility: 6, vitality: 6, intelligence: 2, attackBonus: 3, defenseBonus: 2, hpBonus: 15, goldReward: 40, xpReward: 55, taunt: "mee, ama dişlerim var" },
  { slug: "trol-bekci", name: "trol bekçisi", tier: 2, levelMin: 4, levelMax: 6, isBoss: false,
    strength: 12, agility: 4, vitality: 10, intelligence: 2, attackBonus: 4, defenseBonus: 3, hpBonus: 30, goldReward: 55, xpReward: 70, taunt: "grrraaa" },

  // tier 3
  { slug: "legion-gaspi", name: "gaspın lejyoneri", tier: 3, levelMin: 5, levelMax: 8, isBoss: false,
    strength: 10, agility: 8, vitality: 9, intelligence: 4, attackBonus: 5, defenseBonus: 4, hpBonus: 20, goldReward: 70, xpReward: 90, taunt: "disiplin!" },
  { slug: "yemin-bozan", name: "yemin bozan şövalye", tier: 3, levelMin: 6, levelMax: 9, isBoss: false,
    strength: 13, agility: 7, vitality: 11, intelligence: 5, attackBonus: 7, defenseBonus: 5, hpBonus: 35, goldReward: 85, xpReward: 110, taunt: "yemin mi? altın gerçektir." },
  { slug: "ruh-emici", name: "ruh emici büyücü", tier: 3, levelMin: 7, levelMax: 10, isBoss: false,
    strength: 6, agility: 9, vitality: 8, intelligence: 15, attackBonus: 3, defenseBonus: 3, hpBonus: 15, goldReward: 100, xpReward: 130, taunt: "senin ruhunu istiyorum." },

  // tier 4 — boss tier
  { slug: "koyun-kesici", name: "koyun kesici kasap", tier: 4, levelMin: 8, levelMax: 12, isBoss: false,
    strength: 18, agility: 6, vitality: 14, intelligence: 3, attackBonus: 10, defenseBonus: 6, hpBonus: 50, goldReward: 140, xpReward: 170, taunt: "et is et" },
  { slug: "kurt-adam", name: "kurt adam", tier: 4, levelMin: 9, levelMax: 13, isBoss: false,
    strength: 16, agility: 14, vitality: 13, intelligence: 6, attackBonus: 9, defenseBonus: 5, hpBonus: 40, goldReward: 160, xpReward: 200, taunt: "ay yükseliyor." },

  // BOSS'lar — level 5, 10, 15, 20, 25
  { slug: "boss-kiralik-kelle", name: "kiralık kelle", tier: 3, levelMin: 5, levelMax: 7, isBoss: true,
    strength: 15, agility: 10, vitality: 15, intelligence: 5, attackBonus: 8, defenseBonus: 6, hpBonus: 60, goldReward: 250, xpReward: 300, taunt: "başın para eder." },
  { slug: "boss-gladyator-sampiyonu", name: "eski şampiyon gladyator", tier: 4, levelMin: 10, levelMax: 13, isBoss: true,
    strength: 22, agility: 15, vitality: 20, intelligence: 8, attackBonus: 14, defenseBonus: 10, hpBonus: 90, goldReward: 500, xpReward: 600, taunt: "arena benim evim." },
  { slug: "boss-kara-buyucu", name: "kara büyücü", tier: 5, levelMin: 15, levelMax: 18, isBoss: true,
    strength: 12, agility: 14, vitality: 18, intelligence: 28, attackBonus: 8, defenseBonus: 8, hpBonus: 80, goldReward: 800, xpReward: 900, taunt: "kaderi değiştiririm." },
  { slug: "boss-minotor", name: "minotor", tier: 5, levelMin: 20, levelMax: 23, isBoss: true,
    strength: 30, agility: 10, vitality: 28, intelligence: 6, attackBonus: 18, defenseBonus: 14, hpBonus: 150, goldReward: 1200, xpReward: 1400, taunt: "labirentte kaybol." },
  { slug: "boss-imparator", name: "arena imparatoru", tier: 5, levelMin: 25, levelMax: 30, isBoss: true,
    strength: 35, agility: 20, vitality: 35, intelligence: 18, attackBonus: 25, defenseBonus: 20, hpBonus: 200, goldReward: 2500, xpReward: 3000, taunt: "dizinin üstüne çök." },
];

export type SpotEsyaSeed = {
  slug: string;
  name: string;
  type: "WEAPON" | "ARMOR" | "HELMET" | "SHIELD" | "BOOTS" | "POTION_HP" | "POTION_MANA";
  price: number;
  levelReq?: number;
  strReq?: number;
  agiReq?: number;
  attackBonus?: number;
  defenseBonus?: number;
  hpBonus?: number;
  manaBonus?: number;
  critBonus?: number;
  dodgeBonus?: number;
  rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  icon?: string;
  description?: string;
};

export const ESYALAR: SpotEsyaSeed[] = [
  // ------- WEAPONS -------
  { slug: "paslı-kılıç", name: "paslı kılıç", type: "WEAPON", price: 50, attackBonus: 3, rarity: "COMMON", icon: "🗡️", description: "tırnak kaçmış bir kılıç." },
  { slug: "demir-kılıç", name: "demir kılıç", type: "WEAPON", price: 180, levelReq: 3, attackBonus: 6, rarity: "COMMON", icon: "⚔️" },
  { slug: "celik-pala", name: "çelik pala", type: "WEAPON", price: 450, levelReq: 5, strReq: 10, attackBonus: 11, critBonus: 3, rarity: "UNCOMMON", icon: "🗡️" },
  { slug: "savas-baltasi", name: "savaş baltası", type: "WEAPON", price: 800, levelReq: 8, strReq: 18, attackBonus: 18, critBonus: 2, rarity: "UNCOMMON", icon: "🪓" },
  { slug: "hafif-hancer", name: "hafif hançer", type: "WEAPON", price: 600, levelReq: 6, agiReq: 12, attackBonus: 10, critBonus: 12, dodgeBonus: 3, rarity: "UNCOMMON", icon: "🗡️" },
  { slug: "gladius", name: "gladius", type: "WEAPON", price: 1500, levelReq: 10, strReq: 20, attackBonus: 25, critBonus: 6, rarity: "RARE", icon: "⚔️" },
  { slug: "yildirimli-mizrak", name: "yıldırımlı mızrak", type: "WEAPON", price: 3000, levelReq: 14, strReq: 22, attackBonus: 35, critBonus: 8, manaBonus: 15, rarity: "RARE", icon: "🔱" },
  { slug: "kan-kilici", name: "kan kılıcı", type: "WEAPON", price: 6500, levelReq: 18, strReq: 28, attackBonus: 55, critBonus: 15, hpBonus: 20, rarity: "EPIC", icon: "🗡️" },
  { slug: "ejder-disi", name: "ejder dişi", type: "WEAPON", price: 12000, levelReq: 22, strReq: 35, attackBonus: 75, critBonus: 20, manaBonus: 25, rarity: "EPIC", icon: "🐉" },
  { slug: "efsanevi-balta", name: "efsanevi savaş baltası", type: "WEAPON", price: 30000, levelReq: 27, strReq: 45, attackBonus: 110, critBonus: 25, hpBonus: 40, rarity: "LEGENDARY", icon: "⚒️" },

  // ------- ARMOR -------
  { slug: "bez-tulum", name: "bez tulum", type: "ARMOR", price: 40, defenseBonus: 2, hpBonus: 5, rarity: "COMMON", icon: "🥼" },
  { slug: "deri-zirh", name: "deri zırh", type: "ARMOR", price: 180, levelReq: 3, defenseBonus: 5, hpBonus: 12, rarity: "COMMON", icon: "🛡️" },
  { slug: "yamali-halka-zirh", name: "yamalı halka zırhı", type: "ARMOR", price: 500, levelReq: 6, defenseBonus: 10, hpBonus: 25, rarity: "UNCOMMON", icon: "🥋" },
  { slug: "celik-gogus-zirhi", name: "çelik göğüs zırhı", type: "ARMOR", price: 1200, levelReq: 9, defenseBonus: 17, hpBonus: 40, rarity: "UNCOMMON", icon: "🛡️" },
  { slug: "agir-plate", name: "ağır plate zırh", type: "ARMOR", price: 2800, levelReq: 13, strReq: 18, defenseBonus: 28, hpBonus: 70, dodgeBonus: -3, rarity: "RARE", icon: "🛡️" },
  { slug: "ejder-pulu", name: "ejder pulu zırh", type: "ARMOR", price: 8000, levelReq: 19, defenseBonus: 45, hpBonus: 110, manaBonus: 20, rarity: "EPIC", icon: "🐲" },
  { slug: "tanri-zirhi", name: "tanrı zırhı", type: "ARMOR", price: 25000, levelReq: 26, defenseBonus: 80, hpBonus: 220, manaBonus: 40, critBonus: 5, rarity: "LEGENDARY", icon: "✨" },

  // ------- HELMET -------
  { slug: "deri-kask", name: "deri kask", type: "HELMET", price: 60, defenseBonus: 1, hpBonus: 3, rarity: "COMMON", icon: "⛑️" },
  { slug: "demir-baslik", name: "demir başlık", type: "HELMET", price: 300, levelReq: 4, defenseBonus: 4, hpBonus: 10, rarity: "COMMON" },
  { slug: "suvari-baslik", name: "süvari başlığı", type: "HELMET", price: 900, levelReq: 8, defenseBonus: 9, hpBonus: 22, critBonus: 2, rarity: "UNCOMMON" },
  { slug: "kafatasi-kirici", name: "kafatası kırıcı", type: "HELMET", price: 2200, levelReq: 12, defenseBonus: 15, hpBonus: 40, rarity: "RARE" },
  { slug: "imparator-taci", name: "imparator tacı", type: "HELMET", price: 9000, levelReq: 20, defenseBonus: 28, hpBonus: 90, manaBonus: 25, critBonus: 8, rarity: "LEGENDARY", icon: "👑" },

  // ------- SHIELD -------
  { slug: "ahsap-kalkan", name: "ahşap kalkan", type: "SHIELD", price: 80, defenseBonus: 3, rarity: "COMMON", icon: "🛡️" },
  { slug: "demir-kalkan", name: "demir kalkan", type: "SHIELD", price: 400, levelReq: 5, defenseBonus: 8, hpBonus: 5, rarity: "COMMON" },
  { slug: "kule-kalkani", name: "kule kalkanı", type: "SHIELD", price: 1600, levelReq: 11, strReq: 15, defenseBonus: 20, hpBonus: 20, dodgeBonus: -2, rarity: "RARE" },
  { slug: "sihirli-kalkan", name: "sihirli kalkan", type: "SHIELD", price: 5500, levelReq: 17, defenseBonus: 32, manaBonus: 30, rarity: "EPIC" },

  // ------- BOOTS -------
  { slug: "hafif-sandalet", name: "hafif sandalet", type: "BOOTS", price: 50, defenseBonus: 1, dodgeBonus: 2, rarity: "COMMON", icon: "👡" },
  { slug: "cizme", name: "deri çizme", type: "BOOTS", price: 250, levelReq: 4, defenseBonus: 3, dodgeBonus: 4, rarity: "COMMON", icon: "🥾" },
  { slug: "celik-cizme", name: "çelik çizme", type: "BOOTS", price: 900, levelReq: 9, defenseBonus: 7, dodgeBonus: 5, rarity: "UNCOMMON" },
  { slug: "ruzgar-ayakkabisi", name: "rüzgar ayakkabısı", type: "BOOTS", price: 3500, levelReq: 15, agiReq: 20, defenseBonus: 10, dodgeBonus: 14, critBonus: 4, rarity: "EPIC" },

  // ------- POTIONS -------
  { slug: "kucuk-hp-iksiri", name: "küçük hp iksiri", type: "POTION_HP", price: 30, hpBonus: 35, rarity: "COMMON", icon: "🧪" },
  { slug: "buyuk-hp-iksiri", name: "büyük hp iksiri", type: "POTION_HP", price: 120, levelReq: 6, hpBonus: 100, rarity: "UNCOMMON", icon: "🧪" },
  { slug: "kucuk-mana-iksiri", name: "küçük mana iksiri", type: "POTION_MANA", price: 40, manaBonus: 25, rarity: "COMMON", icon: "🔮" },
  { slug: "buyuk-mana-iksiri", name: "büyük mana iksiri", type: "POTION_MANA", price: 150, levelReq: 6, manaBonus: 70, rarity: "UNCOMMON", icon: "🔮" },
];

export const YETENEKLER = [
  { slug: "guc-vurusu", name: "güç vuruşu", branch: "GUC" as const, levelReq: 1, strReq: 8, staminaCost: 10, manaCost: 0, effectKind: "DAMAGE" as const, power: 200, description: "güçlü bir darbe — hasar 2x.", icon: "💥" },
  { slug: "kalkan-kiran", name: "kalkan kıran", branch: "GUC" as const, levelReq: 4, strReq: 14, staminaCost: 12, manaCost: 0, effectKind: "DEBUFF_ENEMY" as const, power: 100, description: "rakibin savunmasını kırar.", icon: "🔨" },
  { slug: "berserker", name: "berserker öfkesi", branch: "GUC" as const, levelReq: 8, strReq: 22, staminaCost: 15, manaCost: 0, effectKind: "BUFF_ATTACK" as const, power: 150, description: "saldırını 1.5x yapar, 2 tur.", icon: "😡" },

  { slug: "hizli-darbe", name: "hızlı darbe", branch: "CEVIKLIK" as const, levelReq: 1, agiReq: 8, staminaCost: 6, manaCost: 0, effectKind: "DAMAGE" as const, power: 160, description: "iki hızlı vuruş.", icon: "⚡" },
  { slug: "bicak-firlat", name: "bıçak fırlat", branch: "CEVIKLIK" as const, levelReq: 4, agiReq: 14, staminaCost: 5, manaCost: 0, effectKind: "DAMAGE" as const, power: 120, description: "savunmayı kısmen deler.", icon: "🔪" },
  { slug: "golge-adim", name: "gölge adım", branch: "CEVIKLIK" as const, levelReq: 9, agiReq: 22, staminaCost: 10, manaCost: 0, effectKind: "BUFF_DEFENSE" as const, power: 200, description: "2 tur boyunca kaçınma x2.", icon: "🌫️" },

  { slug: "iyilesme", name: "iyileşme", branch: "ZEKA" as const, levelReq: 2, intReq: 10, staminaCost: 0, manaCost: 15, effectKind: "HEAL" as const, power: 35, description: "max hp'nin %35'i kadar iyileş.", icon: "✨" },
  { slug: "yildirim", name: "yıldırım", branch: "ZEKA" as const, levelReq: 5, intReq: 16, staminaCost: 0, manaCost: 20, effectKind: "DAMAGE" as const, power: 180, description: "zeka temelli büyü hasarı.", icon: "⚡" },
  { slug: "kan-emici", name: "kan emici vuruş", branch: "ZEKA" as const, levelReq: 7, intReq: 18, staminaCost: 8, manaCost: 5, effectKind: "LIFESTEAL" as const, power: 130, description: "hasarın %60'ını hp olarak emer.", icon: "🩸" },
  { slug: "zaman-durdur", name: "zaman durdur", branch: "ZEKA" as const, levelReq: 12, intReq: 28, staminaCost: 0, manaCost: 40, effectKind: "STUN" as const, power: 100, description: "rakibi 1 tur dondurur.", icon: "⏳" },
];
