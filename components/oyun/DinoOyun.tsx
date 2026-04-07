"use client";

import { useRef, useEffect, useState, useCallback } from "react";

type ObstacleType = "kaktus-kucuk" | "kaktus-buyuk" | "kaktus-ikili" | "kus";
type Obstacle = { x: number; width: number; height: number; type: ObstacleType };

const GROUND_Y = 200;
const SPRITE_W = 44;
const SPRITE_H = 48;
const DINO_X = 50;
const GRAVITY = 0.6;
const JUMP_FORCE = -11;
const INITIAL_SPEED = 4;
const MAX_SPEED = 12;
const CANVAS_W = 700;
const CANVAS_H = 250;

const KAKTUS_TYPES: ObstacleType[] = ["kaktus-kucuk", "kaktus-buyuk", "kaktus-ikili"];

type GameState = "idle" | "playing" | "dead";

type Props = {
  onGameOver: (score: number) => void;
};

// Preload images
function loadImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

export default function DinoOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Load all sprites once
  useEffect(() => {
    const srcs: Record<string, string> = {
      "dino-kosma-1": "/oyun/dino-kosma-1.png",
      "dino-kosma-2": "/oyun/dino-kosma-2.png",
      "dino-ziplama": "/oyun/dino-ziplama.png",
      "dino-egilme-1": "/oyun/dino-egilme-1.png",
      "dino-egilme-2": "/oyun/dino-egilme-2.png",
      "dino-olu": "/oyun/dino-olu.png",
      "kaktus-kucuk": "/oyun/kaktus-kucuk.png",
      "kaktus-buyuk": "/oyun/kaktus-buyuk.png",
      "kaktus-ikili": "/oyun/kaktus-ikili.png",
    };

    let loaded = 0;
    const total = Object.keys(srcs).length;

    for (const [key, src] of Object.entries(srcs)) {
      const img = loadImage(src);
      img.onload = () => {
        loaded++;
        if (loaded >= total) setImagesLoaded(true);
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= total) setImagesLoaded(true);
      };
      imagesRef.current[key] = img;
    }
  }, []);

  const stateRef = useRef<{
    gameState: GameState;
    dinoY: number;
    velY: number;
    obstacles: Obstacle[];
    score: number;
    speed: number;
    frame: number;
    groundOffset: number;
    isDucking: boolean;
  }>({
    gameState: "idle",
    dinoY: GROUND_Y - SPRITE_H,
    velY: 0,
    obstacles: [],
    score: 0,
    speed: INITIAL_SPEED,
    frame: 0,
    groundOffset: 0,
    isDucking: false,
  });

  const [displayScore, setDisplayScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [highScore, setHighScore] = useState(0);
  const animRef = useRef<number>(0);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.dinoY = GROUND_Y - SPRITE_H;
    s.velY = 0;
    s.obstacles = [];
    s.score = 0;
    s.speed = INITIAL_SPEED;
    s.frame = 0;
    s.groundOffset = 0;
    s.isDucking = false;
    s.gameState = "playing";
    setGameState("playing");
    setDisplayScore(0);
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === "idle" || s.gameState === "dead") {
      resetGame();
      return;
    }
    if (s.dinoY >= GROUND_Y - SPRITE_H - 1) {
      s.velY = JUMP_FORCE;
    }
  }, [resetGame]);

  const setDuck = useCallback((ducking: boolean) => {
    stateRef.current.isDucking = ducking;
  }, []);

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        setDuck(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") {
        setDuck(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [jump, setDuck]);

  // Touch handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      jump();
    };
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    return () => canvas.removeEventListener("touchstart", handleTouch);
  }, [jump]);

  // Game loop
  useEffect(() => {
    if (!imagesLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const imgs = imagesRef.current;

    function spawnObstacle() {
      const s = stateRef.current;
      const isKus = Math.random() > 0.8;
      if (isKus) {
        s.obstacles.push({ x: CANVAS_W + 20, width: 30, height: 24, type: "kus" });
      } else {
        const type = KAKTUS_TYPES[Math.floor(Math.random() * KAKTUS_TYPES.length)];
        s.obstacles.push({ x: CANVAS_W + 20, width: SPRITE_W, height: SPRITE_H, type });
      }
    }

    function update() {
      const s = stateRef.current;
      if (s.gameState !== "playing") return;

      s.frame++;
      s.score = Math.floor(s.frame / 6);
      s.speed = Math.min(MAX_SPEED, INITIAL_SPEED + s.score * 0.005);
      s.groundOffset = (s.groundOffset + s.speed) % 20;

      // Dino physics
      s.velY += GRAVITY;
      s.dinoY += s.velY;
      if (s.dinoY >= GROUND_Y - SPRITE_H) {
        s.dinoY = GROUND_Y - SPRITE_H;
        s.velY = 0;
      }

      // Spawn obstacles
      const lastObs = s.obstacles[s.obstacles.length - 1];
      const minGap = 200 / (s.speed / INITIAL_SPEED);
      if (!lastObs || lastObs.x < CANVAS_W - (minGap + Math.random() * 200)) {
        spawnObstacle();
      }

      // Collision
      const dinoH = s.isDucking ? SPRITE_H * 0.6 : SPRITE_H;
      const dinoTop = s.isDucking ? GROUND_Y - dinoH : s.dinoY;

      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        s.obstacles[i].x -= s.speed;
        if (s.obstacles[i].x < -60) {
          s.obstacles.splice(i, 1);
          continue;
        }

        const o = s.obstacles[i];
        let obsTop: number, obsBottom: number, obsLeft: number, obsRight: number;

        if (o.type === "kus") {
          obsTop = GROUND_Y - 60;
          obsBottom = GROUND_Y - 60 + o.height;
          obsLeft = o.x;
          obsRight = o.x + o.width;
        } else {
          obsTop = GROUND_Y - SPRITE_H;
          obsBottom = GROUND_Y;
          obsLeft = o.x;
          obsRight = o.x + SPRITE_W;
        }

        // AABB collision with padding
        if (
          DINO_X + SPRITE_W - 10 > obsLeft + 6 &&
          DINO_X + 10 < obsRight - 6 &&
          dinoTop + dinoH - 6 > obsTop + 6 &&
          dinoTop + 6 < obsBottom - 6
        ) {
          s.gameState = "dead";
          setGameState("dead");
          if (s.score > highScore) setHighScore(s.score);
          onGameOver(s.score);
          return;
        }
      }

      if (s.frame % 6 === 0) setDisplayScore(s.score);
    }

    function draw() {
      const s = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const isDark = document.documentElement.classList.contains("dark");

      // Background
      if (isDark) {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        // Stars
        ctx.fillStyle = "#ffffff40";
        for (let i = 0; i < 20; i++) {
          const sx = (i * 37 + s.groundOffset * 0.2) % CANVAS_W;
          const sy = (i * 13) % (GROUND_Y - 40);
          ctx.fillRect(sx, sy, 2, 2);
        }
      } else {
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Clouds
      ctx.fillStyle = isDark ? "#333355" : "#e0e0e0";
      const cloudX1 = (300 - s.groundOffset * 0.3 + CANVAS_W) % CANVAS_W;
      const cloudX2 = (550 - s.groundOffset * 0.2 + CANVAS_W) % CANVAS_W;
      drawCloud(ctx, cloudX1, 40);
      drawCloud(ctx, cloudX2, 70);

      // Ground
      ctx.fillStyle = isDark ? "#444466" : "#999";
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 1);
      ctx.fillStyle = isDark ? "#333355" : "#ccc";
      for (let x = -s.groundOffset; x < CANVAS_W; x += 20) {
        ctx.fillRect(x, GROUND_Y + 4, 8, 1);
        ctx.fillRect(x + 12, GROUND_Y + 8, 5, 1);
      }

      // Dino sprite
      let dinoSprite: string;
      if (s.gameState === "dead") {
        dinoSprite = "dino-olu";
      } else if (s.dinoY < GROUND_Y - SPRITE_H - 1) {
        dinoSprite = "dino-ziplama";
      } else if (s.isDucking) {
        dinoSprite = Math.floor(s.frame / 6) % 2 === 0 ? "dino-egilme-1" : "dino-egilme-2";
      } else {
        dinoSprite = Math.floor(s.frame / 6) % 2 === 0 ? "dino-kosma-1" : "dino-kosma-2";
      }

      const dinoImg = imgs[dinoSprite];
      if (dinoImg && dinoImg.complete && dinoImg.naturalWidth > 0) {
        const drawH = s.isDucking ? SPRITE_H : SPRITE_H;
        const drawY = s.isDucking ? GROUND_Y - SPRITE_H : s.dinoY;
        ctx.drawImage(dinoImg, DINO_X, drawY, SPRITE_W, drawH);
      }

      // Obstacles
      for (const o of s.obstacles) {
        if (o.type === "kus") {
          // Kuş — dummy rectangles (aynı kalsın dedin)
          const birdY = GROUND_Y - 60;
          ctx.fillStyle = isDark ? "#b39ddb" : "#795548";
          ctx.fillRect(o.x, birdY, o.width, 10);
          const wingUp = Math.floor(s.frame / 6) % 2 === 0;
          ctx.fillRect(o.x + 6, birdY + (wingUp ? -8 : 8), 16, 6);
          ctx.fillStyle = isDark ? "#ffcc80" : "#ff8f00";
          ctx.fillRect(o.x + o.width, birdY + 2, 6, 4);
        } else {
          // Kaktüs sprite
          const kaktusImg = imgs[o.type];
          if (kaktusImg && kaktusImg.complete && kaktusImg.naturalWidth > 0) {
            ctx.drawImage(kaktusImg, o.x, GROUND_Y - SPRITE_H, SPRITE_W, SPRITE_H);
          }
        }
      }

      // Score
      ctx.fillStyle = isDark ? "#ccc" : "#555";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${s.score.toString().padStart(5, "0")}`, CANVAS_W - 16, 24);
      if (highScore > 0) {
        ctx.fillStyle = isDark ? "#888" : "#aaa";
        ctx.font = "11px monospace";
        ctx.fillText(`HI ${highScore.toString().padStart(5, "0")}`, CANVAS_W - 80, 24);
      }

      // Overlays
      if (s.gameState === "idle") {
        ctx.fillStyle = isDark ? "#aaa" : "#666";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("baslamak icin SPACE veya dokun", CANVAS_W / 2, GROUND_Y / 2);
      }

      if (s.gameState === "dead") {
        ctx.fillStyle = isDark ? "#ff6b6b" : "#d32f2f";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_W / 2, GROUND_Y / 2 - 10);
        ctx.fillStyle = isDark ? "#aaa" : "#666";
        ctx.font = "13px monospace";
        ctx.fillText("tekrar denemek icin SPACE", CANVAS_W / 2, GROUND_Y / 2 + 16);
      }
    }

    function gameLoop() {
      update();
      draw();
      animRef.current = requestAnimationFrame(gameLoop);
    }

    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [imagesLoaded, highScore, onGameOver]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-border rounded-lg w-full max-w-[700px] cursor-pointer touch-none"
        style={{ imageRendering: "pixelated" }}
        onClick={jump}
      />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>SPACE / ↑ : zıpla</span>
        <span>↓ : eğil</span>
        <span>skor: {displayScore.toString().padStart(5, "0")}</span>
      </div>
    </div>
  );
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.arc(x + 16, y - 4, 14, 0, Math.PI * 2);
  ctx.arc(x + 32, y, 10, 0, Math.PI * 2);
  ctx.fill();
}
