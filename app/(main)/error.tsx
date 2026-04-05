"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Main layout error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <h1 className="text-4xl font-bold text-destructive mb-3">hay aksi!</h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        sayfa yuklenirken bir sorun olustu. tekrar deneyebilir veya ana sayfaya donebilirsin.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          tekrar dene
        </button>
        <Link
          href="/"
          className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
        >
          ana sayfa
        </Link>
      </div>
    </div>
  );
}
