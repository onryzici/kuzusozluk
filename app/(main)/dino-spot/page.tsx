"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { redirect } from "next/navigation";
import DinoOyun from "@/components/oyun/DinoOyun";
import { Trophy, Gamepad2 } from "lucide-react";

type ScoreEntry = {
  username: string;
  avatarUrl: string | null;
  score: number;
  updatedAt: string;
};

export default function DinoSpotSayfa() {
  const { data: session, status } = useSession();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "authenticated" && role !== "ADMIN") {
      redirect("/");
    }
  }, [status, role]);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch("/api/oyun/skor");
      const data = await res.json();
      if (data.success) setScores(data.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const handleGameOver = useCallback(async (score: number) => {
    setLastScore(score);
    setIsNewBest(false);
    if (score > 0) {
      try {
        const res = await fetch("/api/oyun/skor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score }),
        });
        const data = await res.json();
        if (data.success && data.data.isNewBest) {
          setIsNewBest(true);
        }
        fetchScores();
      } catch {}
    }
  }, [fetchScores]);

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
      <div className="flex items-center gap-3 mb-6">
        <Gamepad2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">dino-tml</h1>
          <p className="text-xs text-muted-foreground">
            tml kosuyor. tombul siselerden kac, skor kas, yazarlar arasinda birinci ol.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <DinoOyun onGameOver={handleGameOver} />
        {lastScore !== null && lastScore > 0 && (
          <div className="text-center mt-2 text-sm">
            son skor: <span className="font-bold text-primary">{lastScore}</span>
            {isNewBest && (
              <span className="ml-2 text-yellow-500 font-bold">yeni rekor!</span>
            )}
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-primary/5">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">en yuksek skorlar</span>
        </div>

        <div className="divide-y divide-border">
          {scores.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              henuz skor yok. ilk sen oyna!
            </div>
          ) : (
            scores.map((entry, idx) => (
              <div
                key={entry.username}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors"
              >
                <span className={`text-sm font-bold w-6 text-center ${
                  idx === 0 ? "text-yellow-500" :
                  idx === 1 ? "text-gray-400" :
                  idx === 2 ? "text-amber-600" :
                  "text-muted-foreground"
                }`}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                </span>

                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {entry.username.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{entry.username}</span>
                </div>

                <span className="text-sm font-mono font-bold text-primary">
                  {entry.score.toString().padStart(5, "0")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
        test modu — sadece adminler gorebilir. canliya alinca herkes erisebilecek.
      </div>
    </div>
  );
}
