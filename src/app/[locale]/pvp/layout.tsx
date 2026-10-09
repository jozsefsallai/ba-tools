import { PVPBreadcrumbs } from "@/app/[locale]/pvp/_components/pvp-breadcrumbs";
import type { PropsWithChildren } from "react";

export default function PVPLayout({ children }: PropsWithChildren) {
  return (
    <PVPBreadcrumbs>
      <div className="mx-auto min-w-0 w-full max-w-[1400px]">{children}</div>
    </PVPBreadcrumbs>
  );
}
