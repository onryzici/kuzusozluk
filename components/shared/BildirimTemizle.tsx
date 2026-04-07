"use client";

import { useEffect } from "react";
import { usePolling } from "@/hooks/usePolling";

export default function BildirimTemizle() {
  const { clearNotifCount } = usePolling();

  useEffect(() => {
    clearNotifCount();
  }, [clearNotifCount]);

  return null;
}
