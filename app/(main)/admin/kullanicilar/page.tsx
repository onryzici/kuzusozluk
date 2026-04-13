"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  karma: number;
  entryCount: number;
  createdAt: string;
};

const ROLES = ["CAYLAK", "USER", "CO_MOD", "MODERATOR", "ADMIN"] as const;

type BanModalState = {
  username: string;
  banIp: boolean;
  purgeContent: boolean;
  banReason: string;
};

export default function KullanicilarPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [banModal, setBanModal] = useState<BanModalState | null>(null);

  async function fetchUsers(p = 1, q = "") {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sayfa: String(p), boyut: "20" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/kullanicilar?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        setHasMore(json.meta.hasMore);
        setTotal(json.meta.total);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search]);

  async function unban(username: string) {
    setUpdating(username);
    try {
      const res = await fetch(`/api/admin/kullanicilar/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: false }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) => (u.username === username ? { ...u, isBanned: false } : u)));
      } else {
        alert(json.error?.message || "hata");
      }
    } finally {
      setUpdating(null);
    }
  }

  async function submitBan() {
    if (!banModal) return;
    const { username, banIp, purgeContent, banReason } = banModal;
    setUpdating(username);
    try {
      const res = await fetch(`/api/admin/kullanicilar/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBanned: true,
          banIp,
          purgeContent,
          banReason: banReason.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) => (u.username === username ? { ...u, isBanned: true } : u)));
        setBanModal(null);
      } else {
        alert(json.error?.message || "hata");
      }
    } finally {
      setUpdating(null);
    }
  }

  async function changeRole(username: string, role: string) {
    setUpdating(username);
    try {
      const res = await fetch(`/api/admin/kullanicilar/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.username === username ? { ...u, role: json.data.role } : u
          )
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">kullanicilar ({total})</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (!window.confirm("tüm AUTHOR rolündeki kullanıcıları USER'a çevirmek istiyor musun?")) return;
              const res = await fetch("/api/admin/author-temizle", { method: "POST" });
              const json = await res.json();
              if (json.success) {
                alert(`${json.data.converted} kullanıcı user'a çevrildi`);
                fetchUsers(page, search);
              } else {
                alert(json.error?.message || "hata");
              }
            }}
            className="text-xs px-2 py-1 border rounded hover:bg-accent"
            title="AUTHOR rolu kaldirildigi icin mevcut author'lari user'a cevirir"
          >
            author → user
          </button>
          <button
            onClick={async () => {
              if (!window.confirm("base64 avatarları küçültüp dosyaya çevirmek istiyor musun? (tek seferlik, geri alınamaz)")) return;
              const res = await fetch("/api/admin/avatar-migrate", { method: "POST" });
              const json = await res.json();
              if (json.success) {
                alert(`tarandı: ${json.data.scanned}\ngöç edildi: ${json.data.migrated}\natlandı: ${json.data.skipped}\nhata: ${json.data.errors.length}`);
                fetchUsers(page, search);
              } else {
                alert(json.error?.message || "hata");
              }
            }}
            className="text-xs px-2 py-1 border rounded hover:bg-accent"
            title="data:... ile kaydedilmis eski avatarlari Upload tablosuna tasir, icerik boyutunu onemli olcude dusurur"
          >
            avatar migrate
          </button>
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            admin paneli
          </Link>
        </div>
      </div>

      <input
        type="text"
        placeholder="kullanici ara..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="w-full max-w-sm border rounded-md px-3 py-2 text-sm bg-background"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">yukleniyor...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">kullanici bulunamadi.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">kullanici</th>
                  <th className="py-2 pr-4">rol</th>
                  <th className="py-2 pr-4">durum</th>
                  <th className="py-2 pr-4">entry</th>
                  <th className="py-2 pr-4">karma</th>
                  <th className="py-2">islemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/kullanici/${user.username}`}
                        className="font-medium hover:underline"
                      >
                        {user.username}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.username, e.target.value)}
                        disabled={updating === user.username}
                        className="text-xs border rounded px-1 py-0.5 bg-background disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      {user.isBanned ? (
                        <span className="text-xs text-red-600 font-medium">banlandi</span>
                      ) : user.isActive ? (
                        <span className="text-xs text-green-600">aktif</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">pasif</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{user.entryCount}</td>
                    <td className="py-2 pr-4">{user.karma}</td>
                    <td className="py-2">
                      <button
                        onClick={() =>
                          user.isBanned
                            ? unban(user.username)
                            : setBanModal({
                                username: user.username,
                                banIp: true,
                                purgeContent: false,
                                banReason: "",
                              })
                        }
                        disabled={updating === user.username}
                        className={`text-xs px-2 py-1 rounded disabled:opacity-50 ${
                          user.isBanned
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        {user.isBanned ? "bani kaldir" : "banla"}
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`${user.username} hesabını ve tüm içeriklerini kalıcı olarak silmek istediğinize emin misiniz?`)) return;
                          const res = await fetch(`/api/admin/kullanicilar/${user.username}`, { method: "DELETE" });
                          const json = await res.json();
                          if (json.success) fetchUsers();
                          else alert(json.error?.message || "hata");
                        }}
                        className="text-[11px] px-2 py-1 rounded bg-red-900 text-white hover:bg-red-800"
                      >
                        sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs px-3 py-1.5 border rounded disabled:opacity-50"
            >
              onceki
            </button>
            <span className="text-xs text-muted-foreground">sayfa {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="text-xs px-3 py-1.5 border rounded disabled:opacity-50"
            >
              sonraki
            </button>
          </div>
        </>
      )}

      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setBanModal(null)}>
          <div
            className="w-full max-w-md bg-background border rounded-lg p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold">{banModal.username} banlanacak</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                seçenekleri ayarla ve onayla.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={banModal.banIp}
                onChange={(e) => setBanModal({ ...banModal, banIp: e.target.checked })}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium">ip ban</div>
                <div className="text-xs text-muted-foreground">
                  kullanıcının audit log&apos;daki bütün ip&apos;leri engellenir. modem resetlese bile bilinen ip&apos;ler girene kadar dönse kapalı.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={banModal.purgeContent}
                onChange={(e) => setBanModal({ ...banModal, purgeContent: e.target.checked })}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium">tüm içerikleri sil</div>
                <div className="text-xs text-muted-foreground">
                  entry, yorum, oy, favori, mesaj, bildirim, anket, ukde. geri alınamaz.
                </div>
              </div>
            </label>

            <div className="space-y-1">
              <label className="text-xs font-medium">sebep (opsiyonel)</label>
              <input
                type="text"
                value={banModal.banReason}
                onChange={(e) => setBanModal({ ...banModal, banReason: e.target.value })}
                placeholder="küfür, spam, vs."
                className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBanModal(null)}
                disabled={updating === banModal.username}
                className="text-xs px-3 py-1.5 border rounded hover:bg-accent disabled:opacity-50"
              >
                vazgeç
              </button>
              <button
                onClick={submitBan}
                disabled={updating === banModal.username}
                className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {updating === banModal.username ? "banlanıyor..." : "banla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
