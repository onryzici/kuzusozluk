import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BaslikDetay from "@/components/baslik/BaslikDetay";
import BaslikTakipButon from "@/components/baslik/BaslikTakipButon";
import EntryKart from "@/components/entry/EntryKart";
import EntryForm from "@/components/entry/EntryForm";
import Sayfalama from "@/components/shared/Sayfalama";
import BaslikYokSayfa from "@/components/baslik/BaslikYokSayfa";
import SiralamaSekmeleri from "@/components/entry/SiralamaSekmeleri";
import AdminBaslikIslemleri from "@/components/baslik/AdminBaslikIslemleri";
import AnketGoster from "@/components/anket/AnketGoster";
import { auth } from "@/lib/auth";
import { caylakEntryWhere } from "@/lib/utils/caylakFilter";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sayfa?: string; q?: string; sira?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Single query: fetch topic with first entry in one go
  const topic = await prisma.topic.findUnique({
    where: { slug },
    select: {
      title: true,
      entries: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  if (!topic) {
    return { title: "baslik bulunamadi" };
  }

  const firstEntry = topic.entries[0];
  const description = firstEntry
    ? firstEntry.content.slice(0, 160).replace(/\n/g, " ")
    : `${topic.title} hakkinda entryler`;

  return {
    title: `${topic.title} - kuzusozluk`,
    description,
    openGraph: {
      title: topic.title,
      description,
    },
  };
}

export default async function BaslikDetaySayfa({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sayfa, q, sira } = await searchParams;

  // topic ve auth'u paralel çalıştır
  const [topic, session] = await Promise.all([
    prisma.topic.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        isLocked: true,
        isPinned: true,
        createdAt: true,
      },
    }),
    auth(),
  ]);

  // Başlık yoksa — Ekşi tarzı "bu başlık yok" sayfası
  if (!topic) {
    const suggestions = await prisma.topic.findMany({
      where: { slug: { contains: slug.split("-")[0] } },
      take: 5,
      select: { title: true, slug: true, entryCount: true },
    });

    const originalTitle = q || slug.replace(/-/g, " ");

    return (
      <BaslikYokSayfa
        title={originalTitle}
        slug={slug}
        suggestions={suggestions}
        isLoggedIn={!!session?.user}
      />
    );
  }
  const page = Math.max(1, parseInt(sayfa || "1"));
  const pageSize = 10;
  const siralama = sira === "yeni" || sira === "populer" ? sira : "eski";

  const orderBy =
    siralama === "yeni"
      ? { createdAt: "desc" as const }
      : siralama === "populer"
        ? { upvotes: "desc" as const }
        : { createdAt: "asc" as const };

  const userRole = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id || null;
  const caylakFilter = caylakEntryWhere({ id: currentUserId || undefined, role: userRole });

  // Tüm sorguları tek seferde paralel çalıştır
  const [topicFollowResult, blockedResult, entries, total] = await Promise.all([
    currentUserId
      ? prisma.topicFollow.findUnique({
          where: { userId_topicId: { userId: currentUserId, topicId: topic.id } },
        }).catch(() => null)
      : Promise.resolve(null),
    currentUserId
      ? prisma.block.findMany({
          where: { blockerId: currentUserId },
          select: { blockedId: true },
        }).catch(() => [])
      : Promise.resolve([]),
    prisma.entry.findMany({
      where: {
        topicId: topic.id,
        ...caylakFilter,
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.entry.count({
      where: {
        topicId: topic.id,
        ...caylakFilter,
      },
    }),
  ]);

  const isFollowingTopic = !!topicFollowResult;
  const blockedUsers = blockedResult.map((b: { blockedId: string }) => b.blockedId);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <Link href="/" className="lg:hidden flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> başlıklar
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <BaslikDetay
          title={topic.title}
          entryCount={total}
          createdAt={topic.createdAt.toISOString()}
        />
        <div className="flex items-center gap-2 shrink-0">
          {session?.user && (
            <BaslikTakipButon
              topicSlug={slug}
              initialIsFollowing={isFollowingTopic}
            />
          )}
          {(userRole === "ADMIN" || userRole === "MODERATOR" || userRole === "CO_MOD") && (
            <AdminBaslikIslemleri
              slug={slug}
              title={topic.title}
              isLocked={topic.isLocked}
              isPinned={topic.isPinned}
            />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <SiralamaSekmeleri slug={slug} current={siralama} />
        {totalPages > 1 && (
          <Sayfalama
            currentPage={page}
            totalPages={totalPages}
            basePath={`/baslik/${slug}`}
          />
        )}
      </div>
      <AnketGoster topicSlug={slug} isLoggedIn={!!session?.user} />
      <div className="space-y-4">
        {entries.filter(e => !blockedUsers.includes(e.authorId)).map((entry, idx) => (
          <EntryKart
            key={entry.id}
            id={entry.id}
            content={entry.content}
            upvotes={entry.upvotes}
            downvotes={entry.downvotes}
            authorUsername={entry.author.username}
            authorAvatarUrl={entry.author.avatarUrl}
            createdAt={entry.createdAt.toISOString()}
            isEdited={entry.isEdited}
            entryNumber={(page - 1) * pageSize + idx + 1}
            isCaylak={entry.author.role === "CAYLAK"}
            currentUserId={currentUserId}
            authorId={entry.author.id}
            currentUserRole={userRole}
            commentCount={entry._count.comments}
          />
        ))}
      </div>
      {entries.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          Henüz entry yazılmamış. İlk sen yaz!
        </p>
      )}
      {totalPages > 1 && (
        <Sayfalama
          currentPage={page}
          totalPages={totalPages}
          basePath={`/baslik/${slug}`}
        />
      )}
      {session?.user && !topic.isLocked && (
        <EntryForm topicSlug={slug} />
      )}
    </div>
  );
}
