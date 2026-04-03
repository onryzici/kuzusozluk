"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";

export default function MesajBildirim() {
  const { unreadMsg, refetch } = usePolling();
  const pathname = usePathname();

  // mesajlar sayfasina gidince hemen guncelle
  useEffect(() => {
    if (pathname?.startsWith("/mesajlar")) {
      const timer = setTimeout(refetch, 2000);
      return () => clearTimeout(timer);
    }
  }, [pathname, refetch]);

  return (
    <Link
      href="/mesajlar"
      className="relative inline-flex items-center justify-center p-1.5 rounded hover:bg-accent transition-colors"
      title="mesajlar"
    >
      <Mail className="h-4 w-4" />
      {unreadMsg > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-0.5 rounded-full bg-primary/80 text-[9px] font-medium text-primary-foreground">
          {unreadMsg > 9 ? "9+" : unreadMsg}
        </span>
      )}
    </Link>
  );
}
