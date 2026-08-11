import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/shared/Skeletons";

export function ProfilePageSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
      </div>
      <CardSkeleton lines={4} />
    </div>
  );
}
