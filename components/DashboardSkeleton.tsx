export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Tracker skeleton */}
      <div className="card-moroccan flex flex-col gap-4">
        <div className="flex justify-between">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="h-4 w-48 bg-gray-100 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="flex justify-between mt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 w-20">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="h-3 w-14 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Form skeleton */}
      <div className="card-moroccan flex flex-col gap-4">
        <div className="h-5 w-24 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-emerald-atlaasgo/20 rounded-lg" />
      </div>
    </div>
  );
}
