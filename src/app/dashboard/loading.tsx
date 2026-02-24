export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-border" />
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="shimmer h-10 w-56 rounded-lg mb-2" />
        <div className="shimmer h-5 w-80 rounded-lg mb-8" />
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-6">
              <div className="shimmer h-4 w-24 rounded mb-2" />
              <div className="shimmer h-8 w-16 rounded" />
            </div>
          ))}
        </div>
        {/* Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border p-6 space-y-4">
            <div className="shimmer h-6 w-40 rounded" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer h-16 w-full rounded-lg" />
            ))}
          </div>
          <div className="rounded-xl border border-border p-6 space-y-4">
            <div className="shimmer h-6 w-40 rounded" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
