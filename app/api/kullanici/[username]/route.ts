import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ username: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { username } = await params;

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
      createdAt: true,
      _count: { select: { following: true, followers: true } },
    },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...user,
      followingCount: user._count.following,
      followerCount: user._count.followers,
      _count: undefined,
    },
  });
}
