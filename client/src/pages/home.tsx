import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FileCode,
  Sparkles,
  LayoutGrid,
  Terminal,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Code2,
  Bot,
  MousePointerClick
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">PSForge</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">PowerShell Script Builder</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/builder">
              <Button size="sm" className="gap-2" data-testid="button-get-started">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="mb-4">
            Professional PowerShell Automation
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Build PowerShell Scripts with Confidence
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. 
            Create powerful automation scripts through an intuitive GUI, AI assistance, or direct coding.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
            <Link href="/builder">
              <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-start-building">
                <Code2 className="h-5 w-5" />
                Start Building
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto" data-testid="button-learn-more">
                Learn More
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">623</div>
              <div className="text-sm text-muted-foreground">Automation Tasks</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">80+</div>
              <div className="text-sm text-muted-foreground">PowerShell Commands</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">23</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Main Features */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Three Powerful Ways to Build Scripts
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the workflow that matches your expertise and needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {/* Script Generator */}
          <Card className="hover-elevate transition-all" data-testid="card-script-generator">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <FileCode className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Script Generator
                <Badge variant="secondary">Code</Badge>
              </CardTitle>
              <CardDescription>
                Direct code editing with command library and real-time preview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">80+ PowerShell commands across 16 categories</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Real-time syntax highlighting and validation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Cursor-based command insertion</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Live preview with line count</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/builder?tab=script-generator" className="w-full">
                <Button variant="outline" className="w-full gap-2" data-testid="button-open-script-generator">
                  Open Script Editor
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* AI Assistant */}
          <Card className="hover-elevate transition-all border-primary/20" data-testid="card-ai-assistant">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              <CardTitle className="flex items-center gap-2">
                AI Assistant
                <Badge variant="secondary">AI-Powered</Badge>
              </CardTitle>
              <CardDescription>
                Natural language command help with intelligent suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">OpenAI-powered chat interface</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Context-aware command suggestions</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">One-click command addition</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Conversation history persistence</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/builder?tab=ai-assistant" className="w-full">
                <Button variant="outline" className="w-full gap-2" data-testid="button-open-ai-assistant">
                  Open AI Assistant
                  <Bot className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* GUI Builder */}
          <Card className="hover-elevate transition-all" data-testid="card-gui-builder">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <LayoutGrid className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle className="flex items-center gap-2">
                GUI Builder
                <Badge variant="secondary">No Code</Badge>
              </CardTitle>
              <CardDescription>
                Task-based automation with user-friendly forms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">623 pre-built automation tasks</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">16 enterprise IT platforms + 7 Windows categories</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Dynamic parameter forms with validation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Secure script generation</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/builder?tab=gui-builder" className="w-full">
                <Button variant="outline" className="w-full gap-2" data-testid="button-open-gui-builder">
                  Open GUI Builder
                  <MousePointerClick className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Platform Coverage */}
      <section className="bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Comprehensive Platform Coverage
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Automation tasks for enterprise IT platforms and Windows management
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {[
              { name: "Active Directory", tasks: 30 },
              { name: "Azure AD/Entra ID", tasks: 30 },
              { name: "Azure Resources", tasks: 30 },
              { name: "Exchange Online", tasks: 20 },
              { name: "Exchange Server", tasks: 20 },
              { name: "Hyper-V", tasks: 30 },
              { name: "Intune", tasks: 30 },
              { name: "MECM", tasks: 30 },
              { name: "Microsoft Teams", tasks: 30 },
              { name: "Office 365", tasks: 30 },
              { name: "OneDrive", tasks: 30 },
              { name: "Power Platform", tasks: 30 },
              { name: "SharePoint Online", tasks: 30 },
              { name: "SharePoint On-Prem", tasks: 30 },
              { name: "Windows 365", tasks: 30 },
              { name: "Windows Server", tasks: 30 },
              { name: "Event Logs", tasks: 12 },
              { name: "File System", tasks: 14 },
              { name: "Networking", tasks: 15 },
              { name: "Process Management", tasks: 11 },
              { name: "Registry", tasks: 10 },
              { name: "Security Management", tasks: 15 },
              { name: "Services", tasks: 14 },
            ].map((platform) => (
              <div
                key={platform.name}
                className="bg-background border rounded-lg p-4 hover-elevate transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{platform.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {platform.tasks}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Features */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Built with Security & Best Practices
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
                <CardTitle className="text-lg">Security First</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">PowerShell injection prevention</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Input escaping and validation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Comprehensive error handling</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <CardTitle className="text-lg">Powerful Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Auto-save to localStorage</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Export to .ps1 files</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Dark/light theme support</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              Ready to Streamline Your PowerShell Workflow?
            </h3>
            <p className="text-lg text-muted-foreground">
              Start building powerful automation scripts today with PSForge
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
              <Link href="/builder">
                <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-cta-start">
                  <Code2 className="h-5 w-5" />
                  Get Started Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                PSForge - Professional PowerShell Script Builder
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Built for IT professionals
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
