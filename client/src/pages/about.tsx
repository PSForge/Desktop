import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Terminal, 
  Users, 
  Shield, 
  Zap, 
  ArrowRight,
  Building2,
  Target,
  Heart,
  Sparkles
} from "lucide-react";
import logoFullTransparent from "@assets/Full Logo Transparent_1761567685412.png";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About PSForge - Professional PowerShell Script Builder for IT Teams</title>
        <meta name="description" content="Learn about PSForge, the professional PowerShell script builder designed by IT professionals for IT professionals. Automate 1000+ tasks across 48 enterprise platforms." />
        <meta name="keywords" content="about PSForge, PowerShell automation company, IT automation tool, script builder" />
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6" data-testid="text-page-title">
              Built by IT Pros, for IT Pros
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              PSForge was created to solve a simple problem: IT professionals spend too much time writing repetitive PowerShell scripts from scratch.
            </p>
          </section>

          <section className="mb-16">
            <Card data-testid="card-mission">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Our Mission</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  We believe IT professionals should spend their time solving complex problems, not rewriting the same scripts over and over. PSForge eliminates repetitive work by providing a visual script builder with 1000+ pre-built automation tasks across 48 enterprise platforms—from Active Directory and Exchange to Azure, AWS, VMware, and beyond.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">What Makes PSForge Different</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover-elevate" data-testid="card-feature-1">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Terminal className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle>Real Scripts, Not Templates</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Every script is customized to your exact parameters. We don't just give you a template—we generate production-ready PowerShell code tailored to your environment.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-feature-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-green-500" />
                    </div>
                    <CardTitle>Security First</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Every script includes built-in validation, error handling, and security best practices. Our malicious code scanner ensures your scripts are safe before deployment.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-feature-3">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <CardTitle>Built by Practitioners</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our team includes system administrators, security engineers, and DevOps professionals who've spent years automating enterprise environments. We built what we wished we had.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-feature-4">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-orange-500" />
                    </div>
                    <CardTitle>Instant Productivity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    No installation, no configuration. Sign up and start building scripts in seconds. Download standard .ps1 files that run anywhere PowerShell works.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card data-testid="card-value-1">
                <CardContent className="pt-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Enterprise Quality</h3>
                  <p className="text-sm text-muted-foreground">
                    Every feature is built to enterprise standards. We test against real-world IT environments.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-value-2">
                <CardContent className="pt-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">User-Centric Design</h3>
                  <p className="text-sm text-muted-foreground">
                    We obsess over the user experience. If it's not intuitive, we redesign it.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-value-3">
                <CardContent className="pt-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Security Always</h3>
                  <p className="text-sm text-muted-foreground">
                    Security isn't a feature—it's a foundation. Every script is validated and scanned.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-16">
            <Card className="bg-muted/30" data-testid="card-stats">
              <CardContent className="py-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">48</div>
                    <div className="text-sm text-muted-foreground">Enterprise Platforms</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">1000+</div>
                    <div className="text-sm text-muted-foreground">Automation Tasks</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">150+</div>
                    <div className="text-sm text-muted-foreground">PowerShell Cmdlets</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">24/7</div>
                    <div className="text-sm text-muted-foreground">Web-Based Access</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 border-primary/30" data-testid="card-cta">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Ready to Automate Your IT Environment?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Join thousands of IT professionals who've transformed their workflow with PSForge. Start with our free tier—no credit card required.
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
              <Link href="/privacy">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Privacy</span>
              </Link>
              <Link href="/terms">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Terms</span>
              </Link>
              <Link href="/security">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Security</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
