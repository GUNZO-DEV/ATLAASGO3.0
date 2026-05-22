export default function AdminTableSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-6">
      {/* Summary pills */}
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-24 bg-gray-200 rounded-full" />
        ))}
      </div>

      {/* Table */}
      <div className="card-moroccan overflow-hidden p-0">
        <div className="bg-gray-50 px-5 py-3 flex gap-6 border-b border-gray-100">
          {["w-24", "w-40", "w-24", "w-20", "w-16"].map((w, i) => (
            <div key={i} className={`h-3 ${w} bg-gray-200 rounded`} />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-5 py-4 flex gap-6 items-center border-b border-gray-50">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-3 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
            <div className="h-3 w-14 bg-gray-100 rounded" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
