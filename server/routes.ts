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
  type ValidationResult,
  type SubscriptionStatus
} from "@shared/schema";
import { attachUser, requireAuth, requireSubscriber, requireAdmin } from "./middleware/auth";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(attachUser);

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

  app.delete("/api/scripts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteScript(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Script not found"
        });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting script:", error);
      return res.status(500).json({
        error: "Internal server error while deleting script"
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

  const httpServer = createServer(app);

  return httpServer;
}
