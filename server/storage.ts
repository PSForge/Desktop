import { type Script, type InsertScript } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getScript(id: string): Promise<Script | undefined>;
  getAllScripts(): Promise<Script[]>;
  createScript(script: InsertScript): Promise<Script>;
  updateScript(id: string, script: Partial<InsertScript>): Promise<Script | undefined>;
  deleteScript(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private scripts: Map<string, Script>;

  constructor() {
    this.scripts = new Map();
  }

  async getScript(id: string): Promise<Script | undefined> {
    return this.scripts.get(id);
  }

  async getAllScripts(): Promise<Script[]> {
    return Array.from(this.scripts.values());
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
}

export const storage = new MemStorage();
