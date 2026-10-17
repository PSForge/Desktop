import { getGuiBuilderPlatform, getGuiBuilderTask, type GuiBuilderPlatform, type GuiBuilderTask } from "@/lib/gui-builder-registry";

export const DESKTOP_WORKFLOW_CONTEXT_KEY = "psforge-desktop-pending-workflow-context";
export const WORKFLOW_API_BASE_URL = "https://psforge.app/api/public/workflows";
export const SUPPORTED_WORKFLOW_CONTRACT_VERSION = 1;

export type SharedWorkflowDefinition = {
  id: string;
  slug: string;
  version: number;
  title: string;
  category: string;
  excerpt: string;
  platformId?: string;
  platformName?: string;
  taskIds: string[];
  minimumPlan: "free" | "pro";
  estimatedTime?: string;
  relatedWorkflowIds?: string[];
};

export type WorkflowValidationResult =
  | { ok: true; workflow: SharedWorkflowDefinition }
  | { ok: false; reason: string };

export type WorkflowMappingResult = {
  platform: GuiBuilderPlatform | null;
  validTasks: GuiBuilderTask[];
  skippedTaskIds: string[];
  mappingStatus: "complete" | "platform-only" | "general-chooser" | "partial" | "invalid";
  requiresUpgrade: boolean;
};

export type WorkflowLoadResult =
  | { ok: true; workflow: SharedWorkflowDefinition }
  | { ok: false; kind: "unknown" | "network" | "invalid"; message: string; status?: number };

export function validateSharedWorkflowDefinition(value: unknown): WorkflowValidationResult {
  if (!value || typeof value !== "object") {
    return { ok: false, reason: "not-an-object" };
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id.trim()) {
    return { ok: false, reason: "missing-id" };
  }

  if (typeof record.slug !== "string" || !record.slug.trim()) {
    return { ok: false, reason: "missing-slug" };
  }

  if (typeof record.title !== "string" || !record.title.trim()) {
    return { ok: false, reason: "missing-title" };
  }

  if (typeof record.category !== "string" || !record.category.trim()) {
    return { ok: false, reason: "missing-category" };
  }

  if (typeof record.excerpt !== "string") {
    return { ok: false, reason: "missing-excerpt" };
  }

  if (!Number.isInteger(record.version) || record.version !== SUPPORTED_WORKFLOW_CONTRACT_VERSION) {
    return { ok: false, reason: "unsupported-version" };
  }

  if (record.minimumPlan !== "free" && record.minimumPlan !== "pro") {
    return { ok: false, reason: "invalid-plan" };
  }

  if (record.platformId !== undefined && typeof record.platformId !== "string") {
    return { ok: false, reason: "invalid-platform" };
  }

  if (record.platformName !== undefined && typeof record.platformName !== "string") {
    return { ok: false, reason: "invalid-platform-name" };
  }

  if (!Array.isArray(record.taskIds) || record.taskIds.some((taskId) => typeof taskId !== "string")) {
    return { ok: false, reason: "invalid-tasks" };
  }

  if (record.estimatedTime !== undefined && typeof record.estimatedTime !== "string") {
    return { ok: false, reason: "invalid-estimated-time" };
  }

  if (
    record.relatedWorkflowIds !== undefined
    && (!Array.isArray(record.relatedWorkflowIds) || record.relatedWorkflowIds.some((workflowId) => typeof workflowId !== "string"))
  ) {
    return { ok: false, reason: "invalid-related-workflows" };
  }

  return {
    ok: true,
    workflow: {
      id: record.id,
      slug: record.slug,
      version: record.version,
      title: record.title,
      category: record.category,
      excerpt: record.excerpt,
      platformId: typeof record.platformId === "string" ? record.platformId : undefined,
      platformName: typeof record.platformName === "string" ? record.platformName : undefined,
      taskIds: record.taskIds.filter((taskId): taskId is string => typeof taskId === "string"),
      minimumPlan: record.minimumPlan,
      estimatedTime: typeof record.estimatedTime === "string" ? record.estimatedTime : undefined,
      relatedWorkflowIds: Array.isArray(record.relatedWorkflowIds)
        ? record.relatedWorkflowIds.filter((workflowId): workflowId is string => typeof workflowId === "string")
        : undefined,
    },
  };
}

export function mapWorkflowToLocalRegistry(workflow: SharedWorkflowDefinition, hasProAccess: boolean): WorkflowMappingResult {
  const platform = getGuiBuilderPlatform(workflow.platformId);
  const requestedTaskIds = workflow.taskIds;

  if (!platform) {
    return {
      platform: null,
      validTasks: [],
      skippedTaskIds: requestedTaskIds,
      mappingStatus: workflow.platformId || requestedTaskIds.length > 0 ? "invalid" : "general-chooser",
      requiresUpgrade: workflow.minimumPlan === "pro" && !hasProAccess,
    };
  }

  const validTasks = requestedTaskIds
    .map((taskId) => getGuiBuilderTask(platform.id, taskId))
    .filter((task): task is GuiBuilderTask => !!task);
  const validTaskIds = new Set(validTasks.map((task) => task.id));
  const skippedTaskIds = requestedTaskIds.filter((taskId) => !validTaskIds.has(taskId));

  const mappingStatus = requestedTaskIds.length === 0
    ? "platform-only"
    : skippedTaskIds.length === 0
      ? "complete"
      : validTasks.length > 0
        ? "partial"
        : "invalid";

  return {
    platform,
    validTasks,
    skippedTaskIds,
    mappingStatus,
    requiresUpgrade: workflow.minimumPlan === "pro" && !hasProAccess,
  };
}

export function getWorkflowDisplayTitle(
  workflow: Pick<SharedWorkflowDefinition, "slug" | "id"> & Partial<Pick<SharedWorkflowDefinition, "title">>,
) {
  const label = "title" in workflow && typeof workflow.title === "string" && workflow.title.trim()
    ? workflow.title
    : workflow.slug || workflow.id;
  if (label.includes(" ")) {
    return label;
  }

  return label
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export async function fetchPublicWorkflowDefinition(workflowId: string): Promise<WorkflowLoadResult> {
  const url = `${WORKFLOW_API_BASE_URL}/${encodeURIComponent(workflowId)}`;
  const response = typeof window !== "undefined" && window.psforgeDesktop?.request
    ? await window.psforgeDesktop.request({ url, method: "GET" })
    : await fetch(url).then(async (res) => ({
      ok: res.ok,
      status: res.status,
      headers: {},
      text: await res.text(),
    }));

  if (!response.ok) {
    return {
      ok: false,
      kind: response.status === 404 ? "unknown" : "network",
      status: response.status,
      message: response.status === 404
        ? "That PSForge workflow could not be found."
        : "PSForge could not load this workflow right now.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    return { ok: false, kind: "invalid", message: "The workflow response was not valid JSON.", status: response.status };
  }

  const validated = validateSharedWorkflowDefinition(parsed);
  if (!validated.ok) {
    return { ok: false, kind: "invalid", message: `This workflow uses an unsupported desktop contract (${validated.reason}).`, status: response.status };
  }

  return { ok: true, workflow: validated.workflow };
}
