import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } },
      { status: 401 }
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
      { success: false, error: { code: "INVALID_TYPE", message: "yalnızca jpg, png ve webp dosyaları kabul edilir" } },
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

    let url: string;

    const hasCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== "placeholder" &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      const cloudinary = (await import("@/lib/cloudinary")).default;
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "sozluk/avatars",
            transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          }
        );
        stream.end(buffer);
      });
      url = result.secure_url;
    } else {
      // Local fallback: dosyayı public/uploads/'a kaydet
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const filename = `${randomUUID()}.${ext}`;
      const filepath = path.join(process.cwd(), "public", "uploads", filename);
      await writeFile(filepath, buffer);
      url = `/uploads/${filename}`;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: url },
    });

    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message: "dosya yüklenirken bir hata oluştu" } },
      { status: 500 }
    );
  }
}
