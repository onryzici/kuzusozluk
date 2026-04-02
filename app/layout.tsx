import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "kuzu sözlük",
    template: "%s | kuzu sözlük",
  },
  description: "Kullanıcı güdümlü Türkçe sosyal sözlük platformu",
  openGraph: {
    title: "kuzu sözlük",
    description: "Kullanıcı güdümlü Türkçe sosyal sözlük platformu",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
