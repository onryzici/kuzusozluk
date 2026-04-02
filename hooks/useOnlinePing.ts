"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function useOnlinePing() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // Ping immediately on mount
    fetch("/api/kullanici/ping", { method: "POST" }).catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/kullanici/ping", { method: "POST" }).catch(() => {});
    }, 60 * 1000); // every 60 seconds

    return () => clearInterval(interval);
  }, [session?.user]);
}
