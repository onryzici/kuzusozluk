import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { allowed } = await checkRateLimit(rateLimiters.genel, (session.user as any).id);
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
      { success: false, error: { code: "FILE_TOO_LARGE", message: "dosya boyutu en fazla 2MB olabilir" } },
      { status: 400 }
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const hasCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== "placeholder" &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== "placeholder" &&
      process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      const cloudinary = (await import("@/lib/cloudinary")).default;
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "sozluk/entries",
            resource_type: "image",
            transformation: [{ width: 1200, quality: "auto" }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          }
        );
        stream.end(buffer);
      });
      return NextResponse.json({ success: true, data: { url: result.secure_url } });
    }

    // DB'ye kaydet, kısa URL döndür
    const upload = await prisma.upload.create({
      data: {
        mimeType: file.type,
        data: buffer,
        uploaderId: (session.user as any).id,
      },
      select: { id: true },
    });
    const url = `/api/gorsel/${upload.id}`;
    return NextResponse.json({ success: true, data: { url } });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message: "dosya yüklenirken bir hata oluştu" } },
      { status: 500 }
    );
  }
}
