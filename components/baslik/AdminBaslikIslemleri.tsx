"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Lock, Unlock, Pin, MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";

type Props = {
  slug: string;
  title: string;
  isLocked: boolean;
  isPinned: boolean;
};

export default function AdminBaslikIslemleri({ slug, title, isLocked, isPinned }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(isLocked);
  const [pinned, setPinned] = useState(isPinned);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);

  async function handleAction(action: "delete" | "lock" | "pin") {
    if (action === "delete") {
      const ok = window.confirm("bu başlığı ve tüm entrylerini silmek istediğinize emin misiniz?");
      if (!ok) return;
    }

    setLoading(true);
    try {
      if (action === "delete") {
        const res = await fetch(`/api/admin/basliklar/${slug}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) {
          router.push("/");
          router.refresh();
          window.dispatchEvent(new Event("sidebar:refresh"));
          return;
        }
      } else {
        const body = action === "lock" ? { isLocked: !locked } : { isPinned: !pinned };
        const res = await fetch(`/api/admin/basliklar/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          if (action === "lock") setLocked(!locked);
          if (action === "pin") setPinned(!pinned);
          router.refresh();
        }
      }
    } catch {
      // hata
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  async function handleRename() {
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed.length < 3) {
      toast.error("başlık en az 3 karakter olmalı");
      return;
    }
    if (trimmed === title) {
      setRenaming(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/basliklar/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("başlık adı değiştirildi");
        setRenaming(false);
        window.dispatchEvent(new Event("sidebar:refresh"));
        if (json.data.slug !== slug) {
          router.push(`/baslik/${json.data.slug}`);
        }
        router.refresh();
      } else {
        toast.error(json.error?.message || "hata oluştu");
      }
    } catch {
      toast.error("bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {renaming && (
        <div className="flex items-center gap-2 mr-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={200}
            className="text-sm px-2 py-1 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary w-64"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setRenaming(false); setNewTitle(title); }
            }}
            autoFocus
            disabled={loading}
          />
          <button
            onClick={handleRename}
            disabled={loading}
            className="text-xs text-primary hover:underline"
          >
            kaydet
          </button>
          <button
            onClick={() => { setRenaming(false); setNewTitle(title); }}
            className="text-xs text-muted-foreground hover:underline"
          >
            iptal
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
        title="admin işlemleri"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-20 py-1">
            <button
              onClick={() => { setRenaming(true); setOpen(false); }}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
            >
              <Pencil className="h-3 w-3" />
              başlık adını değiştir
            </button>
            <button
              onClick={() => handleAction("lock")}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
            >
              {locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {locked ? "kilidi aç" : "başlığı kilitle"}
            </button>
            <button
              onClick={() => handleAction("pin")}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
            >
              <Pin className="h-3 w-3" />
              {pinned ? "sabitlemeyi kaldır" : "başlığı sabitle"}
            </button>
            <button
              onClick={() => handleAction("delete")}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              başlığı sil
            </button>
          </div>
        </>
      )}
    </div>
  );
}
