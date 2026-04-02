"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

type HesapSilProps = {
  username: string;
};

export default function HesapSil({ username }: HesapSilProps) {
  const [confirmUsername, setConfirmUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isMatch = confirmUsername === username;

  async function handleDelete() {
    if (!isMatch) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/ayarlar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUsername }),
      });

      const json = await res.json();

      if (!json.success) {
        setStatus("error");
        setErrorMessage(json.error?.message || "bir hata oluştu");
        return;
      }

      await signOut({ callbackUrl: "/" });
    } catch {
      setStatus("error");
      setErrorMessage("bir hata oluştu, tekrar deneyin");
    }
  }

  return (
    <div className="border border-destructive/30 rounded-md p-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-destructive">tehlikeli bölge</h2>
        <p className="text-xs text-muted-foreground mt-1">
          hesabınızı sildiğinizde tüm entryleriniz, oylarınız, favorileriniz ve
          mesajlarınız kalıcı olarak silinir. bu işlem geri alınamaz.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmUsername" className="text-xs text-muted-foreground">
          onaylamak için kullanıcı adınızı yazın: <span className="font-medium text-foreground">{username}</span>
        </label>
        <Input
          id="confirmUsername"
          value={confirmUsername}
          onChange={(e) => setConfirmUsername(e.target.value)}
          placeholder={username}
          className="text-sm max-w-xs"
          disabled={status === "loading"}
        />
      </div>

      {status === "error" && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}

      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={!isMatch || status === "loading"}
        onClick={handleDelete}
      >
        {status === "loading" ? "siliniyor..." : "hesabımı kalıcı olarak sil"}
      </Button>
    </div>
  );
}
