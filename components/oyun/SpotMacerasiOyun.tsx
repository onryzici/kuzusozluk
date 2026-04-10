"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ============================================================
// TIPLER
// ============================================================
type ItemType = "weapon" | "armor" | "potion";
type Item = {
  id: string;
  name: string;
  type: ItemType;
  atk?: number;
  def?: number;
  heal?: number;
  rarity: "common" | "rare" | "epic" | "legendary";
};

type Enemy = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  color: string;
  isBoss?: boolean;
  dropTable?: { id: string; chance: number }[];
};

type Character = {
  charName: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  gold: number;
  inventory: { id: string; qty: number }[];
  equipped: { weapon?: string; armor?: string };
  defeatedBosses: string[];
  totalKills: number;
};

type Tile = "floor" | "wall" | "enemy" | "boss" | "chest" | "exit";

type DungeonState = {
  dungeonId: string;
  grid: Tile[][];
  enemies: { x: number; y: number; enemyId: string; alive: boolean }[];
  chests: { x: number; y: number; opened: boolean }[];
  bossPos: { x: number; y: number };
  exitPos: { x: number; y: number };
  playerX: number;
  playerY: number;
};

type CombatState = {
  enemy: Enemy;
  isBoss: boolean;
  log: string[];
  turn: "player" | "enemy" | "anim";
  animTimer: number;
  shake: number;
  playerHurtFlash: number;
  enemyHurtFlash: number;
  floatingTexts: { x: number; y: number; text: string; color: string; vy: number; life: number }[];
  defending: boolean;
};

type Scene =
  | "loading"
  | "name-input"
  | "town"
  | "dungeon"
  | "combat"
  | "victory"
  | "boss-victory"
  | "death"
  | "inventory"
  | "win";

// ============================================================
// ITEM TANIMLARI
// ============================================================
const ITEMS: Record<string, Item> = {
  // Silahlar
  w_stick: { id: "w_stick", name: "tahta sopa", type: "weapon", atk: 3, rarity: "common" },
  w_dagger: { id: "w_dagger", name: "paslı hançer", type: "weapon", atk: 7, rarity: "common" },
  w_sword: { id: "w_sword", name: "demir kılıç", type: "weapon", atk: 12, rarity: "rare" },
  w_axe: { id: "w_axe", name: "savaş baltası", type: "weapon", atk: 18, rarity: "rare" },
  w_steel: { id: "w_steel", name: "çelik kılıç", type: "weapon", atk: 25, rarity: "epic" },
  w_mythic: { id: "w_mythic", name: "mistik pala", type: "weapon", atk: 38, rarity: "epic" },
  w_dragon: { id: "w_dragon", name: "ejder kılıcı", type: "weapon", atk: 55, rarity: "legendary" },
  w_kuzu: { id: "w_kuzu", name: "kuzu asası", type: "weapon", atk: 80, rarity: "legendary" },
  // Zırhlar
  a_cloth: { id: "a_cloth", name: "kumaş zırh", type: "armor", def: 2, rarity: "common" },
  a_leather: { id: "a_leather", name: "deri zırh", type: "armor", def: 5, rarity: "common" },
  a_chain: { id: "a_chain", name: "zincir zırh", type: "armor", def: 10, rarity: "rare" },
  a_steel: { id: "a_steel", name: "çelik göğüslük", type: "armor", def: 16, rarity: "rare" },
  a_plate: { id: "a_plate", name: "plaka zırh", type: "armor", def: 24, rarity: "epic" },
  a_dragon: { id: "a_dragon", name: "ejder pulları", type: "armor", def: 36, rarity: "legendary" },
  // İksirler
  p_small: { id: "p_small", name: "küçük iksir", type: "potion", heal: 30, rarity: "common" },
  p_big: { id: "p_big", name: "büyük iksir", type: "potion", heal: 80, rarity: "rare" },
  p_full: { id: "p_full", name: "tam iksir", type: "potion", heal: 9999, rarity: "epic" },
};

const RARITY_COLORS: Record<string, string> = {
  common: "#bbbbbb",
  rare: "#5b9eff",
  epic: "#c264ff",
  legendary: "#ffaa33",
};

// ============================================================
// DÜŞMAN ŞABLONLARI
// ============================================================
function makeEnemy(template: Omit<Enemy, "maxHp">): Enemy {
  return { ...template, maxHp: template.hp };
}

const ENEMY_TEMPLATES: Record<string, Omit<Enemy, "maxHp">> = {
  slime: { id: "slime", name: "sümük", emoji: "🟢", hp: 25, atk: 6, def: 1, xp: 12, gold: 5, color: "#5dd95d" },
  rat: { id: "rat", name: "fare", emoji: "🐀", hp: 18, atk: 8, def: 0, xp: 10, gold: 4, color: "#888877" },
  bat: { id: "bat", name: "yarasa", emoji: "🦇", hp: 22, atk: 10, def: 1, xp: 14, gold: 6, color: "#5a4a6a" },
  goblin: { id: "goblin", name: "goblin", emoji: "👺", hp: 45, atk: 14, def: 4, xp: 25, gold: 12, color: "#7da856" },
  skeleton: { id: "skeleton", name: "iskelet", emoji: "💀", hp: 60, atk: 17, def: 5, xp: 32, gold: 18, color: "#dddddd" },
  zombie: { id: "zombie", name: "zombi", emoji: "🧟", hp: 90, atk: 20, def: 7, xp: 45, gold: 25, color: "#5e7d4f" },
  ghost: { id: "ghost", name: "hayalet", emoji: "👻", hp: 110, atk: 26, def: 9, xp: 60, gold: 35, color: "#ccccff" },
  ogre: { id: "ogre", name: "dev", emoji: "👹", hp: 180, atk: 32, def: 12, xp: 90, gold: 55, color: "#c46b3d" },
  demon: { id: "demon", name: "iblis", emoji: "😈", hp: 240, atk: 42, def: 15, xp: 130, gold: 80, color: "#a82828" },
  wraith: { id: "wraith", name: "ruh", emoji: "🕯️", hp: 320, atk: 55, def: 18, xp: 180, gold: 110, color: "#7a55b8" },
  // Bosslar
  boss_tml: { id: "boss_tml", name: "tml", emoji: "🐺", hp: 220, atk: 22, def: 8, xp: 150, gold: 120, color: "#666666", isBoss: true, dropTable: [{ id: "w_sword", chance: 1 }] },
  boss_korc: { id: "boss_korc", name: "korç", emoji: "👑", hp: 480, atk: 38, def: 14, xp: 350, gold: 280, color: "#8b4513", isBoss: true, dropTable: [{ id: "a_chain", chance: 1 }, { id: "p_big", chance: 1 }] },
  boss_yss: { id: "boss_yss", name: "yss", emoji: "🧙", hp: 850, atk: 55, def: 20, xp: 700, gold: 500, color: "#4169e1", isBoss: true, dropTable: [{ id: "w_steel", chance: 1 }, { id: "p_big", chance: 1 }] },
  boss_sog: { id: "boss_sog", name: "sog", emoji: "🔥", hp: 1400, atk: 78, def: 28, xp: 1300, gold: 850, color: "#ff4500", isBoss: true, dropTable: [{ id: "a_plate", chance: 1 }, { id: "w_mythic", chance: 1 }] },
  boss_mpic: { id: "boss_mpic", name: "mpiç", emoji: "💀", hp: 2400, atk: 110, def: 38, xp: 2500, gold: 1500, color: "#9932cc", isBoss: true, dropTable: [{ id: "w_dragon", chance: 1 }, { id: "a_dragon", chance: 1 }, { id: "w_kuzu", chance: 0.3 }] },
};

