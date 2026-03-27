import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { NotificationBanner } from "@/components/notification-banner";
import logoTransparent from "@assets/Full Logo Transparent_1761565796152.png";
import logoLight from "@assets/Full Logo_1761565796152.png";
import iconLogo from "@assets/Icon_1761565796152.png";
import iconTransparent from "@assets/Icon transparent_1761566958254.png";
import logoFullTransparent from "@assets/Full Logo Transparent_1761567685412.png";
import {
  Sparkles,
  Terminal,
  CheckCircle2,
  ArrowRight,
  Code2,
  User,
  LogIn,
  Lock,
  Zap,
  Shield,
  Cloud,
  Server,
  Database,
  Network,
  Cpu,
  HardDrive,
  Users,
  Settings,
  Wand2,
  Package,
  GitBranch,
  Star,
  DollarSign,
  TrendingUp,
  BadgeDollarSign,
  Wrench,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  Upload,
  ScanSearch,
  ClipboardList,
  Download,
  Key,
  Monitor,
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  
  const isAdmin = user?.role === "admin";

  const freeTierFeatures = [
    "8 core platforms (File System, Network, Services, Process Management, Event Logs, Active Directory, Registry, Security)",
    "400+ automation tasks",
    "Visual builder + direct coding modes",
    "Download unlimited .ps1 scripts",
    "Automatic saving",
    "Security validation built-in",
  ];

  const proTierFeatures = [
    "Everything in Free, plus:",
    "CLI Companion—run psforge diagnose, explain, analyze-log & validate directly from your terminal",
    "AI Log Troubleshooter—upload any log file and get instant diagnosis, fix scripts & workarounds",
    "AI script assistant (describe tasks in plain English)",
    "48 enterprise platforms (Exchange, Azure, AWS, VMware, SharePoint, Microsoft 365, and 42 more)",
    "2,400+ automation tasks across all platforms",
    "Marketplace access (coming soon)—sell scripts & keep 70% of every sale",
    "GitHub integration (sync scripts to repositories)",
    "Priority support (email response within 24 hours)",
    "Early access to new platforms and features",
  ];

  const enterprisePlatforms = [
    { name: "Azure AD / Entra ID", icon: Cloud, color: "text-blue-500" },
    { name: "AWS Cloud", icon: Cloud, color: "text-orange-500" },
    { name: "Google Cloud (GCP)", icon: Cloud, color: "text-red-500" },
    { name: "VMware vSphere", icon: Server, color: "text-green-500" },
    { name: "Docker & Kubernetes", icon: Database, color: "text-cyan-500" },
    { name: "CrowdStrike Falcon", icon: Shield, color: "text-red-600" },
    { name: "Microsoft Teams", icon: Users, color: "text-purple-500" },
    { name: "Okta Identity", icon: Lock, color: "text-blue-600" },
    { name: "Intune / MECM", icon: Settings, color: "text-indigo-500" },
    { name: "ServiceNow", icon: Database, color: "text-green-600" },
    { name: "Hyper-V", icon: Cpu, color: "text-cyan-500" },
    { name: "Fortinet Security", icon: Shield, color: "text-red-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <img 
              src={logoFullTransparent} 
              alt="PSForge Logo" 
              className="h-12 w-auto cursor-pointer"
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <Link href="/account">
                  <Button size="sm" variant="outline" className="gap-2" data-testid="button-account">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                </Link>
                <Link href="/builder">
                  <Button size="sm" className="gap-2" data-testid="button-get-started">
                    <ArrowRight className="h-4 w-4" />
                    <span className="hidden sm:inline">Go to</span> Builder
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost" className="gap-2" data-testid="button-login">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="gap-2" data-testid="button-signup">
                    Sign Up
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <NotificationBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-cyan-500/10" />
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="max-w-5xl mx-auto">
            {/* Logo showcase */}
            <div className="flex justify-center mb-8">
              <img 
                src={iconTransparent} 
                alt="PSForge Icon" 
                className="h-24 sm:h-32 w-auto animate-in fade-in duration-1000"
              />
            </div>

            <div className="text-center space-y-6">
              <Badge variant="default" className="mb-4">
                <Sparkles className="h-3 w-3 mr-1" />
                Version 6.0 — New: CLI Companion + AI Log Troubleshooter
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Stop Googling PowerShell Syntax.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                  Start Automating in 5 Minutes.
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                PSForge generates enterprise-ready PowerShell scripts for Exchange, Azure, SharePoint, and 48 enterprise platforms—no syntax memorization required. Build visually, ask AI, or code directly. Your choice.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-6">
                {!user ? (
                  <>
                    <Link href="/signup">
                      <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-hero-signup">
                        Create Your First Script Free—No Credit Card
                      </Button>
                    </Link>
                    <a href="#how-it-works">
                      <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                        See How It Works
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </a>
                  </>
                ) : (
                  <Link href="/builder">
                    <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-start-building">
                      <Code2 className="h-5 w-5" />
                      Open Builder
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's New in Version 6.0 */}
      <section className="border-y bg-gradient-to-br from-orange-500/5 via-cyan-500/5 to-blue-500/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center mb-10">
            <Badge variant="default" className="mb-4 bg-primary">
              <Sparkles className="h-3 w-3 mr-1" />
              New in Version 6.0
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Two Major Pro Features. One Subscription.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Version 6.0 ships the CLI Companion and AI Log Troubleshooter—bringing PSForge intelligence to your terminal and your log files.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-6">
            {/* CLI Companion featured card */}
            <Card className="hover-elevate transition-all border-cyan-500/40 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Terminal className="h-6 w-6 text-cyan-500" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  CLI Companion
                  <Badge className="text-xs bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">Pro</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  PSForge intelligence directly in your terminal. Diagnose error codes, analyze log files, explain scripts, and validate PowerShell—without opening a browser. Works on Windows, macOS, and Linux.
                </p>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Available via npm or standalone .exe
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  AI-powered diagnose, explain & analyze-log
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Free commands: validate, scripts list/get
                </div>
                <Link href="/cli" className="block mt-4">
                  <Button size="sm" className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700" data-testid="button-get-cli">
                    <Terminal className="h-4 w-4" />
                    Get the CLI
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* AI Log Troubleshooter featured card */}
            <Card className="hover-elevate transition-all border-orange-500/40 bg-gradient-to-br from-orange-500/5 to-amber-500/5">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                  <Wrench className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  AI Log Troubleshooter
                  <Badge className="text-xs bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30">Pro</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Upload any log file—Windows Event Logs, service logs, application logs—and get instant AI-powered diagnosis with severity-rated issues, root cause analysis, and ready-to-run PowerShell remediation scripts.
                </p>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Supports 50 enterprise platforms
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  PowerShell fix scripts included
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  No file size limit
                </div>
                <Link href={user ? "/builder?tab=troubleshooter" : "/signup"} className="block mt-4">
                  <Button size="sm" className="w-full gap-2 bg-orange-600 hover:bg-orange-700" data-testid="button-try-troubleshooter">
                    <Wrench className="h-4 w-4" />
                    {user ? "Try It Now" : "Get Pro Access"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Card className="hover-elevate transition-all border-primary/30">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  Templates Marketplace
                  {!isAdmin && <Badge variant="secondary" className="text-xs">Coming Soon</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Browse and install PowerShell script templates shared by the community. Discover proven solutions, rate templates, and buy premium scripts from expert creators.
                </p>
                {isAdmin ? (
                  <Link href="/marketplace">
                    <Button variant="outline" size="sm" className="w-full gap-2" data-testid="button-explore-marketplace">
                      Explore Marketplace
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" className="w-full gap-2" disabled data-testid="button-explore-marketplace">
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <GitBranch className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle>GitHub Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Connect your GitHub account to sync scripts directly to your repositories. Manage branches, commit changes, and maintain version control—all from PSForge.
                </p>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  OAuth authentication
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Branch management
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* AI Log Troubleshooter Deep Dive */}
      <section className="py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* Announcement header */}
          <div className="max-w-4xl mx-auto text-center mb-14">
            <Badge className="mb-5 px-4 py-1.5 text-sm bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Introducing AI Log Troubleshooter — Pro Feature
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              Stop Drowning in Log Files.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                Get Answers in Seconds.
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Every IT pro has been there—a cryptic error, a wall of log output, and no idea where to start. AI Log Troubleshooter changes that. Upload the log, pick your platform, and get a full diagnosis with PowerShell fix scripts handed to you instantly.
            </p>
          </div>

          {/* How it works — step flow */}
          <div className="max-w-5xl mx-auto mb-16">
            <h3 className="text-center text-lg font-semibold text-muted-foreground mb-8 uppercase tracking-wider">How it works</h3>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                  <Upload className="h-7 w-7 text-orange-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1">1. Upload Your Log</div>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or paste any log file. Supports <span className="font-medium text-foreground">.log, .txt, .json, .xml, .csv, .evtx</span> from any source—Windows Event Viewer, service logs, application output, or cloud platform logs. No file size limit.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <ScanSearch className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1">2. AI Diagnoses the Problem</div>
                  <p className="text-sm text-muted-foreground">
                    Select your platform (Active Directory, Exchange, Azure, VMware, and 47 more). Add optional context—like "this started after a Windows update"—and the AI reads the entire log, identifies every error and anomaly, and pinpoints the root cause.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <ClipboardList className="h-7 w-7 text-green-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1">3. Run the Fix</div>
                  <p className="text-sm text-muted-foreground">
                    Get a structured report with every issue severity-rated, a plain-English explanation, a step-by-step fix, and a production-ready PowerShell remediation script. Send any script straight to the Script Editor with one click.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature breakdown grid */}
          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
            <Card className="hover-elevate transition-all border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                </div>
                <CardTitle className="text-base">Severity Classification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Every issue found in the log is rated Critical, Error, Warning, or Info—so you know exactly what to fix first and what can wait.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-red-500 font-medium"><ShieldAlert className="h-3.5 w-3.5" /> Critical — system down or data loss risk</div>
                  <div className="flex items-center gap-2 text-orange-500 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Error — functionality broken</div>
                  <div className="flex items-center gap-2 text-yellow-500 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Warning — degraded performance</div>
                  <div className="flex items-center gap-2 text-blue-500 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Info — noteworthy but not harmful</div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                  <ScanSearch className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="text-base">Root Cause Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The AI doesn't just list errors—it reads the full log in context and identifies the single underlying cause driving all the symptoms. No more chasing cascading failures down a rabbit hole.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                  <Terminal className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-base">PowerShell Fix Scripts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  For every fixable issue, the AI generates a production-ready PowerShell script with full error handling. Click <span className="font-medium text-foreground">"Send to Editor"</span> to push it straight into your Script tab—ready to review and run.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                  <Wrench className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-base">Step-by-Step Workarounds</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sometimes you need to keep systems running while a permanent fix is applied. The Troubleshooter provides immediate workarounds with numbered steps and PowerShell scripts to restore service fast.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                  <Lightbulb className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle className="text-base">Prevention Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  After fixing the immediate issue, the AI explains what caused it and gives concrete, platform-specific prevention tips to stop it from happening again.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                  <Server className="h-5 w-5 text-cyan-500" />
                </div>
                <CardTitle className="text-base">50 Platforms Supported</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Understands logs from every platform in the PSForge library—Microsoft, cloud, security, virtualization, and more.
                </p>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Active Directory · Exchange Online · Azure AD · VMware · Intune · CrowdStrike · ServiceNow · AWS · Hyper-V · SQL Server · and 40 more
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA banner */}
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-8 text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Ready to stop guessing and start fixing?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                AI Log Troubleshooter is included with every Pro subscription at $5/month. Cancel anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={user ? "/builder?tab=troubleshooter" : "/signup"}>
                  <Button size="lg" className="gap-2 bg-orange-600 hover:bg-orange-700 w-full sm:w-auto" data-testid="button-troubleshooter-cta">
                    <Wrench className="h-5 w-5" />
                    {user ? "Open Troubleshooter" : "Get Pro — $5/month"}
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                    See All Pro Features
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLI Companion Deep Dive */}
      <section className="py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* Announcement header */}
          <div className="max-w-4xl mx-auto text-center mb-14">
            <Badge className="mb-5 px-4 py-1.5 text-sm bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">
              <Terminal className="h-3.5 w-3.5 mr-1.5" />
              Introducing CLI Companion — Pro Feature
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              PSForge Intelligence.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">
                Directly in Your Terminal.
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Diagnose error codes, analyze log files, explain any script, and validate PowerShell—without ever opening a browser. Install once, use everywhere: Windows, macOS, and Linux.
            </p>
          </div>

          {/* Terminal preview block */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="rounded-xl border border-cyan-500/20 bg-zinc-950 overflow-hidden shadow-xl shadow-cyan-500/5">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-zinc-900">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
                <span className="ml-2 text-xs text-zinc-400 font-mono">PowerShell</span>
              </div>
              <div className="p-5 font-mono text-sm space-y-2 text-left">
                <div><span className="text-cyan-400">PS&gt;</span> <span className="text-white">psforge diagnose 0x80070005</span></div>
                <div className="text-zinc-400 pl-4">Diagnosing error code... <span className="text-green-400">done</span></div>
                <div className="text-zinc-300 pl-4">Root cause: Access denied — insufficient permissions for registry write</div>
                <div className="text-zinc-400 pl-4">Fix script generated. Run with: <span className="text-yellow-400">psforge diagnose 0x80070005 --copy</span></div>
                <div className="mt-3"><span className="text-cyan-400">PS&gt;</span> <span className="text-white">psforge analyze-log .\setup.log --platform intune</span></div>
                <div className="text-zinc-400 pl-4">Analyzing 847 lines... <span className="text-green-400">3 issues found</span></div>
                <div className="pl-4"><span className="text-red-400">[CRITICAL]</span> <span className="text-zinc-300">MDM enrollment failed — certificate chain incomplete</span></div>
                <div className="pl-4"><span className="text-yellow-400">[WARNING] </span> <span className="text-zinc-300">Policy sync delay detected — sync interval exceeded</span></div>
                <div className="mt-3"><span className="text-cyan-400">PS&gt;</span> <span className="text-white">psforge validate .\deploy.ps1</span></div>
                <div className="text-zinc-400 pl-4">Validating... <span className="text-green-400">passed — 0 errors, 2 warnings</span></div>
              </div>
            </div>
          </div>

          {/* How it works — step flow */}
          <div className="max-w-5xl mx-auto mb-16">
            <h3 className="text-center text-lg font-semibold text-muted-foreground mb-8 uppercase tracking-wider">How it works</h3>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Download className="h-7 w-7 text-cyan-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1">1. Install in Seconds</div>
                  <p className="text-sm text-muted-foreground">
                    Run <span className="font-medium text-foreground">npm install -g psforge-cli</span> or download the standalone <span className="font-medium text-foreground">psforge.exe</span> from GitHub—no Node.js required. Works on Windows, macOS, and Linux.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <Key className="h-7 w-7 text-blue-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1">2. Authenticate Once</div>
                  <p className="text-sm text-muted-foreground">
                    Generate an API key in your PSForge Settings, then run <span className="font-medium text-foreground">psforge login</span>. Your credentials are saved securely — you never authenticate again.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <Zap className="h-7 w-7 text-green-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1">3. Run Any Command</div>
                  <p className="text-sm text-muted-foreground">
                    Type <span className="font-medium text-foreground">psforge diagnose</span>, <span className="font-medium text-foreground">analyze-log</span>, <span className="font-medium text-foreground">explain</span>, or <span className="font-medium text-foreground">validate</span>. Every command supports <span className="font-medium text-foreground">--json</span> output for automation pipelines.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature breakdown grid */}
          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
            <Card className="hover-elevate transition-all border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                  <ShieldAlert className="h-5 w-5 text-cyan-500" />
                </div>
                <CardTitle className="text-base flex items-center gap-2">
                  Error Code Diagnosis
                  <Badge className="text-xs bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">Pro</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Paste any Windows error code, HRESULT, event ID, or error message. The AI identifies the root cause, explains it in plain English, and generates a ready-to-run PowerShell fix.
                </p>
                <div className="font-mono text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                  psforge diagnose 0x80070005
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                  <ScanSearch className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-base flex items-center gap-2">
                  Log File Analysis
                  <Badge className="text-xs bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">Pro</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  The same AI engine behind the web Troubleshooter, now at your command line. Point it at any log file and get severity-rated issues, root cause analysis, and PowerShell fix scripts—right in your terminal.
                </p>
                <div className="font-mono text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                  psforge analyze-log .\setup.log
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                  <Lightbulb className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle className="text-base flex items-center gap-2">
                  Script Explanation
                  <Badge className="text-xs bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">Pro</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Inherited a script with no documentation? Run psforge explain and get a plain-English breakdown of what it does, what each section means, and any potential risks—instantly.
                </p>
                <div className="font-mono text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                  psforge explain .\migrate.ps1
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-base">
                  Script Validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Syntax checking and best-practices validation without a Pro subscription. Run psforge validate on any .ps1 file and catch errors before they reach production. Free for all users.
                </p>
                <div className="font-mono text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                  psforge validate .\deploy.ps1
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="text-base">Script Library Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  List, search, and retrieve your saved PSForge scripts directly from the terminal. Pull a script by ID and pipe it straight into PowerShell or save it to disk. Free for all users.
                </p>
                <div className="font-mono text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                  psforge scripts list
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-zinc-500/20 bg-gradient-to-br from-zinc-500/5 to-transparent">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-zinc-500/10 flex items-center justify-center mb-3">
                  <Monitor className="h-5 w-5 text-zinc-500" />
                </div>
                <CardTitle className="text-base">Pipe-Friendly JSON Output</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Every command supports <span className="font-medium text-foreground">--json</span> for clean machine-readable output. Pipe psforge into your monitoring scripts, CI/CD pipelines, or log aggregation tools without any parsing.
                </p>
                <div className="font-mono text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                  psforge validate script.ps1 --json
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA banner */}
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-8 text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Ready to bring PSForge to your terminal?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                CLI Companion is included with every Pro subscription at $5/month. Install in 60 seconds. Cancel anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/cli">
                  <Button size="lg" className="gap-2 bg-cyan-600 hover:bg-cyan-700 w-full sm:w-auto" data-testid="button-cli-cta-download">
                    <Download className="h-5 w-5" />
                    Download CLI
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                    See All Pro Features
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                <div className="text-2xl sm:text-3xl font-bold text-foreground">5 Min</div>
              </div>
              <div className="text-sm text-muted-foreground">Setup Time</div>
            </div>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Terminal className="h-6 w-6 text-primary" />
                <div className="text-2xl sm:text-3xl font-bold text-foreground">2,400+</div>
              </div>
              <div className="text-sm text-muted-foreground">Automation Tasks</div>
            </div>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Server className="h-6 w-6 text-primary" />
                <div className="text-2xl sm:text-3xl font-bold text-foreground">48</div>
              </div>
              <div className="text-sm text-muted-foreground">Enterprise Platforms</div>
            </div>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <HardDrive className="h-6 w-6 text-primary" />
                <div className="text-2xl sm:text-3xl font-bold text-foreground">1,000+</div>
              </div>
              <div className="text-sm text-muted-foreground">Scripts Generated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Built by IT Pros, for IT Pros Who'd Rather Automate Than Memorize Syntax
          </h2>
          <p className="text-lg text-muted-foreground">
            Still writing PowerShell scripts manually? You're losing 5+ hours per week to syntax lookups, cmdlet documentation, and troubleshooting formatting errors.
          </p>
          <p className="text-lg text-muted-foreground mt-4">
            PSForge eliminates the guesswork. Every script is clean, properly formatted, and follows PowerShell best practices—whether you build it visually, describe it to our AI assistant, or code it directly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>No Syntax Memorization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Select what you need from visual menus. PSForge handles parameters, formatting, and error handling automatically.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all border-primary/50">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              <CardTitle className="flex items-center gap-2">
                AI Script Assistant
                <Badge variant="secondary" className="text-xs">Pro</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Describe your automation task in plain English: "Create new Exchange mailboxes for 50 users from a CSV file." AI writes the script.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <HardDrive className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle>Download & Deploy Instantly</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get clean .ps1 files ready to run. No vendor lock-in, no proprietary formats. Just PowerShell that works.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Platform Coverage Section */}
      <section id="platforms" className="bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              48 Enterprise Platforms. 2,400+ Ready-to-Use Automation Tasks.
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Stop writing scripts from scratch. Start with pre-built tasks for your exact environment—50+ tasks per platform.
            </p>
          </div>

          <div className="max-w-5xl mx-auto mb-8">
            <div className="bg-card border rounded-lg p-6 text-center">
              <p className="text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Exchange Online</span> • <span className="font-medium text-foreground">Azure AD</span> • <span className="font-medium text-foreground">SharePoint</span> • <span className="font-medium text-foreground">AWS</span> • <span className="font-medium text-foreground">VMware</span> • <span className="font-medium text-foreground">Active Directory</span> • <span className="font-medium text-foreground">Intune</span> • <span className="font-medium text-foreground">MECM</span> • Veeam • Nutanix • Citrix • Cisco • Fortinet • CrowdStrike • NetApp • JAMF • Microsoft Teams • Office 365 • Slack • Zoom • Salesforce • GitHub • Jira • Splunk • ServiceNow • Okta • Duo • Docker • GCP • Hyper-V • Windows 365 • SQL Server • ConnectWise • PDQ • Sophos + 14 more
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link href={user ? "/builder" : "/signup"}>
              <Button size="lg" className="gap-2">
                See All 48 Platforms & Tasks
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Monetize Your Expertise Section */}
      <section className="border-y bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-cyan-500/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                <BadgeDollarSign className="h-3 w-3 mr-1" />
                Pro Feature
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Turn Your PowerShell Expertise Into Passive Income
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                You've spent years mastering PowerShell. Now monetize that knowledge. Sell your custom scripts to thousands of IT professionals on the PSForge Marketplace.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="hover-elevate transition-all text-center">
                <CardHeader>
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                  <CardTitle className="text-2xl text-green-600 dark:text-green-400">70%</CardTitle>
                  <CardDescription className="text-base">Revenue Share</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    You keep 70% of every sale. Price your scripts from $1 to $50 and earn on every download.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all text-center">
                <CardHeader>
                  <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                  <CardTitle className="text-2xl">Seller Dashboard</CardTitle>
                  <CardDescription className="text-base">Track Your Earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Real-time analytics show your sales, earnings, and pending payouts. Request withdrawals anytime.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all text-center">
                <CardHeader>
                  <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                  <CardTitle className="text-2xl">Built-In Audience</CardTitle>
                  <CardDescription className="text-base">Reach IT Professionals</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Your scripts get discovered by IT pros actively searching for automation solutions. No marketing needed.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-card border rounded-xl p-6 sm:p-8 text-center">
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Already have scripts that could help others?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                That Exchange migration script you perfected? The AD cleanup tool you built? The security audit script you run monthly? Other IT pros would pay for those. The seller marketplace is coming soon.
              </p>
              {isAdmin ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/seller-dashboard">
                    <Button size="lg" className="gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto" data-testid="button-start-selling">
                      <BadgeDollarSign className="h-5 w-5" />
                      Go to Seller Dashboard
                    </Button>
                  </Link>
                  <Link href="/marketplace">
                    <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                      See What's Selling
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" className="gap-2 bg-green-600/50 w-full sm:w-auto" disabled data-testid="button-start-selling">
                    <BadgeDollarSign className="h-5 w-5" />
                    Seller Marketplace — Coming Soon
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Start free with essential tools. Upgrade to Pro for AI assistance, enterprise platforms, and the ability to sell your scripts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <Card className="hover-elevate transition-all">
            <CardHeader className="text-center pb-8">
              <Badge variant="secondary" className="w-fit mx-auto mb-4">
                Free Forever
              </Badge>
              <CardTitle className="text-3xl mb-2">Free</CardTitle>
              <CardDescription className="text-lg">
                Perfect for core Windows automation and learning PowerShell best practices
              </CardDescription>
              <div className="mt-6">
                <div className="text-4xl font-bold text-foreground">$0</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {freeTierFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href={user ? "/builder" : "/signup"} className="block pt-4">
                <Button variant="outline" className="w-full gap-2" data-testid="button-free-tier">
                  <Code2 className="h-4 w-4" />
                  {user ? "Go to Builder" : "Get Started Free—No Credit Card"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="hover-elevate transition-all border-primary/50 shadow-lg shadow-primary/5">
            <CardHeader className="text-center pb-8">
              <Badge className="w-fit mx-auto mb-4">
                <Sparkles className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
              <CardTitle className="text-3xl mb-2">Pro</CardTitle>
              <CardDescription className="text-lg">
                For IT professionals managing enterprise environments and multi-platform automation
              </CardDescription>
              <div className="mt-6">
                <div className="text-4xl font-bold text-foreground">$5</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {proTierFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href={user ? "/builder" : "/signup"} className="block pt-4">
                <Button className="w-full gap-2" data-testid="button-pro-tier">
                  <Sparkles className="h-4 w-4" />
                  {user ? "Upgrade to Pro" : "Get Started with Pro"}
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground pt-2">
                Cancel anytime. No long-term commitment.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          Free forever. Upgrade to Pro anytime for $5/month.
        </div>
      </section>

      {/* Five Building Methods */}
      <section id="how-it-works" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Five Ways to Build PowerShell Scripts
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Choose the method that matches your workflow. Each approach generates production-ready PowerShell with complete error handling.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Code2 className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Visual Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Point, click, configure. Build complex scripts without typing a single cmdlet. Perfect for quick tasks and team members new to PowerShell.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all border-primary/50">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              <CardTitle className="flex items-center gap-2">
                AI Assistant
                <Badge variant="secondary" className="text-xs">Pro</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Describe what you need in plain English. AI generates the complete script with proper error handling and best practices built in.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <Terminal className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle>Direct Coding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Write PowerShell your way with syntax highlighting, auto-completion, and instant validation. For when you know exactly what you want.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6 text-orange-500" />
              </div>
              <CardTitle>Script Wizard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Bulk operations made easy. Upload CSV data and generate scripts that process hundreds of items automatically with full error handling.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all border-primary/30">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Templates Marketplace
                <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Browse community-shared templates, install proven solutions with one click, and publish your own scripts to help other IT professionals. Coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Trusted by IT Professionals. Proven by Results.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="hover-elevate transition-all">
              <CardHeader className="text-center pb-4">
                <div className="text-3xl font-bold text-primary mb-2">1,000+</div>
                <CardTitle className="text-base">Scripts Generated</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Real automation tasks created by IT professionals using PSForge
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader className="text-center pb-4">
                <div className="text-3xl font-bold text-primary mb-2">1+ Hour</div>
                <CardTitle className="text-base">Saved Per Script</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Compared to manual scripting with documentation lookups and troubleshooting
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader className="text-center pb-4">
                <div className="text-3xl font-bold text-primary mb-2">5 Minutes</div>
                <CardTitle className="text-base">Setup Time</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  From sign-up to your first working script—no installation, no configuration
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader className="text-center pb-4">
                <div className="text-3xl font-bold text-primary mb-2">48</div>
                <CardTitle className="text-base">Platforms Supported</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  From Windows basics to enterprise cloud platforms and DevOps tools
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Case Studies Teaser */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4" data-testid="badge-case-studies-home">
              <Star className="h-3 w-3 mr-1" />
              Real-World Results
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              See How IT Teams Transform Their Operations
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From 85% faster onboarding to 100% compliance—real IT professionals share their automation success stories.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            <Card className="hover-elevate transition-all" data-testid="card-case-study-teaser-1">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">Managed IT Services</Badge>
                  <span className="text-2xl font-bold text-primary">85%</span>
                </div>
                <CardTitle className="text-lg">Onboarding Time Cut by 85%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  TechCorp Solutions reduced new hire setup from 6 hours to 45 minutes with automated AD and Exchange provisioning.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Active Directory</Badge>
                  <Badge variant="outline" className="text-xs">Exchange</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all" data-testid="card-case-study-teaser-2">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">Healthcare IT</Badge>
                  <span className="text-2xl font-bold text-green-500">100%</span>
                </div>
                <CardTitle className="text-lg">100% HIPAA Audit Pass Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  MidWest Healthcare went from failing audits to perfect compliance with automated security scripts.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Compliance</Badge>
                  <Badge variant="outline" className="text-xs">Security</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all" data-testid="card-case-study-teaser-3">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">MSP</Badge>
                  <span className="text-2xl font-bold text-purple-500">0</span>
                </div>
                <CardTitle className="text-lg">Zero Weekend Emergencies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  CloudFirst MSP eliminated storage-related weekend calls across 50+ client environments.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Disk Management</Badge>
                  <Badge variant="outline" className="text-xs">VMware</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Link href="/case-studies">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-case-studies">
                Read Full Case Studies
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Enterprise-Grade Security Built Into Every Script
              </h2>
              <p className="text-lg text-muted-foreground">
                Your automation scripts handle sensitive systems and data. PSForge ensures they're secure by default.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <Card className="hover-elevate transition-all">
                <CardHeader className="text-center">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3 mx-auto">
                    <Shield className="h-5 w-5 text-red-500" />
                  </div>
                  <CardTitle className="text-lg">Injection Prevention</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Built-in validation checks every parameter before execution. Your scripts are protected against command injection attacks automatically.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all">
                <CardHeader className="text-center">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 mx-auto">
                    <Zap className="h-5 w-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-lg">Auto-Save Protection</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Never lose your work. PSForge automatically saves your progress as you build, so connection issues or browser crashes won't cost you hours of work.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all">
                <CardHeader className="text-center">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3 mx-auto">
                    <HardDrive className="h-5 w-5 text-green-500" />
                  </div>
                  <CardTitle className="text-lg">Instant .ps1 Downloads</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Download scripts as standard PowerShell files instantly. Run them anywhere, modify them anytime, no vendor lock-in.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="hover-elevate transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Is PSForge just a script template generator?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No. PSForge is an intelligent script builder that adapts to your specific parameters and environment. While we provide 1000+ pre-built automation tasks as starting points, every script is customized to your exact requirements—not generic templates.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Do I need to install anything?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No. PSForge is entirely web-based. Sign up, start building, and download your .ps1 scripts. No desktop software, no plugins, no configuration.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Can I edit the scripts after downloading?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Absolutely. PSForge generates standard PowerShell .ps1 files. Edit them in any text editor, version control them in Git, run them anywhere PowerShell works. No vendor lock-in.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader>
                <CardTitle className="text-lg">What if I need a platform that's not supported yet?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We're constantly adding new platforms. Contact us with your request, and we'll prioritize based on demand. Pro subscribers get early access to new platforms.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Is my script data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes. Scripts are generated in your browser with enterprise-grade security validation. We don't store your custom parameters or sensitive data. Download your scripts and they're yours forever.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Can I upgrade or downgrade anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes. Upgrade to Pro instantly to unlock AI assistance and enterprise platforms. Downgrade anytime and keep all the scripts you've already created.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="border-primary/50 shadow-lg shadow-primary/5">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="flex justify-center mb-6">
                <img 
                  src={iconTransparent} 
                  alt="PSForge Icon" 
                  className="h-16 w-auto"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Ready to Transform Your PowerShell Workflow?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join IT professionals who've automated thousands of tasks with PSForge. Create your first script in 5 minutes—no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                {!user ? (
                  <>
                    <Link href="/signup">
                      <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-cta-signup">
                        Create Your First Script Free
                      </Button>
                    </Link>
                    <a href="#pricing">
                      <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                        View Pro Features
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </a>
                  </>
                ) : (
                  <Link href="/builder">
                    <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-cta-builder">
                      <Code2 className="h-5 w-5" />
                      Open Script Builder
                    </Button>
                  </Link>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                Free forever. Upgrade to Pro anytime for $5/month.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#platforms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Supported Platforms</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link href="/cli" className="text-sm text-muted-foreground hover:text-foreground transition-colors">CLI Companion</Link></li>
                <li><Link href="/case-studies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Case Studies</Link></li>
                <li><Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About PSForge</Link></li>
                <li><Link href="/account" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={iconTransparent} 
                  alt="PSForge Icon" 
                  className="h-8 w-auto"
                />
                <span className="text-sm text-muted-foreground">
                  © 2025 PSForge - Professional PowerShell Script Builder
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Built by IT Pros, for IT Pros
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
