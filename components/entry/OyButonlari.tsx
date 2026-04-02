"use client";

import { useOylama } from "@/hooks/useOylama";
import { ChevronUp, ChevronDown, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type OyButonlariProps = {
  entryId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote: "UP" | "DOWN" | null;
  initialFavorited: boolean;
};

export default function OyButonlari({
  entryId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote,
  initialFavorited,
}: OyButonlariProps) {
  const { upvotes, downvotes, userVote, oyVer } = useOylama(
    entryId,
    initialUpvotes,
    initialDownvotes,
    initialUserVote
  );
  const [favorited, setFavorited] = useState(initialFavorited);

  async function toggleFavori() {
    const prev = favorited;
    setFavorited(!favorited);
    try {
      const res = await fetch(`/api/entry/${entryId}/favori`, {
        method: favorited ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error();
    } catch {
      setFavorited(prev);
    }
  }

  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => oyVer("UP")}
        className={cn("p-1 transition-colors rounded", userVote === "UP" ? "text-primary" : "text-muted-foreground hover:text-foreground")}
        title="beğen"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <span className={cn("text-xs font-medium tabular-nums min-w-[1ch] text-center", score > 0 && "text-primary", score < 0 && "text-destructive")}>
        {score}
      </span>
      <button
        onClick={() => oyVer("DOWN")}
        className={cn("p-1 transition-colors rounded", userVote === "DOWN" ? "text-destructive" : "text-muted-foreground hover:text-foreground")}
        title="beğenme"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        onClick={toggleFavori}
        className={cn("p-1 transition-colors rounded ml-1", favorited ? "text-amber-400" : "text-muted-foreground hover:text-foreground")}
        title="favorile"
      >
        <Star className={cn("h-3.5 w-3.5", favorited && "fill-current")} />
      </button>
    </div>
  );
}
