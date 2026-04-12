import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-[#202020] animate-in fade-in duration-500">
    <div className="h-20 bg-card/20 border-b border-white/5" />
    <main className="pt-24 px-4 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-32 rounded-lg opacity-50" />
        </div>
        <Skeleton className="h-12 w-32 rounded-2xl" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-[2.5rem]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      </div>
    </main>
  </div>
);

export const ProductListSkeleton = () => (
  <div className="min-h-screen bg-[#202020] animate-in fade-in duration-500">
    <div className="h-20 bg-card/20 border-b border-white/5" />
    <main className="pt-24 px-4 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-[1.5rem]" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-xl" />
            <Skeleton className="h-4 w-24 rounded-lg opacity-50" />
          </div>
        </div>
        <Skeleton className="h-12 w-32 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 bg-muted/5 rounded-[2rem] border border-white/5 flex gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3 py-1">
              <Skeleton className="h-4 w-3/4 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-xl" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  </div>
);

export const OrderListSkeleton = () => (
  <div className="min-h-screen bg-[#202020] animate-in fade-in duration-500">
    <div className="h-20 bg-card/20 border-b border-white/5" />
    <main className="pt-24 px-4 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4 py-4">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-4 w-32 rounded-lg opacity-50" />
        </div>
      </div>
      
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 bg-muted/5 rounded-[2.5rem] border border-white/5 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <Skeleton className="h-12 flex-1 rounded-2xl" />
          </div>
        </div>
      ))}
    </main>
  </div>
);

export const StoreDetailSkeleton = () => (
  <div className="min-h-screen bg-[#202020] animate-in fade-in duration-500">
    <div className="h-20 bg-card/20 border-b border-white/5" />
    <main className="pt-24 px-4 max-w-4xl mx-auto space-y-8">
      <Skeleton className="h-32 w-24 rounded-full mb-4" /> {/* Back button area */}
      <Skeleton className="h-64 w-full rounded-[2.5rem]" />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-2xl" /> {/* Search bar */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-3xl" />
              <Skeleton className="h-4 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);
