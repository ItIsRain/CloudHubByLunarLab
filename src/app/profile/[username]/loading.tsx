export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="shimmer h-32 w-32 rounded-full" />
            <div className="shimmer h-6 w-36 rounded-lg" />
            <div className="shimmer h-4 w-24 rounded-lg" />
          </div>
          <div className="flex-1 space-y-6">
            <div className="shimmer h-6 w-64 rounded-lg" />
            <div className="shimmer h-20 w-full rounded-xl" />
            <div className="flex gap-4">
              <div className="shimmer h-20 w-32 rounded-xl" />
              <div className="shimmer h-20 w-32 rounded-xl" />
              <div className="shimmer h-20 w-32 rounded-xl" />
            </div>
            <div className="shimmer h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
