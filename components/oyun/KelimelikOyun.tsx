"use client";

import { useEffect, useState, useCallback } from "react";
import { rastgeleKelime, gecerliKelimeMi } from "@/lib/kelimeler";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

type LetterState = "empty" | "correct" | "present" | "absent";

type Props = { onGameOver: (score: number) => void };

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i"],
  ["enter", "z", "c", "v", "b", "n", "m", "ö", "ç", "back"],
];

export default function KelimelikOyun({ onGameOver }: Props) {
  const [target, setTarget] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [error, setError] = useState<string>("");
  const [startTime, setStartTime] = useState<number>(0);
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({});

  const startGame = useCallback(() => {
    const t = rastgeleKelime();
    setTarget(t);
    setGuesses([]);
    setCurrent("");
    setStatus("playing");
    setError("");
    setKeyStates({});
    setStartTime(performance.now());
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  // Harflerin her tahmindeki state'ini hesapla
  function getRowStates(guess: string): LetterState[] {
    const states: LetterState[] = Array(WORD_LENGTH).fill("absent");
    const targetArr = Array.from(target);
    const guessArr = Array.from(guess);
    const targetCount: Record<string, number> = {};
    for (const ch of targetArr) targetCount[ch] = (targetCount[ch] || 0) + 1;

    // Önce correct'leri işaretle
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === targetArr[i]) {
        states[i] = "correct";
        targetCount[guessArr[i]]--;
      }
    }
    // Sonra present'leri
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (states[i] !== "correct" && targetCount[guessArr[i]] > 0) {
        states[i] = "present";
        targetCount[guessArr[i]]--;
      }
    }
    return states;
  }

  function updateKeyStates(guess: string, states: LetterState[]) {
    const next = { ...keyStates };
    for (let i = 0; i < WORD_LENGTH; i++) {
      const k = guess[i];
      const st = states[i];
      // Daha iyi state varsa ezme (correct > present > absent)
      const order = { absent: 0, present: 1, correct: 2 };
      if (!next[k] || order[st as keyof typeof order] > order[(next[k] as "absent" | "present" | "correct") || "absent"]) {
        next[k] = st;
      }
    }
    setKeyStates(next);
  }

  const submitGuess = useCallback(() => {
    if (status !== "playing") return;
    if (current.length !== WORD_LENGTH) {
      setError("5 harf gerekli");
      setTimeout(() => setError(""), 1500);
      return;
    }
    if (!gecerliKelimeMi(current)) {
      setError("kelime listede yok");
      setTimeout(() => setError(""), 1500);
      return;
    }

    const newGuesses = [...guesses, current];
    setGuesses(newGuesses);
    const states = getRowStates(current);
    updateKeyStates(current, states);

    if (current === target) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const guessBonus = (MAX_GUESSES - newGuesses.length + 1) * 200;
      const speedBonus = Math.max(0, 600 - Math.floor(elapsedSec * 5));
      const score = 500 + guessBonus + speedBonus;
      setStatus("won");
      onGameOver(score);
    } else if (newGuesses.length >= MAX_GUESSES) {
      setStatus("lost");
      onGameOver(50); // teselli
    }

    setCurrent("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, status, guesses, target, startTime, onGameOver]);

  const handleKey = useCallback(
    (k: string) => {
      if (status !== "playing") return;
      if (k === "enter") {
        submitGuess();
        return;
      }
      if (k === "back") {
        setCurrent((c) => Array.from(c).slice(0, -1).join(""));
        return;
      }
      if (current.length < WORD_LENGTH) {
        setCurrent((c) => c + k);
      }
    },
    [status, current, submitGuess]
  );

  // Klavye girdisi
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (status !== "playing") return;
      const key = e.key.toLowerCase();
      if (key === "enter") {
        e.preventDefault();
        submitGuess();
      } else if (key === "backspace") {
        e.preventDefault();
        setCurrent((c) => Array.from(c).slice(0, -1).join(""));
      } else if (/^[a-zçğıöşü]$/.test(key)) {
        if (current.length < WORD_LENGTH) setCurrent((c) => c + key);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [status, current, submitGuess]);

  // Mevcut satırları çiz
  const rows: { letters: string[]; states: LetterState[] }[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < guesses.length) {
      const g = guesses[i];
      rows.push({ letters: Array.from(g), states: getRowStates(g) });
    } else if (i === guesses.length && status === "playing") {
      const arr = Array.from(current);
      const letters: string[] = [];
      for (let j = 0; j < WORD_LENGTH; j++) letters.push(arr[j] || "");
      rows.push({ letters, states: Array(WORD_LENGTH).fill("empty") });
    } else {
      rows.push({ letters: Array(WORD_LENGTH).fill(""), states: Array(WORD_LENGTH).fill("empty") });
    }
  }

  function cellColor(s: LetterState) {
    if (s === "correct") return "bg-green-600 border-green-600 text-white";
    if (s === "present") return "bg-yellow-600 border-yellow-600 text-white";
    if (s === "absent") return "bg-zinc-700 border-zinc-700 text-white";
    return "bg-background border-border";
  }

  function keyColor(k: string) {
    const s = keyStates[k];
    if (s === "correct") return "bg-green-600 text-white";
    if (s === "present") return "bg-yellow-600 text-white";
    if (s === "absent") return "bg-zinc-700 text-white";
    return "bg-background text-foreground border border-border";
  }

  return (
    <div className="flex flex-col items-center max-w-md mx-auto">
      {/* Hata mesajı */}
      <div className="h-6 mb-2">
        {error && <div className="text-xs text-red-500 font-bold">{error}</div>}
      </div>

      {/* Tahmin grid */}
      <div className="grid gap-1.5 mb-4">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.letters.map((l, ci) => (
              <div
                key={ci}
                className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl font-bold border-2 rounded ${cellColor(row.states[ci])}`}
              >
                {l.toUpperCase()}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Sonuç */}
      {status === "won" && (
        <div className="mb-3 text-center">
          <div className="text-lg font-bold text-green-500">tebrikler! 🎉</div>
          <div className="text-xs text-muted-foreground">{guesses.length} denemede</div>
          <button onClick={startGame} className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-bold">
            yeni kelime
          </button>
        </div>
      )}
      {status === "lost" && (
        <div className="mb-3 text-center">
          <div className="text-lg font-bold text-red-500">olmadı 💀</div>
          <div className="text-xs text-muted-foreground">
            cevap: <b className="text-foreground">{target}</b>
          </div>
          <button onClick={startGame} className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-bold">
            yeni kelime
          </button>
        </div>
      )}

      {/* Klavye */}
      {status === "playing" && (
        <div className="w-full">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 justify-center mb-1.5">
              {row.map((k) => {
                const isWide = k === "enter" || k === "back";
                return (
                  <button
                    key={k}
                    onClick={() => handleKey(k)}
                    className={`${isWide ? "px-2 text-[10px]" : "w-7 sm:w-8"} h-9 sm:h-10 rounded font-bold text-xs ${keyColor(k)}`}
                  >
                    {k === "back" ? "⌫" : k === "enter" ? "tahmin" : k.toUpperCase()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
