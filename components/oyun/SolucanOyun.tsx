"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const CANVAS_W = 600;
const CANVAS_H = 600;
const GRID = 20;
const COLS = CANVAS_W / GRID;
const ROWS = CANVAS_H / GRID;
const TICK_BASE = 120; // ms per tick at level 1

type Dir = "up" | "down" | "left" | "right";
type Pos = { x: number; y: number };

const REACTIONS = [
  "Ahh!", "Ohh!", "Durma!", "Devam et!", "Yala!", "Hmmm...",
  "Daha!", "Oooof!", "Tam orası!", "Yavaş!", "Hızlan!",
  "Mmm!", "Evet!", "Hayır orası değil!", "Gel!", "Kaçma!",
  "Dokunma!", "Dokun!", "Orada dur!", "Çıldırıyorum!",
  "Böyle!", "Sus ve ye!", "Aferin!", "Harika!", "Yuh!",
];

const FOOD_EMOJIS = ["🍎", "🍕", "🌶️", "🍩", "🍑", "🍆", "🌭", "🍌", "🧁", "🍒"];

type FloatingText = {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
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

type GameState = "idle" | "playing" | "gameover";

type Props = {
  onGameOver: (score: number) => void;
};

export default function SolucanOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    gameState: GameState;
    snake: Pos[];
    dir: Dir;
    nextDir: Dir;
    food: Pos;
    foodEmoji: string;
    score: number;
    tickTimer: number;
    tickSpeed: number;
    level: number;
    linesEaten: number;
    floats: FloatingText[];
    particles: Particle[];
    eyeAngle: number;
    tongueOut: number;
    mouthOpen: number;
    screenShake: number;
    bgHue: number;
    trail: { x: number; y: number; alpha: number }[];
  }>({
    gameState: "idle",
    snake: [],
    dir: "right",
    nextDir: "right",
    food: { x: 10, y: 10 },
    foodEmoji: "🍎",
    score: 0,
    tickTimer: 0,
    tickSpeed: TICK_BASE,
    level: 1,
    linesEaten: 0,
    floats: [],
    particles: [],
    eyeAngle: 0,
    tongueOut: 0,
    mouthOpen: 0,
    screenShake: 0,
    bgHue: 140,
    trail: [],
  });

  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const animRef = useRef<number>(0);

  const placeFood = useCallback(() => {
    const s = stateRef.current;
    let pos: Pos;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (s.snake.some((p) => p.x === pos.x && p.y === pos.y));
    s.food = pos;
    s.foodEmoji = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.gameState = "playing";
    s.snake = [
      { x: 7, y: Math.floor(ROWS / 2) },
      { x: 6, y: Math.floor(ROWS / 2) },
      { x: 5, y: Math.floor(ROWS / 2) },
    ];
    s.dir = "right";
    s.nextDir = "right";
    s.score = 0;
    s.tickTimer = 0;
    s.tickSpeed = TICK_BASE;
    s.level = 1;
    s.linesEaten = 0;
    s.floats = [];
    s.particles = [];
    s.trail = [];
    s.screenShake = 0;
    s.tongueOut = 0;
    s.mouthOpen = 0;
    s.bgHue = 140;
    placeFood();
    setDisplayScore(null);
  }, [placeFood]);

  const addReaction = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    const text = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6bdb", "#ff8c42", "#a855f7"];
    s.floats.push({
      text,
      x: x * GRID + GRID / 2 + (Math.random() - 0.5) * 40,
      y: y * GRID,
      life: 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 16 + Math.random() * 12,
      vx: (Math.random() - 0.5) * 60,
      vy: -60 - Math.random() * 40,
    });
  }, []);

  const addEatParticles = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#ff6bdb", "#4d96ff"];
    for (let i = 0; i < 12; i++) {
      s.particles.push({
        x: x * GRID + GRID / 2,
        y: y * GRID + GRID / 2,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
      });
    }
  }, []);

  const drawWorm = useCallback((ctx: CanvasRenderingContext2D, snake: Pos[], dir: Dir, eyeAngle: number, tongueOut: number, mouthOpen: number) => {
    if (snake.length === 0) return;

    // Body segments with gradient
    for (let i = snake.length - 1; i >= 1; i--) {
      const seg = snake[i];
      const t = i / snake.length;
      const cx = seg.x * GRID + GRID / 2;
      const cy = seg.y * GRID + GRID / 2;
      const r = GRID / 2 - 1;

      // Body color: gradient from tail to head
      const hue = 100 + t * 40;
      const lightness = 40 + (1 - t) * 15;
      ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Segment ring pattern
      ctx.strokeStyle = `hsl(${hue}, 60%, ${lightness + 10}%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Belly (lighter underside)
      ctx.fillStyle = `hsl(${hue}, 50%, ${lightness + 15}%)`;
      ctx.beginPath();
      ctx.arc(cx, cy + 2, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head
    const head = snake[0];
    const hx = head.x * GRID + GRID / 2;
    const hy = head.y * GRID + GRID / 2;
    const hr = GRID / 2 + 2;

    // Head shape (slightly elongated in direction)
    ctx.fillStyle = "hsl(130, 70%, 45%)";
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();

    // Head highlight
    ctx.fillStyle = "hsl(130, 60%, 55%)";
    ctx.beginPath();
    ctx.arc(hx - 2, hy - 3, hr * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction for eyes
    const dx = dir === "right" ? 1 : dir === "left" ? -1 : 0;
    const dy = dir === "down" ? 1 : dir === "up" ? -1 : 0;

    // Eyes (googly style)
    const eyeOffX = dx * 3;
    const eyeOffY = dy * 3;
    const eyeSpread = dir === "up" || dir === "down" ? 5 : 3;
    const perpX = dir === "up" || dir === "down" ? 1 : 0;
    const perpY = dir === "left" || dir === "right" ? 1 : 0;

    for (const side of [-1, 1]) {
      const ex = hx + eyeOffX + perpX * side * eyeSpread;
      const ey = hy + eyeOffY + perpY * side * eyeSpread - 1;

      // Eye white
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Pupil (looks at food direction)
      const px = ex + Math.cos(eyeAngle) * 1.8;
      const py = ey + Math.sin(eyeAngle) * 1.8;
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth / tongue
    const mouthX = hx + dx * (hr - 2);
    const mouthY = hy + dy * (hr - 2);

    if (mouthOpen > 0) {
      // Open mouth
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.arc(mouthX, mouthY, 4 * mouthOpen, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tongue
    if (tongueOut > 0) {
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      const tLen = tongueOut * 12;
      ctx.beginPath();
      ctx.moveTo(mouthX, mouthY);
      ctx.lineTo(mouthX + dx * tLen, mouthY + dy * tLen);
      ctx.stroke();
      // Fork
      ctx.beginPath();
      ctx.moveTo(mouthX + dx * tLen, mouthY + dy * tLen);
      ctx.lineTo(mouthX + dx * (tLen + 4) + perpX * 3, mouthY + dy * (tLen + 4) + perpY * 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mouthX + dx * tLen, mouthY + dy * tLen);
      ctx.lineTo(mouthX + dx * (tLen + 4) - perpX * 3, mouthY + dy * (tLen + 4) - perpY * 3);
      ctx.stroke();
    }

    // Cute blush
    ctx.fillStyle = "rgba(255, 150, 150, 0.3)";
    ctx.beginPath();
    ctx.ellipse(hx - perpX * 6 + dx * -2, hy - perpY * 6 + dy * -2, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx + perpX * 6 + dx * -2, hy + perpY * 6 + dy * -2, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    const w = CANVAS_W;
    const h = CANVAS_H;

    ctx.save();

    // Screen shake
    if (s.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * s.screenShake * 8;
      const shakeY = (Math.random() - 0.5) * s.screenShake * 8;
      ctx.translate(shakeX, shakeY);
    }

    // Background with shifting hue
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 1.2);
    bgGrad.addColorStop(0, `hsl(${s.bgHue}, 25%, 18%)`);
    bgGrad.addColorStop(1, `hsl(${s.bgHue + 30}, 30%, 10%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-10, -10, w + 20, h + 20);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * GRID, 0);
      ctx.lineTo(x * GRID, h);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * GRID);
      ctx.lineTo(w, y * GRID);
      ctx.stroke();
    }

    // Trail glow
    for (const t of s.trail) {
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.fillStyle = "hsl(130, 60%, 50%)";
      ctx.beginPath();
      ctx.arc(t.x * GRID + GRID / 2, t.y * GRID + GRID / 2, GRID / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Particles
    for (const p of s.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Food with glow
    const fx = s.food.x * GRID + GRID / 2;
    const fy = s.food.y * GRID + GRID / 2;
    // Glow
    const glowGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, GRID);
    glowGrad.addColorStop(0, "rgba(255, 200, 50, 0.3)");
    glowGrad.addColorStop(1, "rgba(255, 200, 50, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(fx - GRID, fy - GRID, GRID * 2, GRID * 2);
    // Emoji
    ctx.font = `${GRID - 2}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.foodEmoji, fx, fy + 1);

    // Worm
    if (s.snake.length > 0) {
      drawWorm(ctx, s.snake, s.dir, s.eyeAngle, s.tongueOut, s.mouthOpen);
    }

    // Floating texts
    for (const f of s.floats) {
      ctx.globalAlpha = Math.min(f.life, 1);
      ctx.fillStyle = f.color;
      ctx.font = `bold ${f.size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Text outline
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`skor: ${s.score}`, 12, 10);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px sans-serif";
    ctx.fillText(`seviye ${s.level}`, w - 12, 12);
    ctx.fillText(`uzunluk: ${s.snake.length}`, w - 12, 28);

    if (s.gameState === "idle") {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#6bcb77";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("🐛 yilan seven solucan", w / 2, h / 2 - 30);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("baslamak icin tikla veya yon tusuna bas!", w / 2, h / 2 + 10);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "13px sans-serif";
      ctx.fillText("wasd veya yon tuslari ile yonet", w / 2, h / 2 + 35);
    }

    if (s.gameState === "gameover") {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#e63946";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("solucan gitti!", w / 2, h / 2 - 45);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`skor: ${s.score}`, w / 2, h / 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "13px sans-serif";
      ctx.fillText(`uzunluk: ${s.snake.length} | seviye: ${s.level}`, w / 2, h / 2 + 30);
      ctx.fillStyle = "#ffd93d";
      ctx.font = "15px sans-serif";
      ctx.fillText("tekrar oynamak icin tikla", w / 2, h / 2 + 65);
    }

    ctx.restore();
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }, [drawWorm]);

  const update = useCallback((dt: number) => {
    const s = stateRef.current;

    // Update floats
    for (let i = s.floats.length - 1; i >= 0; i--) {
      const f = s.floats[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.life -= dt;
      if (f.life <= 0) s.floats.splice(i, 1);
    }

    // Update particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 2;
      if (p.life <= 0) s.particles.splice(i, 1);
    }

    // Update trail
    for (let i = s.trail.length - 1; i >= 0; i--) {
      s.trail[i].alpha -= dt * 3;
      if (s.trail[i].alpha <= 0) s.trail.splice(i, 1);
    }

    // Screen shake decay
    if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - dt * 5);

    // Tongue animation
    if (s.tongueOut > 0) s.tongueOut = Math.max(0, s.tongueOut - dt * 4);
    if (s.mouthOpen > 0) s.mouthOpen = Math.max(0, s.mouthOpen - dt * 3);

    // BG hue shift
    s.bgHue += dt * 5;

    if (s.gameState !== "playing") return;

    // Eye tracking: look toward food
    if (s.snake.length > 0) {
      const head = s.snake[0];
      const targetAngle = Math.atan2(
        s.food.y * GRID - head.y * GRID,
        s.food.x * GRID - head.x * GRID
      );
      s.eyeAngle += (targetAngle - s.eyeAngle) * dt * 5;
    }

    // Random tongue flick
    if (Math.random() < dt * 0.5) {
      s.tongueOut = 1;
    }

    // Game tick
    s.tickTimer += dt * 1000;
    if (s.tickTimer < s.tickSpeed) return;
    s.tickTimer = 0;

    const head = s.snake[0];
    s.dir = s.nextDir;

    // Calculate new head
    let nx = head.x;
    let ny = head.y;
    if (s.dir === "right") nx++;
    else if (s.dir === "left") nx--;
    else if (s.dir === "up") ny--;
    else if (s.dir === "down") ny++;

    // Wall collision
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      s.gameState = "gameover";
      s.screenShake = 1;
      setDisplayScore(s.score);
      onGameOver(s.score);
      return;
    }

    // Self collision
    if (s.snake.some((p) => p.x === nx && p.y === ny)) {
      s.gameState = "gameover";
      s.screenShake = 1;
      setDisplayScore(s.score);
      onGameOver(s.score);
      return;
    }

    // Add trail for last tail position
    const tail = s.snake[s.snake.length - 1];
    s.trail.push({ x: tail.x, y: tail.y, alpha: 0.6 });

    // Move
    s.snake.unshift({ x: nx, y: ny });

    // Check food
    if (nx === s.food.x && ny === s.food.y) {
      // Don't remove tail (grow)
      s.score += 10 * s.level;
      s.linesEaten++;
      s.mouthOpen = 1;
      s.tongueOut = 0.5;
      s.screenShake = 0.3;

      // Level up every 8 foods
      if (s.linesEaten % 8 === 0) {
        s.level++;
        s.tickSpeed = Math.max(50, TICK_BASE - (s.level - 1) * 10);
        s.floats.push({
          text: `SEVIYE ${s.level}!`,
          x: CANVAS_W / 2,
          y: CANVAS_H / 2,
          life: 2,
          color: "#ffd93d",
          size: 32,
          vx: 0,
          vy: -20,
        });
      }

      addReaction(nx, ny);
      addEatParticles(nx, ny);
      placeFood();
    } else {
      s.snake.pop();
    }
  }, [onGameOver, placeFood, addReaction, addEatParticles]);

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

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;

      if (s.gameState === "idle") {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
          resetGame();
        }
        return;
      }

      if (s.gameState === "gameover") return;

      const map: Record<string, Dir> = {
        ArrowUp: "up", w: "up", W: "up",
        ArrowDown: "down", s: "down", S: "down",
        ArrowLeft: "left", a: "left", A: "left",
        ArrowRight: "right", d: "right", D: "right",
      };

      const newDir = map[e.key];
      if (!newDir) return;

      // Prevent reverse
      const opp: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
      if (opp[newDir] === s.dir) return;

      s.nextDir = newDir;
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [resetGame]);

  // Touch/swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (s.gameState === "idle" || s.gameState === "gameover") {
      resetGame();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    touchStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [resetGame]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (!touchStart.current || s.gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - rect.left) - touchStart.current.x;
    const dy = (e.clientY - rect.top) - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

    const opp: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
    let newDir: Dir;

    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? "right" : "left";
    } else {
      newDir = dy > 0 ? "down" : "up";
    }

    if (opp[newDir] !== s.dir) {
      s.nextDir = newDir;
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-border rounded-lg w-full max-w-[600px] touch-none select-none"
        onPointerDown={handlePointerDown}
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
