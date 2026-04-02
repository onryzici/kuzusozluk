"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";

export default function MesajBildirim() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/mesaj/okunmamis");
      const data = await res.json();
      if (data.success) setCount(data.data.count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // mesajlar sayfasına gidince hemen güncelle
  useEffect(() => {
    if (pathname?.startsWith("/mesajlar")) {
      const timer = setTimeout(fetchCount, 2000);
      return () => clearTimeout(timer);
    }
  }, [pathname, fetchCount]);

  return (
    <Link
      href="/mesajlar"
      className="relative inline-flex items-center justify-center p-1.5 rounded hover:bg-accent transition-colors"
      title="mesajlar"
    >
      <Mail className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-0.5 rounded-full bg-primary/80 text-[9px] font-medium text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
