"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import GladiatorAvatar from "./GladiatorAvatar";
import {
  makeCombatant,
  applyAction,
  aiChoose,
  makeRng,
  SKILLS,
  type SpotAction,
  type SpotCombatant,
  type SpotBodyPart,
  type SpotTurnResult,
} from "@/lib/gladiator/engine";
import { Sword, Shield, Moon, Sparkles, LogOut, Heart, Droplet, Zap } from "lucide-react";

type Gladiator = {
  id: string;
  name: string;
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  armorTint: number;
  weaponTint: number;
  level: number;
  strength: number;
  agility: number;
  vitality: number;
  intelligence: number;
  charisma: number;
  ogrenilen: { skill: { slug: string; name: string; icon: string | null; manaCost: number; staminaCost: number } }[];
  envanter: { item: { slug: string; type: string; name: string; icon: string | null; hpBonus: number; manaBonus: number }; count: number }[];
  equipped: {
    weaponItemId: string | null;
    armorItemId: string | null;
    helmetItemId: string | null;
    shieldItemId: string | null;
    bootsItemId: string | null;
  } | null;
};

type Dusman = {
  slug: string;
  name: string;
  isBoss: boolean;
  strength: number;
  agility: number;
  vitality: number;
  intelligence: number;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  levelMin: number;
  levelMax: number;
  taunt: string | null;
};

type FloatingNumber = { id: number; side: "player" | "enemy"; value: number; type: "damage" | "crit" | "heal" | "miss" };

