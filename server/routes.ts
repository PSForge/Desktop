import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { validatePowerShellScript } from "./validation";
import { validatePowerShellScript as validateComprehensive } from "./script-validator";
import { getAIHelperResponse } from "./ai-helper";
import { generateScriptDocumentation, analyzeScriptOptimization } from "./ai-optimizer";
import { hashPassword, verifyPassword, createUserSession, deleteUserSession } from "./auth";
import { sendPasswordResetEmail, sendSupportRequestEmail, sendWelcomeEmail } from "./email-service";
import { 
  insertScriptSchema, 
  insertValidationRequestSchema,
  insertUserSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  supportRequestSchema,
  adminCreateUserSchema,
  insertPlatformNotificationSchema,
  insertWelcomeEmailTemplateSchema,
  updateWelcomeEmailTemplateSchema,
  saveScriptSchema,
  updateScriptSchema,
  trackScriptGenerationSchema,
  insertTagSchema,
  type ValidationResult,
  type SubscriptionStatus,
  type User
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
      const { referralSource } = req.body;

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
        referralSource: referralSource || null,
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

      // Send welcome email asynchronously (don't block response)
      (async () => {
        try {
          const template = await storage.getWelcomeEmailTemplate("free_signup");
          if (template && template.enabled) {
            await sendWelcomeEmail(user.email, user.name, template.htmlContent, template.subject);
            console.log(`✓ Welcome email sent to ${user.email}`);
          }
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }
      })();

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

      // Generate reset URL
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const resetUrl = `${protocol}://${host}/reset-password?token=${resetToken}`;

      // Send password reset email
      try {
        await sendPasswordResetEmail(email, resetUrl, user.name || undefined);
        console.log(`Password reset email sent to: ${email}`);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        // Don't reveal email sending failure to user for security
      }

      return res.json({
        message: "If an account exists with this email, a password reset link has been sent to your inbox."
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

  app.post("/api/support/request", requireAuth, async (req, res) => {
    try {
      const parsed = supportRequestSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid support request data",
          details: parsed.error.errors
        });
      }

      const { subject, message } = parsed.data;
      const user = req.user!;

      // Send support request email to Support@psforge.app
      try {
        await sendSupportRequestEmail(
          user.email,
          user.name,
          subject,
          message
        );
        console.log(`Support request sent from: ${user.email}, subject: ${subject}`);
      } catch (emailError) {
        console.error("Failed to send support request email:", emailError);
        return res.status(500).json({
          error: "Failed to send support request. Please try again later."
        });
      }

      return res.json({
        message: "Your support request has been sent successfully. Our team will respond within 24 hours."
      });
    } catch (error) {
      console.error("Support request error:", error);
      return res.status(500).json({
        error: "Internal server error while processing support request"
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

  // Comprehensive validation with pre-flight checks, dependencies, impact analysis, and compliance
  app.post("/api/validate/comprehensive", async (req, res) => {
    try {
      const parsed = insertValidationRequestSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          details: parsed.error.errors
        });
      }

      const { code } = parsed.data;
      const result = validateComprehensive(code);

      return res.json(result);
    } catch (error) {
      console.error("Comprehensive validation error:", error);
      return res.status(500).json({
        error: "Internal server error during comprehensive validation"
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
      // Defensive check for authenticated user
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const parsed = saveScriptSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid script data",
          details: parsed.error.errors
        });
      }

      const { name, content, description, taskCategory, taskName } = parsed.data;
      
      const script = await storage.createScript({
        userId: req.user.id,
        name,
        content,
        description,
        taskCategory,
        taskName,
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

  // Track script generation events (for analytics)
  app.post("/api/metrics/script-generated", requireAuth, async (req, res) => {
    try {
      const parsed = trackScriptGenerationSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid tracking data",
          details: parsed.error.errors
        });
      }

      const { taskCategory, taskName, builderType } = parsed.data;
      
      // Record the script generation event
      await storage.createUsageMetric({
        userId: req.user!.id,
        metricType: "script_generated",
        value: 1,
        metadata: {
          taskCategory,
          taskName,
          builderType,
        },
        recordedAt: new Date().toISOString(),
      });

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error tracking script generation:", error);
      // Don't fail the user's request if tracking fails
      return res.status(200).json({ success: false });
    }
  });

  // Script Library - Favorites
  app.patch("/api/scripts/:id/favorite", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const script = await storage.toggleScriptFavorite(id, req.user!.id);
      
      if (!script) {
        return res.status(404).json({ error: "Script not found or unauthorized" });
      }
      
      return res.json(script);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/scripts/library/favorites", requireAuth, async (req, res) => {
    try {
      const scripts = await storage.getFavoriteScripts(req.user!.id);
      return res.json(scripts);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/scripts/library/recent", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const scripts = await storage.getRecentScripts(req.user!.id, limit);
      return res.json(scripts);
    } catch (error) {
      console.error("Error fetching recent scripts:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/scripts/:id/access", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const script = await storage.getScript(id);
      
      if (!script || script.userId !== req.user!.id) {
        return res.status(404).json({ error: "Script not found or unauthorized" });
      }
      
      await storage.updateScriptLastAccessed(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error updating access time:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tag Management
  app.post("/api/tags", requireAuth, async (req, res) => {
    try {
      const parsed = insertTagSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid tag data",
          details: parsed.error.errors
        });
      }

      const tag = await storage.createTag({
        ...parsed.data,
        userId: req.user!.id
      });
      
      return res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tags", requireAuth, async (req, res) => {
    try {
      const tags = await storage.getUserTags(req.user!.id);
      return res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/tags/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTag(id, req.user!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Tag not found or unauthorized" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tag:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/scripts/:scriptId/tags/:tagId", requireAuth, async (req, res) => {
    try {
      const { scriptId, tagId } = req.params;
      
      // Verify ownership
      const script = await storage.getScript(scriptId);
      if (!script || script.userId !== req.user!.id) {
        return res.status(404).json({ error: "Script not found or unauthorized" });
      }
      
      const scriptTag = await storage.addTagToScript(scriptId, tagId);
      return res.status(201).json(scriptTag);
    } catch (error) {
      console.error("Error adding tag to script:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/scripts/:scriptId/tags/:tagId", requireAuth, async (req, res) => {
    try {
      const { scriptId, tagId } = req.params;
      
      // Verify ownership
      const script = await storage.getScript(scriptId);
      if (!script || script.userId !== req.user!.id) {
        return res.status(404).json({ error: "Script not found or unauthorized" });
      }
      
      const deleted = await storage.removeTagFromScript(scriptId, tagId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Tag assignment not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error removing tag from script:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/scripts/:id/tags", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify ownership
      const script = await storage.getScript(id);
      if (!script || script.userId !== req.user!.id) {
        return res.status(404).json({ error: "Script not found or unauthorized" });
      }
      
      const tags = await storage.getScriptTags(id);
      return res.json(tags);
    } catch (error) {
      console.error("Error fetching script tags:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tags/:id/scripts", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const scripts = await storage.getScriptsByTag(id, req.user!.id);
      return res.json(scripts);
    } catch (error) {
      console.error("Error fetching scripts by tag:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // AI Documentation & Optimization
  app.post("/api/ai/generate-docs", requireAuth, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Code is required" });
      }
      
      const documentation = await generateScriptDocumentation(code);
      return res.json({ documentation });
    } catch (error) {
      console.error("Error generating documentation:", error);
      return res.status(500).json({ error: "Failed to generate documentation" });
    }
  });

  app.post("/api/ai/optimize", requireAuth, requireSubscriber, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Code is required" });
      }
      
      const optimization = await analyzeScriptOptimization(code);
      return res.json(optimization);
    } catch (error) {
      console.error("Error optimizing script:", error);
      return res.status(500).json({ error: "Failed to analyze script" });
    }
  });

  app.post("/api/billing/checkout", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { promoCode } = req.body;

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

      // Build checkout session config
      const sessionConfig: any = {
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
        // Always collect payment method even with free trial
        payment_method_collection: 'always',
      };

      // Handle promo code if provided
      if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
        try {
          // Look up the promotion code in Stripe
          const promotionCodes = await stripe.promotionCodes.list({
            code: promoCode.trim().toUpperCase(),
            active: true,
            limit: 1,
          });

          if (promotionCodes.data.length > 0) {
            // Valid promo code found - apply it to the session
            sessionConfig.discounts = [{
              promotion_code: promotionCodes.data[0].id,
            }];
            console.log(`Applied promo code: ${promoCode} for user ${user.id}`);
          } else {
            // Promo code not found, but don't fail - just log and continue
            console.log(`Promo code not found: ${promoCode} for user ${user.id}`);
            return res.status(400).json({
              error: "Invalid promo code",
              details: "The promo code you entered is not valid or has expired."
            });
          }
        } catch (promoError: any) {
          console.error("Promo code lookup error:", promoError);
          return res.status(400).json({
            error: "Promo code validation failed",
            details: "Unable to validate the promo code. Please try again or proceed without it."
          });
        }
      } else {
        // No promo code provided - enable manual promo code entry at checkout
        sessionConfig.allow_promotion_codes = true;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

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
    const startTime = Date.now();
    console.log("🔔 Stripe webhook received!", {
      hasSignature: !!req.headers['stripe-signature'],
      bodyType: typeof req.body,
      eventType: req.body?.type || 'unknown'
    });

    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      console.error("❌ Webhook rejected: No signature provided");
      return res.status(400).json({ error: "No signature provided" });
    }

    let event: Stripe.Event | undefined;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (webhookSecret) {
        console.log("🔐 Verifying webhook signature...");
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log("✅ Webhook signature verified, event type:", event.type);
      } else {
        event = req.body;
        console.warn("⚠️ Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET set)");
      }
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      // Log failed webhook event
      try {
        await storage.createWebhookEvent({
          eventType: req.body?.type || 'unknown',
          eventId: req.body?.id || null,
          status: 'failed',
          userId: null,
          subscriptionId: null,
          payload: req.body,
          errorMessage: `Signature verification failed: ${err.message}`,
          processingTimeMs: Date.now() - startTime,
        });
      } catch (logError) {
        console.error("Failed to log webhook event:", logError);
      }
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
      if (!event) {
        console.error("❌ Event is undefined after signature verification");
        return res.status(500).json({ error: "Event processing failed" });
      }
      
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          console.log(`📋 Processing checkout for user ${userId}, subscription ${subscriptionId}`);

          if (!userId || !subscriptionId) {
            console.warn(`⚠️ Checkout session missing userId or subscriptionId - ignoring`);
            break;
          }

          try {
            // Step 1: VERIFY subscription exists and is valid in Stripe
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            console.log(`🔍 Retrieved subscription ${subscriptionId}, status: ${subscription.status}`);

            // Step 2: Validate subscription is in good standing
            if (subscription.status !== 'active' && subscription.status !== 'trialing') {
              console.error(`❌ Subscription ${subscriptionId} has invalid status: ${subscription.status}`);
              break;
            }

            // Step 3: IMMEDIATELY upgrade user to Pro (subscription is verified active/trialing)
            await storage.updateUser(userId, {
              role: "subscriber",
              stripeCustomerId: customerId,
            });
            console.log(`✅ User ${userId} upgraded to Pro tier`);

            // Step 4: Get period dates with safe defaults
            const periodStart = (subscription as any).current_period_start || Math.floor(Date.now() / 1000);
            const periodEnd = (subscription as any).current_period_end || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
            
            console.log(`📅 Period: ${new Date(periodStart * 1000).toISOString()} to ${new Date(periodEnd * 1000).toISOString()}`);

            // Step 5: Create subscription record in database
            const userSub = await storage.createUserSubscription({
              userId,
              planId: "pro",
              stripeSubscriptionId: subscriptionId,
              status: "active",
              currentPeriodStart: new Date(periodStart * 1000).toISOString(),
              currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
              cancelAt: null,
              canceledAt: null,
              trialEnd: null,
            });
            console.log(`✅ Subscription record created: ${userSub.id}`);

            // Step 6: Log the event
            await storage.createSubscriptionEvent({
              userSubscriptionId: userSub.id,
              type: "subscription.created",
              payload: event.data.object as any,
              occurredAt: new Date().toISOString(),
            });

            // Step 7: Send subscription welcome email asynchronously
            (async () => {
              try {
                const user = await storage.getUserById(userId);
                if (user) {
                  const template = await storage.getWelcomeEmailTemplate("subscription");
                  if (template && template.enabled) {
                    await sendWelcomeEmail(user.email, user.name, template.htmlContent, template.subject);
                    console.log(`✓ Subscription welcome email sent to ${user.email}`);
                  }
                }
              } catch (emailError) {
                console.error("Failed to send subscription welcome email:", emailError);
              }
            })();

          } catch (error: any) {
            console.error(`❌ Failed to create subscription record ${subscriptionId}:`, error.message);
            console.error(`⚠️ CRITICAL: User ${userId} upgraded to Pro but subscription record failed. Manual sync may be needed.`);
            
            // Alert: User has Pro access but no subscription record
            // This ensures instant access (fixing the main bug) but creates data inconsistency
            // The subscription.updated webhook or manual sync button will reconcile this
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          let userSub = await storage.getUserSubscriptionByStripeId(subscription.id);

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

          if (!userSub) {
            // RECOVERY MECHANISM: Subscription record missing (could happen if checkout.completed failed)
            // Find user by Stripe customer ID and create missing subscription record
            const customerId = subscription.customer as string;
            const allUsers = await storage.getAllUsers();
            const user = allUsers.find((u: User) => u.stripeCustomerId === customerId);
            
            if (user) {
              console.log(`🔄 RECOVERY: Creating missing subscription record for user ${user.id}`);
              const periodStart = (subscription as any).current_period_start || Math.floor(Date.now() / 1000);
              const periodEnd = (subscription as any).current_period_end || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
              
              userSub = await storage.createUserSubscription({
                userId: user.id,
                planId: "pro",
                stripeSubscriptionId: subscription.id,
                status: statusMap[subscription.status] || 'canceled',
                currentPeriodStart: new Date(periodStart * 1000).toISOString(),
                currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
                cancelAt: (subscription as any).cancel_at ? new Date((subscription as any).cancel_at * 1000).toISOString() : null,
                canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000).toISOString() : null,
                trialEnd: null,
              });
              console.log(`✅ RECOVERY: Subscription record created: ${userSub.id}`);
            } else {
              console.warn(`⚠️ Cannot recover subscription ${subscription.id}: No user found with customer ID ${customerId}`);
            }
          }

          if (userSub) {
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

      // Log successful webhook processing
      const processingTime = Date.now() - startTime;
      console.log(`✅ Webhook processed successfully in ${processingTime}ms`);
      
      try {
        // Extract subscription ID based on event type
        let subscriptionId = null;
        const eventData = event.data.object as any;
        if (event.type === 'checkout.session.completed') {
          subscriptionId = eventData.subscription;
        } else if (event.type.startsWith('customer.subscription.')) {
          subscriptionId = eventData.id;
        } else if (event.type.startsWith('invoice.')) {
          subscriptionId = typeof eventData.subscription === 'string' 
            ? eventData.subscription 
            : eventData.subscription?.id || null;
        }
        
        await storage.createWebhookEvent({
          eventType: event.type,
          eventId: event.id || null,
          status: 'success',
          userId: eventData.metadata?.userId || null,
          subscriptionId,
          payload: event.data.object as any,
          errorMessage: null,
          processingTimeMs: processingTime,
        });
      } catch (logError) {
        console.error("Failed to log successful webhook event:", logError);
      }

      return res.json({ received: true });
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error("Webhook handler error:", error);
      
      // Log failed webhook processing
      try {
        await storage.createWebhookEvent({
          eventType: event?.type || 'unknown',
          eventId: event?.id || null,
          status: 'failed',
          userId: null,
          subscriptionId: null,
          payload: event?.data?.object as any || null,
          errorMessage: error.message || String(error),
          processingTimeMs: processingTime,
        });
      } catch (logError) {
        console.error("Failed to log failed webhook event:", logError);
      }
      
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  // Webhook diagnostics endpoint
  app.get("/api/admin/webhooks", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const eventType = req.query.eventType as string;
      
      let webhooks;
      if (eventType) {
        webhooks = await storage.getWebhookEventsByType(eventType, limit);
      } else {
        webhooks = await storage.getRecentWebhookEvents(limit);
      }
      
      // Calculate statistics
      const stats = {
        total: webhooks.length,
        successful: webhooks.filter(w => w.status === 'success').length,
        failed: webhooks.filter(w => w.status === 'failed').length,
        avgProcessingTime: webhooks.length > 0 
          ? Math.round(webhooks.reduce((sum, w) => sum + (w.processingTimeMs || 0), 0) / webhooks.length)
          : 0,
        eventTypes: Array.from(new Set(webhooks.map(w => w.eventType))),
      };
      
      return res.json({
        webhooks,
        stats,
      });
    } catch (error) {
      console.error("Webhook diagnostics error:", error);
      return res.status(500).json({ error: "Failed to fetch webhook events" });
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
        referralSource: null,
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

  app.delete("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      // Prevent admins from deleting their own account
      if (req.user?.id === userId) {
        return res.status(403).json({ error: "Cannot delete your own account" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete user" });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Admin user deletion error:", error);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.post("/api/admin/sync-subscriptions", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithStripe = users.filter(u => u.stripeCustomerId);
      
      let updated = 0;
      let errors = 0;
      const details: Array<{ userId: string; email: string; status: string; message?: string }> = [];

      for (const user of usersWithStripe) {
        try {
          // Get subscriptions for this customer from Stripe
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId!,
            status: 'active',
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            
            // Update user role to subscriber FIRST (most important)
            if (user.role !== "subscriber" && user.role !== "admin") {
              await storage.updateUser(user.id, { role: "subscriber" });
              updated++;
            }
            
            // Try to create subscription record (optional, for tracking)
            try {
              const existingUserSub = await storage.getUserSubscriptionByStripeId(subscription.id);
              
              if (!existingUserSub && (subscription as any).current_period_start && (subscription as any).current_period_end) {
                await storage.createUserSubscription({
                  userId: user.id,
                  planId: "pro",
                  stripeSubscriptionId: subscription.id,
                  status: "active",
                  currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
                  currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
                  cancelAt: null,
                  canceledAt: null,
                  trialEnd: null,
                });
              }
            } catch (subError: any) {
              // Log but don't fail - user role is already updated
              console.warn(`Could not create subscription record for ${user.email}:`, subError.message);
            }

            // Report status
            if (user.role === "subscriber" || user.role === "admin") {
              details.push({
                userId: user.id,
                email: user.email,
                status: user.role === "admin" ? "already_admin" : "updated",
                message: user.role === "admin" ? "Admin account (has Pro access)" : "Upgraded to Pro (active subscription found)"
              });
            }
          } else {
            // No active subscription found
            details.push({
              userId: user.id,
              email: user.email,
              status: "no_subscription",
              message: "No active Stripe subscription found"
            });
          }
        } catch (userError: any) {
          console.error(`Error syncing user ${user.email}:`, userError);
          errors++;
          details.push({
            userId: user.id,
            email: user.email,
            status: "error",
            message: userError.message
          });
        }
      }

      return res.json({
        success: true,
        summary: {
          total: usersWithStripe.length,
          updated,
          errors
        },
        details
      });
    } catch (error: any) {
      console.error("Subscription sync error:", error);
      return res.status(500).json({ 
        error: "Failed to sync subscriptions",
        message: error.message 
      });
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

  // Welcome Email Template routes
  app.get("/api/admin/email-templates", requireAdmin, async (req, res) => {
    try {
      const templates = await storage.getAllWelcomeEmailTemplates();
      return res.json(templates);
    } catch (error) {
      console.error("Get email templates error:", error);
      return res.status(500).json({ error: "Failed to retrieve email templates" });
    }
  });

  app.get("/api/admin/email-templates/:type", requireAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      const template = await storage.getWelcomeEmailTemplate(type);
      
      if (!template) {
        return res.status(404).json({ error: "Email template not found" });
      }

      return res.json(template);
    } catch (error) {
      console.error("Get email template error:", error);
      return res.status(500).json({ error: "Failed to retrieve email template" });
    }
  });

  app.post("/api/admin/email-templates", requireAdmin, async (req, res) => {
    try {
      const parsed = insertWelcomeEmailTemplateSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid email template data",
          details: parsed.error.errors
        });
      }

      const template = await storage.createWelcomeEmailTemplate(parsed.data);
      return res.status(201).json(template);
    } catch (error) {
      console.error("Create email template error:", error);
      return res.status(500).json({ error: "Failed to create email template" });
    }
  });

  app.patch("/api/admin/email-templates/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = updateWelcomeEmailTemplateSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid email template data",
          details: parsed.error.errors
        });
      }

      const template = await storage.updateWelcomeEmailTemplate(id, parsed.data);
      if (!template) {
        return res.status(404).json({ error: "Email template not found" });
      }

      return res.json(template);
    } catch (error) {
      console.error("Update email template error:", error);
      return res.status(500).json({ error: "Failed to update email template" });
    }
  });

  app.delete("/api/admin/email-templates/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteWelcomeEmailTemplate(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Email template not found" });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Delete email template error:", error);
      return res.status(500).json({ error: "Failed to delete email template" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
