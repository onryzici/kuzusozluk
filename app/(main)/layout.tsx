import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import DuyuruBanner from "@/components/shared/DuyuruBanner";
import MobileTabBar from "@/components/layout/MobileTabBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh flex flex-col">
      <div className="h-[3px] bg-primary w-full shrink-0" />
      <div className="shrink-0">
        <Header />
      </div>
      <div className="flex flex-1 min-h-0 max-w-[1200px] mx-auto w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto border-r border-border/40 pb-14 lg:pb-0">
          <DuyuruBanner />
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
