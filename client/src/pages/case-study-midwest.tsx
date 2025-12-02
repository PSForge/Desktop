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
  Shield,
  Building2,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Target,
  Quote,
  Zap,
  DollarSign,
  FileWarning,
  Lock,
  Unlock,
  Server
} from "lucide-react";
import { Helmet } from "react-helmet";

export default function CaseStudyMidwest() {
  const { user } = useAuth();

  const challengeItems = [
    "Stale computer accounts creating security vulnerabilities",
    "Privileged group memberships not properly monitored",
    "Service accounts with exploitable configurations",
    "Accounts with non-expiring passwords",
    "No audit trail of permission changes"
  ];

  const freeTierTasks = [
    "Cleanup Stale Computers (Active Directory)",
    "Audit Privileged Groups (Active Directory)",
    "Audit Kerberoastable SPNs (Active Directory)",
    "Password Never Expires Audit (Active Directory)",
    "Orphaned/Empty Groups Report (Active Directory)",
    "Weekly AD Health Report (Active Directory)",
    "Replication Failure Watcher (Active Directory)",
    "NTFS Permissions Review (Active Directory)"
  ];

  const proTierTasks = [
    "Bulk Mailbox Permission Audit Report (Exchange Online)",
    "Configure Mailbox Litigation Hold (Exchange Online)",
    "Configure Mailbox Audit Bypass (Exchange Online)"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>MidWest Healthcare Case Study: 100% HIPAA Compliance with PowerShell Automation | PSForge</title>
        <meta name="description" content="See how MidWest Healthcare achieved 100% HIPAA compliance audit pass rate using PSForge PowerShell automation. Active Directory security auditing, stale account cleanup, and compliance reporting case study." />
        <meta name="keywords" content="HIPAA compliance automation, Active Directory security audit, PowerShell compliance scripts, healthcare IT security, stale account cleanup, Kerberoasting prevention, AD health monitoring, security audit automation" />
        <meta property="og:title" content="100% HIPAA Compliance with Automated Security Auditing" />
        <meta property="og:description" content="MidWest Healthcare went from failing audits to perfect compliance. See how PSForge transformed their security operations." />
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
                Healthcare IT
              </Badge>
              <Badge variant="secondary" data-testid="badge-size">
                <Server className="h-3 w-3 mr-1" />
                250-bed Hospital
              </Badge>
              <Badge variant="secondary" data-testid="badge-employees">
                800+ Employees
              </Badge>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4" data-testid="text-title">
              MidWest Healthcare Achieves{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-cyan-500">
                100% Compliance Audit Pass Rate
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground" data-testid="text-subtitle">
              How a hospital IT security team went from failing HIPAA audits to achieving perfect compliance scores using automated Active Directory security scripts.
            </p>
          </header>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <Card className="text-center" data-testid="card-metric-compliance">
              <CardContent className="pt-6">
                <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">100%</div>
                <div className="text-sm text-muted-foreground">Audit Pass Rate</div>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="card-metric-time">
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">95%</div>
                <div className="text-sm text-muted-foreground">Time Reduction</div>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="card-metric-value">
              <CardContent className="pt-6">
                <DollarSign className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">$62K+</div>
                <div className="text-sm text-muted-foreground">Annual Value</div>
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
                MidWest Healthcare's IT Security team was struggling with HIPAA compliance requirements. Their quarterly audits consistently revealed critical security gaps:
              </p>
              
              <ul className="space-y-2 mb-6">
                {challengeItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileWarning className="h-3 w-3 text-red-500" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Compliance Status</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">Failed 3</p>
                    <p className="text-sm text-muted-foreground">consecutive audits</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Risk Exposure</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">$50,000+</p>
                    <p className="text-sm text-muted-foreground">potential HIPAA fines</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Manual Audit Time</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">40+ hours</p>
                    <p className="text-sm text-muted-foreground">per quarter</p>
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
                Security Administrator <strong>Marcus Thompson</strong> implemented a comprehensive monthly security audit using PSForge. He scheduled the script to run automatically on the first Monday of each month, generating compliance-ready reports.
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
              <Card className="bg-green-500/5 border-green-500/20" data-testid="card-compliance-results">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Compliance Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span><strong>100% pass rate</strong> on last 4 quarterly audits</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Identified and remediated <strong>127 stale computer accounts</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Discovered <strong>8 service accounts vulnerable to Kerberoasting</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Found <strong>23 accounts with non-expiring passwords</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Cleaned up <strong>94 empty security groups</strong></span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/5 border-blue-500/20" data-testid="card-time-savings">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Time Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span>Audit preparation time reduced from <strong>40 hours to 2 hours</strong> per quarter</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span><strong>95% time reduction</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span>Annual time savings: <strong>152 hours</strong></span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-purple-500/5 border-purple-500/20" data-testid="card-risk">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Risk Mitigation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>Avoided potential <strong>HIPAA fines of $50,000+</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>Improved security posture significantly</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>Created audit trail for compliance documentation</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-amber-500/5 border-amber-500/20" data-testid="card-roi">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                    Return on Investment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <span>PSForge Pro cost: <strong>$5/month ($60/year)</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <span>Time saved value: <strong>$12,160/year</strong> (at $80/hour)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <span>Avoided compliance fines: <strong>$50,000+</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <span>Total annual value: <strong className="text-2xl">$62,000+</strong></span>
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
                  "PSForge gave us the automation we needed to stay compliant without hiring additional staff. The security audit tasks are comprehensive, and the reports are audit-ready. We went from failing audits to passing with flying colors."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Marcus Thompson</p>
                    <p className="text-sm text-muted-foreground">Security Administrator, MidWest Healthcare</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="border-t pt-12">
            <Card className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 border-primary/30" data-testid="card-cta">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4" data-testid="text-cta-heading">
                  Ready to Achieve 100% Compliance?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Join Marcus and IT security teams who've automated their compliance workflows. Most security audit tasks are available in our free tier.
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
