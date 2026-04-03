import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatTarih } from "@/lib/utils/format";
import EntryKart from "@/components/entry/EntryKart";
import Link from "next/link";
import { Calendar, MessageSquare, Award, Send } from "lucide-react";
import { auth } from "@/lib/auth";
import TakipButon from "@/components/kullanici/TakipButon";
import Image from "next/image";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ sekme?: string }>;
};

export default async function KullaniciProfil({ params, searchParams }: Props) {
  const { username } = await params;
  const { sekme = "entryler" } = await searchParams;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      role: true,
      karma: true,
      entryCount: true,
      generation: true,
      createdAt: true,
      _count: { select: { following: true, followers: true } },
    },
  });

  if (!user) notFound();

  let content: React.ReactNode = null;

  if (sekme === "entryler") {
    const entries = await prisma.entry.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        topic: { select: { title: true, slug: true } },
      },
    });

    content = entries.length > 0 ? (
      <div className="divide-y divide-border/60">
        {entries.map((e, idx) => (
          <div key={e.id}>
            <Link href={`/baslik/${e.topic.slug}`} className="text-xs text-primary hover:underline font-medium inline-block pt-3">
              {e.topic.title}
            </Link>
            <EntryKart
              id={e.id}
              content={e.content}
              upvotes={e.upvotes}
              downvotes={e.downvotes}
              authorUsername={e.author.username}
              authorAvatarUrl={e.author.avatarUrl}
              createdAt={e.createdAt.toISOString()}
              isEdited={e.isEdited}
              entryNumber={idx + 1}
            />
          </div>
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground text-center py-12 text-sm">henüz entry yok.</p>
    );
  } else if (sekme === "takip") {
    const followingList = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: {
        following: {
          select: { username: true, displayName: true, avatarUrl: true, entryCount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    content = followingList.length > 0 ? (
      <div className="space-y-1">
        {followingList.map((f) => (
          <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-accent/60 transition-colors">
            <Link href={`/kullanici/${f.following.username}`} className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                {f.following.username[0]}
              </div>
              <div>
                <span className="text-sm text-primary font-medium">{f.following.username}</span>
                {f.following.displayName && (
                  <span className="text-xs text-muted-foreground ml-2">{f.following.displayName}</span>
                )}
              </div>
            </Link>
            <span className="text-[11px] text-muted-foreground">{f.following.entryCount} entry</span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground text-center py-12 text-sm">
        henüz kimseyi takip etmiyor.
      </p>
    );
  } else if (sekme === "favoriler") {
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        entry: {
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
            topic: { select: { title: true, slug: true } },
          },
        },
      },
    });

    content = favorites.length > 0 ? (
      <div className="divide-y divide-border/60">
        {favorites.map((f, idx) => (
          <div key={f.id}>
            <Link href={`/baslik/${f.entry.topic.slug}`} className="text-xs text-primary hover:underline font-medium inline-block pt-3">
              {f.entry.topic.title}
            </Link>
            <EntryKart
              id={f.entry.id}
              content={f.entry.content}
              upvotes={f.entry.upvotes}
              downvotes={f.entry.downvotes}
              authorUsername={f.entry.author.username}
              authorAvatarUrl={f.entry.author.avatarUrl}
              createdAt={f.entry.createdAt.toISOString()}
              isEdited={f.entry.isEdited}
              entryNumber={idx + 1}
            />
          </div>
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground text-center py-12 text-sm">henüz favori yok.</p>
    );
  }

  const isSelf = session?.user?.username === username;

  // Check if current user follows this profile
  let isFollowing = false;
  if (session?.user && !isSelf) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: user.id,
        },
      },
    });
    isFollowing = !!follow;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Profil kartı */}
      <div className="mb-6 pb-6 border-b border-border/60">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold shrink-0 overflow-hidden">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={`${user.username} avatar`}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized={user.avatarUrl.startsWith("data:") || user.avatarUrl.startsWith("/uploads/")}
              />
            ) : (
              user.username[0]
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold">{user.username}</h1>
              {user.role === "ADMIN" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">admin</span>
              )}
              {user.role === "MODERATOR" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 font-medium">mod</span>
              )}
              {user.role === "CAYLAK" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-medium">çaylak</span>
              )}
              {user.role !== "ADMIN" && user.role !== "MODERATOR" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                  {user.generation}. nesil
                </span>
              )}
            </div>
            {user.displayName && (
              <p className="text-sm text-muted-foreground">{user.displayName}</p>
            )}
            {user.bio && <p className="mt-2 text-sm text-foreground/80">{user.bio}</p>}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatTarih(user.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {user.entryCount} entry
              </span>
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                {user.karma} karma
              </span>
              <span>{user._count.followers} takipçi</span>
              <span>{user._count.following} takip</span>
            </div>

            {!isSelf && session?.user && (
              <div className="mt-3 flex items-center gap-3">
                <TakipButon
                  targetUsername={username}
                  initialIsFollowing={isFollowing}
                />
                <Link
                  href={`/mesajlar/${username}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Send className="h-3 w-3" /> mesaj gönder
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-6 mb-4 text-sm">
        <Link
          href={`/kullanici/${username}?sekme=entryler`}
          className={`pb-2 text-xs font-medium transition-colors ${
            sekme === "entryler"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          entryler ({user.entryCount})
        </Link>
        <Link
          href={`/kullanici/${username}?sekme=favoriler`}
          className={`pb-2 text-xs font-medium transition-colors ${
            sekme === "favoriler"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          favoriler
        </Link>
        <Link
          href={`/kullanici/${username}?sekme=takip`}
          className={`pb-2 text-xs font-medium transition-colors ${
            sekme === "takip"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          takip ({user._count.following})
        </Link>
      </div>

      {content}
    </div>
  );
}
