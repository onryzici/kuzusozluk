"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const CANVAS_W = 600;
const CANVAS_H = 400;
const TILE = 20;
const COLS = CANVAS_W / TILE;
const ROWS = CANVAS_H / TILE;

type Dir = "up" | "down" | "left" | "right";
type GameState = "idle" | "playing" | "dead";
type Ghost = {
  x: number;
  y: number;
  dir: Dir;
  color: string;
  speed: number;
};

// Simple maze layout (1 = wall, 0 = path, 2 = dot)
function generateMaze(): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      // Borders
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        grid[r][c] = 1;
      } else {
        grid[r][c] = 2; // dot
      }
    }
  }

  // Internal walls pattern
  const wallPatterns = [
    // Horizontal walls
    [2, 2, 5], [2, 7, 5], [2, 12, 5], [2, 19, 5], [2, 24, 5],
    [4, 4, 3], [4, 9, 4], [4, 17, 4], [4, 23, 3],
    [6, 2, 4], [6, 8, 3], [6, 13, 4], [6, 19, 3], [6, 24, 4],
    [8, 4, 5], [8, 11, 8], [8, 21, 5],
    [10, 2, 3], [10, 7, 4], [10, 19, 4], [10, 25, 3],
    [12, 4, 5], [12, 11, 8], [12, 21, 5],
    [14, 2, 4], [14, 8, 3], [14, 13, 4], [14, 19, 3], [14, 24, 4],
    [16, 4, 3], [16, 9, 4], [16, 17, 4], [16, 23, 3],
    [18, 2, 5], [18, 9, 3], [18, 18, 3], [18, 23, 5],
  ];

  for (const [row, col, len] of wallPatterns) {
    if (row < ROWS) {
      for (let i = 0; i < len && col + i < COLS; i++) {
        grid[row][col + i] = 1;
      }
    }
  }

  // Vertical walls
  const vWalls = [
    [3, 10, 3], [3, 20, 3],
    [7, 6, 3], [7, 24, 3],
    [11, 10, 3], [11, 20, 3],
    [15, 6, 3], [15, 24, 3],
  ];
  for (const [startRow, col, len] of vWalls) {
    for (let i = 0; i < len && startRow + i < ROWS; i++) {
      if (col < COLS) grid[startRow + i][col] = 1;
    }
  }

  return grid;
}

function getOpposite(dir: Dir): Dir {
  return dir === "up" ? "down" : dir === "down" ? "up" : dir === "left" ? "right" : "left";
}

type Props = {
  onGameOver: (score: number) => void;
};

