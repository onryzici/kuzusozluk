"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pin, PinOff, Trash2, Eye, EyeOff } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
  author: { id: string; username: string };
}

export default function AdminDuyuruPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchAnnouncements();
  }, [session, status, router]);

  async function fetchAnnouncements() {
    try {
      const res = await fetch("/api/admin/duyuru");
      const json = await res.json();
      if (json.success) setAnnouncements(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/duyuru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), isPinned }),
      });
      const json = await res.json();
      if (json.success) {
        setAnnouncements((prev) => [json.data, ...prev]);
        setTitle("");
        setContent("");
        setIsPinned(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id: string, field: "isPinned" | "isActive", value: boolean) {
    const res = await fetch(`/api/admin/duyuru/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const json = await res.json();
    if (json.success) {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("bu duyuruyu silmek istediginize emin misiniz?")) return;
    const res = await fetch(`/api/admin/duyuru/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">yukleniyor...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">duyuru yonetimi</h1>

      {/* create form */}
      <form onSubmit={handleCreate} className="border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium">yeni duyuru</h2>
        <input
          type="text"
          placeholder="baslik"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          maxLength={200}
        />
        <textarea
          placeholder="icerik"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background min-h-[80px]"
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            sabitle
          </label>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "kaydediliyor..." : "olustur"}
          </button>
        </div>
      </form>

      {/* list */}
      <div className="space-y-2">
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">henuz duyuru yok.</p>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className={`border rounded-lg p-4 space-y-2 ${
                !a.isActive ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium">
                    {a.isPinned && (
                      <Pin className="inline h-3 w-3 mr-1 text-primary" />
                    )}
                    {a.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                    {a.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {a.author.username} &middot;{" "}
                    {new Date(a.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(a.id, "isPinned", !a.isPinned)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    title={a.isPinned ? "sabitlemeyi kaldir" : "sabitle"}
                  >
                    {a.isPinned ? (
                      <PinOff className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggle(a.id, "isActive", !a.isActive)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    title={a.isActive ? "deaktif et" : "aktif et"}
                  >
                    {a.isActive ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded hover:bg-accent text-destructive"
                    title="sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
