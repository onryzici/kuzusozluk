"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LogOut, User, Menu, Settings, Mail, Shield, PenLine } from "lucide-react";
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
import { useUIStore } from "@/store/uiStore";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function Header() {
  const { data: session } = useSession();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      {/* üst bar */}
      <div className="max-w-[1200px] mx-auto flex items-center gap-3 h-11 px-4">
        <button onClick={toggleSidebar} className="lg:hidden p-1.5 -ml-1 rounded hover:bg-accent">
          <Menu className="h-4 w-4" />
        </button>

        <Link href="/" className="flex items-center gap-1.5 shrink-0 mr-2">
          <span className="text-lg">🐑</span>
          <span className="font-bold text-sm tracking-tight">
            <span className="text-primary">kuzu</span>
            <span className="text-foreground">sözlük</span>
          </span>
        </Link>

        <div className="flex-1 max-w-md">
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
                  <span className="hidden sm:inline text-[13px]">{session.user.username}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem>
                    <Link href={`/kullanici/${session.user.username}`} className="flex items-center gap-2 w-full text-xs">
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
                <span className="hidden sm:inline">giriş</span>
              </Link>
              <ThemeToggle />
            </>
          )}
        </div>
      </div>

      {/* alt navigasyon */}
      <div className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-4 flex items-center gap-4 h-9 overflow-x-auto scrollbar-none">
          {[
            { href: "/", label: "bugün" },
            { href: "/gundem", label: "gündem" },
            { href: "/debe", label: "debe" },
            { href: "/takip", label: "takip" },
            { href: "/son", label: "son" },
            { href: "/duyurular", label: "duyurular" },
            { href: "/rastgele", label: "rastgele" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-muted-foreground hover:text-primary whitespace-nowrap transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
