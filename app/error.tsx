"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-5xl font-bold text-destructive mb-3">hata</h1>
        <p className="text-lg text-foreground mb-1">bir seyler ters gitti.</p>
        <p className="text-sm text-muted-foreground mb-6">
          endise etme, bu bizim sorunumuz. tekrar deneyebilirsin.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          tekrar dene
        </button>
      </div>
    </div>
  );
}
