"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatTarih } from "@/lib/utils/format";
import { parseEntryContent } from "@/lib/utils/entryParser";
import OyButonlari from "./OyButonlari";
import YorumListesi from "./YorumListesi";
import EntryEditor from "./EntryEditor";
import { Share2, MoreHorizontal, Link2, Flag, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type EntryKartProps = {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  authorUsername: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  isEdited: boolean;
  entryNumber: number;
  commentCount?: number;
  isCaylak?: boolean;
  currentUserId?: string | null;
  authorId?: string;
  currentUserRole?: string | null;
};

export default function EntryKart({
  id,
  content,
  upvotes,
  downvotes,
  authorUsername,
  authorAvatarUrl,
  createdAt,
  isEdited,
  commentCount = 0,
  isCaylak = false,
  currentUserId,
  authorId,
  currentUserRole,
}: EntryKartProps) {
  const router = useRouter();
  const isOwner = !!(currentUserId && authorId && currentUserId === authorId);
  const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "MODERATOR" || currentUserRole === "CO_MOD";
  const canDelete = isOwner || isAdmin;
  const [deleted, setDeleted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [currentContent, setCurrentContent] = useState(content);
  const [currentIsEdited, setCurrentIsEdited] = useState(isEdited);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [editLoading, setEditLoading] = useState(false);
  const parsedContent = parseEntryContent(currentContent);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleEditSubmit() {
    if (!editValue.trim() || editValue === currentContent) {
      setEditing(false);
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/entry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editValue }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentContent(editValue);
        setCurrentIsEdited(true);
        setEditing(false);
        toast.success("entry guncellendi");
      } else {
        toast.error(json.error?.message || "bir hata olustu");
      }
    } catch {
      toast.error("bir hata olustu");
    } finally {
      setEditLoading(false);
    }
  }

  function handleEditCancel() {
    setEditValue(currentContent);
    setEditing(false);
  }

  function handleShare() {
    const url = `${window.location.origin}/entry/${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      window.prompt("linki kopyalayın:", url);
    }
  }

  async function handleReport() {
    if (!reportReason.trim() || reportReason.trim().length < 5) {
      toast.error("şikayet sebebi en az 5 karakter olmalı");
      return;
    }
    setReportLoading(true);
    try {
      const res = await fetch(`/api/entry/${id}/sikayet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("şikayet gönderildi");
        setReportOpen(false);
        setReportReason("");
      } else {
        toast.error(json.error?.message || "bir hata oluştu");
      }
    } catch {
      toast.error("bir hata oluştu");
    } finally {
      setReportLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("bu entry'yi silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/entry/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDeleted(true);
        window.dispatchEvent(new Event("sidebar:refresh"));
        router.refresh();
      } else {
        toast.error(json.error?.message || "silinemedi");
      }
    } catch {
      toast.error("bir hata oluştu");
    }
  }

  if (deleted) return null;

  return (
    <article className="py-4 border-b border-border/40" id={`entry-${id}`}>
      {editing ? (
        <div className="space-y-2">
          <EntryEditor
            value={editValue}
            onChange={setEditValue}
            rows={4}
            disabled={editLoading}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleEditSubmit}
              disabled={editLoading || !editValue.trim()}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {editLoading ? "kaydediliyor..." : "kaydet"}
            </button>
            <button
              onClick={handleEditCancel}
              disabled={editLoading}
              className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors"
            >
              vazgec
            </button>
          </div>
        </div>
      ) : (
        <div
          className="entry-content text-sm leading-[1.85] text-foreground whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: parsedContent }}
        />
      )}

      <div className="flex items-center justify-between mt-3 flex-wrap gap-y-2">
        <div className="flex items-center gap-0.5 flex-wrap">
          <OyButonlari
            entryId={id}
            initialUpvotes={upvotes}
            initialDownvotes={downvotes}
            initialUserVote={null}
            initialFavorited={false}
          />
          <button
            onClick={handleShare}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors relative"
            title="paylaş"
          >
            <Share2 className="h-3.5 w-3.5" />
            {copied && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
                kopyalandı
              </span>
            )}
          </button>

          {/* üç nokta menüsü */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="diğer"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-1 w-40 bg-popover border border-border rounded-md shadow-lg z-20 py-1">
                  {isOwner && (
                    <button
                      onClick={() => {
                        setEditValue(currentContent);
                        setEditing(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <Pencil className="h-3 w-3" /> duzenle
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleShare();
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                  >
                    <Link2 className="h-3 w-3" /> link kopyala
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left text-destructive"
                  >
                    <Flag className="h-3 w-3" /> şikayet et
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleDelete();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> entry'yi sil
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* yazar */}
        <div className="flex items-center gap-2 min-w-0 shrink-0 max-w-[50%] sm:max-w-none">
          <div className="text-right min-w-0">
            <span className="flex items-center gap-1">
              <Link
                href={`/kullanici/${authorUsername}`}
                className="text-xs text-primary hover:underline font-medium"
              >
                {authorUsername}
              </Link>
              {isCaylak && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 font-medium">çaylak</span>
              )}
            </span>
            <div className="text-[10px] text-muted-foreground">
              <Link href={`/entry/${id}`} className="hover:underline">
                {formatTarih(createdAt)}
              </Link>
              {currentIsEdited && <span className="ml-1">~</span>}
            </div>
          </div>
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 overflow-hidden">
            {authorAvatarUrl ? (
              <Image
                src={authorAvatarUrl}
                alt={authorUsername}
                width={28}
                height={28}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              authorUsername[0]
            )}
          </div>
        </div>
      </div>

      <YorumListesi entryId={id} initialCount={commentCount} />

      {/* şikayet modal */}
      {reportOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setReportOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-popover border border-border rounded-lg shadow-xl w-full max-w-sm p-4">
              <h3 className="text-sm font-medium mb-3">entry'yi şikayet et</h3>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="şikayet sebebini yazın (en az 5 karakter)..."
                rows={3}
                maxLength={500}
                className="w-full text-sm p-2 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-muted-foreground">{reportReason.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setReportOpen(false); setReportReason(""); }}
                    className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent"
                  >
                    vazgeç
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={reportLoading || reportReason.trim().length < 5}
                    className="px-3 py-1 text-xs bg-destructive text-white rounded hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {reportLoading ? "gönderiliyor..." : "şikayet et"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
