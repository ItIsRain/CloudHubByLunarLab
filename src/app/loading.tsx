export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar skeleton */}
      <div className="h-16 border-b border-border" />
      {/* Hero skeleton */}
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="shimmer h-6 w-32 rounded-full" />
          <div className="shimmer h-14 w-full max-w-2xl rounded-lg" />
          <div className="shimmer h-6 w-full max-w-lg rounded-lg" />
          <div className="flex gap-4 mt-4">
            <div className="shimmer h-12 w-40 rounded-xl" />
            <div className="shimmer h-12 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
