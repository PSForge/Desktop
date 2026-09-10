const AI_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  hi: "Hindi",
  ar: "Arabic",
};

export function normalizeAiLocale(locale: unknown): string {
  return typeof locale === "string" && Object.prototype.hasOwnProperty.call(AI_LANGUAGE_NAMES, locale)
    ? locale
    : "en";
}

export function getAiLanguageInstruction(locale: unknown): string {
  const normalizedLocale = normalizeAiLocale(locale);
  const language = AI_LANGUAGE_NAMES[normalizedLocale] || AI_LANGUAGE_NAMES.en;
  return `Respond in ${language}. Preserve PowerShell code, cmdlet names, module names, object property names, file paths, registry paths, command output, and quoted error text exactly as technical content. Translate explanations, issue titles, recommendations, summaries, and user-facing guidance into ${language}.`;
}
