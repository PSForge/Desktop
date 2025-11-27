import { z } from "zod";
import { pgTable, varchar, text, timestamp, boolean, integer, json, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Drizzle Database Tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  referralSource: varchar("referral_source", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scripts = pgTable("scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content").notNull(),
  commands: json("commands").$type<Array<{
    id: string;
    commandId: string;
    commandName: string;
    parameters: Record<string, any>;
    order: number;
  }>>(),
  taskCategory: varchar("task_category", { length: 255 }),
  taskName: varchar("task_name", { length: 255 }),
  isFavorite: boolean("is_favorite").notNull().default(false),
  lastAccessed: timestamp("last_accessed"),
  documentation: text("documentation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scriptTags = pgTable("script_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scriptId: varchar("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueScriptTag: unique().on(table.scriptId, table.tagId),
}));

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  interval: varchar("interval", { length: 50 }).notNull(),
  features: json("features").$type<string[]>().notNull(),
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAt: timestamp("cancel_at"),
  canceledAt: timestamp("canceled_at"),
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptionEvents = pgTable("subscription_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userSubscriptionId: varchar("user_subscription_id").notNull().references(() => userSubscriptions.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  payload: json("payload").$type<Record<string, any>>().notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
});

export const usageMetrics = pgTable("usage_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  metricType: varchar("metric_type", { length: 100 }).notNull(),
  value: integer("value").notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  recordedAt: timestamp("recorded_at").notNull(),
});

export const platformNotifications = pgTable("platform_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gitRepositories = pgTable("git_repositories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull().default("github"),
  repoOwner: varchar("repo_owner", { length: 255 }).notNull(),
  repoName: varchar("repo_name", { length: 255 }).notNull(),
  defaultBranch: varchar("default_branch", { length: 255 }).notNull().default("main"),
  currentBranch: varchar("current_branch", { length: 255 }),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gitCommits = pgTable("git_commits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").notNull().references(() => gitRepositories.id, { onDelete: "cascade" }),
  scriptId: varchar("script_id").references(() => scripts.id, { onDelete: "set null" }),
  commitSha: varchar("commit_sha", { length: 255 }).notNull(),
  message: text("message").notNull(),
  branch: varchar("branch", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const welcomeEmailTemplates = pgTable("welcome_email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull().unique(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlContent: text("html_content").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventId: varchar("event_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  subscriptionId: varchar("subscription_id", { length: 255 }),
  payload: json("payload").$type<Record<string, any>>(),
  errorMessage: text("error_message"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const templateCategories = pgTable("template_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceScriptId: varchar("source_script_id").references(() => scripts.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  categoryId: varchar("category_id").references(() => templateCategories.id, { onDelete: "set null" }),
  tags: json("tags").$type<string[]>().notNull().default(sql`'[]'`),
  downloads: integer("downloads").notNull().default(0),
  installs: integer("installs").notNull().default(0),
  averageRating: integer("average_rating").notNull().default(0),
  totalRatings: integer("total_ratings").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  featured: boolean("featured").notNull().default(false),
  version: varchar("version", { length: 50 }).notNull().default("1.0.0"),
  securityScore: integer("security_score"),
  securityLevel: varchar("security_level", { length: 50 }),
  securityWarningsCount: integer("security_warnings_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const templateRatings = pgTable("template_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserTemplate: unique().on(table.userId, table.templateId),
}));

export const templateInstalls = pgTable("template_installs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  installedAt: timestamp("installed_at").notNull().defaultNow(),
});

// User Stats for conversion tracking
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  scriptsGenerated: integer("scripts_generated").notNull().default(0),
  scriptsSaved: integer("scripts_saved").notNull().default(0),
  generationSources: json("generation_sources").$type<{
    gui: number;
    ai: number;
    wizard: number;
    direct: number;
  }>().notNull().default(sql`'{"gui": 0, "ai": 0, "wizard": 0, "direct": 0}'`),
  milestonesAchieved: json("milestones_achieved").$type<number[]>().notNull().default(sql`'[]'`),
  lastNudgeShown: timestamp("last_nudge_shown"),
  nudgesDismissed: json("nudges_dismissed").$type<string[]>().notNull().default(sql`'[]'`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userRoles = ["free", "subscriber", "admin"] as const;
export type UserRole = typeof userRoles[number];

export const subscriptionStatuses = ["active", "trialing", "past_due", "canceled", "unpaid", "incomplete"] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];

export const templateStatuses = ["pending", "approved", "rejected"] as const;
export type TemplateStatus = typeof templateStatuses[number];

export const parameterTypes = ["string", "int", "boolean", "switch", "array", "path", "select"] as const;
export type ParameterType = typeof parameterTypes[number];

export const commandCategories = [
  "File System",
  "Registry",
  "Network",
  "Active Directory",
  "System Administration",
  "Security",
  "Process Management",
  "Event Logs",
  "Services",
  "Variables & Data",
  "Azure",
  "Exchange Online",
  "Azure AD",
  "SharePoint",
  "MECM",
  "Exchange Server",
  "Hyper-V",
  "Windows Server",
  "SQL Server",
] as const;
export type CommandCategory = typeof commandCategories[number];

export const parameterSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(parameterTypes),
  description: z.string(),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  value: z.any().optional(),
  options: z.array(z.string()).optional(),
});

