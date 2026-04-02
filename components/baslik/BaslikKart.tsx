import Link from "next/link";
import { MessageSquare } from "lucide-react";

type BaslikKartProps = {
  title: string;
  slug: string;
  entryCount: number;
  dayCount: number;
};

export default function BaslikKart({ title, slug, entryCount, dayCount }: BaslikKartProps) {
  return (
    <Link
      href={`/baslik/${slug}`}
      className="flex items-center justify-between py-2 px-3 hover:bg-accent rounded-md transition-colors group"
    >
      <span className="text-sm group-hover:text-primary transition-colors">{title}</span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        {dayCount > 0 ? dayCount : entryCount}
      </span>
    </Link>
  );
}
