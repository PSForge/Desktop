import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedAdminAccount() {
  // Seed premium subscription plan
  const existingPlan = await storage.getSubscriptionPlan("premium");
  if (!existingPlan) {
    await storage.createSubscriptionPlan({
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
    });
    console.log("✓ Premium subscription plan created");
  }

  // Seed admin account
  const adminEmail = "admin@psforge.com";
  
  const existingAdmin = await storage.getUserByEmail(adminEmail);
  if (existingAdmin) {
    console.log("✓ Admin account already exists");
    return existingAdmin;
  }

  const adminPassword = await hashPassword("PSForge@dmin2025!Secure");

  const adminUser = await storage.createUser({
    email: adminEmail,
    passwordHash: adminPassword,
    name: "PSForge Administrator",
    role: "admin",
    stripeCustomerId: null,
    referralSource: null,
  });

  console.log("✓ Admin account created");
  console.log("  Email: admin@psforge.com");
  console.log("  Password: PSForge@dmin2025!Secure");
  console.log("  Please change the password after first login!");

  return adminUser;
}
