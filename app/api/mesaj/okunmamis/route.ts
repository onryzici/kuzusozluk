import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/mesaj/okunmamis — Get unread message count
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const userId = (session.user as { id: string }).id;

  const count = await prisma.message.count({
    where: {
      receiverId: userId,
      isRead: false,
    },
  });

  return NextResponse.json({ success: true, data: { count } });
}
