"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import EntryEditor from "@/components/entry/EntryEditor";

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
    <div className="max-w-3xl mx-auto px-4 py-6">
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
