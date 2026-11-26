"use client";

import { useSyncExternalStore } from "react";
import {
  type AnalyticsConsent,
  analyticsAvailable,
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "@/lib/analytics/posthog.client";

function getServerConsent(): AnalyticsConsent {
  return "denied";
}

export function useAnalyticsConsent() {
  const consent = useSyncExternalStore(
    subscribeAnalyticsConsent,
    getAnalyticsConsent,
    getServerConsent,
  );

  return {
    available: analyticsAvailable(),
    consent,
    setConsent: setAnalyticsConsent,
  };
}
