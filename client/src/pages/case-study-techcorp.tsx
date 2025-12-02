import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import logoFullTransparent from "@assets/Full Logo Transparent_1761567685412.png";
import {
  ArrowRight,
  ArrowLeft,
  User,
  LogIn,
  Clock,
  Users,
  Building2,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Target,
  Quote,
  Zap,
  DollarSign,
  Timer,
  Lock,
  Unlock
} from "lucide-react";
import { Helmet } from "react-helmet";

export default function CaseStudyTechCorp() {
  const { user } = useAuth();

  const challengeItems = [
    "Creating Active Directory accounts manually",
    "Configuring Exchange Online mailboxes",
    "Setting up security group memberships",
    "Creating network shares with proper permissions",
    "Configuring Microsoft 365 licenses",
    "Setting up email signatures and policies"
  ];

  const freeTierTasks = [
    "Bulk User Import from CSV (Active Directory)",
    "Bulk Add Users to Security Group (Active Directory)",
    "Bulk User Property Changes (Active Directory)",
    "Create SMB Share with Permissions (File System)"
  ];

  const proTierTasks = [
    "Create Mailbox for Licensed User (Exchange Online)",
    "Assign or Remove User Licenses (Azure AD)",
    "Bulk Mailbox Operations (Exchange Online)",
    "Configure Mailbox Language and Timezone (Exchange Online)"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>TechCorp Solutions Case Study: 85% Faster Employee Onboarding | PSForge</title>
        <meta name="description" content="Learn how TechCorp Solutions reduced employee onboarding from 6+ hours to 45 minutes using PSForge PowerShell automation. Active Directory, Exchange Online, and Azure AD automation case study." />
        <meta name="keywords" content="employee onboarding automation, Active Directory user provisioning, Exchange Online mailbox automation, PowerShell HR automation, bulk user import CSV, Azure AD license assignment, IT onboarding scripts" />
        <meta property="og:title" content="85% Faster Employee Onboarding with PowerShell Automation" />
        <meta property="og:description" content="TechCorp Solutions cut onboarding from 6 hours to 45 minutes. See how PSForge transformed their IT operations." />
        <meta property="og:type" content="article" />
      </Helmet>

      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <img 
              src={logoFullTransparent} 
              alt="PSForge Logo" 
              className="h-12 w-auto cursor-pointer"
              data-testid="img-logo"
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
                  <Button size="sm" className="gap-2" data-testid="button-builder">
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/case-studies">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Case Studies
          </Button>
        </Link>
      </div>

      <article className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="default" data-testid="badge-industry">
                <Building2 className="h-3 w-3 mr-1" />
                Managed IT Services
              </Badge>
              <Badge variant="secondary" data-testid="badge-company-size">
                <Users className="h-3 w-3 mr-1" />
                45 Employees
              </Badge>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4" data-testid="text-title">
              TechCorp Solutions Cuts Employee Onboarding Time by{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                85%
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground" data-testid="text-subtitle">
              How a growing MSP transformed 6+ hour manual onboarding into a 45-minute automated workflow using PSForge's visual PowerShell builder.
            </p>
          </header>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <Card className="text-center" data-testid="card-metric-time">
              <CardContent className="pt-6">
                <Timer className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">6h → 45m</div>
                <div className="text-sm text-muted-foreground">Time per Employee</div>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="card-metric-reduction">
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">85%</div>
                <div className="text-sm text-muted-foreground">Time Reduction</div>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="card-metric-roi">
              <CardContent className="pt-6">
                <DollarSign className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">48,000%</div>
                <div className="text-sm text-muted-foreground">ROI</div>
              </CardContent>
            </Card>
          </div>

          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="heading-challenge">The Challenge</h2>
            </div>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-lg text-muted-foreground mb-4">
                TechCorp Solutions was experiencing rapid growth, hiring 3-5 new employees monthly. Their IT Manager, <strong>Sarah Chen</strong>, was spending an entire workday setting up each new hire:
              </p>
              
              <ul className="space-y-2 mb-6">
                {challengeItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-red-500">{index + 1}</span>
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Time Investment</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">6-8 hours</p>
                    <p className="text-sm text-muted-foreground">per employee</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Monthly Impact</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">18-40 hours</p>
                    <p className="text-sm text-muted-foreground">of manual work</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Error Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">15%</p>
                    <p className="text-sm text-muted-foreground">required fixes</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="heading-solution">The PSForge Solution</h2>
            </div>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-lg text-muted-foreground mb-6">
                Sarah discovered PSForge and built an automated onboarding workflow using these tasks. Using PSForge's visual GUI, she chained these tasks together. Now HR sends a CSV file every Monday morning, and she runs the complete onboarding script in under 15 minutes.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card data-testid="card-free-tasks">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Unlock className="h-5 w-5 text-green-500" />
                      <CardTitle className="text-lg">Free Tier Tasks</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {freeTierTasks.map((task, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-primary/30" data-testid="card-pro-tasks">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Pro Tier Tasks</CardTitle>
                      <Badge variant="default" className="ml-auto">$5/month</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {proTierTasks.map((task, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="heading-results">The Results</h2>
            </div>
            
            <div className="space-y-6">
              <Card className="bg-green-500/5 border-green-500/20" data-testid="card-time-savings">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-500" />
                    Time Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Onboarding time reduced from <strong>6-8 hours to 45 minutes</strong> per employee</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span><strong>85% time reduction</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Monthly time savings: <strong>15-34 hours</strong></span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/5 border-blue-500/20" data-testid="card-quality">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    Quality Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span>Error rate dropped from <strong>15% to less than 1%</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span>Consistent configuration across all new hires</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span>Standardized security group assignments</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-purple-500/5 border-purple-500/20" data-testid="card-roi">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-purple-500" />
                    Return on Investment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>PSForge Pro cost: <strong>$5/month</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>Time saved value: <strong>$2,400+/month</strong> (at $80/hour IT labor rate)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>ROI: <strong className="text-2xl">48,000%</strong></span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-12">
            <Card className="bg-muted/30" data-testid="card-testimonial">
              <CardContent className="pt-6">
                <Quote className="h-10 w-10 text-primary/30 mb-4" />
                <blockquote className="text-xl italic text-foreground mb-4">
                  "PSForge transformed our onboarding process. What used to take me an entire day now takes 45 minutes. The AI assistant helped me build the script without needing to be a PowerShell expert. Best $5/month I've ever spent."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Sarah Chen</p>
                    <p className="text-sm text-muted-foreground">IT Manager, TechCorp Solutions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="border-t pt-12">
            <Card className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 border-primary/30" data-testid="card-cta">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4" data-testid="text-cta-heading">
                  Ready to Transform Your Onboarding Process?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Join Sarah and thousands of IT professionals who've eliminated manual user provisioning. Start with our free tier—no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                  <Link href="/signup?promo=FREE30">
                    <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-cta-signup">
                      <Sparkles className="h-5 w-5" />
                      Start Automating Free
                    </Button>
                  </Link>
                  <Link href="/case-studies">
                    <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto" data-testid="button-more-studies">
                      More Case Studies
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
                <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Use code <strong className="mx-1">FREE30</strong> for 30 days of Pro features
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </article>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PSForge. Professional PowerShell automation for IT teams.</p>
        </div>
      </footer>
    </div>
  );
}
