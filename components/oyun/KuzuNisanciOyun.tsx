"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 700;
const CANVAS_H = 500;
const GAME_DURATION = 60; // saniye

type Target = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: "normal" | "gold" | "bomb";
  spawnTime: number;
  life: number; // kalan saniye
};

type Props = { onGameOver: (score: number) => void };

export default function KuzuNisanciOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => v + 1), []);

  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const timeLeftRef = useRef(GAME_DURATION);
  const livesRef = useRef(3);
  const targetsRef = useRef<Target[]>([]);
  const idCounterRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const lastTimeRef = useRef(0);
  const floatsRef = useRef<{ x: number; y: number; text: string; color: string; life: number }[]>([]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    hitsRef.current = 0;
    missesRef.current = 0;
    timeLeftRef.current = GAME_DURATION;
    livesRef.current = 3;
    targetsRef.current = [];
    floatsRef.current = [];
    spawnTimerRef.current = 0;
    setRunning(true);
  }, []);

  const endGame = useCallback(() => {
    const acc = hitsRef.current / Math.max(1, hitsRef.current + missesRef.current);
    const accBonus = Math.floor(acc * 500);
    const finalScore = scoreRef.current + accBonus;
    setRunning(false);
    onGameOver(finalScore);
  }, [onGameOver]);

  // Game loop
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Süre
      timeLeftRef.current -= dt;
      if (timeLeftRef.current <= 0 || livesRef.current <= 0) {
        endGame();
        return;
      }

      // Difficulty: zaman geçtikçe spawn hızı artar
      const elapsed = GAME_DURATION - timeLeftRef.current;
      const spawnInterval = Math.max(0.35, 1.0 - elapsed * 0.012);

      spawnTimerRef.current += dt;
      if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current = 0;
        // Hedef tipi ve boyut
        const r = Math.random();
        let type: Target["type"] = "normal";
        if (r < 0.08) type = "bomb";
        else if (r < 0.18) type = "gold";

        const radius = type === "gold" ? 18 : type === "bomb" ? 24 : 22 + Math.random() * 12;
        const minRadius = Math.max(14, 28 - elapsed * 0.18);
        const finalRadius = Math.max(minRadius, radius - elapsed * 0.15);

        // Hareket: ileri seviyede hareket eder
        const moves = elapsed > 15;
        const speed = moves ? 30 + Math.random() * 60 + elapsed * 1.2 : 0;
        const angle = Math.random() * Math.PI * 2;

        targetsRef.current.push({
          id: idCounterRef.current++,
          x: 60 + Math.random() * (CANVAS_W - 120),
          y: 60 + Math.random() * (CANVAS_H - 120),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: finalRadius,
          type,
          spawnTime: now,
          life: type === "bomb" ? 2.5 : Math.max(1.0, 2.5 - elapsed * 0.025),
        });
      }

      // Hedefleri güncelle
      for (const t of targetsRef.current) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        if (t.x < t.radius || t.x > CANVAS_W - t.radius) t.vx *= -1;
        if (t.y < t.radius || t.y > CANVAS_H - t.radius) t.vy *= -1;
        t.life -= dt;
      }

      // Süresi bitenler
      const expired = targetsRef.current.filter((t) => t.life <= 0);
      for (const t of expired) {
        if (t.type === "normal" || t.type === "gold") {
          missesRef.current++;
        }
      }
      targetsRef.current = targetsRef.current.filter((t) => t.life > 0);

      // Float text update
      for (const f of floatsRef.current) {
        f.y -= 60 * dt;
        f.life -= dt;
      }
      floatsRef.current = floatsRef.current.filter((f) => f.life > 0);

      // Çiz
      draw();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // BG
    ctx.fillStyle = "#0f1424";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Crosshair pattern arka plan
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }

    // Hedefler
    for (const t of targetsRef.current) {
      const lifePulse = (Math.sin(performance.now() / 100) + 1) / 2;
      let color = "#5dd95d";
      if (t.type === "gold") color = "#ffd700";
      if (t.type === "bomb") color = "#aa3333";

      // Halkalar (target görünümü)
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // İçerideki sembol
      if (t.type === "bomb") {
        ctx.fillStyle = "#000";
        ctx.font = `${t.radius}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💣", t.x, t.y);
      } else if (t.type === "gold") {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${t.radius * 0.6}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", t.x, t.y);
      } else {
        // kuzu
        ctx.font = `${t.radius}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🐑", t.x, t.y);
      }

      // Süresi azalan hedefler için outer ring
      if (t.life < 1.0) {
        ctx.strokeStyle = `rgba(255,255,255,${lifePulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius + 4, 0, Math.PI * 2 * t.life);
        ctx.stroke();
      }
    }

    // Float texts
    for (const f of floatsRef.current) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, CANVAS_W, 36);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SKOR ${scoreRef.current}`, 10, 22);
    ctx.fillStyle = "#daa520";
    ctx.fillText(`⏱ ${Math.ceil(timeLeftRef.current)}s`, 150, 22);
    ctx.fillStyle = "#5dd95d";
    ctx.fillText(`✓ ${hitsRef.current}`, 230, 22);
    ctx.fillStyle = "#ff5555";
    ctx.fillText(`✗ ${missesRef.current}`, 290, 22);
    ctx.textAlign = "right";
    for (let i = 0; i < 3; i++) {
      const cx = CANVAS_W - 60 + i * 20;
      ctx.fillStyle = i < livesRef.current ? "#ff3333" : "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.arc(cx, 18, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // En üstteki hedefi bul
    let hit: Target | null = null;
    for (let i = targetsRef.current.length - 1; i >= 0; i--) {
      const t = targetsRef.current[i];
      const dx = x - t.x;
      const dy = y - t.y;
      if (Math.sqrt(dx * dx + dy * dy) <= t.radius) {
        hit = t;
        break;
      }
    }

    if (hit) {
      targetsRef.current = targetsRef.current.filter((t) => t.id !== hit!.id);
      if (hit.type === "bomb") {
        livesRef.current--;
        floatsRef.current.push({ x: hit.x, y: hit.y, text: "-1 ❤", color: "#ff5555", life: 1 });
      } else if (hit.type === "gold") {
        const pts = 50;
        scoreRef.current += pts;
        hitsRef.current++;
        floatsRef.current.push({ x: hit.x, y: hit.y, text: `+${pts}`, color: "#ffd700", life: 1 });
      } else {
        const pts = Math.round(30 - hit.radius); // küçük hedef daha çok puan
        scoreRef.current += Math.max(5, pts) + 10;
        hitsRef.current++;
        floatsRef.current.push({ x: hit.x, y: hit.y, text: `+${Math.max(5, pts) + 10}`, color: "#5dd95d", life: 1 });
      }
    } else {
      // Boş tıklama
      missesRef.current++;
    }
  }, []);

  if (!running) {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">🎯</div>
          <h2 className="text-lg font-bold mb-2">kuzu nişancı</h2>
          <p className="text-xs text-muted-foreground mb-4">
            60 saniye. kuzulara tıkla, bombalardan kaç. ★ altın hedef daha çok puan.
            zamanla küçülür ve hareket eder. accuracy bonusu var.
          </p>
          <button
            onClick={() => {
              startGame();
              rerender();
            }}
            className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
          >
            başla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleClick}
        className="border border-border rounded max-w-full cursor-crosshair"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "manipulation" }}
      />
    </div>
  );
}
