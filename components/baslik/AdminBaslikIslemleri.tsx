"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Lock, Unlock, Pin, MoreVertical } from "lucide-react";

type Props = {
  slug: string;
  isLocked: boolean;
  isPinned: boolean;
};

export default function AdminBaslikIslemleri({ slug, isLocked, isPinned }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(isLocked);
  const [pinned, setPinned] = useState(isPinned);

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

  return (
    <div className="relative">
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
          <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-md shadow-lg z-20 py-1">
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
