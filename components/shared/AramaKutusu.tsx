"use client";

import { useArama } from "@/hooks/useArama";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toSlug } from "@/lib/utils/slug";

export default function AramaKutusu() {
  const router = useRouter();
  const { query, setQuery, sonuclar, isLoading } = useArama();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    // Ekşi tarzı: direkt başlık sayfasına git
    const slug = toSlug(q);
    if (slug) {
      router.push(`/baslik/${slug}?q=${encodeURIComponent(q)}`);
      setOpen(false);
      setQuery("");
    }
  }

  const showNoResult = open && !isLoading && query.trim().length >= 2 && sonuclar.length === 0;

  return (
    <div ref={ref} className="relative w-full sm:max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="başlık ara veya yaz..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="pl-10"
          />
        </div>
      </form>
      {open && (sonuclar.length > 0 || showNoResult) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-[100] max-h-72 overflow-y-auto">
          {sonuclar.map((item) => (
            <Link
              key={item.id}
              href={item.slug ? `/baslik/${item.slug}` : item.username ? `/kullanici/${item.username}` : "#"}
              onClick={() => { setOpen(false); setQuery(""); }}
              className="block px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              {item.title || item.username || (item.content ? item.content.slice(0, 80) + "..." : "")}
            </Link>
          ))}
          {/* Her zaman en altta: girilen metinle başlık aç seçeneği */}
          {query.trim().length >= 2 && (
            <button
              onClick={() => {
                const slug = toSlug(query.trim());
                router.push(`/baslik/${slug}?q=${encodeURIComponent(query.trim())}`);
                setOpen(false);
                setQuery("");
              }}
              className="block w-full text-left px-4 py-2.5 text-sm border-t hover:bg-accent transition-colors text-primary font-medium"
            >
              &ldquo;{query.trim()}&rdquo; başlığını aç
            </button>
          )}
        </div>
      )}
      {open && isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md p-3 text-sm text-muted-foreground">
          Aranıyor...
        </div>
      )}
    </div>
  );
}
