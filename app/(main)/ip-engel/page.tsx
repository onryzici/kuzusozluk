export default function IpEngelPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-red-600">erişim engellendi</h1>
        <p className="text-sm text-muted-foreground">
          kullandığınız ip adresi sözlüğe erişimi engellenmiştir. bu kararın
          hatalı olduğunu düşünüyorsanız yöneticilerle iletişime geçin.
        </p>
      </div>
    </div>
  );
}
