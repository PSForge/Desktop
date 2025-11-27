import { 
  type Script, 
  type InsertScript,
  type User,
  type InsertUser,
  type Session,
  type SubscriptionPlan,
  type UserSubscription,
  type SubscriptionEvent,
  type UsageMetric,
  type AnalyticsOverview,
  type UserRole,
  type SubscriptionStatus,
  type PlatformNotification,
  type InsertPlatformNotification,
  type PasswordResetToken,
  type WelcomeEmailTemplate,
  type InsertWelcomeEmailTemplate,
  type UpdateWelcomeEmailTemplate,
  type UserStats,
  type GenerationSources,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Script management
  getScript(id: string): Promise<Script | undefined>;
  getAllScripts(): Promise<Script[]>;
  getUserScripts(userId: string): Promise<Script[]>;
  createScript(script: InsertScript): Promise<Script>;
  updateScript(id: string, script: Partial<InsertScript>): Promise<Script | undefined>;
  deleteScript(id: string): Promise<boolean>;
  toggleScriptFavorite(id: string, userId: string): Promise<Script | undefined>;
  updateScriptLastAccessed(id: string): Promise<void>;
  getFavoriteScripts(userId: string): Promise<Script[]>;
  getRecentScripts(userId: string, limit?: number): Promise<Script[]>;
  
  // Tag management
  createTag(tag: import("@shared/schema").InsertTag): Promise<import("@shared/schema").Tag>;
  getUserTags(userId: string): Promise<import("@shared/schema").Tag[]>;
  deleteTag(id: string, userId: string): Promise<boolean>;
  addTagToScript(scriptId: string, tagId: string): Promise<import("@shared/schema").ScriptTag>;
  removeTagFromScript(scriptId: string, tagId: string): Promise<boolean>;
  getScriptTags(scriptId: string): Promise<import("@shared/schema").Tag[]>;
  getScriptsByTag(tagId: string, userId: string): Promise<Script[]>;

  // User management
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt">): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;
  
  // Session management
  createSession(session: Omit<Session, "id" | "createdAt">): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;
  deleteExpiredSessions(): Promise<number>;
  
  // Subscription plans
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  createSubscriptionPlan(plan: SubscriptionPlan): Promise<SubscriptionPlan>;
  
  // User subscriptions
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: Omit<UserSubscription, "id" | "createdAt" | "updatedAt">): Promise<UserSubscription>;
  updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  getAllSubscriptions(): Promise<UserSubscription[]>;
  getActiveSubscriptions(): Promise<UserSubscription[]>;
  
  // Subscription events
  createSubscriptionEvent(event: Omit<SubscriptionEvent, "id">): Promise<SubscriptionEvent>;
  getSubscriptionEvents(subscriptionId: string): Promise<SubscriptionEvent[]>;
  
  // Analytics & Metrics
  createUsageMetric(metric: Omit<UsageMetric, "id">): Promise<UsageMetric>;
  getAnalyticsOverview(): Promise<AnalyticsOverview>;
  getUserMetrics(userId: string, metricType?: string): Promise<UsageMetric[]>;
  
  // Platform Notifications
  getNotification(id: string): Promise<PlatformNotification | undefined>;
  getAllNotifications(): Promise<PlatformNotification[]>;
  getActiveNotification(): Promise<PlatformNotification | undefined>;
  createNotification(notification: InsertPlatformNotification): Promise<PlatformNotification>;
  updateNotification(id: string, updates: Partial<PlatformNotification>): Promise<PlatformNotification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  
  // Password Reset Tokens
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(token: string): Promise<boolean>;
  deleteExpiredResetTokens(): Promise<number>;
  
  // Welcome Email Templates
  getWelcomeEmailTemplate(type: string): Promise<WelcomeEmailTemplate | undefined>;
  getAllWelcomeEmailTemplates(): Promise<WelcomeEmailTemplate[]>;
  createWelcomeEmailTemplate(template: InsertWelcomeEmailTemplate): Promise<WelcomeEmailTemplate>;
  updateWelcomeEmailTemplate(id: string, updates: UpdateWelcomeEmailTemplate): Promise<WelcomeEmailTemplate | undefined>;
  deleteWelcomeEmailTemplate(id: string): Promise<boolean>;
  
  // Webhook Events
  createWebhookEvent(event: Omit<import("@shared/schema").WebhookEvent, "id" | "createdAt">): Promise<import("@shared/schema").WebhookEvent>;
  getRecentWebhookEvents(limit?: number): Promise<import("@shared/schema").WebhookEvent[]>;
  getWebhookEventsByType(eventType: string, limit?: number): Promise<import("@shared/schema").WebhookEvent[]>;
  
  // Git Repository management
  createGitRepository(repository: import("@shared/schema").InsertGitRepository): Promise<import("@shared/schema").GitRepository>;
  getUserGitRepositories(userId: string): Promise<import("@shared/schema").GitRepository[]>;
  getGitRepository(id: string): Promise<import("@shared/schema").GitRepository | undefined>;
  updateGitRepository(id: string, updates: Partial<import("@shared/schema").GitRepository>): Promise<import("@shared/schema").GitRepository | undefined>;
  deleteGitRepository(id: string): Promise<boolean>;
  
  // Git Commits
  createGitCommit(commit: import("@shared/schema").InsertGitCommit): Promise<import("@shared/schema").GitCommit>;
  getRepositoryCommits(repositoryId: string, limit?: number): Promise<import("@shared/schema").GitCommit[]>;
  getScriptCommits(scriptId: string): Promise<import("@shared/schema").GitCommit[]>;
  
  // Template Categories
  createTemplateCategory(category: import("@shared/schema").InsertTemplateCategory): Promise<import("@shared/schema").TemplateCategory>;
  getAllTemplateCategories(): Promise<import("@shared/schema").TemplateCategory[]>;
  getTemplateCategory(id: string): Promise<import("@shared/schema").TemplateCategory | undefined>;
  
  // Templates
  createTemplate(template: import("@shared/schema").InsertTemplate): Promise<import("@shared/schema").Template>;
  getAllTemplates(filters?: {status?: string; categoryId?: string; featured?: boolean}): Promise<import("@shared/schema").Template[]>;
  getTemplate(id: string): Promise<import("@shared/schema").Template | undefined>;
  getUserTemplates(userId: string): Promise<import("@shared/schema").Template[]>;
  getUserTemplateStats(userId: string): Promise<{totalTemplates: number; totalDownloads: number; totalInstalls: number; avgRating: number}>;
  updateTemplate(id: string, updates: Partial<import("@shared/schema").Template>): Promise<import("@shared/schema").Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  incrementTemplateDownloads(id: string): Promise<void>;
  incrementTemplateInstalls(id: string): Promise<void>;
  
  // Template Ratings
  createTemplateRating(rating: import("@shared/schema").InsertTemplateRating): Promise<import("@shared/schema").TemplateRating>;
  getTemplateRatings(templateId: string): Promise<import("@shared/schema").TemplateRating[]>;
  getUserTemplateRating(templateId: string, userId: string): Promise<import("@shared/schema").TemplateRating | undefined>;
  updateTemplateRating(id: string, updates: Partial<import("@shared/schema").TemplateRating>): Promise<import("@shared/schema").TemplateRating | undefined>;
  updateTemplateAverageRating(templateId: string): Promise<void>;
  
  // Template Installs
  createTemplateInstall(install: import("@shared/schema").InsertTemplateInstall): Promise<import("@shared/schema").TemplateInstall>;
  getTemplateInstalls(templateId: string): Promise<import("@shared/schema").TemplateInstall[]>;
  hasUserInstalledTemplate(templateId: string, userId: string): Promise<boolean>;
  
  // User Stats (conversion tracking)
  getUserStats(userId: string): Promise<UserStats | undefined>;
  getOrCreateUserStats(userId: string): Promise<UserStats>;
  incrementScriptsGenerated(userId: string, source: keyof GenerationSources): Promise<UserStats>;
  incrementScriptsSaved(userId: string): Promise<UserStats>;
  addMilestone(userId: string, milestone: number): Promise<UserStats>;
  dismissNudge(userId: string, nudgeId: string): Promise<UserStats>;
  updateLastNudgeShown(userId: string): Promise<UserStats>;
  
  // Admin Analytics for User Stats
  getMilestoneDistribution(): Promise<{milestone: number; count: number; percentage: number}[]>;
  getGenerationSourcesBreakdown(): Promise<{source: string; count: number; percentage: number}[]>;
}

