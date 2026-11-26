"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/posthog.client";

export function SignInTracker() {
  const { isLoaded, isSignedIn } = useAuth();
  const wasSignedIn = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (wasSignedIn.current === false && isSignedIn) {
      track("signed_in");
    }

    wasSignedIn.current = Boolean(isSignedIn);
  }, [
    isLoaded,
    isSignedIn,
  ]);

  return null;
}
