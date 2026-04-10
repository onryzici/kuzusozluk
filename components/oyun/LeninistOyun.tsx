"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 500;
const CANVAS_H = 700;
const WHEEL_X = CANVAS_W / 2;
const WHEEL_Y = 280;
const WHEEL_RADIUS = 200;
const KNIFE_LENGTH = 80;
const KNIFE_WIDTH = 8;
const COLLISION_ARC = 0.18; // radyan — saplı bıçaklar arası min mesafe
const FLY_SPEED = 1700; // bıçak fırlatma hızı px/s

// Hedef bölgeler — wheel'a bağlı açılar (radyan), her biri puan verir
type TargetZone = {
  angle: number; // 0 = en sağ, π/2 = aşağı (canvas standardı)
  radius: number; // wheel merkezinden mesafe
  size: number; // tolerans (radyan)
  points: number;
  label: string;
  color: string;
};

// Leninist karakteri spread-eagle pozda, eller-ayaklar tutumlanmış (hedef bölgeler)
// 0 açısı yukarı (canvas standardı için -π/2), saat yönünde
// Karakter wheel ile birlikte döner, bölgeler de
const TARGET_ZONES: TargetZone[] = [
  // Kafa (üst, kızıl yıldız)
  { angle: -Math.PI / 2, radius: 130, size: 0.18, points: 50, label: "+50", color: "#ff3333" },
  // Sağ el
  { angle: -Math.PI / 4 - 0.1, radius: 165, size: 0.14, points: 30, label: "+30", color: "#ffaa00" },
  // Sol el
  { angle: -3 * Math.PI / 4 + 0.1, radius: 165, size: 0.14, points: 30, label: "+30", color: "#ffaa00" },
  // Sağ ayak
  { angle: Math.PI / 3, radius: 165, size: 0.14, points: 25, label: "+25", color: "#ffaa00" },
  // Sol ayak
  { angle: 2 * Math.PI / 3, radius: 165, size: 0.14, points: 25, label: "+25", color: "#ffaa00" },
];

type Phase = "menu" | "playing" | "gameover";

type StuckKnife = {
  angle: number; // wheel space açısı (rotation çıkarılmış)
  bonus: boolean;
};

type Float = { x: number; y: number; text: string; color: string; vy: number; life: number; size: number };

type Props = { onGameOver: (score: number) => void };

