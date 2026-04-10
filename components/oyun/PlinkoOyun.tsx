"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 480;
const CANVAS_H = 640;
const ROWS = 11;
const PEG_RADIUS = 4;
const BALL_RADIUS = 7;
const GRAVITY = 700;

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
};

type Slot = {
  x: number;
  width: number;
  multiplier: number;
  color: string;
};

type Props = { onGameOver: (score: number) => void };

const BALLS_PER_GAME = 10;

export default function PlinkoOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => v + 1), []);

  const pegsRef = useRef<{ x: number; y: number }[]>([]);
  const slotsRef = useRef<Slot[]>([]);
  const ballsRef = useRef<Ball[]>([]);
  const scoreRef = useRef(0);
  const ballsLeftRef = useRef(BALLS_PER_GAME);
  const lastScoreRef = useRef<{ value: number; time: number } | null>(null);
  const lastTimeRef = useRef(0);
  const aimXRef = useRef(CANVAS_W / 2);

  // Setup pegs ve slots
  function setupBoard() {
    const pegs: { x: number; y: number }[] = [];
    const startY = 80;
    const spacing = 36;
    for (let row = 0; row < ROWS; row++) {
      const count = row + 3;
      const totalW = (count - 1) * spacing;
      const startX = (CANVAS_W - totalW) / 2;
      const y = startY + row * spacing;
      for (let i = 0; i < count; i++) {
        pegs.push({ x: startX + i * spacing, y });
      }
    }
    pegsRef.current = pegs;

    // Slots: en alttaki sıraya göre
    const lastRowCount = ROWS + 2;
    const slotWidth = CANVAS_W / lastRowCount;
    // Multiplier sıralaması: kenar yüksek, orta düşük
    const mults = [50, 10, 5, 2, 1, 0, 1, 2, 5, 10, 50, 100];
    // 12 slot için merkezde 0, sonra simetrik
    const slotMults: number[] = [];
    for (let i = 0; i < lastRowCount; i++) {
      const dist = Math.abs(i - (lastRowCount - 1) / 2);
      const idx = Math.min(Math.floor(dist), mults.length - 1);
      slotMults.push(mults[idx] || 0);
    }
    const slots: Slot[] = [];
    for (let i = 0; i < lastRowCount; i++) {
      const m = slotMults[i];
      let color = "#3a3a4a";
      if (m >= 50) color = "#ff3333";
      else if (m >= 10) color = "#ff8800";
      else if (m >= 5) color = "#ffaa00";
      else if (m >= 2) color = "#5dd95d";
      else if (m >= 1) color = "#3a8a3a";
      slots.push({ x: i * slotWidth, width: slotWidth, multiplier: m, color });
    }
    slotsRef.current = slots;
  }

  const startGame = useCallback(() => {
    setupBoard();
    scoreRef.current = 0;
    ballsLeftRef.current = BALLS_PER_GAME;
    ballsRef.current = [];
    setRunning(true);
  }, []);

  const dropBall = useCallback(() => {
    if (ballsLeftRef.current <= 0) return;
    if (ballsRef.current.filter((b) => b.alive).length >= 3) return; // max 3 top aynı anda
    ballsLeftRef.current--;
    ballsRef.current.push({
      x: aimXRef.current + (Math.random() - 0.5) * 6,
      y: 30,
      vx: (Math.random() - 0.5) * 30,
      vy: 50,
      alive: true,
    });
  }, []);

  // Loop
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.025, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Top fiziği
      for (const b of ballsRef.current) {
        if (!b.alive) continue;
        b.vy += GRAVITY * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Peg çarpışmaları
        for (const p of pegsRef.current) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = BALL_RADIUS + PEG_RADIUS;
          if (dist < minDist && dist > 0) {
            // Itme + yansıma
            const nx = dx / dist;
            const ny = dy / dist;
            b.x = p.x + nx * minDist;
            b.y = p.y + ny * minDist;
            const dot = b.vx * nx + b.vy * ny;
            b.vx -= 2 * dot * nx * 0.65;
            b.vy -= 2 * dot * ny * 0.65;
            b.vx += (Math.random() - 0.5) * 30; // randomness
          }
        }

        // Yan duvarlar
        if (b.x < BALL_RADIUS) {
          b.x = BALL_RADIUS;
          b.vx = Math.abs(b.vx) * 0.6;
        }
        if (b.x > CANVAS_W - BALL_RADIUS) {
          b.x = CANVAS_W - BALL_RADIUS;
          b.vx = -Math.abs(b.vx) * 0.6;
        }

        // Alt slot kontrolü
        if (b.y > CANVAS_H - 60) {
          const slot = slotsRef.current.find((s) => b.x >= s.x && b.x < s.x + s.width);
          if (slot) {
            const points = slot.multiplier * 100;
            scoreRef.current += points;
            lastScoreRef.current = { value: points, time: performance.now() };
          }
          b.alive = false;
        }
      }

      // Yarış sonu
      if (ballsLeftRef.current === 0 && ballsRef.current.every((b) => !b.alive)) {
        setRunning(false);
        onGameOver(scoreRef.current);
        return;
      }

      ballsRef.current = ballsRef.current.filter((b) => b.alive || performance.now() - 0 > 0);

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
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#1a0a2a");
    grad.addColorStop(1, "#0a0816");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Üst alan: nişan göstergesi
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(aimXRef.current, 0);
    ctx.lineTo(aimXRef.current, 70);
    ctx.stroke();
    ctx.setLineDash([]);
    // Nişan ok
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.moveTo(aimXRef.current, 25);
    ctx.lineTo(aimXRef.current - 8, 10);
    ctx.lineTo(aimXRef.current + 8, 10);
    ctx.fill();

    // Pegs
    for (const p of pegsRef.current) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, PEG_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slots
    for (const s of slotsRef.current) {
      const y = CANVAS_H - 50;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x + 1, y, s.width - 2, 50);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`x${s.multiplier}`, s.x + s.width / 2, y + 30);
    }

    // Ballar
    for (const b of ballsRef.current) {
      if (!b.alive) continue;
      ctx.fillStyle = "#daa520";
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Son skor float
    if (lastScoreRef.current) {
      const age = (performance.now() - lastScoreRef.current.time) / 1000;
      if (age < 1.5) {
        ctx.globalAlpha = Math.max(0, 1 - age / 1.5);
        ctx.fillStyle = "#ffd700";
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 3;
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.strokeText(`+${lastScoreRef.current.value}`, CANVAS_W / 2, 350);
        ctx.fillText(`+${lastScoreRef.current.value}`, CANVAS_W / 2, 350);
        ctx.globalAlpha = 1;
      }
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CANVAS_W, 28);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SKOR ${scoreRef.current}`, 10, 19);
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "right";
    ctx.fillText(`top: ${ballsLeftRef.current}`, CANVAS_W - 10, 19);
  }

  // Mouse track for aim
  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    aimXRef.current = Math.max(40, Math.min(CANVAS_W - 40, x));
  }, []);

  const handleClick = useCallback(() => {
    dropBall();
  }, [dropBall]);

  if (!running) {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">⚪</div>
          <h2 className="text-lg font-bold mb-2">plinko</h2>
          <p className="text-xs text-muted-foreground mb-4">
            10 top hakkın var. üstten top bırak, çivilerden zıplasın. en uçtaki slotlar
            ×100 çarpan, ortadakiler az. fareyi sürükle, tıklayınca top düşer.
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
        onMouseMove={handleMove}
        onClick={handleClick}
        onTouchStart={(e) => {
          const t = e.touches[0];
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = CANVAS_W / rect.width;
            aimXRef.current = Math.max(40, Math.min(CANVAS_W - 40, (t.clientX - rect.left) * scaleX));
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          dropBall();
        }}
        className="border border-border rounded max-w-full cursor-pointer"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "manipulation" }}
      />
      <div className="mt-2 text-[10px] text-muted-foreground">fareyi hareket ettir, tıkla</div>
    </div>
  );
}
