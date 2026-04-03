import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getYasakliKelimeler, addYasakliKelime, removeYasakliKelime } from "@/lib/utils/security";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, data: getYasakliKelimeler() });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const kelime = body.kelime?.trim()?.toLowerCase();
  if (!kelime || kelime.length < 2) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "kelime en az 2 karakter olmalı" } },
      { status: 400 }
    );
  }

  addYasakliKelime(kelime);
  return NextResponse.json({ success: true, data: getYasakliKelimeler() });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const kelime = body.kelime?.trim()?.toLowerCase();
  if (!kelime) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "kelime gerekli" } },
      { status: 400 }
    );
  }

  removeYasakliKelime(kelime);
  return NextResponse.json({ success: true, data: getYasakliKelimeler() });
}
