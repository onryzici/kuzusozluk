"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const COLS = 10;
const ROWS = 20;
const TILE = 28;
const BOARD_W = COLS * TILE;
const BOARD_H = ROWS * TILE;
const NEXT_SIZE = 4;
const CANVAS_W = BOARD_W + 130; // extra for side panel
const CANVAS_H = BOARD_H;

type GameState = "idle" | "playing" | "dead";

// Tetromino shapes (row, col offsets from pivot)
const PIECES = [
  { shape: [[0,0],[0,1],[1,0],[1,1]], color: "#ffeb3b" },       // O
  { shape: [[0,0],[0,1],[0,2],[0,3]], color: "#00bcd4" },       // I
  { shape: [[0,0],[1,0],[1,1],[1,2]], color: "#ff9800" },       // L
  { shape: [[0,2],[1,0],[1,1],[1,2]], color: "#2196f3" },       // J
  { shape: [[0,0],[0,1],[1,1],[1,2]], color: "#4caf50" },       // S
  { shape: [[0,1],[0,2],[1,0],[1,1]], color: "#f44336" },       // Z
  { shape: [[0,1],[1,0],[1,1],[1,2]], color: "#9c27b0" },       // T
];

type Piece = { shape: number[][]; color: string; row: number; col: number };

function randomPiece(): Piece {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return { shape: p.shape.map(s => [...s]), color: p.color, row: 0, col: 3 };
}

function rotateCW(shape: number[][]): number[][] {
  const maxR = Math.max(...shape.map(s => s[0]));
  return shape.map(([r, c]) => [c, maxR - r]);
}

type Props = { onGameOver: (score: number) => void };

