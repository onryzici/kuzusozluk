import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";
import sharp from "sharp";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB ham giriş (resize sonrası küçülür)
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
      { success: false, error: { code: "RATE_LIMIT", message: "çok fazla deneme" } },
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
      { success: false, error: { code: "FILE_TOO_LARGE", message: "dosya boyutu en fazla 8MB olabilir" } },
      { status: 400 }
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Entry görseli: en fazla 1200px genişlik, oranı koru. GIF animasyonluysa korunsun.
    const isGif = file.type === "image/gif";

    let processed: Buffer;
    let mimeType: string;

    if (isGif) {
      // GIF: animasyonu koru, sharp ile webp'e çevir (anim destekli) — genişliği 800'e düşür
      processed = await sharp(buffer, { animated: true })
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
      mimeType = "image/webp";
    } else {
      // JPG/PNG/WEBP → webp kalite 80, 1200px genişlik
      processed = await sharp(buffer, { animated: false })
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      mimeType = "image/webp";
    }

    // Yine de güvenlik için 1.5MB üstü reddet (aşırı büyük tekil görseller)
    if (processed.byteLength > 1.5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: "STILL_TOO_LARGE", message: "görsel optimize edildikten sonra bile çok büyük; daha küçük bir görsel dene" } },
        { status: 400 }
      );
    }

    const upload = await prisma.upload.create({
      data: {
        mimeType,
        data: new Uint8Array(processed),
        uploaderId: (session.user as { id: string }).id,
      },
      select: { id: true },
    });

    const url = `/api/gorsel/${upload.id}`;
    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message: `yüklenirken hata: ${msg.slice(0, 200)}` } },
      { status: 500 }
    );
  }
}