export const commandSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(commandCategories),
  description: z.string(),
  syntax: z.string(),
  parameters: z.array(parameterSchema),
  example: z.string().optional(),
});

export const scriptCommandSchema = z.object({
  id: z.string(),
  commandId: z.string(),
  commandName: z.string(),
  parameters: z.record(z.any()),
  order: z.number(),
});

export const scriptSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  content: z.string(),
  commands: z.array(scriptCommandSchema).optional(),
  taskCategory: z.string().optional(),
  taskName: z.string().optional(),
  isFavorite: z.boolean().optional(),
  lastAccessed: z.string().optional(),
  documentation: z.string().optional(),
  createdAt: z.string().optional(),
});

export const tagSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  name: z.string(),
  color: z.string().optional(),
  createdAt: z.string().optional(),
});

export const scriptTagSchema = z.object({
  id: z.string().optional(),
  scriptId: z.string(),
  tagId: z.string(),
  createdAt: z.string().optional(),
});

export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    line: z.number().optional(),
    message: z.string(),
    severity: z.enum(["error", "warning", "info"]),
  })),
  warnings: z.array(z.string()).optional(),
});

// Comprehensive validation schemas
export const validationIssueSchema = z.object({
  type: z.enum(['error', 'warning', 'info']),
  category: z.enum(['syntax', 'dependency', 'impact', 'best-practice', 'compliance', 'security']),
  line: z.number().optional(),
  message: z.string(),
  recommendation: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
});

export const dependencyInfoSchema = z.object({
  modules: z.array(z.string()),
  permissions: z.array(z.string()),
  externalTools: z.array(z.string()),
});

export const impactAnalysisSchema = z.object({
  modifiesObjects: z.boolean(),
  deletesObjects: z.boolean(),
  createsObjects: z.boolean(),
  estimatedImpact: z.string(),
  affectedResources: z.array(z.string()),
});

export const bestPracticeSchema = z.object({
  category: z.string(),
  passed: z.boolean(),
  message: z.string(),
  recommendation: z.string().optional(),
});

export const complianceCheckSchema = z.object({
  standard: z.string(),
  passed: z.boolean(),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export const comprehensiveValidationResultSchema = z.object({
  isValid: z.boolean(),
  score: z.number(),
  issues: z.array(validationIssueSchema),
  dependencies: dependencyInfoSchema,
  impact: impactAnalysisSchema,
  bestPractices: z.array(bestPracticeSchema),
  compliance: z.array(complianceCheckSchema),
  summary: z.string(),
});

export const gitRepositorySchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  provider: z.string(),
  repoOwner: z.string(),
  repoName: z.string(),
  defaultBranch: z.string(),
  currentBranch: z.string().optional(),
  lastSyncedAt: z.string().optional(),
  createdAt: z.string().optional(),
});

export const gitCommitSchema = z.object({
  id: z.string().optional(),
  repositoryId: z.string(),
  scriptId: z.string().optional(),
  commitSha: z.string(),
  message: z.string(),
  branch: z.string(),
  author: z.string().optional(),
  createdAt: z.string().optional(),
});

export const templateCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  createdAt: z.string().optional(),
});

