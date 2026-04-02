import { prisma } from "@/lib/prisma";
import { BarChart3, Users, BookOpen, MessageSquare, ThumbsUp, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function IstatistiklerPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    totalEntries,
    totalTopics,
    totalVotes,
    todayEntries,
    topUsers,
    topTopics,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.entry.count(),
    prisma.topic.count(),
    prisma.vote.count(),
    prisma.entry.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.findMany({
      orderBy: { entryCount: "desc" },
      take: 5,
      select: { username: true, entryCount: true, karma: true },
    }),
    prisma.topic.findMany({
      orderBy: { entryCount: "desc" },
      take: 5,
      select: { title: true, slug: true, entryCount: true },
    }),
  ]);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium text-foreground">istatistikler</h1>
      </div>

      {/* genel istatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <StatCard icon={<Users className="h-4 w-4" />} label="toplam kullanici" value={totalUsers} />
        <StatCard icon={<MessageSquare className="h-4 w-4" />} label="toplam entry" value={totalEntries} />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="toplam baslik" value={totalTopics} />
        <StatCard icon={<ThumbsUp className="h-4 w-4" />} label="toplam oy" value={totalVotes} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="bugunun entryleri" value={todayEntries} />
      </div>

      {/* en aktif kullanicilar */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-foreground mb-3">
          en aktif kullanicilar
        </h2>
        <div className="space-y-1">
          {topUsers.map((user, i) => (
            <div
              key={user.username}
              className="flex items-center gap-3 py-2 border-b border-border/40"
            >
              <span className="text-xs text-muted-foreground w-5 text-right">
                {i + 1}
              </span>
              <Link
                href={`/kullanici/${user.username}`}
                className="text-sm text-primary hover:underline flex-1"
              >
                {user.username}
              </Link>
              <span className="text-xs text-muted-foreground">
                {user.entryCount} entry
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">
                {user.karma} karma
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* en populer basliklar */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">
          en populer basliklar
        </h2>
        <div className="space-y-1">
          {topTopics.map((topic, i) => (
            <div
              key={topic.slug}
              className="flex items-center gap-3 py-2 border-b border-border/40"
            >
              <span className="text-xs text-muted-foreground w-5 text-right">
                {i + 1}
              </span>
              <Link
                href={`/baslik/${topic.slug}`}
                className="text-sm text-primary hover:underline flex-1 min-w-0 truncate"
              >
                {topic.title}
              </Link>
              <span className="text-xs text-muted-foreground shrink-0">
                {topic.entryCount} entry
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}</div>
      <p className="text-2xl font-bold">{value.toLocaleString("tr-TR")}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
