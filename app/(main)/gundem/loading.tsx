export default function GundemLoading() {
  return (
    <div className="w-full px-4 py-6">
      <div className="h-5 w-24 bg-muted animate-pulse rounded mb-4" />
      <div className="space-y-1">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 px-2">
            <div className="h-4 bg-muted animate-pulse rounded" style={{ width: `${120 + Math.random() * 150}px` }} />
            <div className="h-3 w-8 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