export const templateSchema = z.object({
  id: z.string().optional(),
  authorId: z.string(),
  sourceScriptId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  content: z.string(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()),
  downloads: z.number().optional(),
  installs: z.number().optional(),
  averageRating: z.number().optional(),
  totalRatings: z.number().optional(),
  status: z.enum(templateStatuses).optional(),
  featured: z.boolean().optional(),
  version: z.string().optional(),
  securityScore: z.number().optional(),
  securityLevel: z.string().optional(),
  securityWarningsCount: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const templateRatingSchema = z.object({
  id: z.string().optional(),
  templateId: z.string(),
  userId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const templateInstallSchema = z.object({
  id: z.string().optional(),
  templateId: z.string(),
  userId: z.string(),
  installedAt: z.string().optional(),
});

export const generationSourcesSchema = z.object({
  gui: z.number(),
  ai: z.number(),
  wizard: z.number(),
  direct: z.number(),
});

export const userStatsSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  scriptsGenerated: z.number(),
  scriptsSaved: z.number(),
  generationSources: generationSourcesSchema,
  milestonesAchieved: z.array(z.number()),
  lastNudgeShown: z.string().nullable().optional(),
  nudgesDismissed: z.array(z.string()),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const insertUserStatsSchema = userStatsSchema.omit({ id: true, createdAt: true, updatedAt: true });

export const insertScriptCommandSchema = scriptCommandSchema.omit({ id: true });
export const insertScriptSchema = scriptSchema.omit({ id: true, createdAt: true, lastAccessed: true });
export const insertTagSchema = tagSchema.omit({ id: true, createdAt: true });
export const insertScriptTagSchema = scriptTagSchema.omit({ id: true, createdAt: true });
export const insertGitRepositorySchema = gitRepositorySchema.omit({ id: true, createdAt: true, lastSyncedAt: true });
export const insertGitCommitSchema = gitCommitSchema.omit({ id: true, createdAt: true });
export const insertTemplateCategorySchema = templateCategorySchema.omit({ id: true, createdAt: true });
export const insertTemplateSchema = templateSchema.omit({ id: true, createdAt: true, updatedAt: true, downloads: true, installs: true, averageRating: true, totalRatings: true });
export const insertTemplateRatingSchema = templateRatingSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertTemplateInstallSchema = templateInstallSchema.omit({ id: true, installedAt: true });

export const saveScriptSchema = z.object({
  name: z.string().min(1, "Script name is required"),
  content: z.string().min(1, "Script content is required"),
  description: z.string().optional(),
  taskCategory: z.string().optional(),
  taskName: z.string().optional(),
  documentation: z.string().optional(),
});

export const updateScriptSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  isFavorite: z.boolean().optional(),
  documentation: z.string().optional(),
});

export const trackScriptGenerationSchema = z.object({
  taskCategory: z.string().optional(),
  taskName: z.string().optional(),
  builderType: z.enum(['ai_assistant', 'gui_builder', 'script_wizard', 'direct_coding']),
});
export const insertValidationRequestSchema = z.object({
  code: z.string(),
});

export type Parameter = z.infer<typeof parameterSchema>;
export type Command = z.infer<typeof commandSchema>;
export type ScriptCommand = z.infer<typeof scriptCommandSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type ScriptTag = z.infer<typeof scriptTagSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type DependencyInfo = z.infer<typeof dependencyInfoSchema>;
export type ImpactAnalysis = z.infer<typeof impactAnalysisSchema>;
export type BestPractice = z.infer<typeof bestPracticeSchema>;
export type ComplianceCheck = z.infer<typeof complianceCheckSchema>;
export type ComprehensiveValidationResult = z.infer<typeof comprehensiveValidationResultSchema>;
export type InsertScriptCommand = z.infer<typeof insertScriptCommandSchema>;
export type InsertScript = z.infer<typeof insertScriptSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type InsertScriptTag = z.infer<typeof insertScriptTagSchema>;
export type InsertValidationRequest = z.infer<typeof insertValidationRequestSchema>;
export type SaveScript = z.infer<typeof saveScriptSchema>;
export type UpdateScript = z.infer<typeof updateScriptSchema>;
export type TrackScriptGeneration = z.infer<typeof trackScriptGenerationSchema>;

// User & Authentication Schemas
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string().nullable(),
  name: z.string(),
  role: z.enum(userRoles),
  stripeCustomerId: z.string().nullable(),
  referralSource: z.string().nullable(),
  createdAt: z.string(),
});

export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const adminCreateUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(userRoles, { errorMap: () => ({ message: "Invalid role" }) }),
});

// Subscription Schemas
export const subscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceCents: z.number(),
  interval: z.enum(["month", "year"]),
  features: z.array(z.string()),
  stripeProductId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
});

export const userSubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.string(),
  stripeSubscriptionId: z.string().nullable(),
  status: z.enum(subscriptionStatuses),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  cancelAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  trialEnd: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const subscriptionEventSchema = z.object({
  id: z.string(),
  userSubscriptionId: z.string(),
  type: z.string(),
  payload: z.record(z.any()),
  occurredAt: z.string(),
});

