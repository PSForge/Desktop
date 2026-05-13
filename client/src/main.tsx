import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { flushDesktopAnalytics, trackDesktopAnalyticsEvent } from "@/lib/desktop-analytics";

const rendererSessionStartedAt = Date.now();
let hasTrackedSessionClose = false;

const logRendererStartupIssue = (label: string, value: unknown) => {
  try {
    const message = value instanceof Error
      ? `${value.name}: ${value.message}\n${value.stack || ""}`
      : typeof value === "string"
        ? value
        : JSON.stringify(value);

    void window.psforgeDesktop?.debugLog?.(`[renderer-startup] ${label}: ${message}`);
  } catch {
    // Ignore startup logging failures.
  }
};

window.addEventListener("error", (event) => {
  logRendererStartupIssue("window.error", event.error || event.message);
  void trackDesktopAnalyticsEvent("desktop_renderer_error", 1, {
    message: event.message || "Unknown renderer error",
    source: event.filename || "unknown",
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logRendererStartupIssue("unhandledrejection", event.reason);
  void trackDesktopAnalyticsEvent("desktop_renderer_unhandled_rejection", 1, {
    message: event.reason instanceof Error ? event.reason.message : String(event.reason || "Unknown rejection"),
  });
});

const trackSessionClose = () => {
  if (hasTrackedSessionClose) {
    return;
  }
  hasTrackedSessionClose = true;

  const durationSeconds = Math.max(1, Math.round((Date.now() - rendererSessionStartedAt) / 1000));
  void trackDesktopAnalyticsEvent("desktop_session_duration_seconds", durationSeconds, {
    closeReason: document.visibilityState === "hidden" ? "hidden" : "pagehide",
  });
  void trackDesktopAnalyticsEvent("desktop_app_closed");
  void flushDesktopAnalytics();
};

window.addEventListener("pagehide", trackSessionClose);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    trackSessionClose();
  }
});

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (error) {
  logRendererStartupIssue("react.render", error);
  throw error;
}
