"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ScrollText, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type LogEntry = {
  id: string;
  action: string;
  detail: string;
  ip: string | null;
  createdAt: string;
  user: { username: string; role: string };
};

type Meta = {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  ENTRY_CREATE: { label: "entry yazma", color: "text-green-500" },
  ENTRY_DELETE: { label: "entry silme", color: "text-red-500" },
  ENTRY_EDIT: { label: "entry duzenleme", color: "text-yellow-500" },
  TOPIC_CREATE: { label: "baslik acma", color: "text-green-500" },
  TOPIC_DELETE: { label: "baslik silme", color: "text-red-500" },
  TOPIC_LOCK: { label: "baslik kilitleme", color: "text-orange-500" },
  TOPIC_PIN: { label: "baslik sabitleme", color: "text-blue-500" },
  USER_BAN: { label: "kullanici banlama", color: "text-red-500" },
  USER_UNBAN: { label: "ban kaldirma", color: "text-green-500" },
  USER_ROLE_CHANGE: { label: "rol degisikligi", color: "text-purple-500" },
  USER_DELETE: { label: "hesap silme", color: "text-red-600" },
  COMMENT_CREATE: { label: "yorum yazma", color: "text-green-400" },
  MESSAGE_SEND: { label: "mesaj gonderme", color: "text-blue-400" },
  REPORT_REVIEW: { label: "rapor inceleme", color: "text-orange-400" },
  LOGIN: { label: "giris", color: "text-gray-400" },
  REGISTER: { label: "kayit", color: "text-green-400" },
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export default function AdminLogPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") return;

    setLoading(true);
    const params = new URLSearchParams({ sayfa: String(page), boyut: "50" });
    if (filter) params.set("action", filter);
    if (usernameFilter.trim()) params.set("username", usernameFilter.trim());

    fetch(`/api/admin/log?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setLogs(json.data);
          setMeta(json.meta);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter, usernameFilter, session]);

  if (session && session.user?.role !== "ADMIN") {
    redirect("/");
  }

  const totalPages = meta ? Math.ceil(meta.total / meta.pageSize) : 1;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium">log kayitlari</h1>
        {meta && (
          <span className="text-xs text-muted-foreground">({meta.total} kayit)</span>
        )}
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="text-xs bg-background border border-border rounded px-2 py-1.5"
        >
          <option value="">tum islemler</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]?.label || a}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="kullanici adi..."
          value={usernameFilter}
          onChange={(e) => { setUsernameFilter(e.target.value); setPage(1); }}
          className="text-xs bg-background border border-border rounded px-2 py-1.5 w-36"
        />
      </div>

      {/* Log Tablosu */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">tarih</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">kullanici</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">islem</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">detay</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">ip</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    yukleniyor...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    log kaydi bulunamadi
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "text-foreground" };
                  return (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "dd MMM HH:mm", { locale: tr })}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {log.user.username}
                      </td>
                      <td className={`px-3 py-2 font-medium ${actionInfo.color}`}>
                        {actionInfo.label}
                      </td>
                      <td className="px-3 py-2 text-foreground/80 max-w-xs truncate">
                        {log.detail}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground font-mono">
                        {log.ip || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sayfalama */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
