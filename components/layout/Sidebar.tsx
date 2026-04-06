"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

type BaslikItem = {
  id: string;
  title: string;
  slug: string;
  dayCount: number;
  entryCount: number;
  isPinned?: boolean;
};

type Meta = {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export default function Sidebar() {
  const [basliklar, setBasliklar] = useState<BaslikItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const pageSize = 40;

  const fetchBasliklar = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/baslik?siralama=yeni&boyut=${pageSize}&sayfa=${p}&t=` + Date.now(), { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setBasliklar(json.data);
          setMeta(json.meta);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBasliklar(page);
  }, [page, fetchBasliklar]);

  useEffect(() => {
    function handleRefresh() { fetchBasliklar(page); }
    window.addEventListener("sidebar:refresh", handleRefresh);
    return () => window.removeEventListener("sidebar:refresh", handleRefresh);
  }, [fetchBasliklar, page]);

  const totalPages = meta ? Math.ceil(meta.total / pageSize) : 1;

  return (
    <aside className="hidden lg:block w-72 shrink-0 h-full overflow-y-auto border-r border-border bg-background">
      <div className="p-2">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-xs text-muted-foreground">tüm</span>
          <button
            onClick={() => fetchBasliklar(page)}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="yenile"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <nav className="divide-y divide-border/20">
          {[...basliklar].sort((a, b) => {
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

        {basliklar.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">yükleniyor...</p>
        )}

        {meta && totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-2 mt-1 border-t border-border/30">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
