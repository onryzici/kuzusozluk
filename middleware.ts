import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const protectedPaths = ["/ayarlar", "/mesajlar", "/baslik/yeni", "/admin"];

// Login gerektirmeyen sayfalar
const publicPages = new Set([
  "/giris",
  "/kayit",
  "/sifre-sifirla",
  "/engellendi",
  "/ip-engel",
]);
const publicPagePrefixes = ["/aktivasyon", "/sifre-yenile"];

// Login gerektirmeyen API yolları
const publicApiPrefixes = [
  "/api/auth",
];

function isPublicPath(pathname: string): boolean {
  if (publicPages.has(pathname)) return true;
  if (publicPagePrefixes.some((p) => pathname.startsWith(p + "/") || pathname === p)) return true;
  if (publicApiPrefixes.some((p) => pathname.startsWith(p))) return true;
  return false;
}

async function isIpBannedEdge(ip: string | null): Promise<boolean> {
  if (!ip || !redis) return false;
  try {
    const hit = await redis.get(`ipban:${ip}`);
    return !!hit;
  } catch {
    return false;
  }
}

async function getBannedSince(userId: string): Promise<number | null> {
  if (!redis) return null;
  try {
    const val = await redis.get<number>(`banned_since:${userId}`);
    return typeof val === "number" ? val : null;
  } catch {
    return null;
  }
}

function getIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export default auth(async (req) => {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // Vercel'den gelen tüm istekleri kuzusozluk.com'a yönlendir
  if (host.includes("vercel.app")) {
    return NextResponse.redirect(`https://kuzusozluk.com${pathname}`, 301);
  }

  // IP ban: tüm isteklerde kontrol et (engellendi sayfası hariç)
  if (pathname !== "/ip-engel") {
    const ip = getIp(req);
    if (await isIpBannedEdge(ip)) {
      // API yollarında 403, sayfalarda ip-engel sayfasına yönlendir
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({ success: false, error: { code: "IP_BANNED", message: "bu ip adresinden erişim engellendi" } }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/ip-engel";
      return NextResponse.redirect(url);
    }
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Global auth gate: giriş yapmayan hiç kimse içerik göremez
  if (!req.auth && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Ban check: JWT'deki isBanned veya Redis'teki banned_since kontrolü
  if (req.auth) {
    const user = req.auth.user as { isBanned?: boolean; id?: string; iat?: number } | undefined;
    let banned = !!user?.isBanned;

    if (!banned && user?.id && typeof user.iat === "number") {
      const since = await getBannedSince(user.id);
      if (since !== null && since >= user.iat) banned = true;
    }

    if (banned && pathname !== "/engellendi") {
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({ success: false, error: { code: "BANNED", message: "hesabınız engellendi" } }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
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
    // Tüm yollar — statik varlıklar ve next internals hariç
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|images/|assets/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|css|js|map|txt|xml|json)$).*)",
  ],
};
