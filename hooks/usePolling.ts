"use client";
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useSession } from "next-auth/react";

type Counts = {
  unreadNotif: number;
  unreadMsg: number;
  onlineCount: number;
};

type PollingContextType = Counts & {
  refetch: () => void;
  clearNotifCount: () => void;
  clearMsgCount: () => void;
};

export const PollingContext = createContext<PollingContextType>({
  unreadNotif: 0,
  unreadMsg: 0,
  onlineCount: 0,
  refetch: () => {},
  clearNotifCount: () => {},
  clearMsgCount: () => {},
});

export function usePollingProvider() {
  const { data: session } = useSession();
  const [counts, setCounts] = useState<Counts>({
    unreadNotif: 0,
    unreadMsg: 0,
    onlineCount: 0,
  });

  const fetchAll = useCallback(async () => {
    if (!session?.user) {
      // only fetch online count for logged-out users
      try {
        const res = await fetch("/api/kullanici/online");
        const data = await res.json();
        if (data.success)
          setCounts((prev) => ({ ...prev, onlineCount: data.data.length }));
      } catch {}
      return;
    }

    try {
      const [notifRes, msgRes, onlineRes] = await Promise.all([
        fetch("/api/bildirim/okunmamis"),
        fetch("/api/mesaj/okunmamis"),
        fetch("/api/kullanici/online"),
      ]);
      const [notifData, msgData, onlineData] = await Promise.all([
        notifRes.json(),
        msgRes.json(),
        onlineRes.json(),
      ]);
      setCounts({
        unreadNotif: notifData.success ? notifData.data.count : 0,
        unreadMsg: msgData.success ? msgData.data.count : 0,
        onlineCount: onlineData.success ? onlineData.data.length : 0,
      });
    } catch {}
  }, [session?.user]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const clearNotifCount = useCallback(() => {
    setCounts((prev) => ({ ...prev, unreadNotif: 0 }));
  }, []);

  const clearMsgCount = useCallback(() => {
    setCounts((prev) => ({ ...prev, unreadMsg: 0 }));
  }, []);

  return { ...counts, refetch: fetchAll, clearNotifCount, clearMsgCount };
}

export function usePolling() {
  return useContext(PollingContext);
}
