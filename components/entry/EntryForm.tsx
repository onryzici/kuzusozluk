"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import EntryEditor from "@/components/entry/EntryEditor";
import { toast } from "sonner";

type EntryFormProps = {
  topicSlug: string;
};

export default function EntryForm({ topicSlug }: EntryFormProps) {
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
      const res = await fetch(`/api/baslik/${topicSlug}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error.message);
      } else {
        setContent("");
        toast.success("entry gönderildi");
        router.refresh();
        window.dispatchEvent(new Event("sidebar:refresh"));
      }
    } catch {
      setError("bir hata olustu, tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 border-t pt-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <EntryEditor
          value={content}
          onChange={setContent}
          placeholder="entry yaz..."
          rows={5}
          maxLength={5000}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-end">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "gonderiliyor..." : "yolla"}
          </Button>
        </div>
      </form>
    </div>
  );
}
