import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <Image
          src="/kuzu-404.png"
          alt="kayıp kuzu"
          width={200}
          height={200}
          className="mx-auto mb-6"
          priority
        />
        <h1 className="text-5xl font-bold text-primary mb-3">404</h1>
        <p className="text-lg text-foreground mb-1">meee! burası boş.</p>
        <p className="text-sm text-muted-foreground mb-6">
          bu kuzu bile bulamadı aradığın sayfayı. belki yanlış otlağa geldin?
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          🐑 ağıla geri dön
        </Link>
      </div>
    </div>
  );
}
