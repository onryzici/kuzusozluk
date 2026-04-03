"use client";

import { useState, useEffect } from "react";
import { X, Plus, Shield } from "lucide-react";

export default function YasakliKelimelerSayfa() {
  const [kelimeler, setKelimeler] = useState<string[]>([]);
  const [yeni, setYeni] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/yasakli")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setKelimeler(json.data);
      })
      .catch(() => {});
  }, []);

  async function ekle() {
    if (!yeni.trim() || yeni.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/yasakli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelime: yeni }),
      });
      const json = await res.json();
      if (json.success) {
        setKelimeler(json.data);
        setYeni("");
      }
    } catch {}
    setLoading(false);
  }

  async function sil(kelime: string) {
    try {
      const res = await fetch("/api/admin/yasakli", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelime }),
      });
      const json = await res.json();
      if (json.success) setKelimeler(json.data);
    } catch {}
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium">yasaklı kelimeler</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        bu kelimeleri içeren entry, başlık, yorum ve mesajlar engellenir. kelimeler küçük harfe dönüştürülüp kontrol edilir.
      </p>

      {/* ekle */}
      <div className="flex gap-2 mb-6">
        <input
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ekle()}
          placeholder="yasaklı kelime ekle..."
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={ekle}
          disabled={loading || !yeni.trim()}
          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> ekle
        </button>
      </div>

      {/* liste */}
      <div className="space-y-1">
        {kelimeler.map((k) => (
          <div
            key={k}
            className="flex items-center justify-between py-2 px-3 rounded hover:bg-accent/60 transition-colors"
          >
            <span className="text-sm">{k}</span>
            <button
              onClick={() => sil(k)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="kaldır"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {kelimeler.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">yasaklı kelime yok.</p>
      )}

      <p className="text-[10px] text-muted-foreground mt-6">
        not: sunucu yeniden başlatıldığında eklenen/silinen kelimeler sıfırlanır. kalıcı liste için kod güncellemesi gerekir.
      </p>
    </div>
  );
}