export default function LeninistOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => v + 1), []);

  // Oyun state
  const wheelRotRef = useRef(0);
  const wheelOmegaRef = useRef(1.5); // rad/s
  const wheelDirRef = useRef(1); // 1 veya -1
  const stuckKnivesRef = useRef<StuckKnife[]>([]);
  const flyingKnifeRef = useRef<{ y: number; thrown: number } | null>(null);
  const knivesLeftRef = useRef(0);
  const knivesNeededRef = useRef(0);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const floatsRef = useRef<Float[]>([]);
  const shakeRef = useRef(0);
  const flashRef = useRef(0);
  const lastTimeRef = useRef(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);

  // ============ LEVEL BAŞLAT ============
  const setupLevel = useCallback((lvl: number) => {
    const knivesNeeded = 4 + Math.floor(lvl * 0.8);
    const startKnives = Math.min(8, Math.floor(lvl / 2));
    knivesNeededRef.current = knivesNeeded;
    knivesLeftRef.current = knivesNeeded;

    // Wheel hızı leveller arttıkça artar
    wheelOmegaRef.current = 1.3 + lvl * 0.18;
    // Yön değişimi lvl 4'ten sonra
    wheelDirRef.current = lvl >= 4 && Math.random() < 0.5 ? -1 : 1;

    // Başlangıç saplı bıçakları (gittikçe daha çok)
    stuckKnivesRef.current = [];
    for (let i = 0; i < startKnives; i++) {
      // Hedef bölgelerden uzak yerlere yerleştir
      let attempts = 0;
      while (attempts < 50) {
        const angle = Math.random() * Math.PI * 2;
        const tooCloseToZone = TARGET_ZONES.some((z) => {
          let d = Math.abs(angle - z.angle);
          if (d > Math.PI) d = Math.PI * 2 - d;
          return d < z.size + 0.05;
        });
        const tooCloseToOther = stuckKnivesRef.current.some((k) => {
          let d = Math.abs(angle - k.angle);
          if (d > Math.PI) d = Math.PI * 2 - d;
          return d < COLLISION_ARC * 1.2;
        });
        if (!tooCloseToZone && !tooCloseToOther) {
          stuckKnivesRef.current.push({ angle, bonus: false });
          break;
        }
        attempts++;
      }
    }

    flyingKnifeRef.current = null;
  }, []);

  // ============ START GAME ============
  const startGame = useCallback(() => {
    levelRef.current = 1;
    scoreRef.current = 0;
    comboRef.current = 0;
    floatsRef.current = [];
    particlesRef.current = [];
    flashRef.current = 0;
    setupLevel(1);
    setPhase("playing");
  }, [setupLevel]);

  // ============ BIÇAK FIRLAT ============
  const throwKnife = useCallback(() => {
    if (phase !== "playing") return;
    if (flyingKnifeRef.current) return;
    if (knivesLeftRef.current <= 0) return;
    flyingKnifeRef.current = { y: CANVAS_H - 60, thrown: performance.now() };
  }, [phase]);

  // ============ END GAME / GAME OVER ============
  const endGame = useCallback(() => {
    setPhase("gameover");
    onGameOver(scoreRef.current);
  }, [onGameOver]);

  // ============ BIÇAK SAPLAN / ÇARPIŞMA ============
  function attemptStick() {
    // Bıçak tepe noktası wheel'a değdiğinde alttan saplanır
    // Saplandığı dünya açısı: -π/2 (yukarı yönlü)
    // Wheel space'te açı = worldAngle - wheelRotation
    const worldAngle = Math.PI / 2; // canvas y-axis aşağı, bıçak alttan tepe vurur => wheel'in alt noktası
    const wheelAngle = ((worldAngle - wheelRotRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    // Mevcut bıçaklara çarpışma kontrolü
    for (const k of stuckKnivesRef.current) {
      let d = Math.abs(wheelAngle - k.angle);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < COLLISION_ARC) {
        // Çarptı! Game over
        shakeRef.current = 1;
        comboRef.current = 0;
        // Particles
        for (let i = 0; i < 30; i++) {
          particlesRef.current.push({
            x: WHEEL_X,
            y: WHEEL_Y + WHEEL_RADIUS,
            vx: (Math.random() - 0.5) * 6,
            vy: -2 - Math.random() * 4,
            color: "#aa3333",
            life: 1.5,
          });
        }
        floatsRef.current.push({
          x: CANVAS_W / 2,
          y: CANVAS_H / 2,
          text: "BIÇAĞA ÇARPTI!",
          color: "#ff3333",
          vy: -1,
          life: 2,
          size: 28,
        });
        flyingKnifeRef.current = null;
        endGame();
        return;
      }
    }

    // Hedef bölgeye isabet?
    let hitZone: TargetZone | null = null;
    for (const z of TARGET_ZONES) {
      let d = Math.abs(wheelAngle - z.angle);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < z.size) {
        hitZone = z;
        break;
      }
    }

    // Sapla
    stuckKnivesRef.current.push({ angle: wheelAngle, bonus: hitZone !== null });

    // Puan
    let points = 10; // base
    if (hitZone) {
      points = hitZone.points;
      comboRef.current++;
      shakeRef.current = 0.4;
      flashRef.current = 0.3;
      // Particles
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({
          x: WHEEL_X,
          y: WHEEL_Y + WHEEL_RADIUS,
          vx: (Math.random() - 0.5) * 4,
          vy: -2 - Math.random() * 3,
          color: hitZone.color,
          life: 1.2,
        });
      }
    }

    // Combo bonus
    let comboBonus = 0;
    if (comboRef.current >= 3) comboBonus = comboRef.current * 5;
    points += comboBonus;

    scoreRef.current += points;

    floatsRef.current.push({
      x: WHEEL_X,
      y: WHEEL_Y + WHEEL_RADIUS - 20,
      text: hitZone ? `${hitZone.label}${comboBonus > 0 ? ` (+${comboBonus})` : ""}` : `+${points}`,
      color: hitZone ? hitZone.color : "#fff",
      vy: -1.5,
      life: 1.2,
      size: hitZone ? 22 : 16,
    });

    flyingKnifeRef.current = null;
    knivesLeftRef.current--;

    // Level tamamlandı mı?
    if (knivesLeftRef.current === 0) {
      // Level bonus
      const lvlBonus = levelRef.current * 50;
      scoreRef.current += lvlBonus;
      floatsRef.current.push({
        x: CANVAS_W / 2,
        y: 100,
        text: `LEVEL ${levelRef.current} TAMAM! +${lvlBonus}`,
        color: "#5dd95d",
        vy: -1.2,
        life: 2.5,
        size: 22,
      });
      // Sonraki levele kısa gecikme
      setTimeout(() => {
        if (phase === "playing") {
          levelRef.current++;
          setupLevel(levelRef.current);
        }
      }, 1500);
    }
  }

  // ============ GAME LOOP ============
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Wheel döner
      wheelRotRef.current += wheelOmegaRef.current * wheelDirRef.current * dt;

      // Flying knife
      const fk = flyingKnifeRef.current;
      if (fk) {
        fk.y -= FLY_SPEED * dt;
        // Wheel'a değdi mi? Bıçak tepe noktası wheel alt çevresine değiyor
        const knifeTipY = fk.y;
        const wheelBottomY = WHEEL_Y + WHEEL_RADIUS;
        if (knifeTipY <= wheelBottomY) {
          attemptStick();
        }
      }

      // Float texts
      for (const f of floatsRef.current) {
        f.y += f.vy;
        f.life -= dt;
      }
      floatsRef.current = floatsRef.current.filter((f) => f.life > 0);

      // Particles
      for (const p of particlesRef.current) {
        p.vy += 18 * dt;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
      }
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // Decay
      if (shakeRef.current > 0) shakeRef.current -= dt;
      if (flashRef.current > 0) flashRef.current -= dt * 1.5;

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

    const sx = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 12 : 0;
    const sy = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 12 : 0;

    // BG
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#3a1010");
    grad.addColorStop(0.5, "#2a0a0a");
    grad.addColorStop(1, "#1a0606");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Yıldızlar / kıvılcımlar
    ctx.fillStyle = "rgba(255,200,100,0.15)";
    for (let i = 0; i < 30; i++) {
      const x = (i * 71) % CANVAS_W;
      const y = (i * 137) % CANVAS_H;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    ctx.save();
    ctx.translate(sx, sy);

    // Wheel arka plan disk
    drawWheel(ctx);

    // Saplı bıçaklar (wheel ile döner)
    for (const k of stuckKnivesRef.current) {
      drawStuckKnife(ctx, k);
    }

    // Hedef bölge işaretleri
    drawTargetZones(ctx);

    // Leninist karakteri (wheel ile döner)
    drawLeninist(ctx);

    // Flying knife
    if (flyingKnifeRef.current) {
      drawFlyingKnife(ctx, flyingKnifeRef.current.y);
    }

    // Bıçak fırlatıcı (alt — bekleme)
    drawThrowerKnife(ctx);

    // Particles
    for (const p of particlesRef.current) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

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

    ctx.restore();

    // Flash
    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(255,200,100,${flashRef.current * 0.3})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // HUD
    drawHUD(ctx);
  }

  function drawWheel(ctx: CanvasRenderingContext2D) {
    // Disk gölge
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.arc(WHEEL_X + 4, WHEEL_Y + 6, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Disk arka — kahverengi/tahta
    const grad = ctx.createRadialGradient(WHEEL_X - 30, WHEEL_Y - 30, 20, WHEEL_X, WHEEL_Y, WHEEL_RADIUS);
    grad.addColorStop(0, "#b88a4e");
    grad.addColorStop(0.7, "#8a5f2e");
    grad.addColorStop(1, "#5a3a16");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(WHEEL_X, WHEEL_Y, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Tahta damarları (rotation ile döner)
    ctx.save();
    ctx.translate(WHEEL_X, WHEEL_Y);
    ctx.rotate(wheelRotRef.current);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
      ctx.lineTo(Math.cos(a) * WHEEL_RADIUS, Math.sin(a) * WHEEL_RADIUS);
      ctx.stroke();
    }
    ctx.restore();

    // Çevre ring
    ctx.strokeStyle = "#3a2008";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(WHEEL_X, WHEEL_Y, WHEEL_RADIUS - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#daa520";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(WHEEL_X, WHEEL_Y, WHEEL_RADIUS - 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawTargetZones(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(WHEEL_X, WHEEL_Y);
    ctx.rotate(wheelRotRef.current);
    for (const z of TARGET_ZONES) {
      const cx = Math.cos(z.angle) * z.radius;
      const cy = Math.sin(z.angle) * z.radius;
      // Pulse
      const pulse = (Math.sin(performance.now() / 250) + 1) / 2;
      // Halka
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4 + pulse * 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.stroke();
      // İç dolgu
      ctx.fillStyle = z.color;
      ctx.globalAlpha = 0.15 + pulse * 0.15;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawLeninist(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(WHEEL_X, WHEEL_Y);
    ctx.rotate(wheelRotRef.current);

    // ===== Vücut: spread-eagle stick figure pozu =====
    // Boyun + omurga
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.lineTo(0, 30);
    ctx.stroke();

    // Sol kol
    ctx.beginPath();
    ctx.moveTo(0, -75);
    ctx.lineTo(-90, -50);
    ctx.lineTo(-150, -65);
    ctx.stroke();

    // Sağ kol
    ctx.beginPath();
    ctx.moveTo(0, -75);
    ctx.lineTo(90, -50);
    ctx.lineTo(150, -65);
    ctx.stroke();

    // Sol bacak
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(-65, 110);
    ctx.lineTo(-95, 165);
    ctx.stroke();

    // Sağ bacak
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(65, 110);
    ctx.lineTo(95, 165);
    ctx.stroke();

    // ===== Kazak / kıyafet (mor hardigan) =====
    ctx.fillStyle = "#6a4a8a";
    ctx.beginPath();
    ctx.moveTo(-30, -78);
    ctx.lineTo(30, -78);
    ctx.lineTo(40, 38);
    ctx.lineTo(-40, 38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hardigan ön açıklık çizgisi
    ctx.strokeStyle = "#3a2050";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.lineTo(0, 38);
    ctx.stroke();

    // Yaka (V şeklinde, beyaz tişört arkadan)
    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    ctx.moveTo(-10, -78);
    ctx.lineTo(10, -78);
    ctx.lineTo(0, -62);
    ctx.closePath();
    ctx.fill();

    // Düğmeler (mor üstüne küçük)
    ctx.fillStyle = "#3a2050";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-6, -50 + i * 28, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pantolon (kot mavi) — vücudun alt yarısı
    ctx.strokeStyle = "#3a5a8a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.lineTo(-65, 110);
    ctx.lineTo(-95, 165);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.lineTo(65, 110);
    ctx.lineTo(95, 165);
    ctx.stroke();

    // Eller (ten rengi)
    ctx.fillStyle = "#f0c8a8";
    ctx.beginPath();
    ctx.arc(-150, -65, 8, 0, Math.PI * 2);
    ctx.arc(150, -65, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ayakkabı (siyah converse benzeri)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(-95, 168, 16, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(95, 168, 16, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Tabanlık (beyaz şerit)
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-95, 172, 14, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(95, 172, 14, 0, Math.PI);
    ctx.stroke();

    // ===== Kafa =====
    ctx.fillStyle = "#f0c8a8";
    ctx.beginPath();
    ctx.arc(0, -110, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ===== Saç (kahverengi, uzun, omuzlara kadar) =====
    ctx.fillStyle = "#5a3018";
    // Üst kısım — kafanın üstünü kaplayan saç
    ctx.beginPath();
    ctx.arc(0, -114, 28, Math.PI, 0);
    ctx.fill();

    // Sol uzun saç (omuza kadar düşer)
    ctx.beginPath();
    ctx.moveTo(-26, -110);
    ctx.quadraticCurveTo(-38, -90, -36, -65);
    ctx.quadraticCurveTo(-32, -50, -22, -55);
    ctx.quadraticCurveTo(-22, -85, -22, -110);
    ctx.closePath();
    ctx.fill();

    // Sağ uzun saç (omuza kadar düşer)
    ctx.beginPath();
    ctx.moveTo(26, -110);
    ctx.quadraticCurveTo(38, -90, 36, -65);
    ctx.quadraticCurveTo(32, -50, 22, -55);
    ctx.quadraticCurveTo(22, -85, 22, -110);
    ctx.closePath();
    ctx.fill();

    // Kakül (alından sarkık)
    ctx.beginPath();
    ctx.moveTo(-22, -125);
    ctx.quadraticCurveTo(-12, -115, -2, -118);
    ctx.quadraticCurveTo(8, -120, 18, -130);
    ctx.quadraticCurveTo(0, -135, -22, -130);
    ctx.closePath();
    ctx.fill();

    // Saç highlight
    ctx.fillStyle = "rgba(255, 200, 150, 0.2)";
    ctx.beginPath();
    ctx.arc(-12, -130, 6, 0, Math.PI * 2);
    ctx.fill();

    // ===== Gözlük =====
    // Çerçeveler — siyah, yuvarlak
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    // Sol cam
    ctx.beginPath();
    ctx.arc(-9, -112, 7, 0, Math.PI * 2);
    ctx.stroke();
    // Sağ cam
    ctx.beginPath();
    ctx.arc(9, -112, 7, 0, Math.PI * 2);
    ctx.stroke();
    // Burun köprüsü
    ctx.beginPath();
    ctx.moveTo(-2, -112);
    ctx.lineTo(2, -112);
    ctx.stroke();
    // Saplar (kulaklara doğru)
    ctx.beginPath();
    ctx.moveTo(-16, -112);
    ctx.lineTo(-22, -110);
    ctx.moveTo(16, -112);
    ctx.lineTo(22, -110);
    ctx.stroke();

    // Camın içinde göz parıltısı (yansıma)
    ctx.fillStyle = "rgba(200, 220, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(-11, -114, 2.5, 0, Math.PI * 2);
    ctx.arc(7, -114, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Gözler (gözlük camlarının içinde, küçük noktalar)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-8, -111, 1.8, 0, Math.PI * 2);
    ctx.arc(10, -111, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Burun (küçük çizgi)
    ctx.strokeStyle = "#c08868";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -106);
    ctx.lineTo(-2, -100);
    ctx.lineTo(0, -98);
    ctx.stroke();

    // Ağız (küçük neutral çizgi)
    ctx.strokeStyle = "#a04060";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -92);
    ctx.lineTo(4, -92);
    ctx.stroke();

    // Yanak allığı (hafif pembe)
    ctx.fillStyle = "rgba(255, 150, 150, 0.3)";
    ctx.beginPath();
    ctx.arc(-15, -105, 4, 0, Math.PI * 2);
    ctx.arc(15, -105, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hedef bölge etiketleri (puanlar)
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    for (const z of TARGET_ZONES) {
      const cx = Math.cos(z.angle) * z.radius;
      const cy = Math.sin(z.angle) * z.radius;
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 3;
      ctx.strokeText(z.label, cx, cy + 3);
      ctx.fillText(z.label, cx, cy + 3);
    }

    ctx.restore();
  }

  function drawStuckKnife(ctx: CanvasRenderingContext2D, k: StuckKnife) {
    // Saplanmış bıçak: wheel'in dış kenarından içeri doğru
    const worldAngle = k.angle + wheelRotRef.current;
    const tipX = WHEEL_X + Math.cos(worldAngle) * (WHEEL_RADIUS - 2);
    const tipY = WHEEL_Y + Math.sin(worldAngle) * (WHEEL_RADIUS - 2);
    const handleX = WHEEL_X + Math.cos(worldAngle) * (WHEEL_RADIUS + KNIFE_LENGTH);
    const handleY = WHEEL_Y + Math.sin(worldAngle) * (WHEEL_RADIUS + KNIFE_LENGTH);

    ctx.save();
    // Bıçak gövdesi (gümüş)
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = KNIFE_WIDTH;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    // Sap ortasına kadar
    const midX = WHEEL_X + Math.cos(worldAngle) * (WHEEL_RADIUS + KNIFE_LENGTH * 0.55);
    const midY = WHEEL_Y + Math.sin(worldAngle) * (WHEEL_RADIUS + KNIFE_LENGTH * 0.55);
    ctx.lineTo(midX, midY);
    ctx.stroke();

    // Sap (siyah)
    ctx.strokeStyle = k.bonus ? "#daa520" : "#1a1a1a";
    ctx.lineWidth = KNIFE_WIDTH + 2;
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(handleX, handleY);
    ctx.stroke();

    // Sap topu
    ctx.fillStyle = k.bonus ? "#daa520" : "#1a1a1a";
    ctx.beginPath();
    ctx.arc(handleX, handleY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFlyingKnife(ctx: CanvasRenderingContext2D, y: number) {
    // Dikey, tip yukarıda
    const x = CANVAS_W / 2;
    ctx.save();
    // Bıçak ucu
    ctx.strokeStyle = "#dddddd";
    ctx.lineWidth = KNIFE_WIDTH;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + KNIFE_LENGTH * 0.55);
    ctx.stroke();
    // Sap
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = KNIFE_WIDTH + 2;
    ctx.beginPath();
    ctx.moveTo(x, y + KNIFE_LENGTH * 0.55);
    ctx.lineTo(x, y + KNIFE_LENGTH);
    ctx.stroke();
    // Topuz
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(x, y + KNIFE_LENGTH, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawThrowerKnife(ctx: CanvasRenderingContext2D) {
    if (flyingKnifeRef.current) return;
    if (knivesLeftRef.current === 0) return;
    drawFlyingKnife(ctx, CANVAS_H - 60 - KNIFE_LENGTH);
  }

  function drawHUD(ctx: CanvasRenderingContext2D) {
    // Üst skor bar
    const grad = ctx.createLinearGradient(0, 0, 0, 50);
    grad.addColorStop(0, "rgba(0,0,0,0.85)");
    grad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, 46);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "left";
    ctx.fillText(scoreRef.current.toString().padStart(6, "0"), 10, 28);
    ctx.fillStyle = "#888";
    ctx.font = "9px monospace";
    ctx.fillText("SKOR", 10, 40);

    // Level
    ctx.fillStyle = "#daa520";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`LEVEL ${levelRef.current}`, CANVAS_W / 2, 24);

    // Combo
    if (comboRef.current >= 2) {
      ctx.fillStyle = "#ff8800";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`🔥 x${comboRef.current}`, CANVAS_W / 2, 40);
    }

    // Bıçak sayacı
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`bıçak ${knivesLeftRef.current}/${knivesNeededRef.current}`, CANVAS_W - 10, 28);
  }

  // ============ INPUT ============
  useEffect(() => {
    if (phase !== "playing") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        throwKnife();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, throwKnife]);

  if (phase === "menu") {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">🔪</div>
          <h2 className="text-lg font-bold mb-2">leninist&apos;e sapla</h2>
          <p className="text-xs text-muted-foreground mb-4">
            dönen tahtaya bıçak fırlat. işaretli hedef bölgelere isabet bonus puan kazandırır.
            saplı bıçaklara çarparsan oyun biter. her level daha hızlı, daha çok bıçak.
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

  if (phase === "gameover") {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-red-500/50 rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">💀</div>
          <h2 className="text-lg font-bold mb-2 text-red-400">oyun bitti</h2>
          <p className="text-xs text-muted-foreground mb-1">
            ulaştığın level: <b className="text-primary">{levelRef.current}</b>
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
        onClick={throwKnife}
        onTouchStart={(e) => {
          e.preventDefault();
          throwKnife();
        }}
        className="border border-border rounded max-w-full cursor-pointer select-none"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "manipulation" }}
      />
      <div className="mt-2 text-[10px] text-muted-foreground">tıkla / boşluk: bıçak fırlat</div>
    </div>
  );
}
