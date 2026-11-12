import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between pt-2 pb-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Skeleton className="h-52 lg:col-span-2" />
        <Skeleton className="h-52" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44 lg:col-span-2" />
      </div>
    </div>
  );
}
