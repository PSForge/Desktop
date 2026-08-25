export type LocaleCode =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "it"
  | "nl"
  | "ja"
  | "ko"
  | "zh"
  | "hi"
  | "ar";

export type TranslationKey =
  | "ai"
  | "aiActions"
  | "aiReview"
  | "aiWorkspace"
  | "app"
  | "checkUpdates"
  | "checkingUpdates"
  | "collapse"
  | "collapseDetailsDrawer"
  | "command"
  | "commandPalettePlaceholder"
  | "details"
  | "expandDetailsDrawer"
  | "file"
  | "folder"
  | "git"
  | "gitActions"
  | "gitWorkspace"
  | "language"
  | "library"
  | "logs"
  | "navigation"
  | "noMatchingCommand"
  | "openAiWorkspace"
  | "openCommandLibrary"
  | "openGitWorkspace"
  | "openLastRunFolder"
  | "openLastTranscript"
  | "openRecentFiles"
  | "openReview"
  | "openRunCenter"
  | "openScript"
  | "openScriptWorkspace"
  | "openWizard"
  | "preflight"
  | "problems"
  | "recent"
  | "replacePlaceholders"
  | "rerunLastSetup"
  | "run"
  | "runAiReview"
  | "runCenter"
  | "runPreflight"
  | "runScript"
  | "scriptTools"
  | "showGitDetails"
  | "showProblems"
  | "showScriptIntelligence"
  | "showWorkspaceDetails"
  | "updateAvailable"
  | "updateReady"
  | "updating"
  | "wizard"
  | "work"
  | "workbench"
  | "workspace";

type TranslationTable = Record<TranslationKey, string>;

export const PSFORGE_LOCALE_STORAGE_KEY = "psforge-locale";

export const supportedLocales: Array<{ code: LocaleCode; label: string; nativeLabel: string; dir?: "ltr" | "rtl" }> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Espanol" },
  { code: "fr", label: "French", nativeLabel: "Francais" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "pt", label: "Portuguese", nativeLabel: "Portugues" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { code: "ja", label: "Japanese", nativeLabel: "Japanese" },
  { code: "ko", label: "Korean", nativeLabel: "Korean" },
  { code: "zh", label: "Chinese", nativeLabel: "Chinese" },
  { code: "hi", label: "Hindi", nativeLabel: "Hindi" },
  { code: "ar", label: "Arabic", nativeLabel: "Arabic", dir: "rtl" },
];

const en: TranslationTable = {
  ai: "AI",
  aiActions: "AI Actions",
  aiReview: "AI Review",
  aiWorkspace: "AI Workspace",
  app: "App",
  checkUpdates: "Check updates",
  checkingUpdates: "Checking updates",
  collapse: "Collapse",
  collapseDetailsDrawer: "Collapse Details Drawer",
  command: "Command",
  commandPalettePlaceholder: "Search commands, workbench actions, and navigation...",
  details: "Details",
  expandDetailsDrawer: "Open Details Drawer",
  file: "File",
  folder: "Folder",
  git: "Git",
  gitActions: "Git Actions",
  gitWorkspace: "Git Workspace",
  language: "Language",
  library: "Library",
  logs: "Logs",
  navigation: "Navigation",
  noMatchingCommand: "No matching command found.",
  openAiWorkspace: "Open AI Workspace",
  openCommandLibrary: "Open Command Library",
  openGitWorkspace: "Open Git Workspace",
  openLastRunFolder: "Open Last Run Folder",
  openLastTranscript: "Open Last Transcript",
  openRecentFiles: "Open Recent Files",
  openReview: "Open review",
  openRunCenter: "Open Run Center",
  openScript: "Open Script",
  openScriptWorkspace: "Open Script Workspace",
  openWizard: "Open Wizard",
  preflight: "Preflight",
  problems: "Problems",
  recent: "recent",
  replacePlaceholders: "Replace Placeholders",
  rerunLastSetup: "Rerun Last Setup",
  run: "Run",
  runAiReview: "Run AI Review",
  runCenter: "Run Center",
  runPreflight: "Run Preflight",
  runScript: "Run Script",
  scriptTools: "Script Tools",
  showGitDetails: "Show Git Details",
  showProblems: "Show Problems",
  showScriptIntelligence: "Show Script Intelligence",
  showWorkspaceDetails: "Show Workspace Details",
  updateAvailable: "Update available",
  updateReady: "Update ready",
  updating: "Updating",
  wizard: "Wizard",
  work: "Work",
  workbench: "2.0 Workbench",
  workspace: "Workspace",
};

