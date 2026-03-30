import { type ElementType } from "react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Terminal,
  Download,
  Package,
  Key,
  CheckCircle,
  ChevronRight,
  Cpu,
  Globe,
  Zap,
  Shield,
  Search,
  FileText,
  Wrench,
  List,
  Monitor,
  AlertTriangle,
} from "lucide-react";
import { SiNpm } from "react-icons/si";

const NPM_PACKAGE = "psforge-cli";
const GITHUB_RELEASES_URL = "https://github.com/PSForge/CLI/releases/latest";
const GITHUB_URL = "https://github.com/PSForge/CLI";

interface Command {
  cmd: string;
  alias?: string;
  description: string;
  pro?: boolean;
  icon: ElementType;
  example: string;
}

const COMMANDS: Command[] = [
  {
    cmd: "psforge validate",
    description: "Check a PowerShell script for errors and best-practice violations",
    icon: CheckCircle,
    example: "psforge validate ./Deploy.ps1",
  },
  {
    cmd: "psforge diagnose",
    alias: "d",
    description: "AI root-cause diagnosis of an error code, exception, or log snippet",
    icon: Search,
    example: 'psforge diagnose "0xc1900200"',
    pro: true,
  },
  {
    cmd: "psforge analyze-log",
    alias: "al",
    description: "Upload a log file and get severity-ranked issues with PowerShell fixes",
    icon: FileText,
    example: "psforge analyze-log ./system.log --platform Windows",
    pro: true,
  },
  {
    cmd: "psforge fix",
    alias: "f",
    description: "AI-powered fix for a broken script — returns corrected code",
    icon: Wrench,
    example: "psforge fix ./BrokenScript.ps1",
    pro: true,
  },
  {
    cmd: "psforge explain",
    description: "Get a plain-English explanation of any script, error, or log",
    icon: Globe,
    example: "psforge explain ./ComplexScript.ps1",
    pro: true,
  },
  {
    cmd: "psforge scripts list",
    alias: "s list",
    description: "List all scripts saved in your PSForge library",
    icon: List,
    example: "psforge scripts list",
  },
  {
    cmd: "psforge scripts get",
    alias: "s get",
    description: "Fetch the full content of a saved script by ID",
    icon: FileText,
    example: "psforge scripts get abc123",
  },
  {
    cmd: "psforge login",
    description: "Authenticate with your API key (or set PSFORGE_API_KEY env var)",
    icon: Key,
    example: "psforge login",
  },
];


