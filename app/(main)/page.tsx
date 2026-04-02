import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AnaSayfa() {
  // son güncellenen başlığı bul ve oraya yönlendir
  const lastTopic = await prisma.topic.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { slug: true },
  });

  if (lastTopic) {
    redirect(`/baslik/${lastTopic.slug}`);
  }

  // hiç başlık yoksa boş sayfa
  return (
    <div className="px-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">henüz içerik yok.</p>
      <p className="text-muted-foreground text-xs mt-2">arama kutusuna bir başlık yazarak ilk başlığı aç.</p>
    </div>
  );
}
