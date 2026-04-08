"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const TILE = 24;
const COLS = 21;
const ROWS = 21;
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE + 28; // extra for HUD

type Dir = "up" | "down" | "left" | "right";
type GameState = "idle" | "playing" | "dead" | "levelup";
type Ghost = { col: number; row: number; dir: Dir; color: string; scatter: boolean };

// 0=path+dot, 1=wall, 3=power pellet, 8=empty(no dot), 9=ghost house
const MAZE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,1],
  [1,3,1,1,0,1,1,1,0,0,0,0,0,1,1,1,0,1,1,3,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,1,1],
  [8,8,8,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,8,8,8],
  [1,1,1,1,0,1,0,1,1,9,9,9,1,1,0,1,0,1,1,1,1],
  [8,8,8,8,0,0,0,1,9,9,9,9,9,1,0,0,0,8,8,8,8],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [8,8,8,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,8,8,8],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,1],
  [1,3,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,3,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,0,1,0,0,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
];

function cloneMaze(): number[][] {
  return MAZE.map(row => [...row]);
}

function isWalkable(grid: number[][], col: number, row: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  const v = grid[row][col];
  return v !== 1;
}

function nextPos(col: number, row: number, dir: Dir): [number, number] {
  if (dir === "up") return [col, row - 1];
  if (dir === "down") return [col, row + 1];
  if (dir === "left") return [col - 1, row];
  return [col + 1, row];
}

function getOpposite(dir: Dir): Dir {
  if (dir === "up") return "down";
  if (dir === "down") return "up";
  if (dir === "left") return "right";
  return "left";
}

type Props = { onGameOver: (score: number) => void };

