import { z } from "zod";

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
  name: z.string(),
  description: z.string().optional(),
  commands: z.array(scriptCommandSchema),
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

// Type exports
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type UserSubscription = z.infer<typeof userSubscriptionSchema>;
export type SubscriptionEvent = z.infer<typeof subscriptionEventSchema>;
export type UsageMetric = z.infer<typeof usageMetricSchema>;
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type FeatureAccess = z.infer<typeof featureAccessSchema>;

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
