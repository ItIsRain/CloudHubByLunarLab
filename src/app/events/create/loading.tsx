export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="shimmer h-8 w-48 rounded-lg mb-8" />
        <div className="flex gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shimmer h-10 w-24 rounded-lg" />
          ))}
        </div>
        <div className="space-y-6">
          <div className="shimmer h-12 w-full rounded-xl" />
          <div className="shimmer h-48 w-full rounded-xl" />
          <div className="shimmer h-12 w-full rounded-xl" />
          <div className="shimmer h-12 w-1/2 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