const translations: Record<LocaleCode, TranslationTable> = {
  en,
  es: {
    ...en,
    aiActions: "Acciones de IA",
    aiReview: "Revision con IA",
    app: "Aplicacion",
    checkUpdates: "Buscar actualizaciones",
    checkingUpdates: "Buscando actualizaciones",
    collapse: "Contraer",
    command: "Comando",
    details: "Detalles",
    file: "Archivo",
    folder: "Carpeta",
    gitActions: "Acciones de Git",
    language: "Idioma",
    library: "Biblioteca",
    logs: "Registros",
    navigation: "Navegacion",
    noMatchingCommand: "No se encontro ningun comando.",
    openRecentFiles: "Abrir archivos recientes",
    preflight: "Preflight",
    problems: "Problemas",
    recent: "recientes",
    run: "Ejecutar",
    runCenter: "Centro de ejecucion",
    runScript: "Ejecutar script",
    scriptTools: "Herramientas de script",
    wizard: "Asistente",
    work: "Trabajo",
    workspace: "Espacio de trabajo",
  },
  fr: {
    ...en,
    aiActions: "Actions IA",
    aiReview: "Revision IA",
    app: "Application",
    checkUpdates: "Verifier les mises a jour",
    checkingUpdates: "Verification des mises a jour",
    collapse: "Reduire",
    command: "Commande",
    details: "Details",
    file: "Fichier",
    folder: "Dossier",
    language: "Langue",
    library: "Bibliotheque",
    logs: "Journaux",
    navigation: "Navigation",
    noMatchingCommand: "Aucune commande trouvee.",
    problems: "Problemes",
    recent: "recents",
    run: "Executer",
    runCenter: "Centre d'execution",
    runScript: "Executer le script",
    wizard: "Assistant",
    work: "Travail",
    workspace: "Espace de travail",
  },
  de: {
    ...en,
    aiActions: "KI-Aktionen",
    aiReview: "KI-Prufung",
    app: "App",
    checkUpdates: "Nach Updates suchen",
    checkingUpdates: "Updates werden gepruft",
    collapse: "Einklappen",
    command: "Befehl",
    details: "Details",
    file: "Datei",
    folder: "Ordner",
    language: "Sprache",
    library: "Bibliothek",
    logs: "Protokolle",
    navigation: "Navigation",
    noMatchingCommand: "Kein passender Befehl gefunden.",
    problems: "Probleme",
    recent: "zuletzt",
    run: "Ausfuhren",
    runCenter: "Ausfuhrungscenter",
    runScript: "Skript ausfuhren",
    wizard: "Assistent",
    work: "Arbeit",
    workspace: "Arbeitsbereich",
  },
  pt: {
    ...en,
    aiActions: "Acoes de IA",
    aiReview: "Revisao por IA",
    app: "Aplicativo",
    checkUpdates: "Verificar atualizacoes",
    checkingUpdates: "Verificando atualizacoes",
    collapse: "Recolher",
    command: "Comando",
    details: "Detalhes",
    file: "Arquivo",
    folder: "Pasta",
    language: "Idioma",
    library: "Biblioteca",
    logs: "Logs",
    navigation: "Navegacao",
    noMatchingCommand: "Nenhum comando encontrado.",
    problems: "Problemas",
    recent: "recentes",
    run: "Executar",
    runCenter: "Centro de execucao",
    runScript: "Executar script",
    wizard: "Assistente",
    work: "Trabalho",
    workspace: "Area de trabalho",
  },
  it: {
    ...en,
    aiActions: "Azioni IA",
    aiReview: "Revisione IA",
    app: "App",
    checkUpdates: "Controlla aggiornamenti",
    checkingUpdates: "Controllo aggiornamenti",
    collapse: "Comprimi",
    command: "Comando",
    details: "Dettagli",
    file: "File",
    folder: "Cartella",
    language: "Lingua",
    library: "Libreria",
    logs: "Log",
    navigation: "Navigazione",
    noMatchingCommand: "Nessun comando trovato.",
    problems: "Problemi",
    recent: "recenti",
    run: "Esegui",
    runCenter: "Centro esecuzioni",
    runScript: "Esegui script",
    wizard: "Procedura guidata",
    work: "Lavoro",
    workspace: "Area di lavoro",
  },
  nl: {
    ...en,
    aiActions: "AI-acties",
    aiReview: "AI-controle",
    app: "App",
    checkUpdates: "Controleren op updates",
    checkingUpdates: "Updates controleren",
    collapse: "Inklappen",
    command: "Opdracht",
    details: "Details",
    file: "Bestand",
    folder: "Map",
    language: "Taal",
    library: "Bibliotheek",
    logs: "Logboeken",
    navigation: "Navigatie",
    noMatchingCommand: "Geen opdracht gevonden.",
    problems: "Problemen",
    recent: "recent",
    run: "Uitvoeren",
    runCenter: "Uitvoercentrum",
    runScript: "Script uitvoeren",
    wizard: "Wizard",
    work: "Werk",
    workspace: "Werkruimte",
  },
  ja: {
    ...en,
    aiActions: "AI Actions",
    aiReview: "AI Review",
    app: "App",
    checkUpdates: "Check updates",
    checkingUpdates: "Checking updates",
    command: "Command",
    details: "Details",
    file: "File",
    language: "Language",
    library: "Library",
    logs: "Logs",
    problems: "Problems",
    run: "Run",
    runCenter: "Run Center",
    wizard: "Wizard",
    work: "Work",
    workspace: "Workspace",
  },
  ko: {
    ...en,
    language: "Language",
  },
  zh: {
    ...en,
    language: "Language",
  },
  hi: {
    ...en,
    language: "Language",
  },
  ar: {
    ...en,
    language: "Language",
  },
};

