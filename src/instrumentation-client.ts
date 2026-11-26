import { initAnalytics } from "@/lib/analytics/posthog.client";

try {
  initAnalytics();
} catch (err) {
  console.error("Failed to start analytics", err);
}
