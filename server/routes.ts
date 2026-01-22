import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { validatePowerShellScript } from "./validation";
import { validatePowerShellScript as validateComprehensive } from "./script-validator";
import { getAIHelperResponse } from "./ai-helper";
import { generateScriptDocumentation, analyzeScriptOptimization, applyScriptOptimizations } from "./ai-optimizer";
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
  insertTemplateCategorySchema,
  insertTemplateSchema,
  insertTemplateRatingSchema,
  insertTemplateInstallSchema,
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
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/case-studies</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/case-studies/techcorp-onboarding-automation</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/case-studies/midwest-healthcare-compliance</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/case-studies/cloudfront-storage-management</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/security</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/signup</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
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
Allow: /case-studies
Allow: /about
Allow: /security
Allow: /privacy
Allow: /terms
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

      // Update last login timestamp
      await storage.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

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

  // User Stats & Pro Conversion Tracking
  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.user!.id);
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/user/track-script", requireAuth, async (req, res) => {
    try {
      const { timeSavedMinutes } = req.body;
      await storage.incrementUserScriptCount(req.user!.id, timeSavedMinutes || 60);
      await storage.updateUserActivity(req.user!.id);
      const stats = await storage.getUserStats(req.user!.id);
      return res.json(stats);
    } catch (error) {
      console.error("Error tracking script:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/milestones", requireAuth, async (req, res) => {
    try {
      const milestones = await storage.getUserMilestones(req.user!.id);
      return res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/milestones/unshown", requireAuth, async (req, res) => {
    try {
      const milestones = await storage.getUnshownMilestones(req.user!.id);
      return res.json(milestones);
    } catch (error) {
      console.error("Error fetching unshown milestones:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/user/milestones/:id/dismiss", requireAuth, async (req, res) => {
    try {
      await storage.dismissMilestone(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing milestone:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/user/nudges/:nudgeType/dismiss", requireAuth, async (req, res) => {
    try {
      const { nudgeType } = req.params;
      await storage.dismissNudge(req.user!.id, nudgeType as any);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing nudge:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/nudges/dismissed", requireAuth, async (req, res) => {
    try {
      const dismissed = await storage.getUserDismissedNudges(req.user!.id);
      return res.json(dismissed);
    } catch (error) {
      console.error("Error fetching dismissed nudges:", error);
      return res.status(500).json({ error: "Internal server error" });
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

  // ============================================
  // GitHub OAuth Routes (User-Specific Integration)
  // ============================================
  
  // Initiate GitHub OAuth flow
  app.get("/api/auth/github", requireAuth, (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "GitHub OAuth not configured" });
    }
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/github/callback`;
    
    // Store user ID in state for callback
    const state = Buffer.from(JSON.stringify({ userId: req.user!.id })).toString('base64');
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo&state=${state}`;
    
    return res.redirect(githubAuthUrl);
  });
  
  // GitHub OAuth callback
  app.get("/api/auth/github/callback", async (req, res) => {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.redirect("/builder?github_error=missing_code");
    }
    
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.redirect("/builder?github_error=not_configured");
    }
    
    try {
      // Decode state to get userId
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const userId = stateData.userId;
      
      if (!userId) {
        return res.redirect("/builder?github_error=invalid_state");
      }
      
      // Exchange code for access token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        console.error("GitHub OAuth error:", tokenData);
        return res.redirect("/builder?github_error=token_exchange_failed");
      }
      
      const accessToken = tokenData.access_token;
      
      // Get GitHub user info
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
        },
      });
      
      const githubUser = await userResponse.json();
      
      // Update user with GitHub credentials
      await storage.updateUserGitHubConnection(userId, {
        githubAccessToken: accessToken,
        githubUsername: githubUser.login,
        githubAvatarUrl: githubUser.avatar_url,
        githubConnectedAt: new Date(),
      });
      
      return res.redirect("/account?github_connected=true");
    } catch (error: any) {
      console.error("GitHub OAuth callback error:", error);
      return res.redirect("/account?github_error=callback_failed");
    }
  });
  
  // Disconnect GitHub
  app.post("/api/auth/github/disconnect", requireAuth, async (req, res) => {
    try {
      await storage.updateUserGitHubConnection(req.user!.id, {
        githubAccessToken: null,
        githubUsername: null,
        githubAvatarUrl: null,
        githubConnectedAt: null,
      });
      
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error disconnecting GitHub:", error);
      return res.status(500).json({ error: "Failed to disconnect GitHub" });
    }
  });
  
  // Get current user's GitHub connection status
  app.get("/api/auth/github/status", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      return res.json({
        connected: !!user.githubAccessToken,
        username: user.githubUsername || null,
        avatarUrl: user.githubAvatarUrl || null,
        connectedAt: user.githubConnectedAt || null,
      });
    } catch (error: any) {
      console.error("Error getting GitHub status:", error);
      return res.status(500).json({ error: "Failed to get GitHub status" });
    }
  });

  // Git Integration Routes
  const { 
    getGitHubUser, 
    listRepositories, 
    getRepository, 
    listBranches, 
    getFileContent, 
    createOrUpdateFile, 
    createBranch, 
    deleteBranch, 
    listCommits 
  } = await import("./github-client");

  // Get authenticated GitHub user
  app.get("/api/git/user", requireAuth, async (req, res) => {
    try {
      const user = await getGitHubUser(req.user!.id);
      return res.json(user);
    } catch (error: any) {
      console.error("Error fetching GitHub user:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch GitHub user" });
    }
  });

  // List user's connected repositories
  app.get("/api/git/repositories", requireAuth, async (req, res) => {
    try {
      const repositories = await storage.getUserGitRepositories(req.user!.id);
      return res.json(repositories);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // List available GitHub repositories
  app.get("/api/git/github/repositories", requireAuth, async (req, res) => {
    try {
      const repos = await listRepositories(req.user!.id);
      return res.json(repos);
    } catch (error: any) {
      console.error("Error fetching GitHub repositories:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch repositories" });
    }
  });

  // Connect a repository
  app.post("/api/git/repositories", requireAuth, async (req, res) => {
    const { repoOwner, repoName, defaultBranch } = req.body;
    
    if (!repoOwner || !repoName) {
      return res.status(400).json({ error: "Repository owner and name are required" });
    }

    // Verify repository exists on GitHub first (before creating DB record)
    let repo;
    try {
      repo = await getRepository(req.user!.id, repoOwner, repoName);
    } catch (error: any) {
      console.error("Error verifying repository:", error);
      
      // Check if it's a GitHub 404 error (Octokit errors have status property)
      if (error.status === 404 || error.message?.toLowerCase().includes("not found")) {
        return res.status(404).json({ error: `Repository ${repoOwner}/${repoName} not found or you don't have access to it` });
      }
      
      // Other errors (network, auth, etc.)
      return res.status(500).json({ error: error.message || "Failed to verify repository" });
    }
    
    // Ensure repo exists and has valid data
    if (!repo) {
      return res.status(404).json({ error: `Repository ${repoOwner}/${repoName} not found or you don't have access to it` });
    }
    
    // Only create DB record after successfully verifying repository exists on GitHub
    try {
      const repository = await storage.createGitRepository({
        userId: req.user!.id,
        provider: "github",
        repoOwner,
        repoName,
        defaultBranch: defaultBranch || repo.default_branch || "main",
        currentBranch: defaultBranch || repo.default_branch || "main",
      });
      
      return res.status(201).json(repository);
    } catch (error: any) {
      console.error("Error creating repository record:", error);
      return res.status(500).json({ error: "Failed to save repository connection" });
    }
  });

  // Get repository details
  app.get("/api/git/repositories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      return res.json(repository);
    } catch (error) {
      console.error("Error fetching repository:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete repository connection
  app.delete("/api/git/repositories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      await storage.deleteGitRepository(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting repository:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // List branches
  app.get("/api/git/repositories/:id/branches", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      const branches = await listBranches(req.user!.id, repository.repoOwner, repository.repoName);
      return res.json(branches);
    } catch (error: any) {
      console.error("Error fetching branches:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch branches" });
    }
  });

  // Create a new branch
  app.post("/api/git/repositories/:id/branches", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { branchName, fromBranch } = req.body;
      
      if (!branchName) {
        return res.status(400).json({ error: "Branch name is required" });
      }
      
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      const branch = await createBranch(
        req.user!.id,
        repository.repoOwner, 
        repository.repoName, 
        branchName, 
        fromBranch || repository.defaultBranch
      );
      
      return res.status(201).json(branch);
    } catch (error: any) {
      console.error("Error creating branch:", error);
      return res.status(500).json({ error: error.message || "Failed to create branch" });
    }
  });

  // Delete a branch
  app.delete("/api/git/repositories/:id/branches/:name", requireAuth, async (req, res) => {
    try {
      const { id, name } = req.params;
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      if (name === repository.defaultBranch) {
        return res.status(400).json({ error: "Cannot delete default branch" });
      }
      
      await deleteBranch(req.user!.id, repository.repoOwner, repository.repoName, name);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting branch:", error);
      return res.status(500).json({ error: error.message || "Failed to delete branch" });
    }
  });

  // Switch branch
  app.post("/api/git/repositories/:id/checkout", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { branch } = req.body;
      
      if (!branch) {
        return res.status(400).json({ error: "Branch name is required" });
      }
      
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      const updated = await storage.updateGitRepository(id, { currentBranch: branch });
      return res.json(updated);
    } catch (error) {
      console.error("Error switching branch:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Commit and push script to GitHub
  app.post("/api/git/repositories/:id/commit", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { scriptId, message, path } = req.body;
      
      if (!scriptId || !message || !path) {
        return res.status(400).json({ error: "Script ID, commit message, and file path are required" });
      }
      
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      const script = await storage.getScript(scriptId);
      
      if (!script || script.userId !== req.user!.id) {
        return res.status(404).json({ error: "Script not found or unauthorized" });
      }
      
      // Get existing file to get SHA if it exists
      const existingFile = await getFileContent(
        req.user!.id,
        repository.repoOwner,
        repository.repoName,
        path,
        repository.currentBranch || repository.defaultBranch
      );
      
      // Commit the file
      const result = await createOrUpdateFile(
        req.user!.id,
        repository.repoOwner,
        repository.repoName,
        path,
        script.content,
        message,
        repository.currentBranch || repository.defaultBranch,
        existingFile?.sha
      );
      
      // Record commit in database
      const commit = await storage.createGitCommit({
        repositoryId: id,
        scriptId,
        commitSha: result.commit.sha || '',
        message,
        branch: repository.currentBranch || repository.defaultBranch,
        author: req.user!.email,
      });
      
      // Update repository sync time
      await storage.updateGitRepository(id, { lastSyncedAt: new Date().toISOString() });
      
      return res.status(201).json({ commit, githubCommit: result });
    } catch (error: any) {
      console.error("Error committing to GitHub:", error);
      return res.status(500).json({ error: error.message || "Failed to commit changes" });
    }
  });

  // Get commit history
  app.get("/api/git/repositories/:id/commits", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      const commits = await storage.getRepositoryCommits(id);
      return res.json(commits);
    } catch (error) {
      console.error("Error fetching commits:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get GitHub commits for comparison
  app.get("/api/git/repositories/:id/github-commits", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { path } = req.query;
      
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      const commits = await listCommits(
        req.user!.id,
        repository.repoOwner,
        repository.repoName,
        repository.currentBranch || repository.defaultBranch,
        path as string | undefined
      );
      
      return res.json(commits);
    } catch (error: any) {
      console.error("Error fetching GitHub commits:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch commits" });
    }
  });

  // Pull script from GitHub
  app.post("/api/git/repositories/:id/pull", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { path, scriptId } = req.body;
      
      if (!path) {
        return res.status(400).json({ error: "File path is required" });
      }
      
      const repository = await storage.getGitRepository(id);
      
      if (!repository || repository.userId !== req.user!.id) {
        return res.status(404).json({ error: "Repository not found or unauthorized" });
      }
      
      const fileContent = await getFileContent(
        req.user!.id,
        repository.repoOwner,
        repository.repoName,
        path,
        repository.currentBranch || repository.defaultBranch
      );
      
      if (!fileContent) {
        return res.status(404).json({ error: "File not found in repository" });
      }
      
      // Update existing script or return content to create new one
      if (scriptId) {
        const script = await storage.getScript(scriptId);
        
        if (!script || script.userId !== req.user!.id) {
          return res.status(404).json({ error: "Script not found or unauthorized" });
        }
        
        const updated = await storage.updateScript(scriptId, { content: fileContent.content });
        return res.json({ script: updated, content: fileContent.content });
      }
      
      return res.json({ content: fileContent.content, sha: fileContent.sha });
    } catch (error: any) {
      console.error("Error pulling from GitHub:", error);
      return res.status(500).json({ error: error.message || "Failed to pull changes" });
    }
  });

  // ==================== Template Categories Routes ====================
  
  // Get all template categories (public)
  app.get("/api/template-categories", async (req, res) => {
    try {
      const categories = await storage.getAllTemplateCategories();
      return res.json(categories);
    } catch (error) {
      console.error("Error fetching template categories:", error);
      return res.status(500).json({
        error: "Internal server error while fetching template categories"
      });
    }
  });

  // Create template category (admin only)
  app.post("/api/template-categories", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({
          error: "Admin access required"
        });
      }

      const parsed = insertTemplateCategorySchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid category data",
          details: parsed.error.errors
        });
      }

      const category = await storage.createTemplateCategory(parsed.data);
      return res.status(201).json(category);
    } catch (error) {
      console.error("Error creating template category:", error);
      return res.status(500).json({
        error: "Internal server error while creating template category"
      });
    }
  });

  // Get template category by ID (public)
  app.get("/api/template-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.getTemplateCategory(id);
      
      if (!category) {
        return res.status(404).json({
          error: "Template category not found"
        });
      }

      return res.json(category);
    } catch (error) {
      console.error("Error fetching template category:", error);
      return res.status(500).json({
        error: "Internal server error while fetching template category"
      });
    }
  });

  // ==================== Templates Routes ====================
  
  // Get all approved templates with filters (public)
  app.get("/api/templates", async (req, res) => {
    try {
      const { categoryId, featured, search } = req.query;
      
      const filters: any = { status: "approved" };
      
      if (categoryId && typeof categoryId === "string") {
        filters.categoryId = categoryId;
      }
      
      if (featured === "true") {
        filters.featured = true;
      }
      
      let templates = await storage.getAllTemplates(filters);
      
      // Apply search filter if provided
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        templates = templates.filter(t => 
          t.title.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
        );
      }
      
      return res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      return res.status(500).json({
        error: "Internal server error while fetching templates"
      });
    }
  });

  // Get all templates with admin filters (admin only)
  app.get("/api/admin/templates", requireAdmin, async (req, res) => {
    try {
      const { status, categoryId, featured, search } = req.query;
      
      const filters: any = {};
      
      // Admins can filter by any status (or omit to see all)
      if (status && typeof status === "string") {
        filters.status = status;
      }
      
      if (categoryId && typeof categoryId === "string") {
        filters.categoryId = categoryId;
      }
      
      if (featured === "true") {
        filters.featured = true;
      }
      
      let templates = await storage.getAllTemplates(filters);
      
      // Apply search filter if provided
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        templates = templates.filter(t => 
          t.title.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
        );
      }
      
      return res.json(templates);
    } catch (error) {
      console.error("Error fetching admin templates:", error);
      return res.status(500).json({
        error: "Internal server error while fetching admin templates"
      });
    }
  });

  // Get featured templates (public)
  app.get("/api/templates/featured", async (req, res) => {
    try {
      const templates = await storage.getAllTemplates({
        status: "approved",
        featured: true
      });
      
      return res.json(templates);
    } catch (error) {
      console.error("Error fetching featured templates:", error);
      return res.status(500).json({
        error: "Internal server error while fetching featured templates"
      });
    }
  });

  // Get user's published templates (requireAuth)
  app.get("/api/templates/my-published", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getUserTemplates(req.user!.id);
      return res.json(templates);
    } catch (error) {
      console.error("Error fetching user templates:", error);
      return res.status(500).json({
        error: "Internal server error while fetching user templates"
      });
    }
  });

  // Get user's template statistics (requireAuth)
  app.get("/api/templates/stats/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Users can only view their own stats unless they're admin
      if (req.user!.id !== userId && req.user!.role !== "admin") {
        return res.status(403).json({
          error: "Not authorized to view these stats"
        });
      }

      const stats = await storage.getUserTemplateStats(userId);
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching user template stats:", error);
      return res.status(500).json({
        error: "Internal server error while fetching user template stats"
      });
    }
  });

  // Get template by ID (public)
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({
          error: "Template not found"
        });
      }

      return res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      return res.status(500).json({
        error: "Internal server error while fetching template"
      });
    }
  });

  // Create/publish template (requireAuth)
  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const parsed = insertTemplateSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid template data",
          details: parsed.error.errors
        });
      }

      const template = await storage.createTemplate({
        ...parsed.data,
        authorId: req.user!.id
      });
      
      return res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      return res.status(500).json({
        error: "Internal server error while creating template"
      });
    }
  });

  // Update template (requireAuth, author or admin only)
  app.put("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({
          error: "Template not found"
        });
      }

      // Check if user is author or admin
      if (template.authorId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({
          error: "Not authorized to update this template"
        });
      }

      const parsed = insertTemplateSchema.partial().safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid template data",
          details: parsed.error.errors
        });
      }

      const updated = await storage.updateTemplate(id, parsed.data);
      
      if (!updated) {
        return res.status(404).json({
          error: "Template not found"
        });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error updating template:", error);
      return res.status(500).json({
        error: "Internal server error while updating template"
      });
    }
  });

  // Delete template (requireAuth, author or admin only)
  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({
          error: "Template not found"
        });
      }

      // Check if user is author or admin
      if (template.authorId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({
          error: "Not authorized to delete this template"
        });
      }

      await storage.deleteTemplate(id);
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      return res.status(500).json({
        error: "Internal server error while deleting template"
      });
    }
  });

  // Update template status to approved/rejected (admin only)
  app.put("/api/templates/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({
          error: "Invalid status. Must be 'approved', 'rejected', or 'pending'"
        });
      }

      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({
          error: "Template not found"
        });
      }

      const updated = await storage.updateTemplate(id, { status });
      
      return res.json(updated);
    } catch (error) {
      console.error("Error updating template status:", error);
      return res.status(500).json({
        error: "Internal server error while updating template status"
      });
    }
  });

  // ==================== Template Ratings Routes ====================
  
  // Create or update rating (requireAuth)
  app.post("/api/templates/:id/rate", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, review } = req.body;

      // Validate rating is 1-5
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({
          error: "Rating must be a number between 1 and 5"
        });
      }

      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({
          error: "Template not found"
        });
      }

      // Check if user already rated this template
      const existingRating = await storage.getUserTemplateRating(id, req.user!.id);

      let result;
      if (existingRating && existingRating.id) {
        // Update existing rating
        result = await storage.updateTemplateRating(existingRating.id, {
          rating,
          review
        });
      } else {
        // Create new rating
        const parsed = insertTemplateRatingSchema.safeParse({
          templateId: id,
          userId: req.user!.id,
          rating,
          review
        });
        
        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid rating data",
            details: parsed.error.errors
          });
        }

        result = await storage.createTemplateRating(parsed.data);
      }

      // Update template average rating
      await storage.updateTemplateAverageRating(id);

      return res.status(existingRating ? 200 : 201).json(result);
    } catch (error) {
      console.error("Error creating/updating template rating:", error);
      return res.status(500).json({
        error: "Internal server error while rating template"
      });
    }
  });

  // Get all ratings for template (public)
  app.get("/api/templates/:id/ratings", async (req, res) => {
    try {
      const { id } = req.params;
      const ratings = await storage.getTemplateRatings(id);
      
      return res.json(ratings);
    } catch (error) {
      console.error("Error fetching template ratings:", error);
      return res.status(500).json({
        error: "Internal server error while fetching template ratings"
      });
    }
  });

  // Get user's rating for template (requireAuth)
  app.get("/api/templates/:id/my-rating", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const rating = await storage.getUserTemplateRating(id, req.user!.id);
      
      if (!rating) {
        return res.status(404).json({
          error: "No rating found"
        });
      }

      return res.json(rating);
    } catch (error) {
      console.error("Error fetching user template rating:", error);
      return res.status(500).json({
        error: "Internal server error while fetching user rating"
      });
    }
  });

  // ==================== Template Installs Routes ====================
  
  // Track installation and increment counter (requireAuth)
  app.post("/api/templates/:id/install", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({
          error: "Template not found"
        });
      }

      // Check if user already installed this template
      const alreadyInstalled = await storage.hasUserInstalledTemplate(id, req.user!.id);

      if (!alreadyInstalled) {
        // Create install record
        const parsed = insertTemplateInstallSchema.safeParse({
          templateId: id,
          userId: req.user!.id
        });
        
        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid install data",
            details: parsed.error.errors
          });
        }

        await storage.createTemplateInstall(parsed.data);
        
        // Increment installs counter
        await storage.incrementTemplateInstalls(id);
      }

      return res.status(201).json({
        message: "Template installed successfully",
        alreadyInstalled
      });
    } catch (error) {
      console.error("Error installing template:", error);
      return res.status(500).json({
        error: "Internal server error while installing template"
      });
    }
  });

  // Check if user installed template (requireAuth)
  app.get("/api/templates/:id/installed", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const installed = await storage.hasUserInstalledTemplate(id, req.user!.id);
      
      return res.json({ installed });
    } catch (error) {
      console.error("Error checking template installation:", error);
      return res.status(500).json({
        error: "Internal server error while checking template installation"
      });
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

  // Apply AI recommendations to script
  app.post("/api/ai/apply-optimizations", requireAuth, requireSubscriber, async (req, res) => {
    try {
      const { code, recommendations } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Code is required" });
      }
      
      if (!recommendations || !Array.isArray(recommendations)) {
        return res.status(400).json({ error: "Recommendations array is required" });
      }
      
      const optimizedScript = await applyScriptOptimizations(code, recommendations);
      return res.json({ optimizedScript });
    } catch (error) {
      console.error("Error applying optimizations:", error);
      return res.status(500).json({ error: "Failed to apply optimizations" });
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
            const newStatus = statusMap[subscription.status] || 'canceled';
            await storage.updateUserSubscription(userSub.id, {
              status: newStatus,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
              cancelAt: (subscription as any).cancel_at ? new Date((subscription as any).cancel_at * 1000).toISOString() : null,
              canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000).toISOString() : null,
            });

            // Sync user role based on subscription status
            const user = await storage.getUserById(userSub.userId);
            if (user && user.role !== "admin") {
              const inactiveStatuses: SubscriptionStatus[] = ['canceled', 'past_due', 'unpaid', 'incomplete'];
              if (inactiveStatuses.includes(newStatus)) {
                // Downgrade to free if subscription is no longer active
                if (user.role === "subscriber") {
                  await storage.updateUser(userSub.userId, { role: "free" });
                  console.log(`📉 User ${userSub.userId} downgraded to free (subscription ${newStatus})`);
                }
              } else if (newStatus === 'active' || newStatus === 'trialing') {
                // Upgrade to subscriber if subscription is active
                if (user.role === "free") {
                  await storage.updateUser(userSub.userId, { role: "subscriber" });
                  console.log(`📈 User ${userSub.userId} upgraded to subscriber (subscription ${newStatus})`);
                }
              }
            }

            await storage.createSubscriptionEvent({
              userSubscriptionId: userSub.id,
              type: "subscription.updated",
              payload: event.data.object as any,
              occurredAt: new Date().toISOString(),
            });

            console.log(`✅ Subscription updated: ${subscription.id} -> ${newStatus}`);
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

              // Downgrade user role on payment failure
              const user = await storage.getUserById(userSub.userId);
              if (user && user.role === "subscriber") {
                await storage.updateUser(userSub.userId, { role: "free" });
                console.log(`📉 User ${userSub.userId} downgraded to free (payment failed)`);
              }

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

        // Template marketplace purchase completion (Connect payments)
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Check if this is a template purchase (has templateId in metadata)
          if (session.metadata?.templateId) {
            const { templateId, buyerId, sellerId, priceCents, platformFeeCents, sellerEarningsCents } = session.metadata;
            
            console.log(`📋 Processing template purchase for template ${templateId}, buyer ${buyerId}`);
            
            try {
              // Find and update the pending purchase
              const purchase = await storage.getTemplatePurchaseByCheckoutSession(session.id);
              
              if (purchase) {
                await storage.updateTemplatePurchase(purchase.id, {
                  status: 'completed',
                  stripePaymentIntentId: session.payment_intent as string,
                });
                
                // Update seller's pending balance
                const seller = await storage.getUserById(sellerId);
                if (seller) {
                  const currentPending = seller.pendingPayoutCents || 0;
                  await storage.updateUser(sellerId, {
                    pendingPayoutCents: currentPending + parseInt(sellerEarningsCents, 10),
                  });
                }
                
                // Increment template sales count
                await storage.incrementTemplateInstalls(templateId);
                
                console.log(`✅ Template purchase completed: ${templateId} by ${buyerId}`);
              } else {
                console.warn(`⚠️ Template purchase not found for session ${session.id}`);
              }
            } catch (error) {
              console.error(`❌ Failed to process template purchase:`, error);
            }
            break;
          }
          
          // Otherwise, handle as subscription checkout (existing logic)
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
          }
          break;
        }

        // Stripe Connect account updates (seller onboarding)
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          const accountId = account.id;
          
          console.log(`🔄 Connect account updated: ${accountId}`);
          
          try {
            // Find user with this Connect account
            const allUsers = await storage.getAllUsers();
            const seller = allUsers.find((u: User) => u.stripeConnectAccountId === accountId);
            
            if (seller) {
              // Check if onboarding is complete
              const chargesEnabled = account.charges_enabled;
              const payoutsEnabled = account.payouts_enabled;
              const detailsSubmitted = account.details_submitted;
              
              const isComplete = chargesEnabled && payoutsEnabled && detailsSubmitted;
              
              await storage.updateUser(seller.id, {
                stripeConnectOnboardingComplete: isComplete,
                sellerStatus: isComplete ? 'active' : (detailsSubmitted ? 'pending_verification' : 'pending'),
              });
              
              console.log(`✅ Connect account ${accountId} updated: complete=${isComplete}, status=${isComplete ? 'active' : 'pending'}`);
            } else {
              console.log(`⚠️ No user found with Connect account ${accountId}`);
            }
          } catch (error) {
            console.error(`❌ Failed to update Connect account status:`, error);
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

  // Apple In-App Purchase Server-to-Server Notifications (v2)
  app.post("/webhooks/apple", async (req, res) => {
    const startTime = Date.now();
    console.log("🍎 Apple notification received!");
    
    try {
      const { processAppleNotification } = await import("./apple-iap");
      
      // Apple sends signed JWTs for v2 notifications
      const signedPayload = req.body.signedPayload;
      
      if (!signedPayload) {
        // Handle legacy v1 notification format
        const notificationType = req.body.notification_type;
        if (notificationType) {
          console.log(`🍎 Legacy v1 notification: ${notificationType}`);
          // Log but don't process v1 notifications - they need different handling
          return res.status(200).send();
        }
        
        console.error("❌ Apple notification: No signedPayload found");
        return res.status(400).json({ error: "Invalid notification format" });
      }
      
      // Decode the signed payload (simple base64 decode for payload extraction)
      const parts = signedPayload.split('.');
      if (parts.length !== 3) {
        console.error("❌ Apple notification: Invalid JWT format");
        return res.status(400).json({ error: "Invalid JWT format" });
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      
      const result = await processAppleNotification(payload);
      
      const processingTime = Date.now() - startTime;
      console.log(`🍎 Apple notification processed in ${processingTime}ms: ${result.message}`);
      
      // Apple expects 200 response to acknowledge receipt
      return res.status(200).send();
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error("❌ Apple webhook handler error:", error);
      
      // Still return 200 to prevent Apple from retrying
      // Log the error for debugging
      return res.status(200).send();
    }
  });
  
  // API endpoint to link Apple receipt to user (called from iOS app)
  app.post("/api/apple/link-receipt", requireAuth, async (req, res) => {
    try {
      const { receiptData } = req.body;
      
      if (!receiptData) {
        return res.status(400).json({ error: "Receipt data is required" });
      }
      
      const { linkAppleTransactionToUser } = await import("./apple-iap");
      const result = await linkAppleTransactionToUser(req.user!.id, receiptData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      return res.json({
        success: true,
        message: result.message,
        transaction: result.transaction,
      });
    } catch (error: any) {
      console.error("Error linking Apple receipt:", error);
      return res.status(500).json({ error: "Failed to link receipt" });
    }
  });
  
  // Get user's Apple subscription status
  app.get("/api/apple/subscription-status", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getUserAppleTransactions(req.user!.id);
      
      const activeTransaction = transactions.find(t => 
        t.status === 'active' && 
        (!t.expiresDate || new Date(t.expiresDate) > new Date())
      );
      
      return res.json({
        hasActiveSubscription: !!activeTransaction,
        transaction: activeTransaction || null,
        allTransactions: transactions,
      });
    } catch (error: any) {
      console.error("Error getting Apple subscription status:", error);
      return res.status(500).json({ error: "Failed to get subscription status" });
    }
  });
  
  // Admin endpoint to view Apple notification events
  app.get("/api/admin/apple-notifications", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getAppleNotificationEvents(limit);
      return res.json({ events });
    } catch (error: any) {
      console.error("Error fetching Apple notification events:", error);
      return res.status(500).json({ error: "Failed to fetch notification events" });
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

  // ========================================
  // STRIPE CONNECT SELLER MARKETPLACE ROUTES
  // ========================================

  // Platform commission: 30% to PSForge, 70% to seller
  const PLATFORM_FEE_PERCENTAGE = 30;

  // Get seller status and earnings
  app.get("/api/seller/status", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user is a Pro subscriber (required to sell)
      const subscription = await storage.getUserSubscription(req.user!.id);
      const isProSubscriber = subscription && (subscription.status === "active" || subscription.status === "trialing");

      return res.json({
        canSell: isProSubscriber,
        sellerStatus: user.sellerStatus || "not_seller",
        stripeConnectOnboardingComplete: user.stripeConnectOnboardingComplete || false,
        totalEarningsCents: user.totalEarningsCents || 0,
        pendingPayoutCents: user.pendingPayoutCents || 0,
        sellerEnabledAt: user.sellerEnabledAt,
      });
    } catch (error) {
      console.error("Get seller status error:", error);
      return res.status(500).json({ error: "Failed to get seller status" });
    }
  });

  // Start Stripe Connect onboarding - creates a Connect account and returns onboarding link
  app.post("/api/seller/onboard", requireSubscriber, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let accountId = user.stripeConnectAccountId;

      // Create a new Connect account if user doesn't have one
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: user.email,
          capabilities: {
            transfers: { requested: true },
          },
          metadata: {
            userId: user.id,
          },
        });
        accountId = account.id;

        // Save the account ID to user
        await storage.updateUser(user.id, {
          stripeConnectAccountId: accountId,
          sellerStatus: "pending_onboarding",
        });
      }

      // Create an account link for onboarding
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/account?tab=seller&refresh=true`,
        return_url: `${baseUrl}/account?tab=seller&onboarding=complete`,
        type: "account_onboarding",
      });

      return res.json({ 
        url: accountLink.url,
        accountId,
      });
    } catch (error) {
      console.error("Stripe Connect onboarding error:", error);
      return res.status(500).json({ error: "Failed to start seller onboarding" });
    }
  });

  // Check if Stripe Connect onboarding is complete
  app.get("/api/seller/onboarding-status", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user || !user.stripeConnectAccountId) {
        return res.json({ 
          hasAccount: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      
      const onboardingComplete = account.details_submitted && 
        account.charges_enabled && 
        account.payouts_enabled;

      // Update user status if onboarding is newly complete
      if (onboardingComplete && !user.stripeConnectOnboardingComplete) {
        await storage.updateUser(user.id, {
          stripeConnectOnboardingComplete: true,
          sellerStatus: "active",
          sellerEnabledAt: new Date().toISOString(),
        });
      }

      return res.json({
        hasAccount: true,
        onboardingComplete,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch (error) {
      console.error("Stripe Connect status check error:", error);
      return res.status(500).json({ error: "Failed to check onboarding status" });
    }
  });

  // Get seller earnings and sales history
  app.get("/api/seller/earnings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get all sales for this seller
      const sales = await storage.getTemplatePurchasesBySeller(user.id);
      
      // Get payout history
      const payouts = await storage.getSellerPayouts(user.id);

      // Calculate stats
      const totalEarnings = sales
        .filter(s => s.status === "completed")
        .reduce((sum, s) => sum + s.sellerEarningsCents, 0);
      
      const pendingBalance = user.pendingPayoutCents || 0;
      const paidOut = payouts
        .filter(p => p.status === "completed")
        .reduce((sum, p) => sum + p.amountCents, 0);

      return res.json({
        totalEarnings,
        pendingBalance,
        paidOut,
        totalSales: sales.filter(s => s.status === "completed").length,
        sales: sales.slice(0, 50), // Last 50 sales
        payouts: payouts.slice(0, 20), // Last 20 payouts
      });
    } catch (error) {
      console.error("Get seller earnings error:", error);
      return res.status(500).json({ error: "Failed to get seller earnings" });
    }
  });

  // Create checkout session for purchasing a paid template
  app.post("/api/templates/:id/purchase", requireAuth, async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      if (!template.isPaid || !template.priceCents || template.priceCents <= 0) {
        return res.status(400).json({ error: "This template is free" });
      }

      // Check if user already purchased this template
      const templateId = template.id!;
      const existingPurchase = await storage.getTemplatePurchase(req.user!.id, templateId);
      if (existingPurchase && existingPurchase.status === "completed") {
        return res.status(400).json({ error: "You already own this template" });
      }

      // Can't buy your own template
      if (template.authorId === req.user!.id) {
        return res.status(400).json({ error: "You cannot purchase your own template" });
      }

      // Get seller's Stripe Connect account
      const seller = await storage.getUserById(template.authorId);
      if (!seller || !seller.stripeConnectAccountId || !seller.stripeConnectOnboardingComplete) {
        return res.status(400).json({ error: "Seller account is not set up" });
      }

      // Calculate fees: 30% platform, 70% seller
      const platformFeeCents = Math.round(template.priceCents * (PLATFORM_FEE_PERCENTAGE / 100));
      const sellerEarningsCents = template.priceCents - platformFeeCents;

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      // Create Stripe Checkout session with application fee
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: template.title,
                description: `PowerShell Template by ${seller.name}`,
              },
              unit_amount: template.priceCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: platformFeeCents,
          transfer_data: {
            destination: seller.stripeConnectAccountId,
          },
        },
        success_url: `${baseUrl}/marketplace/${templateId}?purchase=success`,
        cancel_url: `${baseUrl}/marketplace/${templateId}?purchase=canceled`,
        metadata: {
          templateId: templateId,
          buyerId: req.user!.id,
          sellerId: template.authorId,
          priceCents: template.priceCents.toString(),
          platformFeeCents: platformFeeCents.toString(),
          sellerEarningsCents: sellerEarningsCents.toString(),
        },
      });

      // Create pending purchase record
      await storage.createTemplatePurchase({
        templateId: templateId,
        buyerId: req.user!.id,
        sellerId: template.authorId,
        priceCents: template.priceCents,
        platformFeeCents,
        sellerEarningsCents,
        stripeCheckoutSessionId: session.id,
        status: "pending",
      });

      return res.json({ url: session.url });
    } catch (error) {
      console.error("Template purchase error:", error);
      return res.status(500).json({ error: "Failed to create purchase session" });
    }
  });

  // Check if user has purchased a template
  app.get("/api/templates/:id/ownership", requireAuth, async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // User owns their own templates
      if (template.authorId === req.user!.id) {
        return res.json({ owned: true, isAuthor: true });
      }

      // Free templates are owned by everyone
      if (!template.isPaid || !template.priceCents || template.priceCents <= 0) {
        return res.json({ owned: true, isFree: true });
      }

      // Check for completed purchase
      const purchase = await storage.getTemplatePurchase(req.user!.id, template.id!);
      const owned = purchase && purchase.status === "completed";

      return res.json({ 
        owned, 
        purchase: purchase ? {
          purchasedAt: purchase.purchasedAt,
          priceCents: purchase.priceCents,
        } : null,
      });
    } catch (error) {
      console.error("Check template ownership error:", error);
      return res.status(500).json({ error: "Failed to check ownership" });
    }
  });

  // Get user's purchased templates
  app.get("/api/user/purchases", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getTemplatePurchasesByBuyer(req.user!.id);
      
      // Get template details for each purchase
      const purchasesWithTemplates = await Promise.all(
        purchases
          .filter((p: any) => p.status === "completed")
          .map(async (purchase: any) => {
            const template = await storage.getTemplate(purchase.templateId);
            const seller = await storage.getUserById(purchase.sellerId);
            return {
              ...purchase,
              template: template ? {
                id: template.id,
                title: template.title,
                description: template.description,
              } : null,
              sellerName: seller?.name || "Unknown",
            };
          })
      );

      return res.json(purchasesWithTemplates);
    } catch (error) {
      console.error("Get user purchases error:", error);
      return res.status(500).json({ error: "Failed to get purchases" });
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

  // Pro Conversion Analytics
  app.get("/api/admin/pro-conversion-analytics", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getProConversionAnalytics();
      return res.json(analytics);
    } catch (error) {
      console.error("Pro conversion analytics error:", error);
      return res.status(500).json({ error: "Failed to fetch pro conversion analytics" });
    }
  });

  app.post("/api/admin/users/:id/stats-adjust", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { scriptsCreated, timeSavedMinutes, firstScriptDate } = req.body;

      if (typeof scriptsCreated !== 'number' || typeof timeSavedMinutes !== 'number') {
        return res.status(400).json({ error: "scriptsCreated and timeSavedMinutes must be numbers" });
      }

      if (scriptsCreated < 0 || timeSavedMinutes < 0) {
        return res.status(400).json({ error: "Values cannot be negative" });
      }

      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const parsedDate = firstScriptDate ? new Date(firstScriptDate) : undefined;
      await storage.adjustUserStats(id, scriptsCreated, timeSavedMinutes, parsedDate);
      
      const updatedStats = await storage.getUserStats(id);
      return res.json({ success: true, stats: updatedStats });
    } catch (error) {
      console.error("Admin stats adjust error:", error);
      return res.status(500).json({ error: "Failed to adjust user stats" });
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
        lastLoginAt: u.lastLoginAt,
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
      let downgraded = 0;
      let errors = 0;
      const details: Array<{ userId: string; email: string; status: string; message?: string }> = [];

      // First, downgrade subscribers who have no Stripe customer ID
      const subscribersWithoutStripe = users.filter(u => u.role === 'subscriber' && !u.stripeCustomerId);
      for (const user of subscribersWithoutStripe) {
        await storage.updateUser(user.id, { role: "free" });
        downgraded++;
        details.push({
          userId: user.id,
          email: user.email,
          status: "downgraded",
          message: "Downgraded to free (no Stripe customer ID)"
        });
      }

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
            // No active subscription found - downgrade if currently a subscriber
            if (user.role === "subscriber") {
              await storage.updateUser(user.id, { role: "free" });
              updated++;
              details.push({
                userId: user.id,
                email: user.email,
                status: "downgraded",
                message: "Downgraded to free (no active Stripe subscription)"
              });
            } else {
              details.push({
                userId: user.id,
                email: user.email,
                status: "no_subscription",
                message: "No active Stripe subscription found"
              });
            }
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
          total: usersWithStripe.length + subscribersWithoutStripe.length,
          upgraded: updated,
          downgraded,
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
