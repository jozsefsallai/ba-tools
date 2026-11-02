"use client";

import { type PropsWithChildren, Suspense } from "react";
import {
  BreadcrumbScope,
  BreadcrumbsProvider,
} from "@/components/providers/breadcrumbs-provider";
import {
  useDefaultBreadcrumbs,
  useEditingBreadcrumbs,
} from "@/hooks/use-default-breadcrumbs";

function EditingBreadcrumbs() {
  const items = useEditingBreadcrumbs();
  return items ? <BreadcrumbScope items={items} /> : null;
}

export function AppBreadcrumbsProvider({ children }: PropsWithChildren) {
  const fallback = useDefaultBreadcrumbs();
  return (
    <BreadcrumbsProvider fallback={fallback}>
      <Suspense fallback={null}>
        <EditingBreadcrumbs />
      </Suspense>

      {children}
    </BreadcrumbsProvider>
  );
}
