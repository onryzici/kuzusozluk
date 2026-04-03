import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AyarlarForm from "@/components/ayarlar/AyarlarForm";
import AvatarYukle from "@/components/kullanici/AvatarYukle";
import HesapSil from "@/components/ayarlar/HesapSil";
import TemaSec from "@/components/ayarlar/TemaSec";

export default async function AyarlarSayfa() {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris?callbackUrl=/ayarlar");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      displayName: true,
      bio: true,
      username: true,
      email: true,
      avatarUrl: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/giris");
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="px-4 py-6 max-w-lg">
      <h1 className="text-base font-medium text-foreground mb-1">hesap ayarları</h1>
      <p className="text-xs text-muted-foreground mb-6">
        {user.username} &middot; {user.email}
      </p>

      <AvatarYukle
        currentAvatarUrl={user.avatarUrl}
        username={user.username}
      />

      <AyarlarForm
        initialDisplayName={user.displayName || ""}
        initialBio={user.bio || ""}
      />

      <TemaSec />

      {isAdmin && (
        <div className="mt-10">
          <HesapSil username={user.username} />
        </div>
      )}
    </div>
  );
}
