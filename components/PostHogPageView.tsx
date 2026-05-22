"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

/**
 * Fires a $pageview event on every route change.
 * Must be rendered inside <Suspense> because useSearchParams() suspends.
 */
export default function PostHogPageView() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const posthog      = usePostHog();

  useEffect(() => {
    if (!posthog) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthog]);

  return null;
}
