"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import SpotMacerasiOyun from "@/components/oyun/SpotMacerasiOyun";
import { Trophy, Swords, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Leader = {
  username: string;
  charName: string;
  level: number;
  bossesKilled: number;
  totalKills: number;
};

export default function SpotMacerasiSayfa() {
  const { status } = useSession();
  const [save, setSave] = useState<any | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Leader[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/oyun/rpg");
      const data = await res.json();
      if (data.success) {
        setSave(data.data.save);
        setLeaderboard(data.data.leaderboard);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchData();
    else if (status === "unauthenticated") setLoaded(true);
  }, [status, fetchData]);

  const handleSave = useCallback(
    async (char: any, bossesKilled: number) => {
      try {
        await fetch("/api/oyun/rpg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            charName: char.charName,
            level: char.level,
            bossesKilled,
            totalKills: char.totalKills,
            data: char,
          }),
        });
        // Leaderboard'u tazelemek için arka planda çek
        fetchData();
      } catch {}
    },
    [fetchData]
  );

  if (status === "loading" || !loaded) {
    return (
      <div className="w-full px-4 lg:px-8 py-12 text-center text-muted-foreground text-sm">
        yükleniyor...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="w-full px-4 lg:px-8 py-12 max-w-2xl mx-auto">
        <Link
          href="/atari-salonu"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> atari salonu
        </Link>
        <div className="border border-border rounded-lg p-8 text-center">
          <Swords className="h-8 w-8 mx-auto mb-3 text-primary" />
          <h2 className="text-lg font-bold mb-2">spot macerası</h2>
          <p className="text-xs text-muted-foreground">
            oynamak için giriş yapman gerek. save'ler hesabına bağlı.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <Link
        href="/atari-salonu"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> atari salonu
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Swords className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">spot macerası</h1>
          <p className="text-xs text-muted-foreground">
            5 dungeon, 5 boss (tml, korç, yss, sog, mpiç). save'in otomatik kaydedilir.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <SpotMacerasiOyun initialSave={save} onSave={handleSave} />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-primary/5">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">en güçlü maceracılar</span>
        </div>
        <div className="divide-y divide-border">
          {leaderboard.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              henüz kimse oynamadı. ilk sen ol!
            </div>
          ) : (
            leaderboard.map((entry, idx) => (
              <div
                key={entry.username}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors"
              >
                <span
                  className={`text-sm font-bold w-6 text-center ${
                    idx === 0
                      ? "text-yellow-500"
                      : idx === 1
                      ? "text-gray-400"
                      : idx === 2
                      ? "text-amber-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                </span>
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{entry.username}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {entry.charName} · {entry.totalKills} kill
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-primary">lvl {entry.level}</div>
                  <div className="text-[10px] text-yellow-500">
                    👑 {entry.bossesKilled}/5
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
