export default function DashboardLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
      <div className="flex h-12 shrink-0 items-center border-b border-line px-5">
        <div className="h-4 w-28 animate-pulse rounded-control bg-hover" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-control bg-hover" />
        ))}
      </div>
    </div>
  );
}
