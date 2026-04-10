"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 600;
const CANVAS_H = 600;
const CENTER_X = CANVAS_W / 2;
const CENTER_Y = CANVAS_H / 2;
const WHEEL_RADIUS = 220; // resmin görsel yarıçapı
const MIN_GRAB_RADIUS = 40; // merkeze bu kadar yakınsa tutamaz
const MAX_GRAB_RADIUS = 260; // bu mesafenin dışı tutamaz
const GAME_DURATION = 60; // saniye

const FRICTION = 0.985; // her frame omega bu kadar azalır
const PEAK_OMEGA = 50; // ulaşılabilecek max omega cap (rad/s)

type Phase = "menu" | "playing" | "done";

type Float = {
  x: number;
  y: number;
  text: string;
  color: string;
  vy: number;
  life: number;
  size: number;
};

type Props = { onGameOver: (score: number) => void };

export default function TmlRuzgarGuluOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageLoadedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("menu");
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => v + 1), []);

  // Oyun state (refler)
  const rotationRef = useRef(0); // toplam radyan dönüş
  const omegaRef = useRef(0); // angular velocity rad/s
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(GAME_DURATION);
  const totalRotationsRef = useRef(0); // tam tur sayısı
  const peakOmegaRef = useRef(0);
  const lastRotationCheckRef = useRef(0);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);

  // Drag state
  const draggingRef = useRef(false);
  const dragLastXRef = useRef(0);
  const dragLastYRef = useRef(0);
  const dragLastTimeRef = useRef(0);
  const dragGrabAngleRef = useRef(0); // tutulduğunda kanadın global açısı
  const dragLastAngleRef = useRef(0);
  const dragSampleOmegaRef = useRef(0);

  // Visuals
  const floatsRef = useRef<Float[]>([]);
  const lastTimeRef = useRef(0);

  // Image load
  useEffect(() => {
    const img = new window.Image();
    img.src = "/oyun/tml-ruzgar-gulu.png";
    img.onload = () => {
      imageLoadedRef.current = true;
      imageRef.current = img;
      rerender();
    };
  }, [rerender]);

  // Start game
  const startGame = useCallback(() => {
    rotationRef.current = 0;
    omegaRef.current = 0;
    scoreRef.current = 0;
    timeLeftRef.current = GAME_DURATION;
    totalRotationsRef.current = 0;
    peakOmegaRef.current = 0;
    lastRotationCheckRef.current = 0;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    floatsRef.current = [];
    setPhase("playing");
  }, []);

  // ============ INPUT (drag) ============
  function getCanvasPos(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  function tryGrab(x: number, y: number) {
    const dx = x - CENTER_X;
    const dy = y - CENTER_Y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < MIN_GRAB_RADIUS || r > MAX_GRAB_RADIUS) return false;
    draggingRef.current = true;
    dragLastXRef.current = x;
    dragLastYRef.current = y;
    dragLastTimeRef.current = performance.now();
    dragLastAngleRef.current = Math.atan2(dy, dx);
    dragGrabAngleRef.current = dragLastAngleRef.current - rotationRef.current;
    dragSampleOmegaRef.current = 0;
    return true;
  }

  function dragMove(x: number, y: number) {
    if (!draggingRef.current) return;
    const dx = x - CENTER_X;
    const dy = y - CENTER_Y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < 10) return;

    const newAngle = Math.atan2(dy, dx);
    let dAngle = newAngle - dragLastAngleRef.current;
    // Normalize
    if (dAngle > Math.PI) dAngle -= Math.PI * 2;
    if (dAngle < -Math.PI) dAngle += Math.PI * 2;

    // Rotation'ı direkt çevir
    rotationRef.current += dAngle;

    const now = performance.now();
    const dt = (now - dragLastTimeRef.current) / 1000;
    if (dt > 0.001) {
      const instantOmega = dAngle / dt;
      // Sample omega'yı smooth tut
      dragSampleOmegaRef.current = dragSampleOmegaRef.current * 0.5 + instantOmega * 0.5;
    }

    dragLastXRef.current = x;
    dragLastYRef.current = y;
    dragLastTimeRef.current = now;
    dragLastAngleRef.current = newAngle;
  }

  function dragRelease() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // Bırakıldığında son sample omega'yı angular velocity'ye ekle
    let final = dragSampleOmegaRef.current;
    // Cap
    if (final > PEAK_OMEGA) final = PEAK_OMEGA;
    if (final < -PEAK_OMEGA) final = -PEAK_OMEGA;
    // Mevcut omega'ya ekle (tekrar çekme = combo)
    omegaRef.current = omegaRef.current * 0.4 + final * 0.85;

    // Combo kontrol: hızlıyken tekrar çekildiyse bonus
    if (Math.abs(final) > 8) {
      comboRef.current++;
      comboTimerRef.current = 2.5;
      if (comboRef.current >= 2) {
        const bonus = comboRef.current * 10;
        scoreRef.current += bonus;
        floatsRef.current.push({
          x: CENTER_X,
          y: CENTER_Y - 80,
          text: `COMBO x${comboRef.current} +${bonus}`,
          color: "#ff8800",
          vy: -1,
          life: 1.5,
          size: 18,
        });
      }
    } else {
      comboRef.current = 0;
    }
  }

  // Pointer events
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    const p = getCanvasPos(e.clientX, e.clientY);
    if (tryGrab(p.x, p.y)) {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    const p = getCanvasPos(e.clientX, e.clientY);
    dragMove(p.x, p.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    dragRelease();
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ============ GAME LOOP ============
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Süre
      timeLeftRef.current -= dt;
      if (timeLeftRef.current <= 0) {
        // Final bonus: peak hız bonusu
        const peakBonus = Math.floor(peakOmegaRef.current * 8);
        scoreRef.current += peakBonus;
        setPhase("done");
        onGameOver(scoreRef.current);
        return;
      }

      // Rotasyon (drag yoksa free spin)
      if (!draggingRef.current) {
        rotationRef.current += omegaRef.current * dt;
      }

      // Friction (omega cap'i içinde tut)
      omegaRef.current *= Math.pow(FRICTION, dt * 60);
      if (Math.abs(omegaRef.current) < 0.05) omegaRef.current = 0;

      // Peak omega tracking
      if (Math.abs(omegaRef.current) > peakOmegaRef.current) {
        peakOmegaRef.current = Math.abs(omegaRef.current);
      }

      // Tam tur kontrolü: her 2π'de +10 puan + bonus
      const fullTurns = Math.floor(Math.abs(rotationRef.current) / (Math.PI * 2));
      while (totalRotationsRef.current < fullTurns) {
        totalRotationsRef.current++;
        // Tur puanı: hıza göre artar
        const speedBonus = Math.floor(Math.abs(omegaRef.current) * 2);
        const turnPoints = 10 + speedBonus;
        scoreRef.current += turnPoints;
        // Float text
        floatsRef.current.push({
          x: CENTER_X,
          y: CENTER_Y + WHEEL_RADIUS + 30,
          text: `+${turnPoints}`,
          color: speedBonus > 30 ? "#ffd700" : "#5dd95d",
          vy: -1.5,
          life: 1,
          size: 16 + Math.min(20, speedBonus / 4),
        });
        // Milestone
        if (totalRotationsRef.current % 10 === 0) {
          floatsRef.current.push({
            x: CENTER_X,
            y: CENTER_Y - 100,
            text: `${totalRotationsRef.current} TUR!`,
            color: "#ffd700",
            vy: -1.2,
            life: 2,
            size: 28,
          });
        }
      }

      // Combo timer
      if (comboTimerRef.current > 0) {
        comboTimerRef.current -= dt;
        if (comboTimerRef.current <= 0) comboRef.current = 0;
      }

      // Float text update
      for (const f of floatsRef.current) {
        f.y += f.vy;
        f.life -= dt;
      }
      floatsRef.current = floatsRef.current.filter((f) => f.life > 0);

      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ============ DRAW ============
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // BG gradient (gökyüzü teması — rüzgar)
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#1a3050");
    grad.addColorStop(0.5, "#2a4070");
    grad.addColorStop(1, "#1a2540");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Bulut paterni (paralaks, yavaşça)
    const cloudPhase = (performance.now() / 50) % CANVAS_W;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 130 - cloudPhase) + CANVAS_W * 2) % (CANVAS_W + 200) - 100;
      const y = 60 + (i % 3) * 80;
      ctx.beginPath();
      ctx.ellipse(x, y, 50, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rüzgar çizgileri (omega'ya göre)
    if (Math.abs(omegaRef.current) > 5) {
      const lines = Math.min(20, Math.floor(Math.abs(omegaRef.current)));
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.4, Math.abs(omegaRef.current) / 30)})`;
      ctx.lineWidth = 2;
      const t = performance.now() / 100;
      for (let i = 0; i < lines; i++) {
        const phase = (i * 0.7 + t) % 1;
        const lx = phase * CANVAS_W;
        const ly = (i * 137) % CANVAS_H;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + 30, ly);
        ctx.stroke();
      }
    }

    // Tutma alanı göstergesi (sadece idle/menu)
    if (!draggingRef.current && Math.abs(omegaRef.current) < 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, MAX_GRAB_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Rüzgar gülü (image)
    if (imageLoadedRef.current && imageRef.current) {
      const img = imageRef.current;
      ctx.save();
      ctx.translate(CENTER_X, CENTER_Y);
      ctx.rotate(rotationRef.current);
      // Motion blur efekti yüksek hızda
      const blur = Math.min(0.5, Math.abs(omegaRef.current) / 60);
      if (blur > 0.05) {
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i - 1) * blur * 0.4);
          ctx.drawImage(img, -WHEEL_RADIUS, -WHEEL_RADIUS, WHEEL_RADIUS * 2, WHEEL_RADIUS * 2);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(img, -WHEEL_RADIUS, -WHEEL_RADIUS, WHEEL_RADIUS * 2, WHEEL_RADIUS * 2);
      ctx.restore();
    } else {
      // Fallback: basit rüzgar gülü çizimi
      ctx.save();
      ctx.translate(CENTER_X, CENTER_Y);
      ctx.rotate(rotationRef.current);
      ctx.fillStyle = "#daa520";
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i / 6) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(80, -40, WHEEL_RADIUS, 0);
        ctx.quadraticCurveTo(80, 40, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#8a4a0a";
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Merkez topuz (üstüne)
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Float texts
    for (const f of floatsRef.current) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 4;
      ctx.font = `bold ${f.size}px monospace`;
      ctx.textAlign = "center";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    // ===== HUD =====
    // Üst skor barı
    const grad2 = ctx.createLinearGradient(0, 0, 0, 50);
    grad2.addColorStop(0, "rgba(0,0,0,0.85)");
    grad2.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, CANVAS_W, 50);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "left";
    ctx.fillText(scoreRef.current.toString().padStart(6, "0"), 12, 30);
    ctx.fillStyle = "#888";
    ctx.font = "9px monospace";
    ctx.fillText("SKOR", 12, 42);

    // Tur sayısı
    ctx.fillStyle = "#daa520";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`🌀 ${totalRotationsRef.current} tur`, CANVAS_W / 2, 25);

    // Süre
    ctx.fillStyle = timeLeftRef.current < 10 ? "#ff5555" : "#5dd95d";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.ceil(timeLeftRef.current)}s`, CANVAS_W - 12, 28);

    // RPM göstergesi (alt)
    const rpm = Math.round((Math.abs(omegaRef.current) * 60) / (2 * Math.PI));
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(10, CANVAS_H - 50, 160, 40);
    ctx.strokeStyle = rpm > 100 ? "#ff5555" : rpm > 50 ? "#daa520" : "#5dd95d";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, CANVAS_H - 50, 160, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("HIZ", 18, CANVAS_H - 35);
    ctx.fillStyle = rpm > 100 ? "#ff5555" : rpm > 50 ? "#daa520" : "#5dd95d";
    ctx.font = "bold 22px monospace";
    ctx.fillText(`${rpm}`, 18, CANVAS_H - 16);
    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText("rpm", 75, CANVAS_H - 16);

    // Combo göstergesi (sağ alt)
    if (comboRef.current >= 2) {
      ctx.fillStyle = "rgba(255,136,0,0.85)";
      ctx.fillRect(CANVAS_W - 110, CANVAS_H - 50, 100, 40);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`🔥 x${comboRef.current}`, CANVAS_W - 60, CANVAS_H - 22);
    }

    // İlk yardım metni (henüz dönmüyorsa ve drag yoksa)
    if (!draggingRef.current && Math.abs(omegaRef.current) < 0.5 && totalRotationsRef.current === 0) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(CANVAS_W / 2 - 180, CANVAS_H - 110, 360, 36);
      ctx.strokeStyle = "#daa520";
      ctx.lineWidth = 1;
      ctx.strokeRect(CANVAS_W / 2 - 180, CANVAS_H - 110, 360, 36);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("rüzgar gülünü tut, hızla çevir!", CANVAS_W / 2, CANVAS_H - 88);
    }
  }

  // Render
  if (phase === "menu") {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">🌀</div>
          <h2 className="text-lg font-bold mb-2">tml rüzgar gülü</h2>
          <p className="text-xs text-muted-foreground mb-4">
            rüzgar gülünü tut ve döndür! ne kadar hızlı çevirirsen o kadar puan.
            tam turlar puan kazandırır, hızlı turlar bonus verir. dönerken tekrar çekersen
            COMBO başlar. süre 60 saniye.
          </p>
          <button
            onClick={startGame}
            className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
          >
            başla
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-yellow-500/50 rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-5xl mb-2">🌀</div>
          <h2 className="text-lg font-bold mb-2 text-yellow-500">süre bitti!</h2>
          <p className="text-xs text-muted-foreground mb-1">
            toplam dönüş: <b className="text-primary">{totalRotationsRef.current}</b>
          </p>
          <p className="text-xs text-muted-foreground mb-1">
            max hız: <b className="text-primary">
              {Math.round((peakOmegaRef.current * 60) / (2 * Math.PI))} rpm
            </b>
          </p>
          <p className="text-2xl font-bold text-primary my-3">{scoreRef.current}</p>
          <button
            onClick={startGame}
            className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
          >
            tekrar
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
        className="border border-border rounded max-w-full cursor-grab active:cursor-grabbing select-none"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "none" }}
      />
      <div className="mt-2 text-[10px] text-muted-foreground">
        rüzgar gülünü tut, çevir → bırak → döner. tekrar çek = combo
      </div>
    </div>
  );
}
