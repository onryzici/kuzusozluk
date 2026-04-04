"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import EntryEditor from "@/components/entry/EntryEditor";
import { BarChart3, Plus, X } from "lucide-react";
import { toast } from "sonner";

type Suggestion = {
  title: string;
  slug: string;
  entryCount: number;
};

type BaslikYokSayfaProps = {
  title: string;
  slug: string;
  suggestions: Suggestion[];
  isLoggedIn: boolean;
};

export default function BaslikYokSayfa({ title, slug, suggestions, isLoggedIn }: BaslikYokSayfaProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // anket
  const [anketOpen, setAnketOpen] = useState(false);
  const [anketSoru, setAnketSoru] = useState("");
  const [anketSecenekler, setAnketSecenekler] = useState(["", ""]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed) {
      setError("entry bos birakilamaz.");
      return;
    }
    if (trimmed.length < 3) {
      setError("entry en az 3 karakter olmali.");
      return;
    }
    if (trimmed.length > 5000) {
      setError("entry en fazla 5000 karakter olabilir.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // create topic first
      const topicRes = await fetch("/api/baslik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const topicJson = await topicRes.json();

      if (!topicJson.success) {
        if (topicJson.error.code !== "TITLE_EXISTS") {
          setError(topicJson.error.message);
          return;
        }
      }

      const actualSlug = topicJson.success ? topicJson.data.slug : slug;

      // then write the first entry
      const entryRes = await fetch(`/api/baslik/${actualSlug}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const entryJson = await entryRes.json();

      if (!entryJson.success) {
        setError(entryJson.error.message);
        return;
      }

      // anket varsa oluştur
      if (anketOpen && anketSoru.trim() && anketSecenekler.filter(s => s.trim()).length >= 2) {
        try {
          await fetch(`/api/baslik/${actualSlug}/anket`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: anketSoru.trim().toLowerCase(),
              options: anketSecenekler.filter(s => s.trim()).map(s => s.toLowerCase()),
            }),
          });
        } catch {}
      }

      toast.success("başlık oluşturuldu");
      window.dispatchEvent(new Event("sidebar:refresh"));
      router.push(`/baslik/${actualSlug}`);
      router.refresh();
    } catch {
      setError("bir hata olustu, tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-primary mb-4">{title}</h1>

      <p className="text-muted-foreground mb-6">
        sozluk&apos;te boyle bir baslik yok.
      </p>

      {suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">bunu demek istemis olabilir misiniz:</p>
          <div className="space-y-1">
            {suggestions.map((s) => (
              <Link
                key={s.slug}
                href={`/baslik/${s.slug}`}
                className="block text-sm font-medium hover:text-primary transition-colors"
              >
                {s.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {isLoggedIn ? (
        <div>
          <div className="border rounded-lg p-1 mb-4">
            <Button variant="ghost" size="sm" className="text-xs font-medium" disabled>
              biri bu basligi doldursun
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <EntryEditor
              value={content}
              onChange={setContent}
              placeholder={`"${title}" hakkinda bilgi verin`}
              rows={6}
              maxLength={5000}
              disabled={isSubmitting}
            />

            {/* anket ekleme */}
            <div className="border border-border/50 rounded-md p-3">
              {!anketOpen ? (
                <button
                  type="button"
                  onClick={() => setAnketOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> anket ekle (isteğe bağlı)
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">anket</span>
                    <button type="button" onClick={() => setAnketOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    value={anketSoru}
                    onChange={(e) => setAnketSoru(e.target.value)}
                    placeholder="soru..."
                    className="w-full text-sm px-2 py-1.5 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {anketSecenekler.map((s, i) => (
                    <div key={i} className="flex gap-1">
                      <input
                        value={s}
                        onChange={(e) => {
                          const yeni = [...anketSecenekler];
                          yeni[i] = e.target.value;
                          setAnketSecenekler(yeni);
                        }}
                        placeholder={`seçenek ${i + 1}`}
                        className="flex-1 text-sm px-2 py-1 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {anketSecenekler.length > 2 && (
                        <button type="button" onClick={() => setAnketSecenekler(anketSecenekler.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive px-1">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {anketSecenekler.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setAnketSecenekler([...anketSecenekler, ""])}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
                    >
                      <Plus className="h-3 w-3" /> seçenek ekle
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "gonderiliyor..." : "yolla"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            bu basligi acmak icin giris yapmalisiniz.
          </p>
          <Link href="/giris" className="text-sm text-primary font-medium hover:underline">
            giris yap
          </Link>
        </div>
      )}
    </div>
  );
}
