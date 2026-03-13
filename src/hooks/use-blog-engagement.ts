"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Generates or retrieves a persistent session ID for engagement tracking.
 */
function getSessionId(): string {
  const key = "cloudhub_session_id";
  let id =
    typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(key, id);
    }
  }
  return id;
}

/**
 * Detects device type from user agent.
 */
function getDeviceType(): "desktop" | "tablet" | "mobile" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (
    /mobile|iphone|ipod|android.*mobile|windows.*phone|blackberry/i.test(ua)
  )
    return "mobile";
  return "desktop";
}

interface EngagementOptions {
  slug: string;
  enabled?: boolean;
}

/**
 * Hook to track reader engagement on a blog post.
 * Tracks: time on page, scroll depth, read completion, referrer, device.
 * Sends data periodically via beacon/fetch to `/api/blog/[slug]/engage`.
 */
export function useBlogEngagement({ slug, enabled = true }: EngagementOptions) {
  const startTime = useRef(Date.now());
  const maxScrollDepth = useRef(0);
  const hasSentInitial = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clickedRelated = useRef(false);
  const shared = useRef(false);

  const sendEngagement = useCallback(
    (final = false) => {
      if (!enabled || !slug) return;

      const timeOnPage = Math.round((Date.now() - startTime.current) / 1000);

      // Estimate read completion based on scroll depth and time
      // A 5-minute article needs ~300s. Use scroll depth as primary indicator.
      const readCompletion = Math.min(100, maxScrollDepth.current);

      const payload = {
        sessionId: getSessionId(),
        timeOnPage,
        scrollDepth: maxScrollDepth.current,
        readCompletion,
        clickedRelated: clickedRelated.current,
        shared: shared.current,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        deviceType: getDeviceType(),
      };

      const url = `/api/blog/${slug}/engage`;

      if (final && typeof navigator !== "undefined" && navigator.sendBeacon) {
        // Use sendBeacon for final send (page unload)
        navigator.sendBeacon(url, JSON.stringify(payload));
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: final,
        }).catch(() => {
          // Silently fail — tracking shouldn't break the UI
        });
      }
    },
    [slug, enabled]
  );

  // Track scroll depth
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const percent = Math.round((scrollTop / docHeight) * 100);
        if (percent > maxScrollDepth.current) {
          maxScrollDepth.current = percent;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [enabled]);

  // Send engagement data periodically (every 15s) and on unload
  useEffect(() => {
    if (!enabled || !slug) return;

    // Initial send after 3 seconds (confirms the user actually stayed)
    const initialTimeout = setTimeout(() => {
      sendEngagement();
      hasSentInitial.current = true;
    }, 3000);

    // Periodic updates every 15 seconds
    intervalRef.current = setInterval(() => {
      sendEngagement();
    }, 15000);

    // Send final data on page unload
    const handleUnload = () => {
      sendEngagement(true);
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        sendEngagement(true);
      }
    });

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleUnload);
      // Send final on cleanup
      if (hasSentInitial.current) {
        sendEngagement(true);
      }
    };
  }, [slug, enabled, sendEngagement]);

  // Expose methods for manual tracking of interactions
  const trackRelatedClick = useCallback(() => {
    clickedRelated.current = true;
    sendEngagement();
  }, [sendEngagement]);

  const trackShare = useCallback(() => {
    shared.current = true;
    sendEngagement();
  }, [sendEngagement]);

  return { trackRelatedClick, trackShare };
}
