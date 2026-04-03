type BosSayfaProps = {
  mesaj?: string;
  oneri?: string;
};

export default function BosSayfa({
  mesaj = "burada henuz bir sey yok.",
  oneri = "ilk icerigi sen olusturabilirsin!",
}: BosSayfaProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <span className="text-4xl mb-4" role="img" aria-label="koyun">
        🐑
      </span>
      <p className="text-sm">{mesaj}</p>
      {oneri && <p className="text-xs mt-1 text-muted-foreground/70">{oneri}</p>}
    </div>
  );
}
