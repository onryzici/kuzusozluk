"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Circle } from "lucide-react";

export default function OnlineKullanicilar() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function fetchOnline() {
      fetch("/api/kullanici/online")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setCount(json.data.length);
        })
        .catch(() => {});
    }

    fetchOnline();
    const interval = setInterval(fetchOnline, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/online"
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
    >
      <Circle className="h-2 w-2 fill-green-500 text-green-500" />
      <span>{count} kişi online</span>
    </Link>
  );
}
