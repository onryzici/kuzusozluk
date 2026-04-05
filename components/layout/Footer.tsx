import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t py-4 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Link href="/sss" className="hover:text-primary transition-colors">sss</Link>
          <span>&middot;</span>
          <Link href="/istatistikler" className="hover:text-primary transition-colors">istatistikler</Link>
          <span>&middot;</span>
          <Link href="/duyurular" className="hover:text-primary transition-colors">olan biten</Link>
        </div>
        <div className="text-xs text-muted-foreground">
          sosyal sözlük &copy; {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
