"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DesktopRedirect({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    // sadece masaüstünde redirect yap (lg: 1024px)
    if (window.innerWidth >= 1024) {
      router.replace(`/baslik/${slug}`);
    }
  }, [router, slug]);

  return null;
}
