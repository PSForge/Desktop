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
  lastLoginAt: timestamp("last_login_at"),
  // Pro Conversion Tracking Fields
  totalScriptsCreated: integer("total_scripts_created").notNull().default(0),
  totalTimeSavedMinutes: integer("total_time_saved_minutes").notNull().default(0),
  firstScriptDate: timestamp("first_script_date"),
  daysActive: integer("days_active").notNull().default(0),
  lastActiveDate: timestamp("last_active_date"),
  communityBadge: varchar("community_badge", { length: 100 }),
  proSinceDate: timestamp("pro_since_date"),
  featuredContributor: boolean("featured_contributor").notNull().default(false),
  // Stripe Connect Seller Fields
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 255 }),
  stripeConnectOnboardingComplete: boolean("stripe_connect_onboarding_complete").notNull().default(false),
  sellerStatus: varchar("seller_status", { length: 50 }).default("not_seller"),
  sellerEnabledAt: timestamp("seller_enabled_at"),
  totalEarningsCents: integer("total_earnings_cents").notNull().default(0),
  pendingPayoutCents: integer("pending_payout_cents").notNull().default(0),
  // GitHub OAuth Integration Fields
  githubAccessToken: text("github_access_token"),
  githubUsername: varchar("github_username", { length: 255 }),
  githubAvatarUrl: text("github_avatar_url"),
  githubConnectedAt: timestamp("github_connected_at"),
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
  // Time Tracking Fields for Value Calculator
  creationStartTime: timestamp("creation_start_time"),
  creationEndTime: timestamp("creation_end_time"),
  actualTimeSpentMinutes: integer("actual_time_spent_minutes"),
  estimatedManualTimeMinutes: integer("estimated_manual_time_minutes").default(60),
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

