import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const protectedPaths = ["/ayarlar", "/mesajlar", "/baslik/yeni", "/admin"];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Ban check: if user is logged in and banned, redirect to /engellendi
  if (req.auth) {
    const user = req.auth.user as { isBanned?: boolean } | undefined;
    if (user?.isBanned && pathname !== "/engellendi") {
      const url = req.nextUrl.clone();
      url.pathname = "/engellendi";
      return NextResponse.redirect(url);
    }
  }

  // Admin route protection: must be ADMIN role
  if (pathname.startsWith("/admin")) {
    const user = req.auth?.user as { role?: string } | undefined;
    if (user?.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/ayarlar/:path*",
    "/mesajlar/:path*",
    "/baslik/yeni",
    "/admin/:path*",
    "/engellendi",
  ],
};
