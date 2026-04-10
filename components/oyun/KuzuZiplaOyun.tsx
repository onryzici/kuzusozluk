"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 400;
const CANVAS_H = 600;
const GRAVITY = 1100;
const JUMP_VEL = -560;
const SPRING_VEL = -900;
const PLAYER_W = 36;
const PLAYER_H = 36;

type PlatformType = "normal" | "moving" | "spring" | "break" | "fake";

type Platform = {
  x: number;
  y: number;
  width: number;
  type: PlatformType;
  vx?: number;
  broken?: boolean;
};

type Props = { onGameOver: (score: number) => void };

export default function KuzuZiplaOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => v + 1), []);

  const playerRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H - 100, vx: 0, vy: 0, facing: 1 });
  const platformsRef = useRef<Platform[]>([]);
  const cameraYRef = useRef(0);
  const maxHeightRef = useRef(0);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const inputRef = useRef({ left: false, right: false });
  const lastTimeRef = useRef(0);

  const startGame = useCallback(() => {
    playerRef.current = { x: CANVAS_W / 2, y: CANVAS_H - 100, vx: 0, vy: 0, facing: 1 };
    platformsRef.current = [
      // Başlangıç platformu (geniş)
      { x: CANVAS_W / 2 - 60, y: CANVAS_H - 60, width: 120, type: "normal" },
    ];
    // Üstüne biraz platform yerleştir
    let y = CANVAS_H - 60;
    while (y > -200) {
      y -= 70 + Math.random() * 30;
      addPlatform(y);
    }
    cameraYRef.current = 0;
    maxHeightRef.current = 0;
    scoreRef.current = 0;
    gameOverRef.current = false;
    setRunning(true);
  }, []);

  function addPlatform(y: number) {
    const score = scoreRef.current;
    const x = 30 + Math.random() * (CANVAS_W - 130);
    const width = Math.max(50, 80 - Math.floor(score / 200));
    const r = Math.random();
    let type: PlatformType = "normal";
    let vx: number | undefined = undefined;
    if (score > 50 && r < 0.18) {
      type = "moving";
      vx = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 50 + score * 0.1);
    } else if (score > 80 && r < 0.25) {
      type = "spring";
    } else if (score > 120 && r < 0.4) {
      type = "break";
    } else if (score > 200 && r < 0.45) {
      type = "fake";
    }
    platformsRef.current.push({ x, y, width, type, vx });
  }

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function update(dt: number) {
    const p = playerRef.current;

    // Yatay hareket
    let ax = 0;
    if (inputRef.current.left) ax -= 700;
    if (inputRef.current.right) ax += 700;
    p.vx += ax * dt;
    p.vx *= 0.92;
    if (Math.abs(p.vx) > 350) p.vx = Math.sign(p.vx) * 350;
    if (p.vx > 5) p.facing = 1;
    if (p.vx < -5) p.facing = -1;

    // Yerçekimi
    p.vy += GRAVITY * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Yatay wrap
    if (p.x < -PLAYER_W / 2) p.x = CANVAS_W + PLAYER_W / 2;
    if (p.x > CANVAS_W + PLAYER_W / 2) p.x = -PLAYER_W / 2;

    // Platformları update et + çarpışma
    for (const pl of platformsRef.current) {
      if (pl.type === "moving" && pl.vx !== undefined) {
        pl.x += pl.vx * dt;
        if (pl.x < 0) {
          pl.x = 0;
          pl.vx = -pl.vx;
        }
        if (pl.x + pl.width > CANVAS_W) {
          pl.x = CANVAS_W - pl.width;
          pl.vx = -pl.vx;
        }
      }
      // Çarpışma sadece düşerken (vy > 0)
      if (p.vy > 0 && !pl.broken) {
        const px1 = p.x - PLAYER_W / 2;
        const px2 = p.x + PLAYER_W / 2;
        const py = p.y + PLAYER_H / 2;
        const platTop = pl.y;
        if (
          py > platTop &&
          py < platTop + 10 &&
          px2 > pl.x &&
          px1 < pl.x + pl.width
        ) {
          // Çarpışma
          if (pl.type === "fake") {
            // Sahte platform — kırılır, geçer
            pl.broken = true;
          } else if (pl.type === "spring") {
            p.vy = SPRING_VEL;
          } else if (pl.type === "break") {
            p.vy = JUMP_VEL;
            pl.broken = true;
          } else {
            p.vy = JUMP_VEL;
          }
        }
      }
    }

    // Kamera takibi: oyuncu üst yarıda kalırsa dünyayı aşağı kaydır
    const targetCamY = -p.y + CANVAS_H / 2;
    if (targetCamY > cameraYRef.current) {
      const diff = targetCamY - cameraYRef.current;
      cameraYRef.current += diff;
      // Yükseklik kazandık
      maxHeightRef.current += diff;
      scoreRef.current = Math.floor(maxHeightRef.current / 10);
    }

    // Ekrandan çıkan platformları temizle, üste yenilerini ekle
    const visibleTop = -cameraYRef.current - 100;
    platformsRef.current = platformsRef.current.filter((pl) => pl.y < -cameraYRef.current + CANVAS_H + 50);

    let topY = visibleTop;
    if (platformsRef.current.length > 0) {
      topY = Math.min(...platformsRef.current.map((pl) => pl.y));
    }
    while (topY > visibleTop) {
      topY -= 60 + Math.random() * 40 - Math.min(15, scoreRef.current / 100);
      addPlatform(topY);
    }

    // Düşme = ölüm
    if (p.y > -cameraYRef.current + CANVAS_H + 50) {
      gameOverRef.current = true;
      setRunning(false);
      onGameOver(scoreRef.current);
    }
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // BG gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#0a1530");
    grad.addColorStop(1, "#1a2850");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Yıldızlar (paralaks)
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 30; i++) {
      const x = (i * 79) % CANVAS_W;
      const y = ((i * 137 + cameraYRef.current * 0.2) % CANVAS_H + CANVAS_H) % CANVAS_H;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Platforms
    for (const pl of platformsRef.current) {
      if (pl.broken && pl.type !== "break") continue;
      const sy = pl.y + cameraYRef.current;
      if (sy < -20 || sy > CANVAS_H + 20) continue;
      let color = "#5dd95d";
      if (pl.type === "moving") color = "#5b9eff";
      else if (pl.type === "spring") color = "#ffd700";
      else if (pl.type === "break") color = pl.broken ? "rgba(160,80,80,0.4)" : "#aa6644";
      else if (pl.type === "fake") color = "#888";
      ctx.fillStyle = color;
      ctx.fillRect(pl.x, sy, pl.width, 8);
      // Üst kenar parlak
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(pl.x, sy, pl.width, 2);

      // Spring üzerinde yay göstergesi
      if (pl.type === "spring") {
        ctx.fillStyle = "#fff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⇡", pl.x + pl.width / 2, sy - 2);
      }
    }

    // Oyuncu — kuzu
    const px = playerRef.current.x;
    const py = playerRef.current.y + cameraYRef.current;
    drawKuzuPlayer(ctx, px, py, playerRef.current.facing);

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CANVAS_W, 32);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SKOR ${scoreRef.current}`, 10, 22);
    ctx.fillStyle = "#5dd95d";
    ctx.textAlign = "right";
    ctx.fillText(`yükseklik`, CANVAS_W - 10, 22);
  }

  function drawKuzuPlayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, facing: number) {
    // Gölge
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bacaklar
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(cx - 8, cy + 8, 4, 10);
    ctx.fillRect(cx + 4, cy + 8, 4, 10);

    // Vücut (yünlü)
    ctx.fillStyle = "#fafafa";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Yün topakları
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * 14, cy + Math.sin(ang) * 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Kafa
    const hx = cx + facing * 10;
    ctx.fillStyle = "#f5e6d8";
    ctx.beginPath();
    ctx.arc(hx, cy - 4, 8, 0, Math.PI * 2);
    ctx.fill();

    // Kıvırcık tepelik
    ctx.fillStyle = "#fafafa";
    ctx.beginPath();
    ctx.arc(hx - 2, cy - 11, 4, 0, Math.PI * 2);
    ctx.arc(hx + 2, cy - 12, 4, 0, Math.PI * 2);
    ctx.fill();

    // Kulak
    ctx.fillStyle = "#f5e6d8";
    ctx.beginPath();
    ctx.ellipse(hx + facing * 6, cy - 4, 3, 5, facing * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Göz
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(hx + facing * 3, cy - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Input
  useEffect(() => {
    if (!running) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [running]);

  // Touch — ekranın sol/sağ yarısı
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (t.clientX - rect.left < rect.width / 2) inputRef.current.left = true;
    else inputRef.current.right = true;
  }, []);
  const handleTouchEnd = useCallback(() => {
    inputRef.current.left = false;
    inputRef.current.right = false;
  }, []);

  if (!running) {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">🐑⬆️</div>
          <h2 className="text-lg font-bold mb-2">kuzu zıpla</h2>
          <p className="text-xs text-muted-foreground mb-4">
            kuzu otomatik zıplar, sen sağ-sol hareket ettir. yeşil normal, mavi hareketli,
            sarı yay, kahve kırılır, gri sahte. kenarlardan wrap. düşersen biter.
            ne kadar yüksek?
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="border border-border rounded max-w-full"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "none" }}
      />
      <div className="mt-2 text-[10px] text-muted-foreground">oklar/wasd: sağ-sol · mobilde ekranın yarısına bas</div>
    </div>
  );
}
