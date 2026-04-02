"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function MesajBildirim() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/mesaj/okunmamis");
        const data = await res.json();
        if (data.success) {
          setCount(data.data.count);
        }
      } catch {
        // silently fail
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/mesajlar"
      className="relative inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
      title="Mesajlar"
    >
      <Mail className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
