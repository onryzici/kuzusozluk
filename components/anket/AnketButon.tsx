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
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
    >
      <BarChart3 className="h-3 w-3" />
      anket olustur
    </button>
  );
}
