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
  | "copySyntax";

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
    copySyntax: "Copiar sintaxis",
    editMenu: "Menu de edicion",
    exportOpsBundle: "Exportar paquete de Ops",
    favorites: "Favoritos",
    hidden: "Oculto:",
    hideSection: "Ocultar {section}",
    moduleHintsFound: "sugerencias de modulos encontradas",
    noCommandsFound: "No se encontraron comandos",
    opsSuite: "Ops Suite",
    ops: "Operaciones",
    opsSuiteDescription: "Convierte el script activo en diagnosticos, pruebas, paquetes de implementacion, documentacion, revisiones de seguridad, mapeo de datos, paquetes de soporte y registros de certificacion.",
    opsTools: "Herramientas de Ops",
    opsToolsDescription: "Selecciona una herramienta a la vez para mantener la revision enfocada.",
    recentCommands: "Comandos recientes",
    removeFavorite: "Quitar favorito",
    searchCommands: "Buscar comandos...",
    tryDifferentSearch: "Prueba con otro termino de busqueda",
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
