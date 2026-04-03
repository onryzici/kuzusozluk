"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { kayitSchema, type KayitInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function KayitSayfa() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [aktivasyonMesaji, setAktivasyonMesaji] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KayitInput>({ resolver: zodResolver(kayitSchema) });

  async function onSubmit(data: KayitInput) {
    setError("");
    const res = await fetch("/api/auth/kayit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (!json.success) {
      setError(json.error.message);
    } else if (json.data?.message?.includes("e-posta")) {
      setAktivasyonMesaji(json.data.message);
    } else {
      router.push("/giris?kayit=basarili");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Kayıt Ol</CardTitle>
        </CardHeader>
        <CardContent>
          {aktivasyonMesaji ? (
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-base font-medium">kayıt başarılı</h3>
              <p className="text-sm text-green-600 dark:text-green-400">{aktivasyonMesaji}</p>
              <Link href="/giris" className="inline-flex items-center justify-center w-full h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors">
                giriş sayfasına dön
              </Link>
            </div>
          ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <div>
                <Input placeholder="Kullanıcı adı" {...register("username")} />
                {errors.username && (
                  <p className="text-sm text-destructive mt-1">{errors.username.message}</p>
                )}
              </div>
              <div>
                <Input placeholder="E-posta" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Input placeholder="Şifre" type="password" {...register("password")} />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Kayıt yapılıyor..." : "Kayıt Ol"}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Zaten hesabın var mı?{" "}
              <Link href="/giris" className="text-primary underline">
                Giriş yap
              </Link>
            </p>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
