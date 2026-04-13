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

const PAGE_SIZE = 40;

export default function Sidebar() {
  const [gundem, setGundem] = useState<GundemItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pathname = usePathname();

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(
        `/api/baslik?siralama=son&sayfa=${p}&boyut=${PAGE_SIZE}&t=${Date.now()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.success) {
        setGundem((prev) => (append ? [...prev, ...json.data] : json.data));
        setHasMore(!!json.meta?.hasMore);
        setPage(p);
      }
    } catch {}
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const refresh = useCallback(() => fetchPage(1, false), [fetchPage]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    function handleRefresh() { refresh(); }
    window.addEventListener("sidebar:refresh", handleRefresh);
    return () => window.removeEventListener("sidebar:refresh", handleRefresh);
  }, [refresh]);

  return (
    <aside className="hidden lg:block w-72 shrink-0 h-full overflow-y-auto border-r border-border bg-background">
      <div className="p-2">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-xs text-muted-foreground">bugün</span>
          <button
            onClick={refresh}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="yenile"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <nav className="divide-y divide-border/20">
          {[...gundem].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
          }).map((item) => (
            <Link
              key={item.id}
              href={`/baslik/${item.slug}`}
              className={`flex items-center justify-between py-[6px] px-2 text-sm rounded-sm leading-snug ${
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

        {gundem.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center py-8">başlık yok.</p>
        )}

        {loading && gundem.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">yükleniyor...</p>
        )}

        {hasMore && gundem.length > 0 && (
          <button
            onClick={() => fetchPage(page + 1, true)}
            disabled={loadingMore}
            className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm disabled:opacity-50"
          >
            {loadingMore ? "yükleniyor..." : "daha fazla"}
          </button>
        )}
      </div>
    </aside>
  );
}
