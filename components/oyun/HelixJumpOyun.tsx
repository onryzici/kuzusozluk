"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 400;
const CANVAS_H = 600;
const TOWER_X = CANVAS_W / 2;
const TOWER_RADIUS = 110;
const RING_HEIGHT = 16;
const RING_SPACING = 95;
const SECTORS = 8; // bir halkadaki sektör sayısı
const GRAVITY = 1500;
const BOUNCE_VEL = -650;

// Sector type: "normal" | "kill" | "gap"
type SectorType = "normal" | "kill" | "gap";

type Ring = {
  worldY: number;
  sectors: SectorType[];
  passed: boolean;
};

type Props = { onGameOver: (score: number) => void };

export default function HelixJumpOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => v + 1), []);

  const ballRef = useRef({ y: 100, vy: 0, screenY: 0 });
  const rotationRef = useRef(0); // tower rotation in radians
  const ringsRef = useRef<Ring[]>([]);
  const cameraYRef = useRef(0);
  const scoreRef = useRef(0);
  const ringsPassedRef = useRef(0);
  const comboRef = useRef(0);
  const dragRef = useRef<{ active: boolean; startX: number; startRot: number }>({ active: false, startX: 0, startRot: 0 });
  const lastTimeRef = useRef(0);

  function generateRing(worldY: number, level: number): Ring {
    const sectors: SectorType[] = [];
    // Boşluk sayısı (1-2)
    const gapCount = Math.random() < 0.5 ? 2 : 1;
    const killCount = Math.min(SECTORS - gapCount - 2, Math.floor(level / 4) + 1);
    const indices = Array.from({ length: SECTORS }, (_, i) => i);
    // Shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const gaps = new Set(indices.slice(0, gapCount));
    const kills = new Set(indices.slice(gapCount, gapCount + killCount));
    for (let i = 0; i < SECTORS; i++) {
      if (gaps.has(i)) sectors.push("gap");
      else if (kills.has(i)) sectors.push("kill");
      else sectors.push("normal");
    }
    return { worldY, sectors, passed: false };
  }

  const startGame = useCallback(() => {
    ballRef.current = { y: 100, vy: 0, screenY: 0 };
    rotationRef.current = 0;
    ringsRef.current = [];
    cameraYRef.current = 0;
    scoreRef.current = 0;
    ringsPassedRef.current = 0;
    comboRef.current = 0;
    // İlk halkalar — boş başla, sonra üret
    let y = 200;
    while (y < 2000) {
      ringsRef.current.push(generateRing(y, 0));
      y += RING_SPACING;
    }
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.025, (now - lastTimeRef.current) / 1000);
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
    const b = ballRef.current;
    b.vy += GRAVITY * dt;
    const oldY = b.y;
    b.y += b.vy * dt;

    // Top dünya x'i = 0 (her zaman merkezden, kule döner). Dolayısıyla
    // hangi sektörün üstünde olduğunu rotasyondan hesaplarız.
    // Top "0 derece"de, kule rotation ile döner. Top'un altında olan sektör:
    const topAngle = (-rotationRef.current + Math.PI * 2) % (Math.PI * 2);
    const sectorIdx = Math.floor((topAngle / (Math.PI * 2)) * SECTORS) % SECTORS;

    // Halkalarla çarpışma
    for (const r of ringsRef.current) {
      const ringTop = r.worldY;
      // Top yukarıdan aşağıya geçiyor mu?
      if (oldY < ringTop && b.y >= ringTop) {
        const sector = r.sectors[sectorIdx];
        if (sector === "gap") {
          // Geç — combo arttır
          if (!r.passed) {
            r.passed = true;
            ringsPassedRef.current++;
            comboRef.current++;
            const points = 10 + comboRef.current * 2;
            scoreRef.current += points;
          }
        } else if (sector === "kill") {
          // Öldür
          setRunning(false);
          onGameOver(scoreRef.current);
          return;
        } else {
          // Normal — zıpla
          b.y = ringTop;
          b.vy = BOUNCE_VEL;
          comboRef.current = 0;
          if (!r.passed) {
            r.passed = true;
            scoreRef.current += 5;
          }
          break;
        }
      }
    }

    // Kamera takibi (top sürekli ekranın orta üstünde)
    const targetCam = b.y - 200;
    cameraYRef.current += (targetCam - cameraYRef.current) * Math.min(1, dt * 5);

    // Ekrandan çıkmış halkaları temizle, üste yenilerini ekle
    const visibleBottom = cameraYRef.current + CANVAS_H + 100;
    ringsRef.current = ringsRef.current.filter((r) => r.worldY < visibleBottom);

    let bottomY = 0;
    if (ringsRef.current.length > 0) {
      bottomY = Math.max(...ringsRef.current.map((r) => r.worldY));
    }
    while (bottomY < cameraYRef.current + CANVAS_H + 500) {
      bottomY += RING_SPACING;
      const lvl = Math.floor(scoreRef.current / 50);
      ringsRef.current.push(generateRing(bottomY, lvl));
    }
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // BG gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#1a0a2a");
    grad.addColorStop(1, "#0a0816");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Tower core (orta sütun)
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(TOWER_X - 6, 0, 12, CANVAS_H);

    // Halkalar
    for (const r of ringsRef.current) {
      const sy = r.worldY - cameraYRef.current;
      if (sy < -50 || sy > CANVAS_H + 50) continue;
      drawRing(ctx, sy, r.sectors);
    }

    // Top
    const sy = ballRef.current.y - cameraYRef.current;
    // Gölge
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(TOWER_X, sy + 18, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ball
    ctx.fillStyle = "#5dd95d";
    ctx.beginPath();
    ctx.arc(TOWER_X, sy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(TOWER_X - 3, sy - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, CANVAS_W, 36);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SKOR ${scoreRef.current}`, 12, 25);
    ctx.fillStyle = "#5dd95d";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`halka ${ringsPassedRef.current}`, CANVAS_W - 12, 25);

    if (comboRef.current >= 2) {
      ctx.fillStyle = "#ff8800";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`🔥 x${comboRef.current}`, CANVAS_W / 2, 25);
    }
  }

  function drawRing(ctx: CanvasRenderingContext2D, sy: number, sectors: SectorType[]) {
    // Halka olarak bir elips çiz, ama sektör sektör çiz (perspective gibi).
    // Basit yaklaşım: tepede yatay daire (elips), her sektör arc.
    const cx = TOWER_X;
    const cy = sy;
    const rx = TOWER_RADIUS;
    const ry = TOWER_RADIUS * 0.32;

    for (let i = 0; i < SECTORS; i++) {
      const sectorType = sectors[i];
      // Sektörün dünyadaki açı aralığı:
      const a1 = (i / SECTORS) * Math.PI * 2 + rotationRef.current - Math.PI / 2;
      const a2 = ((i + 1) / SECTORS) * Math.PI * 2 + rotationRef.current - Math.PI / 2;

      if (sectorType === "gap") continue; // Boşluk

      let color = "#7a5aaa";
      if (sectorType === "kill") color = "#dd3333";

      ctx.fillStyle = color;
      ctx.beginPath();
      // Üst arc
      for (let t = 0; t <= 1; t += 0.05) {
        const a = a1 + (a2 - a1) * t;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // Alt arc (height kalınlığında)
      for (let t = 1; t >= 0; t -= 0.05) {
        const a = a1 + (a2 - a1) * t;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry + RING_HEIGHT;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Üst kenar parlak
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        const a = a1 + (a2 - a1) * t;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Drag → rotate
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { active: true, startX: e.clientX, startRot: rotationRef.current };
  }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    rotationRef.current = dragRef.current.startRot + (dx / 100) * Math.PI;
  }, []);
  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  // Klavye desteği — A/D ile döndür
  useEffect(() => {
    if (!running) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") rotationRef.current -= 0.25;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") rotationRef.current += 0.25;
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [running]);

  if (!running) {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">🌀</div>
          <h2 className="text-lg font-bold mb-2">helix jump</h2>
          <p className="text-xs text-muted-foreground mb-4">
            top aşağıya düşer. fareyle/parmağınla sürükleyerek kuleyi döndür.
            mor halkalar zıplatır, kırmızı bölgeler öldürür, boşluklardan geç. ne kadar derine?
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="border border-border rounded max-w-full cursor-grab active:cursor-grabbing"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "none" }}
      />
      <div className="mt-2 text-[10px] text-muted-foreground">sürükle: döndür · A/D klavye</div>
    </div>
  );
}
