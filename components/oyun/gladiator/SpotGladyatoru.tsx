"use client";

import { useEffect, useState, useCallback } from "react";
import GladiatorAvatar from "./GladiatorAvatar";
import { Swords, Shield, Sparkles, Coins, Heart, Zap, Trophy, Store, BookOpen, ArrowLeft, Plus, Users } from "lucide-react";
import type { SpotBattleResult, SpotTurnResult, SpotAction } from "@/lib/gladiator/engine";

// ------------ tipler ------------
type Esya = {
  id: string;
  slug: string;
  name: string;
  type: "WEAPON" | "ARMOR" | "HELMET" | "SHIELD" | "BOOTS" | "POTION_HP" | "POTION_MANA";
  price: number;
  levelReq: number;
  strReq: number;
  agiReq: number;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  manaBonus: number;
  critBonus: number;
  dodgeBonus: number;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  icon: string | null;
  description: string | null;
};
type Envanter = { id: string; itemId: string; count: number; item: Esya };
type Kusanmis = {
  id: string;
  weaponItemId: string | null;
  armorItemId: string | null;
  helmetItemId: string | null;
  shieldItemId: string | null;
  bootsItemId: string | null;
};
type Skill = {
  id: string;
  slug: string;
  name: string;
  branch: "GUC" | "CEVIKLIK" | "ZEKA" | "GENEL";
  levelReq: number;
  strReq: number;
  agiReq: number;
  intReq: number;
  manaCost: number;
  staminaCost: number;
  power: number;
  description: string;
  icon: string | null;
};
type Ogrenilen = { id: string; skillId: string; skill: Skill };
type Gladiator = {
  id: string;
  name: string;
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  armorTint: number;
  weaponTint: number;
  level: number;
  xp: number;
  gold: number;
  statPoints: number;
  skillPoints: number;
  strength: number;
  agility: number;
  vitality: number;
  intelligence: number;
  charisma: number;
  currentHp: number;
  currentMana: number;
  currentStamina: number;
  winCount: number;
  lossCount: number;
  bossKills: number;
  pvpWins: number;
  pvpLosses: number;
  equipped: Kusanmis | null;
  envanter: Envanter[];
  ogrenilen: Ogrenilen[];
};
type Dusman = {
  slug: string;
  name: string;
  tier: number;
  levelMin: number;
  levelMax: number;
  isBoss: boolean;
  strength: number;
  agility: number;
  vitality: number;
  intelligence: number;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  goldReward: number;
  xpReward: number;
  taunt: string | null;
};
type PvPRakip = {
  id: string;
  username: string;
  avatarUrl: string | null;
  name: string;
  level: number;
  winCount: number;
  lossCount: number;
  pvpWins: number;
};
type Liderlik = {
  byLevel: { name: string; username: string; level: number; winCount: number }[];
  byWins: { name: string; username: string; level: number; winCount: number }[];
  byPvp: { name: string; username: string; level: number; pvpWins: number }[];
};

type View = "hub" | "create" | "stats" | "inventory" | "shop" | "skills" | "arena" | "pvp" | "fight" | "leaderboard" | "matchHistory";

const RARITY_COLOR: Record<string, string> = {
  COMMON: "text-zinc-400",
  UNCOMMON: "text-green-500",
  RARE: "text-blue-500",
  EPIC: "text-purple-500",
  LEGENDARY: "text-amber-500",
};

const TYPE_LABEL: Record<string, string> = {
  WEAPON: "silah",
  ARMOR: "zırh",
  HELMET: "kask",
  SHIELD: "kalkan",
  BOOTS: "çizme",
  POTION_HP: "hp iksiri",
  POTION_MANA: "mana iksiri",
};

export default function SpotGladyatoru() {
  const [g, setG] = useState<Gladiator | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("hub");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gladiator/karakter", { cache: "no-store" });
      const json = await res.json();
      setG(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">yükleniyor...</div>;
  }

  if (!g && view !== "create") {
    return <WelcomeScreen onStart={() => setView("create")} />;
  }

  if (view === "create") {
    return (
      <CreateScreen
        onCreated={() => {
          refresh();
          setView("hub");
        }}
        onCancel={() => setView("hub")}
      />
    );
  }

  if (!g) return null;

  return (
    <div className="space-y-4">
      {msg && (
        <div className="bg-primary/10 border border-primary/30 text-primary text-sm rounded p-2 text-center">
          {msg}
        </div>
      )}

      <Header g={g} view={view} setView={setView} />

      {view === "hub" && <Hub g={g} setView={setView} />}
      {view === "stats" && <StatsScreen g={g} onRefresh={refresh} setMsg={setMsg} onBack={() => setView("hub")} />}
      {view === "inventory" && <InventoryScreen g={g} onRefresh={refresh} setMsg={setMsg} onBack={() => setView("hub")} />}
      {view === "shop" && <ShopScreen g={g} onRefresh={refresh} setMsg={setMsg} onBack={() => setView("hub")} />}
      {view === "skills" && <SkillsScreen g={g} onRefresh={refresh} setMsg={setMsg} onBack={() => setView("hub")} />}
      {view === "arena" && <ArenaScreen g={g} onFight={(enemy) => setView("fight") /* placeholder */} onRefresh={refresh} setMsg={setMsg} onBack={() => setView("hub")} />}
      {view === "pvp" && <PvPScreen g={g} onRefresh={refresh} setMsg={setMsg} onBack={() => setView("hub")} />}
      {view === "leaderboard" && <LeaderboardScreen onBack={() => setView("hub")} />}
      {view === "matchHistory" && <MatchHistory g={g} onBack={() => setView("hub")} />}
    </div>
  );
}

