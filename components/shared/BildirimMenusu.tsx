"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";

export default function BildirimMenusu() {
  const { unreadNotif } = usePolling();

  return (
    <Link
      href="/bildirimler"
      className="relative inline-flex items-center justify-center p-1.5 rounded hover:bg-accent transition-colors"
    >
      <Bell className="h-4 w-4" />
      {unreadNotif > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-0.5 rounded-full bg-primary/80 text-[9px] font-medium text-primary-foreground">
          {unreadNotif > 9 ? "9+" : unreadNotif}
        </span>
      )}
    </Link>
  );
}