export class MemStorage implements IStorage {
  private scripts: Map<string, Script>;
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private subscriptionPlans: Map<string, SubscriptionPlan>;
  private userSubscriptions: Map<string, UserSubscription>;
  private subscriptionEvents: Map<string, SubscriptionEvent>;
  private usageMetrics: Map<string, UsageMetric>;
  private notifications: Map<string, PlatformNotification>;

  constructor() {
    this.scripts = new Map();
    this.users = new Map();
    this.sessions = new Map();
    this.subscriptionPlans = new Map();
    this.userSubscriptions = new Map();
    this.subscriptionEvents = new Map();
    this.usageMetrics = new Map();
    this.notifications = new Map();
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const premiumPlan: SubscriptionPlan = {
      id: "premium",
      name: "PSForge Premium",
      priceCents: 500,
      interval: "month",
      features: [
        "AI Assistant access",
        "All GUI Builder categories",
        "Priority support",
        "Advanced script templates"
      ],
      stripeProductId: null,
      stripePriceId: null,
    };
    this.subscriptionPlans.set(premiumPlan.id, premiumPlan);
  }

  async getScript(id: string): Promise<Script | undefined> {
    return this.scripts.get(id);
  }

  async getAllScripts(): Promise<Script[]> {
    return Array.from(this.scripts.values());
  }

