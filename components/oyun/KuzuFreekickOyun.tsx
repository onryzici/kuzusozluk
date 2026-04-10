"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ============================================================
// SABITLER & FIZIK
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 600;

// Dünya: y = mesafe (1000 = ball başlangıç, 0 = goal line)
const BALL_START_Y = 1000;
const WALL_Y = 600; // duvarın yeri
const GOAL_Y = 0;

// Goal boyutu — lvl 1 büyük, lvl 12+ sabit minimum
const GOAL_WIDTH_MAX = 400;
const GOAL_HEIGHT_MAX = 160;
const GOAL_WIDTH_MIN = 250;
const GOAL_HEIGHT_MIN = 100;

function getGoalSize(level: number) {
  const t = Math.min(1, Math.max(0, (level - 1) / 11));
  return {
    width: GOAL_WIDTH_MAX - (GOAL_WIDTH_MAX - GOAL_WIDTH_MIN) * t,
    height: GOAL_HEIGHT_MAX - (GOAL_HEIGHT_MAX - GOAL_HEIGHT_MIN) * t,
  };
}

// Senaryolar: her vuruşta rastgele biri seçilir
type Scenario = {
  id: string;
  name: string;
  ballX: number; // top başlangıç lateral pozisyonu
  bonus: number; // gol başarınca ekstra puan
  weight: number;
};

const SCENARIOS: Scenario[] = [
  { id: "duz", name: "düz vuruş", ballX: 0, bonus: 0, weight: 4 },
  { id: "saci", name: "sağ açı", ballX: 70, bonus: 25, weight: 3 },
  { id: "loi", name: "sol açı", ballX: -70, bonus: 25, weight: 3 },
  { id: "skose", name: "sağ köşe", ballX: 135, bonus: 60, weight: 2 },
  { id: "lkose", name: "sol köşe", ballX: -135, bonus: 60, weight: 2 },
  { id: "uzak", name: "uzaktan", ballX: 0, bonus: 80, weight: 1 },
];

function getWallCount(level: number): number {
  // lvl 1-2: 0, lvl 3: 1, lvl 4: 1, lvl 5: 2, lvl 6: 3, lvl 7: 4, lvl 8: 5, lvl 10+: 6
  if (level < 3) return 0;
  if (level < 5) return 1;
  if (level < 6) return 2;
  if (level < 7) return 3;
  if (level < 8) return 4;
  if (level < 10) return 5;
  return 6;
}

function pickScenario(level: number): Scenario {
  // İlk lvl'larda daha çok düz vuruş, sonra çeşit artar
  const variety = Math.min(1, (level - 1) / 6);
  const weighted = SCENARIOS.map((s) => {
    let w = s.weight;
    if (s.id === "duz") w = w * (1 - variety * 0.6);
    else w = w * (0.4 + variety);
    return { s, w };
  });
  const total = weighted.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const ws of weighted) {
    r -= ws.w;
    if (r <= 0) return ws.s;
  }
  return SCENARIOS[0];
}

// Goal callout tier'ları (bonus'a göre)
function goalCallout(bonus: number): { text: string; color: string; size: number } {
  if (bonus >= 400) return { text: "DÜNYA GOLÜ! ⚽", color: "#ffd700", size: 38 };
  if (bonus >= 300) return { text: "GOLAZO!", color: "#ff8800", size: 34 };
  if (bonus >= 200) return { text: "SÜPER GOL!", color: "#ffaa00", size: 30 };
  if (bonus >= 130) return { text: "GÜZEL GOL!", color: "#5dd95d", size: 26 };
  return { text: "GOL!", color: "#5dd95d", size: 24 };
}

// Fizik
const GRAVITY = 900; // z ekseninde aşağı
const AIR_DRAG = 0.04;

// Perspektif izdüşüm: y=1000 ön planda, y=0 ufukta
const HORIZON_Y = 180;
const FOREGROUND_Y = 540;

function project(worldX: number, worldY: number, worldZ: number) {
  // worldY: 0 (uzak/goal) -> 1000 (yakın/ball)
  // t = 0 (uzak), 1 (yakın)
  const t = worldY / BALL_START_Y;
  const screenY = HORIZON_Y + t * (FOREGROUND_Y - HORIZON_Y) - worldZ * (0.5 + t * 0.5);
  const scale = 0.25 + t * 0.85;
  const screenX = CANVAS_W / 2 + worldX * scale;
  return { x: screenX, y: screenY, scale };
}

// ============================================================
// TIPLER
// ============================================================
type Phase =
  | "ready"
  | "aim"
  | "power"
  | "curve"
  | "flying"
  | "result"
  | "game-over";

type ResultType = "goal" | "save" | "wall" | "post" | "miss";

type FloatText = { x: number; y: number; text: string; color: string; vy: number; life: number };

// ============================================================
// COMPONENT
// ============================================================
type Props = { onGameOver: (score: number) => void };

