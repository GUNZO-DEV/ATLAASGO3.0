export default function DriverSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Toggle skeleton */}
      <div className="rounded-2xl p-5 border border-gray-200 bg-white flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-100 rounded" />
        </div>
        <div className="w-14 h-7 bg-gray-200 rounded-full" />
      </div>

      {/* Earnings skeleton */}
      <div className="card-moroccan flex flex-col gap-4">
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>

      {/* Orders skeleton */}
      <div className="flex flex-col gap-4">
        <div className="h-3 w-16 bg-gray-200 rounded" />
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="h-9 w-28 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