export default function InteractiveBattle({
  player,
  playerEquipBonuses,
  enemy,
  onFinish,
}: {
  player: Gladiator;
  playerEquipBonuses: { attackBonus: number; defenseBonus: number; hpBonus: number; manaBonus: number; critBonus: number; dodgeBonus: number };
  enemy: Dusman;
  onFinish: (outcome: "player_win" | "enemy_win" | "flee", roundsElapsed: number, reward?: { gold: number; xp: number; statPointsGained?: number; skillPointsGained?: number; fightsRemaining?: number }) => void;
}) {
  // Combatant state in refs so engine can mutate them
  const playerRef = useRef<SpotCombatant>(
    makeCombatant({
      id: player.id,
      name: player.name,
      level: player.level,
      stats: {
        strength: player.strength,
        agility: player.agility,
        vitality: player.vitality,
        intelligence: player.intelligence,
        charisma: player.charisma,
      },
      equip: playerEquipBonuses,
      skills: player.ogrenilen.map((o) => o.skill.slug),
      refresh: true,
    })
  );

  const enemyRef = useRef<SpotCombatant>(
    makeCombatant({
      id: enemy.slug,
      name: enemy.name,
      level: Math.round((enemy.levelMin + enemy.levelMax) / 2),
      stats: { strength: enemy.strength, agility: enemy.agility, vitality: enemy.vitality, intelligence: enemy.intelligence },
      equip: {
        attackBonus: enemy.attackBonus,
        defenseBonus: enemy.defenseBonus,
        hpBonus: enemy.hpBonus,
        manaBonus: 0,
        critBonus: 0,
        dodgeBonus: 0,
      },
      skills: [],
      refresh: true,
    })
  );

  const rngRef = useRef(makeRng(Math.floor(Math.random() * 2 ** 31)));
  const [round, setRound] = useState(1);
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  const [log, setLog] = useState<SpotTurnResult[]>([]);
  const [floating, setFloating] = useState<FloatingNumber[]>([]);
  const floatingIdRef = useRef(0);
  const [playerAttacking, setPlayerAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [ended, setEnded] = useState<"player_win" | "enemy_win" | "flee" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reward, setReward] = useState<{ gold: number; xp: number; statPointsGained?: number; skillPointsGained?: number; fightsRemaining?: number } | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(true);
  const [showSubMenu, setShowSubMenu] = useState<"attack" | "guard" | "skill" | "potion" | null>(null);
  const [flashColor, setFlashColor] = useState<"red" | "gold" | "green" | null>(null);

  const p = playerRef.current;
  const e = enemyRef.current;

  const submitResult = useCallback(async (outcome: "player_win" | "enemy_win" | "flee", rounds: number) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/gladiator/dovus/tamamla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dusmanSlug: enemy.slug,
          result: outcome,
          roundsElapsed: rounds,
          playerHpLeft: playerRef.current.hp,
          playerManaLeft: playerRef.current.mana,
          playerStaminaLeft: playerRef.current.stamina,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReward(json.data.reward);
      } else if (json.error?.code === "DAILY_LIMIT") {
        setReward({ gold: 0, xp: 0 });
      }
    } finally {
      setSubmitting(false);
    }
  }, [enemy.slug]);

  const pushFloat = useCallback((side: "player" | "enemy", value: number, type: FloatingNumber["type"]) => {
    const id = ++floatingIdRef.current;
    setFloating((f) => [...f, { id, side, value, type }]);
    setTimeout(() => setFloating((f) => f.filter((x) => x.id !== id)), 1000);
  }, []);

  const pulseFlash = useCallback((color: "red" | "gold" | "green") => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 180);
  }, []);

  const executeRound = useCallback(async (playerAction: SpotAction) => {
    if (ended) return;
    setShowActionMenu(false);
    setShowSubMenu(null);

    const enemyAction = aiChoose(e, p, rngRef.current);

    // initiative
    const playerFirst = p.stats.agility + rngRef.current() * 2 >= e.stats.agility + rngRef.current() * 2;

    const actA = playerFirst ? playerAction : enemyAction;
    const actB = playerFirst ? enemyAction : playerAction;
    const combA = playerFirst ? p : e;
    const combB = playerFirst ? e : p;
    const opp_A = playerFirst ? e : p;
    const opp_B = playerFirst ? p : e;
    const sideA: "player" | "enemy" = playerFirst ? "player" : "enemy";
    const sideB: "player" | "enemy" = playerFirst ? "enemy" : "player";

    const runActor = (actor: SpotCombatant, opp: SpotCombatant, act: SpotAction, oppReact: SpotAction, side: "player" | "enemy") => {
      const r = applyAction(round, actor, opp, act, oppReact, rngRef.current, side);
      setLog((l) => [...l.slice(-8), r]);

      if (side === "player") {
        if (act.kind === "attack" || (act.kind === "skill" && r.damage > 0)) {
          setPlayerAttacking(true);
          setTimeout(() => setPlayerAttacking(false), 280);
        }
      } else {
        if (act.kind === "attack" || (act.kind === "skill" && r.damage > 0)) {
          setEnemyAttacking(true);
          setTimeout(() => setEnemyAttacking(false), 280);
        }
      }

      // damage / heal side
      if (r.damage > 0) {
        const target: "player" | "enemy" = side === "player" ? "enemy" : "player";
        setTimeout(() => {
          if (target === "player") {
            setPlayerHit(true);
            setTimeout(() => setPlayerHit(false), 220);
            pulseFlash("red");
          } else {
            setEnemyHit(true);
            setTimeout(() => setEnemyHit(false), 220);
            pulseFlash("red");
          }
          pushFloat(target, r.damage, r.critical ? "crit" : "damage");
        }, 180);
      } else if (r.dodged) {
        const target: "player" | "enemy" = side === "player" ? "enemy" : "player";
        pushFloat(target, 0, "miss");
      }
      if (r.healing > 0) {
        pushFloat(side, r.healing, "heal");
        pulseFlash("green");
      }
      rerender();
    };

    runActor(combA, opp_A, actA, actB, sideA);
    await new Promise((res) => setTimeout(res, 500));

    if (combB.hp <= 0 || combA.hp <= 0) {
      // finish
      const outcome: "player_win" | "enemy_win" = playerRef.current.hp > 0 ? "player_win" : "enemy_win";
      setEnded(outcome);
      submitResult(outcome, round);
      return;
    }

    runActor(combB, opp_B, actB, actA, sideB);
    await new Promise((res) => setTimeout(res, 450));

    if (playerRef.current.hp <= 0 || enemyRef.current.hp <= 0) {
      const outcome: "player_win" | "enemy_win" = playerRef.current.hp > 0 ? "player_win" : "enemy_win";
      setEnded(outcome);
      submitResult(outcome, round);
      return;
    }

    setRound((r) => r + 1);
    setShowActionMenu(true);
  }, [e, p, round, ended, pushFloat, pulseFlash, submitResult, rerender]);

  const pickAttack = useCallback((target: SpotBodyPart) => executeRound({ kind: "attack", target }), [executeRound]);
  const pickGuard = useCallback((target: SpotBodyPart) => executeRound({ kind: "guard", target }), [executeRound]);
  const pickRest = useCallback(() => executeRound({ kind: "rest" }), [executeRound]);
  const pickSkill = useCallback((slug: string) => executeRound({ kind: "skill", slug }), [executeRound]);
  const pickPotion = useCallback((kind: "hp" | "mana") => executeRound({ kind: "potion", kind2: kind }), [executeRound]);

  const pickFlee = useCallback(async () => {
    setEnded("flee");
    await submitResult("flee", round);
  }, [submitResult, round]);

  // Potion envanter sayıları
  const hpPotions = player.envanter.filter((inv) => inv.item.type === "POTION_HP");
  const manaPotions = player.envanter.filter((inv) => inv.item.type === "POTION_MANA");

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Arena backdrop */}
      <div
        className={`relative overflow-hidden transition-colors duration-150 ${
          flashColor === "red" ? "bg-red-500/20" : flashColor === "gold" ? "bg-amber-400/25" : flashColor === "green" ? "bg-green-500/20" : ""
        }`}
        style={{
          background: flashColor ? undefined : `linear-gradient(180deg, #2a1f14 0%, #3d2a18 45%, #8a6b3d 70%, #d4a858 100%)`,
        }}
      >
        {/* kolon ve torç dekoru */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 bottom-0 left-0 w-10 bg-gradient-to-r from-stone-900/70 to-transparent" />
          <div className="absolute top-0 bottom-0 right-0 w-10 bg-gradient-to-l from-stone-900/70 to-transparent" />
          <div className="absolute top-3 left-6 w-2 h-8 bg-orange-500/60 rounded-full blur-sm" />
          <div className="absolute top-3 right-6 w-2 h-8 bg-orange-500/60 rounded-full blur-sm" />
          <div className="absolute top-5 left-5 text-2xl animate-pulse">🔥</div>
          <div className="absolute top-5 right-5 text-2xl animate-pulse">🔥</div>
          {/* seyirci */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-stone-900/80 flex items-center justify-center gap-1 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="text-[8px] opacity-70">👤</div>
            ))}
          </div>
        </div>

        {/* Combatants */}
        <div className="relative flex items-end justify-around py-6 pt-10 min-h-[260px]">
          {/* Player */}
          <div className="flex flex-col items-center relative">
            <div className="relative">
              {floating
                .filter((f) => f.side === "player")
                .map((f) => (
                  <FloatingText key={f.id} type={f.type} value={f.value} />
                ))}
              <GladiatorAvatar
                skinTone={player.skinTone}
                hairStyle={player.hairStyle}
                hairColor={player.hairColor}
                armorTint={player.armorTint}
                weaponTint={player.weaponTint}
                facing="right"
                size={130}
                hpPct={p.hp / p.maxHp}
                attacking={playerAttacking}
                hit={playerHit}
              />
            </div>
            <div className="text-xs font-bold text-white drop-shadow">{player.name}</div>
            <VitalBars c={p} />
          </div>

          {/* VS */}
          <div className="text-4xl font-black text-white drop-shadow-lg self-center animate-pulse">⚔</div>

          {/* Enemy */}
          <div className="flex flex-col items-center relative">
            <div className="relative">
              {floating
                .filter((f) => f.side === "enemy")
                .map((f) => (
                  <FloatingText key={f.id} type={f.type} value={f.value} />
                ))}
              <EnemyVisual enemy={enemy} attacking={enemyAttacking} hit={enemyHit} hpPct={e.hp / e.maxHp} />
            </div>
            <div className={`text-xs font-bold drop-shadow ${enemy.isBoss ? "text-amber-300" : "text-white"}`}>
              {enemy.isBoss && "👑 "}{enemy.name}
            </div>
            <VitalBars c={e} mini />
          </div>
        </div>

        {/* tur sayacı */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[11px] text-white/90 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
          tur {round}
        </div>
      </div>

      {/* Log */}
      <div className="px-3 py-2 border-b border-border bg-card max-h-24 overflow-y-auto text-[11px] space-y-0.5">
        {log.slice(-5).map((r, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className={r.actor === "player" ? "text-primary font-bold" : "text-destructive font-bold"}>
              {r.actor === "player" ? player.name : enemy.name}:
            </span>
            <span className={r.critical ? "text-amber-500" : ""}>{describeAction(r)}</span>
          </div>
        ))}
        {log.length === 0 && (
          <div className="text-muted-foreground italic">aksiyon seç — dövüş başlasın</div>
        )}
      </div>

      {/* Aksiyon menüsü */}
      {ended ? (
        <EndScreen
          outcome={ended}
          reward={reward}
          submitting={submitting}
          onClose={() => onFinish(ended!, round, reward ?? undefined)}
        />
      ) : !showActionMenu ? (
        <div className="p-4 text-center text-xs text-muted-foreground">tur işleniyor...</div>
      ) : (
        <div className="p-2 space-y-2">
          {showSubMenu === null && (
            <div className="grid grid-cols-5 gap-1.5">
              <ActionBtn icon={<Sword className="h-4 w-4" />} label="saldır" onClick={() => setShowSubMenu("attack")} disabled={p.stamina < 4} />
              <ActionBtn icon={<Shield className="h-4 w-4" />} label="savun" onClick={() => setShowSubMenu("guard")} />
              <ActionBtn icon={<Sparkles className="h-4 w-4" />} label="yetenek" onClick={() => setShowSubMenu("skill")} disabled={player.ogrenilen.length === 0} />
              <ActionBtn icon={<Droplet className="h-4 w-4" />} label="iksir" onClick={() => setShowSubMenu("potion")} disabled={hpPotions.length === 0 && manaPotions.length === 0} />
              <ActionBtn icon={<Moon className="h-4 w-4" />} label="dinlen" onClick={pickRest} />
            </div>
          )}

          {showSubMenu === "attack" && (
            <TargetRow
              label="saldırı hedefi"
              onBack={() => setShowSubMenu(null)}
              options={[
                { key: "head", label: "kafa (1.4x)", sub: "krit şansı yüksek" },
                { key: "torso", label: "gövde", sub: "standart" },
                { key: "leg", label: "bacak (0.85x)", sub: "isabet kolay" },
              ]}
              onPick={(k) => pickAttack(k as SpotBodyPart)}
            />
          )}

          {showSubMenu === "guard" && (
            <TargetRow
              label="savunma bölgesi"
              onBack={() => setShowSubMenu(null)}
              options={[
                { key: "head", label: "kafa", sub: "rakip kafaya vurursa 1.8x def" },
                { key: "torso", label: "gövde", sub: "rakip gövdeye vurursa 1.8x def" },
                { key: "leg", label: "bacak", sub: "rakip bacağa vurursa 1.8x def" },
              ]}
              onPick={(k) => pickGuard(k as SpotBodyPart)}
            />
          )}

          {showSubMenu === "skill" && (
            <div>
              <MenuHeader label="yetenek" onBack={() => setShowSubMenu(null)} />
              <div className="grid grid-cols-2 gap-1.5">
                {player.ogrenilen.map((o) => {
                  const s = o.skill;
                  const canUse = s.staminaCost <= p.stamina && s.manaCost <= p.mana;
                  return (
                    <button
                      key={s.slug}
                      disabled={!canUse}
                      onClick={() => pickSkill(s.slug)}
                      className={`p-2 border rounded text-left text-[11px] ${canUse ? "hover:border-primary" : "opacity-40"}`}
                    >
                      <div className="font-bold">{s.icon || "⭐"} {s.name}</div>
                      <div className="text-muted-foreground mt-0.5">
                        {s.staminaCost > 0 && <span>{s.staminaCost} sta </span>}
                        {s.manaCost > 0 && <span>{s.manaCost} mana </span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showSubMenu === "potion" && (
            <div>
              <MenuHeader label="iksir" onBack={() => setShowSubMenu(null)} />
              <div className="grid grid-cols-2 gap-1.5">
                {hpPotions.map((pp) => (
                  <button
                    key={pp.item.slug}
                    disabled={pp.count < 1}
                    onClick={() => pickPotion("hp")}
                    className="p-2 border rounded text-left text-[11px] hover:border-primary disabled:opacity-40"
                  >
                    <div className="font-bold">🧪 {pp.item.name}</div>
                    <div className="text-muted-foreground">+35 hp • x{pp.count}</div>
                  </button>
                ))}
                {manaPotions.map((pp) => (
                  <button
                    key={pp.item.slug}
                    disabled={pp.count < 1}
                    onClick={() => pickPotion("mana")}
                    className="p-2 border rounded text-left text-[11px] hover:border-primary disabled:opacity-40"
                  >
                    <div className="font-bold">🔮 {pp.item.name}</div>
                    <div className="text-muted-foreground">+25 mana • x{pp.count}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={pickFlee}
            className="w-full py-1 text-[11px] text-muted-foreground hover:text-destructive border-t border-border mt-2 pt-2"
          >
            <LogOut className="h-3 w-3 inline" /> kaç (ödül yok)
          </button>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 p-2 border rounded hover:border-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function TargetRow({
  label,
  options,
  onPick,
  onBack,
}: {
  label: string;
  options: { key: string; label: string; sub: string }[];
  onPick: (key: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <MenuHeader label={label} onBack={onBack} />
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onPick(o.key)}
            className="p-2 border rounded text-[11px] hover:border-primary"
          >
            <div className="font-bold">{o.label}</div>
            <div className="text-muted-foreground">{o.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MenuHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <button onClick={onBack} className="text-[11px] text-muted-foreground hover:text-foreground">← geri</button>
    </div>
  );
}

function VitalBars({ c, mini }: { c: SpotCombatant; mini?: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 mt-1 ${mini ? "w-24" : "w-28"}`}>
      <Bar value={c.hp} max={c.maxHp} color="bg-red-500" label="hp" showValue />
      {!mini && (
        <>
          <Bar value={c.mana} max={c.maxMana} color="bg-blue-500" label="mana" showValue={false} />
          <Bar value={c.stamina} max={c.maxStamina} color="bg-amber-400" label="sta" showValue={false} />
        </>
      )}
    </div>
  );
}

function Bar({ value, max, color, label, showValue }: { value: number; max: number; color: string; label: string; showValue: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] text-white/80 w-6 drop-shadow">{label}</span>
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden border border-black/30">
        <div className={`h-full ${color} transition-all duration-200`} style={{ width: `${pct}%` }} />
      </div>
      {showValue && <span className="text-[8px] text-white/90 tabular-nums w-10 text-right drop-shadow">{value}/{max}</span>}
    </div>
  );
}

function FloatingText({ type, value }: { type: "damage" | "crit" | "heal" | "miss"; value: number }) {
  let className = "absolute left-1/2 -translate-x-1/2 top-1/4 text-xl font-black drop-shadow-lg pointer-events-none";
  let text = "";
  if (type === "damage") {
    className += " text-red-500";
    text = `-${value}`;
  } else if (type === "crit") {
    className += " text-amber-400 text-2xl";
    text = `KRİT! -${value}`;
  } else if (type === "heal") {
    className += " text-green-400";
    text = `+${value}`;
  } else {
    className += " text-white/80";
    text = "savuştu";
  }
  return (
    <span
      className={className}
      style={{
        animation: "floatUp 1s ease-out forwards",
      }}
    >
      {text}
      <style jsx>{`
        @keyframes floatUp {
          0% { transform: translate(-50%, 0) scale(0.8); opacity: 0; }
          20% { transform: translate(-50%, -8px) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -60px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </span>
  );
}

function EnemyVisual({
  enemy,
  attacking,
  hit,
  hpPct,
}: {
  enemy: Dusman;
  attacking: boolean;
  hit: boolean;
  hpPct: number;
}) {
  let h = 0;
  for (let i = 0; i < enemy.slug.length; i++) h = (h * 31 + enemy.slug.charCodeAt(i)) | 0;
  return (
    <GladiatorAvatar
      skinTone={Math.abs(h) % 4}
      hairStyle={Math.abs(h >> 3) % 5}
      hairColor={Math.abs(h >> 6) % 6}
      armorTint={Math.abs(h >> 9) % 6}
      weaponTint={Math.abs(h >> 12) % 6}
      facing="left"
      size={enemy.isBoss ? 150 : 120}
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
    if (r.dodged) return `${part} saldırdı → savuştu`;
    if (r.critical) return `${part} KRİTİK ${r.damage}!`;
    return `${part} ${r.damage} hasar`;
  }
  if (a.kind === "guard") return `${a.target} savunuyor (+${r.staminaDelta} sta)`;
  if (a.kind === "rest") return `dinlendi (+${r.staminaDelta} sta, +${r.manaDelta} mana)`;
  if (a.kind === "skill") return `${r.note || a.slug}${r.damage ? ` → ${r.damage}` : ""}${r.healing ? ` +${r.healing}` : ""}`;
  if (a.kind === "flee") return "kaçtı";
  if (a.kind === "potion") return r.note || "iksir";
  return "—";
}

function EndScreen({
  outcome,
  reward,
  submitting,
  onClose,
}: {
  outcome: "player_win" | "enemy_win" | "flee";
  reward: { gold: number; xp: number; statPointsGained?: number; skillPointsGained?: number; fightsRemaining?: number } | null;
  submitting: boolean;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center space-y-3">
      <div
        className={`text-2xl font-black ${
          outcome === "player_win" ? "text-amber-500" : outcome === "enemy_win" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {outcome === "player_win" ? "🏆 ZAFER!" : outcome === "enemy_win" ? "💀 YENİLDİN" : "KAÇTIN"}
      </div>
      {submitting && <p className="text-xs text-muted-foreground">sonuç kaydediliyor...</p>}
      {reward && (outcome === "player_win" || outcome === "enemy_win") && (
        <div className="text-sm space-y-1">
          <div>
            <span className="text-amber-500 font-bold">+{reward.gold}</span> altın •{" "}
            <span className="text-blue-400 font-bold">+{reward.xp}</span> şan
          </div>
          {(reward.statPointsGained ?? 0) > 0 && (
            <div className="text-lg font-bold text-amber-400 animate-pulse">
              ✨ +{reward.statPointsGained} STAT PUANI!
            </div>
          )}
          {(reward.skillPointsGained ?? 0) > 0 && (
            <div className="text-sm font-bold text-blue-400">+{reward.skillPointsGained} yetenek puanı</div>
          )}
          {typeof reward.fightsRemaining === "number" && (
            <div className="text-[11px] text-muted-foreground">
              {reward.fightsRemaining === 0 ? "bu rakip için bugünün limiti doldu" : `bu rakiple ${reward.fightsRemaining} dövüş hakkın kaldı`}
            </div>
          )}
        </div>
      )}
      <button
        onClick={onClose}
        disabled={submitting}
        className="px-4 py-2 bg-primary text-primary-foreground rounded font-bold hover:bg-primary/90 disabled:opacity-50"
      >
        kapat
      </button>
    </div>
  );
}