function normalizeLocale(value?: string | null): LocaleCode {
  const normalized = String(value || "").trim().toLowerCase();
  const base = normalized.split(/[-_]/)[0] as LocaleCode;
  return supportedLocales.some((locale) => locale.code === base) ? base : "en";
}

export function getStoredLocale(): LocaleCode {
  if (typeof window === "undefined") {
    return "en";
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeLocale(
    getDesktopStorageItem(PSFORGE_LOCALE_STORAGE_KEY)
      || params.get("psforgeLocale")
      || window.localStorage.getItem(PSFORGE_LOCALE_STORAGE_KEY)
      || window.navigator.language,
  );
}

export function setStoredLocale(locale: LocaleCode) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedLocale = normalizeLocale(locale);
  window.localStorage.setItem(PSFORGE_LOCALE_STORAGE_KEY, normalizedLocale);
  setDesktopStorageItem(PSFORGE_LOCALE_STORAGE_KEY, normalizedLocale);
  window.dispatchEvent(new CustomEvent("psforge:locale-change"));
}

export function getLocaleDirection(locale: LocaleCode) {
  return supportedLocales.find((item) => item.code === locale)?.dir || "ltr";
}

export function translate(locale: LocaleCode, key: TranslationKey, replacements?: Record<string, string | number>) {
  let value = translations[locale]?.[key] || en[key] || key;
  for (const [name, replacement] of Object.entries(replacements || {})) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}
import { getDesktopStorageItem, setDesktopStorageItem } from "@/lib/desktop";
