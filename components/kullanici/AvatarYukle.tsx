"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type AvatarYukleProps = {
  currentAvatarUrl: string | null;
  username: string;
};

export default function AvatarYukle({ currentAvatarUrl, username }: AvatarYukleProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("yalnızca jpg, png ve webp dosyaları kabul edilir");
      setStatus("error");
      return;
    }

    if (file.size > 500 * 1024) {
      setErrorMessage("dosya boyutu en fazla 500KB olabilir");
      setStatus("error");
      return;
    }

    setSelectedFile(file);
    setStatus("idle");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!json.success) {
        setStatus("error");
        setErrorMessage(json.error?.message || "bir hata olustu");
        return;
      }

      setStatus("success");
      setSelectedFile(null);
      setPreview(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        setStatus("idle");
        router.refresh();
      }, 1500);
    } catch {
      setStatus("error");
      setErrorMessage("bir hata olustu, tekrar deneyin");
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    setStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = preview || currentAvatarUrl;
  const initial = username[0]?.toUpperCase() || "?";

  return (
    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
      <div className="relative group">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={`${username} avatar`}
              width={64}
              height={64}
              className="h-full w-full object-cover"
              unoptimized={displayUrl.startsWith("data:") || displayUrl.startsWith("/uploads/")}
            />
          ) : (
            initial
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="avatar degistir"
        >
          <Camera className="h-5 w-5 text-white" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{username}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          jpg, png veya webp. en fazla 500KB.
        </p>

        {selectedFile && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              size="sm"
              onClick={handleUpload}
              disabled={status === "loading"}
              className="h-7 text-xs"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  yukleniyor...
                </>
              ) : (
                "yukle"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={status === "loading"}
              className="h-7 text-xs"
            >
              iptal
            </Button>
          </div>
        )}

        {!selectedFile && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            degistir
          </button>
        )}

        {status === "success" && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            avatar guncellendi
          </p>
        )}

        {status === "error" && (
          <p className="text-xs text-destructive mt-1">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