export default function KuzuFreekickOyun({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => v + 1), []);

  // ===== Oyun durumu (refler — performans için) =====
  const phaseRef = useRef<Phase>("ready");
  const scoreRef = useRef(0);
  const goalsRef = useRef(0);
  const missesRef = useRef(0);
  const levelRef = useRef(1);
  const comboRef = useRef(0);

  // Reticle / oscillating bars
  const reticleRef = useRef({ x: 0, y: 60, vx: 130, vy: 80 });
  const powerBarRef = useRef({
    value: 0,
    dir: 1,
    sweetCenter: 0.7,
    sweetWidth: 0.18,
  });
  const curveBarRef = useRef({
    value: 0,
    dir: 1,
    sweetCenter: 0,
    sweetWidth: 0.25,
  });

  // Lock'lanmış değerler
  const lockedAimRef = useRef({ x: 0, z: 60 });
  const lockedPowerRef = useRef(0);
  const lockedCurveRef = useRef(0);
  // Toplam isabet puanı (0..1) — sweet spot'lardan gelir, top inaccuracy'sini etkiler
  const accuracyRef = useRef(1);

  // Aktif senaryo
  const scenarioRef = useRef<Scenario>(SCENARIOS[0]);

  // Skor animasyonu (akan numara için)
  const displayScoreRef = useRef(0);

  // Net bulge animasyonu (gol olunca)
  const netBulgeRef = useRef<{ x: number; z: number; intensity: number } | null>(null);

  // Konfeti / particle system
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number; size: number }[]>([]);

  // Ekran flash (gol olunca beyaz parlak)
  const flashRef = useRef(0);

  // Replay trail (son şutun trajektorisi result fazında gösterilir)
  const replayTrailRef = useRef<{ x: number; y: number; z: number }[]>([]);

  // Crowd wave animasyonu için faz
  const crowdPhaseRef = useRef(0);

  // Top fiziği
  const ballRef = useRef({
    x: 0,
    y: BALL_START_Y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    rotation: 0,
    swerve: 0,
    wallChecked: false,
    landed: false,
    trail: [] as { x: number; y: number; z: number }[],
  });

  // Kaleci
  const keeperRef = useRef({
    x: 0,
    targetX: 0,
    targetZ: GOAL_HEIGHT_MAX / 2,
    diveX: 0,
    diveZ: 0,
    diveTimer: 0,
    diving: false,
    reachSpeed: 1.0,
    saveRadius: 36,
    tracks: false,
    commitTimer: 0, // izleme süresinin sonunda hedefe kilitlenir
  });

  // Kuzu animasyonu
  const kuzuRef = useRef({ kickPhase: 0, idle: 0 });

  // Sonuç & UI
  const resultRef = useRef<{ type: ResultType; text: string; bonus: number; until: number } | null>(null);
  const floatsRef = useRef<FloatText[]>([]);
  const shakeRef = useRef(0);
  const windRef = useRef(0); // -1 to 1

  const lastTimeRef = useRef(0);

  // ============================================================
  // BAŞLAT / RESET
  // ============================================================
  const resetForNextShot = useCallback(() => {
    phaseRef.current = "ready";
    const lvl = levelRef.current;
    const gs = getGoalSize(lvl);

    // Yeni senaryo seç
    const scenario = pickScenario(lvl);
    scenarioRef.current = scenario;

    // Reticle hızı (lvl'a göre çok daha hızlı)
    const retSpeedMul = 1 + (lvl - 1) * 0.18;
    reticleRef.current = {
      x: scenario.ballX * 0.3, // başlangıç biraz senaryoya yakın
      y: gs.height * 0.5,
      vx: (110 + Math.random() * 60) * retSpeedMul,
      vy: (70 + Math.random() * 40) * retSpeedMul,
    };

    // Sweet spot zone'ları — yüksek lvl'da küçülür
    const sweetShrink = Math.max(0.35, 1 - (lvl - 1) * 0.08);
    powerBarRef.current = {
      value: 0,
      dir: 1,
      sweetCenter: 0.55 + Math.random() * 0.35, // 0.55..0.90 arasında
      sweetWidth: 0.22 * sweetShrink, // lvl 1: 0.22, lvl 10+: 0.077
    };
    curveBarRef.current = {
      value: 0,
      dir: 1,
      sweetCenter: (Math.random() - 0.5) * 1.6, // -0.8..+0.8
      sweetWidth: 0.30 * sweetShrink,
    };

    accuracyRef.current = 1;

    ballRef.current = {
      x: scenario.ballX,
      y: BALL_START_Y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      rotation: 0,
      swerve: 0,
      wallChecked: false,
      landed: false,
      trail: [],
    };

    const k = keeperRef.current;
    k.x = (Math.random() - 0.5) * 50;
    k.targetX = 0;
    k.targetZ = gs.height * 0.4;
    k.diveX = k.x;
    k.diveZ = 0;
    k.diving = false;
    k.diveTimer = 0;
    k.commitTimer = 0;

    kuzuRef.current.kickPhase = 0;
    netBulgeRef.current = null;
    replayTrailRef.current = [];
  }, []);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    displayScoreRef.current = 0;
    goalsRef.current = 0;
    missesRef.current = 0;
    levelRef.current = 1;
    comboRef.current = 0;
    floatsRef.current = [];
    particlesRef.current = [];
    resultRef.current = null;
    windRef.current = 0;
    flashRef.current = 0;
    resetForNextShot();
    setRunning(true);
  }, [resetForNextShot]);

  // ============================================================
  // GIRDI: TIKLAMA (3 faz)
  // ============================================================
  const handleTap = useCallback(() => {
    const phase = phaseRef.current;

    if (phase === "ready") {
      phaseRef.current = "aim";
      return;
    }

    if (phase === "aim") {
      lockedAimRef.current = { x: reticleRef.current.x, z: reticleRef.current.y };
      phaseRef.current = "power";
      return;
    }

    if (phase === "power") {
      const p = powerBarRef.current;
      lockedPowerRef.current = p.value;
      // Sweet spot kontrolü
      const distFromSweet = Math.abs(p.value - p.sweetCenter);
      const inSweet = distFromSweet <= p.sweetWidth / 2;
      // Accuracy katkısı: sweet içindeyse 1, dışındaysa mesafeye göre düşer
      const acc = inSweet ? 1 : Math.max(0, 1 - (distFromSweet - p.sweetWidth / 2) * 3);
      accuracyRef.current *= acc;
      // Sweet spot tıklarsa görsel feedback
      if (inSweet) {
        floatsRef.current.push({
          x: CANVAS_W - 50,
          y: 280,
          text: "PERFECT!",
          color: "#5dd95d",
          vy: -1.2,
          life: 1.2,
        });
      }
      phaseRef.current = "curve";
      return;
    }

    if (phase === "curve") {
      const c = curveBarRef.current;
      lockedCurveRef.current = c.value;
      const distFromSweet = Math.abs(c.value - c.sweetCenter);
      const inSweet = distFromSweet <= c.sweetWidth / 2;
      const acc = inSweet ? 1 : Math.max(0, 1 - (distFromSweet - c.sweetWidth / 2) * 2);
      accuracyRef.current *= acc;
      if (inSweet) {
        floatsRef.current.push({
          x: CANVAS_W / 2,
          y: CANVAS_H - 110,
          text: "PERFECT!",
          color: "#5dd95d",
          vy: -1.2,
          life: 1.2,
        });
      }
      phaseRef.current = "flying";
      // Atışı başlat
      launchBall();
      return;
    }

    if (phase === "result") {
      // Sonucu atla, sonraki atışa geç
      handleResultEnd();
      return;
    }

    if (phase === "game-over") {
      startGame();
      return;
    }
  }, [startGame]);

  // ============================================================
  // ATIŞ: hesapla ve fırlat
  // ============================================================
  const launchBall = useCallback(() => {
    const aim = lockedAimRef.current;
    const power = lockedPowerRef.current; // 0..1
    const curve = lockedCurveRef.current; // -1..1
    const accuracy = accuracyRef.current; // 0..1
    const scenario = scenarioRef.current;

    const speed = 700 + power * 750; // unit/s
    const dy = -BALL_START_Y; // hedef y = 0
    const flightTime = Math.abs(dy) / speed;

    // Inaccuracy: sweet spot'lardan uzaklaştıkça nişanı bozar
    const inacc = (1 - accuracy) * 80;
    const inaccX = (Math.random() - 0.5) * 2 * inacc;
    const inaccZ = (Math.random() - 0.5) * 2 * inacc * 0.5;

    // Hedef = kale içinde nişan; topun gerçek x'i scenario.ballX'ten başlar
    const targetX = aim.x + inaccX;
    const targetZ = Math.max(5, aim.z + inaccZ);

    const dx = targetX - scenario.ballX;
    const vy = dy / flightTime;
    const vx = dx / flightTime;
    const vz = (targetZ + 0.5 * GRAVITY * flightTime * flightTime) / flightTime;

    const b = ballRef.current;
    b.vx = vx;
    b.vy = vy;
    b.vz = vz;
    b.swerve = curve * 220; // magnus lateral force
    b.spin = curve;
    b.x = scenario.ballX;
    b.y = BALL_START_Y;
    b.z = 0;
    b.wallChecked = false;
    b.landed = false;
    b.trail = [];

    // ================================================================
    // KALECİ AI: yetenek skoru, reaksiyon, tahmin hatası, falso algılama,
    //            uçuş esnasında hedefe yaklaşma (tracking).
    // ================================================================
    const k = keeperRef.current;
    const lvl = levelRef.current;
    // Skill curve: lvl 1-15 tam doluyor (önceden 1-10), sınırsız level destekler
    const skill = Math.min(1, Math.max(0, (lvl - 1) / 14));
    const gs = getGoalSize(lvl);

    // Reaksiyon süresi: agresif scaling
    const baseReact = 0.32 - skill * 0.24; // 0.32 → 0.08
    const powerLag = power * 0.05;
    k.diveTimer = Math.max(0.05, baseReact + powerLag);

    // Uzanma hızı: çok daha agresif
    k.reachSpeed = 0.95 + skill * 1.05; // 0.95 → 2.00

    // Save reach radius: lvl 1'de 32, lvl 15+'de 50
    k.saveRadius = 32 + skill * 18;

    // Tahmin hatası: agresif düşer
    const errorMag = (1 - skill) * 95 + 8;
    let predX = aim.x + (Math.random() - 0.5) * errorMag;
    let predZ = aim.z + (Math.random() - 0.5) * errorMag * 0.4;

    // Top kalitesi etkisi: oyuncu sweet spot'ları kaçırırsa kaleci avantaj kazanır
    if (accuracy < 0.7) {
      // Inaccuracy kaleciye fayda — top zaten kayıyor
      predX = predX * 0.5 + (aim.x + inaccX) * 0.5;
    }

    // Üst köşe penaltisi: kale tavanına uzanmak zor (daha hafifletildi — keeper güçlendi)
    const topRatio = aim.z / gs.height;
    if (topRatio > 0.7) k.reachSpeed *= 0.82;
    if (topRatio > 0.88) k.reachSpeed *= 0.88;

    // Yan şut tahmini: lvl 2+ doğru yöne meyleder
    if (skill > 0.15) {
      const sideHint = Math.sign(aim.x) * gs.width * 0.22 * skill;
      predX = predX * 0.6 + sideHint * 0.4;
    }

    // Falso algılama: lvl 3+ yüksek ihtimalle algılar
    const detectsCurve = skill > 0.18 && Math.random() < 0.4 + skill * 0.55;
    if (detectsCurve) {
      const curveDrift = curve * 110 * (0.5 + skill * 0.5);
      predX += curveDrift;
    }

    // Sınır
    const maxReachX = gs.width / 2 + 30;
    predX = Math.max(-maxReachX, Math.min(maxReachX, predX));
    predZ = Math.max(0, Math.min(gs.height + 12, predZ));

    k.targetX = predX;
    k.targetZ = predZ;
    k.diveX = k.x;
    k.diveZ = 0;
    k.diving = false;
    // Tracking lvl 3+ ve daha güçlü
    k.tracks = skill > 0.15;
    k.commitTimer = 0.50 + skill * 0.20; // yüksek lvl daha uzun izler

    // Kuzu vuruş animasyonu
    kuzuRef.current.kickPhase = 1;
  }, []);

  // ============================================================
  // SONUÇ İŞLEME
  // ============================================================
  const handleResult = useCallback((type: ResultType) => {
    let bonus = 0;
    let text = "";
    let color = "#ffffff";
    const aim = lockedAimRef.current;
    const power = lockedPowerRef.current;
    const curve = Math.abs(lockedCurveRef.current);

    if (type === "goal") {
      bonus = 100;
      const gs = getGoalSize(levelRef.current);
      const scenario = scenarioRef.current;
      const accuracy = accuracyRef.current;
      const lvl = levelRef.current;

      // Üst köşe bonusu
      if (aim.z > gs.height * 0.6) bonus += 30;
      if (Math.abs(aim.x) > gs.width * 0.32) bonus += 40;
      if (Math.abs(aim.x) > gs.width * 0.32 && aim.z > gs.height * 0.6) bonus += 60; // üst köşe
      // Güç bonusu
      bonus += Math.floor(power * 40);
      // Falso bonusu
      if (curve > 0.3) bonus += 30;
      if (curve > 0.6) bonus += 40;
      // Sweet spot perfect bonusu
      if (accuracy >= 0.99) bonus += 60;
      // Senaryo bonusu (köşe vuruşu, açı vs.)
      bonus += scenario.bonus;
      // Worldie: üst köşe + falso + power = mega bonus
      if (aim.z > gs.height * 0.7 && Math.abs(aim.x) > gs.width * 0.35 && curve > 0.5 && power > 0.6) {
        bonus += 150;
      }
      // Level çarpanı (yüksek lvl'da daha çok puan)
      const lvlMult = 1 + Math.max(0, lvl - 4) * 0.08;
      bonus = Math.floor(bonus * lvlMult);
      // Combo
      comboRef.current += 1;
      let comboMult = 1;
      if (comboRef.current >= 3) comboMult = 1.4;
      if (comboRef.current >= 5) comboMult = 1.7;
      if (comboRef.current >= 8) comboMult = 2.0;
      if (comboRef.current >= 12) comboMult = 2.5;
      bonus = Math.floor(bonus * comboMult);

      scoreRef.current += bonus;
      goalsRef.current += 1;

      const callout = goalCallout(bonus);
      text = comboRef.current >= 3 ? `${callout.text} x${comboRef.current}` : callout.text;
      color = callout.color;

      // Görsel efektler: net bulge, konfeti, ekran flash
      const ballX = ballRef.current.x;
      const ballZ = ballRef.current.z;
      netBulgeRef.current = { x: ballX, z: ballZ, intensity: 1 };
      flashRef.current = 0.5;
      // Konfeti: rastgele renkli partiküller
      const goalScreen = project(ballX, GOAL_Y, ballZ);
      const colors = ["#ff3333", "#5dd95d", "#5b9eff", "#ffd700", "#c264ff", "#ff8800"];
      for (let i = 0; i < 60; i++) {
        particlesRef.current.push({
          x: goalScreen.x,
          y: goalScreen.y,
          vx: (Math.random() - 0.5) * 8,
          vy: -3 - Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1.5 + Math.random() * 1,
          size: 3 + Math.random() * 4,
        });
      }

      // Replay trail kaydet
      replayTrailRef.current = [...ballRef.current.trail];

      // Level artışı (sınırsız)
      const newLevel = Math.floor(goalsRef.current / 3) + 1;
      if (newLevel > levelRef.current) {
        levelRef.current = newLevel;
        floatsRef.current.push({
          x: CANVAS_W / 2,
          y: 100,
          text: `LEVEL ${newLevel}!`,
          color: "#ffd700",
          vy: -1.5,
          life: 2.5,
        });
        // Rüzgar lvl 3+
        if (newLevel >= 3) {
          windRef.current = (Math.random() - 0.5) * (0.5 + (newLevel - 3) * 0.12);
        }
      }
    } else {
      comboRef.current = 0;
      missesRef.current += 1;
      if (type === "save") {
        text = "KALECİ KURTARDI!";
        color = "#ffaa00";
      } else if (type === "wall") {
        text = "DUVARA ÇARPTI!";
        color = "#ff5555";
      } else if (type === "post") {
        text = "DİREĞE ÇARPTI!";
        color = "#ffaa00";
      } else {
        text = "IŞKA!";
        color = "#ff5555";
      }
    }

    floatsRef.current.push({
      x: CANVAS_W / 2,
      y: 200,
      text,
      color,
      vy: -0.8,
      life: 2,
    });
    shakeRef.current = type === "goal" ? 0.4 : 0.7;

    resultRef.current = {
      type,
      text,
      bonus,
      until: Date.now() + 1500,
    };
    phaseRef.current = "result";
  }, []);

  const handleResultEnd = useCallback(() => {
    if (missesRef.current >= 3) {
      phaseRef.current = "game-over";
      onGameOver(scoreRef.current);
      return;
    }
    // Yeni rüzgar — lvl 3+ olası, lvl arttıkça daha sık ve daha güçlü
    const lvl = levelRef.current;
    if (lvl >= 3 && Math.random() < 0.35 + lvl * 0.04) {
      windRef.current = (Math.random() - 0.5) * (0.4 + lvl * 0.1);
    } else if (lvl >= 3) {
      windRef.current = 0;
    }
    resultRef.current = null;
    resetForNextShot();
  }, [onGameOver, resetForNextShot]);

  // ============================================================
  // GAME LOOP
  // ============================================================
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

  // ============================================================
  // UPDATE
  // ============================================================
  const update = useCallback(
    (dt: number) => {
      const phase = phaseRef.current;
      kuzuRef.current.idle += dt;

      // Reticle hareketi (aim fazı)
      if (phase === "aim") {
        const r = reticleRef.current;
        const gs = getGoalSize(levelRef.current);
        const speedMult = 1 + (levelRef.current - 1) * 0.15;
        r.x += r.vx * dt * speedMult;
        r.y += r.vy * dt * speedMult;
        const maxX = gs.width / 2 - 15;
        const maxY = gs.height - 15;
        if (r.x > maxX) {
          r.x = maxX;
          r.vx = -Math.abs(r.vx);
        }
        if (r.x < -maxX) {
          r.x = -maxX;
          r.vx = Math.abs(r.vx);
        }
        if (r.y > maxY) {
          r.y = maxY;
          r.vy = -Math.abs(r.vy);
        }
        if (r.y < 10) {
          r.y = 10;
          r.vy = Math.abs(r.vy);
        }
      }

      // Power bar (power fazı) — yüksek lvl çok daha hızlı
      if (phase === "power") {
        const p = powerBarRef.current;
        const speed = 1.4 + (levelRef.current - 1) * 0.14;
        p.value += p.dir * speed * dt;
        if (p.value >= 1) {
          p.value = 1;
          p.dir = -1;
        }
        if (p.value <= 0) {
          p.value = 0;
          p.dir = 1;
        }
      }

      // Curve bar (curve fazı)
      if (phase === "curve") {
        const c = curveBarRef.current;
        const speed = 1.6 + (levelRef.current - 1) * 0.16;
        c.value += c.dir * speed * dt;
        if (c.value >= 1) {
          c.value = 1;
          c.dir = -1;
        }
        if (c.value <= -1) {
          c.value = -1;
          c.dir = 1;
        }
      }

      // Top fiziği (flying)
      if (phase === "flying") {
        const b = ballRef.current;

        // Magnus + rüzgar
        b.vx += b.swerve * dt;
        b.vx += windRef.current * 50 * dt;
        // Yerçekimi
        b.vz -= GRAVITY * dt;
        // Hava sürtünmesi
        b.vx *= 1 - AIR_DRAG * dt;
        b.vy *= 1 - AIR_DRAG * dt;

        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.rotation += dt * 12;

        // Trail
        b.trail.push({ x: b.x, y: b.y, z: b.z });
        if (b.trail.length > 30) b.trail.shift();

        // Yere çarpma
        if (b.z < 0 && !b.landed) {
          b.z = 0;
          b.vz = -b.vz * 0.35;
          b.vx *= 0.7;
          b.vy *= 0.85;
          if (Math.abs(b.vz) < 30) {
            b.vz = 0;
            b.landed = true;
          }
        }

        // Duvar çarpışması
        if (!b.wallChecked && b.y <= WALL_Y) {
          b.wallChecked = true;
          const wallCount = getWallCount(levelRef.current);
          const wallWidth = wallCount * 36;
          const wallHeight = Math.min(105, 70 + levelRef.current * 3.5);
          if (wallCount > 0 && Math.abs(b.x) < wallWidth / 2 && b.z < wallHeight && b.z > 0) {
            // Çarptı
            b.vy = -b.vy * 0.3;
            b.vx += (Math.random() - 0.5) * 100;
            b.vz = 200;
            handleResult("wall");
            return;
          }
        }

        // Kaleci hareketi
        const k = keeperRef.current;
        if (k.diveTimer > 0) {
          k.diveTimer -= dt;
          if (k.diveTimer <= 0) k.diving = true;
        }
        // Tracking: yüksek lvl kaleciler topu izleyerek hedefini günceller
        if (k.tracks && k.commitTimer > 0) {
          k.commitTimer -= dt;
          // Top hedeften ne kadar farklıysa, hedefini gerçek topa doğru kaydır
          // Ama aim'i tamamen unutmaz — karışım yapar
          const trackRate = 1.6 * dt;
          k.targetX += (b.x - k.targetX) * trackRate;
          k.targetZ += (b.z - k.targetZ) * trackRate;
        }
        if (k.diving) {
          const dx = k.targetX - k.diveX;
          const dz = k.targetZ - k.diveZ;
          // Hız reachSpeed ile ölçekli; uzaktan başlarken hızlı, yaklaşırken yavaşlar
          const reachRate = 4.2 * k.reachSpeed * dt;
          k.diveX += dx * reachRate;
          k.diveZ += dz * reachRate;
        }

        // Goal line geçti mi?
        if (b.y <= GOAL_Y) {
          const gs = getGoalSize(levelRef.current);
          // İçeride mi?
          const inGoalX = Math.abs(b.x) < gs.width / 2;
          const inGoalZ = b.z > 0 && b.z < gs.height;

          if (inGoalX && inGoalZ) {
            // Direk kontrolü (kenar)
            const distFromPostX = gs.width / 2 - Math.abs(b.x);
            const distFromCrossbar = gs.height - b.z;
            if (distFromPostX < 6 || distFromCrossbar < 6) {
              handleResult("post");
              return;
            }
            // Kaleci kurtardı mı?
            const dx = b.x - k.diveX;
            const dz = b.z - k.diveZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < k.saveRadius) {
              handleResult("save");
              return;
            }
            handleResult("goal");
            return;
          } else {
            handleResult("miss");
            return;
          }
        }

        // Top çok geç kaldıysa (yere çarpıp yuvarlandı vs.)
        if (b.landed && b.y < 200) {
          handleResult("miss");
          return;
        }
      }

      // Sonuç ekranından çıkış
      if (phase === "result" && resultRef.current && Date.now() > resultRef.current.until) {
        handleResultEnd();
      }

      // Float texts
      for (const f of floatsRef.current) {
        f.y += f.vy;
        f.life -= dt;
      }
      floatsRef.current = floatsRef.current.filter((f) => f.life > 0);

      // Konfeti partikülleri
      for (const p of particlesRef.current) {
        p.vy += 18 * dt; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
      }
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // Net bulge decay
      if (netBulgeRef.current) {
        netBulgeRef.current.intensity -= dt * 1.2;
        if (netBulgeRef.current.intensity <= 0) netBulgeRef.current = null;
      }

      // Flash decay
      if (flashRef.current > 0) flashRef.current -= dt * 1.8;

      // Smooth score animasyonu
      if (displayScoreRef.current < scoreRef.current) {
        const diff = scoreRef.current - displayScoreRef.current;
        const tickRate = Math.max(1, Math.ceil(diff * dt * 6));
        displayScoreRef.current = Math.min(scoreRef.current, displayScoreRef.current + tickRate);
      }

      // Crowd wave
      crowdPhaseRef.current += dt * 1.5;

      // Shake decay
      if (shakeRef.current > 0) shakeRef.current -= dt;

      // Kuzu kick anim
      if (kuzuRef.current.kickPhase > 0) {
        kuzuRef.current.kickPhase += dt * 4;
        if (kuzuRef.current.kickPhase > 3) kuzuRef.current.kickPhase = 0;
      }
    },
    [handleResult, handleResultEnd]
  );

  // ============================================================
  // DRAW
  // ============================================================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const shake = shakeRef.current;
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0;
    ctx.save();
    ctx.translate(sx, sy);

    drawStadium(ctx);
    drawField(ctx);
    drawReplayTrail(ctx);
    drawGoal(ctx);
    drawWall(ctx);
    drawKeeper(ctx);
    drawKuzu(ctx);
    drawBall(ctx);
    drawWindFlag(ctx);
    drawParticles(ctx);

    ctx.restore();

    drawScreenFlash(ctx);
    drawHUD(ctx);
    drawScenarioLabel(ctx);
    drawPhaseUI(ctx);
    drawFloats(ctx);
    drawResultOverlay(ctx);
    drawGameOverOverlay(ctx);
    drawReadyPrompt(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Stadyum arka plan =====
  function drawStadium(ctx: CanvasRenderingContext2D) {
    // Gökyüzü gradient
    const grad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    grad.addColorStop(0, "#0a1530");
    grad.addColorStop(1, "#1a2850");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y);

    // Spot ışıkları
    for (let i = 0; i < 5; i++) {
      const x = (i + 0.5) * (CANVAS_W / 5);
      const lg = ctx.createRadialGradient(x, 0, 0, x, 0, 200);
      lg.addColorStop(0, "rgba(255,255,200,0.18)");
      lg.addColorStop(1, "rgba(255,255,200,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(x - 200, 0, 400, 200);
    }

    // Tribün
    ctx.fillStyle = "#15182a";
    ctx.fillRect(0, HORIZON_Y - 30, CANVAS_W, 30);
    // Seyirci noktaları
    for (let i = 0; i < 200; i++) {
      const x = (i * 13) % CANVAS_W;
      const y = HORIZON_Y - 28 + ((i * 7) % 25);
      ctx.fillStyle = `hsl(${(i * 23) % 360}, 50%, 30%)`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Reklam panelleri
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, HORIZON_Y, CANVAS_W, 6);
    ctx.fillStyle = "#1e6f4a";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5) * (CANVAS_W / 6);
      ctx.fillText("KUZU SÖZLÜK", x, HORIZON_Y + 5);
    }
  }

  // ===== Çim =====
  function drawField(ctx: CanvasRenderingContext2D) {
    // Yatay çim şeritleri (perspektif)
    const stripes = 8;
    for (let i = 0; i < stripes; i++) {
      const t1 = i / stripes;
      const t2 = (i + 1) / stripes;
      const y1 = HORIZON_Y + 6 + t1 * (CANVAS_H - HORIZON_Y - 6);
      const y2 = HORIZON_Y + 6 + t2 * (CANVAS_H - HORIZON_Y - 6);
      ctx.fillStyle = i % 2 === 0 ? "#1f7a3a" : "#1a6a32";
      ctx.fillRect(0, y1, CANVAS_W, y2 - y1);
    }

    // Penaltı yayı (perspektif basit elips)
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(CANVAS_W / 2, project(0, 200, 0).y, 220, 28, 0, Math.PI, 0);
    ctx.stroke();

    // Top noktası
    const bp = project(0, BALL_START_Y, 0);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(bp.x, bp.y + 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===== Kale =====
  function drawGoal(ctx: CanvasRenderingContext2D) {
    const gs = getGoalSize(levelRef.current);
    const halfW = gs.width / 2;
    const tl = project(-halfW, GOAL_Y, gs.height);
    const tr = project(halfW, GOAL_Y, gs.height);
    const bl = project(-halfW, GOAL_Y, 0);
    const br = project(halfW, GOAL_Y, 0);

    // Ağ (gölgeli arka plan)
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    // Ağ ızgarası — net bulge'a göre çarpıtılır
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    const cols = 14;
    const rows = 8;

    const bulge = netBulgeRef.current;
    let bulgeScreen: { x: number; y: number } | null = null;
    if (bulge) {
      bulgeScreen = project(bulge.x, GOAL_Y, bulge.z);
    }

    function distortPoint(x: number, y: number) {
      if (!bulge || !bulgeScreen) return { x, y };
      const dx = x - bulgeScreen.x;
      const dy = y - bulgeScreen.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const radius = 50;
      if (d > radius) return { x, y };
      const f = (1 - d / radius) * bulge.intensity * 18;
      // İçeriye doğru itme (kameradan uzaklaştırma efekti yerine yanlara açma)
      return {
        x: x + (dx / Math.max(1, d)) * f * 0.3,
        y: y + (dy / Math.max(1, d)) * f * 0.3,
      };
    }

    for (let i = 1; i < cols; i++) {
      const t = i / cols;
      const x1 = tl.x + (tr.x - tl.x) * t;
      const x2 = bl.x + (br.x - bl.x) * t;
      const p1 = distortPoint(x1, tl.y);
      const p2 = distortPoint(x2, bl.y);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let j = 1; j < rows; j++) {
      const t = j / rows;
      const y1 = tl.y + (bl.y - tl.y) * t;
      const xs = tl.x + (bl.x - tl.x) * t;
      const xe = tr.x + (br.x - tr.x) * t;
      const p1 = distortPoint(xs, y1);
      const p2 = distortPoint(xe, y1);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Direkler & üst direk
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.stroke();

    // Direk gölgeleri
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(tl.x, tl.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ===== Duvar (defansörler) =====
  function drawWall(ctx: CanvasRenderingContext2D) {
    const wallCount = getWallCount(levelRef.current);
    if (wallCount === 0) return;
    const wallHeight = Math.min(105, 70 + levelRef.current * 3.5);
    const totalW = wallCount * 36;
    for (let i = 0; i < wallCount; i++) {
      const wx = -totalW / 2 + 18 + i * 36;
      const headPos = project(wx, WALL_Y, wallHeight);
      const feetPos = project(wx, WALL_Y, 0);
      const w = 30 * feetPos.scale;
      const h = feetPos.y - headPos.y;

      // Gölge
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(feetPos.x, feetPos.y + 4, w * 0.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vücut (forma)
      ctx.fillStyle = "#a82828";
      ctx.fillRect(feetPos.x - w / 2, headPos.y + 18 * feetPos.scale, w, h - 18 * feetPos.scale);

      // Şort
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(feetPos.x - w / 2, feetPos.y - 22 * feetPos.scale, w, 12 * feetPos.scale);

      // Bacaklar
      ctx.fillStyle = "#e8b894";
      ctx.fillRect(feetPos.x - w / 3, feetPos.y - 12 * feetPos.scale, w / 4, 10 * feetPos.scale);
      ctx.fillRect(feetPos.x + w / 12, feetPos.y - 12 * feetPos.scale, w / 4, 10 * feetPos.scale);

      // Kafa
      ctx.fillStyle = "#e8b894";
      ctx.beginPath();
      ctx.arc(feetPos.x, headPos.y + 10 * feetPos.scale, 9 * feetPos.scale, 0, Math.PI * 2);
      ctx.fill();

      // Saç
      ctx.fillStyle = "#3a1808";
      ctx.beginPath();
      ctx.arc(feetPos.x, headPos.y + 6 * feetPos.scale, 10 * feetPos.scale, Math.PI, 0);
      ctx.fill();

      // Eller önde (kasıkları kapatıyor)
      ctx.fillStyle = "#e8b894";
      ctx.fillRect(feetPos.x - w / 4, feetPos.y - 30 * feetPos.scale, 6 * feetPos.scale, 8 * feetPos.scale);
      ctx.fillRect(feetPos.x + w / 8, feetPos.y - 30 * feetPos.scale, 6 * feetPos.scale, 8 * feetPos.scale);
    }
  }

  // ===== Kaleci =====
  function drawKeeper(ctx: CanvasRenderingContext2D) {
    const k = keeperRef.current;
    const baseX = k.diving ? k.diveX : k.x;
    const baseZ = k.diving ? k.diveZ : 0;
    const feet = project(baseX, GOAL_Y + 20, baseZ);
    const head = project(baseX, GOAL_Y + 20, baseZ + 60);
    const w = 24 * feet.scale;

    // Gölge
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y + 4, w * 0.7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Forma (sarı)
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(feet.x - w / 2, head.y + 14, w, feet.y - head.y - 14);

    // Şort
    ctx.fillStyle = "#1a1a2a";
    ctx.fillRect(feet.x - w / 2, feet.y - 18, w, 10);

    // Eldiven (uzanmış)
    ctx.fillStyle = "#d8d8e8";
    if (k.diving) {
      // Kollar açık
      ctx.fillRect(feet.x - w / 2 - 14, head.y + 16, 14, 6);
      ctx.fillRect(feet.x + w / 2, head.y + 16, 14, 6);
    } else {
      ctx.fillRect(feet.x - w / 2 - 8, head.y + 16, 8, 14);
      ctx.fillRect(feet.x + w / 2, head.y + 16, 8, 14);
    }

    // Kafa
    ctx.fillStyle = "#e8b894";
    ctx.beginPath();
    ctx.arc(feet.x, head.y + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Saç
    ctx.fillStyle = "#1a1a2a";
    ctx.beginPath();
    ctx.arc(feet.x, head.y + 4, 9, Math.PI, 0);
    ctx.fill();

    // Gözler
    ctx.fillStyle = "#fff";
    ctx.fillRect(feet.x - 4, head.y + 8, 2, 2);
    ctx.fillRect(feet.x + 2, head.y + 8, 2, 2);
  }

  // ===== KUZU (oyuncu) =====
  function drawKuzu(ctx: CanvasRenderingContext2D) {
    const ballPos = project(0, BALL_START_Y, 0);
    const cx = ballPos.x - 50;
    const cy = ballPos.y - 5;
    const kick = kuzuRef.current.kickPhase;
    const idle = Math.sin(kuzuRef.current.idle * 2) * 1.5;

    // Gölge
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy + 30, 28, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bacaklar (siyah küçük)
    ctx.fillStyle = "#1a1a1a";
    if (kick > 0 && kick < 1.5) {
      // Vuruş anı: sağ bacak ileride
      ctx.fillRect(cx - 8, cy + 18, 5, 12);
      ctx.save();
      ctx.translate(cx + 12, cy + 22);
      ctx.rotate(-0.6);
      ctx.fillRect(-3, 0, 6, 14);
      ctx.restore();
    } else {
      ctx.fillRect(cx - 8, cy + 18, 5, 12);
      ctx.fillRect(cx + 4, cy + 18, 5, 12);
    }

    // Vücut (yumuşak yün)
    ctx.fillStyle = "#fafafa";
    // Ana vücut elipsi
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy + 8 + idle, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Yün topakları
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = cx + 6 + Math.cos(angle) * 22;
      const py = cy + 8 + idle + Math.sin(angle) * 16;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Kafa (yuvarlak)
    ctx.fillStyle = "#f5e6d8";
    ctx.beginPath();
    ctx.arc(cx - 14, cy + idle, 12, 0, Math.PI * 2);
    ctx.fill();

    // Üst kıvırcık tepelik
    ctx.fillStyle = "#fafafa";
    ctx.beginPath();
    ctx.arc(cx - 18, cy - 10 + idle, 6, 0, Math.PI * 2);
    ctx.arc(cx - 12, cy - 13 + idle, 7, 0, Math.PI * 2);
    ctx.arc(cx - 6, cy - 10 + idle, 5, 0, Math.PI * 2);
    ctx.fill();

    // Kulaklar (pembe iç)
    ctx.fillStyle = "#f5e6d8";
    ctx.beginPath();
    ctx.ellipse(cx - 22, cy + 2 + idle, 4, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy + 2 + idle, 4, 7, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb5c5";
    ctx.beginPath();
    ctx.ellipse(cx - 22, cy + 3 + idle, 2, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy + 3 + idle, 2, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Gözler
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(cx - 17, cy + idle, 1.8, 0, Math.PI * 2);
    ctx.arc(cx - 11, cy + idle, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Göz parıltısı
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - 17, cy - 1 + idle, 1, 1);
    ctx.fillRect(cx - 11, cy - 1 + idle, 1, 1);

    // Burun (küçük üçgen)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 4 + idle);
    ctx.lineTo(cx - 13, cy + 6 + idle);
    ctx.lineTo(cx - 15, cy + 6 + idle);
    ctx.fill();

    // Ağız (mutlu çizgi)
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy + 7 + idle);
    ctx.quadraticCurveTo(cx - 14, cy + 9 + idle, cx - 13, cy + 7 + idle);
    ctx.stroke();

    // Kaptan kol bandı (kırmızı)
    ctx.fillStyle = "#a82828";
    ctx.fillRect(cx + 22, cy + 4 + idle, 10, 4);
  }

  // ===== Top =====
  function drawBall(ctx: CanvasRenderingContext2D) {
    const b = ballRef.current;
    const phase = phaseRef.current;
    let bx: number, by: number, bs: number;

    if (phase === "flying" || phase === "result") {
      // Trail
      for (let i = 0; i < b.trail.length - 1; i++) {
        const a = b.trail[i];
        const p = project(a.x, a.y, a.z);
        const alpha = i / b.trail.length;
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * (alpha + 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
      const p = project(b.x, b.y, b.z);
      bx = p.x;
      by = p.y;
      bs = p.scale;
    } else {
      const p = project(0, BALL_START_Y, 0);
      bx = p.x;
      by = p.y - 8;
      bs = p.scale;
    }

    // Top gölgesi (zemin)
    if (phase === "flying" || phase === "result") {
      const ground = project(b.x, b.y, 0);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(ground.x, ground.y + 2, 8 * bs, 3 * bs, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(bx, by + 8, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const r = 11 * bs;
    // Top
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pentagon paterni (basit)
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(b.rotation);
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.5);
    for (let i = 1; i <= 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
    }
    ctx.fill();
    ctx.restore();
  }

  // ===== Rüzgar göstergesi =====
  function drawWindFlag(ctx: CanvasRenderingContext2D) {
    if (Math.abs(windRef.current) < 0.05) return;
    const wx = 60;
    const wy = HORIZON_Y + 20;
    // Direk
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx, wy - 30);
    ctx.stroke();
    // Bayrak
    ctx.fillStyle = "#ff5555";
    ctx.beginPath();
    ctx.moveTo(wx, wy - 30);
    ctx.lineTo(wx + windRef.current * 25, wy - 22);
    ctx.lineTo(wx, wy - 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("rüzgar", wx, wy + 10);
  }

  // ===== Konfeti partikülleri =====
  function drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of particlesRef.current) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // ===== Replay trail (gol attıktan sonra son trajektori) =====
  function drawReplayTrail(ctx: CanvasRenderingContext2D) {
    if (phaseRef.current !== "result") return;
    if (replayTrailRef.current.length < 2) return;
    if (resultRef.current?.type !== "goal") return;
    ctx.strokeStyle = "rgba(255, 215, 0, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i < replayTrailRef.current.length; i++) {
      const t = replayTrailRef.current[i];
      const p = project(t.x, t.y, t.z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ===== Ekran flash (gol olunca beyaz parlak) =====
  function drawScreenFlash(ctx: CanvasRenderingContext2D) {
    if (flashRef.current <= 0) return;
    ctx.fillStyle = `rgba(255, 255, 255, ${flashRef.current * 0.5})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // ===== Senaryo etiketi (HUD altında) =====
  function drawScenarioLabel(ctx: CanvasRenderingContext2D) {
    const phase = phaseRef.current;
    if (phase !== "ready" && phase !== "aim" && phase !== "power" && phase !== "curve") return;
    const s = scenarioRef.current;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(CANVAS_W - 170, 42, 160, 24);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(CANVAS_W - 170, 42, 160, 24);
    ctx.fillStyle = "#daa520";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`◆ ${s.name}`, CANVAS_W - 12, 58);
    if (s.bonus > 0) {
      ctx.fillStyle = "#5dd95d";
      ctx.textAlign = "left";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`+${s.bonus}`, CANVAS_W - 165, 58);
    }
  }

  // ===== HUD (üst) =====
  function drawHUD(ctx: CanvasRenderingContext2D) {
    // Üst bar arka plan
    const grad = ctx.createLinearGradient(0, 0, 0, 42);
    grad.addColorStop(0, "rgba(0,0,0,0.85)");
    grad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, 42);

    // Skor (smooth tick) — büyük
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "left";
    const scoreStr = displayScoreRef.current.toString().padStart(6, "0");
    ctx.fillText(scoreStr, 12, 28);

    // Skor etiketi
    ctx.fillStyle = "#888";
    ctx.font = "9px monospace";
    ctx.fillText("SKOR", 12, 38);

    // Goller
    ctx.fillStyle = "#daa520";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`⚽ ${goalsRef.current}`, 130, 26);

    // Level + progress bar (3 golde 1 lvl)
    const lvl = levelRef.current;
    const goalsInLvl = goalsRef.current % 3;
    ctx.fillStyle = "#5dd95d";
    ctx.fillText(`LVL ${lvl}`, 195, 26);
    // Mini progress bar
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(265, 18, 60, 8);
    ctx.fillStyle = "#5dd95d";
    ctx.fillRect(265, 18, 60 * (goalsInLvl / 3), 8);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(265, 18, 60, 8);

    // Combo flame
    if (comboRef.current >= 2) {
      const cmb = comboRef.current;
      let flame = "🔥";
      if (cmb >= 8) flame = "🔥🔥🔥";
      else if (cmb >= 5) flame = "🔥🔥";
      ctx.fillStyle = "#ff8800";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${flame} x${cmb}`, 345, 26);
    }

    // Iska göstergeleri (sağ)
    ctx.textAlign = "right";
    ctx.fillStyle = "#aaa";
    ctx.font = "bold 10px monospace";
    ctx.fillText("ıska", CANVAS_W - 78, 18);
    for (let i = 0; i < 3; i++) {
      const cx = CANVAS_W - 60 + i * 18;
      const cy = 28;
      ctx.beginPath();
      if (i < missesRef.current) {
        // X mark
        ctx.fillStyle = "#ff3333";
        ctx.fillRect(cx - 7, cy - 7, 14, 14);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4);
        ctx.lineTo(cx + 4, cy + 4);
        ctx.moveTo(cx + 4, cy - 4);
        ctx.lineTo(cx - 4, cy + 4);
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(cx - 7, cy - 7, 14, 14);
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 7, cy - 7, 14, 14);
      }
    }
  }

  // ===== Faz UI: aim/power/curve =====
  function drawPhaseUI(ctx: CanvasRenderingContext2D) {
    const phase = phaseRef.current;

    // AIM: kale içinde reticle
    if (phase === "aim") {
      const r = reticleRef.current;
      const p = project(r.x, GOAL_Y + 5, r.y);
      // Halka
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      // İç +
      ctx.beginPath();
      ctx.moveTo(p.x - 8, p.y);
      ctx.lineTo(p.x + 8, p.y);
      ctx.moveTo(p.x, p.y - 8);
      ctx.lineTo(p.x, p.y + 8);
      ctx.stroke();
      // Pulse
      const pulse = (Math.sin(Date.now() / 100) + 1) / 2;
      ctx.strokeStyle = `rgba(255,80,80,${pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();

      drawPrompt(ctx, "1/3 — yatay & dikey nişan: tıkla");
    }

    if (phase === "power") {
      // Lock'lanmış nişanı göster
      const a = lockedAimRef.current;
      const p = project(a.x, GOAL_Y + 5, a.z);
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Power bar (sağ tarafta dikey)
      const bx = CANVAS_W - 60;
      const by = 100;
      const bw = 28;
      const bh = 360;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Sweet spot zone (yeşil pulse)
      const pb = powerBarRef.current;
      const sweetMin = pb.sweetCenter - pb.sweetWidth / 2;
      const sweetMax = pb.sweetCenter + pb.sweetWidth / 2;
      const szY1 = by + bh - sweetMax * (bh - 4) - 2;
      const szY2 = by + bh - sweetMin * (bh - 4) - 2;
      const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
      ctx.fillStyle = `rgba(93, 217, 93, ${0.35 + pulse * 0.35})`;
      ctx.fillRect(bx + 1, szY1, bw - 2, szY2 - szY1);
      ctx.strokeStyle = "#5dd95d";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, szY1, bw - 2, szY2 - szY1);

      // Dolgu (kademeli renk)
      const v = pb.value;
      const fillH = v * (bh - 4);
      const fy = by + bh - 2 - fillH;
      const grad = ctx.createLinearGradient(0, by + bh, 0, by);
      grad.addColorStop(0, "#3a8a3a");
      grad.addColorStop(0.6, "#daa520");
      grad.addColorStop(1, "#ff3333");
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(bx + 2, fy, bw - 4, fillH);
      ctx.globalAlpha = 1;

      // İndikatör çizgisi (mevcut değer)
      ctx.fillStyle = "#fff";
      ctx.fillRect(bx - 4, fy - 1, bw + 8, 2);

      // Yazı
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText("GÜÇ", bx + bw / 2, by - 6);
      ctx.fillText(`${Math.round(v * 100)}`, bx + bw / 2, by + bh + 14);

      drawPrompt(ctx, "2/3 — yeşil bölgede tıkla!");
    }

    if (phase === "curve") {
      // Lock'lanmış nişan
      const a = lockedAimRef.current;
      const p = project(a.x, GOAL_Y + 5, a.z);
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Curve bar (alt yatay)
      const bx = CANVAS_W / 2 - 180;
      const by = CANVAS_H - 95;
      const bw = 360;
      const bh = 26;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Sweet spot zone (mavi pulse)
      const cb = curveBarRef.current;
      const sweetMin = cb.sweetCenter - cb.sweetWidth / 2;
      const sweetMax = cb.sweetCenter + cb.sweetWidth / 2;
      const szX1 = bx + bw / 2 + (sweetMin * bw) / 2;
      const szX2 = bx + bw / 2 + (sweetMax * bw) / 2;
      const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
      ctx.fillStyle = `rgba(91, 158, 255, ${0.35 + pulse * 0.35})`;
      ctx.fillRect(szX1, by + 1, szX2 - szX1, bh - 2);
      ctx.strokeStyle = "#5b9eff";
      ctx.lineWidth = 2;
      ctx.strokeRect(szX1, by + 1, szX2 - szX1, bh - 2);

      // Orta çizgi
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by);
      ctx.lineTo(bx + bw / 2, by + bh);
      ctx.stroke();

      // İndikatör
      const v = cb.value;
      const ix = bx + bw / 2 + (v * bw) / 2;
      ctx.fillStyle = "#fff";
      ctx.fillRect(ix - 3, by - 4, 6, bh + 8);

      // Etiketler
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "left";
      ctx.fillText("← falso", bx, by - 6);
      ctx.textAlign = "right";
      ctx.fillText("falso →", bx + bw, by - 6);

      drawPrompt(ctx, "3/3 — mavi bölgede tıkla!");
    }
  }

  function drawPrompt(ctx: CanvasRenderingContext2D, text: string) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(CANVAS_W / 2 - 150, CANVAS_H - 50, 300, 32);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(CANVAS_W / 2 - 150, CANVAS_H - 50, 300, 32);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H - 30);
  }

  // ===== Float texts =====
  function drawFloats(ctx: CanvasRenderingContext2D) {
    for (const f of floatsRef.current) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 4;
      // Büyük metinler için scale'i uzunlukla artır
      const isMega = f.text.includes("GOLAZO") || f.text.includes("DÜNYA") || f.text.includes("LEVEL");
      const isBig = f.text.includes("GOL") || f.text.includes("SÜPER") || f.text.includes("PERFECT");
      let size = 22;
      if (isMega) size = 38;
      else if (isBig) size = 28;
      // Pop-in animasyonu (life > 1.5'te hızlı büyür)
      const popScale = f.life > 1.5 ? 1 + (f.life - 1.5) * 0.4 : 1;
      ctx.font = `bold ${Math.floor(size * popScale)}px monospace`;
      ctx.textAlign = "center";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  // ===== Sonuç overlay =====
  function drawResultOverlay(ctx: CanvasRenderingContext2D) {
    if (phaseRef.current !== "result" || !resultRef.current) return;
    const r = resultRef.current;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, CANVAS_H - 80, CANVAS_W, 30);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("devam etmek için tıkla", CANVAS_W / 2, CANVAS_H - 60);
  }

  // ===== Game over overlay =====
  function drawGameOverOverlay(ctx: CanvasRenderingContext2D) {
    if (phaseRef.current !== "game-over") return;
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Mega text
    ctx.fillStyle = "#ff5555";
    ctx.font = "bold 44px monospace";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.strokeText("OYUN BİTTİ", CANVAS_W / 2, 180);
    ctx.fillText("OYUN BİTTİ", CANVAS_W / 2, 180);

    // Skor box
    ctx.fillStyle = "rgba(218, 165, 32, 0.15)";
    ctx.fillRect(CANVAS_W / 2 - 150, 220, 300, 130);
    ctx.strokeStyle = "#daa520";
    ctx.lineWidth = 3;
    ctx.strokeRect(CANVAS_W / 2 - 150, 220, 300, 130);

    ctx.fillStyle = "#daa520";
    ctx.font = "bold 14px monospace";
    ctx.fillText("FİNAL SKOR", CANVAS_W / 2, 245);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px monospace";
    ctx.fillText(scoreRef.current.toString(), CANVAS_W / 2, 285);

    ctx.fillStyle = "#aaa";
    ctx.font = "12px monospace";
    ctx.fillText(`${goalsRef.current} gol · level ${levelRef.current}`, CANVAS_W / 2, 310);

    if (comboRef.current > 0 || goalsRef.current >= 5) {
      ctx.fillStyle = "#ff8800";
      ctx.fillText(`max combo: x${comboRef.current}`, CANVAS_W / 2, 330);
    }

    ctx.fillStyle = "#5dd95d";
    ctx.font = "bold 16px monospace";
    ctx.fillText("→ yeniden oynamak için tıkla", CANVAS_W / 2, 410);
  }

  // ===== Ready prompt =====
  function drawReadyPrompt(ctx: CanvasRenderingContext2D) {
    if (phaseRef.current !== "ready") return;
    const s = scenarioRef.current;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(CANVAS_W / 2 - 200, CANVAS_H - 90, 400, 50);
    ctx.strokeStyle = "#daa520";
    ctx.lineWidth = 2;
    ctx.strokeRect(CANVAS_W / 2 - 200, CANVAS_H - 90, 400, 50);
    ctx.fillStyle = "#daa520";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`◆ ${s.name.toUpperCase()}${s.bonus > 0 ? `   bonus +${s.bonus}` : ""}`, CANVAS_W / 2, CANVAS_H - 70);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.fillText("vurmak için tıkla → nişan / güç / falso", CANVAS_W / 2, CANVAS_H - 52);
  }

  // ============================================================
  // INPUT HANDLERS
  // ============================================================
  const handleClick = useCallback(() => {
    if (!running) return;
    handleTap();
  }, [running, handleTap]);

  // Klavye: space veya enter
  useEffect(() => {
    if (!running) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, handleTap]);

  // ============================================================
  // RENDER
  // ============================================================
  if (!running) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">🐑⚽</div>
          <h2 className="text-lg font-bold mb-2">kuzu freekick</h2>
          <p className="text-xs text-muted-foreground mb-4">
            3 aşamalı vuruş: <b>nişan</b> → <b>güç</b> → <b>falso</b>. duvardan veya kaleciden geçer mi?
            3 ıska = oyun biter. her gol seviyeyi artırır.
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
        onClick={handleClick}
        onTouchStart={(e) => {
          e.preventDefault();
          handleClick();
        }}
        className="border border-border rounded max-w-full cursor-pointer"
        style={{ width: "100%", maxWidth: CANVAS_W, height: "auto", touchAction: "manipulation" }}
      />
      <div className="mt-2 text-[10px] text-muted-foreground text-center">
        tıkla / boşluk: vur · 3 ıska = oyun biter
      </div>
    </div>
  );
}
