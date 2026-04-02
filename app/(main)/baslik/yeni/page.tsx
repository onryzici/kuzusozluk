import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import YeniBaslikForm from "@/components/baslik/YeniBaslikForm";

export default async function YeniBaslikSayfa() {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris?callbackUrl=/baslik/yeni");
  }

  return (
    <div className="px-4 py-6 max-w-lg">
      <h1 className="text-base font-medium text-foreground mb-1">yeni başlık oluştur</h1>
      <p className="text-xs text-muted-foreground mb-6">
        başlık ve ilk entry ile birlikte yeni bir konu açın.
      </p>
      <YeniBaslikForm />
    </div>
  );
}
