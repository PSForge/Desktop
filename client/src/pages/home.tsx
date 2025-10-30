import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { getPlatformStats } from "@/lib/platform-stats";
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
  Settings
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const stats = getPlatformStats();
  
  const freeTierFeatures = [
    "Script Generator with 80+ PowerShell commands",
    "8 basic Windows management categories",
    "File System, Networking, Services automation",
    "Process Management & Event Logs",
    "Active Directory basics",
    "Export to .ps1 files",
  ];

  const proTierFeatures = [
    "Everything in Free tier",
    "AI Assistant with OpenAI-powered chat",
    "Natural language command suggestions",
    "All 16 enterprise IT platforms",
    `${stats.totalTasks} automation tasks across ${stats.totalCategories} categories`,
    "Azure AD, Exchange, Teams, Intune",
    "MECM, SharePoint, Office 365",
    "Hyper-V, Windows Server & more",
  ];

  const enterprisePlatforms = [
    { name: "Azure AD / Entra ID", icon: Cloud, color: "text-blue-500" },
    { name: "Exchange Online/Server", icon: Server, color: "text-green-500" },
    { name: "Microsoft Teams", icon: Users, color: "text-purple-500" },
    { name: "SharePoint", icon: Database, color: "text-orange-500" },
    { name: "Intune / MECM", icon: Settings, color: "text-red-500" },
    { name: "Hyper-V", icon: Cpu, color: "text-cyan-500" },
    { name: "Windows Server", icon: Server, color: "text-indigo-500" },
    { name: "Office 365", icon: Cloud, color: "text-yellow-500" },
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
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="h-3 w-3 mr-1" />
                Professional PowerShell Automation Platform
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Build PowerShell Scripts
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                  with AI Assistance
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                Professional web-based PowerShell script builder for IT technicians and system administrators. 
                Create powerful automation scripts through an intuitive GUI, AI assistance, or direct coding.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-6">
                {!user ? (
                  <>
                    <Link href="/signup">
                      <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-hero-signup">
                        <Sparkles className="h-5 w-5" />
                        Start Free
                      </Button>
                    </Link>
                    <a href="#pricing">
                      <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                        View Pricing
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

      {/* Key Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">{stats.totalTasks}</div>
              <div className="text-sm text-muted-foreground">Automation Tasks</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">{stats.totalCategories}</div>
              <div className="text-sm text-muted-foreground">IT Platforms</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">$5</div>
              <div className="text-sm text-muted-foreground">Per Month for Pro</div>
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
            Start free with essential tools. Upgrade to Pro for AI assistance and enterprise platforms.
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
                Perfect for getting started with PowerShell automation
              </CardDescription>
              <div className="mt-6">
                <div className="text-4xl font-bold text-foreground">$0</div>
                <div className="text-sm text-muted-foreground">forever</div>
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
                  {user ? "Go to Builder" : "Get Started Free"}
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
                Unlock AI assistance and all enterprise IT platforms
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
                  {user ? "Upgrade to Pro" : "Start with Pro"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          No trial period needed • Cancel anytime • No hidden fees
        </div>
      </section>

      {/* Pro Features Showcase */}
      <section className="bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Lock className="h-3 w-3 mr-1" />
              Pro Features
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Enterprise IT Platform Coverage
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pro subscribers get access to 16 enterprise platforms with {stats.premiumTasks} pre-built automation tasks
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {enterprisePlatforms.map((platform, index) => (
              <Card key={index} className="hover-elevate transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center`}>
                      <platform.icon className={`h-5 w-5 ${platform.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground text-sm">{platform.name}</div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        Pro Only
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-6">
              Plus Power Platform, OneDrive, Windows 365, and more...
            </p>
            <Link href={user ? "/builder" : "/signup"}>
              <Button size="lg" variant="outline" className="gap-2">
                <Sparkles className="h-5 w-5" />
                Unlock All Platforms - $5/month
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Three Building Methods */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Three Ways to Build
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the workflow that matches your expertise and needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Code2 className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Script Generator</CardTitle>
              <CardDescription>
                Direct code editing with 80+ commands and real-time preview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Syntax highlighting</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Command library</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Live validation</span>
              </div>
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
              <CardDescription>
                Natural language command help powered by OpenAI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Context-aware suggestions</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">One-click insertion</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Conversation history</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <Terminal className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle>GUI Builder</CardTitle>
              <CardDescription>
                No-code automation with {stats.totalTasks} pre-built tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">User-friendly forms</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Parameter validation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Secure generation</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Security Features */}
      <section className="bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Built with Security & Best Practices
              </h2>
              <p className="text-muted-foreground">
                Enterprise-grade security for your automation scripts
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="text-center">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3 mx-auto">
                    <Shield className="h-5 w-5 text-red-500" />
                  </div>
                  <CardTitle className="text-lg">Security First</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">Injection prevention & input validation</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 mx-auto">
                    <Zap className="h-5 w-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-lg">Auto-Save</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">Never lose your work with automatic saving</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3 mx-auto">
                    <HardDrive className="h-5 w-5 text-green-500" />
                  </div>
                  <CardTitle className="text-lg">Export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">Download scripts as .ps1 files instantly</p>
                </CardContent>
              </Card>
            </div>
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
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Ready to Transform Your PowerShell Workflow?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join IT professionals who trust PSForge for their automation needs. 
                Start free, upgrade when you need AI assistance and enterprise platforms.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                {!user ? (
                  <>
                    <Link href="/signup">
                      <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-cta-signup">
                        <Sparkles className="h-5 w-5" />
                        Get Started Free
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                        <LogIn className="h-5 w-5" />
                        Sign In
                      </Button>
                    </Link>
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
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={iconTransparent} 
                alt="PSForge Icon" 
                className="h-8 w-auto"
              />
              <span className="text-sm text-muted-foreground">
                PSForge - Professional PowerShell Script Builder
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Built for IT Professionals
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
