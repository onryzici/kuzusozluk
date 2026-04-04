export default function TakipLoading() {
  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <div className="h-5 w-36 bg-muted animate-pulse rounded mb-4" />
      <div className="space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-3 w-6 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
