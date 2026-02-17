import { Skeleton } from "@/components/ui/skeleton";

/** Generic card-shaped skeleton for feed items, lists, etc. */
export const SkeletonCard = () => (
  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <Skeleton className="h-16 w-full rounded-xl" />
  </div>
);

/** Photo grid skeleton */
export const SkeletonPhotoGrid = () => (
  <div className="grid grid-cols-3 gap-1.5">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="aspect-square rounded-lg" />
    ))}
  </div>
);

/** Chat message skeleton */
export const SkeletonChat = () => (
  <div className="space-y-3 px-3 pt-4">
    {[false, true, false, true, false].map((isMine, i) => (
      <div key={i} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <Skeleton className={`h-10 rounded-2xl ${isMine ? "w-3/5" : "w-2/5"}`} />
      </div>
    ))}
  </div>
);

/** List item skeleton */
export const SkeletonList = () => (
  <div className="space-y-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-2">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="h-4 flex-1" />
      </div>
    ))}
  </div>
);
