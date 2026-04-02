"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";

type Props = {
  topicSlug: string;
  initialIsFollowing: boolean;
};

export default function BaslikTakipButon({ topicSlug, initialIsFollowing }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  async function toggleFollow() {
    if (isLoading) return;

    const prevState = isFollowing;
    setIsFollowing(!isFollowing);
    setIsLoading(true);

    try {
      const method = isFollowing ? "DELETE" : "POST";
      const res = await fetch(`/api/baslik/${topicSlug}/takip`, { method });

      if (!res.ok) {
        setIsFollowing(prevState);
      }
    } catch {
      setIsFollowing(prevState);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
        isFollowing
          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/5"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
      }`}
    >
      {isFollowing ? (
        <>
          <Bell className="h-3 w-3" />
          takip ediliyor
        </>
      ) : (
        <>
          <BellOff className="h-3 w-3" />
          takip et
        </>
      )}
    </button>
  );
}
