"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  rateExperienceMetric,
  sanitizeExperienceRoute,
  type ExperienceMetricKey,
  type ExperienceSampleKind,
  type ExperienceTelemetryEventInput
} from "@/lib/experience-telemetry";

const MAX_EVENTS_PER_PAGE = 30;
const MAX_BATCH = 12;

function viewportClass() {
  if (typeof window === "undefined") return "unknown" as const;
  if (window.innerWidth < 720) return "compact" as const;
  if (window.innerWidth >= 1440) return "wide" as const;
  return "standard" as const;
}

function visibilityState() {
  if (typeof document === "undefined") return "unknown" as const;
  return document.visibilityState === "hidden" ? "hidden" as const : "visible" as const;
}

function navigationType() {
  if (typeof performance === "undefined") return null;
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const value = entry?.type;
  return value && ["navigate", "reload", "back_forward", "prerender"].includes(value)
    ? value
    : "unknown";
}

export function ExperienceTelemetryCollector() {
  const pathname = usePathname();
  const routeRef = useRef(sanitizeExperienceRoute(pathname));
  const queueRef = useRef<ExperienceTelemetryEventInput[]>([]);
  const countRef = useRef(0);
  const pendingRouteStartedAt = useRef<number | null>(null);

  useEffect(() => {
    let flushTimer: number | null = null;

    const flush = () => {
      if (!queueRef.current.length) return;
      const events = queueRef.current.splice(0, MAX_BATCH);
      void fetch("/api/experience-telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({ events })
      }).catch(() => {
        // Telemetry must never break the operator workflow.
      });
    };

    const enqueue = (
      metricKey: ExperienceMetricKey,
      metricValue: number,
      unit: "ms" | "score",
      sampleKind: ExperienceSampleKind,
      routeFamily = routeRef.current
    ) => {
      if (
        countRef.current >= MAX_EVENTS_PER_PAGE ||
        !Number.isFinite(metricValue) ||
        metricValue < 0
      ) {
        return;
      }

      countRef.current += 1;
      queueRef.current.push({
        eventId: crypto.randomUUID(),
        routeFamily: sanitizeExperienceRoute(routeFamily),
        metricKey,
        metricValue,
        unit,
        rating: rateExperienceMetric(metricKey, metricValue),
        sampleKind,
        navigationType: navigationType(),
        viewportClass: viewportClass(),
        visibilityState: visibilityState(),
        observedAt: new Date().toISOString()
      });

      if (queueRef.current.length >= 6) flush();
    };

    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation) {
      const load = navigation.loadEventEnd > 0
        ? navigation.loadEventEnd - navigation.startTime
        : navigation.domContentLoadedEventEnd - navigation.startTime;
      if (load > 0) {
        enqueue("navigation_load_ms", load, "ms", "navigation");
      }
    }

    for (const paint of performance.getEntriesByName("first-contentful-paint")) {
      enqueue("fcp_ms", paint.startTime, "ms", "paint");
    }

    let cls = 0;
    let lcp = 0;
    let inp = 0;

    const observers: PerformanceObserver[] = [];

    const observe = (
      type: string,
      handler: (entry: PerformanceEntry) => void,
      buffered = true
    ) => {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(handler);
        });
        observer.observe({ type, buffered } as PerformanceObserverInit);
        observers.push(observer);
      } catch {
        // Unsupported browser metric; absence remains unmeasured.
      }
    };

    observe("largest-contentful-paint", (entry) => {
      lcp = Math.max(lcp, entry.startTime);
    });

    observe("layout-shift", (entry) => {
      const shifted = entry as PerformanceEntry & {
        value?: number;
        hadRecentInput?: boolean;
      };
      if (!shifted.hadRecentInput && typeof shifted.value === "number") {
        cls += shifted.value;
      }
    });

    observe("event", (entry) => {
      if (entry.duration > inp) inp = entry.duration;
    });

    observe("longtask", (entry) => {
      enqueue("long_task_ms", entry.duration, "ms", "long-task");
    });

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest("a[href]")
        : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      try {
        const url = new URL(target.href, window.location.href);
        if (
          url.origin === window.location.origin &&
          sanitizeExperienceRoute(url.pathname) !== routeRef.current
        ) {
          pendingRouteStartedAt.current = performance.now();
        }
      } catch {
        // Ignore malformed navigation targets.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (lcp > 0) enqueue("lcp_ms", lcp, "ms", "paint");
        if (cls > 0) enqueue("cls_score", cls, "score", "layout");
        if (inp > 0) enqueue("inp_ms", inp, "ms", "interaction");
        flush();
      }
    };

    window.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    flushTimer = window.setInterval(flush, 10_000);

    return () => {
      if (lcp > 0) enqueue("lcp_ms", lcp, "ms", "paint");
      if (cls > 0) enqueue("cls_score", cls, "score", "layout");
      if (inp > 0) enqueue("inp_ms", inp, "ms", "interaction");
      flush();
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      if (flushTimer !== null) window.clearInterval(flushTimer);
    };
  }, []);

  useEffect(() => {
    const nextRoute = sanitizeExperienceRoute(pathname);
    if (nextRoute === routeRef.current) return;

    if (pendingRouteStartedAt.current !== null) {
      const duration = performance.now() - pendingRouteStartedAt.current;
      if (
        Number.isFinite(duration) &&
        duration >= 0 &&
        countRef.current < MAX_EVENTS_PER_PAGE
      ) {
        queueRef.current.push({
          eventId: crypto.randomUUID(),
          routeFamily: nextRoute,
          metricKey: "route_transition_ms",
          metricValue: duration,
          unit: "ms",
          rating: rateExperienceMetric("route_transition_ms", duration),
          sampleKind: "route-transition",
          navigationType: navigationType(),
          viewportClass: viewportClass(),
          visibilityState: visibilityState(),
          observedAt: new Date().toISOString()
        });
        countRef.current += 1;
      }
    }

    pendingRouteStartedAt.current = null;
    routeRef.current = nextRoute;
  }, [pathname]);

  return null;
}
