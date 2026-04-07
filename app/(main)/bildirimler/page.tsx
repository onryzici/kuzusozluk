import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatZamanOnce } from "@/lib/utils/format";
import { AtSign, MessageSquare, ThumbsUp, UserPlus, Mail, Bell } from "lucide-react";

const typeIcons: Record<string, typeof Bell> = {
  MENTION: AtSign,
  REPLY: MessageSquare,
  VOTE: ThumbsUp,
  FOLLOW: UserPlus,
  MESSAGE: Mail,
};

const typeLabels: Record<string, string> = {
  MENTION: "etiketleme",
  REPLY: "yorum",
  VOTE: "begeni",
  FOLLOW: "takip",
  MESSAGE: "mesaj",
};

export default async function BildirimlerPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string;

  // Mark all as read on page load
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });

  return (
    <div className="w-full max-w-3xl px-4 lg:px-8 py-6">
      <h1 className="text-lg font-semibold mb-4">bildirimler</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          henuz bildiriminiz yok
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border bg-card">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            const label = typeLabels[n.type] || "";

            return (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                <div className="shrink-0 mt-0.5 p-1.5 rounded-full bg-muted">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <Link
                      href={`/kullanici/${n.actor.username}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {n.actor.username}
                    </Link>{" "}
                    <span className="text-muted-foreground">{n.content}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatZamanOnce(n.createdAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      {label}
                    </span>
                  </div>
                  {n.link && (
                    <Link
                      href={n.link}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      goruntule
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
