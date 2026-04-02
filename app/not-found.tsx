import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <p className="text-muted-foreground mb-4">aradığınız sayfa bulunamadı.</p>
        <Link href="/" className="text-sm text-primary hover:underline">ana sayfaya dön</Link>
      </div>
    </div>
  );
}
