"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export default function MesajForm({
  receiverUsername,
}: {
  receiverUsername: string;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/mesaj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverUsername,
          content: content.trim(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || "Mesaj gönderilemedi");
        return;
      }

      setContent("");
      router.refresh();
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      {error && (
        <p className="text-sm text-destructive mb-2">{error}</p>
      )}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Mesajınızı yazın..."
          maxLength={2000}
          rows={2}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="self-end shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-right">
        {content.length}/2000
      </p>
    </form>
  );
}
