"use client";

import { useState, useEffect, useRef } from "react";

type AramaSonuc = {
  id: string;
  title?: string;
  slug?: string;
  username?: string;
  content?: string;
};

export function useArama(debounceMs = 300) {
  const [query, setQuery] = useState("");
  const [sonuclar, setSonuclar] = useState<AramaSonuc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.trim().length < 2) {
      setSonuclar([]);
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ara?q=${encodeURIComponent(query)}&tip=baslik`);
        const json = await res.json();
        if (json.success) setSonuclar(json.data);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, debounceMs]);

  return { query, setQuery, sonuclar, isLoading };
}
