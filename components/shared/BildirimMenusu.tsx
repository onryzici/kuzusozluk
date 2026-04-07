"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, AtSign, MessageSquare, ThumbsUp, UserPlus, Mail } from "lucide-react";
import { formatZamanOnce } from "@/lib/utils/format";
import { usePolling } from "@/hooks/usePolling";

type Notification = {
  id: string;
  type: "MENTION" | "REPLY" | "VOTE" | "FOLLOW" | "MESSAGE" | "TOPIC_ENTRY";
  content: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
};

const typeIcons: Record<string, typeof Bell> = {
  MENTION: AtSign,
  REPLY: MessageSquare,
  VOTE: ThumbsUp,
  FOLLOW: UserPlus,
  MESSAGE: Mail,
  TOPIC_ENTRY: Bell,
};

export default function BildirimMenusu() {
  const { unreadNotif, clearNotifCount } = usePolling();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openDropdown = useCallback(async () => {
    setIsOpen(true);
    setIsLoading(true);

    try {
      const res = await fetch("/api/bildirim");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
      }
    } catch {}
    setIsLoading(false);

    // okundu işaretlemeyi arka planda yap (beklemeden)
    clearNotifCount();
    fetch("/api/bildirim", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [clearNotifCount]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-bildirim-menu]")) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="relative" data-bildirim-menu>
      <button
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className="relative inline-flex items-center justify-center p-1.5 rounded hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadNotif > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-0.5 rounded-full bg-primary/80 text-[9px] font-medium text-primary-foreground">
            {unreadNotif > 9 ? "9+" : unreadNotif}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed right-4 left-4 sm:left-auto sm:absolute sm:right-0 top-auto sm:top-full mt-1 sm:w-80 bg-popover border border-border rounded-md shadow-lg z-[60] max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-medium">bildirimler</span>
          </div>

          {isLoading ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground animate-pulse">
              yukleniyor...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              henuz bildirim yok
            </div>
          ) : (
            <div>
              {notifications.map((n) => {
                const Icon = typeIcons[n.type] || Bell;
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-2 px-3 py-2 hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                  >
                    <Icon className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] leading-relaxed">
                        <span className="font-medium">{n.actor.username}</span>{" "}
                        <span className="text-muted-foreground">{n.content}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatZamanOnce(n.createdAt)}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 px-3 py-2 border-b border-border/50 last:border-0"
                  >
                    <Icon className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] leading-relaxed">
                        <span className="font-medium">{n.actor.username}</span>{" "}
                        <span className="text-muted-foreground">{n.content}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatZamanOnce(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border px-3 py-2">
            <Link
              href="/bildirimler"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-primary hover:underline"
            >
              tum bildirimleri gor
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
