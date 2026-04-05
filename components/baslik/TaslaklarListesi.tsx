"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { formatTarih } from "@/lib/utils/format";

type Draft = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export default function TaslaklarListesi() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/taslak")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDrafts(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    const ok = window.confirm("bu taslağı silmek istediğinize emin misiniz?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/taslak/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        toast.success("taslak silindi");
      }
    } catch {
      toast.error("bir hata oluştu");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-12">yükleniyor...</p>;
  }

  if (drafts.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">henüz taslak yok.</p>;
  }

  return (
    <div className="divide-y divide-border/60">
      {drafts.map((draft) => (
        <div key={draft.id} className="py-3 px-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">{draft.title}</h3>
              {draft.content && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{draft.content}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {formatTarih(draft.updatedAt)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => router.push(`/baslik/yeni?taslak=${draft.id}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-accent"
                title="düzenle ve yayınla"
              >
                <FileEdit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(draft.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded hover:bg-accent"
                title="taslağı sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
