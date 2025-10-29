import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedAdminAccount() {
  const adminEmail = "admin@psforge.com";
  
  const existingAdmin = await storage.getUserByEmail(adminEmail);
  if (existingAdmin) {
    console.log("Admin account already exists");
    return existingAdmin;
  }

  const adminPassword = await hashPassword("PSForge@dmin2025!Secure");

  const adminUser = await storage.createUser({
    email: adminEmail,
    passwordHash: adminPassword,
    name: "PSForge Administrator",
    role: "admin",
    stripeCustomerId: null,
  });

  console.log("✓ Admin account created");
  console.log("  Email: admin@psforge.com");
  console.log("  Password: PSForge@dmin2025!Secure");
  console.log("  Please change the password after first login!");

  return adminUser;
}
