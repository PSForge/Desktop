import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, and, or, gte, sql } from "drizzle-orm";
import {
  users,
  sessions,
  scripts,
  subscriptionPlans,
  userSubscriptions,
  subscriptionEvents,
  usageMetrics,
  platformNotifications,
  passwordResetTokens,
  welcomeEmailTemplates,
  type User,
  type Session,
  type Script,
  type InsertScript,
  type SubscriptionPlan,
  type UserSubscription,
  type SubscriptionEvent,
  type UsageMetric,
  type AnalyticsOverview,
  type SubscriptionStatus,
  type PlatformNotification,
  type InsertPlatformNotification,
  type PasswordResetToken,
  type WelcomeEmailTemplate,
  type InsertWelcomeEmailTemplate,
  type UpdateWelcomeEmailTemplate,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    // Use standard PostgreSQL Pool for Node.js environment
    const pool = new Pool({ 
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased to 10 seconds
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    this.db = drizzle(pool);
  }

  // Helper function to convert Date objects to ISO strings
  private toISOString(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }

  // Helper function to convert timestamp fields
  private convertTimestamps<T extends Record<string, any>>(obj: T): any {
    const converted: any = { ...obj };
    for (const key in converted) {
      if (converted[key] instanceof Date) {
        converted[key] = converted[key].toISOString();
      }
    }
    return converted;
  }

  // Script management
  async getScript(id: string): Promise<Script | undefined> {
    const result = await this.db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getAllScripts(): Promise<Script[]> {
    const result = await this.db.select().from(scripts);
    return result.map(s => this.convertTimestamps(s));
  }

  async getUserScripts(userId: string): Promise<Script[]> {
    const result = await this.db.select().from(scripts).where(eq(scripts.userId, userId));
    return result.map(s => this.convertTimestamps(s));
  }

  async createScript(script: InsertScript): Promise<Script> {
    const result = await this.db.insert(scripts).values({
      userId: script.userId!,
      name: script.name,
      description: script.description,
      content: script.content,
      commands: script.commands || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async updateScript(id: string, updates: Partial<InsertScript>): Promise<Script | undefined> {
    const result = await this.db.update(scripts).set(updates).where(eq(scripts.id, id)).returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async deleteScript(id: string): Promise<boolean> {
    const result = await this.db.delete(scripts).where(eq(scripts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // User management
  async getUserById(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const result = await this.db.insert(users).values({
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      name: user.name,
      role: user.role,
      stripeCustomerId: user.stripeCustomerId,
      referralSource: user.referralSource,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const { id: _, createdAt: __, ...updateData } = updates;
    const result = await this.db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await this.db.select().from(users);
    return result.map(u => this.convertTimestamps(u));
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.db.delete(scripts).where(eq(scripts.userId, id));
    await this.db.delete(sessions).where(eq(sessions.userId, id));
    await this.db.delete(usageMetrics).where(eq(usageMetrics.userId, id));
    
    const userSubs = await this.db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, id));
    for (const sub of userSubs) {
      await this.db.delete(subscriptionEvents).where(eq(subscriptionEvents.userSubscriptionId, sub.id));
    }
    
    await this.db.delete(userSubscriptions).where(eq(userSubscriptions.userId, id));
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
    const result = await this.db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Session management
  async createSession(session: Omit<Session, "id" | "createdAt">): Promise<Session> {
    const result = await this.db.insert(sessions).values({
      userId: session.userId,
      expiresAt: new Date(session.expiresAt),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getSession(id: string): Promise<Session | undefined> {
    const result = await this.db.select().from(sessions).where(
      and(
        eq(sessions.id, id),
        gte(sessions.expiresAt, new Date())
      )
    ).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await this.db.delete(sessions).where(eq(sessions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.db.delete(sessions).where(
      sql`${sessions.expiresAt} < NOW()`
    );
    return result.rowCount || 0;
  }

  // Subscription plans
  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const result = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
    return result[0] as SubscriptionPlan | undefined;
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const result = await this.db.select().from(subscriptionPlans);
    return result as SubscriptionPlan[];
  }

  async createSubscriptionPlan(plan: SubscriptionPlan): Promise<SubscriptionPlan> {
    const result = await this.db.insert(subscriptionPlans).values(plan).returning();
    return result[0] as SubscriptionPlan;
  }

  // User subscriptions
  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const validStatuses: SubscriptionStatus[] = ["active", "past_due"];
    const result = await this.db.select().from(userSubscriptions).where(
      and(
        eq(userSubscriptions.userId, userId),
        or(
          eq(userSubscriptions.status, validStatuses[0]),
          eq(userSubscriptions.status, validStatuses[1])
        )
      )
    ).orderBy(sql`${userSubscriptions.createdAt} DESC`).limit(1);
    
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    const result = await this.db.select().from(userSubscriptions).where(
      eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId)
    ).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async createUserSubscription(subscription: Omit<UserSubscription, "id" | "createdAt" | "updatedAt">): Promise<UserSubscription> {
    const result = await this.db.insert(userSubscriptions).values({
      userId: subscription.userId,
      planId: subscription.planId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.currentPeriodStart),
      currentPeriodEnd: new Date(subscription.currentPeriodEnd),
      cancelAt: subscription.cancelAt ? new Date(subscription.cancelAt) : null,
      canceledAt: subscription.canceledAt ? new Date(subscription.canceledAt) : null,
      trialEnd: subscription.trialEnd ? new Date(subscription.trialEnd) : null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const updateData: any = { ...updates };
    
    // Convert date strings to Date objects for timestamp fields
    if (updates.currentPeriodStart) {
      updateData.currentPeriodStart = new Date(updates.currentPeriodStart);
    }
    if (updates.currentPeriodEnd) {
      updateData.currentPeriodEnd = new Date(updates.currentPeriodEnd);
    }
    if (updates.cancelAt) {
      updateData.cancelAt = new Date(updates.cancelAt);
    }
    if (updates.canceledAt) {
      updateData.canceledAt = new Date(updates.canceledAt);
    }
    if (updates.trialEnd) {
      updateData.trialEnd = new Date(updates.trialEnd);
    }
    
    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();
    
    const result = await this.db.update(userSubscriptions).set(updateData).where(eq(userSubscriptions.id, id)).returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getAllSubscriptions(): Promise<UserSubscription[]> {
    const result = await this.db.select().from(userSubscriptions);
    return result.map(s => this.convertTimestamps(s));
  }

  async getActiveSubscriptions(): Promise<UserSubscription[]> {
    const result = await this.db.select().from(userSubscriptions).where(
      eq(userSubscriptions.status, "active")
    );
    return result.map(s => this.convertTimestamps(s));
  }

  // Subscription events
  async createSubscriptionEvent(event: Omit<SubscriptionEvent, "id">): Promise<SubscriptionEvent> {
    const result = await this.db.insert(subscriptionEvents).values({
      userSubscriptionId: event.userSubscriptionId,
      type: event.type,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getSubscriptionEvents(subscriptionId: string): Promise<SubscriptionEvent[]> {
    const result = await this.db.select().from(subscriptionEvents).where(
      eq(subscriptionEvents.userSubscriptionId, subscriptionId)
    ).orderBy(sql`${subscriptionEvents.occurredAt} DESC`);
    return result.map(e => this.convertTimestamps(e));
  }

  // Analytics & Metrics
  async createUsageMetric(metric: Omit<UsageMetric, "id">): Promise<UsageMetric> {
    const result = await this.db.insert(usageMetrics).values({
      userId: metric.userId,
      metricType: metric.metricType,
      value: metric.value,
      metadata: metric.metadata,
      recordedAt: new Date(metric.recordedAt),
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    // Get total users
    const totalUsersResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get active subscribers
    const activeSubsResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(userSubscriptions).where(
      eq(userSubscriptions.status, "active")
    );
    const activeSubscribers = activeSubsResult[0]?.count || 0;

    // Get free users
    const freeUsersResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(users).where(
      eq(users.role, "free")
    );
    const freeUsers = freeUsersResult[0]?.count || 0;

    // Calculate monthly recurring revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const mrrResult = await this.db.select({
      revenue: sql<number>`
        COALESCE(SUM(
          CASE 
            WHEN ${subscriptionPlans.interval} = 'month' THEN ${subscriptionPlans.priceCents}
            WHEN ${subscriptionPlans.interval} = 'year' THEN ${subscriptionPlans.priceCents} / 12
            ELSE 0
          END
        )::int, 0)
      `
    }).from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.status, "active"));
    
    const monthlyRecurringRevenue = mrrResult[0]?.revenue || 0;

    // Get new signups this month
    const newSignupsResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(users).where(
      gte(users.createdAt, startOfMonth)
    );
    const newSignupsThisMonth = newSignupsResult[0]?.count || 0;

    // Get cancellations this month
    const cancellationsResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(userSubscriptions).where(
      and(
        sql`${userSubscriptions.canceledAt} IS NOT NULL`,
        gte(userSubscriptions.canceledAt, startOfMonth)
      )
    );
    const cancellationsThisMonth = cancellationsResult[0]?.count || 0;

    // Calculate churn rate
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthSubsResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(userSubscriptions).where(
      and(
        gte(userSubscriptions.createdAt, previousMonthStart),
        sql`${userSubscriptions.createdAt} < ${startOfMonth}`
      )
    );
    const previousMonthSubs = previousMonthSubsResult[0]?.count || 0;
    const churnRate = previousMonthSubs > 0 ? (cancellationsThisMonth / previousMonthSubs) * 100 : null;

    // Get total scripts generated
    const totalScriptsResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(scripts);
    const totalScriptsGenerated = totalScriptsResult[0]?.count || 0;

    // Get top tasks (most frequently used task categories and names)
    const topTasksResult = await this.db.select({
      taskName: scripts.taskName,
      taskCategory: scripts.taskCategory,
      count: sql<number>`count(*)::int`,
    }).from(scripts)
      .where(sql`${scripts.taskName} IS NOT NULL AND ${scripts.taskCategory} IS NOT NULL`)
      .groupBy(scripts.taskName, scripts.taskCategory)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    const topTasks = topTasksResult.map(task => ({
      taskName: task.taskName || 'Unknown',
      taskCategory: task.taskCategory || 'Unknown',
      count: task.count,
    }));

    // Get referral sources with counts and percentages
    const referralSourcesResult = await this.db.select({
      source: sql<string>`COALESCE(${users.referralSource}, 'direct')`,
      count: sql<number>`count(*)::int`,
    }).from(users)
      .groupBy(sql`COALESCE(${users.referralSource}, 'direct')`)
      .orderBy(sql`count(*) DESC`);

    const referralSources = referralSourcesResult.map(ref => ({
      source: ref.source,
      count: ref.count,
      percentage: totalUsers > 0 ? (ref.count / totalUsers) * 100 : 0,
    }));

    return {
      totalUsers,
      activeSubscribers,
      freeUsers,
      monthlyRecurringRevenue,
      totalRevenue: monthlyRecurringRevenue,
      churnRate,
      newSignupsThisMonth,
      cancellationsThisMonth,
      totalScriptsGenerated,
      topTasks,
      referralSources,
    };
  }

  async getUserMetrics(userId: string, metricType?: string): Promise<UsageMetric[]> {
    let query = this.db.select().from(usageMetrics).where(eq(usageMetrics.userId, userId));
    
    if (metricType) {
      query = this.db.select().from(usageMetrics).where(
        and(
          eq(usageMetrics.userId, userId),
          eq(usageMetrics.metricType, metricType)
        )
      );
    }
    
    const result = await query.orderBy(sql`${usageMetrics.recordedAt} DESC`);
    return result.map(m => this.convertTimestamps(m));
  }

  // Platform Notifications
  async getNotification(id: string): Promise<PlatformNotification | undefined> {
    const result = await this.db.select().from(platformNotifications).where(
      eq(platformNotifications.id, id)
    ).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getAllNotifications(): Promise<PlatformNotification[]> {
    const result = await this.db.select().from(platformNotifications).orderBy(
      sql`${platformNotifications.createdAt} DESC`
    );
    return result.map(n => this.convertTimestamps(n));
  }

  async getActiveNotification(): Promise<PlatformNotification | undefined> {
    const result = await this.db.select().from(platformNotifications).where(
      eq(platformNotifications.enabled, true)
    ).orderBy(sql`${platformNotifications.createdAt} DESC`).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async createNotification(notification: InsertPlatformNotification): Promise<PlatformNotification> {
    const result = await this.db.insert(platformNotifications).values(notification).returning();
    return this.convertTimestamps(result[0]);
  }

  async updateNotification(id: string, updates: Partial<PlatformNotification>): Promise<PlatformNotification | undefined> {
    const { id: _, createdAt: __, ...filtered } = updates;
    const updateData = { ...filtered, updatedAt: new Date() };
    const result = await this.db.update(platformNotifications).set(updateData).where(
      eq(platformNotifications.id, id)
    ).returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await this.db.delete(platformNotifications).where(
      eq(platformNotifications.id, id)
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Password Reset Tokens
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const result = await this.db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await this.db.select().from(passwordResetTokens).where(
      and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gte(passwordResetTokens.expiresAt, new Date())
      )
    ).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async markTokenAsUsed(token: string): Promise<boolean> {
    const result = await this.db.update(passwordResetTokens).set({ used: true }).where(
      eq(passwordResetTokens.token, token)
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteExpiredResetTokens(): Promise<number> {
    const result = await this.db.delete(passwordResetTokens).where(
      or(
        eq(passwordResetTokens.used, true),
        sql`${passwordResetTokens.expiresAt} < NOW()`
      )
    );
    return result.rowCount || 0;
  }

  // Welcome Email Templates
  async getWelcomeEmailTemplate(type: string): Promise<WelcomeEmailTemplate | undefined> {
    const result = await this.db.select().from(welcomeEmailTemplates).where(eq(welcomeEmailTemplates.type, type)).limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getAllWelcomeEmailTemplates(): Promise<WelcomeEmailTemplate[]> {
    const result = await this.db.select().from(welcomeEmailTemplates);
    return result.map(t => this.convertTimestamps(t));
  }

  async createWelcomeEmailTemplate(template: InsertWelcomeEmailTemplate): Promise<WelcomeEmailTemplate> {
    const result = await this.db.insert(welcomeEmailTemplates).values({
      type: template.type,
      subject: template.subject,
      htmlContent: template.htmlContent,
      enabled: template.enabled,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async updateWelcomeEmailTemplate(id: string, updates: UpdateWelcomeEmailTemplate): Promise<WelcomeEmailTemplate | undefined> {
    const result = await this.db.update(welcomeEmailTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(welcomeEmailTemplates.id, id))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async deleteWelcomeEmailTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(welcomeEmailTemplates).where(eq(welcomeEmailTemplates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
