"use client";

import { useRef, useEffect, useState, useCallback } from "react";

// --- Constants ---
const TILE = 20;
const COLS = 28;
const ROWS = 31;
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE;
const PAC_SPEED = 80; // pixels per second
const GHOST_SPEED_BASE = 65;
const GHOST_SPEED_INCREMENT = 4; // per level
const TICK_RATE = 1 / 120; // fixed timestep (120 ticks/s)

type Dir = "up" | "down" | "left" | "right" | "none";
type GameState = "idle" | "playing" | "dead" | "levelup";

type Ghost = {
  x: number; y: number;
  dir: Dir;
  color: string;
  moveTimer: number;
};

// Classic pacman-style maze (1=wall, 0=empty, 2=dot, 3=power pellet)
const MAZE_TEMPLATE = [
  "1111111111111111111111111111",
  "1222222222222112222222222221",
  "1211112111112112111112111121",
  "1311112111112112111112111131",
  "1211112111112112111112111121",
  "1222222222222222222222222221",
  "1211112112111111211211112121",
  "1211112112111111211211112121",
  "1222222112222112222112222221",
  "1111112111110110111112111111",
  "0000012111110110111112100000",
  "1111112110000000011211211111",
  "0000012110111011011211200000",
  "1111112000100001002112111111",
  "0000002010100001010200000000",
  "1111112010111110010211111111",
  "0000012010000000010210000000",
  "1111112010111111010211111111",
  "1222222200222222002222222221",
  "1211112111112112111112111121",
  "1211112111112112111112111121",
  "1322112222222002222222112231",
  "1112112112111111211211211211",
  "1112112112111111211211211211",
  "1222222212222112222122222221",
  "1211111111112112111111111121",
  "1211111111112112111111111121",
  "1222222222222222222222222221",
  "1111111111111111111111111111",
  "0000000000000000000000000000",
  "0000000000000000000000000000",
];

function parseMaze(): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    const row = MAZE_TEMPLATE[r] || "0".repeat(COLS);
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = parseInt(row[c] || "0");
    }
  }
  return grid;
}

function getOpposite(dir: Dir): Dir {
  if (dir === "up") return "down";
  if (dir === "down") return "up";
  if (dir === "left") return "right";
  if (dir === "right") return "left";
  return "none";
}

type Props = { onGameOver: (score: number) => void };

