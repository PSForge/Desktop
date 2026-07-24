export const PSFORGE_DEEPLINK_SCHEME = "psforge:";
export const PSFORGE_DEEPLINK_HOST = "workflow";
export const WORKFLOW_ID_MAX_LENGTH = 128;
export const WORKFLOW_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateWorkflowId(value) {
  if (typeof value !== "string") {
    return false;
  }

  if (value.length < 1 || value.length > WORKFLOW_ID_MAX_LENGTH) {
    return false;
  }

  return WORKFLOW_ID_PATTERN.test(value);
}

export function parseWorkflowDeepLink(input) {
  if (typeof input !== "string" || !input.toLowerCase().startsWith("psforge://")) {
    return { ok: false, reason: "unsupported-scheme" };
  }

  if (/(^|\/|%2f)(\.|%2e)(\.|%2e)(\/|%2f|\\|%5c|$)/i.test(input)) {
    return { ok: false, reason: "unsafe-path" };
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, reason: "malformed-url" };
  }

  if (parsed.protocol !== PSFORGE_DEEPLINK_SCHEME || parsed.hostname !== PSFORGE_DEEPLINK_HOST) {
    return { ok: false, reason: "unexpected-target" };
  }

  if (parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) {
    return { ok: false, reason: "unexpected-url-components" };
  }

  const encodedPath = parsed.pathname;
  if (!encodedPath || !encodedPath.startsWith("/") || encodedPath.slice(1).includes("/")) {
    return { ok: false, reason: "unexpected-path" };
  }

  const encodedWorkflowId = encodedPath.slice(1);
  if (!encodedWorkflowId || /%2f|%5c|\\|\.\./i.test(encodedWorkflowId)) {
    return { ok: false, reason: "unsafe-path" };
  }

  let workflowId;
  try {
    workflowId = decodeURIComponent(encodedWorkflowId);
  } catch {
    return { ok: false, reason: "malformed-encoding" };
  }

  if (!validateWorkflowId(workflowId)) {
    return { ok: false, reason: "invalid-workflow-id" };
  }

  return { ok: true, workflowId };
}

export function extractWorkflowDeepLinkFromArgv(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const deepLinkArg = args.find((arg) => typeof arg === "string" && arg.toLowerCase().startsWith("psforge://"));

  if (!deepLinkArg) {
    return null;
  }

  return parseWorkflowDeepLink(deepLinkArg);
}
