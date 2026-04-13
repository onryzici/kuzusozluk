import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";
import sharp from "sharp";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB giriş (resize sonrası küçülür)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { allowed } = await checkRateLimit(rateLimiters.genel, (session.user as { id: string }).id);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMIT", message: "Çok fazla deneme" } },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "geçersiz form verisi" } },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "NO_FILE", message: "dosya seçilmedi" } },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_TYPE", message: "yalnızca jpg, png, webp ve gif kabul edilir" } },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_TOO_LARGE", message: "dosya boyutu en fazla 5MB olabilir" } },
      { status: 400 }
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Avatar: 96x96 cover (retina 2x icin yeterli, profilde max 56px gosteriliyor)
    // webp kalite 80 → ~4-8KB
    const resized = await sharp(buffer, { animated: false })
      .rotate()
      .resize(96, 96, { fit: "cover", position: "center" })
      .webp({ quality: 80 })
      .toBuffer();

    const upload = await prisma.upload.create({
      data: {
        mimeType: "image/webp",
        data: new Uint8Array(resized),
        uploaderId: (session.user as { id: string }).id,
      },
      select: { id: true },
    });

    const url = `/api/gorsel/${upload.id}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: url },
    });

    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message: `yüklenirken hata: ${msg.slice(0, 200)}` } },
      { status: 500 }
    );
  }
}
