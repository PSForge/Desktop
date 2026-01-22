import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, and, or, gte, sql, desc, inArray } from "drizzle-orm";
import {
  users,
  sessions,
  scripts,
  tags,
  scriptTags,
  subscriptionPlans,
  userSubscriptions,
  subscriptionEvents,
  usageMetrics,
  platformNotifications,
  passwordResetTokens,
  welcomeEmailTemplates,
  webhookEvents,
  gitRepositories,
  gitCommits,
  templateCategories,
  templates,
  templateRatings,
  templateInstalls,
  templatePurchases,
  sellerPayouts,
  userMilestones,
  nudgeDismissals,
  appleTransactions,
  appleNotificationEvents,
  type User,
  type Session,
  type Script,
  type InsertScript,
  type Tag,
  type InsertTag,
  type ScriptTag,
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
  type GitRepository,
  type GitCommit,
  type InsertGitRepository,
  type InsertGitCommit,
  type TemplateCategory,
  type Template,
  type TemplateRating,
  type TemplateInstall,
  type TemplatePurchase,
  type InsertTemplatePurchase,
  type SellerPayout,
  type InsertSellerPayout,
  type InsertTemplateCategory,
  type InsertTemplate,
  type InsertTemplateRating,
  type InsertTemplateInstall,
  type UserMilestone,
  type InsertUserMilestone,
  type UserStats,
  type NudgeType,
  type CommunityBadge,
  type AppleTransaction,
  type InsertAppleTransaction,
  type AppleNotificationEvent,
  type InsertAppleNotificationEvent,
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
      taskCategory: script.taskCategory || null,
      taskName: script.taskName || null,
      documentation: script.documentation || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async updateScript(id: string, updates: Partial<InsertScript>): Promise<Script | undefined> {
    // Filter out undefined values to prevent setting required fields to null
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(cleanedUpdates).length === 0) {
      return this.getScript(id);
    }
    
    const result = await this.db.update(scripts).set(cleanedUpdates).where(eq(scripts.id, id)).returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async deleteScript(id: string): Promise<boolean> {
    const result = await this.db.delete(scripts).where(eq(scripts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async toggleScriptFavorite(id: string, userId: string): Promise<Script | undefined> {
    const script = await this.getScript(id);
    if (!script || script.userId !== userId) {
      return undefined;
    }
    const result = await this.db.update(scripts)
      .set({ isFavorite: !script.isFavorite })
      .where(eq(scripts.id, id))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async updateScriptLastAccessed(id: string): Promise<void> {
    await this.db.update(scripts)
      .set({ lastAccessed: new Date() })
      .where(eq(scripts.id, id));
  }

  async getFavoriteScripts(userId: string): Promise<Script[]> {
    const result = await this.db.select()
      .from(scripts)
      .where(and(eq(scripts.userId, userId), eq(scripts.isFavorite, true)))
      .orderBy(desc(scripts.createdAt));
    return result.map(s => this.convertTimestamps(s));
  }

  async getRecentScripts(userId: string, limit: number = 10): Promise<Script[]> {
    const result = await this.db.select()
      .from(scripts)
      .where(eq(scripts.userId, userId))
      .orderBy(desc(scripts.lastAccessed))
      .limit(limit);
    return result.map(s => this.convertTimestamps(s));
  }

  // Tag management
  async createTag(tag: InsertTag): Promise<Tag> {
    const result = await this.db.insert(tags).values({
      userId: tag.userId!,
      name: tag.name,
      color: tag.color || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getUserTags(userId: string): Promise<Tag[]> {
    const result = await this.db.select()
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(tags.name);
    return result.map(t => this.convertTimestamps(t));
  }

  async deleteTag(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async addTagToScript(scriptId: string, tagId: string): Promise<ScriptTag> {
    try {
      const result = await this.db.insert(scriptTags).values({
        scriptId,
        tagId,
      }).returning();
      return this.convertTimestamps(result[0]);
    } catch (error: any) {
      // Handle duplicate key violation (unique constraint)
      if (error.code === '23505') {
        // Find and return existing relationship
        const existing = await this.db.select().from(scriptTags)
          .where(and(eq(scriptTags.scriptId, scriptId), eq(scriptTags.tagId, tagId)))
          .limit(1);
        if (existing[0]) {
          return this.convertTimestamps(existing[0]);
        }
      }
      throw error;
    }
  }

  async removeTagFromScript(scriptId: string, tagId: string): Promise<boolean> {
    const result = await this.db.delete(scriptTags)
      .where(and(eq(scriptTags.scriptId, scriptId), eq(scriptTags.tagId, tagId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getScriptTags(scriptId: string): Promise<Tag[]> {
    const result = await this.db.select({
      id: tags.id,
      userId: tags.userId,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
    })
    .from(scriptTags)
    .innerJoin(tags, eq(scriptTags.tagId, tags.id))
    .where(eq(scriptTags.scriptId, scriptId));
    return result.map(t => this.convertTimestamps(t));
  }

  async getScriptsByTag(tagId: string, userId: string): Promise<Script[]> {
    const result = await this.db.select({
      id: scripts.id,
      userId: scripts.userId,
      name: scripts.name,
      description: scripts.description,
      content: scripts.content,
      commands: scripts.commands,
      taskCategory: scripts.taskCategory,
      taskName: scripts.taskName,
      isFavorite: scripts.isFavorite,
      lastAccessed: scripts.lastAccessed,
      documentation: scripts.documentation,
      createdAt: scripts.createdAt,
    })
    .from(scriptTags)
    .innerJoin(scripts, eq(scriptTags.scriptId, scripts.id))
    .where(and(eq(scriptTags.tagId, tagId), eq(scripts.userId, userId)));
    return result.map(s => this.convertTimestamps(s));
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
    
    // Convert date strings to Date objects for timestamp fields
    const dbUpdates: any = { ...updateData };
    if (updateData.lastLoginAt) {
      dbUpdates.lastLoginAt = updateData.lastLoginAt instanceof Date 
        ? updateData.lastLoginAt 
        : new Date(updateData.lastLoginAt);
    }
    
    const result = await this.db.update(users).set(dbUpdates).where(eq(users.id, id)).returning();
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

    // Get active subscribers (users with subscriber role - source of truth for access)
    const activeSubsResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(users).where(
      eq(users.role, "subscriber")
    );
    const activeSubscribers = activeSubsResult[0]?.count || 0;

    // Get free users
    const freeUsersResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(users).where(
      eq(users.role, "free")
    );
    const freeUsers = freeUsersResult[0]?.count || 0;

    // Calculate monthly recurring revenue
    // Based on users with subscriber role (source of truth for active subscriptions)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get the Pro plan price from subscription_plans table
    const proPlanResult = await this.db.select({
      priceCents: subscriptionPlans.priceCents,
      interval: subscriptionPlans.interval
    }).from(subscriptionPlans).where(eq(subscriptionPlans.id, "premium")).limit(1);
    
    const proPlanPrice = proPlanResult[0]?.priceCents || 500; // Default to 500 if not found
    const proPlanInterval = proPlanResult[0]?.interval || 'month';
    
    // Calculate MRR (convert yearly to monthly if needed)
    const monthlyPrice = proPlanInterval === 'year' ? proPlanPrice / 12 : proPlanPrice;
    const monthlyRecurringRevenue = activeSubscribers * monthlyPrice;

    // Get new signups this month
    const newSignupsResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(users).where(
      gte(users.createdAt, startOfMonth)
    );
    const newSignupsThisMonth = newSignupsResult[0]?.count || 0;

    // Get cancellations this month (users who downgraded from subscriber to free)
    // Since we don't track role change history, we'll use subscription cancellations as a proxy
    const cancellationsResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(userSubscriptions).where(
      and(
        sql`${userSubscriptions.canceledAt} IS NOT NULL`,
        gte(userSubscriptions.canceledAt, startOfMonth)
      )
    );
    const cancellationsThisMonth = cancellationsResult[0]?.count || 0;

    // Calculate churn rate based on current active subscribers
    // Churn = (cancellations this month / total active subscribers at start of month) * 100
    // Since we don't have historical data, we'll calculate based on current state
    const churnRate = activeSubscribers > 0 ? (cancellationsThisMonth / (activeSubscribers + cancellationsThisMonth)) * 100 : null;

    // Get total scripts generated (from usage metrics tracking)
    const totalScriptsGeneratedResult = await this.db.select({ count: sql<number>`count(*)::int` })
      .from(usageMetrics)
      .where(eq(usageMetrics.metricType, 'script_generated'));
    const totalScriptsGenerated = totalScriptsGeneratedResult[0]?.count || 0;

    // Get total scripts saved (from scripts table)
    const totalScriptsSavedResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(scripts);
    const totalScriptsSaved = totalScriptsSavedResult[0]?.count || 0;

    // Get top tasks from usage metrics (most frequently generated tasks)
    const topTasksResult = await this.db.select({
      taskName: sql<string>`${usageMetrics.metadata}->>'taskName'`,
      taskCategory: sql<string>`${usageMetrics.metadata}->>'taskCategory'`,
      count: sql<number>`count(*)::int`,
    }).from(usageMetrics)
      .where(
        and(
          eq(usageMetrics.metricType, 'script_generated'),
          sql`${usageMetrics.metadata}->>'taskName' IS NOT NULL`,
          sql`${usageMetrics.metadata}->>'taskCategory' IS NOT NULL`
        )
      )
      .groupBy(
        sql`${usageMetrics.metadata}->>'taskName'`,
        sql`${usageMetrics.metadata}->>'taskCategory'`
      )
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
      totalScriptsSaved,
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

  // Webhook Events
  async createWebhookEvent(event: Omit<import("@shared/schema").WebhookEvent, "id" | "createdAt">): Promise<import("@shared/schema").WebhookEvent> {
    const result = await this.db.insert(webhookEvents).values({
      eventType: event.eventType,
      eventId: event.eventId,
      status: event.status,
      userId: event.userId,
      subscriptionId: event.subscriptionId,
      payload: event.payload,
      errorMessage: event.errorMessage,
      processingTimeMs: event.processingTimeMs,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getRecentWebhookEvents(limit: number = 50): Promise<import("@shared/schema").WebhookEvent[]> {
    const result = await this.db.select().from(webhookEvents)
      .orderBy(sql`${webhookEvents.createdAt} DESC`)
      .limit(limit);
    return result.map(e => this.convertTimestamps(e));
  }

  async getWebhookEventsByType(eventType: string, limit: number = 50): Promise<import("@shared/schema").WebhookEvent[]> {
    const result = await this.db.select().from(webhookEvents)
      .where(eq(webhookEvents.eventType, eventType))
      .orderBy(sql`${webhookEvents.createdAt} DESC`)
      .limit(limit);
    return result.map(e => this.convertTimestamps(e));
  }

  // Git Repository Management
  async createGitRepository(repository: InsertGitRepository): Promise<GitRepository> {
    const result = await this.db.insert(gitRepositories).values({
      userId: repository.userId!,
      provider: repository.provider,
      repoOwner: repository.repoOwner,
      repoName: repository.repoName,
      defaultBranch: repository.defaultBranch,
      currentBranch: repository.currentBranch || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getUserGitRepositories(userId: string): Promise<GitRepository[]> {
    const result = await this.db.select().from(gitRepositories)
      .where(eq(gitRepositories.userId, userId))
      .orderBy(desc(gitRepositories.createdAt));
    return result.map(r => this.convertTimestamps(r));
  }

  async getGitRepository(id: string): Promise<GitRepository | undefined> {
    const result = await this.db.select().from(gitRepositories)
      .where(eq(gitRepositories.id, id))
      .limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async updateGitRepository(id: string, updates: Partial<GitRepository>): Promise<GitRepository | undefined> {
    const result = await this.db.update(gitRepositories)
      .set({
        ...updates,
        lastSyncedAt: updates.lastSyncedAt ? new Date(updates.lastSyncedAt) : undefined,
      })
      .where(eq(gitRepositories.id, id))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async deleteGitRepository(id: string): Promise<boolean> {
    const result = await this.db.delete(gitRepositories).where(eq(gitRepositories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Git Commits
  async createGitCommit(commit: InsertGitCommit): Promise<GitCommit> {
    const result = await this.db.insert(gitCommits).values({
      repositoryId: commit.repositoryId,
      scriptId: commit.scriptId || null,
      commitSha: commit.commitSha,
      message: commit.message,
      branch: commit.branch,
      author: commit.author || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getRepositoryCommits(repositoryId: string, limit: number = 20): Promise<GitCommit[]> {
    const result = await this.db.select().from(gitCommits)
      .where(eq(gitCommits.repositoryId, repositoryId))
      .orderBy(desc(gitCommits.createdAt))
      .limit(limit);
    return result.map(c => this.convertTimestamps(c));
  }

  async getScriptCommits(scriptId: string): Promise<GitCommit[]> {
    const result = await this.db.select().from(gitCommits)
      .where(eq(gitCommits.scriptId, scriptId))
      .orderBy(desc(gitCommits.createdAt));
    return result.map(c => this.convertTimestamps(c));
  }

  // Template Categories
  async createTemplateCategory(category: InsertTemplateCategory): Promise<TemplateCategory> {
    const result = await this.db.insert(templateCategories).values({
      name: category.name,
      description: category.description || null,
      icon: category.icon || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getAllTemplateCategories(): Promise<TemplateCategory[]> {
    const result = await this.db.select().from(templateCategories)
      .orderBy(templateCategories.name);
    return result.map(c => this.convertTimestamps(c));
  }

  async getTemplateCategory(id: string): Promise<TemplateCategory | undefined> {
    const result = await this.db.select().from(templateCategories)
      .where(eq(templateCategories.id, id))
      .limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  // Templates
  async createTemplate(template: InsertTemplate): Promise<Template> {
    const result = await this.db.insert(templates).values({
      authorId: template.authorId,
      sourceScriptId: template.sourceScriptId || null,
      title: template.title,
      description: template.description,
      content: template.content,
      categoryId: template.categoryId || null,
      tags: template.tags || [],
      status: template.status || "pending",
      featured: template.featured || false,
      version: template.version || "1.0.0",
      securityScore: template.securityScore || null,
      securityLevel: template.securityLevel || null,
      securityWarningsCount: template.securityWarningsCount || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getAllTemplates(filters?: {status?: string; categoryId?: string; featured?: boolean}): Promise<Template[]> {
    let query = this.db.select().from(templates);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(templates.status, filters.status));
    }
    if (filters?.categoryId) {
      conditions.push(eq(templates.categoryId, filters.categoryId));
    }
    if (filters?.featured !== undefined) {
      conditions.push(eq(templates.featured, filters.featured));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query.orderBy(desc(templates.createdAt));
    return result.map(t => this.convertTimestamps(t));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const result = await this.db.select().from(templates)
      .where(eq(templates.id, id))
      .limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getUserTemplates(userId: string): Promise<Template[]> {
    const result = await this.db.select().from(templates)
      .where(eq(templates.authorId, userId))
      .orderBy(desc(templates.createdAt));
    return result.map(t => this.convertTimestamps(t));
  }

  async getUserTemplateStats(userId: string): Promise<{totalTemplates: number; totalDownloads: number; totalInstalls: number; avgRating: number}> {
    const result = await this.db.select({
      totalTemplates: sql<number>`count(*)::int`,
      totalDownloads: sql<number>`coalesce(sum(${templates.downloads}), 0)::int`,
      totalInstalls: sql<number>`coalesce(sum(${templates.installs}), 0)::int`,
      avgRating: sql<number>`coalesce(avg(${templates.averageRating}), 0)::int`,
    })
    .from(templates)
    .where(eq(templates.authorId, userId));

    const stats = result[0];
    return {
      totalTemplates: stats?.totalTemplates || 0,
      totalDownloads: stats?.totalDownloads || 0,
      totalInstalls: stats?.totalInstalls || 0,
      avgRating: stats?.avgRating || 0,
    };
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const updateData: any = { ...updates };
    
    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.authorId;
    
    const result = await this.db.update(templates)
      .set(updateData)
      .where(eq(templates.id, id))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(templates).where(eq(templates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async incrementTemplateDownloads(id: string): Promise<void> {
    await this.db.update(templates)
      .set({ downloads: sql`${templates.downloads} + 1` })
      .where(eq(templates.id, id));
  }

  async incrementTemplateInstalls(id: string): Promise<void> {
    await this.db.update(templates)
      .set({ installs: sql`${templates.installs} + 1` })
      .where(eq(templates.id, id));
  }

  // Template Ratings
  async createTemplateRating(rating: InsertTemplateRating): Promise<TemplateRating> {
    try {
      const result = await this.db.insert(templateRatings).values({
        templateId: rating.templateId,
        userId: rating.userId,
        rating: rating.rating,
        review: rating.review || null,
      }).returning();
      return this.convertTimestamps(result[0]);
    } catch (error: any) {
      // Handle duplicate key violation (unique constraint on userId + templateId)
      if (error.code === '23505') {
        // Find and return existing rating
        const existing = await this.db.select().from(templateRatings)
          .where(and(
            eq(templateRatings.templateId, rating.templateId),
            eq(templateRatings.userId, rating.userId)
          ))
          .limit(1);
        if (existing[0]) {
          return this.convertTimestamps(existing[0]);
        }
      }
      throw error;
    }
  }

  async getTemplateRatings(templateId: string): Promise<TemplateRating[]> {
    const result = await this.db.select().from(templateRatings)
      .where(eq(templateRatings.templateId, templateId))
      .orderBy(desc(templateRatings.createdAt));
    return result.map(r => this.convertTimestamps(r));
  }

  async getUserTemplateRating(templateId: string, userId: string): Promise<TemplateRating | undefined> {
    const result = await this.db.select().from(templateRatings)
      .where(and(
        eq(templateRatings.templateId, templateId),
        eq(templateRatings.userId, userId)
      ))
      .limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async updateTemplateRating(id: string, updates: Partial<TemplateRating>): Promise<TemplateRating | undefined> {
    const updateData: any = { ...updates };
    
    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.templateId;
    delete updateData.userId;
    
    const result = await this.db.update(templateRatings)
      .set(updateData)
      .where(eq(templateRatings.id, id))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async updateTemplateAverageRating(templateId: string): Promise<void> {
    // Get all ratings for this template
    const ratings = await this.db.select({ rating: templateRatings.rating })
      .from(templateRatings)
      .where(eq(templateRatings.templateId, templateId));
    
    if (ratings.length === 0) {
      // No ratings, set to 0
      await this.db.update(templates)
        .set({
          averageRating: 0,
          totalRatings: 0,
        })
        .where(eq(templates.id, templateId));
      return;
    }
    
    // Calculate average
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = Math.round(sum / ratings.length);
    
    await this.db.update(templates)
      .set({
        averageRating: average,
        totalRatings: ratings.length,
      })
      .where(eq(templates.id, templateId));
  }

  // Template Installs
  async createTemplateInstall(install: InsertTemplateInstall): Promise<TemplateInstall> {
    const result = await this.db.insert(templateInstalls).values({
      templateId: install.templateId,
      userId: install.userId,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getTemplateInstalls(templateId: string): Promise<TemplateInstall[]> {
    const result = await this.db.select().from(templateInstalls)
      .where(eq(templateInstalls.templateId, templateId))
      .orderBy(desc(templateInstalls.installedAt));
    return result.map(i => this.convertTimestamps(i));
  }

  async hasUserInstalledTemplate(templateId: string, userId: string): Promise<boolean> {
    const result = await this.db.select({ id: templateInstalls.id })
      .from(templateInstalls)
      .where(and(
        eq(templateInstalls.templateId, templateId),
        eq(templateInstalls.userId, userId)
      ))
      .limit(1);
    return result.length > 0;
  }

  // User Stats & Pro Conversion Tracking
  private readonly HOURLY_RATE = 40; // Average IT hourly rate for ROI calculations
  private readonly TIME_SAVED_PER_SCRIPT_FREE = 60; // Minutes saved per script (free user)
  private readonly TIME_SAVED_PER_SCRIPT_PRO = 180; // Minutes saved per script (Pro user with AI)

  async getUserStats(userId: string): Promise<UserStats> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const milestones = await this.getUserMilestones(userId);
    
    const totalScriptsCreated = (user as any).totalScriptsCreated || 0;
    const totalTimeSavedMinutes = (user as any).totalTimeSavedMinutes || 0;
    const totalTimeSavedHours = Math.round(totalTimeSavedMinutes / 60 * 10) / 10;
    const totalValueCreated = Math.round((totalTimeSavedMinutes / 60) * this.HOURLY_RATE);
    
    const potentialTimeSavedWithPro = totalScriptsCreated * this.TIME_SAVED_PER_SCRIPT_PRO;
    const potentialValueWithPro = Math.round((potentialTimeSavedWithPro / 60) * this.HOURLY_RATE);
    const roiMultiplier = potentialValueWithPro > 0 ? Math.round(potentialValueWithPro / 5) : 0;

    let currentTier: "new_user" | "regular_user" | "power_user" = "new_user";
    if (totalScriptsCreated >= 21) {
      currentTier = "power_user";
    } else if (totalScriptsCreated >= 6) {
      currentTier = "regular_user";
    }

    return {
      totalScriptsCreated,
      totalTimeSavedMinutes,
      totalTimeSavedHours,
      totalValueCreated,
      potentialValueWithPro,
      roiMultiplier,
      daysActive: (user as any).daysActive || 0,
      communityBadge: ((user as any).communityBadge as CommunityBadge) || null,
      firstScriptDate: (user as any).firstScriptDate 
        ? ((user as any).firstScriptDate instanceof Date 
          ? (user as any).firstScriptDate.toISOString() 
          : String((user as any).firstScriptDate)) 
        : null,
      milestones: milestones.map(m => ({
        id: m.id,
        userId: m.userId,
        milestoneType: m.milestoneType as any,
        milestoneValue: m.milestoneValue,
        achievedAt: m.achievedAt,
        notificationSent: m.notificationSent,
        dismissed: m.dismissed,
      })),
      currentTier,
    };
  }

  async incrementUserScriptCount(userId: string, timeSavedMinutes: number = 60): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const currentScripts = (user as any).totalScriptsCreated || 0;
    const currentTimeSaved = (user as any).totalTimeSavedMinutes || 0;
    const newScriptCount = currentScripts + 1;
    const newTimeSaved = currentTimeSaved + timeSavedMinutes;

    await this.db.update(users)
      .set({
        totalScriptsCreated: newScriptCount,
        totalTimeSavedMinutes: newTimeSaved,
        firstScriptDate: (user as any).firstScriptDate || new Date(),
      })
      .where(eq(users.id, userId));

    // Check for milestones
    const milestoneThresholds = [5, 10, 25, 50];
    for (const threshold of milestoneThresholds) {
      if (newScriptCount === threshold) {
        const existingMilestone = await this.db.select()
          .from(userMilestones)
          .where(and(
            eq(userMilestones.userId, userId),
            eq(userMilestones.milestoneType, `scripts_created_${threshold}`)
          ))
          .limit(1);
        
        if (existingMilestone.length === 0) {
          await this.createUserMilestone({
            userId,
            milestoneType: `scripts_created_${threshold}` as any,
            milestoneValue: threshold,
          });
        }
      }
    }

    // Check for time-saved milestones (5, 10, 20 hours)
    const timeMilestones = [
      { hours: 5, type: "time_saved_5_hours" },
      { hours: 10, type: "time_saved_10_hours" },
      { hours: 20, type: "time_saved_20_hours" },
    ];
    
    for (const milestone of timeMilestones) {
      const thresholdMinutes = milestone.hours * 60;
      if (currentTimeSaved < thresholdMinutes && newTimeSaved >= thresholdMinutes) {
        const existingMilestone = await this.db.select()
          .from(userMilestones)
          .where(and(
            eq(userMilestones.userId, userId),
            eq(userMilestones.milestoneType, milestone.type)
          ))
          .limit(1);
        
        if (existingMilestone.length === 0) {
          await this.createUserMilestone({
            userId,
            milestoneType: milestone.type as any,
            milestoneValue: milestone.hours,
          });
        }
      }
    }

    // Update community badge based on script count
    let newBadge: string | null = null;
    if (newScriptCount >= 20) {
      newBadge = "top_contributor";
    } else if (newScriptCount >= 5) {
      newBadge = "active_contributor";
    } else if (newScriptCount >= 1) {
      newBadge = "new_member";
    }

    if (newBadge && newBadge !== (user as any).communityBadge) {
      await this.db.update(users)
        .set({ communityBadge: newBadge })
        .where(eq(users.id, userId));
    }
  }

  async adjustUserStats(userId: string, scriptsCreated: number, timeSavedMinutes: number, firstScriptDate?: Date): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    let badge: string | null = null;
    if (scriptsCreated >= 20) {
      badge = "top_contributor";
    } else if (scriptsCreated >= 5) {
      badge = "active_contributor";
    } else if (scriptsCreated >= 1) {
      badge = "new_member";
    }

    await this.db.update(users)
      .set({
        totalScriptsCreated: scriptsCreated,
        totalTimeSavedMinutes: timeSavedMinutes,
        firstScriptDate: firstScriptDate || (user as any).firstScriptDate || new Date(),
        communityBadge: badge,
      })
      .where(eq(users.id, userId));

    const milestoneThresholds = [5, 10, 25, 50];
    for (const threshold of milestoneThresholds) {
      if (scriptsCreated >= threshold) {
        const existingMilestone = await this.db.select()
          .from(userMilestones)
          .where(and(
            eq(userMilestones.userId, userId),
            eq(userMilestones.milestoneType, `scripts_created_${threshold}`)
          ))
          .limit(1);
        
        if (existingMilestone.length === 0) {
          await this.createUserMilestone({
            userId,
            milestoneType: `scripts_created_${threshold}` as any,
            milestoneValue: threshold,
          });
        }
      }
    }

    const timeMilestones = [
      { hours: 5, type: "time_saved_5_hours" },
      { hours: 10, type: "time_saved_10_hours" },
      { hours: 20, type: "time_saved_20_hours" },
    ];
    
    for (const milestone of timeMilestones) {
      const thresholdMinutes = milestone.hours * 60;
      if (timeSavedMinutes >= thresholdMinutes) {
        const existingMilestone = await this.db.select()
          .from(userMilestones)
          .where(and(
            eq(userMilestones.userId, userId),
            eq(userMilestones.milestoneType, milestone.type)
          ))
          .limit(1);
        
        if (existingMilestone.length === 0) {
          await this.createUserMilestone({
            userId,
            milestoneType: milestone.type as any,
            milestoneValue: milestone.hours,
          });
        }
      }
    }
  }

  async updateUserActivity(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = (user as any).lastActiveDate;
    
    if (!lastActive || new Date(lastActive).getTime() < today.getTime()) {
      const currentDaysActive = (user as any).daysActive || 0;
      await this.db.update(users)
        .set({
          daysActive: currentDaysActive + 1,
          lastActiveDate: new Date(),
        })
        .where(eq(users.id, userId));

      // Check for active day milestones
      const newDaysActive = currentDaysActive + 1;
      if (newDaysActive === 7) {
        const existing = await this.db.select()
          .from(userMilestones)
          .where(and(
            eq(userMilestones.userId, userId),
            eq(userMilestones.milestoneType, "active_7_days")
          ))
          .limit(1);
        
        if (existing.length === 0) {
          await this.createUserMilestone({
            userId,
            milestoneType: "active_7_days",
            milestoneValue: 7,
          });
        }
      } else if (newDaysActive === 30) {
        const existing = await this.db.select()
          .from(userMilestones)
          .where(and(
            eq(userMilestones.userId, userId),
            eq(userMilestones.milestoneType, "active_30_days")
          ))
          .limit(1);
        
        if (existing.length === 0) {
          await this.createUserMilestone({
            userId,
            milestoneType: "active_30_days",
            milestoneValue: 30,
          });
        }
      }
    }
  }

  // Milestones
  async getUserMilestones(userId: string): Promise<UserMilestone[]> {
    const result = await this.db.select()
      .from(userMilestones)
      .where(eq(userMilestones.userId, userId))
      .orderBy(desc(userMilestones.achievedAt));
    
    return result.map(m => ({
      id: m.id,
      userId: m.userId,
      milestoneType: m.milestoneType as any,
      milestoneValue: m.milestoneValue,
      achievedAt: m.achievedAt?.toISOString(),
      notificationSent: m.notificationSent,
      dismissed: m.dismissed,
    }));
  }

  async createUserMilestone(milestone: InsertUserMilestone): Promise<UserMilestone> {
    const [result] = await this.db.insert(userMilestones)
      .values({
        userId: milestone.userId,
        milestoneType: milestone.milestoneType,
        milestoneValue: milestone.milestoneValue,
        notificationSent: false,
        dismissed: false,
      })
      .returning();
    
    return {
      id: result.id,
      userId: result.userId,
      milestoneType: result.milestoneType as any,
      milestoneValue: result.milestoneValue,
      achievedAt: result.achievedAt?.toISOString(),
      notificationSent: result.notificationSent,
      dismissed: result.dismissed,
    };
  }

  async dismissMilestone(milestoneId: string): Promise<void> {
    await this.db.update(userMilestones)
      .set({ dismissed: true, notificationSent: true })
      .where(eq(userMilestones.id, milestoneId));
  }

  async getUnshownMilestones(userId: string): Promise<UserMilestone[]> {
    const result = await this.db.select()
      .from(userMilestones)
      .where(and(
        eq(userMilestones.userId, userId),
        eq(userMilestones.notificationSent, false),
        eq(userMilestones.dismissed, false)
      ))
      .orderBy(desc(userMilestones.achievedAt));
    
    return result.map(m => ({
      id: m.id,
      userId: m.userId,
      milestoneType: m.milestoneType as any,
      milestoneValue: m.milestoneValue,
      achievedAt: m.achievedAt?.toISOString(),
      notificationSent: m.notificationSent,
      dismissed: m.dismissed,
    }));
  }

  // Nudge Dismissals
  async dismissNudge(userId: string, nudgeType: NudgeType): Promise<void> {
    await this.db.insert(nudgeDismissals)
      .values({
        userId,
        nudgeType,
      })
      .onConflictDoNothing();
  }

  async isNudgeDismissed(userId: string, nudgeType: NudgeType): Promise<boolean> {
    const result = await this.db.select({ id: nudgeDismissals.id })
      .from(nudgeDismissals)
      .where(and(
        eq(nudgeDismissals.userId, userId),
        eq(nudgeDismissals.nudgeType, nudgeType)
      ))
      .limit(1);
    return result.length > 0;
  }

  async getUserDismissedNudges(userId: string): Promise<string[]> {
    const result = await this.db.select({ nudgeType: nudgeDismissals.nudgeType })
      .from(nudgeDismissals)
      .where(eq(nudgeDismissals.userId, userId));
    return result.map(r => r.nudgeType);
  }

  // Pro Conversion Analytics
  async getProConversionAnalytics(): Promise<{
    badgeDistribution: Array<{ badge: string; count: number }>;
    milestoneStats: Array<{ milestone: string; usersAchieved: number; usersConverted: number }>;
    conversionFunnel: {
      totalFreeUsers: number;
      usersWithMilestones: number;
      usersConverted: number;
      conversionRate: number;
    };
    topScriptCreators: Array<{ userId: string; email: string; scriptsCreated: number; timeSaved: number; badge: string | null; firstScriptDate: string | null }>;
  }> {
    // Badge Distribution - count users by community badge
    const badgeDistributionResult = await this.db.select({
      badge: users.communityBadge,
      count: sql<number>`count(*)::int`,
    })
      .from(users)
      .groupBy(users.communityBadge);
    
    const badgeDistribution = badgeDistributionResult.map(r => ({
      badge: r.badge || 'none',
      count: r.count,
    }));

    // Milestone Stats - count users who achieved each milestone and how many converted
    const milestoneStatsResult = await this.db.select({
      milestoneType: userMilestones.milestoneType,
      usersAchieved: sql<number>`count(DISTINCT ${userMilestones.userId})::int`,
    })
      .from(userMilestones)
      .groupBy(userMilestones.milestoneType);

    // For each milestone, count how many of those users are now subscribers
    const milestoneStats: Array<{ milestone: string; usersAchieved: number; usersConverted: number }> = [];
    
    for (const stat of milestoneStatsResult) {
      // Get users who achieved this milestone and are now subscribers
      const convertedResult = await this.db.select({
        count: sql<number>`count(DISTINCT ${users.id})::int`,
      })
        .from(users)
        .innerJoin(userMilestones, eq(users.id, userMilestones.userId))
        .where(and(
          eq(userMilestones.milestoneType, stat.milestoneType),
          eq(users.role, 'subscriber')
        ));
      
      milestoneStats.push({
        milestone: stat.milestoneType,
        usersAchieved: stat.usersAchieved,
        usersConverted: convertedResult[0]?.count || 0,
      });
    }

    // Conversion Funnel
    const totalFreeResult = await this.db.select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'free'));
    const totalFreeUsers = totalFreeResult[0]?.count || 0;

    const usersWithMilestonesResult = await this.db.select({
      count: sql<number>`count(DISTINCT ${userMilestones.userId})::int`,
    })
      .from(userMilestones)
      .innerJoin(users, eq(users.id, userMilestones.userId))
      .where(eq(users.role, 'free'));
    const usersWithMilestones = usersWithMilestonesResult[0]?.count || 0;

    // Count subscribers who had milestones before converting (proxy for conversion system attribution)
    const convertedWithMilestonesResult = await this.db.select({
      count: sql<number>`count(DISTINCT ${users.id})::int`,
    })
      .from(users)
      .innerJoin(userMilestones, eq(users.id, userMilestones.userId))
      .where(eq(users.role, 'subscriber'));
    const usersConverted = convertedWithMilestonesResult[0]?.count || 0;

    const conversionRate = usersWithMilestones > 0 
      ? Math.round((usersConverted / usersWithMilestones) * 100) 
      : 0;

    // Top Script Creators - users with most scripts
    const topCreatorsResult = await this.db.select({
      userId: users.id,
      email: users.email,
      scriptsCreated: users.totalScriptsCreated,
      timeSaved: users.totalTimeSavedMinutes,
      badge: users.communityBadge,
      firstScriptDate: users.firstScriptDate,
    })
      .from(users)
      .orderBy(desc(users.totalScriptsCreated))
      .limit(10);

    const topScriptCreators = topCreatorsResult.map(r => ({
      userId: r.userId,
      email: r.email,
      scriptsCreated: r.scriptsCreated,
      timeSaved: r.timeSaved,
      badge: r.badge,
      firstScriptDate: r.firstScriptDate 
        ? (r.firstScriptDate instanceof Date 
          ? r.firstScriptDate.toISOString().split('T')[0] 
          : String(r.firstScriptDate).split('T')[0]) 
        : null,
    }));

    return {
      badgeDistribution,
      milestoneStats,
      conversionFunnel: {
        totalFreeUsers,
        usersWithMilestones,
        usersConverted,
        conversionRate,
      },
      topScriptCreators,
    };
  }

  // Template Purchases for Paid Templates
  async createTemplatePurchase(purchase: InsertTemplatePurchase): Promise<TemplatePurchase> {
    const result = await this.db.insert(templatePurchases).values({
      templateId: purchase.templateId,
      buyerId: purchase.buyerId,
      sellerId: purchase.sellerId,
      priceCents: purchase.priceCents,
      platformFeeCents: purchase.platformFeeCents,
      sellerEarningsCents: purchase.sellerEarningsCents,
      stripePaymentIntentId: purchase.stripePaymentIntentId || null,
      stripeCheckoutSessionId: purchase.stripeCheckoutSessionId || null,
      status: purchase.status || 'pending',
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getTemplatePurchase(buyerId: string, templateId: string): Promise<TemplatePurchase | undefined> {
    const result = await this.db.select().from(templatePurchases)
      .where(and(
        eq(templatePurchases.buyerId, buyerId),
        eq(templatePurchases.templateId, templateId)
      ))
      .limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getTemplatePurchaseByCheckoutSession(sessionId: string): Promise<TemplatePurchase | undefined> {
    const result = await this.db.select().from(templatePurchases)
      .where(eq(templatePurchases.stripeCheckoutSessionId, sessionId))
      .limit(1);
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  async getTemplatePurchasesByBuyer(buyerId: string): Promise<TemplatePurchase[]> {
    const result = await this.db.select().from(templatePurchases)
      .where(eq(templatePurchases.buyerId, buyerId))
      .orderBy(desc(templatePurchases.purchasedAt));
    return result.map(p => this.convertTimestamps(p));
  }

  async getTemplatePurchasesBySeller(sellerId: string): Promise<TemplatePurchase[]> {
    const result = await this.db.select().from(templatePurchases)
      .where(eq(templatePurchases.sellerId, sellerId))
      .orderBy(desc(templatePurchases.purchasedAt));
    return result.map(p => this.convertTimestamps(p));
  }

  async updateTemplatePurchase(id: string, updates: Partial<TemplatePurchase>): Promise<TemplatePurchase | undefined> {
    const updateData: any = { ...updates };
    delete updateData.id;
    delete updateData.purchasedAt;
    
    const result = await this.db.update(templatePurchases)
      .set(updateData)
      .where(eq(templatePurchases.id, id))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }

  // Seller Payouts
  async createSellerPayout(payout: InsertSellerPayout): Promise<SellerPayout> {
    const result = await this.db.insert(sellerPayouts).values({
      sellerId: payout.sellerId,
      amountCents: payout.amountCents,
      stripeTransferId: payout.stripeTransferId || null,
      stripePayoutId: payout.stripePayoutId || null,
      status: payout.status || 'pending',
      failureReason: payout.failureReason || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }

  async getSellerPayouts(sellerId: string): Promise<SellerPayout[]> {
    const result = await this.db.select().from(sellerPayouts)
      .where(eq(sellerPayouts.sellerId, sellerId))
      .orderBy(desc(sellerPayouts.requestedAt));
    return result.map(p => this.convertTimestamps(p));
  }

  async updateSellerPayout(id: string, updates: Partial<SellerPayout>): Promise<SellerPayout | undefined> {
    const updateData: any = { ...updates };
    delete updateData.id;
    delete updateData.requestedAt;
    
    const result = await this.db.update(sellerPayouts)
      .set(updateData)
      .where(eq(sellerPayouts.id, id))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }
  
  // GitHub OAuth Connection
  async updateUserGitHubConnection(userId: string, data: {
    githubAccessToken: string | null;
    githubUsername: string | null;
    githubAvatarUrl: string | null;
    githubConnectedAt: Date | null;
  }): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({
        githubAccessToken: data.githubAccessToken,
        githubUsername: data.githubUsername,
        githubAvatarUrl: data.githubAvatarUrl,
        githubConnectedAt: data.githubConnectedAt,
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }
  
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }
  
  // Apple In-App Purchase Methods
  async createAppleTransaction(transaction: InsertAppleTransaction): Promise<AppleTransaction> {
    const result = await this.db.insert(appleTransactions).values({
      userId: transaction.userId,
      originalTransactionId: transaction.originalTransactionId,
      transactionId: transaction.transactionId,
      productId: transaction.productId,
      bundleId: transaction.bundleId || null,
      purchaseDate: new Date(transaction.purchaseDate),
      expiresDate: transaction.expiresDate ? new Date(transaction.expiresDate) : null,
      isTrialPeriod: transaction.isTrialPeriod || false,
      isInIntroOfferPeriod: transaction.isInIntroOfferPeriod || false,
      status: transaction.status || 'active',
      environment: transaction.environment || 'production',
    }).returning();
    return this.convertTimestamps(result[0]);
  }
  
  async getAppleTransactionByOriginalId(originalTransactionId: string): Promise<AppleTransaction | undefined> {
    const result = await this.db.select().from(appleTransactions)
      .where(eq(appleTransactions.originalTransactionId, originalTransactionId));
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }
  
  async getUserAppleTransactions(userId: string): Promise<AppleTransaction[]> {
    const result = await this.db.select().from(appleTransactions)
      .where(eq(appleTransactions.userId, userId))
      .orderBy(desc(appleTransactions.createdAt));
    return result.map(t => this.convertTimestamps(t));
  }
  
  async updateAppleTransaction(id: string, updates: Partial<AppleTransaction>): Promise<AppleTransaction | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    delete updateData.id;
    delete updateData.createdAt;
    
    if (updateData.expiresDate && typeof updateData.expiresDate === 'string') {
      updateData.expiresDate = new Date(updateData.expiresDate);
    }
    
    const result = await this.db.update(appleTransactions)
      .set(updateData)
      .where(eq(appleTransactions.id, id))
      .returning();
    return result[0] ? this.convertTimestamps(result[0]) : undefined;
  }
  
  async createAppleNotificationEvent(event: InsertAppleNotificationEvent): Promise<AppleNotificationEvent> {
    const result = await this.db.insert(appleNotificationEvents).values({
      notificationType: event.notificationType,
      subtype: event.subtype || null,
      notificationUUID: event.notificationUUID || null,
      originalTransactionId: event.originalTransactionId || null,
      userId: event.userId || null,
      status: event.status,
      payload: event.payload || null,
      errorMessage: event.errorMessage || null,
      processingTimeMs: event.processingTimeMs || null,
    }).returning();
    return this.convertTimestamps(result[0]);
  }
  
  async getAppleNotificationEvents(limit: number = 100): Promise<AppleNotificationEvent[]> {
    const result = await this.db.select().from(appleNotificationEvents)
      .orderBy(desc(appleNotificationEvents.createdAt))
      .limit(limit);
    return result.map(e => this.convertTimestamps(e));
  }
}
