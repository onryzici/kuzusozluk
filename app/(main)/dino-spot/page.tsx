"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { redirect } from "next/navigation";
import DinoOyun from "@/components/oyun/DinoOyun";
import { Trophy, Gamepad2, Clock } from "lucide-react";

type ScoreEntry = {
  username: string;
  avatarUrl: string | null;
  maxScore?: number;
  score?: number;
  playCount?: number;
  createdAt?: string;
};

export default function DinoSpotSayfa() {
  const { data: session, status } = useSession();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [tab, setTab] = useState<"en-yuksek" | "son">("en-yuksek");
  const [lastScore, setLastScore] = useState<number | null>(null);

  const role = (session?.user as any)?.role;

  // Admin-only guard
  useEffect(() => {
    if (status === "authenticated" && role !== "ADMIN") {
      redirect("/");
    }
  }, [status, role]);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(`/api/oyun/skor?tip=${tab}`);
      const data = await res.json();
      if (data.success) setScores(data.data);
    } catch {}
  }, [tab]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const handleGameOver = useCallback(async (score: number) => {
    setLastScore(score);
    if (score > 0) {
      try {
        await fetch("/api/oyun/skor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score }),
        });
        // Skorları yenile
        const res = await fetch(`/api/oyun/skor?tip=${tab}`);
        const data = await res.json();
        if (data.success) setScores(data.data);
      } catch {}
    }
  }, [tab]);

  if (status === "loading") {
    return (
      <div className="w-full px-4 lg:px-8 py-12 text-center text-muted-foreground text-sm">
        yukleniyor...
      </div>
    );
  }

  if (!session?.user || role !== "ADMIN") {
    return null;
  }

  return (
    <div className="w-full px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Gamepad2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">dino-tml</h1>
          <p className="text-xs text-muted-foreground">
            tml kosuyor. tombul siselerden kac, skor kas, yazarlar arasinda birinci ol.
          </p>
        </div>
      </div>

      {/* Oyun */}
      <div className="mb-6">
        <DinoOyun onGameOver={handleGameOver} />
        {lastScore !== null && lastScore > 0 && (
          <div className="text-center mt-2 text-sm">
            son skor: <span className="font-bold text-primary">{lastScore}</span>
          </div>
        )}
      </div>

      {/* Skor Tablosu */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("en-yuksek")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === "en-yuksek"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" /> en yuksek skorlar
          </button>
          <button
            onClick={() => setTab("son")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === "son"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> son oyunlar
          </button>
        </div>

        <div className="divide-y divide-border">
          {scores.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              henuz skor yok. ilk sen oyna!
            </div>
          ) : (
            scores.map((entry, idx) => (
              <div
                key={`${entry.username}-${idx}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors"
              >
                {/* Sıra */}
                <span className={`text-sm font-bold w-6 text-center ${
                  idx === 0 ? "text-yellow-500" :
                  idx === 1 ? "text-gray-400" :
                  idx === 2 ? "text-amber-600" :
                  "text-muted-foreground"
                }`}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                </span>

                {/* Avatar placeholder */}
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {entry.username.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{entry.username}</span>
                  {entry.playCount && (
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {entry.playCount} oyun
                    </span>
                  )}
                </div>

                {/* Score */}
                <span className="text-sm font-mono font-bold text-primary">
                  {(entry.maxScore || entry.score || 0).toString().padStart(5, "0")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test modu uyarısı */}
      <div className="mt-4 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
        test modu — sadece adminler gorebilir. canliya alinca herkes erisebilecek.
      </div>
    </div>
  );
}