// ------------ Header ------------

function Header({ g, view, setView }: { g: Gladiator; view: View; setView: (v: View) => void }) {
  const xpNeeded = g.level <= 10 ? 50 + g.level * 50 : 550 + (g.level - 10) * 120;
  const xpPct = Math.min(100, Math.round((g.xp / xpNeeded) * 100));
  const hpPct = Math.round((g.currentHp / Math.max(1, 30 + g.vitality * 6 + (g.equipped ? 0 : 0) + g.level * 5)) * 100);

  return (
    <div className="border border-border rounded-lg bg-card p-3 flex items-center gap-3">
      <GladiatorAvatar
        skinTone={g.skinTone}
        hairStyle={g.hairStyle}
        hairColor={g.hairColor}
        armorTint={g.armorTint}
        weaponTint={g.weaponTint}
        size={60}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">{g.name}</h2>
          <span className="text-[10px] px-1.5 rounded bg-primary/10 text-primary">lv {g.level}</span>
          {g.statPoints > 0 && <span className="text-[10px] px-1.5 rounded bg-amber-500/20 text-amber-500 font-bold">+{g.statPoints} stat</span>}
          {g.skillPoints > 0 && <span className="text-[10px] px-1.5 rounded bg-blue-500/20 text-blue-500 font-bold">+{g.skillPoints} skill</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Coins className="h-3 w-3" />{g.gold}</span>
          <span className="flex items-center gap-0.5"><Trophy className="h-3 w-3" />{g.winCount}-{g.lossCount}</span>
          <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{g.pvpWins}-{g.pvpLosses}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[9px] text-muted-foreground w-6">xp</span>
          <div className="flex-1 h-1 bg-border/40 rounded overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{g.xp}/{xpNeeded}</span>
        </div>
      </div>
      {view !== "hub" && (
        <button
          onClick={() => setView("hub")}
          className="text-[11px] px-2 py-1 rounded border border-border hover:bg-accent"
        >
          <ArrowLeft className="h-3 w-3 inline" /> hub
        </button>
      )}
    </div>
  );
}

// ------------ Hub ------------

function Hub({ g, setView }: { g: Gladiator; setView: (v: View) => void }) {
  const cards: { view: View; label: string; desc: string; icon: React.ReactNode; highlight?: boolean }[] = [
    { view: "arena", label: "arena", desc: "AI rakiplerle dövüş, altın ve xp kazan", icon: <Swords className="h-5 w-5" /> },
    { view: "pvp", label: "pvp", desc: "diğer yazarların gladyatörleriyle", icon: <Users className="h-5 w-5" /> },
    { view: "stats", label: "statlar", desc: "puan dağıt, karakterini güçlendir", icon: <Sparkles className="h-5 w-5" />, highlight: g.statPoints > 0 },
    { view: "skills", label: "yetenekler", desc: "yeni yetenek öğren", icon: <BookOpen className="h-5 w-5" />, highlight: g.skillPoints > 0 },
    { view: "shop", label: "dükkan", desc: "silah, zırh, iksir", icon: <Store className="h-5 w-5" /> },
    { view: "inventory", label: "envanter", desc: "eşyalarını kuşan", icon: <Shield className="h-5 w-5" /> },
    { view: "leaderboard", label: "liderlik", desc: "en iyi gladyatörler", icon: <Trophy className="h-5 w-5" /> },
    { view: "matchHistory", label: "maç kayıtları", desc: "son dövüşlerin", icon: <BookOpen className="h-5 w-5" /> },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {cards.map((c) => (
        <button
          key={c.view}
          onClick={() => setView(c.view)}
          className={`border rounded-lg p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors ${
            c.highlight ? "border-amber-500/50 bg-amber-500/5" : "border-border"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary">{c.icon}</span>
            <span className="text-sm font-bold">{c.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">{c.desc}</p>
        </button>
      ))}
    </div>
  );
}

// ------------ Welcome & Create ------------

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="border border-border rounded-lg p-6 text-center space-y-3">
      <Swords className="h-10 w-10 mx-auto text-primary" />
      <h2 className="text-base font-bold">spot gladyatörü</h2>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        karakterini yarat, arenada dövüş, altın topla, dükkan&apos;dan eşya al, seviyen yükseldikçe yetenek öğren. diğer yazarlarla pvp yap, liderlik tablosuna çık.
      </p>
      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-bold"
      >
        <Plus className="h-4 w-4" /> gladyatör yarat
      </button>
    </div>
  );
}

function CreateScreen({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [skinTone, setSkinTone] = useState(1);
  const [hairStyle, setHairStyle] = useState(0);
  const [hairColor, setHairColor] = useState(0);
  const [armorTint, setArmorTint] = useState(0);
  const [weaponTint, setWeaponTint] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (name.trim().length < 2) {
      setErr("en az 2 karakter");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/gladiator/karakter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, skinTone, hairStyle, hairColor, armorTint, weaponTint }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated();
      } else {
        setErr(json.error?.message || "hata");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-bold">gladyatör yarat</h3>

      <div className="flex items-center justify-center py-2">
        <GladiatorAvatar
          skinTone={skinTone}
          hairStyle={hairStyle}
          hairColor={hairColor}
          armorTint={armorTint}
          weaponTint={weaponTint}
          size={140}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium">isim</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="gladyatörünün adı"
          className="w-full border rounded px-2 py-1.5 text-sm bg-background"
        />
      </div>

      <StyleRow label="ten" count={4} value={skinTone} onChange={setSkinTone} colors={["#f4c197", "#e0a36a", "#a76d3b", "#6e4223"]} />
      <StyleRow label="saç stili" count={5} value={hairStyle} onChange={setHairStyle} labels={["uzun", "kısa", "mohawk", "dağınık", "kel"]} />
      <StyleRow label="saç rengi" count={6} value={hairColor} onChange={setHairColor} colors={["#2a1a0f", "#5b3a1a", "#c79a3b", "#bf3b1c", "#d8d8d8", "#1f1f1f"]} />
      <StyleRow label="zırh rengi" count={6} value={armorTint} onChange={setArmorTint} colors={["#8b8680", "#d4a853", "#7a2e2e", "#2e5a7a", "#3a7a3e", "#5a2e7a"]} />
      <StyleRow label="silah rengi" count={6} value={weaponTint} onChange={setWeaponTint} colors={["#d8d8d8", "#b4b4b4", "#d4a853", "#7a2e2e", "#2e5a7a", "#3a7a3e"]} />

      {err && <p className="text-xs text-destructive">{err}</p>}

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2 text-sm border rounded hover:bg-accent">
          vazgeç
        </button>
        <button
          disabled={loading}
          onClick={submit}
          className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 font-bold"
        >
          {loading ? "yaratılıyor..." : "yarat"}
        </button>
      </div>
    </div>
  );
}

function StyleRow({
  label,
  count,
  value,
  onChange,
  colors,
  labels,
}: {
  label: string;
  count: number;
  value: number;
  onChange: (v: number) => void;
  colors?: string[];
  labels?: string[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`px-2 py-1 rounded text-[11px] border-2 ${
              value === i ? "border-primary" : "border-border"
            }`}
            style={colors ? { backgroundColor: colors[i] } : {}}
          >
            {labels ? labels[i] : i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------ Stats ------------

function StatsScreen({ g, onRefresh, setMsg, onBack }: {
  g: Gladiator;
  onRefresh: () => Promise<void>;
  setMsg: (m: string) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function addStat(stat: string) {
    if (g.statPoints < 1) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gladiator/karakter/stat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stat, amount: 1 }),
      });
      const json = await res.json();
      if (json.success) {
        await onRefresh();
      } else {
        setMsg(json.error?.message || "hata");
      }
    } finally {
      setLoading(false);
    }
  }

  const stats: { key: "strength" | "agility" | "vitality" | "intelligence" | "charisma"; label: string; desc: string; icon: string }[] = [
    { key: "strength", label: "güç", desc: "saldırı hasarı", icon: "💪" },
    { key: "agility", label: "çeviklik", desc: "kaçınma + kritik", icon: "🏃" },
    { key: "vitality", label: "dayanıklılık", desc: "max hp + stamina", icon: "❤️" },
    { key: "intelligence", label: "zeka", desc: "max mana + büyü gücü", icon: "🧠" },
    { key: "charisma", label: "karizma", desc: "dükkan indirimi + pvp xp", icon: "✨" },
  ];

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">statlar</h3>
        <span className="text-xs text-muted-foreground">kalan puan: <b className="text-primary">{g.statPoints}</b></span>
      </div>

      <div className="space-y-1.5">
        {stats.map((s) => (
          <div key={s.key} className="flex items-center justify-between py-2 px-2 border border-border/60 rounded">
            <div>
              <div className="text-sm font-medium">{s.icon} {s.label} <span className="text-primary font-bold">{g[s.key]}</span></div>
              <div className="text-[10px] text-muted-foreground">{s.desc}</div>
            </div>
            <button
              disabled={g.statPoints < 1 || loading}
              onClick={() => addStat(s.key)}
              className="w-8 h-8 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 font-bold"
            >
              +
            </button>
          </div>
        ))}
      </div>

      <button onClick={onBack} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}

// ------------ Inventory ------------

function InventoryScreen({ g, onRefresh, setMsg, onBack }: {
  g: Gladiator;
  onRefresh: () => Promise<void>;
  setMsg: (m: string) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function toggleEquip(slug: string, isEquipped: boolean) {
    setLoading(slug);
    try {
      const res = await fetch("/api/gladiator/envanter/kusan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: isEquipped ? "unequip" : "equip" }),
      });
      const json = await res.json();
      if (json.success) {
        await onRefresh();
      } else {
        setMsg(json.error?.message || "hata");
      }
    } finally {
      setLoading(null);
    }
  }

  const equipped = g.equipped;
  const equippedIds = equipped
    ? [equipped.weaponItemId, equipped.armorItemId, equipped.helmetItemId, equipped.shieldItemId, equipped.bootsItemId].filter(Boolean)
    : [];

  if (g.envanter.length === 0) {
    return (
      <div className="border border-border rounded-lg p-6 text-center">
        <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm">envanter boş. dükkandan alışveriş yap.</p>
        <button onClick={onBack} className="mt-3 py-1.5 px-3 text-xs border rounded hover:bg-accent">kapat</button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-bold">envanter</h3>
      <div className="space-y-1.5">
        {g.envanter.map((e) => {
          const isEquipped = equippedIds.includes(e.itemId);
          const isPotion = e.item.type === "POTION_HP" || e.item.type === "POTION_MANA";
          return (
            <div key={e.id} className={`flex items-center gap-2 p-2 border rounded ${isEquipped ? "border-primary bg-primary/5" : "border-border"}`}>
              <span className="text-lg">{e.item.icon || "📦"}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${RARITY_COLOR[e.item.rarity]}`}>
                  {e.item.name} {e.count > 1 && <span className="text-muted-foreground">x{e.count}</span>}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {TYPE_LABEL[e.item.type]}
                  {e.item.attackBonus > 0 && ` • +${e.item.attackBonus} sal`}
                  {e.item.defenseBonus > 0 && ` • +${e.item.defenseBonus} sav`}
                  {e.item.hpBonus > 0 && ` • +${e.item.hpBonus} hp`}
                  {e.item.manaBonus > 0 && ` • +${e.item.manaBonus} mana`}
                  {e.item.critBonus > 0 && ` • +${e.item.critBonus}% krit`}
                  {e.item.dodgeBonus !== 0 && ` • ${e.item.dodgeBonus > 0 ? "+" : ""}${e.item.dodgeBonus}% kac`}
                </div>
              </div>
              {!isPotion && (
                <button
                  disabled={loading === e.item.slug}
                  onClick={() => toggleEquip(e.item.slug, isEquipped)}
                  className={`text-[11px] px-2 py-1 rounded ${
                    isEquipped
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isEquipped ? "çıkar" : "kuşan"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onBack} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}

// ------------ Shop ------------

function ShopScreen({ g, onRefresh, setMsg, onBack }: {
  g: Gladiator;
  onRefresh: () => Promise<void>;
  setMsg: (m: string) => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<Esya[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/gladiator/dukkan").then((r) => r.json()).then((j) => {
      if (j.success) setItems(j.data);
    });
  }, []);

  async function buy(slug: string) {
    setLoading(slug);
    try {
      const res = await fetch("/api/gladiator/dukkan/al", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg(`${json.data.item.name} alındı (${json.data.paid} altın)`);
        await onRefresh();
      } else {
        setMsg(json.error?.message || "hata");
      }
    } finally {
      setLoading(null);
    }
  }

  const discountPct = Math.min(20, Math.floor(g.charisma * 0.4));

  const filtered = filter === "ALL" ? items : items.filter((i) => i.type === filter);
  const types = ["ALL", "WEAPON", "ARMOR", "HELMET", "SHIELD", "BOOTS", "POTION_HP", "POTION_MANA"];

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">dükkan</h3>
        <span className="text-xs text-muted-foreground">karizma indirimi: {discountPct}%</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-[11px] px-2 py-1 rounded whitespace-nowrap ${
              filter === t ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
            }`}
          >
            {t === "ALL" ? "hepsi" : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.map((e) => {
          const price = Math.round(e.price * (1 - discountPct / 100));
          const lvOk = g.level >= e.levelReq;
          const strOk = g.strength >= e.strReq;
          const agiOk = g.agility >= e.agiReq;
          const canBuy = lvOk && strOk && agiOk && g.gold >= price;
          return (
            <div key={e.id} className="flex items-center gap-2 p-2 border border-border/60 rounded">
              <span className="text-lg">{e.icon || "📦"}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${RARITY_COLOR[e.rarity]}`}>{e.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {TYPE_LABEL[e.type]}
                  {e.levelReq > 1 && <span className={lvOk ? "" : "text-destructive"}> • lv {e.levelReq}</span>}
                  {e.strReq > 0 && <span className={strOk ? "" : "text-destructive"}> • güç {e.strReq}</span>}
                  {e.agiReq > 0 && <span className={agiOk ? "" : "text-destructive"}> • çev {e.agiReq}</span>}
                </div>
                <div className="text-[10px] text-primary">
                  {e.attackBonus > 0 && `+${e.attackBonus} sal `}
                  {e.defenseBonus > 0 && `+${e.defenseBonus} sav `}
                  {e.hpBonus > 0 && `+${e.hpBonus} hp `}
                  {e.manaBonus > 0 && `+${e.manaBonus} mana `}
                  {e.critBonus > 0 && `+${e.critBonus}% krit `}
                  {e.dodgeBonus !== 0 && `${e.dodgeBonus > 0 ? "+" : ""}${e.dodgeBonus}% kac`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold flex items-center gap-0.5 justify-end">
                  <Coins className="h-3 w-3 text-amber-500" />
                  {price}
                </div>
                <button
                  disabled={!canBuy || loading === e.slug}
                  onClick={() => buy(e.slug)}
                  className="text-[11px] px-2 py-0.5 mt-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
                >
                  al
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onBack} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}

// ------------ Skills ------------

function SkillsScreen({ g, onRefresh, setMsg, onBack }: {
  g: Gladiator;
  onRefresh: () => Promise<void>;
  setMsg: (m: string) => void;
  onBack: () => void;
}) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gladiator/yetenek").then((r) => r.json()).then((j) => {
      if (j.success) setSkills(j.data);
    });
  }, []);

  async function learn(slug: string) {
    setLoading(slug);
    try {
      const res = await fetch("/api/gladiator/yetenek/ogren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg(`yetenek öğrenildi: ${json.data.skill.name}`);
        await onRefresh();
      } else {
        setMsg(json.error?.message || "hata");
      }
    } finally {
      setLoading(null);
    }
  }

  const knownSlugs = new Set(g.ogrenilen.map((o) => o.skill.slug));

  const byBranch: Record<string, Skill[]> = { GUC: [], CEVIKLIK: [], ZEKA: [], GENEL: [] };
  for (const s of skills) byBranch[s.branch]?.push(s);

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">yetenek ağacı</h3>
        <span className="text-xs text-muted-foreground">kalan: <b className="text-primary">{g.skillPoints}</b></span>
      </div>

      {(["GUC", "CEVIKLIK", "ZEKA"] as const).map((branch) => (
        <div key={branch} className="space-y-1">
          <h4 className="text-xs font-bold text-primary">
            {branch === "GUC" ? "güç dalı" : branch === "CEVIKLIK" ? "çeviklik dalı" : "zeka dalı"}
          </h4>
          {byBranch[branch].map((s) => {
            const known = knownSlugs.has(s.slug);
            const lvOk = g.level >= s.levelReq;
            const strOk = g.strength >= s.strReq;
            const agiOk = g.agility >= s.agiReq;
            const intOk = g.intelligence >= s.intReq;
            const canLearn = !known && lvOk && strOk && agiOk && intOk && g.skillPoints > 0;
            return (
              <div key={s.id} className={`p-2 border rounded ${known ? "border-green-500/40 bg-green-500/5" : "border-border/60"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {s.icon || "⭐"} {s.name}
                      {known && <span className="ml-2 text-[10px] text-green-500">öğrenildi</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{s.description}</div>
                    <div className="text-[10px] mt-0.5 text-muted-foreground">
                      <span className={lvOk ? "" : "text-destructive"}>lv {s.levelReq}</span>
                      {s.strReq > 0 && <span className={strOk ? "" : "text-destructive"}> • güç {s.strReq}</span>}
                      {s.agiReq > 0 && <span className={agiOk ? "" : "text-destructive"}> • çev {s.agiReq}</span>}
                      {s.intReq > 0 && <span className={intOk ? "" : "text-destructive"}> • zeka {s.intReq}</span>}
                      {s.staminaCost > 0 && <span> • {s.staminaCost} stamina</span>}
                      {s.manaCost > 0 && <span> • {s.manaCost} mana</span>}
                    </div>
                  </div>
                  {!known && (
                    <button
                      disabled={!canLearn || loading === s.slug}
                      onClick={() => learn(s.slug)}
                      className="text-[11px] px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
                    >
                      öğren
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <button onClick={onBack} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}

// ------------ Arena ------------

function ArenaScreen({ g, onRefresh, setMsg, onBack }: {
  g: Gladiator;
  onFight: (enemy: Dusman) => void;
  onRefresh: () => Promise<void>;
  setMsg: (m: string) => void;
  onBack: () => void;
}) {
  const [list, setList] = useState<Dusman[]>([]);
  const [battle, setBattle] = useState<SpotBattleResult | null>(null);
  const [reward, setReward] = useState<{ gold: number; xp: number; leveledUp: boolean; newLevel: number } | null>(null);
  const [fighting, setFighting] = useState<Dusman | null>(null);
  const [loadingFight, setLoadingFight] = useState(false);

  useEffect(() => {
    fetch("/api/gladiator/dusmanlar").then((r) => r.json()).then((j) => {
      if (j.success) setList(j.data);
    });
  }, []);

  async function fight(enemy: Dusman) {
    setLoadingFight(true);
    setFighting(enemy);
    setBattle(null);
    setReward(null);
    try {
      const res = await fetch("/api/gladiator/dovus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dusmanSlug: enemy.slug }),
      });
      const json = await res.json();
      if (json.success) {
        setBattle(json.data.battle);
        setReward(json.data.reward);
        await onRefresh();
      } else {
        setMsg(json.error?.message || "hata");
        setFighting(null);
      }
    } finally {
      setLoadingFight(false);
    }
  }

  if (fighting && battle) {
    return (
      <BattleReplay
        playerG={g}
        enemy={fighting}
        battle={battle}
        reward={reward}
        onClose={() => {
          setFighting(null);
          setBattle(null);
          onBack();
        }}
      />
    );
  }

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-bold">arena — rakip seç</h3>
      {loadingFight && <p className="text-xs text-muted-foreground">dövüşülüyor...</p>}
      <div className="space-y-1.5">
        {list.map((d) => (
          <div key={d.slug} className={`p-2 border rounded ${d.isBoss ? "border-amber-500/60 bg-amber-500/5" : "border-border/60"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {d.isBoss && "👑 "}{d.name}
                  <span className="text-[10px] ml-1 text-muted-foreground">lv {d.levelMin}-{d.levelMax}</span>
                </div>
                {d.taunt && <p className="text-[10px] italic text-muted-foreground">&ldquo;{d.taunt}&rdquo;</p>}
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  güç {d.strength} • çev {d.agility} • day {d.vitality}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-amber-500 flex items-center gap-0.5 justify-end">
                  <Coins className="h-2.5 w-2.5" />{d.goldReward}
                </div>
                <div className="text-[10px] text-muted-foreground">+{d.xpReward} xp</div>
                <button
                  disabled={loadingFight}
                  onClick={() => fight(d)}
                  className="text-[11px] mt-1 px-2 py-0.5 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-30"
                >
                  dövüş
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onBack} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}

// ------------ PvP ------------

function PvPScreen({ g, onRefresh, setMsg, onBack }: {
  g: Gladiator;
  onRefresh: () => Promise<void>;
  setMsg: (m: string) => void;
  onBack: () => void;
}) {
  const [list, setList] = useState<PvPRakip[]>([]);
  const [battle, setBattle] = useState<SpotBattleResult | null>(null);
  const [reward, setReward] = useState<{ gold: number; xp: number; leveledUp: boolean; newLevel: number } | null>(null);
  const [fighting, setFighting] = useState<PvPRakip | null>(null);
  const [loadingFight, setLoadingFight] = useState(false);

  useEffect(() => {
    fetch("/api/gladiator/pvp").then((r) => r.json()).then((j) => {
      if (j.success) setList(j.data);
    });
  }, []);

  async function fight(rakip: PvPRakip) {
    setLoadingFight(true);
    setFighting(rakip);
    setBattle(null);
    setReward(null);
    try {
      const res = await fetch("/api/gladiator/pvp/dovus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: rakip.id }),
      });
      const json = await res.json();
      if (json.success) {
        setBattle(json.data.battle);
        setReward(json.data.reward);
        await onRefresh();
      } else {
        setMsg(json.error?.message || "hata");
        setFighting(null);
      }
    } finally {
      setLoadingFight(false);
    }
  }

  if (fighting && battle) {
    const fakeDusman: Dusman = {
      slug: fighting.id,
      name: fighting.name,
      tier: Math.ceil(fighting.level / 5),
      levelMin: fighting.level,
      levelMax: fighting.level,
      isBoss: false,
      strength: 0, agility: 0, vitality: 0, intelligence: 0,
      attackBonus: 0, defenseBonus: 0, hpBonus: 0,
      goldReward: 0, xpReward: 0, taunt: `${fighting.username}'in gladyatörü`,
    };
    return (
      <BattleReplay
        playerG={g}
        enemy={fakeDusman}
        battle={battle}
        reward={reward}
        onClose={() => {
          setFighting(null);
          setBattle(null);
          onBack();
        }}
      />
    );
  }

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-bold">pvp — yazar rakipleri</h3>
      {list.length === 0 && !loadingFight && (
        <p className="text-xs text-muted-foreground py-4 text-center">seviyene uygun rakip yok.</p>
      )}
      {loadingFight && <p className="text-xs text-muted-foreground">dövüşülüyor...</p>}
      <div className="space-y-1.5">
        {list.map((r) => (
          <div key={r.id} className="p-2 border border-border/60 rounded flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{r.name} <span className="text-[10px] text-muted-foreground">lv {r.level}</span></div>
              <div className="text-[10px] text-muted-foreground">{r.username} • {r.winCount}-{r.lossCount} arena, {r.pvpWins} pvp</div>
            </div>
            <button
              disabled={loadingFight}
              onClick={() => fight(r)}
              className="text-[11px] px-2 py-0.5 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-30"
            >
              dövüş
            </button>
          </div>
        ))}
      </div>
      <button onClick={onBack} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}

// ------------ Battle Replay ------------

function BattleReplay({
  playerG,
  enemy,
  battle,
  reward,
  onClose,
}: {
  playerG: Gladiator;
  enemy: Dusman;
  battle: SpotBattleResult;
  reward: { gold: number; xp: number; leveledUp: boolean; newLevel: number } | null;
  onClose: () => void;
}) {
  const [turnIdx, setTurnIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [playerAttacking, setPlayerAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);

  // Compute max HP from first turn
  const maxPlayerHp = battle.rounds[0]?.playerHp || 100;
  const maxEnemyHp = battle.rounds[0]?.enemyHp || 100;

  useEffect(() => {
    if (!playing || turnIdx >= battle.rounds.length) {
      setPlaying(false);
      return;
    }
    const round = battle.rounds[turnIdx];
    // animation
    if (round.actor === "player") {
      setPlayerAttacking(true);
      setTimeout(() => setPlayerAttacking(false), 200);
      if (round.damage > 0) {
        setTimeout(() => {
          setEnemyHit(true);
          setTimeout(() => setEnemyHit(false), 200);
        }, 150);
      }
    } else {
      setEnemyAttacking(true);
      setTimeout(() => setEnemyAttacking(false), 200);
      if (round.damage > 0) {
        setTimeout(() => {
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 200);
        }, 150);
      }
    }
    setPlayerHp(round.playerHp);
    setEnemyHp(round.enemyHp);
    const timer = setTimeout(() => setTurnIdx((i) => i + 1), 700);
    return () => clearTimeout(timer);
  }, [turnIdx, playing, battle.rounds]);

  const ended = turnIdx >= battle.rounds.length;
  const playerPct = Math.max(0, Math.round((playerHp / maxPlayerHp) * 100));
  const enemyPct = Math.max(0, Math.round((enemyHp / maxEnemyHp) * 100));

  const currentRound = battle.rounds[Math.min(turnIdx, battle.rounds.length - 1)];

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">{enemy.name} vs {playerG.name}</h3>
        {ended && (
          <button onClick={() => { setTurnIdx(0); setPlaying(true); setPlayerHp(maxPlayerHp); setEnemyHp(maxEnemyHp); }}
            className="text-[11px] px-2 py-0.5 border rounded hover:bg-accent">
            tekrar oynat
          </button>
        )}
      </div>

      <div className="flex items-end justify-around py-4 bg-gradient-to-b from-zinc-900/10 to-zinc-900/30 rounded border border-border/50">
        <div className="flex flex-col items-center">
          <GladiatorAvatar
            skinTone={playerG.skinTone}
            hairStyle={playerG.hairStyle}
            hairColor={playerG.hairColor}
            armorTint={playerG.armorTint}
            weaponTint={playerG.weaponTint}
            facing="right"
            size={110}
            hpPct={playerHp / maxPlayerHp}
            attacking={playerAttacking}
            hit={playerHit}
          />
          <div className="text-xs font-bold">{playerG.name}</div>
          <div className="w-24 h-2 bg-border/40 rounded overflow-hidden mt-1">
            <div className="h-full bg-red-500" style={{ width: `${playerPct}%`, transition: "width 0.2s" }} />
          </div>
          <div className="text-[10px] text-muted-foreground">{playerHp}/{maxPlayerHp}</div>
        </div>

        <div className="text-2xl font-bold text-muted-foreground">×</div>

        <div className="flex flex-col items-center">
          <EnemyAvatar enemy={enemy} facing="left" attacking={enemyAttacking} hit={enemyHit} hpPct={enemyHp / maxEnemyHp} />
          <div className="text-xs font-bold">{enemy.name}</div>
          <div className="w-24 h-2 bg-border/40 rounded overflow-hidden mt-1">
            <div className="h-full bg-red-500" style={{ width: `${enemyPct}%`, transition: "width 0.2s" }} />
          </div>
          <div className="text-[10px] text-muted-foreground">{enemyHp}/{maxEnemyHp}</div>
        </div>
      </div>

      {currentRound && !ended && (
        <div className="text-xs text-center p-2 bg-accent/40 rounded">
          <span className="font-medium">{currentRound.actor === "player" ? playerG.name : enemy.name}</span>:{" "}
          {describeAction(currentRound)}
        </div>
      )}

      {ended && (
        <div className={`p-3 rounded text-center ${battle.outcome === "player_win" ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
          <div className="text-base font-bold">
            {battle.outcome === "player_win" ? "🏆 zafer!" : battle.outcome === "enemy_win" ? "💀 yenildin" : "kaçtın"}
          </div>
          {reward && (battle.outcome === "player_win" || battle.outcome === "enemy_win") && (
            <div className="text-xs text-muted-foreground mt-1">
              +{reward.gold} altın • +{reward.xp} xp
              {reward.leveledUp && <span className="text-amber-500 font-bold"> • level {reward.newLevel}!</span>}
            </div>
          )}
        </div>
      )}

      <button onClick={onClose} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}

function EnemyAvatar({ enemy, facing, attacking, hit, hpPct }: {
  enemy: Dusman;
  facing: "left" | "right";
  attacking: boolean;
  hit: boolean;
  hpPct: number;
}) {
  // Deterministik görünüm — slug hash'iyle renklendir
  let h = 0;
  for (let i = 0; i < enemy.slug.length; i++) h = (h * 31 + enemy.slug.charCodeAt(i)) | 0;
  const skinTone = Math.abs(h) % 4;
  const hairStyle = Math.abs(h >> 3) % 5;
  const hairColor = Math.abs(h >> 6) % 6;
  const armorTint = Math.abs(h >> 9) % 6;
  const weaponTint = Math.abs(h >> 12) % 6;

  return (
    <GladiatorAvatar
      skinTone={skinTone}
      hairStyle={hairStyle}
      hairColor={hairColor}
      armorTint={armorTint}
      weaponTint={weaponTint}
      facing={facing}
      size={enemy.isBoss ? 130 : 110}
      hpPct={hpPct}
      attacking={attacking}
      hit={hit}
    />
  );
}

function describeAction(r: SpotTurnResult): string {
  const a = r.action;
  if (a.kind === "attack") {
    const part = a.target === "head" ? "kafaya" : a.target === "torso" ? "gövdeye" : "bacağa";
    if (r.dodged) return `${part} saldırdı, savuşturuldu`;
    if (r.critical) return `${part} kritik vuruş! -${r.damage} hp`;
    return `${part} vurdu, -${r.damage} hp`;
  }
  if (a.kind === "guard") return `${a.target} bölgesini savundu`;
  if (a.kind === "rest") return `dinleniyor (+${r.staminaDelta} stamina)`;
  if (a.kind === "skill") return `${r.note || a.slug}${r.damage ? ` (-${r.damage} hp)` : ""}${r.healing ? ` (+${r.healing} hp)` : ""}`;
  if (a.kind === "flee") return "kaçtı";
  if (a.kind === "potion") return r.note || "iksir";
  return "—";
}

// ------------ Leaderboard ------------

function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<Liderlik | null>(null);
  const [tab, setTab] = useState<"level" | "wins" | "pvp">("level");

  useEffect(() => {
    fetch("/api/gladiator/liderlik").then((r) => r.json()).then((j) => {
      if (j.success) setData(j.data);
    });
  }, []);

  if (!data) return <div className="text-sm text-muted-foreground text-center py-4">yükleniyor...</div>;

  const list = tab === "level" ? data.byLevel : tab === "wins" ? data.byWins : data.byPvp;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-bold">liderlik tablosu</h3>
      <div className="flex gap-1">
        {(["level", "wins", "pvp"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[11px] flex-1 py-1 rounded ${
              tab === t ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
            }`}
          >
            {t === "level" ? "seviye" : t === "wins" ? "kazanç" : "pvp"}
          </button>
        ))}
      </div>
      <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
        {list.map((r, i) => (
          <div key={i} className="flex items-center gap-2 p-1.5 border border-border/30 rounded text-xs">
            <span className={`w-6 text-center font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </span>
            <span className="flex-1 font-medium">{r.name} <span className="text-muted-foreground">({r.username})</span></span>
            <span className="tabular-nums text-primary font-bold">
              {tab === "level" && `lv ${r.level}`}
              {tab === "wins" && (r as { winCount: number }).winCount}
              {tab === "pvp" && (r as { pvpWins: number }).pvpWins}
            </span>
          </div>
        ))}
      </div>
      <button onClick={onBack} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}

// ------------ Match history ------------

type Mac = {
  id: string;
  opponentName: string;
  opponentType: "ARENA" | "BOSS" | "PVP" | "TOURNAMENT";
  result: "WIN" | "LOSS" | "DRAW" | "FLED";
  roundsElapsed: number;
  goldEarned: number;
  xpEarned: number;
  createdAt: string;
};

function MatchHistory({ g, onBack }: { g: Gladiator; onBack: () => void }) {
  const [maclar, setMaclar] = useState<Mac[]>([]);

  useEffect(() => {
    fetch(`/api/gladiator/maclar?id=${g.id}`).then((r) => r.json()).then((j) => {
      if (j.success) setMaclar(j.data);
    });
  }, [g.id]);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-bold">maç kayıtları</h3>
      {maclar.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">henüz maç yok.</p>
      ) : (
        <div className="space-y-1">
          {maclar.map((m) => (
            <div key={m.id} className={`p-2 border rounded text-xs ${m.result === "WIN" ? "border-green-500/30" : "border-destructive/30"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{m.opponentName} <span className="text-[10px] text-muted-foreground">({m.opponentType.toLowerCase()})</span></span>
                <span className={m.result === "WIN" ? "text-green-500 font-bold" : "text-destructive font-bold"}>
                  {m.result === "WIN" ? "✓" : m.result === "LOSS" ? "✗" : "—"}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {m.roundsElapsed} tur • +{m.goldEarned}g • +{m.xpEarned}xp
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={onBack} className="w-full py-1.5 text-xs border rounded hover:bg-accent">kapat</button>
    </div>
  );
}
