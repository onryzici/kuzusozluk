export default function SonLoading() {
  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <div className="h-5 w-28 bg-muted animate-pulse rounded mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            <div className="h-16 bg-muted/60 animate-pulse rounded" />
            <div className="flex justify-end gap-2">
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
