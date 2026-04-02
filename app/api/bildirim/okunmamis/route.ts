import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/bildirim/okunmamis — Return unread notification count
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giris yapmalisiniz" } },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string;

  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return NextResponse.json({ success: true, data: { count } });
}
