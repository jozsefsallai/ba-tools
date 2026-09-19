"use client";

import { RedirectToSignIn, Show } from "@clerk/nextjs";
import type { PropsWithChildren } from "react";

export function SignedOutRedirect({ children }: PropsWithChildren) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}
