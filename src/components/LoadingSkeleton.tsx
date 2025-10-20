import { Skeleton } from '@/components/ui/skeleton';

export const ChartSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-48 animate-pulse" />
      <Skeleton className="h-5 w-32 animate-pulse" />
    </div>
    <Skeleton className="h-[400px] w-full rounded-lg bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  </div>
);

export const InterconnectorSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    <Skeleton className="h-6 w-36 animate-pulse" />
    <div className="grid gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-fade-in hover-scale" style={{ animationDelay: `${i * 75}ms` }}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);

export const EUCardSkeleton = () => (
  <div className="space-y-4 p-6 animate-fade-in">
    <div className="flex justify-between items-center">
      <Skeleton className="h-5 w-32 animate-pulse" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-32 animate-pulse" />
      <Skeleton className="h-4 w-48 animate-pulse" />
    </div>
    <div className="mx-auto w-64 h-64">
      <Skeleton className="w-full h-full rounded-full bg-gradient-to-br from-muted via-muted/60 to-muted animate-pulse" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  </div>
);