import type { PropsWithChildren } from "react";

export default function PVPLayout({ children }: PropsWithChildren) {
  return <div className="mx-auto min-w-0 w-full max-w-[1400px]">{children}</div>;
}