export default function PacmanOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [highScore, setHighScore] = useState(0);
  const animRef = useRef<number>(0);

  const stateRef = useRef({
    gameState: "idle" as GameState,
    // Pacman — pixel positions
    px: 14 * TILE, py: 21 * TILE,
    dir: "left" as Dir, nextDir: "left" as Dir,
    mouthAngle: 0, mouthDir: 1,
    // Game
    score: 0, lives: 3, level: 1,
    grid: parseMaze(),
    ghosts: [] as Ghost[],
    accumulator: 0,
    lastTime: 0,
    // Power
    powerTimer: 0,
    levelUpTimer: 0,
  });

  function initGhosts(): Ghost[] {
    return [
      { x: 12 * TILE, y: 13 * TILE, dir: "up", color: "#ff0000", moveTimer: 0 },
      { x: 14 * TILE, y: 13 * TILE, dir: "up", color: "#00ffff", moveTimer: 0 },
      { x: 13 * TILE, y: 14 * TILE, dir: "left", color: "#ffb8ff", moveTimer: 0 },
      { x: 15 * TILE, y: 14 * TILE, dir: "right", color: "#ffb852", moveTimer: 0 },
    ];
  }

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.grid = parseMaze();
    s.px = 14 * TILE; s.py = 21 * TILE;
    s.dir = "left"; s.nextDir = "left";
    s.mouthAngle = 0; s.mouthDir = 1;
    s.score = 0; s.lives = 3; s.level = 1;
    s.ghosts = initGhosts();
    s.accumulator = 0; s.lastTime = 0;
    s.powerTimer = 0; s.levelUpTimer = 0;
    s.gameState = "playing";
    setGameState("playing");
    setDisplayScore(0);
    setDisplayLives(3);
  }, []);

  // --- Input ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.code === "Space" && (s.gameState === "idle" || s.gameState === "dead")) {
        e.preventDefault(); resetGame(); return;
      }
      if (s.gameState !== "playing") return;
      if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); s.nextDir = "up"; }
      if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); s.nextDir = "down"; }
      if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); s.nextDir = "left"; }
      if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); s.nextDir = "right"; }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [resetGame]);

  // Touch swipe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      if (s.gameState === "idle" || s.gameState === "dead") { resetGame(); return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const s = stateRef.current;
      if (s.gameState !== "playing" || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // too small
      if (Math.abs(dx) > Math.abs(dy)) {
        s.nextDir = dx > 0 ? "right" : "left";
      } else {
        s.nextDir = dy > 0 ? "down" : "up";
      }
    };
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchend", onEnd, { passive: false });
    return () => { canvas.removeEventListener("touchstart", onStart); canvas.removeEventListener("touchend", onEnd); };
  }, [resetGame]);

  // --- Game loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function tileAt(px: number, py: number): number {
      const s = stateRef.current;
      const c = Math.floor(px / TILE);
      const r = Math.floor(py / TILE);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 1;
      return s.grid[r]?.[c] ?? 1;
    }

    function isWall(px: number, py: number): boolean {
      return tileAt(px, py) === 1;
    }

    function canMovePixel(x: number, y: number, dir: Dir, speed: number): boolean {
      const half = TILE / 2 - 2; // collision padding
      let nx = x, ny = y;
      if (dir === "left") nx -= speed;
      if (dir === "right") nx += speed;
      if (dir === "up") ny -= speed;
      if (dir === "down") ny += speed;
      // Check all 4 corners
      return !isWall(nx - half, ny - half) && !isWall(nx + half, ny - half) &&
             !isWall(nx - half, ny + half) && !isWall(nx + half, ny + half);
    }

    function snapToGrid(val: number): number {
      return Math.round(val / TILE) * TILE;
    }

    function alignedToGrid(x: number, y: number): boolean {
      return Math.abs(x - snapToGrid(x)) < 2 && Math.abs(y - snapToGrid(y)) < 2;
    }

    function moveEntity(x: number, y: number, dir: Dir, speed: number): [number, number] {
      if (dir === "left") return [x - speed, y];
      if (dir === "right") return [x + speed, y];
      if (dir === "up") return [x, y - speed];
      if (dir === "down") return [x, y + speed];
      return [x, y];
    }

    function ghostSpeed(): number {
      const s = stateRef.current;
      const spd = GHOST_SPEED_BASE + (s.level - 1) * GHOST_SPEED_INCREMENT;
      return s.powerTimer > 0 ? spd * 0.5 : Math.min(spd, PAC_SPEED + 10);
    }

    function moveGhost(g: Ghost, dt: number) {
      const s = stateRef.current;
      const spd = ghostSpeed() * dt;
      g.moveTimer += dt;

      // Only change direction at grid intersections
      if (!alignedToGrid(g.x + TILE / 2, g.y + TILE / 2)) {
        if (canMovePixel(g.x + TILE / 2, g.y + TILE / 2, g.dir, spd)) {
          const [nx, ny] = moveEntity(g.x + TILE / 2, g.y + TILE / 2, g.dir, spd);
          g.x = nx - TILE / 2; g.y = ny - TILE / 2;
        }
        return;
      }

      // Snap
      g.x = snapToGrid(g.x + TILE / 2) - TILE / 2;
      g.y = snapToGrid(g.y + TILE / 2) - TILE / 2;

      const dirs: Dir[] = ["up", "down", "left", "right"];
      const opposite = getOpposite(g.dir);
      const gx = g.x + TILE / 2, gy = g.y + TILE / 2;

      const possible = dirs.filter(d => {
        if (d === opposite) return false;
        return canMovePixel(gx, gy, d, spd);
      });

      if (possible.length === 0) {
        if (canMovePixel(gx, gy, opposite, spd)) {
          g.dir = opposite;
        }
      } else {
        // Chase pacman (70%) or random (30%)
        if (s.powerTimer > 0 || Math.random() < 0.3) {
          g.dir = possible[Math.floor(Math.random() * possible.length)];
        } else {
          const dx = s.px - gx, dy = s.py - gy;
          const preferred: Dir[] = [];
          if (Math.abs(dx) > Math.abs(dy)) {
            preferred.push(dx > 0 ? "right" : "left", dy > 0 ? "down" : "up");
          } else {
            preferred.push(dy > 0 ? "down" : "up", dx > 0 ? "right" : "left");
          }
          g.dir = preferred.find(d => possible.includes(d)) || possible[0];
        }
      }

      const [nx, ny] = moveEntity(gx, gy, g.dir, spd);
      g.x = nx - TILE / 2; g.y = ny - TILE / 2;
    }

    function update(dt: number) {
      const s = stateRef.current;
      if (s.gameState === "levelup") {
        s.levelUpTimer -= dt;
        if (s.levelUpTimer <= 0) {
          s.gameState = "playing";
          setGameState("playing");
        }
        return;
      }
      if (s.gameState !== "playing") return;

      // Mouth animation
      s.mouthAngle += s.mouthDir * dt * 8;
      if (s.mouthAngle > 0.35) { s.mouthAngle = 0.35; s.mouthDir = -1; }
      if (s.mouthAngle < 0) { s.mouthAngle = 0; s.mouthDir = 1; }

      // Power timer
      if (s.powerTimer > 0) s.powerTimer -= dt;

      // --- Pacman movement ---
      const pacSpeed = PAC_SPEED * dt;
      const pcx = s.px + TILE / 2, pcy = s.py + TILE / 2;

      // At intersection, try turning
      if (alignedToGrid(pcx, pcy)) {
        s.px = snapToGrid(pcx) - TILE / 2;
        s.py = snapToGrid(pcy) - TILE / 2;

        if (s.nextDir !== "none" && canMovePixel(s.px + TILE / 2, s.py + TILE / 2, s.nextDir, pacSpeed)) {
          s.dir = s.nextDir;
        }
      }

      if (s.dir !== "none" && canMovePixel(s.px + TILE / 2, s.py + TILE / 2, s.dir, pacSpeed)) {
        const [nx, ny] = moveEntity(s.px + TILE / 2, s.py + TILE / 2, s.dir, pacSpeed);
        s.px = nx - TILE / 2; s.py = ny - TILE / 2;
      }

      // Tunnel wrap
      if (s.px < -TILE) s.px = CANVAS_W;
      if (s.px > CANVAS_W) s.px = -TILE;

      // Eat dots
      const col = Math.floor((s.px + TILE / 2) / TILE);
      const row = Math.floor((s.py + TILE / 2) / TILE);
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const cell = s.grid[row][col];
        if (cell === 2) { s.grid[row][col] = 0; s.score += 10; }
        if (cell === 3) { s.grid[row][col] = 0; s.score += 50; s.powerTimer = 7; }
      }

      // --- Ghosts ---
      for (const g of s.ghosts) {
        moveGhost(g, dt);

        // Tunnel wrap for ghosts too
        if (g.x < -TILE) g.x = CANVAS_W;
        if (g.x > CANVAS_W) g.x = -TILE;

        // Collision
        const dx = (g.x + TILE / 2) - (s.px + TILE / 2);
        const dy = (g.y + TILE / 2) - (s.py + TILE / 2);
        if (Math.abs(dx) < TILE * 0.7 && Math.abs(dy) < TILE * 0.7) {
          if (s.powerTimer > 0) {
            // Eat ghost
            s.score += 200;
            g.x = 13 * TILE; g.y = 13 * TILE; g.dir = "up";
          } else {
            s.lives--;
            setDisplayLives(s.lives);
            if (s.lives <= 0) {
              s.gameState = "dead";
              setGameState("dead");
              if (s.score > highScore) setHighScore(s.score);
              onGameOver(s.score);
            } else {
              // Respawn
              s.px = 14 * TILE; s.py = 21 * TILE;
              s.dir = "left"; s.nextDir = "left";
              s.ghosts = initGhosts();
            }
            return;
          }
        }
      }

      // Check level complete
      let dotsLeft = false;
      outer: for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (s.grid[r][c] === 2 || s.grid[r][c] === 3) { dotsLeft = true; break outer; }
        }
      }
      if (!dotsLeft) {
        s.level++;
        s.grid = parseMaze();
        s.px = 14 * TILE; s.py = 21 * TILE;
        s.dir = "left"; s.nextDir = "left";
        s.ghosts = initGhosts();
        s.powerTimer = 0;
        s.gameState = "levelup";
        s.levelUpTimer = 1.5;
        setGameState("levelup");
      }

      setDisplayScore(s.score);
    }

    function draw() {
      const s = stateRef.current;
      const isDark = document.documentElement.classList.contains("dark");

      // Background
      ctx.fillStyle = isDark ? "#0a0a1a" : "#000011";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Maze walls with rounded look
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * TILE, y = r * TILE;
          const cell = s.grid[r]?.[c];

          if (cell === 1) {
            ctx.fillStyle = isDark ? "#1a237e" : "#1a3a8a";
            ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
            // Border highlight
            ctx.strokeStyle = isDark ? "#3949ab" : "#2962ff";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
          } else if (cell === 2) {
            ctx.fillStyle = "#ffcc80";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell === 3) {
            // Power pellet — pulsing
            const pulse = 3 + Math.sin(Date.now() / 200) * 1.5;
            ctx.fillStyle = "#ffcc80";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, pulse, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Pacman
      if (s.gameState !== "idle") {
        const px = s.px + TILE / 2, py = s.py + TILE / 2;
        const r = TILE / 2 - 1;
        let angle = 0;
        if (s.dir === "right") angle = 0;
        else if (s.dir === "down") angle = Math.PI / 2;
        else if (s.dir === "left") angle = Math.PI;
        else if (s.dir === "up") angle = -Math.PI / 2;

        const mouth = s.mouthAngle;
        ctx.fillStyle = "#ffeb3b";
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, r, angle + mouth * Math.PI, angle - mouth * Math.PI + Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      // Ghosts
      const isPowered = s.powerTimer > 0;
      for (const g of s.ghosts) {
        const gx = g.x + TILE / 2, gy = g.y + TILE / 2;
        const r = TILE / 2 - 1;

        // Flashing when power ending
        const flashing = isPowered && s.powerTimer < 2 && Math.floor(Date.now() / 200) % 2 === 0;
        ctx.fillStyle = isPowered ? (flashing ? "#fff" : "#2222ff") : g.color;

        // Body
        ctx.beginPath();
        ctx.arc(gx, gy - 2, r, Math.PI, 0);
        ctx.lineTo(gx + r, gy + r - 2);
        const segments = 4;
        for (let i = 0; i < segments; i++) {
          const segW = (r * 2) / segments;
          const bx = gx + r - i * segW;
          const midX = bx - segW / 2;
          const bottomY = gy + r - 2;
          ctx.quadraticCurveTo(midX, bottomY - 4, bx - segW, bottomY);
        }
        ctx.closePath();
        ctx.fill();

        // Eyes
        if (!isPowered) {
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(gx - 4, gy - 3, 3.5, 0, Math.PI * 2);
          ctx.arc(gx + 4, gy - 3, 3.5, 0, Math.PI * 2);
          ctx.fill();
          // Pupils look at pacman
          const dx = s.px - g.x, dy = s.py - g.y;
          const a = Math.atan2(dy, dx);
          ctx.fillStyle = "#111";
          ctx.beginPath();
          ctx.arc(gx - 4 + Math.cos(a) * 1.5, gy - 3 + Math.sin(a) * 1.5, 1.8, 0, Math.PI * 2);
          ctx.arc(gx + 4 + Math.cos(a) * 1.5, gy - 3 + Math.sin(a) * 1.5, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Scared face
          ctx.fillStyle = isPowered && !flashing ? "#fff" : "#2222ff";
          ctx.beginPath();
          ctx.arc(gx - 3, gy - 3, 2, 0, Math.PI * 2);
          ctx.arc(gx + 3, gy - 3, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // HUD background
      ctx.fillStyle = isDark ? "#0a0a1a" : "#000011";
      ctx.fillRect(0, CANVAS_H - 24, CANVAS_W, 24);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SKOR ${s.score.toString().padStart(6, "0")}`, 8, CANVAS_H - 8);

      ctx.textAlign = "center";
      ctx.fillText(`SEVIYE ${s.level}`, CANVAS_W / 2, CANVAS_H - 8);

      ctx.textAlign = "right";
      for (let i = 0; i < s.lives; i++) {
        ctx.fillStyle = "#ffeb3b";
        ctx.beginPath();
        ctx.arc(CANVAS_W - 16 - i * 22, CANVAS_H - 13, 7, 0.2 * Math.PI, 1.8 * Math.PI);
        ctx.lineTo(CANVAS_W - 16 - i * 22, CANVAS_H - 13);
        ctx.fill();
      }

      if (highScore > 0) {
        ctx.fillStyle = "#888";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`HI ${highScore.toString().padStart(6, "0")}`, CANVAS_W / 2, CANVAS_H - 20);
      }

      // Overlays
      if (s.gameState === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PACMAN", CANVAS_W / 2, CANVAS_H / 2 - 30);
        ctx.fillStyle = "#aaa";
        ctx.font = "13px monospace";
        ctx.fillText("ok tuslari / WASD ile oyna", CANVAS_W / 2, CANVAS_H / 2);
        ctx.fillText("SPACE veya dokun ile basla", CANVAS_W / 2, CANVAS_H / 2 + 22);
      }

      if (s.gameState === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ff5252";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 25);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 20px monospace";
        ctx.fillText(`SKOR: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 8);
        ctx.fillStyle = "#aaa";
        ctx.font = "13px monospace";
        ctx.fillText("tekrar icin SPACE", CANVAS_W / 2, CANVAS_H / 2 + 35);
      }

      if (s.gameState === "levelup") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`SEVIYE ${s.level}`, CANVAS_W / 2, CANVAS_H / 2);
      }
    }

    function gameLoop(time: number) {
      const s = stateRef.current;
      if (s.lastTime === 0) s.lastTime = time;
      const rawDt = (time - s.lastTime) / 1000;
      s.lastTime = time;

      // Cap delta to avoid spiral of death
      const dt = Math.min(rawDt, 0.05);
      s.accumulator += dt;

      // Fixed timestep updates
      while (s.accumulator >= TICK_RATE) {
        update(TICK_RATE);
        s.accumulator -= TICK_RATE;
      }

      draw();
      animRef.current = requestAnimationFrame(gameLoop);
    }

    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [highScore, onGameOver]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-border rounded-lg w-full max-w-[560px] cursor-pointer touch-none"
        onClick={() => {
          const s = stateRef.current;
          if (s.gameState === "idle" || s.gameState === "dead") resetGame();
        }}
      />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>ok tuslari / WASD</span>
        <span>skor: {displayScore.toString().padStart(6, "0")}</span>
        <span>can: {displayLives}</span>
      </div>
    </div>
  );
}
