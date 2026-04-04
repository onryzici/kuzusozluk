"use client";

import { useState } from "react";
import { Ban } from "lucide-react";

type Props = {
  targetUsername: string;
  initialIsBlocked: boolean;
};

export default function EngelleButon({ targetUsername, initialIsBlocked }: Props) {
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/kullanici/${targetUsername}/engelle`, {
        method: isBlocked ? "DELETE" : "POST",
      });
      if (res.ok) setIsBlocked(!isBlocked);
    } catch {
      // sessizce devam et
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1 text-xs transition-colors ${
        isBlocked
          ? "text-destructive hover:text-destructive/80"
          : "text-muted-foreground hover:text-destructive"
      } disabled:opacity-50`}
    >
      <Ban className="h-3 w-3" />
      {isBlocked ? "engeli kaldır" : "engelle"}
    </button>
  );
}