export default function PacmanOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [highScore, setHighScore] = useState(0);
  const animRef = useRef<number>(0);

  const stateRef = useRef<{
    gameState: GameState;
    pacX: number;
    pacY: number;
    pacDir: Dir;
    nextDir: Dir;
    mouthOpen: boolean;
    frame: number;
    score: number;
    lives: number;
    grid: number[][];
    ghosts: Ghost[];
    totalDots: number;
    ghostSpeedBase: number;
  }>({
    gameState: "idle",
    pacX: 1,
    pacY: 1,
    pacDir: "right",
    nextDir: "right",
    mouthOpen: true,
    frame: 0,
    score: 0,
    lives: 3,
    grid: generateMaze(),
    ghosts: [
      { x: COLS - 2, y: 1, dir: "left" as Dir, color: "#ff0000", speed: 0 },
      { x: COLS - 2, y: ROWS - 2, dir: "up" as Dir, color: "#00ffff", speed: 0 },
      { x: 1, y: ROWS - 2, dir: "right" as Dir, color: "#ffb8ff", speed: 0 },
      { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2), dir: "up" as Dir, color: "#ffb852", speed: 0 },
    ],
    totalDots: 0,
    ghostSpeedBase: 8,
  });

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.grid = generateMaze();
    s.pacX = 1;
    s.pacY = 1;
    s.pacDir = "right";
    s.nextDir = "right";
    s.mouthOpen = true;
    s.frame = 0;
    s.score = 0;
    s.lives = 3;
    s.ghostSpeedBase = 8;

    // Clear pacman start area
    s.grid[1][1] = 0;
    s.grid[1][2] = 0;

    // Count dots
    let dots = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (s.grid[r][c] === 2) dots++;
      }
    }
    s.totalDots = dots;

    // Create ghosts at different positions
    s.ghosts = [
      { x: COLS - 2, y: 1, dir: "left", color: "#ff0000", speed: 0 },
      { x: COLS - 2, y: ROWS - 2, dir: "up", color: "#00ffff", speed: 0 },
      { x: 1, y: ROWS - 2, dir: "right", color: "#ffb8ff", speed: 0 },
      { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2), dir: "up", color: "#ffb852", speed: 0 },
    ];

    // Clear ghost start tiles
    for (const g of s.ghosts) {
      if (s.grid[g.y] && s.grid[g.y][g.x] !== 1) s.grid[g.y][g.x] = 0;
    }

    s.gameState = "playing";
    setGameState("playing");
    setDisplayScore(0);
  }, []);

  // Input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.code === "Space" && (s.gameState === "idle" || s.gameState === "dead")) {
        e.preventDefault();
        resetGame();
        return;
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
    let startX = 0, startY = 0;

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      if (s.gameState === "idle" || s.gameState === "dead") {
        resetGame();
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const s = stateRef.current;
      if (s.gameState !== "playing" || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        s.nextDir = dx > 0 ? "right" : "left";
      } else {
        s.nextDir = dy > 0 ? "down" : "up";
      }
    };

    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchend", onEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [resetGame]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function canMove(x: number, y: number): boolean {
      const s = stateRef.current;
      return y >= 0 && y < ROWS && x >= 0 && x < COLS && s.grid[y][x] !== 1;
    }

    function moveDir(x: number, y: number, dir: Dir): [number, number] {
      if (dir === "up") return [x, y - 1];
      if (dir === "down") return [x, y + 1];
      if (dir === "left") return [x - 1, y];
      return [x + 1, y];
    }

    function moveGhost(g: Ghost) {
      const s = stateRef.current;
      const dirs: Dir[] = ["up", "down", "left", "right"];
      const opposite = getOpposite(g.dir);

      // Try to chase pacman with some randomness
      const possibleDirs = dirs.filter((d) => {
        if (d === opposite) return false;
        const [nx, ny] = moveDir(g.x, g.y, d);
        return canMove(nx, ny);
      });

      if (possibleDirs.length === 0) {
        // Dead end, go back
        const [nx, ny] = moveDir(g.x, g.y, opposite);
        if (canMove(nx, ny)) {
          g.dir = opposite;
          g.x = nx;
          g.y = ny;
        }
        return;
      }

      // 60% chance to chase pacman, 40% random
      let chosen: Dir;
      if (Math.random() < 0.6) {
        const dx = s.pacX - g.x;
        const dy = s.pacY - g.y;
        const preferred: Dir[] = [];
        if (Math.abs(dx) > Math.abs(dy)) {
          preferred.push(dx > 0 ? "right" : "left");
          preferred.push(dy > 0 ? "down" : "up");
        } else {
          preferred.push(dy > 0 ? "down" : "up");
          preferred.push(dx > 0 ? "right" : "left");
        }
        chosen = preferred.find((d) => possibleDirs.includes(d)) || possibleDirs[0];
      } else {
        chosen = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
      }

      const [nx, ny] = moveDir(g.x, g.y, chosen);
      g.dir = chosen;
      g.x = nx;
      g.y = ny;
    }

    function update() {
      const s = stateRef.current;
      if (s.gameState !== "playing") return;

      s.frame++;

      // Pacman movement (every 4 frames)
      if (s.frame % 4 === 0) {
        s.mouthOpen = !s.mouthOpen;

        // Try next direction first
        const [nx, ny] = moveDir(s.pacX, s.pacY, s.nextDir);
        if (canMove(nx, ny)) {
          s.pacDir = s.nextDir;
          s.pacX = nx;
          s.pacY = ny;
        } else {
          // Continue current direction
          const [cx, cy] = moveDir(s.pacX, s.pacY, s.pacDir);
          if (canMove(cx, cy)) {
            s.pacX = cx;
            s.pacY = cy;
          }
        }

        // Eat dot
        if (s.grid[s.pacY][s.pacX] === 2) {
          s.grid[s.pacY][s.pacX] = 0;
          s.score += 10;

          // Increase ghost speed as score goes up
          s.ghostSpeedBase = Math.max(3, 8 - Math.floor(s.score / 200));
        }
      }

      // Ghost movement (speed increases over time)
      if (s.frame % s.ghostSpeedBase === 0) {
        for (const g of s.ghosts) {
          moveGhost(g);
        }
      }

      // Collision with ghosts
      for (const g of s.ghosts) {
        if (g.x === s.pacX && g.y === s.pacY) {
          s.lives--;
          if (s.lives <= 0) {
            s.gameState = "dead";
            setGameState("dead");
            if (s.score > highScore) setHighScore(s.score);
            onGameOver(s.score);
          } else {
            // Respawn pacman
            s.pacX = 1;
            s.pacY = 1;
            s.pacDir = "right";
            s.nextDir = "right";
          }
          return;
        }
      }

      // All dots eaten — next level
      let dotsLeft = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (s.grid[r][c] === 2) dotsLeft++;
        }
      }
      if (dotsLeft === 0) {
        // Regenerate maze, keep score, increase difficulty
        s.grid = generateMaze();
        s.grid[1][1] = 0;
        s.grid[1][2] = 0;
        s.pacX = 1;
        s.pacY = 1;
        s.ghostSpeedBase = Math.max(2, s.ghostSpeedBase - 1);
        for (const g of s.ghosts) {
          g.x = COLS - 2;
          g.y = 1;
          if (s.grid[g.y] && s.grid[g.y][g.x] !== 1) s.grid[g.y][g.x] = 0;
        }
      }

      if (s.frame % 4 === 0) setDisplayScore(s.score);
    }

    function draw() {
      const s = stateRef.current;
      const isDark = document.documentElement.classList.contains("dark");

      ctx.fillStyle = isDark ? "#0a0a1a" : "#000";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw maze
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * TILE;
          const y = r * TILE;

          if (s.grid[r][c] === 1) {
            ctx.fillStyle = isDark ? "#1a237e" : "#1565c0";
            ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          } else if (s.grid[r][c] === 2) {
            ctx.fillStyle = "#ffcc80";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Pacman
      if (s.gameState !== "idle") {
        const px = s.pacX * TILE + TILE / 2;
        const py = s.pacY * TILE + TILE / 2;
        const r = TILE / 2 - 2;

        let startAngle = 0;
        if (s.pacDir === "right") startAngle = 0;
        else if (s.pacDir === "down") startAngle = Math.PI / 2;
        else if (s.pacDir === "left") startAngle = Math.PI;
        else startAngle = -Math.PI / 2;

        const mouth = s.mouthOpen ? 0.3 : 0.05;
        ctx.fillStyle = "#ffeb3b";
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, r, startAngle + mouth * Math.PI, startAngle - mouth * Math.PI + 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
      }

      // Ghosts
      for (const g of s.ghosts) {
        const gx = g.x * TILE + TILE / 2;
        const gy = g.y * TILE + TILE / 2;
        const r = TILE / 2 - 2;

        ctx.fillStyle = g.color;
        // Body
        ctx.beginPath();
        ctx.arc(gx, gy - 2, r, Math.PI, 0);
        ctx.lineTo(gx + r, gy + r);
        // Wavy bottom
        for (let i = 0; i < 3; i++) {
          const waveX = gx + r - (i + 1) * (r * 2 / 3);
          ctx.quadraticCurveTo(waveX + r / 3, gy + r - 4, waveX, gy + r);
        }
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(gx - 3, gy - 4, 3, 0, Math.PI * 2);
        ctx.arc(gx + 3, gy - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(gx - 2, gy - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // UI
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SKOR: ${s.score.toString().padStart(5, "0")}`, 8, CANVAS_H - 6);

      // Lives
      ctx.textAlign = "right";
      ctx.fillText("CAN: " + "❤️".repeat(Math.max(0, s.lives)), CANVAS_W - 8, CANVAS_H - 6);

      if (highScore > 0) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#aaa";
        ctx.font = "11px monospace";
        ctx.fillText(`HI ${highScore.toString().padStart(5, "0")}`, CANVAS_W / 2, CANVAS_H - 6);
      }

      // Overlays
      if (s.gameState === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PACMAN", CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = "#aaa";
        ctx.font = "14px monospace";
        ctx.fillText("baslamak icin SPACE veya dokun", CANVAS_W / 2, CANVAS_H / 2 + 14);
      }

      if (s.gameState === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ff5252";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 18px monospace";
        ctx.fillText(`SKOR: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillStyle = "#aaa";
        ctx.font = "13px monospace";
        ctx.fillText("tekrar icin SPACE", CANVAS_W / 2, CANVAS_H / 2 + 36);
      }
    }

    function gameLoop() {
      update();
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
        className="border border-border rounded-lg w-full max-w-[600px] cursor-pointer touch-none"
        onClick={() => {
          const s = stateRef.current;
          if (s.gameState === "idle" || s.gameState === "dead") resetGame();
        }}
      />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>ok tuslari / WASD : yon</span>
        <span>skor: {displayScore.toString().padStart(5, "0")}</span>
      </div>
    </div>
  );
}
