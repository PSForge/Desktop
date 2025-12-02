import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Lock, 
  Key, 
  Eye, 
  FileCheck, 
  AlertTriangle,
  CheckCircle2,
  Server,
  ArrowRight,
  Sparkles
} from "lucide-react";
import logoFullTransparent from "@assets/Full Logo Transparent_1761567685412.png";

export default function Security() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Security - PSForge | Enterprise-Grade Script Security</title>
        <meta name="description" content="Learn about PSForge's security features including malicious code scanning, injection prevention, secure authentication, and enterprise-grade data protection." />
        <meta name="keywords" content="PowerShell security, script security, malicious code detection, enterprise security, IT security" />
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <img 
                src={logoFullTransparent} 
                alt="PSForge Logo" 
                className="h-8 cursor-pointer"
                data-testid="img-logo"
              />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" data-testid="button-login">Login</Button>
              </Link>
              <Link href="/signup">
                <Button data-testid="button-signup">Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="max-w-4xl mx-auto">
          <section className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              <Shield className="h-3 w-3 mr-1" />
              Enterprise Security
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6" data-testid="text-page-title">
              Security Built Into Every Script
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your PowerShell scripts handle sensitive systems and data. PSForge ensures they're secure by default with multiple layers of protection.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Script Security Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover-elevate" data-testid="card-malicious-scanner">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <CardTitle>Malicious Code Scanner</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Every script is automatically scanned for 15+ dangerous patterns including:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Encoded command execution
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Reverse shell attempts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Credential harvesting patterns
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Registry manipulation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Download and execute patterns
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-injection-prevention">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle>Injection Prevention</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Built-in protection against command injection attacks:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Parameter validation before execution
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Input sanitization
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Type checking for all inputs
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Safe string interpolation
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-validation">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <CardTitle>Comprehensive Validation</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Dual-mode validation system for script quality:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Real-time syntax checking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Dependency detection
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Impact analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Microsoft best practices compliance
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-integrity">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Key className="h-5 w-5 text-purple-500" />
                    </div>
                    <CardTitle>Script Integrity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Verify your scripts haven't been tampered with:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      SHA-256 hashing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Version tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Audit trail for changes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Integrity verification on export
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Platform Security</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card data-testid="card-auth">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-center">Secure Authentication</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      Bcrypt password hashing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      Secure session cookies
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      Password reset via email
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card data-testid="card-data">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Server className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-center">Data Protection</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      HTTPS encryption
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      Encrypted database storage
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      No plain-text credentials
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card data-testid="card-access">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-center">Access Control</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      Role-based permissions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      Private script isolation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      GitHub credential isolation
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-16">
            <Card className="bg-muted/30" data-testid="card-security-score">
              <CardHeader>
                <CardTitle className="text-center">Security Score Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground mb-6">
                  Every script you create or download includes a visual security score with detailed analysis:
                </p>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-green-500/10">
                    <Badge variant="secondary" className="text-green-600 dark:text-green-400 mb-2">Safe</Badge>
                    <p className="text-sm text-muted-foreground">No dangerous patterns detected</p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-500/10">
                    <Badge variant="secondary" className="text-yellow-600 dark:text-yellow-400 mb-2">Caution</Badge>
                    <p className="text-sm text-muted-foreground">Contains patterns that may require review</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10">
                    <Badge variant="destructive" className="mb-2">Dangerous</Badge>
                    <p className="text-sm text-muted-foreground">Contains potentially malicious patterns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 border-primary/30" data-testid="card-cta">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Start Building Secure Scripts Today
                </h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Join IT professionals who trust PSForge for secure PowerShell automation. All security features are included in the free tier.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/signup">
                    <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-cta-signup">
                      <Sparkles className="h-5 w-5" />
                      Get Started Free
                    </Button>
                  </Link>
                  <Link href="/case-studies">
                    <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto" data-testid="button-case-studies">
                      View Case Studies
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </article>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Back to Home
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/about">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">About</span>
              </Link>
              <Link href="/privacy">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Privacy</span>
              </Link>
              <Link href="/terms">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Terms</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