export default function PacmanOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [highScore, setHighScore] = useState(0);
  const animRef = useRef<number>(0);

  const sRef = useRef({
    gameState: "idle" as GameState,
    col: 10, row: 16, // pacman start
    dir: "left" as Dir, nextDir: "left" as Dir,
    score: 0, lives: 3, level: 1,
    grid: cloneMaze(),
    ghosts: [] as Ghost[],
    // Timing
    moveTimer: 0,
    ghostMoveTimer: 0,
    lastTime: 0,
    mouthOpen: true,
    mouthTimer: 0,
    powerTimer: 0,
    levelUpTimer: 0,
    // Speeds (seconds per tile move)
    pacInterval: 0.12,
    ghostInterval: 0.16,
  });

  function makeGhosts(): Ghost[] {
    return [
      { col: 9, row: 9, dir: "up", color: "#ff0000", scatter: false },
      { col: 10, row: 10, dir: "up", color: "#00ffff", scatter: false },
      { col: 11, row: 9, dir: "left", color: "#ffb8ff", scatter: false },
      { col: 10, row: 9, dir: "right", color: "#ffb852", scatter: false },
    ];
  }

  const resetGame = useCallback(() => {
    const s = sRef.current;
    s.grid = cloneMaze();
    s.col = 10; s.row = 16;
    s.dir = "left"; s.nextDir = "left";
    s.score = 0; s.lives = 3; s.level = 1;
    s.ghosts = makeGhosts();
    s.moveTimer = 0; s.ghostMoveTimer = 0;
    s.lastTime = 0; s.mouthOpen = true; s.mouthTimer = 0;
    s.powerTimer = 0; s.levelUpTimer = 0;
    s.pacInterval = 0.12; s.ghostInterval = 0.16;
    s.gameState = "playing";
    setGameState("playing");
    setDisplayScore(0);
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = sRef.current;
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
      const s = sRef.current;
      if (s.gameState === "idle" || s.gameState === "dead") { resetGame(); return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const s = sRef.current;
      if (s.gameState !== "playing" || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.nextDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    };
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchend", onEnd, { passive: false });
    return () => { canvas.removeEventListener("touchstart", onStart); canvas.removeEventListener("touchend", onEnd); };
  }, [resetGame]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function moveGhost(g: Ghost) {
      const s = sRef.current;
      const dirs: Dir[] = ["up", "down", "left", "right"];
      const opp = getOpposite(g.dir);

      const possible = dirs.filter(d => {
        if (d === opp) return false;
        const [nc, nr] = nextPos(g.col, g.row, d);
        return isWalkable(s.grid, nc, nr);
      });

      if (possible.length === 0) {
        const [nc, nr] = nextPos(g.col, g.row, opp);
        if (isWalkable(s.grid, nc, nr)) {
          g.dir = opp;
          g.col = nc; g.row = nr;
        }
        return;
      }

      let chosen: Dir;
      if (s.powerTimer > 0 || Math.random() < 0.25) {
        // Random or scared
        chosen = possible[Math.floor(Math.random() * possible.length)];
      } else {
        // Chase pacman
        const dx = s.col - g.col, dy = s.row - g.row;
        const pref: Dir[] = [];
        if (Math.abs(dx) >= Math.abs(dy)) {
          pref.push(dx > 0 ? "right" : "left", dy > 0 ? "down" : "up");
        } else {
          pref.push(dy > 0 ? "down" : "up", dx > 0 ? "right" : "left");
        }
        chosen = pref.find(d => possible.includes(d)) || possible[0];
      }

      const [nc, nr] = nextPos(g.col, g.row, chosen);
      g.dir = chosen; g.col = nc; g.row = nr;
    }

    function tick(dt: number) {
      const s = sRef.current;

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
      s.mouthTimer += dt;
      if (s.mouthTimer >= 0.08) {
        s.mouthTimer = 0;
        s.mouthOpen = !s.mouthOpen;
      }

      // Power timer
      if (s.powerTimer > 0) s.powerTimer -= dt;

      // Pacman movement
      s.moveTimer += dt;
      if (s.moveTimer >= s.pacInterval) {
        s.moveTimer -= s.pacInterval;

        // Try desired direction first
        const [nc1, nr1] = nextPos(s.col, s.row, s.nextDir);
        if (isWalkable(s.grid, nc1, nr1)) {
          s.dir = s.nextDir;
          s.col = nc1; s.row = nr1;
        } else {
          // Continue current direction
          const [nc2, nr2] = nextPos(s.col, s.row, s.dir);
          if (isWalkable(s.grid, nc2, nr2)) {
            s.col = nc2; s.row = nr2;
          }
        }

        // Tunnel wrap
        if (s.col < 0) s.col = COLS - 1;
        if (s.col >= COLS) s.col = 0;

        // Eat
        const cell = s.grid[s.row]?.[s.col];
        if (cell === 0) { s.grid[s.row][s.col] = 8; s.score += 10; }
        if (cell === 3) { s.grid[s.row][s.col] = 8; s.score += 50; s.powerTimer = 7; }
      }

      // Ghost movement
      s.ghostMoveTimer += dt;
      if (s.ghostMoveTimer >= s.ghostInterval) {
        s.ghostMoveTimer -= s.ghostInterval;
        for (const g of s.ghosts) moveGhost(g);
      }

      // Collision check
      for (const g of s.ghosts) {
        if (g.col === s.col && g.row === s.row) {
          if (s.powerTimer > 0) {
            s.score += 200;
            g.col = 10; g.row = 10; g.dir = "up";
          } else {
            s.lives--;
            if (s.lives <= 0) {
              s.gameState = "dead";
              setGameState("dead");
              if (s.score > highScore) setHighScore(s.score);
              onGameOver(s.score);
            } else {
              s.col = 10; s.row = 16;
              s.dir = "left"; s.nextDir = "left";
              s.ghosts = makeGhosts();
              s.moveTimer = 0; s.ghostMoveTimer = 0;
            }
            return;
          }
        }
      }

      // Level complete
      let dotsExist = false;
      outer: for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (s.grid[r][c] === 0 || s.grid[r][c] === 3) { dotsExist = true; break outer; }
        }
      }
      if (!dotsExist) {
        s.level++;
        s.grid = cloneMaze();
        s.col = 10; s.row = 16; s.dir = "left"; s.nextDir = "left";
        s.ghosts = makeGhosts();
        s.ghostInterval = Math.max(0.06, 0.16 - (s.level - 1) * 0.012);
        s.pacInterval = Math.max(0.07, 0.12 - (s.level - 1) * 0.005);
        s.powerTimer = 0;
        s.gameState = "levelup";
        s.levelUpTimer = 1.5;
        setGameState("levelup");
      }

      setDisplayScore(s.score);
    }

    function draw() {
      const s = sRef.current;
      const isDark = document.documentElement.classList.contains("dark");

      ctx.fillStyle = isDark ? "#0a0a1a" : "#000011";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Maze
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * TILE, y = r * TILE;
          const v = s.grid[r][c];

          if (v === 1) {
            ctx.fillStyle = isDark ? "#1a237e" : "#1a3a8a";
            ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
            ctx.strokeStyle = isDark ? "#3949ab" : "#2962ff";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
          } else if (v === 0) {
            ctx.fillStyle = "#ffcc80";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (v === 3) {
            const pulse = 4 + Math.sin(Date.now() / 200) * 2;
            ctx.fillStyle = "#ffcc80";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, pulse, 0, Math.PI * 2);
            ctx.fill();
          } else if (v === 9) {
            ctx.strokeStyle = isDark ? "#3949ab44" : "#2962ff44";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
          }
        }
      }

      // Pacman
      if (s.gameState !== "idle") {
        const px = s.col * TILE + TILE / 2;
        const py = s.row * TILE + TILE / 2;
        const rad = TILE / 2 - 2;
        let angle = 0;
        if (s.dir === "right") angle = 0;
        else if (s.dir === "down") angle = Math.PI / 2;
        else if (s.dir === "left") angle = Math.PI;
        else angle = -Math.PI / 2;

        const mouth = s.mouthOpen ? 0.3 : 0.05;
        ctx.fillStyle = "#ffeb3b";
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, rad, angle + mouth * Math.PI, angle - mouth * Math.PI + Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      // Ghosts
      const isPowered = s.powerTimer > 0;
      for (const g of s.ghosts) {
        const gx = g.col * TILE + TILE / 2;
        const gy = g.row * TILE + TILE / 2;
        const r = TILE / 2 - 2;

        const flashing = isPowered && s.powerTimer < 2 && Math.floor(Date.now() / 200) % 2 === 0;
        ctx.fillStyle = isPowered ? (flashing ? "#fff" : "#2222ff") : g.color;

        // Ghost body
        ctx.beginPath();
        ctx.arc(gx, gy - 2, r, Math.PI, 0);
        ctx.lineTo(gx + r, gy + r - 1);
        for (let i = 0; i < 3; i++) {
          const w = (r * 2) / 3;
          const bx = gx + r - i * w;
          ctx.quadraticCurveTo(bx - w / 2, gy + r - 5, bx - w, gy + r - 1);
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
          const a = Math.atan2(s.row - g.row, s.col - g.col);
          ctx.fillStyle = "#222";
          ctx.beginPath();
          ctx.arc(gx - 4 + Math.cos(a) * 1.5, gy - 3 + Math.sin(a) * 1.5, 2, 0, Math.PI * 2);
          ctx.arc(gx + 4 + Math.cos(a) * 1.5, gy - 3 + Math.sin(a) * 1.5, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = flashing ? "#2222ff" : "#fff";
          ctx.beginPath();
          ctx.arc(gx - 3, gy - 3, 2, 0, Math.PI * 2);
          ctx.arc(gx + 3, gy - 3, 2, 0, Math.PI * 2);
          ctx.fill();
          // Wavy mouth
          ctx.strokeStyle = flashing ? "#2222ff" : "#fff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(gx - 5, gy + 2);
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(gx - 5 + i * 2.5, gy + (i % 2 === 0 ? 2 : 5));
          }
          ctx.stroke();
        }
      }

      // HUD
      const hudY = ROWS * TILE + 2;
      ctx.fillStyle = isDark ? "#0a0a1a" : "#000011";
      ctx.fillRect(0, hudY, CANVAS_W, 28);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SKOR ${s.score.toString().padStart(6, "0")}`, 8, hudY + 18);

      ctx.textAlign = "center";
      ctx.fillText(`LV ${s.level}`, CANVAS_W / 2, hudY + 18);

      // Lives as pac icons
      ctx.fillStyle = "#ffeb3b";
      for (let i = 0; i < s.lives; i++) {
        const lx = CANVAS_W - 18 - i * 22;
        ctx.beginPath();
        ctx.moveTo(lx, hudY + 14);
        ctx.arc(lx, hudY + 14, 7, 0.2 * Math.PI, 1.8 * Math.PI);
        ctx.closePath();
        ctx.fill();
      }

      // Overlays
      if (s.gameState === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PACMAN", CANVAS_W / 2, CANVAS_H / 2 - 30);
        ctx.fillStyle = "#ccc";
        ctx.font = "12px monospace";
        ctx.fillText("ok tuslari / WASD ile oyna", CANVAS_W / 2, CANVAS_H / 2 - 4);
        ctx.fillText("SPACE veya dokun", CANVAS_W / 2, CANVAS_H / 2 + 16);
      }

      if (s.gameState === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ff5252";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 25);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 18px monospace";
        ctx.fillText(`SKOR: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 5);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px monospace";
        ctx.fillText("tekrar icin SPACE", CANVAS_W / 2, CANVAS_H / 2 + 30);
      }

      if (s.gameState === "levelup") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`SEVIYE ${s.level}`, CANVAS_W / 2, CANVAS_H / 2);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px monospace";
        ctx.fillText("hayaletler hizlandi!", CANVAS_W / 2, CANVAS_H / 2 + 24);
      }
    }

    function loop(time: number) {
      const s = sRef.current;
      if (s.lastTime === 0) s.lastTime = time;
      const dt = Math.min((time - s.lastTime) / 1000, 0.05);
      s.lastTime = time;

      tick(dt);
      draw();
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [highScore, onGameOver]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-border rounded-lg w-full max-w-[504px] cursor-pointer touch-none"
        onClick={() => {
          const s = sRef.current;
          if (s.gameState === "idle" || s.gameState === "dead") resetGame();
        }}
      />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>ok tuslari / WASD</span>
        <span>skor: {displayScore.toString().padStart(6, "0")}</span>
      </div>
    </div>
  );
}
