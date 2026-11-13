import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between pt-2 pb-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Skeleton className="h-44 rounded-lg lg:col-span-2" />
        <Skeleton className="h-72 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <Skeleton className="h-60 rounded-lg lg:col-span-2" />
      </div>
    </div>
  );
}
