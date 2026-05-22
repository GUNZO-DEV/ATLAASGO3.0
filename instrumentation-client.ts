import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  autocapture: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-ph-mask]",
  },
  capture_pageview: false,
  debug: process.env.NODE_ENV === "development",
});
