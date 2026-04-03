"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LogOut, User, Settings, Mail, Shield, PenLine, BarChart3, HelpCircle } from "lucide-react";
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
  { href: "/gundem", label: "gündem" },
  { href: "/debe", label: "debe" },
  { href: "/takip", label: "takip" },
  { href: "/son", label: "son" },
];

const desktopOnlyLinks = [
  { href: "/duyurular", label: "duyurular" },
  { href: "/rastgele", label: "rastgele" },
];

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      {/* üst bar — hidden on mobile */}
      <div className="hidden sm:flex max-w-[1200px] mx-auto items-center gap-2 sm:gap-3 h-11 px-3 sm:px-4">
        <Link href="/" className="flex items-center gap-1.5 shrink-0 mr-1 sm:mr-2">
          <span className="text-lg">&#x1F411;</span>
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
          {session?.user ? (
            <>
              <BildirimMenusu />
              <MesajBildirim />
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-accent transition-colors">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-[13px]">{(session.user as any).username}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem>
                    <Link href={`/kullanici/${(session.user as any).username}`} className="flex items-center gap-2 w-full text-xs">
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
                  {(session.user as any).role === "ADMIN" && (
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
              <ThemeToggle />
            </>
          ) : (
            <>
              <Link
                href="/giris"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded hover:bg-accent transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>giriş</span>
              </Link>
              <ThemeToggle />
            </>
          )}
        </div>
      </div>

      {/* alt navigasyon — tabs */}
      <div className="border-t border-border sm:border-t">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-4 flex items-center gap-0 sm:gap-4 h-10 sm:h-9 overflow-x-auto scrollbar-none">
          {/* mobile: larger tabs with underline active state */}
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname?.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm sm:text-[13px] whitespace-nowrap transition-colors px-3 sm:px-0 py-2 sm:py-0 ${
                  isActive
                    ? "text-foreground font-semibold sm:font-normal sm:text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {link.label}
                {/* mobile active underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full sm:hidden" />
                )}
              </Link>
            );
          })}

          {/* desktop-only links */}
          {desktopOnlyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden sm:inline-block text-[13px] text-muted-foreground hover:text-primary whitespace-nowrap transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
