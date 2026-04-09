"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const CANVAS_W = 800;
const CANVAS_H = 400;

// Monkey position
const MONKEY_X = 60;
const MONKEY_Y = 110;
const MONKEY_W = 90;
const MONKEY_H = 130;

// Hand (cursor) area
const HAND_REST_X = 600;
const HAND_REST_Y = 160;
const HAND_W = 70;
const HAND_H = 70;

// Hit zone (monkey's face area)
const HIT_X = MONKEY_X + 10;
const HIT_Y = MONKEY_Y + 10;
const HIT_W = MONKEY_W - 20;
const HIT_H = MONKEY_H - 30;

type GameState = "idle" | "dragging" | "hit" | "flying" | "result";

type Props = {
  onGameOver: (score: number) => void;
};

export default function MonkeyOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    gameState: GameState;
    handX: number;
    handY: number;
    isDragging: boolean;
    dragStartX: number;
    dragStartY: number;
    dragStartTime: number;
    lastMouseX: number;
    lastMouseY: number;
    lastMouseTime: number;
    velocityX: number;
    velocityY: number;
    // Flying monkey
    monkeyFlyX: number;
    monkeyFlyY: number;
    monkeyFlyVX: number;
    monkeyFlyVY: number;
    monkeyRotation: number;
    monkeyRotSpeed: number;
    flyTime: number;
    maxDistance: number;
    score: number;
    // Hit animation
    hitFrame: number;
    hitTimer: number;
    // Stars effect
    stars: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
    // Trail
    trail: { x: number; y: number; alpha: number }[];
    bestSpeed: number;
    multiplier: number;
    swipeDistance: number;
  }>({
    gameState: "idle",
    handX: HAND_REST_X,
    handY: HAND_REST_Y,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartTime: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    lastMouseTime: 0,
    velocityX: 0,
    velocityY: 0,
    monkeyFlyX: MONKEY_X,
    monkeyFlyY: MONKEY_Y,
    monkeyFlyVX: 0,
    monkeyFlyVY: 0,
    monkeyRotation: 0,
    monkeyRotSpeed: 0,
    flyTime: 0,
    maxDistance: 0,
    score: 0,
    hitFrame: 0,
    hitTimer: 0,
    stars: [],
    trail: [],
    bestSpeed: 0,
    multiplier: 1,
    swipeDistance: 0,
  });

  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const animRef = useRef<number>(0);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.gameState = "idle";
    s.handX = HAND_REST_X;
    s.handY = HAND_REST_Y;
    s.isDragging = false;
    s.velocityX = 0;
    s.velocityY = 0;
    s.monkeyFlyX = MONKEY_X;
    s.monkeyFlyY = MONKEY_Y;
    s.monkeyFlyVX = 0;
    s.monkeyFlyVY = 0;
    s.monkeyRotation = 0;
    s.monkeyRotSpeed = 0;
    s.flyTime = 0;
    s.maxDistance = 0;
    s.score = 0;
    s.hitFrame = 0;
    s.hitTimer = 0;
    s.stars = [];
    s.trail = [];
    s.multiplier = 1;
    s.swipeDistance = 0;
    setDisplayScore(null);
    setGameActive(true);
  }, []);

  const drawMonkey = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, hit: boolean) => {
    ctx.save();
    ctx.translate(x + MONKEY_W / 2, y + MONKEY_H / 2);
    ctx.rotate(rotation);

    // === LONG BLACK HAIR (behind body) ===
    ctx.fillStyle = "#111";
    // Left hair strand
    ctx.beginPath();
    ctx.moveTo(-22, -50);
    ctx.quadraticCurveTo(-35, 0, -30, 55);
    ctx.lineTo(-20, 55);
    ctx.quadraticCurveTo(-25, 0, -15, -45);
    ctx.closePath();
    ctx.fill();
    // Right hair strand
    ctx.beginPath();
    ctx.moveTo(22, -50);
    ctx.quadraticCurveTo(35, 0, 30, 55);
    ctx.lineTo(20, 55);
    ctx.quadraticCurveTo(25, 0, 15, -45);
    ctx.closePath();
    ctx.fill();

    // === BJK JERSEY (black body with BJK text) ===
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(0, 15, 32, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // White stripes on jersey
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 15, 32, 45, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#fff";
    for (let sx = -30; sx <= 30; sx += 14) {
      ctx.fillRect(sx, -30, 7, 90);
    }
    ctx.restore();

    // "BJK" text on jersey
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText("BJK", 0, 10);
    ctx.fillText("BJK", 0, 10);

    // Jersey collar
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -25, 12, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Head (dark gray)
    ctx.fillStyle = "#444";
    ctx.beginPath();
    ctx.arc(0, -35, 28, 0, Math.PI * 2);
    ctx.fill();

    // Hair on top of head (behind beanie)
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(0, -38, 29, Math.PI, 2 * Math.PI);
    ctx.fill();

    // Face (lighter)
    ctx.fillStyle = "#999";
    ctx.beginPath();
    ctx.ellipse(0, -30, 20, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // === BJK BEANIE ===
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(0, -52, 30, 14, 0, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.fillRect(-30, -55, 60, 10);
    // Beanie fold
    ctx.fillStyle = "#222";
    ctx.fillRect(-28, -48, 56, 8);
    // BJK logo on beanie
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BJK", 0, -42);
    // Beanie top pom-pom
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(0, -58, 5, 0, Math.PI * 2);
    ctx.fill();

    // Long hair flowing from under beanie
    ctx.fillStyle = "#111";
    // Left side hair
    ctx.beginPath();
    ctx.moveTo(-28, -45);
    ctx.quadraticCurveTo(-38, -10, -32, 50);
    ctx.lineTo(-25, 50);
    ctx.quadraticCurveTo(-30, -10, -22, -42);
    ctx.closePath();
    ctx.fill();
    // Right side hair
    ctx.beginPath();
    ctx.moveTo(28, -45);
    ctx.quadraticCurveTo(38, -10, 32, 50);
    ctx.lineTo(25, 50);
    ctx.quadraticCurveTo(30, -10, 22, -42);
    ctx.closePath();
    ctx.fill();

    // Eyes
    if (hit) {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -38); ctx.lineTo(-4, -32);
      ctx.moveTo(-4, -38); ctx.lineTo(-10, -32);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, -38); ctx.lineTo(10, -32);
      ctx.moveTo(10, -38); ctx.lineTo(4, -32);
      ctx.stroke();
    } else {
      // White eye circles
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-8, -35, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, -35, 5, 0, Math.PI * 2);
      ctx.fill();
      // Black pupils
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-7, -35, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(9, -35, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Eyelashes (thick eyebrows like the photo)
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-14, -42);
      ctx.lineTo(-3, -41);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, -41);
      ctx.lineTo(14, -42);
      ctx.stroke();
    }

    // Nose
    ctx.fillStyle = "#777";
    ctx.beginPath();
    ctx.ellipse(0, -28, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // === PINK LIPS ===
    if (hit) {
      // Open mouth screaming
      ctx.fillStyle = "#FF69B4";
      ctx.beginPath();
      ctx.ellipse(0, -21, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Inner mouth
      ctx.fillStyle = "#c00";
      ctx.beginPath();
      ctx.ellipse(0, -21, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Closed pink lips
      ctx.fillStyle = "#FF69B4";
      // Upper lip
      ctx.beginPath();
      ctx.moveTo(-7, -22);
      ctx.quadraticCurveTo(-3, -25, 0, -23);
      ctx.quadraticCurveTo(3, -25, 7, -22);
      ctx.quadraticCurveTo(3, -21, 0, -22);
      ctx.quadraticCurveTo(-3, -21, -7, -22);
      ctx.closePath();
      ctx.fill();
      // Lower lip
      ctx.beginPath();
      ctx.moveTo(-7, -22);
      ctx.quadraticCurveTo(0, -17, 7, -22);
      ctx.quadraticCurveTo(0, -19, -7, -22);
      ctx.closePath();
      ctx.fill();
    }

    // Ears
    ctx.fillStyle = "#777";
    ctx.beginPath();
    ctx.arc(-28, -35, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, -35, 7, 0, Math.PI * 2);
    ctx.fill();

    // Arms (dark sleeves)
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    if (hit) {
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(-45, -20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(45, -25);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(-38, 25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(38, 25);
      ctx.stroke();
    }

    // Black pants
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(0, 48, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-12, 55);
    ctx.lineTo(-18, 70);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 55);
    ctx.lineTo(18, 70);
    ctx.stroke();

    // Shoes
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.ellipse(-18, 73, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18, 73, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-25, 40);
    ctx.quadraticCurveTo(-50, 30, -45, 0);
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawHand = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, open: boolean) => {
    ctx.save();
    ctx.translate(x, y);

    // Wrist/palm
    ctx.fillStyle = "#FDBCB4";
    ctx.strokeStyle = "#d4978f";
    ctx.lineWidth = 2;

    if (open) {
      // Open hand (palm)
      ctx.beginPath();
      ctx.ellipse(0, 10, 22, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Fingers
      const fingers = [
        { x: -16, y: -12, angle: -0.3 },
        { x: -6, y: -20, angle: -0.1 },
        { x: 5, y: -22, angle: 0.05 },
        { x: 15, y: -18, angle: 0.2 },
      ];
      ctx.lineWidth = 1.5;
      for (const f of fingers) {
        ctx.fillStyle = "#FDBCB4";
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        ctx.beginPath();
        ctx.roundRect(-5, -18, 10, 22, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Thumb
      ctx.save();
      ctx.translate(-22, 5);
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.roundRect(-5, -14, 11, 20, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      // Fist
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Knuckle lines
      ctx.strokeStyle = "#d4978f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-8, -8, 8, -0.8, 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2, -10, 8, -0.6, 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12, -8, 8, -0.4, 0.7);
      ctx.stroke();

      // Thumb
      ctx.fillStyle = "#FDBCB4";
      ctx.save();
      ctx.translate(-20, 5);
      ctx.rotate(-0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d4978f";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    const w = CANVAS_W;
    const h = CANVAS_H;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#FF8C00");
    grad.addColorStop(1, "#FF6600");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#4a2800";
    ctx.fillRect(0, h - 40, w, 40);
    ctx.fillStyle = "#5a3800";
    ctx.fillRect(0, h - 40, w, 3);

    // Draw trail
    for (const t of s.trail) {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw stars
    for (const star of s.stars) {
      ctx.globalAlpha = star.life;
      ctx.fillStyle = star.color;
      ctx.font = "16px serif";
      ctx.fillText("✦", star.x, star.y);
    }
    ctx.globalAlpha = 1;

    if (s.gameState === "flying" || s.gameState === "result") {
      // Draw monkey flying
      drawMonkey(ctx, s.monkeyFlyX, s.monkeyFlyY, s.monkeyRotation, true);

      // Distance meter
      const dist = Math.floor(s.maxDistance);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 30px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${dist} km/s`, w / 2, 45);

      // Multiplier badge
      if (s.multiplier > 1) {
        const multText = `x${s.multiplier.toFixed(1)}`;
        const multColor = s.multiplier >= 6 ? "#FF1744" : s.multiplier >= 4 ? "#FF9100" : s.multiplier >= 2.5 ? "#FFD700" : "#76FF03";
        ctx.font = "bold 22px sans-serif";
        ctx.fillStyle = multColor;
        ctx.fillText(multText, w / 2, 72);
        // Label
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText("carpan", w / 2, 88);
      }

      if (s.gameState === "result") {
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#FFD700";
        ctx.fillText("skorun kaydedildi!", w / 2, 115);
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.fillText("tekrar oynamak icin tikla", w / 2, h - 55);
      }
    } else {
      // Draw monkey standing
      drawMonkey(ctx, s.gameState === "hit" ? MONKEY_X + 5 : MONKEY_X, MONKEY_Y, 0, s.gameState === "hit");

      // Draw hand
      const isOpen = s.gameState === "idle" && !s.isDragging;
      drawHand(ctx, s.handX, s.handY, isOpen);

      if (s.gameState === "idle" && !s.isDragging) {
        // Instructions
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("eli korcuya dogru surukle!", w / 2, h - 60);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText("ne kadar uzaktan ve hizli vurursan carpan o kadar yuksek olur!", w / 2, h - 42);
      }

      if (s.gameState === "hit") {
        // Impact effect
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TOKAAAT!", MONKEY_X + MONKEY_W / 2 + 20, MONKEY_Y - 10);
      }
    }

    ctx.textAlign = "start";
  }, [drawMonkey, drawHand]);

  const update = useCallback((dt: number) => {
    const s = stateRef.current;

    // Update trail
    for (let i = s.trail.length - 1; i >= 0; i--) {
      s.trail[i].alpha -= dt * 2;
      if (s.trail[i].alpha <= 0) s.trail.splice(i, 1);
    }

    // Update stars
    for (let i = s.stars.length - 1; i >= 0; i--) {
      const star = s.stars[i];
      star.x += star.vx * dt;
      star.y += star.vy * dt;
      star.life -= dt * 1.5;
      if (star.life <= 0) s.stars.splice(i, 1);
    }

    if (s.gameState === "hit") {
      s.hitTimer += dt;
      if (s.hitTimer > 0.4) {
        // Launch monkey
        s.gameState = "flying";
        s.monkeyFlyX = MONKEY_X;
        s.monkeyFlyY = MONKEY_Y;
        const speed = s.bestSpeed;
        s.monkeyFlyVX = speed * 0.8;
        s.monkeyFlyVY = -speed * 0.5;
        s.monkeyRotSpeed = speed * 0.01;
        s.flyTime = 0;

        // Create impact stars
        for (let i = 0; i < 12; i++) {
          s.stars.push({
            x: MONKEY_X + MONKEY_W / 2,
            y: MONKEY_Y + MONKEY_H / 2,
            vx: (Math.random() - 0.5) * 300,
            vy: (Math.random() - 0.5) * 300,
            life: 1,
            color: ["#FFD700", "#FF6347", "#fff", "#FFA500"][Math.floor(Math.random() * 4)],
          });
        }
      }
    }

    if (s.gameState === "flying") {
      s.flyTime += dt;
      s.monkeyFlyX += s.monkeyFlyVX * dt;
      s.monkeyFlyY += s.monkeyFlyVY * dt;
      s.monkeyFlyVY += 150 * dt; // gravity (lighter)
      s.monkeyRotation += s.monkeyRotSpeed * dt;
      s.monkeyFlyVX *= (1 - 0.1 * dt); // air resistance (much less)

      // Add trail
      if (Math.random() < 0.3) {
        s.trail.push({
          x: s.monkeyFlyX + MONKEY_W / 2 + (Math.random() - 0.5) * 20,
          y: s.monkeyFlyY + MONKEY_H / 2 + (Math.random() - 0.5) * 20,
          alpha: 0.8,
        });
      }

      // Calculate distance based on speed
      s.maxDistance = Math.max(s.maxDistance, s.monkeyFlyX - MONKEY_X);

      // Check if landed (below ground or stopped)
      if (s.monkeyFlyY > CANVAS_H - 40 - MONKEY_H / 2 || s.flyTime > 8) {
        s.gameState = "result";
        const score = Math.floor(s.maxDistance);
        s.score = score;
        setDisplayScore(score);
        onGameOver(score);
      }
    }
  }, [onGameOver]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();
    let running = true;

    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      update(dt);
      draw(ctx);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [update, draw]);

  // Mouse/touch handlers
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    const pos = getCanvasPos(e.clientX, e.clientY);

    if (s.gameState === "result") {
      resetGame();
      return;
    }

    if (s.gameState !== "idle") return;

    // Check if clicking near the hand
    const dx = pos.x - s.handX;
    const dy = pos.y - s.handY;
    if (Math.abs(dx) < 50 && Math.abs(dy) < 50) {
      s.isDragging = true;
      s.dragStartX = pos.x;
      s.dragStartY = pos.y;
      s.dragStartTime = performance.now();
      s.lastMouseX = pos.x;
      s.lastMouseY = pos.y;
      s.lastMouseTime = performance.now();
      s.velocityX = 0;
      s.velocityY = 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [getCanvasPos, resetGame]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (!s.isDragging || s.gameState !== "idle") return;

    const pos = getCanvasPos(e.clientX, e.clientY);
    const now = performance.now();
    const elapsed = now - s.lastMouseTime;

    if (elapsed > 0) {
      const instantVX = (pos.x - s.lastMouseX) / elapsed * 1000;
      const instantVY = (pos.y - s.lastMouseY) / elapsed * 1000;
      // Smooth velocity
      s.velocityX = s.velocityX * 0.5 + instantVX * 0.5;
      s.velocityY = s.velocityY * 0.5 + instantVY * 0.5;
    }

    s.lastMouseX = pos.x;
    s.lastMouseY = pos.y;
    s.lastMouseTime = now;
    s.handX = pos.x;
    s.handY = pos.y;

    // Check if hand hit the monkey
    const handCenterX = pos.x;
    const handCenterY = pos.y;
    if (
      handCenterX > HIT_X &&
      handCenterX < HIT_X + HIT_W &&
      handCenterY > HIT_Y &&
      handCenterY < HIT_Y + HIT_H
    ) {
      // Calculate speed at impact — no cap!
      const speed = Math.sqrt(s.velocityX * s.velocityX + s.velocityY * s.velocityY);
      // Swipe distance: how far did the hand travel from start to monkey
      const swipeDist = Math.sqrt(
        (s.dragStartX - handCenterX) ** 2 + (s.dragStartY - handCenterY) ** 2
      );
      s.swipeDistance = swipeDist;
      // Multiplier: longer swipe + higher speed = bigger multiplier
      // Base: 1x, max depends on how far and fast you swipe
      const distBonus = Math.min(swipeDist / 150, 3); // 0-3x from distance
      const speedBonus = Math.min(speed / 1000, 4);   // 0-4x from speed
      s.multiplier = 1 + distBonus + speedBonus;
      s.bestSpeed = speed * 0.6 * s.multiplier; // no cap, multiplier amplifies
      s.isDragging = false;
      s.gameState = "hit";
      s.hitTimer = 0;
      s.maxDistance = 0;

      // Impact stars
      for (let i = 0; i < 8; i++) {
        s.stars.push({
          x: handCenterX,
          y: handCenterY,
          vx: (Math.random() - 0.5) * 400,
          vy: (Math.random() - 0.5) * 400,
          life: 1,
          color: ["#FFD700", "#FF6347", "#fff"][Math.floor(Math.random() * 3)],
        });
      }
    }
  }, [getCanvasPos]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (s.isDragging) {
      s.isDragging = false;
      // Snap hand back if didn't hit monkey
      if (s.gameState === "idle") {
        s.handX = HAND_REST_X;
        s.handY = HAND_REST_Y;
      }
    }
  }, []);

  // Init game on mount
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-border rounded-lg w-full max-w-[800px] cursor-pointer touch-none"
        style={{ imageRendering: "auto" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {displayScore !== null && (
        <div className="text-center text-sm text-muted-foreground">
          hiz: <span className="font-bold text-primary">{displayScore} km/s</span>
        </div>
      )}
    </div>
  );
}
