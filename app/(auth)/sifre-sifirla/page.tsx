"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Step 1: Request reset link
const emailSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
});
type EmailInput = z.infer<typeof emailSchema>;

// Step 2: Set new password
const yeniSifreSchema = z.object({
  password: z
    .string()
    .min(6, "Şifre en az 6 karakter olmalı")
    .max(100, "Şifre en fazla 100 karakter olmalı"),
  passwordConfirm: z.string().min(1, "Şifre tekrarı gerekli"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Şifreler eşleşmiyor",
  path: ["passwordConfirm"],
});
type YeniSifreInput = z.infer<typeof yeniSifreSchema>;

function EmailFormu() {
  const [gonderildi, setGonderildi] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailInput>({ resolver: zodResolver(emailSchema) });

  async function onSubmit(data: EmailInput) {
    setError("");
    try {
      const res = await fetch("/api/auth/sifre-sifirla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        setGonderildi(true);
      } else {
        setError(json.error.message);
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  if (gonderildi) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">E-posta Gönderildi</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.
            Lütfen e-posta kutunuzu kontrol edin.
          </p>
          <Link href="/giris" className="inline-flex items-center justify-center w-full h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors">
            giriş sayfasına dön
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Şifre Sıfırla</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Kayıtlı e-posta adresinizi girin. Şifre sıfırlama bağlantısı göndereceğiz.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <div>
            <Input placeholder="E-posta" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground text-center mt-4">
          <Link href="/giris" className="text-primary underline">
            Giriş sayfasına dön
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function YeniSifreFormu({ token }: { token: string }) {
  const [basarili, setBasarili] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<YeniSifreInput>({ resolver: zodResolver(yeniSifreSchema) });

  async function onSubmit(data: YeniSifreInput) {
    setError("");
    try {
      const res = await fetch("/api/auth/sifre-yenile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();

      if (json.success) {
        setBasarili(true);
      } else {
        setError(json.error.message);
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  if (basarili) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Şifre Güncellendi</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-green-600 dark:text-green-400">
            Şifreniz başarıyla güncellendi.
          </p>
          <Link href="/giris" className="inline-flex items-center justify-center w-full h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            giriş yap
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Yeni Şifre Belirle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <div>
            <Input placeholder="Yeni şifre" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Input placeholder="Yeni şifre (tekrar)" type="password" {...register("passwordConfirm")} />
            {errors.passwordConfirm && (
              <p className="text-sm text-destructive mt-1">{errors.passwordConfirm.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Güncelleniyor..." : "Şifremi Güncelle"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SifreSifirlaIcerik() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (token) {
    return <YeniSifreFormu token={token} />;
  }

  return <EmailFormu />;
}

export default function SifreSifirlaSayfa() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div className="animate-pulse h-64 w-96 bg-muted rounded" />}>
        <SifreSifirlaIcerik />
      </Suspense>
    </div>
  );
}
