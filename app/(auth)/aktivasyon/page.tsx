"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AktivasyonIcerik() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [durum, setDurum] = useState<"yukleniyor" | "basarili" | "hata">("yukleniyor");
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    if (!token) {
      setDurum("hata");
      setMesaj("Geçersiz aktivasyon bağlantısı.");
      return;
    }

    async function aktivasyonYap() {
      try {
        const res = await fetch(`/api/auth/aktivasyon?token=${token}`);
        const json = await res.json();

        if (json.success) {
          setDurum("basarili");
          setMesaj(json.data.message);
        } else {
          setDurum("hata");
          setMesaj(json.error.message);
        }
      } catch {
        setDurum("hata");
        setMesaj("Bir hata oluştu. Lütfen tekrar deneyin.");
      }
    }

    aktivasyonYap();
  }, [token]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Hesap Aktivasyonu</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {durum === "yukleniyor" && (
          <p className="text-muted-foreground">Hesabınız aktifleştiriliyor...</p>
        )}
        {durum === "basarili" && (
          <>
            <p className="text-green-600 dark:text-green-400">{mesaj}</p>
            <Link href="/giris" className="inline-flex items-center justify-center w-full h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              giriş yap
            </Link>
          </>
        )}
        {durum === "hata" && (
          <>
            <p className="text-destructive">{mesaj}</p>
            <Link href="/kayit" className="inline-flex items-center justify-center w-full h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors">
              tekrar kayıt ol
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AktivasyonSayfa() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div className="animate-pulse h-48 w-96 bg-muted rounded" />}>
        <AktivasyonIcerik />
      </Suspense>
    </div>
  );
}
