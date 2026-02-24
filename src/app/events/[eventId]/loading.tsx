export default function EventDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-border" />
      {/* Hero image skeleton */}
      <div className="shimmer h-[50vh] w-full" />
      <div className="mx-auto max-w-7xl px-4 -mt-32 relative z-10 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-8 space-y-4">
          <div className="shimmer h-8 w-2/3 rounded-lg" />
          <div className="shimmer h-5 w-1/3 rounded" />
          <div className="flex gap-3">
            <div className="shimmer h-10 w-32 rounded-lg" />
            <div className="shimmer h-10 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
