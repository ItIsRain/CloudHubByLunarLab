export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-border" />
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="shimmer h-10 w-64 rounded-lg mb-2" />
        <div className="shimmer h-5 w-96 rounded-lg mb-8" />
        {/* Filter bar */}
        <div className="flex gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-10 w-28 rounded-lg" />
          ))}
        </div>
        {/* Card grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <div className="shimmer h-48 w-full" />
              <div className="p-5 space-y-3">
                <div className="shimmer h-5 w-3/4 rounded" />
                <div className="shimmer h-4 w-1/2 rounded" />
                <div className="shimmer h-4 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
