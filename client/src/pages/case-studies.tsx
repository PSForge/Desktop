import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import logoFullTransparent from "@assets/Full Logo Transparent_1761567685412.png";
import {
  ArrowRight,
  User,
  LogIn,
  Clock,
  Shield,
  HardDrive,
  Users,
  Building2,
  TrendingUp,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { Helmet } from "react-helmet";

const caseStudies = [
  {
    id: "techcorp-onboarding-automation",
    company: "TechCorp Solutions",
    industry: "Managed IT Services",
    headline: "Cuts Employee Onboarding Time by 85%",
    description: "Learn how a 45-person MSP reduced new hire setup from 6+ hours to just 45 minutes using PSForge's visual PowerShell builder for Active Directory and Exchange Online automation.",
    icon: Users,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    metric: "85%",
    metricLabel: "Time Reduction",
    tags: ["Active Directory", "Exchange Online", "User Provisioning", "CSV Import"],
    roi: "48,000%"
  },
  {
    id: "midwest-healthcare-compliance",
    company: "MidWest Healthcare",
    industry: "Healthcare IT",
    headline: "Achieves 100% Compliance Audit Pass Rate",
    description: "Discover how a 250-bed hospital's IT security team went from failing HIPAA audits to achieving perfect compliance scores using automated AD security scripts.",
    icon: Shield,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    metric: "100%",
    metricLabel: "Audit Pass Rate",
    tags: ["HIPAA Compliance", "Security Audit", "Active Directory", "Stale Account Cleanup"],
    roi: "$62,000+/year"
  },
  {
    id: "cloudfront-storage-management",
    company: "CloudFirst Consulting",
    industry: "Cloud Infrastructure",
    headline: "Eliminates Weekend Emergency Calls",
    description: "See how a 12-person MSP eliminated storage-related emergencies across 50+ client environments with proactive disk monitoring and automated cleanup scripts.",
    icon: HardDrive,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
    metric: "0",
    metricLabel: "Weekend Calls",
    tags: ["Disk Management", "VMware", "Proactive Monitoring", "MSP Automation"],
    roi: "12,700%"
  }
];

export default function CaseStudies() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>PowerShell Automation Case Studies | PSForge Success Stories</title>
        <meta name="description" content="Real-world PowerShell automation success stories. See how IT teams save 85% time on onboarding, achieve 100% compliance, and eliminate emergency calls with PSForge." />
        <meta name="keywords" content="PowerShell automation, IT automation case studies, Active Directory scripting, Exchange Online automation, HIPAA compliance scripts, MSP automation tools" />
        <meta property="og:title" content="PowerShell Automation Case Studies | PSForge" />
        <meta property="og:description" content="Real IT teams share how PSForge transformed their operations. 85% time savings, 100% compliance, zero emergencies." />
        <meta property="og:type" content="website" />
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

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-green-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-green-500/10" />
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="default" className="mb-4" data-testid="badge-case-studies">
              <Building2 className="h-3 w-3 mr-1" />
              Real-World Success Stories
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6" data-testid="text-heading">
              IT Teams Saving Thousands of Hours with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                PowerShell Automation
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-subheading">
              See how real IT professionals transformed their operations using PSForge. From employee onboarding to compliance audits to proactive monitoring—these case studies show what's possible.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="stat-time-saved">85%</div>
              <div className="text-sm text-muted-foreground">Avg. Time Saved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="stat-roi">12,000%+</div>
              <div className="text-sm text-muted-foreground">Average ROI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="stat-errors">99%</div>
              <div className="text-sm text-muted-foreground">Error Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="stat-cost">$5/mo</div>
              <div className="text-sm text-muted-foreground">Pro Investment</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {caseStudies.map((study, index) => {
            const IconComponent = study.icon;
            return (
              <Card key={study.id} className="hover-elevate flex flex-col" data-testid={`card-case-study-${index}`}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`h-12 w-12 rounded-lg ${study.iconBg} flex items-center justify-center`}>
                      <IconComponent className={`h-6 w-6 ${study.iconColor}`} />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">{study.metric}</div>
                      <div className="text-xs text-muted-foreground">{study.metricLabel}</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-primary">{study.company}</p>
                    <p className="text-xs text-muted-foreground">{study.industry}</p>
                  </div>
                  <CardTitle className="text-lg leading-tight">{study.headline}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription className="text-sm leading-relaxed">
                    {study.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {study.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/case-studies/${study.id}`} className="w-full">
                    <Button variant="outline" className="w-full gap-2" data-testid={`button-read-${study.id}`}>
                      Read Full Case Study
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-t bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4" data-testid="text-cta-heading">
              Ready to Transform Your IT Operations?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of IT professionals who've eliminated manual scripting with PSForge. Start free, upgrade when you're ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup">
                <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-cta-signup">
                  <Sparkles className="h-5 w-5" />
                  Start Free Today
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto" data-testid="button-cta-home">
                  Learn More
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-500" />
              No credit card required. Use code <strong>FREE30</strong> for 30 days of Pro features.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PSForge. Professional PowerShell automation for IT teams.</p>
        </div>
      </footer>
    </div>
  );
}
