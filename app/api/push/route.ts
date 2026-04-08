import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Subscribe to push notifications
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ success: false, error: "gecersiz subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: { userId: session.user.id, endpoint },
    },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return NextResponse.json({ success: true });
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint } = body;

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id, endpoint },
    });
  } else {
    // Delete all subscriptions for user
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id },
    });
  }

  return NextResponse.json({ success: true });
}
