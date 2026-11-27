import { initAnalytics } from "@/lib/analytics/posthog.client";
import { installTranslatorGuard } from "@/lib/dom/translator-guard";

// Before React hydrates, so translated pages don't crash it
installTranslatorGuard();

try {
  initAnalytics();
} catch (err) {
  console.error("Failed to start analytics", err);
}
