"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Home, Search, MessageSquare, Bell, User } from "lucide-react";

type TabItem = {
  key: string;
  label: string;
  icon: typeof Home;
  href: string;
  matchPaths: string[];
};

export default function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [notifRes, msgRes] = await Promise.all([
        fetch("/api/bildirim/okunmamis"),
        fetch("/api/mesaj/okunmamis"),
      ]);
      const notifData = await notifRes.json();
      const msgData = await msgRes.json();
      if (notifData.success) setUnreadNotif(notifData.data.count);
      if (msgData.success) setUnreadMsg(msgData.data.count);
    } catch {}
  }, [session?.user]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const profileHref = session?.user
    ? `/kullanici/${(session.user as any).username}`
    : "/giris";

  const tabs: TabItem[] = [
    {
      key: "home",
      label: "ana sayfa",
      icon: Home,
      href: "/",
      matchPaths: ["/", "/gundem", "/bebe", "/takip", "/son"],
    },
    {
      key: "search",
      label: "ara",
      icon: Search,
      href: "/ara",
      matchPaths: ["/ara"],
    },
    {
      key: "messages",
      label: "mesajlar",
      icon: MessageSquare,
      href: "/mesajlar",
      matchPaths: ["/mesajlar"],
    },
    {
      key: "notifications",
      label: "bildirimler",
      icon: Bell,
      href: "/bildirimler",
      matchPaths: ["/bildirimler"],
    },
    {
      key: "profile",
      label: "profil",
      icon: User,
      href: profileHref,
      matchPaths: ["/kullanici", "/giris", "/ayarlar"],
    },
  ];

  function isActive(tab: TabItem): boolean {
    if (tab.key === "home") {
      return (
        pathname === "/" ||
        pathname === "/gundem" ||
        pathname === "/bebe" ||
        pathname === "/takip" ||
        pathname === "/son" ||
        pathname?.startsWith("/baslik/") === true
      );
    }
    return tab.matchPaths.some(
      (p) => pathname === p || pathname?.startsWith(p + "/")
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-14 px-1 safe-area-pb">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          const badge =
            tab.key === "notifications"
              ? unreadNotif
              : tab.key === "messages"
              ? unreadMsg
              : 0;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-0.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
