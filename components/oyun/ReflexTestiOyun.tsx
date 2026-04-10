"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Phase = "menu" | "wait" | "ready" | "result" | "tooEarly" | "done";

type Props = { onGameOver: (score: number) => void };

const ROUNDS = 5;

export default function ReflexTestiOyun({ onGameOver }: Props) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [results, setResults] = useState<number[]>([]);
  const [currentMs, setCurrentMs] = useState<number | null>(null);
  const startTimeRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startRound = useCallback(() => {
    setPhase("wait");
    setCurrentMs(null);
    const delay = 1500 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setPhase("ready");
    }, delay);
  }, []);

  const startGame = useCallback(() => {
    setResults([]);
    startRound();
  }, [startRound]);

  const handleClick = useCallback(() => {
    if (phase === "wait") {
      // Erken tıkladı
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase("tooEarly");
      return;
    }
    if (phase === "ready") {
      const ms = Math.round(performance.now() - startTimeRef.current);
      setCurrentMs(ms);
      const newResults = [...results, ms];
      setResults(newResults);
      if (newResults.length >= ROUNDS) {
        setPhase("done");
        // Skor: 5000 - ortalama ms (düşük süre = yüksek skor)
        const avg = newResults.reduce((a, b) => a + b, 0) / newResults.length;
        const score = Math.max(0, Math.round(5000 - avg * 5));
        onGameOver(score);
      } else {
        setPhase("result");
      }
      return;
    }
    if (phase === "result") {
      startRound();
      return;
    }
    if (phase === "tooEarly") {
      startRound();
      return;
    }
    if (phase === "done") {
      setPhase("menu");
      return;
    }
  }, [phase, results, startRound, onGameOver]);

  // Klavye desteği
  useEffect(() => {
    if (phase === "menu") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, handleClick]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (phase === "menu") {
    return (
      <div className="flex flex-col items-center">
        <div className="border border-border rounded-lg p-6 bg-card max-w-md text-center">
          <div className="text-4xl mb-2">⚡</div>
          <h2 className="text-lg font-bold mb-2">reflex testi</h2>
          <p className="text-xs text-muted-foreground mb-4">
            ekran yeşilleninde olabildiğince çabuk tıkla. {ROUNDS} tur ortalaması alınır.
            erken tıklarsan tur yenilenir. düşük ms = yüksek skor.
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

  let bg = "bg-card";
  let textColor = "text-foreground";
  let mainText = "";
  let subText = "";

  if (phase === "wait") {
    bg = "bg-red-600";
    textColor = "text-white";
    mainText = "BEKLE...";
    subText = "yeşil olunca tıkla";
  } else if (phase === "ready") {
    bg = "bg-green-500";
    textColor = "text-white";
    mainText = "TIKLA!";
    subText = "şimdi!";
  } else if (phase === "result") {
    bg = "bg-blue-600";
    textColor = "text-white";
    mainText = `${currentMs} ms`;
    subText = `tur ${results.length}/${ROUNDS} — devam için tıkla`;
  } else if (phase === "tooEarly") {
    bg = "bg-orange-600";
    textColor = "text-white";
    mainText = "ÇOK ERKEN!";
    subText = "yeşili bekle — tekrar için tıkla";
  } else if (phase === "done") {
    const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
    const score = Math.max(0, Math.round(5000 - avg * 5));
    bg = "bg-purple-700";
    textColor = "text-white";
    mainText = `ortalama: ${avg} ms`;
    subText = `skor: ${score} — yeniden için tıkla`;
  }

  return (
    <div
      onClick={handleClick}
      onTouchStart={(e) => {
        e.preventDefault();
        handleClick();
      }}
      className={`w-full ${bg} ${textColor} rounded-lg flex flex-col items-center justify-center cursor-pointer select-none`}
      style={{ minHeight: 480, touchAction: "manipulation" }}
    >
      <div className="text-5xl font-bold mb-3 font-mono">{mainText}</div>
      <div className="text-sm opacity-80">{subText}</div>
      {results.length > 0 && phase !== "done" && (
        <div className="mt-6 flex gap-2 text-xs font-mono">
          {results.map((r, i) => (
            <span key={i} className="px-2 py-1 bg-black/20 rounded">
              {r}ms
            </span>
          ))}
        </div>
      )}
      {phase === "done" && (
        <div className="mt-6 flex gap-2 text-xs font-mono flex-wrap justify-center">
          {results.map((r, i) => (
            <span key={i} className="px-2 py-1 bg-black/30 rounded">
              {r}ms
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
