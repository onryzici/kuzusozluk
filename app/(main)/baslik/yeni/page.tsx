import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import YeniBaslikForm from "@/components/baslik/YeniBaslikForm";

type Props = {
  searchParams: Promise<{ title?: string; taslak?: string }>;
};

export default async function YeniBaslikSayfa({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris?callbackUrl=/baslik/yeni");
  }

  // DB'den güncel rolü al — JWT eskimiş olabilir
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (dbUser?.role === "CAYLAK") {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto text-center space-y-3">
        <h1 className="text-base font-medium text-foreground">başlık açamazsınız</h1>
        <p className="text-sm text-muted-foreground">
          çaylak rolündeki yazarlar başlık açamaz. admin terfi verdikten sonra açabilirsiniz.
        </p>
      </div>
    );
  }

  const { title, taslak } = await searchParams;

  let draftData: { id: string; title: string; content: string } | null = null;
  if (taslak) {
    const draft = await prisma.topicDraft.findUnique({
      where: { id: taslak },
      select: { id: true, title: true, content: true, authorId: true },
    });
    if (draft && draft.authorId === session.user.id) {
      draftData = { id: draft.id, title: draft.title, content: draft.content };
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-base font-medium text-foreground mb-1">yeni başlık oluştur</h1>
      <p className="text-xs text-muted-foreground mb-6">
        başlık ve ilk entry ile birlikte yeni bir konu açın.
      </p>
      <YeniBaslikForm
        initialTitle={draftData?.title || title || ""}
        initialContent={draftData?.content || ""}
        draftId={draftData?.id}
      />
    </div>
  );
}
