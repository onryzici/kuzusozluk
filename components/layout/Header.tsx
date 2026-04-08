"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LogOut, User, Settings, Mail, Shield, PenLine, BarChart3, HelpCircle, Circle, Gamepad2 } from "lucide-react";
import AramaKutusu from "@/components/shared/AramaKutusu";
import MesajBildirim from "@/components/shared/MesajBildirim";
import BildirimMenusu from "@/components/shared/BildirimMenusu";
import OnlineKullanicilar from "@/components/shared/OnlineKullanicilar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/shared/ThemeToggle";

const navLinks = [
  { href: "/", label: "bugün" },
  { href: "/gundem", label: "tüm" },
  { href: "/bebe", label: "dün" },
  { href: "/takip", label: "takip" },
  { href: "/son", label: "akış" },
  { href: "/ukde", label: "ukde" },
  { href: "/debe", label: "debe" },
  { href: "/tarihte-bugun", label: "tarihte bugün" },
];

const desktopOnlyLinks = [
  { href: "/duyurular", label: "olan biten" },
  { href: "/rastgele", label: "rastgele" },
];

function UserMenu({ session }: { session: any }) {
  const username = session?.user?.username;
  const role = session?.user?.role;

  if (!session?.user) {
    return (
      <Link href="/giris" className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent transition-colors">
        <LogIn className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">giriş</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 px-1.5 py-1 text-xs rounded hover:bg-accent transition-colors">
        <User className="h-3.5 w-3.5" />
        <span className="hidden sm:inline text-[13px]">{username}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem>
          <Link href={`/kullanici/${username}`} className="flex items-center gap-2 w-full text-xs">
            <User className="h-3 w-3" /> profilim
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/entrylerim" className="flex items-center gap-2 w-full text-xs">
            <PenLine className="h-3 w-3" /> entrylerim
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/mesajlar" className="flex items-center gap-2 w-full text-xs">
            <Mail className="h-3 w-3" /> mesajlar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="sm:hidden">
          <Link href="/online" className="flex items-center gap-2 w-full text-xs">
            <Circle className="h-3 w-3 fill-green-500 text-green-500" /> online
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/ayarlar" className="flex items-center gap-2 w-full text-xs">
            <Settings className="h-3 w-3" /> ayarlar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/istatistikler" className="flex items-center gap-2 w-full text-xs">
            <BarChart3 className="h-3 w-3" /> istatistikler
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/sss" className="flex items-center gap-2 w-full text-xs">
            <HelpCircle className="h-3 w-3" /> sss
          </Link>
        </DropdownMenuItem>
        {role === "CO_MOD" && (
          <DropdownMenuItem>
            <Link href="/co-mod" className="flex items-center gap-2 w-full text-xs text-primary">
              <Shield className="h-3 w-3" /> co-mod paneli
            </Link>
          </DropdownMenuItem>
        )}
        {role === "ADMIN" && (
          <DropdownMenuItem>
            <Link href="/admin" className="flex items-center gap-2 w-full text-xs text-primary">
              <Shield className="h-3 w-3" /> admin paneli
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut()} className="text-xs text-destructive">
          <LogOut className="h-3 w-3 mr-2" /> çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      {/* mobil üst bar — logo + kullanıcı */}
      <div className="flex sm:hidden items-center justify-between h-10 px-3">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-base">🐑</span>
          <span className="font-bold text-sm tracking-tight">
            <span className="text-primary">kuzu</span>
            <span className="text-foreground">sözlük</span>
          </span>
        </Link>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <BildirimMenusu />
          <UserMenu session={session} />
        </div>
      </div>

      {/* masaüstü üst bar */}
      <div className="hidden sm:flex max-w-[1400px] mx-auto items-center gap-3 h-11 px-4">
        <Link href="/" className="flex items-center gap-1.5 shrink-0 mr-2">
          <span className="text-lg">🐑</span>
          <span className="font-bold text-sm tracking-tight">
            <span className="text-primary">kuzu</span>
            <span className="text-foreground">sözlük</span>
          </span>
        </Link>
        <div className="flex-1 min-w-0">
          <AramaKutusu />
        </div>
        <div className="shrink-0 flex items-center gap-1 ml-auto">
          <OnlineKullanicilar />
          {session?.user && (
            <>
              <BildirimMenusu />
              <MesajBildirim />
            </>
          )}
          <UserMenu session={session} />
          <ThemeToggle />
        </div>
      </div>

      {/* alt navigasyon — tabs */}
      <div className="border-t border-border">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 flex items-center gap-0 sm:gap-4 h-10 sm:h-9 overflow-x-auto scrollbar-none">
          {navLinks.map((link) => {
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  if (link.href === "/") {
                    window.dispatchEvent(new Event("sidebar:refresh"));
                  }
                }}
                className={`relative text-sm sm:text-[13px] whitespace-nowrap px-3 sm:px-0 py-2 sm:py-0 ${
                  isActive
                    ? "text-foreground font-semibold sm:font-normal sm:text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full sm:hidden" />
                )}
              </Link>
            );
          })}
          {desktopOnlyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden sm:inline-block text-[13px] text-muted-foreground hover:text-primary whitespace-nowrap transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/atari-salonu"
            className={`flex items-center gap-1 text-sm sm:text-[13px] whitespace-nowrap transition-colors px-3 sm:px-0 py-2 sm:py-0 ${
              pathname?.startsWith("/atari-salonu")
                ? "text-foreground font-semibold sm:font-normal sm:text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            <Gamepad2 className="h-3 w-3" />
            atari salonu
          </Link>
        </div>
      </div>
    </header>
  );
}
