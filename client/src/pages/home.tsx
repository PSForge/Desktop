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
  Wand2
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  
  const freeTierFeatures = [
    "8 core platforms (File System, Network, Services, Process Management, Event Logs, Active Directory, Registry, Security)",
    "200+ automation tasks",
    "Visual builder + direct coding modes",
    "Download unlimited .ps1 scripts",
    "Automatic saving",
    "Security validation built-in",
  ];

  const proTierFeatures = [
    "Everything in Free, plus:",
    "AI script assistant (describe tasks in plain English)",
    "48 enterprise platforms (Exchange, Azure, AWS, VMware, SharePoint, Microsoft 365, and 42 more)",
    "1000+ automation tasks across all platforms",
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
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="h-3 w-3 mr-1" />
                Built by IT Pros, for IT Pros
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Stop Googling PowerShell Syntax.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                  Start Automating in 5 Minutes.
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                PSForge generates enterprise-ready PowerShell scripts for Exchange, Azure, SharePoint, and 45+ platforms—no syntax memorization required. Build visually, ask AI, or code directly. Your choice.
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
                <div className="text-2xl sm:text-3xl font-bold text-foreground">1,000+</div>
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
      <section className="bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              48 Enterprise Platforms. 1000+ Ready-to-Use Automation Tasks.
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Stop writing scripts from scratch. Start with pre-built tasks for your exact environment.
            </p>
          </div>

          <div className="max-w-5xl mx-auto mb-8">
            <div className="bg-card border rounded-lg p-6 text-center">
              <p className="text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Exchange</span> • <span className="font-medium text-foreground">Azure</span> • <span className="font-medium text-foreground">SharePoint</span> • <span className="font-medium text-foreground">AWS</span> • <span className="font-medium text-foreground">VMware</span> • <span className="font-medium text-foreground">Active Directory</span> • Veeam • Nutanix • Citrix • Cisco • NetApp • JAMF • Microsoft 365 • Slack • Zoom • Salesforce • GitHub • Jira • Splunk • ServiceNow • Okta • Docker • Kubernetes • Terraform • Ansible • PagerDuty • Datadog • New Relic • Zabbix • SolarWinds + 19 more
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
                  {user ? "Upgrade to Pro" : "Start 7-Day Pro Trial"}
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground pt-2">
                No credit card required for trial. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          Free forever. Upgrade to Pro anytime for $5/month.
        </div>
      </section>

      {/* Four Building Methods */}
      <section id="how-it-works" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Four Ways to Build—Choose What Fits Your Workflow
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Whether you're a PowerShell expert or just getting started, PSForge adapts to your expertise level.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
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

      {/* Security Features */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
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
                <li><Link href="/builder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Supported Platforms</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link href="/builder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="/builder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Script Examples</Link></li>
                <li><Link href="/builder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">PowerShell Best Practices</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About PSForge</a></li>
                <li><Link href="/account" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</a></li>
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
