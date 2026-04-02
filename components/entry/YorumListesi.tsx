"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { formatZamanOnce } from "@/lib/utils/format";
import YorumForm from "./YorumForm";

type Yorum = {
  id: string;
  content: string;
  createdAt: string;
  author: { username: string; avatarUrl: string | null };
};

type YorumListesiProps = {
  entryId: string;
  initialCount: number;
};

export default function YorumListesi({ entryId, initialCount }: YorumListesiProps) {
  const [open, setOpen] = useState(false);
  const [yorumlar, setYorumlar] = useState<Yorum[]>([]);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    fetch(`/api/entry/${entryId}/yorum`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setYorumlar(json.data);
          setCount(json.data.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, entryId]);

  function handleYorumEklendi(yorum: Yorum) {
    setYorumlar((prev) => [...prev, yorum]);
    setCount((prev) => prev + 1);
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="h-3 w-3" />
        <span>yorumlar{count > 0 ? ` (${count})` : ""}</span>
      </button>

      {open && (
        <div className="mt-2 pl-3 border-l-2 border-border/60">
          {loading && (
            <p className="text-[11px] text-muted-foreground py-1">yükleniyor...</p>
          )}

          {!loading && yorumlar.length === 0 && (
            <p className="text-[11px] text-muted-foreground py-1">henüz yorum yok</p>
          )}

          <div className="space-y-2.5">
            {yorumlar.map((yorum) => (
              <div key={yorum.id} className="flex gap-2">
                {/* avatar */}
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0 mt-0.5 overflow-hidden">
                  {yorum.author.avatarUrl ? (
                    <Image
                      src={yorum.author.avatarUrl}
                      alt={yorum.author.username}
                      width={20}
                      height={20}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    yorum.author.username[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/kullanici/${yorum.author.username}`}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      {yorum.author.username}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">
                      {formatZamanOnce(yorum.createdAt)}
                    </span>
                  </div>
                  <p className="text-foreground/90 text-[12px] leading-relaxed mt-0.5">
                    {yorum.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <YorumForm entryId={entryId} onYorumEklendi={handleYorumEklendi} />
        </div>
      )}
    </div>
  );
}
