import { formatTarih } from "@/lib/utils/format";

type BaslikDetayProps = {
  title: string;
  entryCount: number;
  createdAt: string;
};

export default function BaslikDetay({ title, entryCount, createdAt }: BaslikDetayProps) {
  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold text-primary break-words">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {entryCount} entry &middot; {formatTarih(createdAt)}
      </p>
    </div>
  );
}
