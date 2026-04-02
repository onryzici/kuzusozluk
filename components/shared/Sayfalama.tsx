import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type SayfalamaProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

export default function Sayfalama({ currentPage, totalPages, basePath }: SayfalamaProps) {
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  function href(page: number) {
    return page === 1 ? basePath : `${basePath}?sayfa=${page}`;
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-6">
      {currentPage > 1 && (
        <Link href={href(currentPage - 1)} className="p-2 hover:bg-accent rounded">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          className={`px-3 py-1 text-sm rounded ${
            p === currentPage
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
        >
          {p}
        </Link>
      ))}
      {currentPage < totalPages && (
        <Link href={href(currentPage + 1)} className="p-2 hover:bg-accent rounded">
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