export default function TetrisOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [highScore, setHighScore] = useState(0);
  const animRef = useRef<number>(0);

  const sRef = useRef({
    gameState: "idle" as GameState,
    board: [] as (string | null)[][],
    current: null as Piece | null,
    next: null as Piece | null,
    score: 0,
    lines: 0,
    level: 1,
    dropTimer: 0,
    lastTime: 0,
    dropInterval: 0.8, // seconds per drop
    lockTimer: 0,
    inputCooldown: { left: 0, right: 0, down: 0 },
  });

  function emptyBoard(): (string | null)[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function collides(board: (string | null)[][], shape: number[][], row: number, col: number): boolean {
    for (const [sr, sc] of shape) {
      const r = row + sr, c = col + sc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      if (board[r][c]) return true;
    }
    return false;
  }

  function lockPiece() {
    const s = sRef.current;
    if (!s.current) return;
    for (const [sr, sc] of s.current.shape) {
      const r = s.current.row + sr, c = s.current.col + sc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        s.board[r][c] = s.current.color;
      }
    }

    // Clear lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (s.board[r].every(cell => cell !== null)) {
        s.board.splice(r, 1);
        s.board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // recheck this row
      }
    }

    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      s.score += (points[cleared] || 800) * s.level;
      s.lines += cleared;
      s.level = Math.floor(s.lines / 10) + 1;
      s.dropInterval = Math.max(0.05, 0.8 - (s.level - 1) * 0.07);
    }

    // Next piece
    s.current = s.next;
    s.next = randomPiece();

    // Game over check
    if (s.current && collides(s.board, s.current.shape, s.current.row, s.current.col)) {
      s.gameState = "dead";
      setGameState("dead");
      if (s.score > highScore) setHighScore(s.score);
      onGameOver(s.score);
    }
  }

  const resetGame = useCallback(() => {
    const s = sRef.current;
    s.board = emptyBoard();
    s.current = randomPiece();
    s.next = randomPiece();
    s.score = 0; s.lines = 0; s.level = 1;
    s.dropTimer = 0; s.lastTime = 0;
    s.dropInterval = 0.8; s.lockTimer = 0;
    s.inputCooldown = { left: 0, right: 0, down: 0 };
    s.gameState = "playing";
    setGameState("playing");
    setDisplayScore(0);
  }, []);

  // Keyboard
  useEffect(() => {
    const keysDown = new Set<string>();

    const handleDown = (e: KeyboardEvent) => {
      const s = sRef.current;
      if (e.code === "Space" && (s.gameState === "idle" || s.gameState === "dead")) {
        e.preventDefault(); resetGame(); return;
      }
      if (s.gameState !== "playing" || !s.current) return;

      keysDown.add(e.code);

      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "KeyX") {
        e.preventDefault();
        // Rotate
        const rotated = rotateCW(s.current.shape);
        if (!collides(s.board, rotated, s.current.row, s.current.col)) {
          s.current.shape = rotated;
        } else if (!collides(s.board, rotated, s.current.row, s.current.col - 1)) {
          s.current.shape = rotated; s.current.col -= 1; // wall kick left
        } else if (!collides(s.board, rotated, s.current.row, s.current.col + 1)) {
          s.current.shape = rotated; s.current.col += 1; // wall kick right
        }
      }

      if (e.code === "Space") {
        e.preventDefault();
        // Hard drop
        while (!collides(s.board, s.current.shape, s.current.row + 1, s.current.col)) {
          s.current.row++;
          s.score += 2;
        }
        lockPiece();
        s.dropTimer = 0;
      }
    };

    const handleUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => { window.removeEventListener("keydown", handleDown); window.removeEventListener("keyup", handleUp); };
  }, [resetGame, highScore, onGameOver]);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sx = 0, sy = 0, moved = false;

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const s = sRef.current;
      if (s.gameState === "idle" || s.gameState === "dead") { resetGame(); return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false;
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const s = sRef.current;
      if (s.gameState !== "playing" || !s.current) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;

      if (!moved && Math.abs(dx) > 30) {
        moved = true;
        const dir = dx > 0 ? 1 : -1;
        if (!collides(s.board, s.current.shape, s.current.row, s.current.col + dir)) {
          s.current.col += dir;
        }
        sx = e.touches[0].clientX;
      }

      if (!moved && dy > 40) {
        moved = true;
        // Soft drop
        if (!collides(s.board, s.current.shape, s.current.row + 1, s.current.col)) {
          s.current.row++;
          s.score += 1;
        }
        sy = e.touches[0].clientY;
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (!moved) {
        // Tap = rotate
        const s = sRef.current;
        if (s.gameState === "playing" && s.current) {
          const rotated = rotateCW(s.current.shape);
          if (!collides(s.board, rotated, s.current.row, s.current.col)) {
            s.current.shape = rotated;
          } else if (!collides(s.board, rotated, s.current.row, s.current.col - 1)) {
            s.current.shape = rotated; s.current.col -= 1;
          } else if (!collides(s.board, rotated, s.current.row, s.current.col + 1)) {
            s.current.shape = rotated; s.current.col += 1;
          }
        }
      }
    };

    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [resetGame]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function tick(dt: number) {
      const s = sRef.current;
      if (s.gameState !== "playing" || !s.current) return;

      // Held keys for movement
      const keys = new Set<string>();
      // DAS (Delayed Auto Shift) handled via cooldown
      for (const dir of ["left", "right", "down"] as const) {
        if (s.inputCooldown[dir] > 0) s.inputCooldown[dir] -= dt;
      }

      // Auto drop
      s.dropTimer += dt;
      if (s.dropTimer >= s.dropInterval) {
        s.dropTimer -= s.dropInterval;
        if (!collides(s.board, s.current.shape, s.current.row + 1, s.current.col)) {
          s.current.row++;
        } else {
          lockPiece();
        }
      }

      setDisplayScore(s.score);
    }

    // Separate key repeat handler
    const heldKeys = new Set<string>();
    const repeatTimers: Record<string, number> = {};

    function handleKeyRepeat(dt: number) {
      const s = sRef.current;
      if (s.gameState !== "playing" || !s.current) return;

      for (const [code, dir, dc, dr] of [
        ["ArrowLeft", "left", -1, 0],
        ["KeyA", "left", -1, 0],
        ["ArrowRight", "right", 1, 0],
        ["KeyD", "right", 1, 0],
        ["ArrowDown", "down", 0, 1],
        ["KeyS", "down", 0, 1],
      ] as const) {
        if (heldKeys.has(code)) {
          if (!repeatTimers[code]) repeatTimers[code] = 0;
          repeatTimers[code] += dt;

          // Initial move at 0, then repeat after 0.17s, then every 0.05s
          const threshold = repeatTimers[code] < 0.2 ? 0.17 : 0.05;

          if (repeatTimers[code] >= threshold) {
            repeatTimers[code] = 0;
            const nc = s.current.col + (dc as number);
            const nr = s.current.row + (dr as number);
            if (!collides(s.board, s.current.shape, nr, nc)) {
              s.current.col = nc;
              s.current.row = nr;
              if (dr === 1) s.score += 1;
            }
          }
        } else {
          delete repeatTimers[code];
        }
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const s = sRef.current;
      if (s.gameState !== "playing" || !s.current) return;

      if (!heldKeys.has(e.code)) {
        heldKeys.add(e.code);
        // Immediate first move
        if ((e.code === "ArrowLeft" || e.code === "KeyA") && !collides(s.board, s.current.shape, s.current.row, s.current.col - 1)) {
          e.preventDefault(); s.current.col--;
        }
        if ((e.code === "ArrowRight" || e.code === "KeyD") && !collides(s.board, s.current.shape, s.current.row, s.current.col + 1)) {
          e.preventDefault(); s.current.col++;
        }
        if ((e.code === "ArrowDown" || e.code === "KeyS") && !collides(s.board, s.current.shape, s.current.row + 1, s.current.col)) {
          e.preventDefault(); s.current.row++; s.score += 1;
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { heldKeys.delete(e.code); };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function drawBlock(x: number, y: number, color: string, size: number) {
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x + 1, y + 1, size - 2, 3);
      ctx.fillRect(x + 1, y + 1, 3, size - 2);
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(x + 1, y + size - 4, size - 2, 3);
      ctx.fillRect(x + size - 4, y + 1, 3, size - 2);
    }

    function draw() {
      const s = sRef.current;
      const isDark = document.documentElement.classList.contains("dark");

      ctx.fillStyle = isDark ? "#0a0a1a" : "#111";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Board background
      ctx.fillStyle = isDark ? "#111122" : "#0a0a1a";
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);

      // Grid lines
      ctx.strokeStyle = isDark ? "#1a1a2e" : "#1a1a2e";
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(BOARD_W, r * TILE); ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, BOARD_H); ctx.stroke();
      }

      // Locked blocks
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (s.board[r][c]) {
            drawBlock(c * TILE, r * TILE, s.board[r][c]!, TILE);
          }
        }
      }

      // Ghost piece
      if (s.current && s.gameState === "playing") {
        let ghostRow = s.current.row;
        while (!collides(s.board, s.current.shape, ghostRow + 1, s.current.col)) ghostRow++;
        if (ghostRow !== s.current.row) {
          ctx.globalAlpha = 0.2;
          for (const [sr, sc] of s.current.shape) {
            drawBlock((s.current.col + sc) * TILE, (ghostRow + sr) * TILE, s.current.color, TILE);
          }
          ctx.globalAlpha = 1;
        }

        // Current piece
        for (const [sr, sc] of s.current.shape) {
          const r = s.current.row + sr, c = s.current.col + sc;
          if (r >= 0) drawBlock(c * TILE, r * TILE, s.current.color, TILE);
        }
      }

      // Side panel
      const panelX = BOARD_W + 10;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";

      ctx.fillText("SKOR", panelX, 20);
      ctx.fillStyle = "#ffeb3b";
      ctx.font = "bold 14px monospace";
      ctx.fillText(s.score.toString().padStart(6, "0"), panelX, 38);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.fillText("SEVIYE", panelX, 65);
      ctx.fillStyle = "#4caf50";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`${s.level}`, panelX, 83);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.fillText("SATIR", panelX, 110);
      ctx.fillStyle = "#00bcd4";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`${s.lines}`, panelX, 128);

      // Next piece
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.fillText("SIRADAKI", panelX, 165);

      if (s.next) {
        const previewTile = 16;
        const previewX = panelX + 5;
        const previewY = 175;
        // Draw next piece preview box
        ctx.fillStyle = isDark ? "#111122" : "#0a0a1a";
        ctx.fillRect(previewX - 2, previewY - 2, NEXT_SIZE * previewTile + 4, NEXT_SIZE * previewTile + 4);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(previewX - 2, previewY - 2, NEXT_SIZE * previewTile + 4, NEXT_SIZE * previewTile + 4);

        for (const [sr, sc] of s.next.shape) {
          drawBlock(previewX + sc * previewTile, previewY + sr * previewTile, s.next.color, previewTile);
        }
      }

      // High score
      if (highScore > 0) {
        ctx.fillStyle = "#888";
        ctx.font = "10px monospace";
        ctx.fillText(`HI ${highScore.toString().padStart(6, "0")}`, panelX, CANVAS_H - 10);
      }

      // Overlays
      if (s.gameState === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(0, 0, BOARD_W, BOARD_H);
        ctx.fillStyle = "#00bcd4";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("TETRIS", BOARD_W / 2, BOARD_H / 2 - 35);
        ctx.fillStyle = "#ccc";
        ctx.font = "11px monospace";
        ctx.fillText("← → : saga sola", BOARD_W / 2, BOARD_H / 2 - 6);
        ctx.fillText("↑ : dondur", BOARD_W / 2, BOARD_H / 2 + 12);
        ctx.fillText("↓ : hizli indır", BOARD_W / 2, BOARD_H / 2 + 30);
        ctx.fillText("SPACE : dusur", BOARD_W / 2, BOARD_H / 2 + 48);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px monospace";
        ctx.fillText("SPACE ile basla", BOARD_W / 2, BOARD_H / 2 + 78);
      }

      if (s.gameState === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(0, 0, BOARD_W, BOARD_H);
        ctx.fillStyle = "#f44336";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", BOARD_W / 2, BOARD_H / 2 - 25);
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 18px monospace";
        ctx.fillText(`SKOR: ${s.score}`, BOARD_W / 2, BOARD_H / 2 + 5);
        ctx.fillStyle = "#00bcd4";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`${s.lines} satir | seviye ${s.level}`, BOARD_W / 2, BOARD_H / 2 + 28);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px monospace";
        ctx.fillText("tekrar icin SPACE", BOARD_W / 2, BOARD_H / 2 + 55);
      }
    }

    function loop(time: number) {
      const s = sRef.current;
      if (s.lastTime === 0) s.lastTime = time;
      const dt = Math.min((time - s.lastTime) / 1000, 0.05);
      s.lastTime = time;

      tick(dt);
      handleKeyRepeat(dt);
      draw();
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [highScore, onGameOver]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-border rounded-lg w-full max-w-[410px] cursor-pointer touch-none"
        onClick={() => {
          const s = sRef.current;
          if (s.gameState === "idle" || s.gameState === "dead") resetGame();
        }}
      />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>← → ↓ : hareket</span>
        <span>↑ : dondur</span>
        <span>SPACE : dusur</span>
      </div>
    </div>
  );
}
