"use client";

import { useState } from "react";
import { Send } from "lucide-react";

type YorumFormProps = {
  entryId: string;
  onYorumEklendi: (comment: {
    id: string;
    content: string;
    createdAt: string;
    author: { username: string; avatarUrl: string | null };
  }) => void;
};

export default function YorumForm({ entryId, onYorumEklendi }: YorumFormProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/entry/${entryId}/yorum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Yorum eklenemedi");
        return;
      }

      onYorumEklendi(json.data);
      setContent("");
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="yorum yaz..."
          maxLength={1000}
          rows={1}
          className="flex-1 text-xs bg-background border border-border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-40 transition-colors"
          title="Gönder"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </form>
  );
}
