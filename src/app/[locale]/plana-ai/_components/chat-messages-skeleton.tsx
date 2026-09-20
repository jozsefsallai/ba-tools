"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ChatMessagesSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <Skeleton className="mt-1 size-8 shrink-0 rounded-full" />
        <div className="flex max-w-[85%] flex-col gap-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-52 rounded-2xl" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="mt-1 size-8 shrink-0 rounded-full" />
        <div className="flex max-w-[85%] flex-col gap-2">
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}

export function ChatSidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="flex flex-col gap-1 rounded-lg px-3 py-2" key={index}>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
