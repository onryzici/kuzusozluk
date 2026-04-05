"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EntryEditor from "@/components/entry/EntryEditor";
import { toast } from "sonner";

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

type YeniBaslikFormProps = {
  initialTitle?: string;
  draftId?: string;
  initialContent?: string;
};

export default function YeniBaslikForm({ initialTitle = "", draftId, initialContent }: YeniBaslikFormProps) {
  const router = useRouter();
  const draft = typeof window !== "undefined" ? loadDraft() : null;
  const [title, setTitle] = useState(initialTitle || draft?.title || "");
  const [content, setContent] = useState(initialContent || draft?.content || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

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

  async function handleSaveDraft() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      setError("taslak için başlık en az 3 karakter olmalı.");
      return;
    }

    setIsSavingDraft(true);
    setError("");
    try {
      const url = draftId ? `/api/taslak/${draftId}` : "/api/taslak";
      const method = draftId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, content: content }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("taslak kaydedildi");
        clearDraft();
      } else {
        setError(json.error?.message || "taslak kaydedilemedi");
      }
    } catch {
      setError("bir hata oluştu");
    } finally {
      setIsSavingDraft(false);
    }
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

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting || isSavingDraft}
        >
          {isSavingDraft ? "kaydediliyor..." : "taslak kaydet"}
        </Button>
        <Button type="submit" disabled={isSubmitting || isSavingDraft}>
          {isSubmitting ? "gönderiliyor..." : "yolla"}
        </Button>
      </div>
    </form>
  );
}
