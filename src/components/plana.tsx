"use client";

import type { PlanaExpression } from "@/lib/plana-expressions";
import dynamic from "next/dynamic";

const PlanaCanvas = dynamic(
  () => import("@/components/plana-canvas").then((m) => m.PlanaCanvas),
  { ssr: false },
);

export function Plana(props: {
  centered?: boolean;
  expression?: PlanaExpression;
  inline?: boolean;
}) {
  return <PlanaCanvas {...props} />;
}
