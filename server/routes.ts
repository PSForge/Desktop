import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { validatePowerShellScript } from "./validation";
import { getAIHelperResponse } from "./ai-helper";
import { hashPassword, verifyPassword, createUserSession, deleteUserSession } from "./auth";
import { 
  insertScriptSchema, 
  insertValidationRequestSchema,
  insertUserSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  adminCreateUserSchema,
  insertPlatformNotificationSchema,
  saveScriptSchema,
  type ValidationResult,
  type SubscriptionStatus
} from "@shared/schema";
import { randomBytes } from "crypto";
import { attachUser, requireAuth, requireSubscriber, requireAdmin } from "./middleware/auth";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(attachUser);

  // SEO routes - dynamic sitemap and robots.txt
  app.get("/sitemap.xml", (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const lastmod = new Date().toISOString().split('T')[0];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/signup</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    res.type("application/xml");
    res.send(sitemap);
  });

  app.get("/robots.txt", (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const robotsTxt = `# PSForge - PowerShell Script Builder
# Robots.txt

User-agent: *
Allow: /
Allow: /login
Allow: /signup
Disallow: /builder
Disallow: /account
Disallow: /admin
Disallow: /api/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml`;

    res.type("text/plain");
    res.send(robotsTxt);
  });

  app.post("/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid registration data",
          details: parsed.error.errors
        });
      }

      const { email, password, name } = parsed.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: "Email already registered"
        });
      }

      const passwordHash = await hashPassword(password);

      const user = await storage.createUser({
        email,
        passwordHash,
        name,
        role: "free",
        stripeCustomerId: null,
      });

      const session = await createUserSession(
        user.id,
        req.headers["user-agent"],
        req.ip
      );

      res.cookie("sessionId", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({
        error: "Internal server error during registration"
      });
    }
  });

  app.post("/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid login data",
          details: parsed.error.errors
        });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }

      const session = await createUserSession(
        user.id,
        req.headers["user-agent"],
        req.ip
      );

      res.cookie("sessionId", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        error: "Internal server error during login"
      });
    }
  });

  app.post("/auth/logout", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      
      if (sessionId) {
        await deleteUserSession(sessionId);
      }

      res.clearCookie("sessionId");
      return res.status(204).send();
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({
        error: "Internal server error during logout"
      });
    }
  });

  app.get("/auth/me", requireAuth, async (req, res) => {
    try {
      const subscription = await storage.getUserSubscription(req.user!.id);
      
      return res.json({
        user: {
          id: req.user!.id,
          email: req.user!.email,
          name: req.user!.name,
          role: req.user!.role,
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        } : null,
        featureAccess: req.featureAccess,
      });
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({
        error: "Internal server error"
      });
    }
  });

  app.post("/auth/change-password", requireAuth, async (req, res) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid password change data",
          details: parsed.error.errors
        });
      }

      const { currentPassword, newPassword } = parsed.data;
      const user = req.user!;

      // Verify current password
      if (!user.passwordHash) {
        return res.status(400).json({
          error: "User account has no password set"
        });
      }

      const isValidCurrent = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidCurrent) {
        return res.status(401).json({
          error: "Current password is incorrect"
        });
      }

      // Hash and update new password
      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, { passwordHash: newPasswordHash });

      return res.json({
        message: "Password changed successfully"
      });
    } catch (error) {
      console.error("Change password error:", error);
      return res.status(500).json({
        error: "Internal server error during password change"
      });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid email address",
          details: parsed.error.errors
        });
      }

      const { email } = parsed.data;
      const user = await storage.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          message: "If an account exists with this email, a password reset link will be sent."
        });
      }

      // Generate secure reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      // For now, return the reset link in response (later can be sent via email)
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const resetUrl = `${protocol}://${host}/reset-password?token=${resetToken}`;

      return res.json({
        message: "If an account exists with this email, a password reset link will be sent.",
        resetLink: resetUrl // TODO: Send via email instead of returning in response
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({
        error: "Internal server error during password reset request"
      });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid reset password data",
          details: parsed.error.errors
        });
      }

      const { token, newPassword } = parsed.data;

      // Validate token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({
          error: "Invalid or expired reset token"
        });
      }

      // Hash new password and update user
      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateUser(resetToken.userId, { passwordHash: newPasswordHash });

      // Mark token as used
      await storage.markTokenAsUsed(token);

      // Clean up expired tokens
      await storage.deleteExpiredResetTokens();

      return res.json({
        message: "Password reset successful. You can now login with your new password."
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({
        error: "Internal server error during password reset"
      });
    }
  });

  app.post("/api/validate", async (req, res) => {
    try {
      const parsed = insertValidationRequestSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          details: parsed.error.errors
        });
      }

      const { code } = parsed.data;
      const result: ValidationResult = validatePowerShellScript(code);

      return res.json(result);
    } catch (error) {
      console.error("Validation error:", error);
      return res.status(500).json({
        error: "Internal server error during validation"
      });
    }
  });

  app.post("/api/ai-helper", requireSubscriber, async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "Invalid request: message is required"
        });
      }

      const sanitizedHistory = Array.isArray(conversationHistory) 
        ? conversationHistory
            .slice(-10)
            .filter((msg: any) => 
              msg && 
              typeof msg === 'object' &&
              (msg.role === 'user' || msg.role === 'assistant') &&
              typeof msg.content === 'string'
            )
            .map((msg: any) => ({
              role: msg.role,
              content: msg.content.substring(0, 5000)
            }))
        : [];

      const result = await getAIHelperResponse(message, sanitizedHistory);

      return res.json(result);
    } catch (error) {
      console.error("AI helper error:", error);
      return res.status(500).json({
        error: "Failed to get AI response",
        response: "I'm having trouble connecting right now. Please try again.",
        suggestions: []
      });
    }
  });

  app.post("/api/scripts", async (req, res) => {
    try {
      const parsed = insertScriptSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid script data",
          details: parsed.error.errors
        });
      }

      const script = await storage.createScript(parsed.data);
      return res.status(201).json(script);
    } catch (error) {
      console.error("Error creating script:", error);
      return res.status(500).json({
        error: "Internal server error while creating script"
      });
    }
  });

  app.get("/api/scripts", async (_req, res) => {
    try {
      const scripts = await storage.getAllScripts();
      return res.json(scripts);
    } catch (error) {
      console.error("Error fetching scripts:", error);
      return res.status(500).json({
        error: "Internal server error while fetching scripts"
      });
    }
  });

  app.get("/api/scripts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const script = await storage.getScript(id);
      
      if (!script) {
        return res.status(404).json({
          error: "Script not found"
        });
      }

      return res.json(script);
    } catch (error) {
      console.error("Error fetching script:", error);
      return res.status(500).json({
        error: "Internal server error while fetching script"
      });
    }
  });

  app.put("/api/scripts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = insertScriptSchema.partial().safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid script data",
          details: parsed.error.errors
        });
      }

      const updated = await storage.updateScript(id, parsed.data);
      
      if (!updated) {
        return res.status(404).json({
          error: "Script not found"
        });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error updating script:", error);
      return res.status(500).json({
        error: "Internal server error while updating script"
      });
    }
  });

  app.delete("/api/scripts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const script = await storage.getScript(id);
      
      if (!script) {
        return res.status(404).json({
          error: "Script not found"
        });
      }

      // Only allow users to delete their own scripts
      if (script.userId !== req.user!.id) {
        return res.status(403).json({
          error: "Not authorized to delete this script"
        });
      }

      const deleted = await storage.deleteScript(id);

      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting script:", error);
      return res.status(500).json({
        error: "Internal server error while deleting script"
      });
    }
  });

  // User-specific script routes (authenticated)
  app.post("/api/scripts/save", requireAuth, async (req, res) => {
    try {
      const parsed = saveScriptSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid script data",
          details: parsed.error.errors
        });
      }

      const { name, content, description } = parsed.data;
      
      const script = await storage.createScript({
        userId: req.user!.id,
        name,
        content,
        description,
        commands: [], // Legacy field, not used for saved scripts
      });

      return res.status(201).json(script);
    } catch (error) {
      console.error("Error saving script:", error);
      return res.status(500).json({
        error: "Internal server error while saving script"
      });
    }
  });

  app.get("/api/scripts/user/me", requireAuth, async (req, res) => {
    try {
      const scripts = await storage.getUserScripts(req.user!.id);
      return res.json(scripts);
    } catch (error) {
      console.error("Error fetching user scripts:", error);
      return res.status(500).json({
        error: "Internal server error while fetching scripts"
      });
    }
  });

  app.post("/api/billing/checkout", requireAuth, async (req, res) => {
    try {
      const user = req.user!;

      if (!process.env.STRIPE_PRICE_ID) {
        return res.status(500).json({
          error: "Stripe Price ID not configured. Please set STRIPE_PRICE_ID environment variable."
        });
      }

      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${req.headers.origin || 'http://localhost:5000'}/builder?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'http://localhost:5000'}/builder`,
        metadata: {
          userId: user.id,
        },
      });

      return res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error);
      return res.status(500).json({
        error: "Failed to create checkout session",
        details: error.message
      });
    }
  });

  app.post("/api/billing/portal", requireAuth, async (req, res) => {
    try {
      const user = req.user!;

      if (!user.stripeCustomerId) {
        return res.status(400).json({
          error: "No Stripe customer found. Please subscribe first."
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin || 'http://localhost:5000'}/builder`,
      });

      return res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      return res.status(500).json({
        error: "Failed to create portal session",
        details: error.message
      });
    }
  });

  app.post("/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).json({ error: "No signature provided" });
    }

    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = req.body;
        console.warn("⚠️ Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET set)");
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          if (userId && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const planId = "pro";

            const userSub = await storage.createUserSubscription({
              userId,
              planId,
              stripeSubscriptionId: subscriptionId,
              status: "active",
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
              cancelAt: null,
              canceledAt: null,
              trialEnd: null,
            });

            await storage.updateUser(userId, {
              role: "subscriber",
              stripeCustomerId: customerId,
            });

            await storage.createSubscriptionEvent({
              userSubscriptionId: userSub.id,
              type: "subscription.created",
              payload: event.data.object as any,
              occurredAt: new Date().toISOString(),
            });

            console.log(`✅ Subscription created for user ${userId}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const userSub = await storage.getUserSubscriptionByStripeId(subscription.id);

          if (userSub) {
            const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
              'active': 'active',
              'trialing': 'trialing',
              'past_due': 'past_due',
              'canceled': 'canceled',
              'unpaid': 'unpaid',
              'incomplete': 'incomplete',
              'incomplete_expired': 'canceled',
              'paused': 'canceled',
            };

            await storage.updateUserSubscription(userSub.id, {
              status: statusMap[subscription.status] || 'canceled',
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
              cancelAt: (subscription as any).cancel_at ? new Date((subscription as any).cancel_at * 1000).toISOString() : null,
              canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000).toISOString() : null,
            });

            await storage.createSubscriptionEvent({
              userSubscriptionId: userSub.id,
              type: "subscription.updated",
              payload: event.data.object as any,
              occurredAt: new Date().toISOString(),
            });

            console.log(`✅ Subscription updated: ${subscription.id}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const userSub = await storage.getUserSubscriptionByStripeId(subscription.id);

          if (userSub) {
            await storage.updateUserSubscription(userSub.id, {
              status: "canceled",
              canceledAt: new Date().toISOString(),
            });

            const user = await storage.getUserById(userSub.userId);
            if (user && user.role === "subscriber") {
              await storage.updateUser(userSub.userId, {
                role: "free",
              });
            }

            await storage.createSubscriptionEvent({
              userSubscriptionId: userSub.id,
              type: "subscription.canceled",
              payload: event.data.object as any,
              occurredAt: new Date().toISOString(),
            });

            console.log(`✅ Subscription canceled: ${subscription.id}`);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;

          if (subscriptionId) {
            const userSub = await storage.getUserSubscriptionByStripeId(subscriptionId);
            if (userSub) {
              await storage.createSubscriptionEvent({
                userSubscriptionId: userSub.id,
                type: "payment.succeeded",
                payload: event.data.object as any,
                occurredAt: new Date().toISOString(),
              });

              console.log(`✅ Payment succeeded for subscription: ${subscriptionId}`);
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;

          if (subscriptionId) {
            const userSub = await storage.getUserSubscriptionByStripeId(subscriptionId);
            
            if (userSub) {
              await storage.updateUserSubscription(userSub.id, {
                status: "past_due",
              });

              await storage.createSubscriptionEvent({
                userSubscriptionId: userSub.id,
                type: "payment.failed",
                payload: event.data.object as any,
                occurredAt: new Date().toISOString(),
              });

              console.log(`⚠️ Payment failed for subscription: ${subscriptionId}`);
            }
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (error) {
      console.error("Webhook handler error:", error);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  // Admin routes
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsOverview();
      const allUsers = await storage.getAllUsers();
      const allSubscriptions = await storage.getAllSubscriptions();

      // Calculate growth trends
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentSignups = allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo);
      const recentSubscriptions = allSubscriptions.filter(s => 
        new Date(s.createdAt) >= thirtyDaysAgo && s.status === "active"
      );

      return res.json({
        overview: analytics,
        trends: {
          signupsLast30Days: recentSignups.length,
          subscriptionsLast30Days: recentSubscriptions.length,
        }
      });
    } catch (error) {
      console.error("Admin analytics error:", error);
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Don't expose password hashes
      const sanitizedUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        stripeCustomerId: u.stripeCustomerId,
        createdAt: u.createdAt,
      }));

      return res.json(sanitizedUsers);
    } catch (error) {
      console.error("Admin users fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const parsed = adminCreateUserSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid user data",
          details: parsed.error.errors
        });
      }

      const { email, password, name, role } = parsed.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: "User with this email already exists"
        });
      }

      // Hash the password
      const passwordHash = await hashPassword(password);

      // Create the user with the specified role
      const newUser = await storage.createUser({
        email,
        passwordHash,
        name,
        role,
        stripeCustomerId: null,
      });

      return res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt,
      });
    } catch (error) {
      console.error("Admin user creation error:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:userId/role", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!["free", "subscriber", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Prevent admins from changing their own role
      if (req.user?.id === userId) {
        return res.status(403).json({ error: "Cannot change your own role" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, { role });
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user" });
      }

      return res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      });
    } catch (error) {
      console.error("Admin role update error:", error);
      return res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Platform notification routes
  app.get("/api/notifications/active", async (req, res) => {
    try {
      const notification = await storage.getActiveNotification();
      return res.json(notification || null);
    } catch (error) {
      console.error("Get active notification error:", error);
      return res.status(500).json({ error: "Failed to retrieve notification" });
    }
  });

  app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      return res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({ error: "Failed to retrieve notifications" });
    }
  });

  app.post("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPlatformNotificationSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid notification data",
          details: parsed.error.errors
        });
      }

      const notification = await storage.createNotification(parsed.data);
      return res.status(201).json(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      return res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.patch("/api/admin/notifications/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { message, enabled } = req.body;

      const updates: Partial<{ message: string; enabled: boolean }> = {};
      if (message !== undefined) updates.message = message;
      if (enabled !== undefined) updates.enabled = enabled;

      const notification = await storage.updateNotification(id, updates);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      return res.json(notification);
    } catch (error) {
      console.error("Update notification error:", error);
      return res.status(500).json({ error: "Failed to update notification" });
    }
  });

  app.delete("/api/admin/notifications/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteNotification(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      return res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
