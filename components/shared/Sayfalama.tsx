"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";

type SayfalamaProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

export default function Sayfalama({ currentPage, totalPages, basePath }: SayfalamaProps) {
  const router = useRouter();

  function href(page: number) {
    return page === 1 ? basePath : `${basePath}?sayfa=${page}`;
  }

  return (
    <nav className="flex items-center justify-center gap-1.5">
      {currentPage > 1 && (
        <button
          onClick={() => router.push(href(currentPage - 1))}
          className="h-9 w-9 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <select
        value={currentPage}
        onChange={(e) => router.push(href(Number(e.target.value)))}
        className="h-9 pl-3 pr-7 rounded-md border border-border bg-background text-sm appearance-none cursor-pointer hover:bg-accent transition-colors"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
      >
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <span className="text-sm text-muted-foreground">/</span>

      <button
        onClick={() => router.push(href(totalPages))}
        className="h-9 px-3 flex items-center rounded-md border border-border text-sm hover:bg-accent transition-colors cursor-pointer"
      >
        {totalPages}
      </button>

      {currentPage < totalPages && (
        <button
          onClick={() => router.push(href(currentPage + 1))}
          className="h-9 w-9 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </nav>
  );
}
