import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
});

window.addEventListener("unhandledrejection", (event) => {
  logRendererStartupIssue("unhandledrejection", event.reason);
});

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (error) {
  logRendererStartupIssue("react.render", error);
  throw error;
}
