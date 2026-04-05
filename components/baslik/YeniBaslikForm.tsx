"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EntryEditor from "@/components/entry/EntryEditor";

const DRAFT_KEY = "draft:yeni-baslik";

function loadDraft(): { title: string; content: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.title === "string" && typeof parsed.content === "string") {
      return parsed;
    }
  } catch {}
  return null;
}

export default function YeniBaslikForm({ initialTitle = "" }: { initialTitle?: string }) {
  const router = useRouter();
  const draft = typeof window !== "undefined" ? loadDraft() : null;
  const [title, setTitle] = useState(initialTitle || draft?.title || "");
  const [content, setContent] = useState(draft?.content || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // draft kaydet
  const saveDraft = useCallback((t: string, c: string) => {
    try {
      if (t || c) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: t, content: c }));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {}
  }, []);

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    saveDraft(newTitle, content);
  }

  function handleContentChange(newContent: string) {
    setContent(newContent);
    saveDraft(title, newContent);
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

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

      clearDraft();
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
          onChange={(e) => handleTitleChange(e.target.value)}
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
          onChange={handleContentChange}
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
