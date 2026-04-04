"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EntryEditor from "@/components/entry/EntryEditor";

export default function YeniBaslikForm({ initialTitle = "" }: { initialTitle?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError("başlık boş bırakılamaz.");
      return;
    }
    if (trimmedTitle.length < 3) {
      setError("başlık en az 3 karakter olmalı.");
      return;
    }
    if (trimmedTitle.length > 200) {
      setError("başlık en fazla 200 karakter olabilir.");
      return;
    }
    if (!trimmedContent) {
      setError("ilk entry boş bırakılamaz.");
      return;
    }
    if (trimmedContent.length < 3) {
      setError("entry en az 3 karakter olmalı.");
      return;
    }
    if (trimmedContent.length > 5000) {
      setError("entry en fazla 5000 karakter olabilir.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // create topic
      const topicRes = await fetch("/api/baslik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle }),
      });
      const topicJson = await topicRes.json();

      if (!topicJson.success) {
        setError(topicJson.error.message);
        return;
      }

      const slug = topicJson.data.slug;

      // create first entry
      const entryRes = await fetch(`/api/baslik/${slug}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmedContent }),
      });
      const entryJson = await entryRes.json();

      if (!entryJson.success) {
        setError(entryJson.error.message);
        return;
      }

      window.dispatchEvent(new Event("sidebar:refresh"));
      router.push(`/baslik/${slug}`);
      router.refresh();
    } catch {
      setError("bir hata oluştu, tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-1.5">
        <label htmlFor="title" className="text-xs text-muted-foreground">
          başlık
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="başlık girin"
          className="text-sm"
          maxLength={200}
          disabled={isSubmitting}
        />
        <span className="text-xs text-muted-foreground">
          {title.length}/200
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          ilk entry
        </label>
        <EntryEditor
          value={content}
          onChange={setContent}
          placeholder="bu başlık hakkında ilk entry'yi yazın"
          rows={6}
          maxLength={5000}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "gönderiliyor..." : "yolla"}
        </Button>
      </div>
    </form>
  );
}
