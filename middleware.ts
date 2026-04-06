import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/ayarlar", "/mesajlar", "/baslik/yeni", "/admin"];

function isVercelHost(host: string) {
  return host.includes("vercel.app");
}

export default auth(async (req: NextRequest & { auth: unknown }) => {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // Vercel'den gelen tüm istekleri kuzusozluk.com'a yönlendir
  if (isVercelHost(host)) {
    return NextResponse.redirect(`https://kuzusozluk.com${pathname}`, 301);
  }

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
    "/((?!_next/static|_next/image|favicon.ico|icon.*).*)",
  ],
};
