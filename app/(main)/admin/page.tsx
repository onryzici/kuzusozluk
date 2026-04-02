import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [reportCount, userCount, entryCount, topicCount, bannedCount, announcementCount] =
    await Promise.all([
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.entry.count(),
      prisma.topic.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.announcement.count({ where: { isActive: true } }),
    ]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">admin paneli</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="bekleyen rapor" value={reportCount} href="/admin/raporlar" />
        <StatCard label="toplam kullanici" value={userCount} href="/admin/kullanicilar" />
        <StatCard label="toplam entry" value={entryCount} />
        <StatCard label="toplam baslik" value={topicCount} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="banlanan kullanici" value={bannedCount} />
        <StatCard label="aktif duyuru" value={announcementCount} href="/admin/duyuru" />
      </div>

      <div className="flex gap-3 pt-4">
        <Link
          href="/admin/raporlar"
          className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          raporlari goruntule
        </Link>
        <Link
          href="/admin/kullanicilar"
          className="text-sm px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          kullanicilari yonet
        </Link>
        <Link
          href="/admin/duyuru"
          className="text-sm px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          duyurulari yonet
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="border rounded-lg p-4 space-y-1">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }
  return content;
}