// Apple In-App Purchase Transactions
export const appleTransactions = pgTable("apple_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalTransactionId: varchar("original_transaction_id", { length: 255 }).notNull(),
  transactionId: varchar("transaction_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  bundleId: varchar("bundle_id", { length: 255 }),
  purchaseDate: timestamp("purchase_date").notNull(),
  expiresDate: timestamp("expires_date"),
  isTrialPeriod: boolean("is_trial_period").notNull().default(false),
  isInIntroOfferPeriod: boolean("is_in_intro_offer_period").notNull().default(false),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  environment: varchar("environment", { length: 50 }).notNull().default("production"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Apple Server-to-Server Notification Events
export const appleNotificationEvents = pgTable("apple_notification_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationType: varchar("notification_type", { length: 100 }).notNull(),
  subtype: varchar("subtype", { length: 100 }),
  notificationUUID: varchar("notification_uuid", { length: 255 }),
  originalTransactionId: varchar("original_transaction_id", { length: 255 }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 50 }).notNull(),
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
  // Paid Template Fields
  isPaid: boolean("is_paid").notNull().default(false),
  priceCents: integer("price_cents").default(0),
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  totalSales: integer("total_sales").notNull().default(0),
  totalRevenueCents: integer("total_revenue_cents").notNull().default(0),
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

// Template Purchases for Paid Templates
export const templatePurchases = pgTable("template_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  priceCents: integer("price_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull(),
  sellerEarningsCents: integer("seller_earnings_cents").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
}, (table) => ({
  uniqueBuyerTemplate: unique().on(table.buyerId, table.templateId),
}));

// Seller Payouts for Stripe Connect Transfers
export const sellerPayouts = pgTable("seller_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
  stripePayoutId: varchar("stripe_payout_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  failureReason: text("failure_reason"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// User Milestones for Achievement Tracking
export const userMilestones = pgTable("user_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  milestoneType: varchar("milestone_type", { length: 100 }).notNull(),
  milestoneValue: integer("milestone_value").notNull(),
  achievedAt: timestamp("achieved_at").notNull().defaultNow(),
  notificationSent: boolean("notification_sent").notNull().default(false),
  dismissed: boolean("dismissed").notNull().default(false),
});

// Nudge Dismissals for Power User Nudge System
export const nudgeDismissals = pgTable("nudge_dismissals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nudgeType: varchar("nudge_type", { length: 100 }).notNull(),
  dismissedAt: timestamp("dismissed_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserNudge: unique().on(table.userId, table.nudgeType),
}));

export const userRoles = ["free", "subscriber", "admin"] as const;
export type UserRole = typeof userRoles[number];

export const subscriptionStatuses = ["active", "trialing", "past_due", "canceled", "unpaid", "incomplete"] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];

export const templateStatuses = ["pending", "approved", "rejected"] as const;
export type TemplateStatus = typeof templateStatuses[number];

export const purchaseStatuses = ["pending", "completed", "refunded", "failed"] as const;
export type PurchaseStatus = typeof purchaseStatuses[number];

export const payoutStatuses = ["pending", "processing", "completed", "failed"] as const;
export type PayoutStatus = typeof payoutStatuses[number];

export const sellerStatuses = ["not_seller", "pending_onboarding", "active", "suspended"] as const;
export type SellerStatus = typeof sellerStatuses[number];

export const milestoneTypes = [
  "scripts_created_5", "scripts_created_10", "scripts_created_25", "scripts_created_50",
  "time_saved_5_hours", "time_saved_10_hours", "time_saved_20_hours",
  "first_marketplace_template", "active_7_days", "active_30_days"
] as const;
export type MilestoneType = typeof milestoneTypes[number];

export const communityBadges = [
  "new_member", "active_contributor", "top_contributor", 
  "verified_pro", "pro_contributor", "featured_expert", "pro_founder"
] as const;
export type CommunityBadge = typeof communityBadges[number];

export const nudgeTypes = [
  "post_script_modal", "inline_suggestion", "pro_tooltip", "milestone_banner", "value_widget",
  "ai_feature_teaser", "power_user_prompt", "community_teaser", "roi_calculator"
] as const;
export type NudgeType = typeof nudgeTypes[number];

export const parameterTypes = ["string", "int", "boolean", "switch", "array", "path", "select"] as const;
export type ParameterType = typeof parameterTypes[number];

export const commandCategories = [
  // Windows Core (Free Tier)
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
  // Microsoft Cloud
  "Azure",
  "Azure AD",
  "Azure Resources",
  "Exchange Online",
  "Exchange Server",
  "SharePoint",
  "SharePoint On-Prem",
  "Microsoft Teams",
  "OneDrive",
  "Office 365",
  "Intune",
  "MECM",
  "Power Platform",
  "Windows 365",
  // Infrastructure
  "Hyper-V",
  "Windows Server",
  "SQL Server",
  "VMware",
  "Docker",
  "Nutanix",
  "Citrix",
  "Veeam",
  "NetApp",
  // Cloud Providers
  "AWS",
  "Google Cloud",
  // Security & Identity
  "CrowdStrike",
  "Sophos",
  "Okta",
  "Duo Security",
  "Fortinet",
  "Cisco",
  // DevOps & Collaboration
  "GitHub",
  "Splunk",
  "Jira",
  "Slack",
  "Zoom",
  "ServiceNow",
  "Salesforce",
  "ConnectWise",
  // Deployment & Management
  "PDQ Deploy",
  "Chocolatey",
  "JAMF",
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
  isPaid: z.boolean().optional(),
  priceCents: z.number().optional(),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  totalSales: z.number().optional(),
  totalRevenueCents: z.number().optional(),
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

export const templatePurchaseSchema = z.object({
  id: z.string().optional(),
  templateId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  priceCents: z.number(),
  platformFeeCents: z.number(),
  sellerEarningsCents: z.number(),
  stripePaymentIntentId: z.string().optional(),
  stripeCheckoutSessionId: z.string().optional(),
  status: z.enum(purchaseStatuses).optional(),
  refundedAt: z.string().optional(),
  refundReason: z.string().optional(),
  purchasedAt: z.string().optional(),
});

export const sellerPayoutSchema = z.object({
  id: z.string().optional(),
  sellerId: z.string(),
  amountCents: z.number(),
  stripeTransferId: z.string().optional(),
  stripePayoutId: z.string().optional(),
  status: z.enum(payoutStatuses).optional(),
  failureReason: z.string().optional(),
  requestedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const userMilestoneSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  milestoneType: z.enum(milestoneTypes),
  milestoneValue: z.number(),
  achievedAt: z.string().optional(),
  notificationSent: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});

export const nudgeDismissalSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  nudgeType: z.enum(nudgeTypes),
  dismissedAt: z.string().optional(),
});

