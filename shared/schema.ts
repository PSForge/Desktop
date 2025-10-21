import { z } from "zod";

export const parameterTypes = ["string", "int", "boolean", "switch", "array", "path"] as const;
export type ParameterType = typeof parameterTypes[number];

export const commandCategories = [
  "File System",
  "Registry",
  "Network",
  "Active Directory",
  "System Administration",
  "Security",
  "Process Management",
  "Event Logs",
  "Services",
  "Variables & Data",
  "Azure",
  "Exchange Online",
  "Azure AD",
  "SharePoint",
  "MECM",
  "Exchange Server",
  "Hyper-V",
  "Windows Server",
] as const;
export type CommandCategory = typeof commandCategories[number];

export const parameterSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(parameterTypes),
  description: z.string(),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  value: z.any().optional(),
});

export const commandSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(commandCategories),
  description: z.string(),
  syntax: z.string(),
  parameters: z.array(parameterSchema),
  example: z.string().optional(),
});

export const scriptCommandSchema = z.object({
  id: z.string(),
  commandId: z.string(),
  commandName: z.string(),
  parameters: z.record(z.any()),
  order: z.number(),
});

export const scriptSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  commands: z.array(scriptCommandSchema),
  createdAt: z.string().optional(),
});

export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    line: z.number().optional(),
    message: z.string(),
    severity: z.enum(["error", "warning", "info"]),
  })),
  warnings: z.array(z.string()).optional(),
});

export const insertScriptCommandSchema = scriptCommandSchema.omit({ id: true });
export const insertScriptSchema = scriptSchema.omit({ id: true, createdAt: true });
export const insertValidationRequestSchema = z.object({
  code: z.string(),
});

export type Parameter = z.infer<typeof parameterSchema>;
export type Command = z.infer<typeof commandSchema>;
export type ScriptCommand = z.infer<typeof scriptCommandSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type InsertScriptCommand = z.infer<typeof insertScriptCommandSchema>;
export type InsertScript = z.infer<typeof insertScriptSchema>;
export type InsertValidationRequest = z.infer<typeof insertValidationRequestSchema>;
