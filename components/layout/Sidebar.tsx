"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

type GundemItem = {
  id: string;
  title: string;
  slug: string;
  dayCount: number;
  entryCount: number;
  isPinned?: boolean;
};

export default function Sidebar() {
  const [gundem, setGundem] = useState<GundemItem[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const fetchGundem = useCallback(() => {
    setLoading(true);
    fetch("/api/baslik?siralama=son&boyut=40&t=" + Date.now(), { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setGundem(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGundem();
    // only fetch on initial mount, not on every pathname change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleRefresh() { fetchGundem(); }
    window.addEventListener("sidebar:refresh", handleRefresh);
    return () => window.removeEventListener("sidebar:refresh", handleRefresh);
  }, [fetchGundem]);

  return (
    <aside className="hidden lg:block w-72 shrink-0 h-full overflow-y-auto border-r border-border bg-background">
      <div className="p-2">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-xs text-muted-foreground">bugün</span>
          <button
            onClick={fetchGundem}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="yenile"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <nav className="divide-y divide-border/20">
          {/* sabitlenmiş başlıklar önce, sonra geri kalanlar */}
          {[...gundem].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
          }).map((item) => (
            <Link
              key={item.id}
              href={`/baslik/${item.slug}`}
              className={`flex items-center justify-between py-[6px] px-2 text-sm rounded-sm transition-colors leading-snug ${
                pathname === `/baslik/${item.slug}`
                  ? "bg-accent text-primary"
                  : "text-foreground/80 hover:bg-accent/70"
              }`}
            >
              <span className={`truncate pr-2 ${item.isPinned ? "font-bold" : ""}`}>
                {item.isPinned && <span className="text-primary mr-1">•</span>}
                {item.title}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                {item.entryCount}
              </span>
            </Link>
          ))}
        </nav>

        {gundem.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">yükleniyor...</p>
        )}
      </div>
    </aside>
  );
}
