import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedAdminAccount() {
  const adminEmail = "admin@psforge.com";
  
  const existingAdmin = await storage.getUserByEmail(adminEmail);
  if (existingAdmin) {
    console.log("Admin account already exists");
    return existingAdmin;
  }

  const adminPassword = await hashPassword("admin123");

  const adminUser = await storage.createUser({
    email: adminEmail,
    passwordHash: adminPassword,
    name: "PSForge Administrator",
    role: "admin",
    stripeCustomerId: null,
  });

  console.log("✓ Admin account created");
  console.log("  Email: admin@psforge.com");
  console.log("  Password: admin123");
  console.log("  Please change the password after first login!");

  return adminUser;
}
