"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Circle } from "lucide-react";

type OnlineUser = {
  username: string;
  lastSeen: string;
};

export default function OnlineKullanicilar() {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fetchOnline() {
      fetch("/api/kullanici/online")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setUsers(json.data);
        })
        .catch(() => {});
    }

    fetchOnline();
    const interval = setInterval(fetchOnline, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-accent/60"
      >
        <Circle className="h-2 w-2 fill-green-500 text-green-500" />
        <span>{users.length} kişi online</span>
      </button>

      {open && users.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
          {users.map((user) => (
            <Link
              key={user.username}
              href={`/kullanici/${user.username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/60 transition-colors"
            >
              <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500 shrink-0" />
              <span className="truncate">{user.username}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
