import type { PropsWithChildren } from "react";

export default function PVPLayout({ children }: PropsWithChildren) {
  return <div className="mx-auto w-full max-w-[1400px]">{children}</div>;
}