  async getUserScripts(userId: string): Promise<Script[]> {
    return Array.from(this.scripts.values()).filter(script => script.userId === userId);
  }

  async createScript(insertScript: InsertScript): Promise<Script> {
    const id = randomUUID();
    const script: Script = {
      ...insertScript,
      id,
      createdAt: new Date().toISOString(),
    };
    this.scripts.set(id, script);
    return script;
  }

  async updateScript(id: string, updates: Partial<InsertScript>): Promise<Script | undefined> {
    const existing = this.scripts.get(id);
    if (!existing) return undefined;

    const updated: Script = { ...existing, ...updates };
    this.scripts.set(id, updated);
    return updated;
  }

  async deleteScript(id: string): Promise<boolean> {
    return this.scripts.delete(id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const id = randomUUID();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    const updated: User = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createSession(session: Omit<Session, "id" | "createdAt">): Promise<Session> {
    const id = randomUUID();
    const newSession: Session = {
      ...session,
      id,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(id);
      return undefined;
    }
    
    return session;
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    let count = 0;
    const sessions = Array.from(this.sessions.entries());
    for (const [id, session] of sessions) {
      if (new Date(session.expiresAt) < now) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.get(id);
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values());
  }

  async createSubscriptionPlan(plan: SubscriptionPlan): Promise<SubscriptionPlan> {
    this.subscriptionPlans.set(plan.id, plan);
    return plan;
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const validStatuses: SubscriptionStatus[] = ["active", "past_due"];
    const subscriptions = Array.from(this.userSubscriptions.values())
      .filter(sub => sub.userId === userId && validStatuses.includes(sub.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return subscriptions[0];
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    return Array.from(this.userSubscriptions.values())
      .find(sub => sub.stripeSubscriptionId === stripeSubscriptionId);
  }

  async createUserSubscription(subscription: Omit<UserSubscription, "id" | "createdAt" | "updatedAt">): Promise<UserSubscription> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newSubscription: UserSubscription = {
      ...subscription,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.userSubscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const existing = this.userSubscriptions.get(id);
    if (!existing) return undefined;

    const updated: UserSubscription = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.userSubscriptions.set(id, updated);
    return updated;
  }

  async getAllSubscriptions(): Promise<UserSubscription[]> {
    return Array.from(this.userSubscriptions.values());
  }

  async getActiveSubscriptions(): Promise<UserSubscription[]> {
    return Array.from(this.userSubscriptions.values())
      .filter(sub => sub.status === "active");
  }

  async createSubscriptionEvent(event: Omit<SubscriptionEvent, "id">): Promise<SubscriptionEvent> {
    const id = randomUUID();
    const newEvent: SubscriptionEvent = { ...event, id };
    this.subscriptionEvents.set(id, newEvent);
    return newEvent;
  }

  async getSubscriptionEvents(subscriptionId: string): Promise<SubscriptionEvent[]> {
    return Array.from(this.subscriptionEvents.values())
      .filter(event => event.userSubscriptionId === subscriptionId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  async createUsageMetric(metric: Omit<UsageMetric, "id">): Promise<UsageMetric> {
    const id = randomUUID();
    const newMetric: UsageMetric = { ...metric, id };
    this.usageMetrics.set(id, newMetric);
    return newMetric;
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const users = Array.from(this.users.values());
    const subscriptions = Array.from(this.userSubscriptions.values());
    const activeSubscriptions = subscriptions.filter(sub => sub.status === "active");
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const newSignupsThisMonth = users.filter(u => new Date(u.createdAt) >= startOfMonth).length;
    const cancellationsThisMonth = subscriptions.filter(
      sub => sub.canceledAt && new Date(sub.canceledAt) >= startOfMonth
    ).length;
    
    const plans = Array.from(this.subscriptionPlans.values());
    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
      const plan = plans.find(p => p.id === sub.planId);
      if (plan && plan.interval === "month") {
        return sum + plan.priceCents;
      }
      if (plan && plan.interval === "year") {
        return sum + (plan.priceCents / 12);
      }
      return sum;
    }, 0);

    const totalRevenue = monthlyRecurringRevenue;
    
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthSubs = subscriptions.filter(sub => {
      const createdAt = new Date(sub.createdAt);
      return createdAt >= previousMonthStart && createdAt < startOfMonth;
    }).length;
    
    const churnRate = previousMonthSubs > 0 ? (cancellationsThisMonth / previousMonthSubs) * 100 : null;

    return {
      totalUsers: users.length,
      activeSubscribers: activeSubscriptions.length,
      freeUsers: users.filter(u => u.role === "free").length,
      monthlyRecurringRevenue,
      totalRevenue,
      churnRate,
      newSignupsThisMonth,
      cancellationsThisMonth,
    };
  }

  async getUserMetrics(userId: string, metricType?: string): Promise<UsageMetric[]> {
    let metrics = Array.from(this.usageMetrics.values())
      .filter(m => m.userId === userId);
    
    if (metricType) {
      metrics = metrics.filter(m => m.metricType === metricType);
    }
    
    return metrics.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }

  // Platform Notifications
  async getNotification(id: string): Promise<PlatformNotification | undefined> {
    return this.notifications.get(id);
  }

  async getAllNotifications(): Promise<PlatformNotification[]> {
    return Array.from(this.notifications.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActiveNotification(): Promise<PlatformNotification | undefined> {
    const notifications = Array.from(this.notifications.values())
      .filter(n => n.enabled)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return notifications[0];
  }

  async createNotification(insertNotification: InsertPlatformNotification): Promise<PlatformNotification> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const notification: PlatformNotification = {
      id,
      ...insertNotification,
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async updateNotification(id: string, updates: Partial<PlatformNotification>): Promise<PlatformNotification | undefined> {
    const existing = this.notifications.get(id);
    if (!existing) return undefined;

    const updated: PlatformNotification = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.notifications.set(id, updated);
    return updated;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }
}

// Import DatabaseStorage
import { DatabaseStorage } from "./db-storage";

// Use DatabaseStorage for persistent PostgreSQL storage
export const storage = new DatabaseStorage();
