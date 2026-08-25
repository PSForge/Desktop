import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  extractWorkflowDeepLinkFromArgv,
  parseWorkflowDeepLink,
  validateWorkflowId,
} from "../desktop/deeplink.mjs";
import {
  mapWorkflowToLocalRegistry,
  validateSharedWorkflowDefinition,
  type SharedWorkflowDefinition,
} from "../client/src/lib/desktop-workflow-links";
import { getGuiBuilderTasks } from "../client/src/lib/gui-builder-registry";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function workflow(overrides: Partial<SharedWorkflowDefinition> = {}): SharedWorkflowDefinition {
  return {
    id: "free-report",
    slug: "free-report",
    version: 1,
    title: "Free Report",
    category: "File System",
    excerpt: "Build a safe reporting workflow.",
    platformId: "file-system",
    taskIds: [],
    minimumPlan: "free",
    ...overrides,
  };
}

test("accepts only the strict psforge workflow URI contract", () => {
  assert.deepEqual(parseWorkflowDeepLink("psforge://workflow/microsoft-365-license-optimization-powershell"), {
    ok: true,
    workflowId: "microsoft-365-license-optimization-powershell",
  });

  assert.equal(validateWorkflowId("abc-123-xyz"), true);
  assert.equal(validateWorkflowId("abc_123-xyz"), false);
  assert.equal(validateWorkflowId("abc-123-XYZ"), false);
  assert.equal(validateWorkflowId(""), false);
  assert.equal(validateWorkflowId("a".repeat(129)), false);
});

test("rejects malformed and malicious workflow URIs", () => {
  const invalidInputs = [
    "psforge://",
    "https://psforge.app/workflow/abc",
    "psforge://script/abc",
    "psforge://workflow/",
    "psforge://workflow/ABC",
    "psforge://workflow/abc_def",
    "psforge://workflow/abc/extra",
    "psforge://workflow/abc?run=true",
    "psforge://workflow/abc#payload",
    "psforge://workflow/../secret",
    "psforge://workflow/%2e%2e",
    "psforge://workflow/a%2Fb",
    "psforge://workflow/a%5Cb",
    "psforge://workflow/abc;Start-Process",
    "psforge://workflow/abc.exe",
  ];

  for (const input of invalidInputs) {
    assert.equal(parseWorkflowDeepLink(input).ok, false, input);
  }
});

test("extracts activation links for cold start and existing instance argv payloads", () => {
  assert.deepEqual(extractWorkflowDeepLinkFromArgv(["PSForge Desktop.exe", "psforge://workflow/free-report"]), {
    ok: true,
    workflowId: "free-report",
  });
  assert.deepEqual(extractWorkflowDeepLinkFromArgv(["PSForge Desktop.exe", "--flag", "psforge://workflow/pro-report"]), {
    ok: true,
    workflowId: "pro-report",
  });
  assert.equal(extractWorkflowDeepLinkFromArgv(["PSForge Desktop.exe", "--flag"]), null);
});

test("validates public workflow API contract and rejects unsupported versions", () => {
  const valid = validateSharedWorkflowDefinition({
    id: "free-report",
    slug: "free-report",
    version: 1,
    title: "Free Report",
    category: "File System",
    excerpt: "Build a safe reporting workflow.",
    platformId: "file-system",
    taskIds: [],
    minimumPlan: "free",
    estimatedTime: "5 minutes",
    relatedWorkflowIds: ["next-workflow"],
    ignored: "safe to ignore",
  });
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.ok ? Object.keys(valid.workflow).sort() : [], [
    "category",
    "estimatedTime",
    "excerpt",
    "id",
    "minimumPlan",
    "platformId",
    "platformName",
    "relatedWorkflowIds",
    "slug",
    "taskIds",
    "title",
    "version",
  ]);

  assert.equal(validateSharedWorkflowDefinition(workflow({ version: 2 })).ok, false);
  assert.equal(validateSharedWorkflowDefinition({ ...workflow(), minimumPlan: "enterprise" }).ok, false);
  assert.equal(validateSharedWorkflowDefinition({ ...workflow(), taskIds: [123] }).ok, false);
  assert.equal(validateSharedWorkflowDefinition({ ...workflow(), taskIds: undefined }).ok, false);
});

test("verifies platform and task IDs against the local GUI registry", () => {
  const fileSystemTasks = getGuiBuilderTasks("file-system");
  assert.ok(fileSystemTasks.length > 0);

  const mappedWorkflow: SharedWorkflowDefinition = workflow({
    id: "disk-cleanup",
    slug: "disk-cleanup",
    platformId: "file-system",
    taskIds: [fileSystemTasks[0].id, "missing-task"],
  });

  const mapping = mapWorkflowToLocalRegistry(mappedWorkflow, false);
  assert.equal(mapping.platform?.id, "file-system");
  assert.equal(mapping.validTasks.length, 1);
  assert.deepEqual(mapping.skippedTaskIds, ["missing-task"]);
  assert.equal(mapping.mappingStatus, "partial");
});

test("handles partial and missing mappings safely", () => {
  const platformOnly = mapWorkflowToLocalRegistry(workflow({
    id: "platform-only",
    slug: "platform-only",
    platformId: "network",
    taskIds: [],
  }), false);
  assert.equal(platformOnly.mappingStatus, "platform-only");
  assert.equal(platformOnly.platform?.id, "network");

  const unknown = mapWorkflowToLocalRegistry(workflow({
    id: "unknown",
    slug: "unknown",
    platformId: "not-real",
    taskIds: ["anything"],
  }), false);
  assert.equal(unknown.mappingStatus, "invalid");
  assert.equal(unknown.platform, null);
});

test("gates Pro workflows without dropping local mapping context", () => {
  const proWorkflow: SharedWorkflowDefinition = workflow({
    id: "pro-network",
    slug: "pro-network",
    platformId: "network",
    taskIds: [getGuiBuilderTasks("network")[0].id],
    minimumPlan: "pro",
  });

  const freeMapping = mapWorkflowToLocalRegistry(proWorkflow, false);
  assert.equal(freeMapping.requiresUpgrade, true);
  assert.equal(freeMapping.platform?.id, "network");
  assert.equal(freeMapping.validTasks.length, 1);

  const proMapping = mapWorkflowToLocalRegistry(proWorkflow, true);
  assert.equal(proMapping.requiresUpgrade, false);
});

test("workflow mapping opens the builder without generating executable script content", () => {
  const mapping = mapWorkflowToLocalRegistry(workflow({
    id: "review-only",
    slug: "review-only",
    platformId: "network",
    taskIds: [getGuiBuilderTasks("network")[0].id],
  }), true);

  assert.equal("script" in mapping, false);
  assert.equal("command" in mapping, false);
  assert.equal(mapping.validTasks.length, 1);
});

test("installer configuration registers and packages the psforge protocol", () => {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(pkg.version, "2.0.4");
  assert.deepEqual(pkg.build.protocols, [{ name: "PSForge Workflow Link", schemes: ["psforge"] }]);
  assert.ok(pkg.build.files.includes("desktop/deeplink.mjs"));
  assert.ok(String(pkg.scripts["desktop:dist:store"]).includes("electron-builder --win nsis zip msi"));
});
