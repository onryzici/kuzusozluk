"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function KonusmaSil({ username }: { username: string }) {
  const [onay, setOnay] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function sil() {
    setLoading(true);
    try {
      const res = await fetch("/api/mesaj/sil", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        router.push("/mesajlar");
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setOnay(false);
    }
  }

  if (onay) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">emin misin?</span>
        <button
          onClick={sil}
          disabled={loading}
          className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          {loading ? "siliniyor..." : "evet, sil"}
        </button>
        <button
          onClick={() => setOnay(false)}
          className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80"
        >
          iptal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOnay(true)}
      className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
      title="konusmayi sil"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
