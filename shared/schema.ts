import { z } from "zod";
import { pgTable, varchar, text, timestamp, boolean, integer, json } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Drizzle Database Tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

export const userRoles = ["free", "subscriber", "admin"] as const;
export type UserRole = typeof userRoles[number];

export const subscriptionStatuses = ["active", "trialing", "past_due", "canceled", "unpaid", "incomplete"] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];

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

export const insertScriptCommandSchema = scriptCommandSchema.omit({ id: true });
export const insertScriptSchema = scriptSchema.omit({ id: true, createdAt: true });
export const saveScriptSchema = z.object({
  name: z.string().min(1, "Script name is required"),
  content: z.string().min(1, "Script content is required"),
  description: z.string().optional(),
});
export const insertValidationRequestSchema = z.object({
  code: z.string(),
});

export type Parameter = z.infer<typeof parameterSchema>;
export type Command = z.infer<typeof commandSchema>;
export type ScriptCommand = z.infer<typeof scriptCommandSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type InsertScriptCommand = z.infer<typeof insertScriptCommandSchema>;
export type InsertScript = z.infer<typeof insertScriptSchema>;
export type InsertValidationRequest = z.infer<typeof insertValidationRequestSchema>;
export type SaveScript = z.infer<typeof saveScriptSchema>;

// User & Authentication Schemas
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string().nullable(),
  name: z.string(),
  role: z.enum(userRoles),
  stripeCustomerId: z.string().nullable(),
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
export type UsageMetric = z.infer<typeof usageMetricSchema>;
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type FeatureAccess = z.infer<typeof featureAccessSchema>;
export type PlatformNotification = z.infer<typeof platformNotificationSchema>;
export type InsertPlatformNotification = z.infer<typeof insertPlatformNotificationSchema>;
export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

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
