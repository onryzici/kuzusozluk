"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, BarChart3 } from "lucide-react";

type AnketOlusturProps = {
  topicSlug: string;
  onClose?: () => void;
};

export default function AnketOlustur({ topicSlug, onClose }: AnketOlusturProps) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addOption() {
    if (options.length >= 6) return;
    setOptions([...options, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!trimmedQuestion) {
      setError("soru bos olamaz");
      return;
    }
    if (trimmedOptions.length < 2) {
      setError("en az 2 secenek olmali");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/baslik/${topicSlug}/anket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, options: trimmedOptions }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "bir hata olustu");
        return;
      }

      setQuestion("");
      setOptions(["", ""]);
      onClose?.();
      router.refresh();
    } catch {
      setError("bir hata olustu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <BarChart3 className="h-4 w-4 text-primary" />
        anket olustur
      </div>

      <Input
        placeholder="soru..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={300}
        className="text-sm"
      />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder={`secenek ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              maxLength={200}
              className="text-sm"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 6 && (
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3 w-3" />
          secenek ekle
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={loading} className="text-xs">
          {loading ? "olusturuluyor..." : "anketi olustur"}
        </Button>
        {onClose && (
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
            vazgec
          </Button>
        )}
      </div>
    </form>
  );
}
