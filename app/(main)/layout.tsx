import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import DuyuruBanner from "@/components/shared/DuyuruBanner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh flex flex-col">
      <div className="shrink-0">
        <Header />
      </div>
      <div className="flex flex-1 min-h-0 max-w-[1200px] mx-auto w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto border-r border-border/40">
          <DuyuruBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
