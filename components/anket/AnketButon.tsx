"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import AnketOlustur from "./AnketOlustur";

type AnketButonProps = {
  topicSlug: string;
};

export default function AnketButon({ topicSlug }: AnketButonProps) {
  const [open, setOpen] = useState(false);

  if (open) {
    return <AnketOlustur topicSlug={topicSlug} onClose={() => setOpen(false)} />;
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs px-3 py-2 border border-border/60 rounded-md text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
    >
      <BarChart3 className="h-3.5 w-3.5" />
      bu başlığa anket oluştur
    </button>
  );
}
