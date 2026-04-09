"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const CANVAS_W = 700;
const CANVAS_H = 450;
const GRAVITY = 400;
const FRUIT_R = 28;
const MAX_MISS = 3;

type FruitType = "elma" | "portakal" | "karpuz" | "muz" | "cilek" | "bomba";

const FRUIT_COLORS: Record<FruitType, { fill: string; inner: string; emoji: string }> = {
  elma:    { fill: "#e63946", inner: "#f4a261", emoji: "🍎" },
  portakal:{ fill: "#f4a261", inner: "#e9c46a", emoji: "🍊" },
  karpuz:  { fill: "#2d6a4f", inner: "#e63946", emoji: "🍉" },
  muz:     { fill: "#f4d35e", inner: "#fff3b0", emoji: "🍌" },
  cilek:   { fill: "#e63946", inner: "#ffb4a2", emoji: "🍓" },
  bomba:   { fill: "#222", inner: "#555", emoji: "💣" },
};

type Fruit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: FruitType;
  r: number;
  rotation: number;
  rotSpeed: number;
  sliced: boolean;
  missed: boolean;
  // Sliced halves
  half1?: { x: number; y: number; vx: number; vy: number; rot: number };
  half2?: { x: number; y: number; vx: number; vy: number; rot: number };
  sliceTime: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

type SlashPoint = {
  x: number;
  y: number;
  time: number;
};

type GameState = "idle" | "playing" | "gameover";

type Props = {
  onGameOver: (score: number) => void;
};

