"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Plus, Trash2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

type UkdeItem = {
  id: string;
  title: string;
  authorUsername: string;
  authorId: string;
  createdAt: string;
};

type Props = {
  initialData: UkdeItem[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  currentUserRole: string | null;
};

export default function UkdeListesi({ initialData, isLoggedIn, currentUserId, currentUserRole }: Props) {
  const [ukdeler, setUkdeler] = useState(initialData);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ukde", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        setUkdeler([{
          id: json.data.id,
          title: json.data.title,
          authorUsername: json.data.author.username,
          authorId: json.data.authorId,
          createdAt: json.data.createdAt,
        }, ...ukdeler]);
        setTitle("");
      } else {
        setError(json.error?.message || "bir hata oluştu");
      }
    } catch {
      setError("bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(ukde: UkdeItem) {
    try {
      const res = await fetch(`/api/ukde/${ukde.id}`, { method: "POST" });
      if (res.ok) {
        router.push(`/baslik/yeni?title=${encodeURIComponent(ukde.title)}`);
      }
    } catch {
      // sessizce devam et
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/ukde/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUkdeler(ukdeler.filter((u) => u.id !== id));
      }
    } catch {
      // sessizce devam et
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <h1 className="text-base font-medium text-foreground">ukde</h1>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        birinin açmasını beklediğin başlıkları buraya bırak. isteyen alıp açsın.
      </p>

      {isLoggedIn && (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="başlık adı ver..."
            maxLength={200}
            className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            ukde ver
          </button>
        </form>
      )}

      {error && (
        <p className="text-xs text-destructive mb-4">{error}</p>
      )}

      {ukdeler.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          henüz ukde yok. ilk sen ver!
        </p>
      ) : (
        <div className="divide-y divide-border/30">
          {ukdeler.map((ukde) => (
            <div key={ukde.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-foreground">{ukde.title}</span>
                <div className="flex items-center gap-2 mt-1">
                  <Link
                    href={`/kullanici/${ukde.authorUsername}`}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {ukde.authorUsername}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(ukde.createdAt), { addSuffix: true, locale: tr })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isLoggedIn && (
                  <button
                    onClick={() => handleClaim(ukde)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    title="bu başlığı aç"
                  >
                    <ArrowRight className="h-3 w-3" /> aç
                  </button>
                )}
                {(currentUserId === ukde.authorId || currentUserRole === "ADMIN") && (
                  <button
                    onClick={() => handleDelete(ukde.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="ukde'yi sil"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
