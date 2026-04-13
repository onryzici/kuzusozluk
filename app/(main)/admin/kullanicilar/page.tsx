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

const ROLES = ["CAYLAK", "USER", "AUTHOR", "CO_MOD", "MODERATOR", "ADMIN"] as const;

export default function KullanicilarPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

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

  async function toggleBan(username: string, isBanned: boolean) {
    const body: Record<string, unknown> = { isBanned: !isBanned };

    if (!isBanned) {
      // banlıyoruz — ek seçenekleri sor
      const banIp = window.confirm(
        `${username} kullanıcısının ip adresleri de banlansın mı?\n\n` +
        "tamam = ip ban (bilinen tüm ip'leri engellenir)\n" +
        "iptal = sadece hesap banı"
      );
      const purge = window.confirm(
        `${username} kullanıcısının tüm içerikleri (entry, yorum, oy, mesaj) silinsin mi?\n\n` +
        "tamam = evet sil\n" +
        "iptal = içeriği bırak"
      );
      const reason = window.prompt("ban sebebi (opsiyonel):", "") || "";

      body.banIp = banIp;
      body.purgeContent = purge;
      if (reason.trim()) body.banReason = reason.trim();

      const summary = `${username} banlanacak.\n- ip ban: ${banIp ? "evet" : "hayır"}\n- içerik sil: ${purge ? "evet" : "hayır"}\n- sebep: ${reason || "-"}\n\nonaylıyor musun?`;
      if (!window.confirm(summary)) return;
    }

    setUpdating(username);
    try {
      const res = await fetch(`/api/admin/kullanicilar/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.username === username ? { ...u, isBanned: !isBanned } : u
          )
        );
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
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          admin paneli
        </Link>
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
                        onClick={() => toggleBan(user.username, user.isBanned)}
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
    </div>
  );
}
