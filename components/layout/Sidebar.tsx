"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, RefreshCw } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useEffect, useState, useCallback } from "react";

type GundemItem = {
  id: string;
  title: string;
  slug: string;
  dayCount: number;
  entryCount: number;
};

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [gundem, setGundem] = useState<GundemItem[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const fetchGundem = useCallback(() => {
    setLoading(true);
    fetch("/api/baslik?siralama=son&boyut=40")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setGundem(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGundem();
  }, [fetchGundem, pathname]);

  useEffect(() => {
    function handleRefresh() { fetchGundem(); }
    window.addEventListener("sidebar:refresh", handleRefresh);
    return () => window.removeEventListener("sidebar:refresh", handleRefresh);
  }, [fetchGundem]);

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed top-[76px] left-0 z-40 h-[calc(100dvh-76px)] w-56 bg-background border-r border-border overflow-y-auto transform transition-transform lg:translate-x-0 lg:relative lg:top-0 lg:h-full lg:shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-xs text-muted-foreground">bugün</span>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchGundem}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="yenile"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-accent lg:hidden">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <nav>
            {gundem.map((item) => (
              <Link
                key={item.id}
                href={`/baslik/${item.slug}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between py-[6px] px-2 text-sm rounded-sm transition-colors leading-snug ${
                  pathname === `/baslik/${item.slug}`
                    ? "bg-accent text-primary"
                    : "text-foreground/80 hover:bg-accent/70"
                }`}
              >
                <span className="truncate pr-2">{item.title}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {item.dayCount > 0 ? item.dayCount : item.entryCount}
                </span>
              </Link>
            ))}
          </nav>

          {gundem.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">yükleniyor...</p>
          )}
        </div>
      </aside>
    </>
  );
}