export const webhookEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  eventId: z.string().nullable(),
  status: z.enum(["success", "failed", "processing"]),
  userId: z.string().nullable(),
  subscriptionId: z.string().nullable(),
  payload: z.record(z.any()).nullable(),
  errorMessage: z.string().nullable(),
  processingTimeMs: z.number().nullable(),
  createdAt: z.string(),
});

// Analytics & Metrics Schemas
export const usageMetricSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  metricType: z.string(),
  value: z.number(),
  metadata: z.record(z.any()).nullable(),
  recordedAt: z.string(),
});

export const analyticsOverviewSchema = z.object({
  totalUsers: z.number(),
  activeSubscribers: z.number(),
  freeUsers: z.number(),
  monthlyRecurringRevenue: z.number(),
  totalRevenue: z.number(),
  churnRate: z.number().nullable(),
  newSignupsThisMonth: z.number(),
  cancellationsThisMonth: z.number(),
  totalScriptsGenerated: z.number(),
  totalScriptsSaved: z.number(),
  topTasks: z.array(z.object({
    taskName: z.string(),
    taskCategory: z.string(),
    count: z.number(),
  })),
  referralSources: z.array(z.object({
    source: z.string(),
    count: z.number(),
    percentage: z.number(),
  })),
});

// Feature Access Schema
export const featureAccessSchema = z.object({
  hasAIAccess: z.boolean(),
  hasPremiumCategories: z.boolean(),
  accessibleCategories: z.array(z.string()),
  restrictedCategories: z.array(z.string()),
});

// Platform Update Notification Schema
export const platformNotificationSchema = z.object({
  id: z.string(),
  message: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertPlatformNotificationSchema = platformNotificationSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Welcome Email Template Schemas
export const welcomeEmailTypes = ["free_signup", "subscription"] as const;
export type WelcomeEmailType = typeof welcomeEmailTypes[number];

export const welcomeEmailTemplateSchema = z.object({
  id: z.string(),
  type: z.enum(welcomeEmailTypes),
  subject: z.string(),
  htmlContent: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertWelcomeEmailTemplateSchema = welcomeEmailTemplateSchema.omit({ id: true, createdAt: true, updatedAt: true });

export const updateWelcomeEmailTemplateSchema = insertWelcomeEmailTemplateSchema.partial();

// Password Reset Schemas
export const passwordResetTokenSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
  used: z.boolean(),
  createdAt: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const supportRequestSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000, "Message is too long"),
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type AdminCreateUserData = z.infer<typeof adminCreateUserSchema>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type UserSubscription = z.infer<typeof userSubscriptionSchema>;
export type SubscriptionEvent = z.infer<typeof subscriptionEventSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type UsageMetric = z.infer<typeof usageMetricSchema>;
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type FeatureAccess = z.infer<typeof featureAccessSchema>;
export type PlatformNotification = z.infer<typeof platformNotificationSchema>;
export type InsertPlatformNotification = z.infer<typeof insertPlatformNotificationSchema>;
export type WelcomeEmailTemplate = z.infer<typeof welcomeEmailTemplateSchema>;
export type InsertWelcomeEmailTemplate = z.infer<typeof insertWelcomeEmailTemplateSchema>;
export type UpdateWelcomeEmailTemplate = z.infer<typeof updateWelcomeEmailTemplateSchema>;
export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type SupportRequestData = z.infer<typeof supportRequestSchema>;
export type GitRepository = z.infer<typeof gitRepositorySchema>;
export type GitCommit = z.infer<typeof gitCommitSchema>;
export type InsertGitRepository = z.infer<typeof insertGitRepositorySchema>;
export type InsertGitCommit = z.infer<typeof insertGitCommitSchema>;
export type TemplateCategory = z.infer<typeof templateCategorySchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateRating = z.infer<typeof templateRatingSchema>;
export type TemplateInstall = z.infer<typeof templateInstallSchema>;
export type InsertTemplateCategory = z.infer<typeof insertTemplateCategorySchema>;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type InsertTemplateRating = z.infer<typeof insertTemplateRatingSchema>;
export type InsertTemplateInstall = z.infer<typeof insertTemplateInstallSchema>;
export type GenerationSources = z.infer<typeof generationSourcesSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;

// Milestone definitions
export const milestoneThresholds = [5, 10, 25, 50, 100] as const;
export type MilestoneThreshold = typeof milestoneThresholds[number];

// Basic categories accessible to free users
export const freeTierCategories = [
  "File System",
  "Network",
  "Services",
  "Process Management",
  "Event Logs",
  "Active Directory",
  "Registry",
  "Security",
] as const;