export default function FruitNinjaOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    gameState: GameState;
    score: number;
    combo: number;
    comboTimer: number;
    comboText: string;
    missed: number;
    fruits: Fruit[];
    particles: Particle[];
    slash: SlashPoint[];
    isSlashing: boolean;
    spawnTimer: number;
    spawnInterval: number;
    spawnBatch: number;
    elapsed: number;
    bestCombo: number;
  }>({
    gameState: "idle",
    score: 0,
    combo: 0,
    comboTimer: 0,
    comboText: "",
    missed: 0,
    fruits: [],
    particles: [],
    slash: [],
    isSlashing: false,
    spawnTimer: 0,
    spawnInterval: 1.8,
    spawnBatch: 2,
    elapsed: 0,
    bestCombo: 0,
  });

  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const animRef = useRef<number>(0);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.gameState = "playing";
    s.score = 0;
    s.combo = 0;
    s.comboTimer = 0;
    s.comboText = "";
    s.missed = 0;
    s.fruits = [];
    s.particles = [];
    s.slash = [];
    s.isSlashing = false;
    s.spawnTimer = 0;
    s.spawnInterval = 1.8;
    s.spawnBatch = 2;
    s.elapsed = 0;
    s.bestCombo = 0;
    setDisplayScore(null);
  }, []);

  const spawnFruit = useCallback(() => {
    const s = stateRef.current;
    const count = s.spawnBatch + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const x = 80 + Math.random() * (CANVAS_W - 160);
      const isBomba = Math.random() < 0.12;
      const type: FruitType = isBomba
        ? "bomba"
        : (["elma", "portakal", "karpuz", "muz", "cilek"] as FruitType[])[
            Math.floor(Math.random() * 5)
          ];
      const vy = -(350 + Math.random() * 200);
      const vx = (Math.random() - 0.5) * 200;
      s.fruits.push({
        x,
        y: CANVAS_H + 40,
        vx,
        vy,
        type,
        r: type === "karpuz" ? 35 : FRUIT_R,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 6,
        sliced: false,
        missed: false,
        sliceTime: 0,
      });
    }
  }, []);

  const sliceFruit = useCallback((fruit: Fruit) => {
    const s = stateRef.current;
    const info = FRUIT_COLORS[fruit.type];

    if (fruit.type === "bomba") {
      // Game over on bomb
      s.gameState = "gameover";
      // Explosion particles
      for (let i = 0; i < 20; i++) {
        s.particles.push({
          x: fruit.x,
          y: fruit.y,
          vx: (Math.random() - 0.5) * 500,
          vy: (Math.random() - 0.5) * 500,
          life: 1,
          color: ["#ff0", "#f80", "#f00", "#fff"][Math.floor(Math.random() * 4)],
          size: 4 + Math.random() * 6,
        });
      }
      const finalScore = s.score;
      setDisplayScore(finalScore);
      onGameOver(finalScore);
      return;
    }

    fruit.sliced = true;
    fruit.sliceTime = 0;
    fruit.half1 = {
      x: fruit.x - 10,
      y: fruit.y,
      vx: fruit.vx - 80,
      vy: fruit.vy - 50,
      rot: fruit.rotation,
    };
    fruit.half2 = {
      x: fruit.x + 10,
      y: fruit.y,
      vx: fruit.vx + 80,
      vy: fruit.vy - 50,
      rot: fruit.rotation,
    };

    // Score
    s.combo++;
    s.comboTimer = 0.8;
    let points = 10;
    if (s.combo >= 5) {
      points = 50;
      s.comboText = `x${s.combo} KOMBO! +50`;
    } else if (s.combo >= 3) {
      points = 30;
      s.comboText = `x${s.combo} kombo! +30`;
    } else {
      s.comboText = `+${points}`;
    }
    s.score += points;
    if (s.combo > s.bestCombo) s.bestCombo = s.combo;

    // Juice particles
    for (let i = 0; i < 8; i++) {
      s.particles.push({
        x: fruit.x,
        y: fruit.y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        life: 1,
        color: info.inner,
        size: 3 + Math.random() * 4,
      });
    }
  }, [onGameOver]);

  const drawFruit = useCallback(
    (ctx: CanvasRenderingContext2D, fruit: Fruit) => {
      const info = FRUIT_COLORS[fruit.type];

      if (fruit.sliced && fruit.half1 && fruit.half2) {
        // Draw two halves
        for (const half of [fruit.half1, fruit.half2]) {
          ctx.save();
          ctx.translate(half.x, half.y);
          ctx.rotate(half.rot);
          // Outer
          ctx.fillStyle = info.fill;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.r * 0.8, 0, Math.PI * 2);
          ctx.fill();
          // Inner (cut face)
          ctx.fillStyle = info.inner;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.r * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        return;
      }

      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);

      if (fruit.type === "bomba") {
        // Bomb body
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(0, 0, fruit.r, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(-6, -8, fruit.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Fuse
        ctx.strokeStyle = "#a55";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -fruit.r);
        ctx.quadraticCurveTo(10, -fruit.r - 15, 5, -fruit.r - 20);
        ctx.stroke();
        // Spark
        ctx.fillStyle = "#ff0";
        ctx.beginPath();
        ctx.arc(5, -fruit.r - 20, 4, 0, Math.PI * 2);
        ctx.fill();
        // X mark
        ctx.strokeStyle = "#c00";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, 8);
        ctx.moveTo(8, -8);
        ctx.lineTo(-8, 8);
        ctx.stroke();
      } else {
        // Fruit body
        ctx.fillStyle = info.fill;
        ctx.beginPath();
        ctx.arc(0, 0, fruit.r, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(-fruit.r * 0.25, -fruit.r * 0.3, fruit.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Leaf for some fruits
        if (fruit.type !== "muz") {
          ctx.fillStyle = "#2d6a4f";
          ctx.beginPath();
          ctx.ellipse(0, -fruit.r + 2, 5, 8, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Inner color hint
        ctx.fillStyle = info.inner;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(4, 4, fruit.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    },
    []
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const s = stateRef.current;
      const w = CANVAS_W;
      const h = CANVAS_H;

      // Background - wooden board
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#1a1a2e");
      grad.addColorStop(1, "#16213e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle pattern
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }

      // Draw particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw fruits
      for (const fruit of s.fruits) {
        drawFruit(ctx, fruit);
      }

      // Draw slash trail
      if (s.slash.length > 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(s.slash[0].x, s.slash[0].y);
        for (let i = 1; i < s.slash.length; i++) {
          ctx.lineTo(s.slash[i].x, s.slash[i].y);
        }
        ctx.stroke();

        // Glow
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(s.slash[0].x, s.slash[0].y);
        for (let i = 1; i < s.slash.length; i++) {
          ctx.lineTo(s.slash[i].x, s.slash[i].y);
        }
        ctx.stroke();
      }

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`skor: ${s.score}`, 15, 30);

      // Missed (X marks)
      ctx.textAlign = "right";
      for (let i = 0; i < MAX_MISS; i++) {
        ctx.font = "18px sans-serif";
        ctx.fillStyle = i < s.missed ? "#e63946" : "rgba(255,255,255,0.2)";
        ctx.fillText("✕", w - 15 - i * 25, 28);
      }

      // Combo text
      if (s.comboTimer > 0) {
        ctx.textAlign = "center";
        ctx.font = "bold 24px sans-serif";
        ctx.globalAlpha = Math.min(s.comboTimer * 2, 1);
        ctx.fillStyle = s.combo >= 5 ? "#ff0" : s.combo >= 3 ? "#f80" : "#fff";
        ctx.fillText(s.comboText, w / 2, 80);
        ctx.globalAlpha = 1;
      }

      if (s.gameState === "idle") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("baslamak icin tikla!", w / 2, h / 2 - 10);
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText("meyveleri kes, bombalardan kac!", w / 2, h / 2 + 15);
      }

      if (s.gameState === "gameover") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = "center";
        ctx.fillStyle = "#e63946";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText("OYUN BITTI!", w / 2, h / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(`skor: ${s.score}`, w / 2, h / 2);

        if (s.bestCombo >= 3) {
          ctx.font = "16px sans-serif";
          ctx.fillStyle = "#f4a261";
          ctx.fillText(`en iyi kombo: x${s.bestCombo}`, w / 2, h / 2 + 28);
        }

        ctx.font = "14px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText("tekrar oynamak icin tikla", w / 2, h / 2 + 60);
      }

      ctx.textAlign = "start";
    },
    [drawFruit]
  );

  const update = useCallback(
    (dt: number) => {
      const s = stateRef.current;

      if (s.gameState !== "playing") return;

      s.elapsed += dt;

      // Difficulty ramp
      if (s.elapsed > 60) {
        s.spawnInterval = 0.8;
        s.spawnBatch = 4;
      } else if (s.elapsed > 40) {
        s.spawnInterval = 1.0;
        s.spawnBatch = 4;
      } else if (s.elapsed > 25) {
        s.spawnInterval = 1.2;
        s.spawnBatch = 3;
      } else if (s.elapsed > 12) {
        s.spawnInterval = 1.4;
        s.spawnBatch = 3;
      }

      // Spawn fruits
      s.spawnTimer += dt;
      if (s.spawnTimer >= s.spawnInterval) {
        s.spawnTimer = 0;
        spawnFruit();
      }

      // Combo timeout
      if (s.comboTimer > 0) {
        s.comboTimer -= dt;
        if (s.comboTimer <= 0) {
          s.combo = 0;
        }
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt;
        p.life -= dt * 2;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // Update slash trail (remove old points)
      const now = performance.now();
      while (s.slash.length > 0 && now - s.slash[0].time > 100) {
        s.slash.shift();
      }

      // Update fruits
      for (let i = s.fruits.length - 1; i >= 0; i--) {
        const f = s.fruits[i];

        if (f.sliced) {
          f.sliceTime += dt;
          if (f.half1 && f.half2) {
            f.half1.x += f.half1.vx * dt;
            f.half1.y += f.half1.vy * dt;
            f.half1.vy += GRAVITY * dt;
            f.half1.rot += 3 * dt;
            f.half2.x += f.half2.vx * dt;
            f.half2.y += f.half2.vy * dt;
            f.half2.vy += GRAVITY * dt;
            f.half2.rot -= 3 * dt;
          }
          if (f.sliceTime > 2) {
            s.fruits.splice(i, 1);
          }
          continue;
        }

        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += GRAVITY * dt;
        f.rotation += f.rotSpeed * dt;

        // Check if fruit fell below screen without being sliced
        if (f.y > CANVAS_H + 60 && !f.sliced && !f.missed) {
          if (f.type !== "bomba") {
            f.missed = true;
            s.missed++;
            if (s.missed >= MAX_MISS) {
              s.gameState = "gameover";
              const finalScore = s.score;
              setDisplayScore(finalScore);
              onGameOver(finalScore);
            }
          }
          s.fruits.splice(i, 1);
        }
      }
    },
    [spawnFruit, onGameOver]
  );

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();
    let running = true;

    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      update(dt);
      draw(ctx);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [update, draw]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }, []);

  const checkSlice = useCallback(
    (x: number, y: number) => {
      const s = stateRef.current;
      if (s.gameState !== "playing") return;

      for (const fruit of s.fruits) {
        if (fruit.sliced) continue;
        const dx = x - fruit.x;
        const dy = y - fruit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < fruit.r + 10) {
          sliceFruit(fruit);
        }
      }
    },
    [sliceFruit]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      const pos = getCanvasPos(e.clientX, e.clientY);

      if (s.gameState === "idle" || s.gameState === "gameover") {
        resetGame();
        return;
      }

      s.isSlashing = true;
      s.slash = [{ x: pos.x, y: pos.y, time: performance.now() }];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      checkSlice(pos.x, pos.y);
    },
    [getCanvasPos, resetGame, checkSlice]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      if (!s.isSlashing || s.gameState !== "playing") return;

      const pos = getCanvasPos(e.clientX, e.clientY);
      s.slash.push({ x: pos.x, y: pos.y, time: performance.now() });
      // Keep trail short
      if (s.slash.length > 20) s.slash.shift();
      checkSlice(pos.x, pos.y);
    },
    [getCanvasPos, checkSlice]
  );

  const handlePointerUp = useCallback(() => {
    const s = stateRef.current;
    s.isSlashing = false;
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-border rounded-lg w-full max-w-[700px] cursor-crosshair touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {displayScore !== null && (
        <div className="text-center text-sm text-muted-foreground">
          skor: <span className="font-bold text-primary">{displayScore}</span>
        </div>
      )}
    </div>
  );
}
