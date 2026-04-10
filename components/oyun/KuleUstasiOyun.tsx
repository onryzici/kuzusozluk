"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 480;
const CANVAS_H = 600;
const BLOCK_HEIGHT = 24;
const VISIBLE_BLOCKS = 12;

type Block = {
  x: number;
  width: number;
  hue: number;
};

type Props = { onGameOver: (score: number) => void };

export default function KuleUstasiOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => v + 1), []);

  const stackRef = useRef<Block[]>([]);
  const movingRef = useRef<{ x: number; width: number; vx: number; hue: number } | null>(null);
  const scoreRef = useRef(0);
  const perfectChainRef = useRef(0);
  const cameraYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const floatsRef = useRef<{ x: number; y: number; text: string; color: string; life: number }[]>([]);
  const shakeRef = useRef(0);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    perfectChainRef.current = 0;
    cameraYRef.current = 0;
    floatsRef.current = [];
    // Başlangıç bloku
    const baseW = 180;
    stackRef.current = [{ x: (CANVAS_W - baseW) / 2, width: baseW, hue: 200 }];
    spawnMovingBlock();
    setRunning(true);
  }, []);

  function spawnMovingBlock() {
    const top = stackRef.current[stackRef.current.length - 1];
    const speed = 220 + stackRef.current.length * 8;
    const dir = Math.random() < 0.5 ? 1 : -1;
    movingRef.current = {
      x: dir > 0 ? -top.width : CANVAS_W,
      width: top.width,
      vx: speed * dir * -1, // hareket yönü ekrana doğru
      hue: (top.hue + 25) % 360,
    };
  }

  const dropBlock = useCallback(() => {
    const moving = movingRef.current;
    if (!moving) return;
    const top = stackRef.current[stackRef.current.length - 1];

    // Üst üste binen kısım
    const left = Math.max(moving.x, top.x);
    const right = Math.min(moving.x + moving.width, top.x + top.width);
    const overlap = right - left;

    if (overlap <= 0) {
      // Iska, oyun biter
      shakeRef.current = 0.8;
      setRunning(false);
      onGameOver(scoreRef.current);
      return;
    }

    const centerDiff = Math.abs(moving.x + moving.width / 2 - (top.x + top.width / 2));
    const isPerfect = centerDiff < 4;

    let newBlock: Block;
    if (isPerfect) {
      // Perfect — boyutu koru, hatta bonusla biraz büyüt
      perfectChainRef.current++;
      const grow = perfectChainRef.current >= 5 ? 8 : 0;
      const newW = Math.min(top.width + grow, top.width + 16);
      newBlock = { x: top.x - (newW - top.width) / 2, width: newW, hue: moving.hue };
      const points = 100 + perfectChainRef.current * 20;
      scoreRef.current += points;
      floatsRef.current.push({
        x: newBlock.x + newBlock.width / 2,
        y: CANVAS_H - (stackRef.current.length + 1) * BLOCK_HEIGHT + cameraYRef.current,
        text: perfectChainRef.current >= 3 ? `PERFECT x${perfectChainRef.current}!` : "PERFECT!",
        color: "#5dd95d",
        life: 1.5,
      });
    } else {
      perfectChainRef.current = 0;
      newBlock = { x: left, width: overlap, hue: moving.hue };
      scoreRef.current += 30;
    }

    stackRef.current.push(newBlock);

    // Kamera kaydır (yukarı)
    if (stackRef.current.length > VISIBLE_BLOCKS) {
      cameraYRef.current = (stackRef.current.length - VISIBLE_BLOCKS) * BLOCK_HEIGHT;
    }

    // Çok ince blok kaldıysa biter
    if (newBlock.width < 14) {
      shakeRef.current = 0.8;
      setRunning(false);
      onGameOver(scoreRef.current);
      return;
    }

    spawnMovingBlock();
  }, [onGameOver]);

  // Loop
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const m = movingRef.current;
      if (m) {
        m.x += m.vx * dt;
        // Kenarlardan dön
        if (m.x < -m.width + 20) {
          m.x = -m.width + 20;
          m.vx = Math.abs(m.vx);
        } else if (m.x > CANVAS_W - 20) {
          m.x = CANVAS_W - 20;
          m.vx = -Math.abs(m.vx);
        }
      }

      // Float texts
      for (const f of floatsRef.current) {
        f.y -= 30 * dt;
        f.life -= dt;
      }
      floatsRef.current = floatsRef.current.filter((f) => f.life > 0);

      if (shakeRef.current > 0) shakeRef.current -= dt;

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

    const sx = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 12 : 0;
    const sy = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 12 : 0;

    // BG gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#1a1532");
    grad.addColorStop(1, "#0a0816");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Yıldızlar
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 40; i++) {
      const x = (i * 71) % CANVAS_W;
      const y = (i * 137) % CANVAS_H;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    ctx.save();
    ctx.translate(sx, sy);

    // Stack
    for (let i = 0; i < stackRef.current.length; i++) {
      const b = stackRef.current[i];
      const y = CANVAS_H - (i + 1) * BLOCK_HEIGHT + cameraYRef.current;
      if (y < -BLOCK_HEIGHT || y > CANVAS_H) continue;
      ctx.fillStyle = `hsl(${b.hue}, 70%, 55%)`;
      ctx.fillRect(b.x, y, b.width, BLOCK_HEIGHT - 2);
      // Üst kenar
      ctx.fillStyle = `hsl(${b.hue}, 70%, 65%)`;
      ctx.fillRect(b.x, y, b.width, 4);
      // Alt kenar
      ctx.fillStyle = `hsl(${b.hue}, 70%, 40%)`;
      ctx.fillRect(b.x, y + BLOCK_HEIGHT - 6, b.width, 4);
    }

    // Hareketli blok
    const m = movingRef.current;
    if (m) {
      const y = CANVAS_H - (stackRef.current.length + 1) * BLOCK_HEIGHT + cameraYRef.current;
      ctx.fillStyle = `hsl(${m.hue}, 80%, 60%)`;
      ctx.fillRect(m.x, y, m.width, BLOCK_HEIGHT - 2);
      ctx.fillStyle = `hsl(${m.hue}, 80%, 70%)`;
      ctx.fillRect(m.x, y, m.width, 4);
      // Üst blokla hizalama göstergesi
      const top = stackRef.current[stackRef.current.length - 1];
      const center = top.x + top.width / 2;
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(center, 0);
      ctx.lineTo(center, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Float texts
    for (const f of floatsRef.current) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, CANVAS_W, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SKOR ${scoreRef.current}`, 12, 26);
    ctx.fillStyle = "#5dd95d";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`KULE ${stackRef.current.length}`, CANVAS_W - 12, 26);

    if (perfectChainRef.current >= 2) {
      ctx.fillStyle = "#ffaa00";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`🔥 perfect x${perfectChainRef.current}`, CANVAS_W / 2, 26);
    }
  }

  // Input
  const handleAction = useCallback(() => {
    if (running) dropBlock();
  }, [running, dropBlock]);

  useEffect(() => {
    if (!running) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [running, handleAction]);

  if (!running) {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">🧱</div>
          <h2 className="text-lg font-bold mb-2">kule ustası</h2>
          <p className="text-xs text-muted-foreground mb-4">
            yukarıdan kayan blokları tam üst üste bindirmek için tıkla. dışarda kalan kısım kesilir,
            sonraki blok küçülür. tam hizada koyarsan PERFECT chain başlar — 5+ üst üste blokları
            büyütür. blok çok küçülürse oyun biter.
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
        onClick={handleAction}
        onTouchStart={(e) => {
          e.preventDefault();
          handleAction();
        }}
        className="border border-border rounded max-w-full cursor-pointer"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "manipulation" }}
      />
      <div className="mt-2 text-[10px] text-muted-foreground">tıkla / boşluk: blok bırak</div>
    </div>
  );
}
