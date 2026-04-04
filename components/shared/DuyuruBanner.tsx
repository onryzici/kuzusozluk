"use client";

import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export default function DuyuruBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedIds = JSON.parse(
      localStorage.getItem("dismissedDuyurular") || "[]"
    );

    fetch("/api/duyuru")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          const visible = json.data.find(
            (a: Announcement) => !dismissedIds.includes(a.id)
          );
          if (visible) setAnnouncement(visible);
        }
      })
      .catch(() => {});
  }, []);

  function handleDismiss() {
    if (!announcement) return;
    const dismissedIds = JSON.parse(
      localStorage.getItem("dismissedDuyurular") || "[]"
    );
    dismissedIds.push(announcement.id);
    localStorage.setItem("dismissedDuyurular", JSON.stringify(dismissedIds));
    setDismissed(true);
  }

  if (!announcement || dismissed) return null;

  return (
    <div className="w-full bg-primary text-primary-foreground">
      <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center gap-3">
        <Megaphone className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <Link href="/duyurular" className="hover:underline">
            <span className="text-xs font-medium">{announcement.title}</span>
            <span className="text-xs opacity-80 ml-2 hidden sm:inline">
              {announcement.content.length > 100
                ? announcement.content.slice(0, 100) + "..."
                : announcement.content}
            </span>
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-white/20 shrink-0"
          aria-label="kapat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
