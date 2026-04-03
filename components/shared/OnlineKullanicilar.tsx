"use client";

import Link from "next/link";
import { Circle } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";

export default function OnlineKullanicilar() {
  const { onlineCount } = usePolling();

  return (
    <Link
      href="/online"
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
    >
      <Circle className="h-2 w-2 fill-green-500 text-green-500" />
      <span>{onlineCount} kisi online</span>
    </Link>
  );
}
