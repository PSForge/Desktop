import { useEffect, useState } from "react";
import { getDesktopStorageItem, setDesktopStorageItem } from "@/lib/desktop";

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
  | "workspace"
  | "appSettings"
  | "cancel"
  | "languageReloadDescription"
  | "languageUpdated"
  | "manageDesktopSettings"
  | "reloadWithSelectedLanguage"
  | "addFavorite"
  | "addToScript"
  | "commandLibraryTitle"
  | "commandLibraryDescription"
  | "commands"
  | "compactCommandCards"
  | "editMenu"
  | "expandedCommandCards"
  | "exportOpsBundle"
  | "exporting"
  | "favorites"
  | "hidden"
  | "hideSection"
  | "machineReadinessSignals"
  | "moduleHintsFound"
  | "noCommandsFound"
  | "ops"
  | "opsSuite"
  | "opsSuiteDescription"
  | "opsTools"
  | "opsToolsDescription"
  | "predictedEffects"
  | "readiness"
  | "recentCommands"
  | "removeFavorite"
  | "resultsGroupedByPlatform"
  | "reviewItems"
  | "safetyNotes"
  | "searchCommands"
  | "showHiddenSections"
  | "switchCards"
  | "tryDifferentSearch"
  | "copySyntax"
  | "buildReviewRunDescription"
  | "activeScript"
  | "additionalContext"
  | "aiAssistant"
  | "aiAssistantDescription"
  | "aiWelcomeMessage"
  | "after"
  | "all"
  | "analysisFailed"
  | "analysisResults"
  | "analyzeLog"
  | "analyzing"
  | "analyzingLogFile"
  | "appHealthLooksCalm"
  | "appHealthNotesAvailable"
  | "appHealthReviewSuggested"
  | "appHealthHighAttention"
  | "available"
  | "asWritten"
  | "before"
  | "cached"
  | "categories"
  | "chooseCategoryLeft"
  | "chooseFocus"
  | "chooseModeLaunchPowerShell"
  | "clickToBrowseLog"
  | "comingSoon"
  | "connectAccount"
  | "copy"
  | "copyToClipboard"
  | "couldNotPreselectWorkflow"
  | "critical"
  | "currentScript"
  | "dryRun"
  | "dismiss"
  | "duration"
  | "environmentChecks"
  | "generatedScript"
  | "generateScript"
  | "execute"
  | "failedAnalyzeLog"
  | "failed"
  | "explainFailureWithAi"
  | "fastReviewBeforeChecks"
  | "foundAt"
  | "gitToolsDescription"
  | "guiBuilderDescription"
  | "guiScriptBuilder"
  | "impactItems"
  | "issuesFound"
  | "latestRecent"
  | "lastRun"
  | "lastRunEvidence"
  | "loadingAiWorkspace"
  | "loadingBuilderLibrary"
  | "loadingScripts"
  | "loadingWizard"
  | "local"
  | "localEdits"
  | "localRecentFile"
  | "liveReadActiveScript"
  | "logFile"
  | "logTroubleshooter"
  | "logTroubleshooterDescription"
  | "newAnalysis"
  | "newScript"
  | "noScriptGeneratedYet"
  | "optional"
  | "mode"
  | "modules"
  | "noAnalysisYet"
  | "noDesktopRunsYet"
  | "noQuickAnalysisIssues"
  | "noQuickAnalysisProblems"
  | "noRecentFiles"
  | "noLocalRecentScripts"
  | "noStartersMatchSearch"
  | "noWebScriptsMatchView"
  | "open"
  | "openOrSaveScript"
  | "openRunFolder"
  | "orPasteLogContent"
  | "params"
  | "pastedLogContent"
  | "pasteLogContentHere"
  | "platform"
  | "platformSelectionSummary"
  | "prepare"
  | "prepareDescription"
  | "problemActions"
  | "projectWorkspaceDescription"
  | "projectWorkspaceTitle"
  | "quickAccessRecentFiles"
  | "preventionTips"
  | "ready"
  | "recentFilesLabel"
  | "reportOnly"
  | "readOnlyBias"
  | "recommendedFix"
  | "review"
  | "rootCause"
  | "reviewRisks"
  | "risksAndReadiness"
  | "runPreflightDeeper"
  | "runSetup"
  | "savedState"
  | "saveScriptFirst"
  | "scriptIntelligence"
  | "sendToEditor"
  | "sentToScriptEditor"
  | "searchLibrary"
  | "shell"
  | "selectACategory"
  | "selectTasks"
  | "selectTasksDescription"
  | "selectTasksHelp"
  | "show"
  | "hide"
  | "basic"
  | "full"
  | "preview"
  | "line"
  | "lines"
  | "tools"
  | "format"
  | "hideLibrary"
  | "scriptEditorHelper"
  | "scriptEditorPlaceholder"
  | "powershellScriptEditor"
  | "addCommandsGeneratedCode"
  | "previous"
  | "next"
  | "startOver"
  | "selected"
  | "bulkOperationCsvRequired"
  | "nextConfigureParameters"
  | "runDoctor"
  | "running"
  | "copyCheck"
  | "selectPlatform"
  | "selectPlatforms"
  | "selectPlatformsDescription"
  | "selectPlatformsHelp"
  | "setParametersBeforeExecution"
  | "standard"
  | "steps"
  | "starters"
  | "stepOf"
  | "sync"
  | "synced"
  | "tasks"
  | "taskListHeading"
  | "tasksAddedSoon"
  | "transcript"
  | "totalRunsSummary"
  | "unavailable"
  | "unsavedDraft"
  | "unknown"
  | "uploadLogAndSelectPlatform"
  | "uploadLogFileHere"
  | "uploadLogForAi"
  | "useThisScript"
  | "web"
  | "warnings"
  | "workarounds"
  | "workflow"
  | "workflowFocusHint"
  | "workflowFocusNone"
  | "workspaceActions"
  | "add"
  | "askPowerShellCommands"
  | "copied"
  | "customPowerShellScript"
  | "suggestedCommands"
  | "you";

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
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
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
  workbench: "Workbench",
  workspace: "Workspace",
  appSettings: "App Settings",
  cancel: "Cancel",
  languageReloadDescription: "PSForge is reloading with your selected language.",
  languageUpdated: "Language updated",
  manageDesktopSettings: "Manage desktop settings.",
  reloadWithSelectedLanguage: "Reload with Selected Language",
  addFavorite: "Add favorite",
  addToScript: "Add to script",
  commandLibraryTitle: "Command Library 2.0",
  commandLibraryDescription: "Platform packs, favorites, and reusable PowerShell commands",
  commands: "commands",
  buildReviewRunDescription: "Build, review, and run scripts from one focused workspace.",
  compactCommandCards: "Compact command cards",
  copySyntax: "Copy syntax",
  editMenu: "Edit menu",
  expandedCommandCards: "Expanded command cards",
  exporting: "Exporting...",
  exportOpsBundle: "Export Ops Bundle",
  favorites: "Favorites",
  hidden: "Hidden:",
  hideSection: "Hide {section}",
  machineReadinessSignals: "machine readiness signals",
  moduleHintsFound: "module hints found",
  noCommandsFound: "No commands found",
  ops: "Ops",
  opsSuite: "Ops Suite",
  opsSuiteDescription: "Turn the active script into diagnostics, tests, deployment packages, documentation, safety reviews, data mapping, support bundles, and certification records.",
  opsTools: "Ops tools",
  opsToolsDescription: "Select one tool at a time to keep the review focused.",
  predictedEffects: "predicted effects",
  readiness: "{score}% ready",
  recentCommands: "Recent commands",
  removeFavorite: "Remove favorite",
  resultsGroupedByPlatform: "{count} result{plural}, grouped by platform",
  reviewItems: "review items",
  safetyNotes: "Safety notes",
  searchCommands: "Search commands...",
  showHiddenSections: "Show hidden sections",
  switchCards: "Switch to {mode} cards",
  tryDifferentSearch: "Try a different search term",
  activeScript: "Active script",
  additionalContext: "Additional Context",
  aiAssistant: "AI Assistant",
  aiAssistantDescription: "Describe your automation needs in plain English",
  aiWelcomeMessage: "Hi, I'm your PSForge AI assistant. Ask me to build, explain, troubleshoot, or improve a PowerShell script.",
  after: "After",
  all: "All",
  analysisFailed: "Analysis failed",
  analysisResults: "Analysis Results",
  analyzeLog: "Analyze Log",
  analyzing: "Analyzing...",
  analyzingLogFile: "Analyzing your log file...",
  appHealthLooksCalm: "Looks calm",
  appHealthNotesAvailable: "Notes available",
  appHealthReviewSuggested: "Review suggested",
  appHealthHighAttention: "High attention",
  available: "available",
  asWritten: "As written",
  before: "Before",
  cached: "Cached",
  categories: "Categories",
  chooseCategoryLeft: "Choose a category from the list on the left to view available automation tasks",
  chooseFocus: "Choose Focus",
  chooseModeLaunchPowerShell: "Choose mode and launch PowerShell.",
  clickToBrowseLog: "or click to browse (.log, .txt, .json, .xml, .csv)",
  comingSoon: "Coming Soon",
  connectAccount: "Connect Account",
  copy: "Copy",
  copyToClipboard: "Copied to clipboard",
  couldNotPreselectWorkflow: "We couldn't preselect this workflow - pick your platform below.",
  critical: "Critical",
  currentScript: "Current Script",
  dryRun: "Dry Run",
  dismiss: "Dismiss",
  duration: "Duration",
  environmentChecks: "Environment checks",
  generatedScript: "Generated Script",
  generateScript: "Generate Script",
  execute: "Execute",
  failedAnalyzeLog: "Failed to analyze the log file. Please try again.",
  failed: "failed",
  explainFailureWithAi: "Explain failure with AI",
  fastReviewBeforeChecks: "Fast review before deeper AI or preflight checks.",
  foundAt: "Found at",
  gitToolsDescription: "Git tools can package, diff, and commit the active script from the dedicated Git workspace.",
  guiBuilderDescription: "Select a category to build configuration scripts with an easy-to-use interface",
  guiScriptBuilder: "GUI Script Builder",
  impactItems: "Impact items",
  issuesFound: "Issues Found",
  latestRecent: "Latest recent",
  lastRun: "Last Run",
  lastRunEvidence: "Last run evidence and follow-up.",
  loadingAiWorkspace: "Loading AI workspace...",
  loadingBuilderLibrary: "Loading builder library...",
  loadingScripts: "Loading scripts from your PSForge web account...",
  loadingWizard: "Loading wizard...",
  local: "Local",
  localEdits: "Local edits",
  localRecentFile: "Local recent file",
  liveReadActiveScript: "Live read on the active script.",
  logFile: "Log File",
  logTroubleshooter: "Log Troubleshooter",
  logTroubleshooterDescription: "Upload a log file for AI-powered diagnosis and fix recommendations.",
  newAnalysis: "Start New Analysis",
  newScript: "New script",
  noScriptGeneratedYet: "No script generated yet",
  optional: "optional",
  mode: "Mode",
  modules: "Modules",
  noAnalysisYet: "No analysis yet",
  noDesktopRunsYet: "No desktop runs yet.",
  noQuickAnalysisIssues: "No quick-analysis issues",
  noQuickAnalysisProblems: "No quick-analysis problems",
  noRecentFiles: "No recent files",
  noLocalRecentScripts: "No local recent scripts match this view.",
  noStartersMatchSearch: "No starters match this search.",
  noWebScriptsMatchView: "No web scripts match this view.",
  open: "Open",
  openOrSaveScript: "Open or save a script to start the list.",
  openRunFolder: "Run folder",
  orPasteLogContent: "Or paste log content",
  params: "Params",
  pastedLogContent: "Pasted log content",
  pasteLogContentHere: "Paste your log content here...",
  platform: "Platform",
  platformSelectionSummary: "{platforms} platform{platformPlural} selected - {tasks} task{taskPlural} available",
  prepare: "Prepare",
  prepareDescription: "Check the script before execution.",
  problemActions: "Problem Actions",
  projectWorkspaceDescription: "Recent files, active draft, and recovery context.",
  projectWorkspaceTitle: "Project Workspace 2.0",
  quickAccessRecentFiles: "Quick access is available from the Recent Files dialog.",
  preventionTips: "Prevention Tips",
  ready: "Ready",
  recentFilesLabel: "Recent files",
  reportOnly: "Report Only",
  readOnlyBias: "Read-only bias",
  recommendedFix: "Recommended Fix",
  review: "Review",
  rootCause: "Root Cause",
  reviewRisks: "Review risks",
  risksAndReadiness: "Risks And Readiness",
  runPreflightDeeper: "Run preflight for deeper dependency, impact, and readiness checks.",
  runSetup: "Run setup",
  savedState: "Saved state",
  saveScriptFirst: "Save script first",
  scriptIntelligence: "Script Intelligence",
  sendToEditor: "Send to Editor",
  sentToScriptEditor: "Sent to Script Editor",
  searchLibrary: "Search Library",
  shell: "Shell",
  selectACategory: "Select a Category",
  selectTasks: "Select Tasks",
  selectTasksDescription: "Choose automation tasks to include in your bulk script. Tasks will execute in the order selected.",
  selectTasksHelp: "Select tasks in the order they should execute for each item in your bulk operation.",
  show: "Show",
  hide: "Hide",
  basic: "Basic",
  full: "Full",
  preview: "Preview",
  line: "line",
  lines: "lines",
  tools: "Tools",
  format: "Format",
  hideLibrary: "Hide Library",
  scriptEditorHelper: "Type your script or click commands from the sidebar - Hover over cmdlets for help",
  scriptEditorPlaceholder: "Start typing your PowerShell script here...",
  powershellScriptEditor: "PowerShell Script Editor",
  addCommandsGeneratedCode: "Add commands to see the generated PowerShell code",
  previous: "Previous",
  next: "Next",
  startOver: "Start Over",
  selected: "selected",
  bulkOperationCsvRequired: "Bulk operation detected - CSV data will be required after parameter configuration",
  nextConfigureParameters: "Next step: Configure parameters for your selected tasks",
  runDoctor: "Run Doctor",
  running: "Running...",
  copyCheck: "Copy check",
  selectPlatform: "Select platform...",
  selectPlatforms: "Select Platforms",
  selectPlatformsDescription: "Choose one or more IT platforms for your bulk automation tasks",
  selectPlatformsHelp: "Select the platforms where you want to perform operations. You can combine tasks from multiple platforms in a single script.",
  setParametersBeforeExecution: "Set parameters, transcript capture, notes, and elevation before execution.",
  standard: "Standard",
  steps: "Steps",
  starters: "Starters",
  stepOf: "Step {current} of {total}",
  sync: "Sync",
  synced: "Synced",
  tasks: "tasks",
  taskListHeading: "{category} tasks",
  tasksAddedSoon: "Tasks for {category} will be added soon",
  transcript: "Transcript",
  totalRunsSummary: "{total} total run{plural} - {failed} failed",
  unavailable: "Unavailable",
  unsavedDraft: "Unsaved draft",
  unknown: "Unknown",
  uploadLogAndSelectPlatform: "Upload a log file and select a platform to get started.",
  uploadLogFileHere: "Drop log file here",
  uploadLogForAi: "The AI is examining issues and preparing recommendations.",
  useThisScript: "Use This Script",
  web: "Web",
  warnings: "Warnings",
  workarounds: "Workarounds",
  workflow: "Workflow",
  workflowFocusHint: "Pick a focus once and we'll keep one useful next step close to the editor.",
  workflowFocusNone: "No workflow focus selected",
  workspaceActions: "Workspace Actions",
  add: "Add",
  askPowerShellCommands: "Ask about PowerShell commands...",
  copied: "Copied",
  customPowerShellScript: "Custom PowerShell Script",
  suggestedCommands: "Suggested commands:",
  you: "You",
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
    appSettings: "Configuracion de la aplicacion",
    cancel: "Cancelar",
    languageReloadDescription: "PSForge se esta recargando con el idioma seleccionado.",
    languageUpdated: "Idioma actualizado",
    manageDesktopSettings: "Administra la configuracion de escritorio.",
    reloadWithSelectedLanguage: "Recargar con el idioma seleccionado",
    addFavorite: "Agregar favorito",
    addToScript: "Agregar al script",
    commandLibraryTitle: "Biblioteca de comandos 2.0",
    commandLibraryDescription: "Paquetes de plataforma, favoritos y comandos de PowerShell reutilizables",
    commands: "comandos",
    buildReviewRunDescription: "Crea, revisa y ejecuta scripts desde un espacio de trabajo enfocado.",
    copySyntax: "Copiar sintaxis",
    editMenu: "Menu de edicion",
    exportOpsBundle: "Exportar paquete de Ops",
    favorites: "Favoritos",
    hidden: "Oculto:",
    hideSection: "Ocultar {section}",
    moduleHintsFound: "sugerencias de modulos encontradas",
    noCommandsFound: "No se encontraron comandos",
    opsSuite: "Ops Suite",
    ops: "Ops",
    opsSuiteDescription: "Convierte el script activo en diagnosticos, pruebas, paquetes de implementacion, documentacion, revisiones de seguridad, mapeo de datos, paquetes de soporte y registros de certificacion.",
    opsTools: "Herramientas de Ops",
    opsToolsDescription: "Selecciona una herramienta a la vez para mantener la revision enfocada.",
    recentCommands: "Comandos recientes",
    removeFavorite: "Quitar favorito",
    searchCommands: "Buscar comandos...",
    tryDifferentSearch: "Prueba con otro termino de busqueda",
    activeScript: "Script activo",
    additionalContext: "Contexto adicional",
    aiAssistant: "Asistente de IA",
    aiAssistantDescription: "Describe tus necesidades de automatizacion en lenguaje natural",
    aiWelcomeMessage: "Hola, soy tu asistente de IA de PSForge. Pideme que cree, explique, solucione o mejore un script de PowerShell.",
    after: "Despues",
    all: "Todos",
    analysisFailed: "Error en el analisis",
    analysisResults: "Resultados del analisis",
    analyzeLog: "Analizar registro",
    analyzing: "Analizando...",
    analyzingLogFile: "Analizando el archivo de registro...",
    appHealthLooksCalm: "Todo tranquilo",
    appHealthNotesAvailable: "Notas disponibles",
    appHealthReviewSuggested: "Revision sugerida",
    appHealthHighAttention: "Alta atencion",
    available: "disponibles",
    asWritten: "Tal como esta escrito",
    before: "Antes",
    cached: "En cache",
    categories: "Categorias",
    chooseCategoryLeft: "Elige una categoria de la lista de la izquierda para ver las tareas de automatizacion disponibles",
    chooseFocus: "Elegir enfoque",
    chooseModeLaunchPowerShell: "Elige el modo e inicia PowerShell.",
    clickToBrowseLog: "o haz clic para buscar (.log, .txt, .json, .xml, .csv)",
    comingSoon: "Proximamente",
    connectAccount: "Conectar cuenta",
    copy: "Copiar",
    copyToClipboard: "Copiado al portapapeles",
    couldNotPreselectWorkflow: "No pudimos preseleccionar este flujo de trabajo - elige tu plataforma abajo.",
    critical: "Critico",
    currentScript: "Script actual",
    dryRun: "Simulacion",
    dismiss: "Descartar",
    duration: "Duracion",
    environmentChecks: "Comprobaciones del entorno",
    generatedScript: "Script generado",
    generateScript: "Generar script",
    execute: "Ejecutar",
    failedAnalyzeLog: "No se pudo analizar el archivo de registro. Intentalo de nuevo.",
    failed: "fallidas",
    explainFailureWithAi: "Explicar error con IA",
    fastReviewBeforeChecks: "Revision rapida antes de comprobaciones mas profundas de IA o preflight.",
    foundAt: "Encontrado en",
    gitToolsDescription: "Las herramientas de Git pueden empaquetar, comparar y confirmar el script activo desde el espacio de Git dedicado.",
    guiBuilderDescription: "Selecciona una categoria para crear scripts de configuracion con una interfaz facil de usar",
    guiScriptBuilder: "Constructor visual de scripts",
    impactItems: "Elementos de impacto",
    issuesFound: "Problemas encontrados",
    latestRecent: "Mas reciente",
    lastRun: "Ultima ejecucion",
    lastRunEvidence: "Evidencia de la ultima ejecucion y seguimiento.",
    loadingAiWorkspace: "Cargando espacio de IA...",
    loadingBuilderLibrary: "Cargando biblioteca del constructor...",
    loadingScripts: "Cargando scripts desde tu cuenta web de PSForge...",
    loadingWizard: "Cargando asistente...",
    local: "Local",
    localEdits: "Ediciones locales",
    localRecentFile: "Archivo local reciente",
    liveReadActiveScript: "Lectura en vivo del script activo.",
    logFile: "Archivo de registro",
    logTroubleshooter: "Solucionador de registros",
    logTroubleshooterDescription: "Carga un archivo de registro para diagnostico con IA y recomendaciones de correccion.",
    newAnalysis: "Iniciar nuevo analisis",
    newScript: "Nuevo script",
    noScriptGeneratedYet: "Aun no se genero ningun script",
    optional: "opcional",
    mode: "Modo",
    modules: "Modulos",
    noAnalysisYet: "Sin analisis todavia",
    noDesktopRunsYet: "Aun no hay ejecuciones de escritorio.",
    noQuickAnalysisIssues: "Sin problemas de analisis rapido",
    noQuickAnalysisProblems: "Sin problemas de analisis rapido",
    noRecentFiles: "Sin archivos recientes",
    noLocalRecentScripts: "Ningun script reciente local coincide con esta vista.",
    noStartersMatchSearch: "Ningun inicial coincide con esta busqueda.",
    noWebScriptsMatchView: "Ningun script web coincide con esta vista.",
    open: "Abrir",
    openOrSaveScript: "Abre o guarda un script para iniciar la lista.",
    openRunFolder: "Carpeta de ejecucion",
    orPasteLogContent: "O pega el contenido del registro",
    params: "parametros",
    pastedLogContent: "Contenido de registro pegado",
    pasteLogContentHere: "Pega el contenido del registro aqui...",
    platform: "Plataforma",
    platformSelectionSummary: "{platforms} plataforma{platformPlural} seleccionada{platformPlural} - {tasks} tarea{taskPlural} disponible{taskPlural}",
    prepare: "Preparar",
    prepareDescription: "Comprueba el script antes de ejecutarlo.",
    problemActions: "Acciones de problemas",
    projectWorkspaceDescription: "Archivos recientes, borrador activo y contexto de recuperacion.",
    projectWorkspaceTitle: "Espacio de proyecto 2.0",
    quickAccessRecentFiles: "El acceso rapido esta disponible desde el cuadro de archivos recientes.",
    preventionTips: "Consejos de prevencion",
    ready: "Listo",
    recentFilesLabel: "Archivos recientes",
    reportOnly: "Solo informe",
    readOnlyBias: "Preferencia de solo lectura",
    recommendedFix: "Correccion recomendada",
    review: "Revisar",
    rootCause: "Causa raiz",
    reviewRisks: "Revisar riesgos",
    risksAndReadiness: "Riesgos y preparacion",
    runPreflightDeeper: "Ejecuta preflight para comprobaciones mas profundas de dependencias, impacto y preparacion.",
    runSetup: "Configurar ejecucion",
    savedState: "Estado guardado",
    saveScriptFirst: "Guardar script primero",
    scriptIntelligence: "Inteligencia del script",
    sendToEditor: "Enviar al editor",
    sentToScriptEditor: "Enviado al editor de scripts",
    searchLibrary: "Buscar en la biblioteca",
    shell: "Shell",
    selectACategory: "Selecciona una categoria",
    selectTasks: "Seleccionar tareas",
    selectTasksDescription: "Elige las tareas de automatizacion que se incluiran en tu script masivo. Las tareas se ejecutaran en el orden seleccionado.",
    selectTasksHelp: "Selecciona las tareas en el orden en que deben ejecutarse para cada elemento de la operacion masiva.",
    show: "Mostrar",
    hide: "Ocultar",
    basic: "Basico",
    full: "Completo",
    preview: "Vista previa",
    line: "linea",
    lines: "lineas",
    tools: "Herramientas",
    format: "Formato",
    hideLibrary: "Ocultar biblioteca",
    scriptEditorHelper: "Escribe tu script o haz clic en comandos de la barra lateral - Pasa el cursor sobre los cmdlets para obtener ayuda",
    scriptEditorPlaceholder: "Empieza a escribir tu script de PowerShell aqui...",
    powershellScriptEditor: "Editor de scripts de PowerShell",
    addCommandsGeneratedCode: "Agrega comandos para ver el codigo de PowerShell generado",
    previous: "Anterior",
    next: "Siguiente",
    startOver: "Empezar de nuevo",
    selected: "seleccionadas",
    bulkOperationCsvRequired: "Se detecto una operacion masiva - se requeriran datos CSV despues de configurar los parametros",
    nextConfigureParameters: "Siguiente paso: configura los parametros de las tareas seleccionadas",
    runDoctor: "Ejecutar doctor",
    running: "Ejecutando...",
    copyCheck: "Copiar comprobacion",
    selectPlatform: "Seleccionar plataforma...",
    selectPlatforms: "Seleccionar plataformas",
    selectPlatformsDescription: "Elige una o mas plataformas de TI para tus tareas de automatizacion masiva",
    selectPlatformsHelp: "Selecciona las plataformas donde quieres realizar operaciones. Puedes combinar tareas de varias plataformas en un solo script.",
    setParametersBeforeExecution: "Configura parametros, transcripcion, notas y elevacion antes de ejecutar.",
    standard: "Estandar",
    steps: "Pasos",
    starters: "Iniciales",
    stepOf: "Paso {current} de {total}",
    sync: "Sincronizar",
    synced: "Sincronizado",
    tasks: "tareas",
    taskListHeading: "Tareas de {category}",
    tasksAddedSoon: "Las tareas de {category} se agregaran pronto",
    transcript: "Transcripcion",
    totalRunsSummary: "{total} ejecucion{plural} en total - {failed} fallidas",
    unavailable: "No disponible",
    unsavedDraft: "Borrador sin guardar",
    unknown: "Desconocido",
    uploadLogAndSelectPlatform: "Carga un archivo de registro y selecciona una plataforma para empezar.",
    uploadLogFileHere: "Suelta el archivo de registro aqui",
    uploadLogForAi: "La IA esta examinando problemas y preparando recomendaciones.",
    useThisScript: "Usar este script",
    web: "Web",
    warnings: "Advertencias",
    workarounds: "Soluciones alternativas",
    workflow: "Flujo de trabajo",
    workflowFocusHint: "Elige un enfoque y mantendremos un siguiente paso util cerca del editor.",
    workflowFocusNone: "No se selecciono ningun enfoque de flujo de trabajo",
    workspaceActions: "Acciones del espacio de trabajo",
    add: "Agregar",
    askPowerShellCommands: "Pregunta sobre comandos de PowerShell...",
    copied: "Copiado",
    customPowerShellScript: "Script de PowerShell personalizado",
    suggestedCommands: "Comandos sugeridos:",
    you: "Tu",
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
    appSettings: "Parametres de l'application",
    cancel: "Annuler",
    languageReloadDescription: "PSForge se recharge avec la langue selectionnee.",
    languageUpdated: "Langue mise a jour",
    manageDesktopSettings: "Gerer les parametres du bureau.",
    reloadWithSelectedLanguage: "Recharger avec la langue selectionnee",
    addFavorite: "Ajouter aux favoris",
    addToScript: "Ajouter au script",
    commandLibraryTitle: "Bibliotheque de commandes 2.0",
    commandLibraryDescription: "Packs de plateforme, favoris et commandes PowerShell reutilisables",
    commands: "commandes",
    copySyntax: "Copier la syntaxe",
    editMenu: "Menu d'edition",
    exportOpsBundle: "Exporter le bundle Ops",
    favorites: "Favoris",
    hidden: "Masque :",
    hideSection: "Masquer {section}",
    noCommandsFound: "Aucune commande trouvee",
    opsSuite: "Suite Ops",
    ops: "Ops",
    opsTools: "Outils Ops",
    recentCommands: "Commandes recentes",
    removeFavorite: "Retirer des favoris",
    searchCommands: "Rechercher des commandes...",
    tryDifferentSearch: "Essayez un autre terme de recherche",
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
    appSettings: "App-Einstellungen",
    cancel: "Abbrechen",
    languageReloadDescription: "PSForge wird mit der ausgewählten Sprache neu geladen.",
    languageUpdated: "Sprache aktualisiert",
    manageDesktopSettings: "Desktop-Einstellungen verwalten.",
    reloadWithSelectedLanguage: "Mit ausgewählter Sprache neu laden",
    addFavorite: "Favorit hinzufugen",
    addToScript: "Zum Skript hinzufugen",
    commandLibraryTitle: "Befehlsbibliothek 2.0",
    commandLibraryDescription: "Plattformpakete, Favoriten und wiederverwendbare PowerShell-Befehle",
    commands: "Befehle",
    copySyntax: "Syntax kopieren",
    editMenu: "Bearbeitungsmenü",
    exportOpsBundle: "Ops-Paket exportieren",
    favorites: "Favoriten",
    hidden: "Ausgeblendet:",
    hideSection: "{section} ausblenden",
    noCommandsFound: "Keine Befehle gefunden",
    opsSuite: "Ops Suite",
    ops: "Ops",
    opsTools: "Ops-Tools",
    recentCommands: "Letzte Befehle",
    removeFavorite: "Favorit entfernen",
    searchCommands: "Befehle suchen...",
    tryDifferentSearch: "Versuchen Sie einen anderen Suchbegriff",
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
    appSettings: "Configuracoes do aplicativo",
    cancel: "Cancelar",
    languageReloadDescription: "O PSForge esta recarregando com o idioma selecionado.",
    languageUpdated: "Idioma atualizado",
    manageDesktopSettings: "Gerencie as configuracoes da area de trabalho.",
    reloadWithSelectedLanguage: "Recarregar com o idioma selecionado",
    addFavorite: "Adicionar favorito",
    addToScript: "Adicionar ao script",
    commandLibraryTitle: "Biblioteca de comandos 2.0",
    commandLibraryDescription: "Pacotes de plataforma, favoritos e comandos PowerShell reutilizaveis",
    commands: "comandos",
    copySyntax: "Copiar sintaxe",
    editMenu: "Menu de edicao",
    exportOpsBundle: "Exportar pacote Ops",
    favorites: "Favoritos",
    hidden: "Oculto:",
    hideSection: "Ocultar {section}",
    noCommandsFound: "Nenhum comando encontrado",
    opsSuite: "Suite Ops",
    ops: "Ops",
    opsTools: "Ferramentas Ops",
    recentCommands: "Comandos recentes",
    removeFavorite: "Remover favorito",
    searchCommands: "Pesquisar comandos...",
    tryDifferentSearch: "Tente outro termo de pesquisa",
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
    appSettings: "Impostazioni app",
    cancel: "Annulla",
    languageReloadDescription: "PSForge si sta ricaricando con la lingua selezionata.",
    languageUpdated: "Lingua aggiornata",
    manageDesktopSettings: "Gestisci le impostazioni desktop.",
    reloadWithSelectedLanguage: "Ricarica con la lingua selezionata",
    addFavorite: "Aggiungi preferito",
    addToScript: "Aggiungi allo script",
    commandLibraryTitle: "Libreria comandi 2.0",
    commandLibraryDescription: "Pacchetti piattaforma, preferiti e comandi PowerShell riutilizzabili",
    commands: "comandi",
    copySyntax: "Copia sintassi",
    editMenu: "Menu modifica",
    exportOpsBundle: "Esporta pacchetto Ops",
    favorites: "Preferiti",
    hidden: "Nascosto:",
    hideSection: "Nascondi {section}",
    noCommandsFound: "Nessun comando trovato",
    opsSuite: "Suite Ops",
    ops: "Ops",
    opsTools: "Strumenti Ops",
    recentCommands: "Comandi recenti",
    removeFavorite: "Rimuovi preferito",
    searchCommands: "Cerca comandi...",
    tryDifferentSearch: "Prova un altro termine di ricerca",
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
    appSettings: "App-instellingen",
    cancel: "Annuleren",
    languageReloadDescription: "PSForge wordt opnieuw geladen met de geselecteerde taal.",
    languageUpdated: "Taal bijgewerkt",
    manageDesktopSettings: "Beheer desktopinstellingen.",
    reloadWithSelectedLanguage: "Opnieuw laden met geselecteerde taal",
    addFavorite: "Favoriet toevoegen",
    addToScript: "Aan script toevoegen",
    commandLibraryTitle: "Opdrachtbibliotheek 2.0",
    commandLibraryDescription: "Platformpakketten, favorieten en herbruikbare PowerShell-opdrachten",
    commands: "opdrachten",
    copySyntax: "Syntaxis kopieren",
    editMenu: "Bewerkingsmenu",
    exportOpsBundle: "Ops-bundel exporteren",
    favorites: "Favorieten",
    hidden: "Verborgen:",
    hideSection: "{section} verbergen",
    noCommandsFound: "Geen opdrachten gevonden",
    opsSuite: "Ops Suite",
    ops: "Ops",
    opsTools: "Ops-hulpmiddelen",
    recentCommands: "Recente opdrachten",
    removeFavorite: "Favoriet verwijderen",
    searchCommands: "Opdrachten zoeken...",
    tryDifferentSearch: "Probeer een andere zoekterm",
  },
  ja: {
    ...en,
    aiActions: "AI アクション",
    aiReview: "AI レビュー",
    app: "アプリ",
    checkUpdates: "更新を確認",
    checkingUpdates: "更新を確認中",
    command: "コマンド",
    details: "詳細",
    file: "ファイル",
    language: "言語",
    library: "ライブラリ",
    logs: "ログ",
    problems: "問題",
    run: "実行",
    runCenter: "実行センター",
    wizard: "ウィザード",
    work: "作業",
    workbench: "ワークベンチ",
    workspace: "ワークスペース",
    appSettings: "アプリ設定",
    cancel: "キャンセル",
    languageReloadDescription: "PSForge は選択した言語で再読み込みしています。",
    languageUpdated: "言語を更新しました",
    manageDesktopSettings: "デスクトップ設定を管理します。",
    reloadWithSelectedLanguage: "選択した言語で再読み込み",
    addToScript: "スクリプトに追加",
    commandLibraryTitle: "コマンド ライブラリ 2.0",
    commands: "コマンド",
    copySyntax: "構文をコピー",
    favorites: "お気に入り",
    noCommandsFound: "コマンドが見つかりません",
    ops: "Ops",
    opsSuite: "Ops スイート",
    opsTools: "Ops ツール",
    recentCommands: "最近のコマンド",
    searchCommands: "コマンドを検索...",
  },
  ko: {
    ...en,
    aiActions: "AI 작업",
    aiReview: "AI 검토",
    app: "앱",
    command: "명령",
    details: "세부 정보",
    file: "파일",
    language: "언어",
    library: "라이브러리",
    logs: "로그",
    problems: "문제",
    run: "실행",
    runCenter: "실행 센터",
    wizard: "마법사",
    work: "작업",
    workbench: "워크벤치",
    workspace: "작업 영역",
    appSettings: "앱 설정",
    cancel: "취소",
    languageReloadDescription: "선택한 언어로 PSForge를 다시 로드합니다.",
    languageUpdated: "언어가 업데이트되었습니다",
    manageDesktopSettings: "데스크톱 설정을 관리합니다.",
    reloadWithSelectedLanguage: "선택한 언어로 다시 로드",
    addToScript: "스크립트에 추가",
    commandLibraryTitle: "명령 라이브러리 2.0",
    commands: "명령",
    copySyntax: "구문 복사",
    favorites: "즐겨찾기",
    noCommandsFound: "명령을 찾을 수 없습니다",
    opsSuite: "Ops 제품군",
    opsTools: "Ops 도구",
    recentCommands: "최근 명령",
    searchCommands: "명령 검색...",
  },
  zh: {
    ...en,
    aiActions: "AI 操作",
    aiReview: "AI 审查",
    app: "应用",
    command: "命令",
    details: "详细信息",
    file: "文件",
    language: "语言",
    library: "库",
    logs: "日志",
    problems: "问题",
    run: "运行",
    runCenter: "运行中心",
    wizard: "向导",
    work: "工作",
    workbench: "工作台",
    workspace: "工作区",
    appSettings: "应用设置",
    cancel: "取消",
    languageReloadDescription: "PSForge 正在使用所选语言重新加载。",
    languageUpdated: "语言已更新",
    manageDesktopSettings: "管理桌面设置。",
    reloadWithSelectedLanguage: "使用所选语言重新加载",
    addToScript: "添加到脚本",
    commandLibraryTitle: "命令库 2.0",
    commands: "命令",
    copySyntax: "复制语法",
    favorites: "收藏",
    noCommandsFound: "未找到命令",
    opsSuite: "Ops 套件",
    opsTools: "Ops 工具",
    recentCommands: "最近命令",
    searchCommands: "搜索命令...",
  },
  hi: {
    ...en,
    aiActions: "AI क्रियाएं",
    aiReview: "AI समीक्षा",
    app: "ऐप",
    command: "कमांड",
    details: "विवरण",
    file: "फ़ाइल",
    language: "भाषा",
    library: "लाइब्रेरी",
    logs: "लॉग",
    problems: "समस्याएं",
    run: "चलाएं",
    runCenter: "रन सेंटर",
    wizard: "विज़ार्ड",
    work: "कार्य",
    workbench: "वर्कबेंच",
    workspace: "वर्कस्पेस",
    appSettings: "ऐप सेटिंग",
    cancel: "रद्द करें",
    languageReloadDescription: "PSForge आपकी चुनी गई भाषा के साथ फिर से लोड हो रहा है.",
    languageUpdated: "भाषा अपडेट हुई",
    manageDesktopSettings: "डेस्कटॉप सेटिंग प्रबंधित करें.",
    reloadWithSelectedLanguage: "चुनी गई भाषा के साथ फिर से लोड करें",
    addToScript: "स्क्रिप्ट में जोड़ें",
    commandLibraryTitle: "कमांड लाइब्रेरी 2.0",
    commands: "कमांड",
    copySyntax: "सिंटैक्स कॉपी करें",
    favorites: "पसंदीदा",
    noCommandsFound: "कोई कमांड नहीं मिला",
    opsSuite: "Ops सुइट",
    opsTools: "Ops उपकरण",
    recentCommands: "हाल के कमांड",
    searchCommands: "कमांड खोजें...",
  },
  ar: {
    ...en,
    aiActions: "إجراءات الذكاء الاصطناعي",
    aiReview: "مراجعة الذكاء الاصطناعي",
    app: "التطبيق",
    command: "الأمر",
    details: "التفاصيل",
    file: "ملف",
    language: "اللغة",
    library: "المكتبة",
    logs: "السجلات",
    problems: "المشكلات",
    run: "تشغيل",
    runCenter: "مركز التشغيل",
    wizard: "المعالج",
    work: "العمل",
    workbench: "منضدة العمل",
    workspace: "مساحة العمل",
    appSettings: "إعدادات التطبيق",
    cancel: "إلغاء",
    languageReloadDescription: "يعيد PSForge التحميل باللغة المحددة.",
    languageUpdated: "تم تحديث اللغة",
    manageDesktopSettings: "إدارة إعدادات سطح المكتب.",
    reloadWithSelectedLanguage: "إعادة التحميل باللغة المحددة",
    addToScript: "إضافة إلى البرنامج النصي",
    commandLibraryTitle: "مكتبة الأوامر 2.0",
    commands: "أوامر",
    copySyntax: "نسخ الصيغة",
    favorites: "المفضلة",
    noCommandsFound: "لم يتم العثور على أوامر",
    opsSuite: "مجموعة العمليات",
    opsTools: "أدوات العمليات",
    recentCommands: "الأوامر الأخيرة",
    searchCommands: "البحث عن أوامر...",
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

export function useDesktopLocale() {
  const [locale, setLocale] = useState<LocaleCode>(() => getStoredLocale());

  useEffect(() => {
    const updateLocale = () => setLocale(getStoredLocale());
    window.addEventListener("psforge:locale-change", updateLocale);
    return () => window.removeEventListener("psforge:locale-change", updateLocale);
  }, []);

  return {
    locale,
    direction: getLocaleDirection(locale),
    t: (key: TranslationKey, replacements?: Record<string, string | number>) => translate(locale, key, replacements),
  };
}