// ============================================================
// DUNGEON TANIMLARI
// ============================================================
type DungeonDef = {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  bossId: string;
  enemies: string[];
  enemyCount: number;
  chestCount: number;
  bgColor: string;
  wallColor: string;
  floorColor: string;
};

const DUNGEONS: DungeonDef[] = [
  {
    id: "d1",
    name: "karanlık mağara",
    description: "yarasalar ve sümükler. tml burada uyuyor.",
    minLevel: 1,
    bossId: "boss_tml",
    enemies: ["slime", "rat", "bat"],
    enemyCount: 6,
    chestCount: 2,
    bgColor: "#1a1a24",
    wallColor: "#3a3a4a",
    floorColor: "#22222e",
  },
  {
    id: "d2",
    name: "ölüler vadisi",
    description: "iskeletler ve goblinler. korç burayı yönetiyor.",
    minLevel: 4,
    bossId: "boss_korc",
    enemies: ["goblin", "skeleton", "rat"],
    enemyCount: 8,
    chestCount: 3,
    bgColor: "#241a1a",
    wallColor: "#4a3030",
    floorColor: "#2e2222",
  },
  {
    id: "d3",
    name: "buzul kalesi",
    description: "zombiler ve hayaletler. yss seni bekliyor.",
    minLevel: 8,
    bossId: "boss_yss",
    enemies: ["zombie", "ghost", "skeleton"],
    enemyCount: 9,
    chestCount: 3,
    bgColor: "#1a2438",
    wallColor: "#3a5070",
    floorColor: "#22304a",
  },
  {
    id: "d4",
    name: "lav tapınağı",
    description: "devler ve iblisler. sog'un krallığı.",
    minLevel: 13,
    bossId: "boss_sog",
    enemies: ["ogre", "demon", "ghost"],
    enemyCount: 10,
    chestCount: 3,
    bgColor: "#2a1505",
    wallColor: "#6a3a15",
    floorColor: "#3a1d08",
  },
  {
    id: "d5",
    name: "kaos kulesi",
    description: "ruhlar ve iblisler. mpiç son düşmanın.",
    minLevel: 20,
    bossId: "boss_mpic",
    enemies: ["wraith", "demon", "ogre"],
    enemyCount: 12,
    chestCount: 4,
    bgColor: "#1a0a1a",
    wallColor: "#5a2a5a",
    floorColor: "#2a142a",
  },
];

// ============================================================
// SABITLER
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 600;
const TILE_SIZE = 50;
const GRID_W = 16;
const GRID_H = 12;

// ============================================================
// KARAKTER & STAT YARDIMCILARI
// ============================================================
function makeNewCharacter(name: string): Character {
  return {
    charName: name,
    level: 1,
    xp: 0,
    hp: 60,
    maxHp: 60,
    atk: 10,
    def: 3,
    gold: 0,
    inventory: [
      { id: "p_small", qty: 3 },
      { id: "w_stick", qty: 1 },
      { id: "a_cloth", qty: 1 },
    ],
    equipped: { weapon: "w_stick", armor: "a_cloth" },
    defeatedBosses: [],
    totalKills: 0,
  };
}

function xpToNext(level: number): number {
  return 50 + level * 50 + level * level * 10;
}

function totalAtk(c: Character): number {
  const w = c.equipped.weapon ? ITEMS[c.equipped.weapon] : null;
  return c.atk + (w?.atk || 0);
}

function totalDef(c: Character): number {
  const a = c.equipped.armor ? ITEMS[c.equipped.armor] : null;
  return c.def + (a?.def || 0);
}

function levelUp(c: Character): boolean {
  let leveled = false;
  while (c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    c.level += 1;
    c.maxHp += 15;
    c.hp = c.maxHp;
    c.atk += 3;
    c.def += 2;
    leveled = true;
  }
  return leveled;
}

function addItem(c: Character, itemId: string, qty: number = 1) {
  const existing = c.inventory.find((i) => i.id === itemId);
  if (existing) existing.qty += qty;
  else c.inventory.push({ id: itemId, qty });
}

function removeItem(c: Character, itemId: string, qty: number = 1) {
  const existing = c.inventory.find((i) => i.id === itemId);
  if (!existing) return;
  existing.qty -= qty;
  if (existing.qty <= 0) {
    c.inventory = c.inventory.filter((i) => i.id !== itemId);
  }
}

// ============================================================
// DUNGEON ÜRETIMI
// ============================================================
function generateDungeon(def: DungeonDef): DungeonState {
  const grid: Tile[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < GRID_W; x++) {
      const isEdge = x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1;
      row.push(isEdge ? "wall" : "floor");
    }
    grid.push(row);
  }

  // Iç duvarlar (rastgele kısa duvarlar)
  for (let i = 0; i < 8; i++) {
    const wx = 2 + Math.floor(Math.random() * (GRID_W - 4));
    const wy = 2 + Math.floor(Math.random() * (GRID_H - 4));
    const len = 2 + Math.floor(Math.random() * 3);
    const horiz = Math.random() < 0.5;
    for (let j = 0; j < len; j++) {
      const tx = horiz ? wx + j : wx;
      const ty = horiz ? wy : wy + j;
      if (tx < GRID_W - 1 && ty < GRID_H - 1) grid[ty][tx] = "wall";
    }
  }

  const isFree = (x: number, y: number) => grid[y]?.[x] === "floor";
  const findFree = (): { x: number; y: number } => {
    while (true) {
      const x = 1 + Math.floor(Math.random() * (GRID_W - 2));
      const y = 1 + Math.floor(Math.random() * (GRID_H - 2));
      if (isFree(x, y)) return { x, y };
    }
  };

  // Player start (sol alt)
  const playerX = 1;
  const playerY = GRID_H - 2;
  grid[playerY][playerX] = "floor";

  // Exit (sol üst)
  const exitX = 1;
  const exitY = 1;
  grid[exitY][exitX] = "exit";

  // Boss (sağ üst)
  const bossX = GRID_W - 2;
  const bossY = 1;
  grid[bossY][bossX] = "boss";

  // Düşmanları yerleştir
  const enemies: DungeonState["enemies"] = [];
  const used = new Set<string>([`${playerX},${playerY}`, `${exitX},${exitY}`, `${bossX},${bossY}`]);
  for (let i = 0; i < def.enemyCount; i++) {
    const pos = findFree();
    const k = `${pos.x},${pos.y}`;
    if (used.has(k)) {
      i--;
      continue;
    }
    used.add(k);
    grid[pos.y][pos.x] = "enemy";
    const enemyId = def.enemies[Math.floor(Math.random() * def.enemies.length)];
    enemies.push({ x: pos.x, y: pos.y, enemyId, alive: true });
  }

  // Sandıkları yerleştir
  const chests: DungeonState["chests"] = [];
  for (let i = 0; i < def.chestCount; i++) {
    const pos = findFree();
    const k = `${pos.x},${pos.y}`;
    if (used.has(k)) {
      i--;
      continue;
    }
    used.add(k);
    grid[pos.y][pos.x] = "chest";
    chests.push({ x: pos.x, y: pos.y, opened: false });
  }

  return {
    dungeonId: def.id,
    grid,
    enemies,
    chests,
    bossPos: { x: bossX, y: bossY },
    exitPos: { x: exitX, y: exitY },
    playerX,
    playerY,
  };
}