export default function CliPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero */}
      <section className="border-b border-border bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-start gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-primary/10 border border-primary/20">
              <Terminal className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="secondary">CLI Companion</Badge>
          </div>
          <h1 className="text-4xl font-bold text-foreground leading-tight max-w-2xl">
            PSForge in your terminal
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Validate scripts, diagnose errors, and get AI-powered fixes without
            leaving your command line. Works on Windows, macOS, and Linux.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer">
              <Button data-testid="button-download-exe">
                <Download className="h-4 w-4 mr-2" />
                Download for Windows
              </Button>
            </a>
            <Link href="/settings">
              <Button variant="outline" data-testid="button-get-api-key">
                <Key className="h-4 w-4 mr-2" />
                Get an API key
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-14 w-full">

        {/* Install */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Installation</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Windows */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center gap-3 flex-wrap">
                <Monitor className="h-5 w-5 text-blue-500 shrink-0" />
                <CardTitle className="text-base">Windows</CardTitle>
                <Badge variant="secondary" className="text-xs">Standalone .exe</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Download the self-contained binary — no Node.js or runtime needed.
                </p>
                <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="w-full" data-testid="button-download-windows">
                    <Download className="h-4 w-4 mr-2" />
                    Download psforge.exe
                  </Button>
                </a>
                <p className="text-xs text-muted-foreground">
                  Add to <code className="font-mono bg-muted px-1 rounded-sm">C:\Windows\System32</code> or any folder on your PATH.
                </p>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-1.5" data-testid="notice-smartscreen">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Windows SmartScreen warning
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Windows may flag this file as unrecognized. This is a false positive — the binary is open source and safe to use. To run it:
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                    <li>Click <span className="font-medium text-foreground">More info</span> on the SmartScreen popup</li>
                    <li>Click <span className="font-medium text-foreground">Run anyway</span></li>
                  </ol>
                  <p className="text-xs text-muted-foreground">
                    Or right-click the file → <span className="font-medium text-foreground">Properties</span> → check <span className="font-medium text-foreground">Unblock</span> → OK.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* macOS / Linux */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center gap-3 flex-wrap">
                <Package className="h-5 w-5 text-red-500 shrink-0" />
                <CardTitle className="text-base">macOS &amp; Linux</CardTitle>
                <Badge variant="secondary" className="text-xs">npm</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Install globally via npm. Requires Node.js 18 or later.
                </p>
                <pre
                  className="rounded-md bg-muted border border-border px-4 py-3 text-xs font-mono overflow-x-auto"
                  data-testid="text-npm-install"
                >{`npm install -g ${NPM_PACKAGE}`}</pre>
                <a href={`https://www.npmjs.com/package/${NPM_PACKAGE}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <SiNpm className="h-3 w-3" />
                  View on npm
                </a>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick start */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Quick start</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <ol className="space-y-5">
                {[
                  {
                    step: "1",
                    title: "Generate an API key",
                    body: (
                      <>
                        Go to{" "}
                        <Link href="/settings" className="text-primary hover:underline">
                          Settings
                        </Link>{" "}
                        and create a new API key. Copy it — it's shown only once.
                      </>
                    ),
                  },
                  {
                    step: "2",
                    title: "Authenticate",
                    body: (
                      <pre className="rounded-md bg-muted border border-border px-4 py-3 text-xs font-mono overflow-x-auto mt-2">{`# Option A — set env var (recommended)
export PSFORGE_API_KEY="psf_your_key_here"

# Option B — interactive login
psforge login`}</pre>
                    ),
                  },
                  {
                    step: "3",
                    title: "Start using it",
                    body: (
                      <pre className="rounded-md bg-muted border border-border px-4 py-3 text-xs font-mono overflow-x-auto mt-2">{`# Validate a script
psforge validate ./MyScript.ps1

# Diagnose an error code  (Pro)
psforge diagnose "Access is denied. (0x80070005)"

# Analyse a log file       (Pro)
psforge analyze-log ./app.log --platform "Windows Server"

# Fix a broken script      (Pro)
psforge fix ./BrokenScript.ps1`}</pre>
                    ),
                  },
                ].map(({ step, title, body }) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex-none flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mt-0.5">
                      {step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <div className="text-sm text-muted-foreground mt-1">{body}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        {/* Commands */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-foreground">Command reference</h2>
            <span className="text-xs text-muted-foreground">
              All commands support <code className="font-mono bg-muted px-1 rounded-sm">--json</code> for PowerShell pipeline use
            </span>
          </div>
          <div className="grid gap-3">
            {COMMANDS.map((c) => (
              <Card key={c.cmd} data-testid={`card-command-${c.cmd.replace(/\s+/g, "-")}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-md bg-muted shrink-0 mt-0.5">
                      <c.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono font-semibold text-foreground">{c.cmd}</code>
                        {c.alias && (
                          <Badge variant="outline" className="text-xs font-mono">alias: {c.alias}</Badge>
                        )}
                        {c.pro && (
                          <Badge className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">Pro</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                      <pre className="text-xs font-mono text-muted-foreground bg-muted/60 rounded-sm px-2 py-1 overflow-x-auto">{c.example}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Features</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Zap,
                title: "AI-powered",
                body: "Every diagnosis and fix is powered by the same AI engine as PSForge's web interface.",
              },
              {
                icon: Shield,
                title: "Secure by default",
                body: "API keys are hashed on our servers. Set PSFORGE_API_KEY and the key never touches a config file.",
              },
              {
                icon: Cpu,
                title: "Pipe-friendly",
                body: "All commands support --json output so you can pipe results into other PowerShell scripts or CI tools.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardContent className="pt-6 space-y-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Open source */}
        <section>
          <Card className="bg-muted/30">
            <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Open source on GitHub</p>
                <p className="text-sm text-muted-foreground">
                  PSForge CLI is open source. File issues, contribute commands, or build your own integrations.
                </p>
              </div>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-github">
                  View on GitHub
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="border-t border-border pt-10 text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Ready to get started?</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create a free API key, download the CLI, and start diagnosing errors in seconds.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/settings">
              <Button data-testid="button-cta-get-key">
                <Key className="h-4 w-4 mr-2" />
                Get your API key
              </Button>
            </Link>
            <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" data-testid="button-cta-download">
                <Download className="h-4 w-4 mr-2" />
                Download CLI
              </Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
