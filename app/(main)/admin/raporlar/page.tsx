"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Report = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string };
  entry: {
    id: string;
    content: string;
    author: { id: string; username: string };
    topic: { slug: string; title: string };
  };
};

export default function RaporlarPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/raporlar?durum=PENDING");
      const json = await res.json();
      if (json.success) setReports(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  async function updateStatus(id: string, status: "REVIEWED" | "DISMISSED") {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/raporlar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        setReports((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">yukleniyor...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">raporlar</h1>
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          admin paneli
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">bekleyen rapor yok.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">sikayet eden:</span>{" "}
                    <Link
                      href={`/kullanici/${report.reporter.username}`}
                      className="font-medium hover:underline"
                    >
                      {report.reporter.username}
                    </Link>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">neden:</span>{" "}
                    {report.reason}
                  </p>
                  <div className="border-l-2 border-muted pl-3 mt-2">
                    <p className="text-xs text-muted-foreground">
                      entry (
                      <Link
                        href={`/baslik/${report.entry.topic.slug}`}
                        className="hover:underline"
                      >
                        {report.entry.topic.title}
                      </Link>
                      {" "}- yazan:{" "}
                      <Link
                        href={`/kullanici/${report.entry.author.username}`}
                        className="hover:underline"
                      >
                        {report.entry.author.username}
                      </Link>
                      )
                    </p>
                    <p className="text-sm mt-1 line-clamp-3">
                      {report.entry.content}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => updateStatus(report.id, "REVIEWED")}
                    disabled={updating === report.id}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    onayla
                  </button>
                  <button
                    onClick={() => updateStatus(report.id, "DISMISSED")}
                    disabled={updating === report.id}
                    className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-50"
                  >
                    reddet
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(report.createdAt).toLocaleString("tr-TR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
