import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id as string;

    await prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() },
    });

    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
