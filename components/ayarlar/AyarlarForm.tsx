"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ayarlarSchema, type AyarlarInput } from "@/lib/validations/ayarlar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type AyarlarFormProps = {
  initialDisplayName: string;
  initialBio: string;
};

export default function AyarlarForm({
  initialDisplayName,
  initialBio,
}: AyarlarFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AyarlarInput>({
    resolver: zodResolver(ayarlarSchema),
    defaultValues: {
      displayName: initialDisplayName,
      bio: initialBio,
      currentPassword: "",
      newPassword: "",
    },
  });

  const onSubmit = async (data: AyarlarInput) => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/ayarlar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!json.success) {
        setStatus("error");
        setErrorMessage(json.error?.message || "bir hata oluştu");
        return;
      }

      setStatus("success");
      // Clear password fields after success
      reset({
        displayName: json.data.displayName || "",
        bio: json.data.bio || "",
        currentPassword: "",
        newPassword: "",
      });

      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setErrorMessage("bir hata oluştu, tekrar deneyin");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Profil bilgileri */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-foreground">profil bilgileri</h2>

        <div className="space-y-1.5">
          <label htmlFor="bio" className="text-xs text-muted-foreground">
            biyografi
          </label>
          <Textarea
            id="bio"
            placeholder="kendinizden bahsedin"
            className="text-sm min-h-[80px]"
            {...register("bio")}
          />
          {errors.bio && (
            <p className="text-xs text-destructive">{errors.bio.message}</p>
          )}
        </div>
      </div>

      {/* Şifre değiştirme */}
      <div className="space-y-4 border-t border-border/50 pt-6">
        <h2 className="text-sm font-medium text-foreground">şifre değiştir</h2>

        <div className="space-y-1.5">
          <label htmlFor="currentPassword" className="text-xs text-muted-foreground">
            mevcut şifre
          </label>
          <Input
            id="currentPassword"
            type="password"
            placeholder="mevcut şifreniz"
            className="text-sm"
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-xs text-muted-foreground">
            yeni şifre
          </label>
          <Input
            id="newPassword"
            type="password"
            placeholder="yeni şifreniz (en az 6 karakter)"
            className="text-sm"
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 border-t border-border/50 pt-6">
        <Button type="submit" size="sm" disabled={status === "loading"}>
          {status === "loading" ? "kaydediliyor..." : "kaydet"}
        </Button>

        {status === "success" && (
          <span className="text-xs text-green-600 dark:text-green-400">
            ayarlar kaydedildi
          </span>
        )}

        {status === "error" && (
          <span className="text-xs text-destructive">{errorMessage}</span>
        )}
      </div>
    </form>
  );
}
