import { FileQuestion } from "lucide-react";

type BosSayfaProps = {
  mesaj?: string;
};

export default function BosSayfa({ mesaj = "İçerik bulunamadı." }: BosSayfaProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <FileQuestion className="h-12 w-12 mb-4" />
      <p className="text-sm">{mesaj}</p>
    </div>
  );
}
