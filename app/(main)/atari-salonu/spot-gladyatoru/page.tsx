"use client";

import { useSession } from "next-auth/react";
import SpotGladyatoru from "@/components/oyun/gladiator/SpotGladyatoru";
import { Swords, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SpotGladyatoruSayfa() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-full px-4 lg:px-8 py-12 text-center text-muted-foreground text-sm">
        yükleniyor...
      </div>
    );
  }

  return (
    <div className="w-full px-4 lg:px-8 py-6 max-w-3xl mx-auto">
      <Link
        href="/atari-salonu"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> atari salonu
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Swords className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">spot gladyatörü</h1>
          <p className="text-xs text-muted-foreground">
            karakterini yarat, arenada dövüş, altın topla, dükkandan eşya al, yetenek öğren. diğer yazarlarla pvp yap, liderliğe oyna.
          </p>
        </div>
      </div>

      <SpotGladyatoru />
    </div>
  );
}
