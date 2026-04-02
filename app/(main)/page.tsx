import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnaSayfa() {
  // bugün entry girilen başlıkları bul
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTopics = await prisma.topic.findMany({
    where: { updatedAt: { gte: today } },
    select: { slug: true },
  });

  if (todayTopics.length > 0) {
    // rastgele birini seç
    const random = todayTopics[Math.floor(Math.random() * todayTopics.length)];
    redirect(`/baslik/${random.slug}`);
  }

  // bugün başlık yoksa boş sayfa
  return (
    <div className="px-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">bugün henüz içerik yok.</p>
      <p className="text-muted-foreground text-xs mt-2">arama kutusuna bir başlık yazarak ilk başlığı aç.</p>
    </div>
  );
}
