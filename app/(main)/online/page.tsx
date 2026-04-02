import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Circle } from "lucide-react";

export const dynamic = "force-dynamic";

function formatOnlineSure(lastSeen: Date): string {
  const now = Date.now();
  const diff = now - lastSeen.getTime();
  const dakika = Math.floor(diff / 60000);
  const saat = Math.floor(dakika / 60);

  if (dakika < 1) return "az önce";
  if (dakika < 60) return `${dakika} dk önce`;
  return `${saat} saat ${dakika % 60} dk önce`;
}

export default async function OnlineSayfa() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const onlineUsers = await prisma.user.findMany({
    where: { lastSeen: { gte: fiveMinAgo } },
    orderBy: { lastSeen: "desc" },
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      lastSeen: true,
      role: true,
      entryCount: true,
    },
  });

  const recentUsers = await prisma.user.findMany({
    where: { lastSeen: { lt: fiveMinAgo, gte: new Date(Date.now() - 60 * 60 * 1000) } },
    orderBy: { lastSeen: "desc" },
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      lastSeen: true,
      role: true,
      entryCount: true,
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold mb-4">şu an online ({onlineUsers.length})</h1>

      {onlineUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">şu an kimse online değil.</p>
      ) : (
        <div className="space-y-1 mb-8">
          {onlineUsers.map((user) => (
            <Link
              key={user.username}
              href={`/kullanici/${user.username}`}
              className="flex items-center justify-between py-2 px-3 rounded hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Circle className="h-2 w-2 fill-green-500 text-green-500 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-primary">{user.username}</span>
                  {user.displayName && (
                    <span className="text-xs text-muted-foreground ml-2">{user.displayName}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground">{formatOnlineSure(user.lastSeen)}</span>
                <span className="text-[10px] text-muted-foreground block">{user.entryCount} entry</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {recentUsers.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">son 1 saatte aktif</h2>
          <div className="space-y-1">
            {recentUsers.map((user) => (
              <Link
                key={user.username}
                href={`/kullanici/${user.username}`}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Circle className="h-2 w-2 fill-muted-foreground text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground/70">{user.username}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{formatOnlineSure(user.lastSeen)}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
