export default function KullaniciLoading() {
  return (
    <div className="w-full px-4 lg:px-8 py-6">
      {/* Profil karti skeleton */}
      <div className="mb-6 pb-6 border-b border-border/60">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-28 bg-muted animate-pulse rounded" />
            <div className="h-3 w-40 bg-muted animate-pulse rounded" />
            <div className="flex gap-4 mt-3">
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
      {/* Sekmeler skeleton */}
      <div className="flex gap-6 mb-4">
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
      {/* Entry listesi skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            <div className="h-16 bg-muted/60 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