export const userStatsSchema = z.object({
  totalScriptsCreated: z.number(),
  totalTimeSavedMinutes: z.number(),
  totalTimeSavedHours: z.number(),
  totalValueCreated: z.number(),
  potentialValueWithPro: z.number(),
  roiMultiplier: z.number(),
  daysActive: z.number(),
  communityBadge: z.enum(communityBadges).nullable(),
  firstScriptDate: z.string().nullable(),
  milestones: z.array(userMilestoneSchema),
  currentTier: z.enum(["new_user", "regular_user", "power_user"]),
});

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
export const insertTemplatePurchaseSchema = templatePurchaseSchema.omit({ id: true, purchasedAt: true, refundedAt: true });
export const insertSellerPayoutSchema = sellerPayoutSchema.omit({ id: true, requestedAt: true, completedAt: true });
export const insertUserMilestoneSchema = userMilestoneSchema.omit({ id: true, achievedAt: true });
export const insertNudgeDismissalSchema = nudgeDismissalSchema.omit({ id: true, dismissedAt: true });

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
export type UserMilestone = z.infer<typeof userMilestoneSchema>;
export type InsertUserMilestone = z.infer<typeof insertUserMilestoneSchema>;
export type NudgeDismissal = z.infer<typeof nudgeDismissalSchema>;
export type InsertNudgeDismissal = z.infer<typeof insertNudgeDismissalSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type TemplatePurchase = z.infer<typeof templatePurchaseSchema>;
export type InsertTemplatePurchase = z.infer<typeof insertTemplatePurchaseSchema>;
export type SellerPayout = z.infer<typeof sellerPayoutSchema>;
export type InsertSellerPayout = z.infer<typeof insertSellerPayoutSchema>;

// Apple In-App Purchase Schemas
export const appleTransactionStatusEnum = z.enum(["active", "expired", "canceled", "grace_period", "billing_retry", "revoked"]);
export type AppleTransactionStatus = z.infer<typeof appleTransactionStatusEnum>;

export const appleTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  originalTransactionId: z.string(),
  transactionId: z.string(),
  productId: z.string(),
  bundleId: z.string().nullable(),
  purchaseDate: z.string(),
  expiresDate: z.string().nullable(),
  isTrialPeriod: z.boolean(),
  isInIntroOfferPeriod: z.boolean(),
  status: appleTransactionStatusEnum,
  environment: z.enum(["sandbox", "production"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertAppleTransactionSchema = z.object({
  userId: z.string(),
  originalTransactionId: z.string(),
  transactionId: z.string(),
  productId: z.string(),
  bundleId: z.string().optional(),
  purchaseDate: z.string(),
  expiresDate: z.string().optional(),
  isTrialPeriod: z.boolean().default(false),
  isInIntroOfferPeriod: z.boolean().default(false),
  status: appleTransactionStatusEnum.default("active"),
  environment: z.enum(["sandbox", "production"]).default("production"),
});

export const appleNotificationEventSchema = z.object({
  id: z.string(),
  notificationType: z.string(),
  subtype: z.string().nullable(),
  notificationUUID: z.string().nullable(),
  originalTransactionId: z.string().nullable(),
  userId: z.string().nullable(),
  status: z.string(),
  payload: z.record(z.any()).nullable(),
  errorMessage: z.string().nullable(),
  processingTimeMs: z.number().nullable(),
  createdAt: z.string(),
});

export const insertAppleNotificationEventSchema = z.object({
  notificationType: z.string(),
  subtype: z.string().optional(),
  notificationUUID: z.string().optional(),
  originalTransactionId: z.string().optional(),
  userId: z.string().optional(),
  status: z.string(),
  payload: z.record(z.any()).optional(),
  errorMessage: z.string().optional(),
  processingTimeMs: z.number().optional(),
});

export type AppleTransaction = z.infer<typeof appleTransactionSchema>;
export type InsertAppleTransaction = z.infer<typeof insertAppleTransactionSchema>;
export type AppleNotificationEvent = z.infer<typeof appleNotificationEventSchema>;
export type InsertAppleNotificationEvent = z.infer<typeof insertAppleNotificationEventSchema>;

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
  lastLoginAt: z.string().nullable().optional(),
  stripeConnectAccountId: z.string().nullable().optional(),
  stripeConnectOnboardingComplete: z.boolean().optional(),
  sellerStatus: z.enum(sellerStatuses).nullable().optional(),
  sellerEnabledAt: z.string().nullable().optional(),
  totalEarningsCents: z.number().optional(),
  pendingPayoutCents: z.number().optional(),
  // GitHub OAuth Integration
  githubAccessToken: z.string().nullable().optional(),
  githubUsername: z.string().nullable().optional(),
  githubAvatarUrl: z.string().nullable().optional(),
  githubConnectedAt: z.string().nullable().optional(),
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
