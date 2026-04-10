"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Phase = "menu" | "show" | "input" | "correct" | "wrong" | "gameover";

type Props = { onGameOver: (score: number) => void };

function getGridSize(level: number): number {
  if (level < 5) return 4;
  if (level < 10) return 5;
  if (level < 16) return 6;
  return 7;
}

function getPatternSize(level: number): number {
  return Math.min(getGridSize(level) * getGridSize(level) - 4, 2 + level);
}

export default function HatirlaOyun({ onGameOver }: Props) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [pattern, setPattern] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showError, setShowError] = useState<Set<number>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generatePattern = useCallback((lvl: number) => {
    const grid = getGridSize(lvl);
    const total = grid * grid;
    const size = getPatternSize(lvl);
    const indices: number[] = [];
    while (indices.length < size) {
      const r = Math.floor(Math.random() * total);
      if (!indices.includes(r)) indices.push(r);
    }
    return new Set(indices);
  }, []);

  const startLevel = useCallback(
    (lvl: number) => {
      const p = generatePattern(lvl);
      setPattern(p);
      setSelected(new Set());
      setShowError(new Set());
      setPhase("show");
      // Pattern'i göster, sonra gizle
      const showTime = Math.max(800, 2000 - lvl * 70);
      timeoutRef.current = setTimeout(() => {
        setPhase("input");
      }, showTime);
    },
    [generatePattern]
  );

  const startGame = useCallback(() => {
    setLevel(1);
    setLives(3);
    setScore(0);
    startLevel(1);
  }, [startLevel]);

  const handleCellClick = useCallback(
    (idx: number) => {
      if (phase !== "input") return;
      if (selected.has(idx)) return;

      if (pattern.has(idx)) {
        // Doğru
        const newSelected = new Set(selected);
        newSelected.add(idx);
        setSelected(newSelected);
        if (newSelected.size === pattern.size) {
          // Level tamam
          const lvlScore = level * 100 + pattern.size * 10;
          setScore((s) => s + lvlScore);
          setPhase("correct");
          timeoutRef.current = setTimeout(() => {
            const next = level + 1;
            setLevel(next);
            startLevel(next);
          }, 600);
        }
      } else {
        // Yanlış
        const errs = new Set(showError);
        errs.add(idx);
        setShowError(errs);
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setPhase("gameover");
          // Skor: ulaşılan level + biriken puan
          const finalScore = score + level * 50;
          onGameOver(finalScore);
        } else {
          setPhase("wrong");
          timeoutRef.current = setTimeout(() => {
            setShowError(new Set());
            setPhase("input");
          }, 600);
        }
      }
    },
    [phase, pattern, selected, showError, lives, level, score, startLevel, onGameOver]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (phase === "menu") {
    return (
      <div className="border border-border rounded-lg p-6 bg-card max-w-md mx-auto text-center">
        <div className="text-4xl mb-2">🧠</div>
        <h2 className="text-lg font-bold mb-2">hatırla</h2>
        <p className="text-xs text-muted-foreground mb-4">
          beliren kareleri ezberle, kaybolduğunda aynı sıra ile tıkla. 3 hata = oyun biter.
          her level daha çok kare.
        </p>
        <button
          onClick={startGame}
          className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
        >
          başla
        </button>
      </div>
    );
  }

  if (phase === "gameover") {
    return (
      <div className="border border-red-500/50 rounded-lg p-6 bg-card max-w-md mx-auto text-center">
        <div className="text-4xl mb-2">💀</div>
        <h2 className="text-lg font-bold mb-2 text-red-400">oyun bitti</h2>
        <p className="text-xs text-muted-foreground mb-1">
          ulaştığın level: <b className="text-primary">{level}</b>
        </p>
        <p className="text-sm font-bold mb-4 text-yellow-500">skor: {score + level * 50}</p>
        <button
          onClick={startGame}
          className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
        >
          yeniden
        </button>
      </div>
    );
  }

  const grid = getGridSize(level);
  const total = grid * grid;

  return (
    <div className="border border-border rounded-lg p-4 bg-card max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="font-bold text-primary">LEVEL {level}</div>
        <div className="text-yellow-500 font-bold">{score} pts</div>
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={i < lives ? "text-red-500" : "text-muted-foreground/30"}>
              ❤
            </span>
          ))}
        </div>
      </div>

      <div
        className="grid gap-1.5 mb-3"
        style={{ gridTemplateColumns: `repeat(${grid}, 1fr)` }}
      >
        {Array.from({ length: total }).map((_, i) => {
          let bg = "bg-background border border-border";
          if (phase === "show" && pattern.has(i)) {
            bg = "bg-blue-500 border-blue-300";
          } else if (phase === "input" && selected.has(i)) {
            bg = "bg-green-500 border-green-300";
          } else if (showError.has(i)) {
            bg = "bg-red-500 border-red-300";
          } else if (phase === "correct" && pattern.has(i)) {
            bg = "bg-green-500 border-green-300";
          }
          return (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              className={`aspect-square rounded ${bg} transition-colors`}
              style={{ minHeight: 30 }}
            />
          );
        })}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        {phase === "show" && "ezberle..."}
        {phase === "input" && `tıkla — ${pattern.size - selected.size} kaldı`}
        {phase === "correct" && "✓ doğru!"}
        {phase === "wrong" && "✗ yanlış"}
      </div>
    </div>
  );
}
