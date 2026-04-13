import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/auditLog";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  // data:...base64,... ile baslayanlari bul
  const users = await prisma.user.findMany({
    where: { avatarUrl: { startsWith: "data:" } },
    select: { id: true, avatarUrl: true, username: true },
  });

  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const u of users) {
    const url = u.avatarUrl;
    if (!url) {
      skipped++;
      continue;
    }

    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      skipped++;
      continue;
    }

    try {
      const raw = Buffer.from(match[2], "base64");

      const resized = await sharp(raw, { animated: false })
        .rotate()
        .resize(256, 256, { fit: "cover", position: "center" })
        .webp({ quality: 82 })
        .toBuffer();

      const upload = await prisma.upload.create({
        data: {
          mimeType: "image/webp",
          data: new Uint8Array(resized),
          uploaderId: u.id,
        },
        select: { id: true },
      });

      await prisma.user.update({
        where: { id: u.id },
        data: { avatarUrl: `/api/gorsel/${upload.id}` },
      });

      migrated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${u.username}: ${msg.slice(0, 80)}`);
    }
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || null;
  await logAction(
    "AVATAR_MIGRATE",
    session.user.id,
    `${migrated} avatar ugt goc edildi, ${skipped} atlandi, ${errors.length} hata`,
    ip
  );

  return NextResponse.json({
    success: true,
    data: {
      scanned: users.length,
      migrated,
      skipped,
      errors: errors.slice(0, 10),
    },
  });
}
