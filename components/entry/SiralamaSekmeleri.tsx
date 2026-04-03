import Link from "next/link";

type SiralamaSekmeleriProps = {
  slug: string;
  current: string;
};

const sekmeler = [
  { key: "eski", label: "eski" },
  { key: "yeni", label: "yeni" },
  { key: "populer", label: "populer" },
];

export default function SiralamaSekmeleri({ slug, current }: SiralamaSekmeleriProps) {
  return (
    <div className="flex items-center gap-1">
      {sekmeler.map((s) => (
        <Link
          key={s.key}
          href={s.key === "eski" ? `/baslik/${slug}` : `/baslik/${slug}?sira=${s.key}`}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            current === s.key
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
