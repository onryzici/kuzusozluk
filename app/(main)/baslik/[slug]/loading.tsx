export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-2/3 mb-2" />
      <div className="h-4 bg-muted rounded w-1/4 mb-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b pb-4 mb-4">
          <div className="h-4 bg-muted rounded w-full mb-2" />
          <div className="h-4 bg-muted rounded w-4/5 mb-2" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="flex justify-end mt-2">
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
