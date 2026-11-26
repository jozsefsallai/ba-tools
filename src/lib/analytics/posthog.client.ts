import posthog, { type CaptureResult } from "posthog-js";
import type {
  AnalyticsEventArgs,
  AnalyticsEventName,
} from "@/lib/analytics/events";

// What the privacy policy (https://nimblebun.works/en/privacy) allows:
// - events carry only a device-stored analytics id, never the account
//   (no `identify`, no person profiles);
// - no session recordings, no typed text (autocapture never reads input
//   values, and Plana AI chats aren't autocaptured at all);
// - visitors who need to consent are asked first, everyone can opt out.

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Without a key in development, consent and events are simulated: nothing
// is sent, and events are logged to the console instead.
const SIMULATED = !POSTHOG_KEY && process.env.NODE_ENV === "development";
const SIMULATED_CONSENT_KEY = "ba-analytics-simulated-consent";

export type AnalyticsConsent = "granted" | "denied" | "pending";

const listeners = new Set<() => void>();
let started = false;
let simulatedConsent: AnalyticsConsent = "pending";

export function analyticsAvailable() {
  return Boolean(POSTHOG_KEY) || SIMULATED;
}

const SENSITIVE_PARAMS = /^__clerk|^code$|^state$|token|ticket/i;

function stripSensitiveParams(value: unknown) {
  if (typeof value !== "string" || !value.includes("?")) {
    return value;
  }

  try {
    const url = new URL(value);

    for (const key of [
      ...url.searchParams.keys(),
    ]) {
      if (SENSITIVE_PARAMS.test(key)) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return value;
  }
}

function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) {
    return null;
  }

  const properties = event.properties;
  const pathname =
    typeof properties.$pathname === "string" ? properties.$pathname : "";

  // Clicked elements' text could be a chat message.
  if (
    event.event === "$autocapture" &&
    /^(\/ja)?\/plana-ai(\/|$)/.test(pathname)
  ) {
    return null;
  }

  for (const key of [
    "$current_url",
    "$referrer",
    "$initial_current_url",
  ]) {
    if (key in properties) {
      properties[key] = stripSensitiveParams(properties[key]);
    }
  }

  return event;
}

function initSimulatedAnalytics() {
  let stored: string | null = null;

  try {
    stored = localStorage.getItem(SIMULATED_CONSENT_KEY);
  } catch {}

  if (stored === "granted" || stored === "denied") {
    simulatedConsent = stored;
  } else {
    simulatedConsent = "pending";
  }

  console.info(
    `[analytics] Simulated (no NEXT_PUBLIC_POSTHOG_KEY): consent "${simulatedConsent}". Events are logged here, not sent.`,
  );
}

export function initAnalytics() {
  if (started || typeof window === "undefined") {
    return;
  }

  if (SIMULATED) {
    started = true;
    initSimulatedAnalytics();
    return;
  }

  if (!POSTHOG_KEY) {
    return;
  }

  started = true;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: "2026-08-30",
    person_profiles: "never",
    opt_out_capturing_by_default: true,
    // Nothing is stored on the device until analytics are on.
    opt_out_persistence_by_default: true,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_flags: true,
    enable_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: true,
    // Load times only; network timing belongs to session recordings.
    capture_performance: {
      web_vitals: true,
      network_timing: false,
    },
    mask_personal_data_properties: true,
    before_send: beforeSend,
  });
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (!started) {
    return "denied";
  }

  if (SIMULATED) {
    return simulatedConsent;
  }

  if (posthog.has_opted_in_capturing()) {
    return "granted";
  }

  if (posthog.has_opted_out_capturing()) {
    return posthog.get_explicit_consent_status() === "pending"
      ? "pending"
      : "denied";
  }

  return "granted";
}

export function setAnalyticsConsent(granted: boolean) {
  if (!started) {
    return;
  }

  if (SIMULATED) {
    simulatedConsent = granted ? "granted" : "denied";

    try {
      localStorage.setItem(SIMULATED_CONSENT_KEY, simulatedConsent);
    } catch {}

    console.info(`[analytics] Simulated consent: ${simulatedConsent}`);
  } else if (granted) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }

  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAnalyticsConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function track<E extends AnalyticsEventName>(
  event: E,
  ...[properties]: AnalyticsEventArgs<E>
) {
  if (!started) {
    return;
  }

  if (SIMULATED) {
    if (simulatedConsent === "granted") {
      console.info(`[analytics] ${event}`, properties ?? {});
    }

    return;
  }

  try {
    posthog.capture(event, properties);
  } catch (err) {
    console.error("Failed to capture analytics event", err);
  }
}
