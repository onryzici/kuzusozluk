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

const COMOD_ROLES = ["CAYLAK", "AUTHOR"] as const;

export default function CoModPage() {
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
      if (res.status === 403) {
        setLoading(false);
        return;
      }
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
        <h1 className="text-xl font-semibold">co-mod paneli</h1>
        <span className="text-xs text-muted-foreground">
          {total} kullanici
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        caylak ve yazar kullanicilarin rollerini degistirebilirsiniz.
      </p>

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
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.username, e.target.value)}
                        disabled={updating === user.username}
                        className="text-xs border rounded px-1 py-0.5 bg-background disabled:opacity-50"
                      >
                        {COMOD_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r === "CAYLAK" ? "çaylak" : "yazar"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      {user.isBanned ? (
                        <span className="text-xs text-red-600 font-medium">banlı</span>
                      ) : user.isActive ? (
                        <span className="text-xs text-green-600">aktif</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">pasif</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{user.entryCount}</td>
                    <td className="py-2 pr-4">{user.karma}</td>
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