// ============================================================
// LOOT
// ============================================================
function rollLoot(playerLevel: number): { itemId: string | null; gold: number } {
  const gold = 5 + Math.floor(Math.random() * (10 + playerLevel * 3));
  const r = Math.random();
  if (r < 0.4) return { itemId: null, gold };
  if (r < 0.7) return { itemId: "p_small", gold };
  if (r < 0.85) return { itemId: "p_big", gold };
  // Tier'a göre item drop
  if (playerLevel >= 18 && r < 0.92) return { itemId: "w_mythic", gold };
  if (playerLevel >= 12 && r < 0.93) return { itemId: "a_steel", gold };
  if (playerLevel >= 8 && r < 0.95) return { itemId: "w_axe", gold };
  if (playerLevel >= 5 && r < 0.97) return { itemId: "a_leather", gold };
  return { itemId: "w_dagger", gold };
}

// ============================================================
// ANA COMPONENT
// ============================================================
type Props = {
  initialSave: any | null;
  onSave: (char: Character, bossesKilled: number) => Promise<void>;
};

export default function SpotMacerasiOyun({ initialSave, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<Scene>("loading");
  const [, forceUpdate] = useState(0);
  const rerender = useCallback(() => forceUpdate((v) => v + 1), []);

  const charRef = useRef<Character | null>(null);
  const dungeonRef = useRef<DungeonState | null>(null);
  const combatRef = useRef<CombatState | null>(null);
  const lastMoveRef = useRef<number>(0);
  const messageRef = useRef<{ text: string; until: number } | null>(null);
  const [nameInput, setNameInput] = useState("");

  // Init
  useEffect(() => {
    if (initialSave?.data) {
      try {
        const char = initialSave.data as Character;
        // Eski save'lerle uyumluluk için eksik alanları doldur
        if (!char.equipped) char.equipped = {};
        if (!char.inventory) char.inventory = [];
        if (!char.defeatedBosses) char.defeatedBosses = [];
        if (typeof char.totalKills !== "number") char.totalKills = 0;
        charRef.current = char;
        setScene("town");
      } catch {
        setScene("name-input");
      }
    } else {
      setScene("name-input");
    }
  }, [initialSave]);

  // Save helper
  const saveProgress = useCallback(async () => {
    if (!charRef.current) return;
    try {
      await onSave(charRef.current, charRef.current.defeatedBosses.length);
    } catch {}
  }, [onSave]);

  // Mesaj göster
  const showMessage = useCallback((text: string, ms: number = 2000) => {
    messageRef.current = { text, until: Date.now() + ms };
  }, []);

  // ========== KARAKTER OLUSTUR ==========
  const startNewGame = useCallback(() => {
    const name = nameInput.trim() || "spot kahramanı";
    charRef.current = makeNewCharacter(name);
    setScene("town");
    void saveProgress();
  }, [nameInput, saveProgress]);

  // ========== TOWN: DUNGEON GIR ==========
  const enterDungeon = useCallback(
    (def: DungeonDef) => {
      const c = charRef.current;
      if (!c) return;
      if (c.level < def.minLevel) {
        showMessage(`bu dungeon için en az level ${def.minLevel} gerekli`);
        return;
      }
      if (c.defeatedBosses.includes(def.bossId)) {
        showMessage(`${ENEMY_TEMPLATES[def.bossId].name} zaten öldü. yine girebilirsin.`);
      }
      // Tam HP ile dungeon'a gir
      c.hp = c.maxHp;
      dungeonRef.current = generateDungeon(def);
      setScene("dungeon");
    },
    [showMessage]
  );

  // ========== DUNGEON: HAREKET ==========
  const tryMove = useCallback(
    (dx: number, dy: number) => {
      const c = charRef.current;
      const d = dungeonRef.current;
      if (!c || !d) return;
      const now = Date.now();
      if (now - lastMoveRef.current < 100) return;
      lastMoveRef.current = now;

      const nx = d.playerX + dx;
      const ny = d.playerY + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) return;
      const tile = d.grid[ny][nx];
      if (tile === "wall") return;

      if (tile === "exit") {
        showMessage("kasabaya döndün");
        setScene("town");
        void saveProgress();
        return;
      }

      if (tile === "enemy") {
        const e = d.enemies.find((en) => en.x === nx && en.y === ny && en.alive);
        if (e) {
          const tmpl = ENEMY_TEMPLATES[e.enemyId];
          combatRef.current = {
            enemy: makeEnemy(tmpl),
            isBoss: false,
            log: [`bir ${tmpl.name} ile karşılaştın!`],
            turn: "player",
            animTimer: 0,
            shake: 0,
            playerHurtFlash: 0,
            enemyHurtFlash: 0,
            floatingTexts: [],
            defending: false,
          };
          setScene("combat");
        }
        return;
      }

      if (tile === "boss") {
        const def = DUNGEONS.find((dd) => dd.id === d.dungeonId);
        if (!def) return;
        const tmpl = ENEMY_TEMPLATES[def.bossId];
        combatRef.current = {
          enemy: makeEnemy(tmpl),
          isBoss: true,
          log: [`${tmpl.name} karşına çıktı! bu boss savaşı!`],
          turn: "player",
          animTimer: 0,
          shake: 0,
          playerHurtFlash: 0,
          enemyHurtFlash: 0,
          floatingTexts: [],
          defending: false,
        };
        setScene("combat");
        return;
      }

      if (tile === "chest") {
        const ch = d.chests.find((c) => c.x === nx && c.y === ny && !c.opened);
        if (ch) {
          ch.opened = true;
          d.grid[ny][nx] = "floor";
          const loot = rollLoot(c.level);
          c.gold += loot.gold;
          if (loot.itemId) {
            addItem(c, loot.itemId);
            showMessage(`sandık: ${ITEMS[loot.itemId].name} +${loot.gold} altın`);
          } else {
            showMessage(`sandık: +${loot.gold} altın`);
          }
        }
        d.playerX = nx;
        d.playerY = ny;
        rerender();
        return;
      }

      d.playerX = nx;
      d.playerY = ny;
      rerender();
    },
    [showMessage, saveProgress, rerender]
  );

  // ========== COMBAT AKSIYONLARI ==========
  const playerAttack = useCallback(() => {
    const c = charRef.current;
    const cb = combatRef.current;
    if (!c || !cb || cb.turn !== "player") return;

    const baseDmg = totalAtk(c) - cb.enemy.def;
    const variance = Math.floor(Math.random() * 5) - 2;
    let dmg = Math.max(1, baseDmg + variance);
    const crit = Math.random() < 0.12;
    if (crit) dmg = Math.floor(dmg * 1.7);

    cb.enemy.hp -= dmg;
    cb.enemyHurtFlash = 0.5;
    cb.shake = crit ? 0.6 : 0.3;
    cb.floatingTexts.push({
      x: 600,
      y: 220,
      text: crit ? `KRİTİK ${dmg}!` : `-${dmg}`,
      color: crit ? "#ffaa00" : "#ff5555",
      vy: -2,
      life: 1,
    });
    cb.log.unshift(crit ? `kritik vuruş! ${dmg} hasar verdin!` : `${dmg} hasar verdin`);
    if (cb.log.length > 4) cb.log.pop();

    if (cb.enemy.hp <= 0) {
      cb.enemy.hp = 0;
      // Zafer
      const xpGain = cb.enemy.xp;
      const goldGain = cb.enemy.gold;
      c.xp += xpGain;
      c.gold += goldGain;
      c.totalKills += 1;
      const leveled = levelUp(c);
      if (leveled) showMessage(`level atladın! şimdi level ${c.level}`);

      let lootMsg = "";
      if (cb.isBoss) {
        if (!c.defeatedBosses.includes(cb.enemy.id)) {
          c.defeatedBosses.push(cb.enemy.id);
        }
        // Boss drop
        if (cb.enemy.dropTable) {
          for (const drop of cb.enemy.dropTable) {
            if (Math.random() < drop.chance) {
              addItem(c, drop.id);
              lootMsg += ` +${ITEMS[drop.id].name}`;
            }
          }
        }
        cb.log.unshift(`${cb.enemy.name} öldürüldü! +${xpGain} xp +${goldGain} altın${lootMsg}`);
        // Tüm bosslar öldü mü?
        if (c.defeatedBosses.length >= 5) {
          setScene("win");
          void saveProgress();
          return;
        }
        setScene("boss-victory");
        void saveProgress();
        return;
      } else {
        // Random loot
        if (Math.random() < 0.35) {
          const loot = rollLoot(c.level);
          if (loot.itemId) {
            addItem(c, loot.itemId);
            lootMsg = ` +${ITEMS[loot.itemId].name}`;
          }
        }
        cb.log.unshift(`${cb.enemy.name} öldü! +${xpGain} xp +${goldGain} altın${lootMsg}`);

        // Dungeon'da düşmanı işaretle
        const d = dungeonRef.current;
        if (d) {
          const e = d.enemies.find((en) => en.alive && d.grid[en.y][en.x] === "enemy");
          // Aktif düşmanı bul (player'ın yanındaki)
          for (const en of d.enemies) {
            if (
              en.alive &&
              ((en.x === d.playerX && Math.abs(en.y - d.playerY) === 1) ||
                (en.y === d.playerY && Math.abs(en.x - d.playerX) === 1))
            ) {
              en.alive = false;
              d.grid[en.y][en.x] = "floor";
              break;
            }
          }
        }
        setScene("victory");
        return;
      }
    }

    cb.turn = "anim";
    cb.animTimer = 0.6;
    rerender();
  }, [showMessage, saveProgress, rerender]);

  const playerDefend = useCallback(() => {
    const cb = combatRef.current;
    if (!cb || cb.turn !== "player") return;
    cb.defending = true;
    cb.log.unshift("savunma pozisyonu aldın");
    if (cb.log.length > 4) cb.log.pop();
    cb.turn = "anim";
    cb.animTimer = 0.4;
    rerender();
  }, [rerender]);

  const playerUsePotion = useCallback(() => {
    const c = charRef.current;
    const cb = combatRef.current;
    if (!c || !cb || cb.turn !== "player") return;
    // En güçlü iksiri kullan
    const potions = c.inventory.filter((i) => ITEMS[i.id]?.type === "potion");
    if (potions.length === 0) {
      cb.log.unshift("iksirin yok!");
      if (cb.log.length > 4) cb.log.pop();
      rerender();
      return;
    }
    const best = potions.sort((a, b) => (ITEMS[b.id].heal || 0) - (ITEMS[a.id].heal || 0))[0];
    const heal = ITEMS[best.id].heal || 0;
    const before = c.hp;
    c.hp = Math.min(c.maxHp, c.hp + heal);
    removeItem(c, best.id, 1);
    cb.floatingTexts.push({
      x: 200,
      y: 220,
      text: `+${c.hp - before}`,
      color: "#5dd95d",
      vy: -2,
      life: 1,
    });
    cb.log.unshift(`${ITEMS[best.id].name} kullandın (+${c.hp - before} HP)`);
    if (cb.log.length > 4) cb.log.pop();
    cb.turn = "anim";
    cb.animTimer = 0.5;
    rerender();
  }, [rerender]);

  const playerFlee = useCallback(() => {
    const c = charRef.current;
    const cb = combatRef.current;
    if (!c || !cb || cb.turn !== "player") return;
    if (cb.isBoss) {
      cb.log.unshift("boss savaşından kaçamazsın!");
      if (cb.log.length > 4) cb.log.pop();
      rerender();
      return;
    }
    if (Math.random() < 0.7) {
      showMessage("kaçtın");
      setScene("dungeon");
    } else {
      cb.log.unshift("kaçamadın!");
      if (cb.log.length > 4) cb.log.pop();
      cb.turn = "anim";
      cb.animTimer = 0.5;
      rerender();
    }
  }, [showMessage, rerender]);

  // ========== ENVANTER AKSIYONLARI ==========
  const equipItem = useCallback(
    (itemId: string) => {
      const c = charRef.current;
      if (!c) return;
      const item = ITEMS[itemId];
      if (!item) return;
      if (item.type === "weapon") {
        c.equipped.weapon = itemId;
        showMessage(`${item.name} kuşandın`);
      } else if (item.type === "armor") {
        c.equipped.armor = itemId;
        showMessage(`${item.name} giydin`);
      }
      rerender();
      void saveProgress();
    },
    [showMessage, saveProgress, rerender]
  );

  const usePotion = useCallback(
    (itemId: string) => {
      const c = charRef.current;
      if (!c) return;
      const item = ITEMS[itemId];
      if (!item || item.type !== "potion") return;
      const before = c.hp;
      c.hp = Math.min(c.maxHp, c.hp + (item.heal || 0));
      removeItem(c, itemId, 1);
      showMessage(`+${c.hp - before} HP`);
      rerender();
      void saveProgress();
    },
    [showMessage, saveProgress, rerender]
  );

  // ========== KEYBOARD ==========
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (scene === "dungeon") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") tryMove(0, -1);
        else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") tryMove(0, 1);
        else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") tryMove(-1, 0);
        else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") tryMove(1, 0);
        else if (e.key === "Escape") setScene("town");
      } else if (scene === "combat") {
        if (e.key === "1") playerAttack();
        else if (e.key === "2") playerDefend();
        else if (e.key === "3") playerUsePotion();
        else if (e.key === "4") playerFlee();
      } else if (scene === "victory" || scene === "boss-victory") {
        if (e.key === "Enter" || e.key === " ") {
          setScene(scene === "boss-victory" ? "town" : "dungeon");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scene, tryMove, playerAttack, playerDefend, playerUsePotion, playerFlee]);

  // ========== ANIM/COMBAT LOOP ==========
  useEffect(() => {
    if (scene !== "combat") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const cb = combatRef.current;
      const c = charRef.current;
      if (!cb || !c) return;

      // Animasyon timer
      if (cb.turn === "anim") {
        cb.animTimer -= dt;
        if (cb.animTimer <= 0) {
          // Sıra düşmanda mı?
          if (cb.enemy.hp > 0) {
            cb.turn = "enemy";
            cb.animTimer = 0.5;
          } else {
            cb.turn = "player";
          }
        }
      } else if (cb.turn === "enemy") {
        cb.animTimer -= dt;
        if (cb.animTimer <= 0) {
          // Düşman saldır
          const baseDmg = cb.enemy.atk - totalDef(c);
          const variance = Math.floor(Math.random() * 4) - 1;
          let dmg = Math.max(1, baseDmg + variance);
          if (cb.defending) {
            dmg = Math.max(1, Math.floor(dmg * 0.4));
            cb.defending = false;
          }
          c.hp -= dmg;
          cb.playerHurtFlash = 0.5;
          cb.shake = 0.5;
          cb.floatingTexts.push({
            x: 200,
            y: 220,
            text: `-${dmg}`,
            color: "#ff5555",
            vy: -2,
            life: 1,
          });
          cb.log.unshift(`${cb.enemy.name} ${dmg} hasar verdi`);
          if (cb.log.length > 4) cb.log.pop();
          if (c.hp <= 0) {
            c.hp = 0;
            setScene("death");
            void saveProgress();
            return;
          }
          cb.turn = "player";
        }
      }

      // Hasar flash decay
      if (cb.playerHurtFlash > 0) cb.playerHurtFlash -= dt;
      if (cb.enemyHurtFlash > 0) cb.enemyHurtFlash -= dt;
      if (cb.shake > 0) cb.shake -= dt;

      // Floating text update
      for (const ft of cb.floatingTexts) {
        ft.y += ft.vy;
        ft.life -= dt;
      }
      cb.floatingTexts = cb.floatingTexts.filter((ft) => ft.life > 0);

      drawCombat();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // ========== ÇIZIM: COMBAT ==========
  const drawCombat = useCallback(() => {
    const canvas = canvasRef.current;
    const c = charRef.current;
    const cb = combatRef.current;
    if (!canvas || !c || !cb) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const shakeX = cb.shake > 0 ? (Math.random() - 0.5) * cb.shake * 12 : 0;
    const shakeY = cb.shake > 0 ? (Math.random() - 0.5) * cb.shake * 12 : 0;

    // Arka plan gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, cb.isBoss ? "#3a0a0a" : "#1a1a2a");
    grad.addColorStop(1, "#0a0a14");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Yıldızlar
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 30; i++) {
      const x = ((i * 73) % CANVAS_W);
      const y = ((i * 137) % 200);
      ctx.fillRect(x, y, 2, 2);
    }

    // Zemin çizgisi
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 350, CANVAS_W, CANVAS_H - 350);
    ctx.strokeStyle = "#3a3a4a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 350);
    ctx.lineTo(CANVAS_W, 350);
    ctx.stroke();

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // ===== OYUNCU (sol) =====
    drawHero(ctx, 180, 280, c, cb.playerHurtFlash > 0);

    // ===== DÜŞMAN (sağ) =====
    drawCreature(ctx, 580, 280, cb.enemy, cb.enemyHurtFlash > 0);

    ctx.restore();

    // ===== HUD: oyuncu HP barı (sol üst) =====
    drawBar(ctx, 30, 30, 280, 28, c.hp, c.maxHp, "#ff4444", "#1a1a24");
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(c.charName, 30, 22);
    ctx.fillText(`${c.hp}/${c.maxHp}`, 35, 49);
    ctx.textAlign = "right";
    ctx.fillText(`lvl ${c.level}`, 308, 22);

    // ===== HUD: düşman HP barı (sağ üst) =====
    drawBar(ctx, CANVAS_W - 310, 30, 280, 28, cb.enemy.hp, cb.enemy.maxHp, cb.isBoss ? "#9932cc" : "#aa3333", "#1a1a24");
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(cb.enemy.name + (cb.isBoss ? " (BOSS)" : ""), CANVAS_W - 310, 22);
    ctx.fillText(`${cb.enemy.hp}/${cb.enemy.maxHp}`, CANVAS_W - 305, 49);

    // ===== Floating texts =====
    for (const ft of cb.floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.globalAlpha = Math.min(1, ft.life);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1;
    }

    // ===== Combat log (alt orta) =====
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(20, 380, CANVAS_W - 40, 90);
    ctx.strokeStyle = "#3a3a4a";
    ctx.strokeRect(20, 380, CANVAS_W - 40, 90);
    ctx.fillStyle = "#dddddd";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    cb.log.forEach((l, i) => {
      ctx.globalAlpha = 1 - i * 0.2;
      ctx.fillText(l, 30, 400 + i * 18);
    });
    ctx.globalAlpha = 1;

    // ===== Action butonları (alt) =====
    const actions = [
      { key: "1", label: "saldır", color: "#aa3333" },
      { key: "2", label: "savun", color: "#3a6da8" },
      { key: "3", label: "iksir", color: "#3aa85a" },
      { key: "4", label: "kaç", color: "#6a6a6a" },
    ];
    const btnW = 180;
    const btnH = 40;
    const totalW = actions.length * btnW + (actions.length - 1) * 12;
    const startX = (CANVAS_W - totalW) / 2;
    actions.forEach((a, i) => {
      const x = startX + i * (btnW + 12);
      const y = 490;
      const enabled = cb.turn === "player";
      ctx.fillStyle = enabled ? a.color : "#2a2a34";
      ctx.fillRect(x, y, btnW, btnH);
      ctx.strokeStyle = enabled ? "#fff" : "#444";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, btnW, btnH);
      ctx.fillStyle = enabled ? "#fff" : "#666";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`[${a.key}] ${a.label}`, x + btnW / 2, y + btnH / 2);
      ctx.textBaseline = "alphabetic";
    });

    // Sıra göstergesi
    if (cb.turn === "player") {
      ctx.fillStyle = "#5dd95d";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(">>> SENİN SIRAN <<<", CANVAS_W / 2, 555);
    } else if (cb.turn === "enemy") {
      ctx.fillStyle = "#ff5555";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(">>> DÜŞMANIN SIRASI <<<", CANVAS_W / 2, 555);
    }
  }, []);

  // ========== ÇIZIM: KAHRAMAN (canvas pixel art) ==========
  function drawHero(ctx: CanvasRenderingContext2D, cx: number, cy: number, c: Character, hurt: boolean) {
    ctx.save();
    if (hurt) ctx.filter = "brightness(2.5) hue-rotate(0deg)";

    // Gölge
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 80, 40, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bacaklar
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(cx - 18, cy + 30, 12, 40);
    ctx.fillRect(cx + 6, cy + 30, 12, 40);

    // Botlar
    ctx.fillStyle = "#1a1208";
    ctx.fillRect(cx - 20, cy + 65, 16, 8);
    ctx.fillRect(cx + 4, cy + 65, 16, 8);

    // Vücut (zırh)
    const armorItem = c.equipped.armor ? ITEMS[c.equipped.armor] : null;
    let armorColor = "#5a4838";
    if (armorItem) {
      if (armorItem.id === "a_cloth") armorColor = "#8a7058";
      else if (armorItem.id === "a_leather") armorColor = "#6a4828";
      else if (armorItem.id === "a_chain") armorColor = "#7a7a8a";
      else if (armorItem.id === "a_steel") armorColor = "#9a9aaa";
      else if (armorItem.id === "a_plate") armorColor = "#cacad8";
      else if (armorItem.id === "a_dragon") armorColor = "#a83838";
    }
    ctx.fillStyle = armorColor;
    ctx.fillRect(cx - 28, cy - 20, 56, 55);

    // Kemer
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(cx - 28, cy + 28, 56, 6);
    ctx.fillStyle = "#daa520";
    ctx.fillRect(cx - 5, cy + 28, 10, 6);

    // Zırh detayı (göğüs çizgisi)
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx, cy + 30);
    ctx.stroke();

    // Kollar
    ctx.fillStyle = armorColor;
    ctx.fillRect(cx - 38, cy - 15, 14, 35);
    ctx.fillRect(cx + 24, cy - 15, 14, 35);

    // Eldivenler
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(cx - 40, cy + 18, 16, 10);
    ctx.fillRect(cx + 24, cy + 18, 16, 10);

    // Boyun
    ctx.fillStyle = "#e8b894";
    ctx.fillRect(cx - 8, cy - 28, 16, 10);

    // Kafa
    ctx.fillStyle = "#e8b894";
    ctx.beginPath();
    ctx.arc(cx, cy - 42, 20, 0, Math.PI * 2);
    ctx.fill();

    // Saç
    ctx.fillStyle = "#3a1808";
    ctx.beginPath();
    ctx.arc(cx, cy - 50, 22, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 22, cy - 52, 44, 8);

    // Gözler
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - 10, cy - 44, 6, 5);
    ctx.fillRect(cx + 4, cy - 44, 6, 5);
    ctx.fillStyle = "#1a1a2a";
    ctx.fillRect(cx - 8, cy - 43, 3, 3);
    ctx.fillRect(cx + 6, cy - 43, 3, 3);

    // Ağız
    ctx.strokeStyle = "#1a1a2a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 33);
    ctx.lineTo(cx + 4, cy - 33);
    ctx.stroke();

    // Silah (sağ elde)
    const weaponItem = c.equipped.weapon ? ITEMS[c.equipped.weapon] : null;
    if (weaponItem) {
      let blade = "#cccccc";
      let hilt = "#3a2818";
      let length = 50;
      if (weaponItem.id === "w_stick") {
        blade = "#8a5a28";
        length = 38;
      } else if (weaponItem.id === "w_dagger") {
        blade = "#aaaaaa";
        length = 30;
      } else if (weaponItem.id === "w_sword") {
        blade = "#dddddd";
      } else if (weaponItem.id === "w_axe") {
        blade = "#9a9a9a";
      } else if (weaponItem.id === "w_steel") {
        blade = "#e8e8f0";
      } else if (weaponItem.id === "w_mythic") {
        blade = "#c264ff";
      } else if (weaponItem.id === "w_dragon") {
        blade = "#ff8833";
        hilt = "#aa3300";
      } else if (weaponItem.id === "w_kuzu") {
        blade = "#ffd700";
        hilt = "#daa520";
        length = 55;
      }
      // Hilt
      ctx.fillStyle = hilt;
      ctx.fillRect(cx + 32, cy + 5, 8, 18);
      // Cross-guard
      ctx.fillRect(cx + 28, cy + 3, 16, 4);
      // Blade
      ctx.fillStyle = blade;
      ctx.fillRect(cx + 33, cy + 3 - length, 6, length);
      // Tip
      ctx.beginPath();
      ctx.moveTo(cx + 33, cy + 3 - length);
      ctx.lineTo(cx + 36, cy - 5 - length);
      ctx.lineTo(cx + 39, cy + 3 - length);
      ctx.fill();
      // Glow (legendary)
      if (weaponItem.rarity === "legendary") {
        ctx.shadowColor = blade;
        ctx.shadowBlur = 15;
        ctx.fillRect(cx + 33, cy + 3 - length, 6, length);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }

  // ========== ÇIZIM: DÜŞMAN (canvas) ==========
  function drawCreature(ctx: CanvasRenderingContext2D, cx: number, cy: number, e: Enemy, hurt: boolean) {
    ctx.save();
    if (hurt) ctx.filter = "brightness(2.5)";

    // Gölge
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 80, e.isBoss ? 60 : 35, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const scale = e.isBoss ? 1.4 : 1.0;
    const size = 50 * scale;

    // Vücut (yuvarlak/baloncuk)
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(cx, cy + 10, size, 0, Math.PI * 2);
    ctx.fill();

    // Karın (açık ton)
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 25, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Kafa (vücudun üstünde)
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(cx, cy - 30 * scale, size * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Boynuzlar (boss'larda)
    if (e.isBoss) {
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.moveTo(cx - 25 * scale, cy - 50 * scale);
      ctx.lineTo(cx - 35 * scale, cy - 80 * scale);
      ctx.lineTo(cx - 18 * scale, cy - 55 * scale);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 25 * scale, cy - 50 * scale);
      ctx.lineTo(cx + 35 * scale, cy - 80 * scale);
      ctx.lineTo(cx + 18 * scale, cy - 55 * scale);
      ctx.fill();
    }

    // Gözler (kırmızı parlayan)
    const eyeY = cy - 32 * scale;
    const eyeOffset = 12 * scale;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - eyeOffset, eyeY, 6 * scale, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffset, eyeY, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.isBoss ? "#ff2222" : "#222";
    ctx.beginPath();
    ctx.arc(cx - eyeOffset, eyeY, 3 * scale, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffset, eyeY, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    if (e.isBoss) {
      ctx.shadowColor = "#ff2222";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx - eyeOffset, eyeY, 3 * scale, 0, Math.PI * 2);
      ctx.arc(cx + eyeOffset, eyeY, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Dişler
    ctx.fillStyle = "#fff";
    const mouthY = cy - 18 * scale;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 6 * scale, mouthY);
      ctx.lineTo(cx + i * 6 * scale + 3 * scale, mouthY);
      ctx.lineTo(cx + i * 6 * scale + 1.5 * scale, mouthY + 6 * scale);
      ctx.fill();
    }

    // Emoji yardımcı (ortada büyük)
    ctx.font = `${(e.isBoss ? 32 : 22)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(e.emoji, cx, cy + 18);

    ctx.restore();
  }

  // ========== ÇIZIM: BAR ==========
  function drawBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    cur: number,
    max: number,
    fill: string,
    bg: string
  ) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    const ratio = Math.max(0, Math.min(1, cur / max));
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, (w - 4) * ratio, h - 4);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  // ========== ÇIZIM: DUNGEON ==========
  const drawDungeon = useCallback(() => {
    const canvas = canvasRef.current;
    const c = charRef.current;
    const d = dungeonRef.current;
    if (!canvas || !c || !d) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const def = DUNGEONS.find((dd) => dd.id === d.dungeonId);
    if (!def) return;

    // Background
    ctx.fillStyle = def.bgColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid çiz
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const tile = d.grid[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === "wall") {
          ctx.fillStyle = def.wallColor;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Brick pattern
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.beginPath();
          ctx.moveTo(px, py + TILE_SIZE / 2);
          ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE / 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = def.floorColor;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Faint grid
          ctx.strokeStyle = "rgba(255,255,255,0.04)";
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

          if (tile === "exit") {
            ctx.fillStyle = "#5dd95d";
            ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "center";
            ctx.fillText("ÇIK", px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 4);
          } else if (tile === "boss") {
            ctx.fillStyle = "#a82828";
            ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            ctx.font = "26px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(ENEMY_TEMPLATES[def.bossId].emoji, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10);
            // Glow
            ctx.shadowColor = "#ff2222";
            ctx.shadowBlur = 15;
            ctx.strokeStyle = "#ff5555";
            ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            ctx.shadowBlur = 0;
          } else if (tile === "enemy") {
            const e = d.enemies.find((en) => en.x === x && en.y === y && en.alive);
            if (e) {
              const tmpl = ENEMY_TEMPLATES[e.enemyId];
              ctx.fillStyle = tmpl.color;
              ctx.beginPath();
              ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 16, 0, Math.PI * 2);
              ctx.fill();
              ctx.font = "20px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(tmpl.emoji, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 7);
            }
          } else if (tile === "chest") {
            ctx.fillStyle = "#daa520";
            ctx.fillRect(px + 12, py + 16, TILE_SIZE - 24, TILE_SIZE - 28);
            ctx.fillStyle = "#8b6914";
            ctx.fillRect(px + 12, py + 16, TILE_SIZE - 24, 6);
            ctx.fillStyle = "#fff";
            ctx.fillRect(px + TILE_SIZE / 2 - 2, py + 22, 4, 4);
          }
        }
      }
    }

    // Player çiz
    const pxPlayer = d.playerX * TILE_SIZE + TILE_SIZE / 2;
    const pyPlayer = d.playerY * TILE_SIZE + TILE_SIZE / 2;
    // Gölge
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(pxPlayer, pyPlayer + 18, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Vücut
    ctx.fillStyle = "#5a4838";
    ctx.fillRect(pxPlayer - 10, pyPlayer - 4, 20, 18);
    // Kafa
    ctx.fillStyle = "#e8b894";
    ctx.beginPath();
    ctx.arc(pxPlayer, pyPlayer - 12, 10, 0, Math.PI * 2);
    ctx.fill();
    // Saç
    ctx.fillStyle = "#3a1808";
    ctx.beginPath();
    ctx.arc(pxPlayer, pyPlayer - 16, 11, Math.PI, 0);
    ctx.fill();
    // Gözler
    ctx.fillStyle = "#1a1a2a";
    ctx.fillRect(pxPlayer - 4, pyPlayer - 13, 2, 2);
    ctx.fillRect(pxPlayer + 2, pyPlayer - 13, 2, 2);
    // Sword glint
    ctx.fillStyle = "#ccc";
    ctx.fillRect(pxPlayer + 10, pyPlayer - 10, 2, 16);

    // ===== HUD =====
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${c.charName}  lvl ${c.level}`, 10, CANVAS_H - 18);
    ctx.fillStyle = "#ff5555";
    ctx.fillText(`HP ${c.hp}/${c.maxHp}`, 180, CANVAS_H - 18);
    ctx.fillStyle = "#daa520";
    ctx.fillText(`💰 ${c.gold}`, 320, CANVAS_H - 18);
    ctx.fillStyle = "#aaa";
    ctx.fillText(`${def.name}`, 420, CANVAS_H - 18);
    ctx.textAlign = "right";
    ctx.fillStyle = "#888";
    ctx.fillText("oklar/wasd: hareket  ESC: çık", CANVAS_W - 10, CANVAS_H - 18);

    // Mesaj overlay
    if (messageRef.current && Date.now() < messageRef.current.until) {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(CANVAS_W / 2 - 220, 20, 440, 40);
      ctx.strokeStyle = "#daa520";
      ctx.strokeRect(CANVAS_W / 2 - 220, 20, 440, 40);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(messageRef.current.text, CANVAS_W / 2, 45);
    }
  }, []);

  // ========== DUNGEON ANIMATION LOOP ==========
  useEffect(() => {
    if (scene !== "dungeon") return;
    let raf = 0;
    const tick = () => {
      drawDungeon();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene, drawDungeon]);

  // ========== CANVAS CLICK (combat butonları) ==========
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (scene !== "combat") return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      // Action butonları kontrol et
      const btnW = 180;
      const btnH = 40;
      const totalW = 4 * btnW + 3 * 12;
      const startX = (CANVAS_W - totalW) / 2;
      const btnY = 490;
      if (y >= btnY && y <= btnY + btnH) {
        for (let i = 0; i < 4; i++) {
          const bx = startX + i * (btnW + 12);
          if (x >= bx && x <= bx + btnW) {
            if (i === 0) playerAttack();
            else if (i === 1) playerDefend();
            else if (i === 2) playerUsePotion();
            else if (i === 3) playerFlee();
            return;
          }
        }
      }
    },
    [scene, playerAttack, playerDefend, playerUsePotion, playerFlee]
  );

  // ========== TOUCH (mobil dungeon) ==========
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (scene !== "dungeon") return;
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 20 && absDy < 20) return;
      if (absDx > absDy) tryMove(dx > 0 ? 1 : -1, 0);
      else tryMove(0, dy > 0 ? 1 : -1);
      touchStartRef.current = null;
    },
    [scene, tryMove]
  );

  // ============================================================
  // RENDER
  // ============================================================
  const c = charRef.current;

  if (scene === "loading") {
    return <div className="text-center text-muted-foreground text-sm py-12">yükleniyor...</div>;
  }

  if (scene === "name-input") {
    return (
      <div className="border border-border rounded-lg p-8 bg-card max-w-md mx-auto">
        <h2 className="text-lg font-bold mb-4 text-center">spot macerası</h2>
        <p className="text-xs text-muted-foreground mb-4 text-center">
          5 dungeon. 5 boss. tek bir kahraman. ölürsen save'in kalır ama tekrar başlarsın.
        </p>
        <label className="text-xs text-muted-foreground block mb-2">karakter ismin</label>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startNewGame()}
          maxLength={20}
          placeholder="kahraman adı"
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary"
          autoFocus
        />
        <button
          onClick={startNewGame}
          className="w-full bg-primary text-primary-foreground rounded py-2 text-sm font-bold hover:opacity-90"
        >
          maceraya başla
        </button>
      </div>
    );
  }

  // ===== TOWN (HTML based, daha kullanışlı) =====
  if (scene === "town" && c) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card">
        {/* Karakter bilgileri */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-background rounded border border-border">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">isim</div>
            <div className="text-sm font-bold">{c.charName}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">level</div>
            <div className="text-sm font-bold text-primary">
              {c.level} <span className="text-[10px] text-muted-foreground">({c.xp}/{xpToNext(c.level)} xp)</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">HP / ATK / DEF</div>
            <div className="text-sm font-bold">
              <span className="text-red-400">{c.hp}/{c.maxHp}</span>{" "}
              <span className="text-orange-400">{totalAtk(c)}</span>{" "}
              <span className="text-blue-400">{totalDef(c)}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">altın / kill / boss</div>
            <div className="text-sm font-bold text-yellow-500">
              💰{c.gold} ⚔️{c.totalKills} 👑{c.defeatedBosses.length}/5
            </div>
          </div>
        </div>

        {/* Mesaj */}
        {messageRef.current && Date.now() < messageRef.current.until && (
          <div className="mb-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-500 text-center">
            {messageRef.current.text}
          </div>
        )}

        {/* Dungeon listesi */}
        <div className="text-xs font-bold text-muted-foreground mb-2 uppercase">dungeonlar</div>
        <div className="grid gap-2 mb-4">
          {DUNGEONS.map((d) => {
            const locked = c.level < d.minLevel;
            const beaten = c.defeatedBosses.includes(d.bossId);
            return (
              <button
                key={d.id}
                onClick={() => enterDungeon(d)}
                disabled={locked}
                className={`text-left p-3 border rounded transition-colors ${
                  locked
                    ? "border-border/50 opacity-50 cursor-not-allowed bg-background"
                    : beaten
                    ? "border-green-500/50 bg-green-500/5 hover:bg-green-500/10"
                    : "border-border bg-background hover:border-primary hover:bg-primary/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      {beaten && <span className="text-green-500 text-xs">✓</span>}
                      {d.name}
                      <span className="text-xs text-muted-foreground">(boss: {ENEMY_TEMPLATES[d.bossId].name})</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.description}</div>
                  </div>
                  <div className="text-xs">
                    {locked ? (
                      <span className="text-red-400">🔒 lvl {d.minLevel}</span>
                    ) : (
                      <span className="text-primary">→ gir</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Aksiyon butonları */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setScene("inventory")}
            className="flex-1 min-w-[120px] px-3 py-2 bg-background border border-border rounded text-xs font-bold hover:border-primary"
          >
            🎒 envanter ({c.inventory.length})
          </button>
          <button
            onClick={() => {
              if (c.gold >= 20 && c.hp < c.maxHp) {
                c.gold -= 20;
                c.hp = c.maxHp;
                showMessage("şifacı seni iyileştirdi");
                rerender();
                void saveProgress();
              } else if (c.hp >= c.maxHp) {
                showMessage("zaten tam canlısın");
              } else {
                showMessage("20 altın gerekli");
              }
            }}
            className="flex-1 min-w-[120px] px-3 py-2 bg-background border border-border rounded text-xs font-bold hover:border-green-500"
          >
            ⛑️ şifacı (20💰)
          </button>
          <button
            onClick={async () => {
              if (!confirm("karakterini silip yeniden başlamak istediğine emin misin?")) return;
              try {
                await fetch("/api/oyun/rpg", { method: "DELETE" });
              } catch {}
              charRef.current = null;
              setNameInput("");
              setScene("name-input");
            }}
            className="px-3 py-2 bg-background border border-border rounded text-xs font-bold hover:border-red-500 text-red-400"
          >
            🗑️ sıfırla
          </button>
        </div>
      </div>
    );
  }

  // ===== INVENTORY =====
  if (scene === "inventory" && c) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">envanter</h3>
          <button
            onClick={() => setScene("town")}
            className="text-xs px-3 py-1 border border-border rounded hover:border-primary"
          >
            ← geri
          </button>
        </div>

        {messageRef.current && Date.now() < messageRef.current.until && (
          <div className="mb-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-500 text-center">
            {messageRef.current.text}
          </div>
        )}

        <div className="mb-3 p-2 bg-background border border-border rounded text-xs">
          <span className="text-muted-foreground">kuşanılı: </span>
          <span className="text-orange-400">
            {c.equipped.weapon ? ITEMS[c.equipped.weapon].name : "—"}
          </span>
          {" / "}
          <span className="text-blue-400">
            {c.equipped.armor ? ITEMS[c.equipped.armor].name : "—"}
          </span>
        </div>

        {c.inventory.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-8">envanter boş</div>
        ) : (
          <div className="grid gap-1.5">
            {c.inventory.map((slot) => {
              const item = ITEMS[slot.id];
              if (!item) return null;
              const equipped = c.equipped.weapon === slot.id || c.equipped.armor === slot.id;
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-2 bg-background border border-border rounded"
                  style={{ borderLeftColor: RARITY_COLORS[item.rarity], borderLeftWidth: 3 }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold" style={{ color: RARITY_COLORS[item.rarity] }}>
                      {item.name} {slot.qty > 1 && `x${slot.qty}`}
                      {equipped && <span className="ml-2 text-[10px] text-green-500">[kuşanılı]</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {item.type === "weapon" && `silah · +${item.atk} atk`}
                      {item.type === "armor" && `zırh · +${item.def} def`}
                      {item.type === "potion" && `iksir · +${item.heal} hp`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {item.type !== "potion" ? (
                      <button
                        onClick={() => equipItem(slot.id)}
                        disabled={equipped}
                        className="text-[10px] px-2 py-1 bg-primary/20 border border-primary/50 rounded hover:bg-primary/30 disabled:opacity-30"
                      >
                        kuşan
                      </button>
                    ) : (
                      <button
                        onClick={() => usePotion(slot.id)}
                        className="text-[10px] px-2 py-1 bg-green-500/20 border border-green-500/50 rounded hover:bg-green-500/30"
                      >
                        kullan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===== DEATH =====
  if (scene === "death" && c) {
    return (
      <div className="border border-red-500/50 rounded-lg p-8 bg-card text-center">
        <div className="text-5xl mb-3">💀</div>
        <h2 className="text-lg font-bold mb-2 text-red-400">öldün</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {c.charName} dungeon'da hayatını kaybetti. ama level ve eşyaların duruyor.
        </p>
        <button
          onClick={() => {
            c.hp = c.maxHp;
            setScene("town");
            void saveProgress();
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
        >
          kasabaya dön
        </button>
      </div>
    );
  }

  // ===== VICTORY (normal) =====
  if (scene === "victory" && c) {
    return (
      <div className="border border-green-500/50 rounded-lg p-6 bg-card text-center">
        <div className="text-3xl mb-2">⚔️</div>
        <h2 className="text-sm font-bold mb-3 text-green-400">savaşı kazandın!</h2>
        <div className="text-xs text-muted-foreground mb-4">HP: {c.hp}/{c.maxHp}</div>
        <button
          onClick={() => setScene("dungeon")}
          className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
        >
          devam et (enter)
        </button>
      </div>
    );
  }

  // ===== BOSS VICTORY =====
  if (scene === "boss-victory" && c) {
    return (
      <div className="border border-yellow-500/50 rounded-lg p-8 bg-card text-center">
        <div className="text-5xl mb-3">👑</div>
        <h2 className="text-lg font-bold mb-2 text-yellow-500">BOSS YENİLDİ!</h2>
        <p className="text-xs text-muted-foreground mb-1">
          {c.defeatedBosses.length}/5 boss öldürüldü
        </p>
        <div className="text-xs text-primary mb-4">level {c.level}</div>
        <button
          onClick={() => {
            setScene("town");
            void saveProgress();
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
        >
          kasabaya dön
        </button>
      </div>
    );
  }

  // ===== WIN =====
  if (scene === "win" && c) {
    return (
      <div className="border border-yellow-500 rounded-lg p-8 bg-gradient-to-b from-yellow-500/20 to-card text-center">
        <div className="text-6xl mb-3">🏆</div>
        <h2 className="text-xl font-bold mb-2 text-yellow-500">SPOT MACERASI BİTTİ!</h2>
        <p className="text-sm mb-2">{c.charName} tüm bossları yendi</p>
        <p className="text-xs text-muted-foreground mb-4">
          level {c.level} · {c.totalKills} öldürme · 5/5 boss
        </p>
        <button
          onClick={() => setScene("town")}
          className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
        >
          kasabaya dön
        </button>
      </div>
    );
  }

  // ===== CANVAS SCENES (dungeon, combat) =====
  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="border border-border rounded max-w-full"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "none" }}
      />
      {scene === "dungeon" && (
        <div className="mt-2 text-[10px] text-muted-foreground text-center">
          oklar/wasd ile hareket · enemy ile çarpışınca savaş başlar · ESC kasaba
        </div>
      )}
      {scene === "combat" && (
        <div className="mt-2 text-[10px] text-muted-foreground text-center">
          1: saldır · 2: savun · 3: iksir · 4: kaç (boss'tan kaçılmaz)
        </div>
      )}
    </div>
  );
}
