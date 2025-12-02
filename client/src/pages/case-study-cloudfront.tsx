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
  HardDrive,
  Building2,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Target,
  Quote,
  Zap,
  DollarSign,
  PhoneOff,
  Lock,
  Unlock,
  Server,
  Users
} from "lucide-react";
import { Helmet } from "react-helmet";

export default function CaseStudyCloudFirst() {
  const { user } = useAuth();

  const challengeItems = [
    "Servers running out of disk space unexpectedly",
    "Critical applications crashing due to storage issues",
    "No proactive monitoring of storage capacity",
    "Manual cleanup taking 3-4 hours per incident",
    "Client frustration with reactive (not proactive) support"
  ];

  const freeTierTasks = [
    "Disk Space Report (All Drives) (File System)",
    "Find Large Files (Top N) (File System)",
    "File Type Breakdown Report (File System)",
    "Duplicate File Finder (Hash-Based) (File System)",
    "Clean Windows Temp Folders (File System)",
    "Delete Old Files (Age-Based) (File System)",
    "Cleanup Old Files (File System)"
  ];

  const proTierTasks = [
    "Monitor Host Health and Performance Metrics (VMware vSphere)",
    "Generate vCenter Capacity Reports (VMware vSphere)",
    "Export VM Inventory Report (VMware vSphere)"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>CloudFirst Consulting Case Study: Zero Weekend Emergency Calls | PSForge</title>
        <meta name="description" content="Discover how CloudFirst Consulting eliminated storage-related emergencies across 50+ client environments using PSForge proactive monitoring. MSP automation, disk space management, and VMware capacity planning case study." />
        <meta name="keywords" content="MSP automation tools, disk space monitoring PowerShell, proactive IT monitoring, storage management scripts, VMware capacity planning, managed services automation, IT emergency prevention, duplicate file cleanup" />
        <meta property="og:title" content="Zero Weekend Emergency Calls with Proactive Storage Monitoring" />
        <meta property="og:description" content="CloudFirst MSP eliminated weekend emergencies across 50+ clients. See how PSForge transformed their operations." />
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
                Cloud Infrastructure
              </Badge>
              <Badge variant="secondary" data-testid="badge-size">
                <Users className="h-3 w-3 mr-1" />
                12-Person MSP
              </Badge>
              <Badge variant="secondary" data-testid="badge-clients">
                <Server className="h-3 w-3 mr-1" />
                50+ Client Environments
              </Badge>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4" data-testid="text-title">
              CloudFirst Consulting Eliminates{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
                Weekend Emergency Calls
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground" data-testid="text-subtitle">
              How a 12-person MSP went from 2-3 weekend emergencies per month to zero storage-related incidents using proactive PowerShell monitoring scripts.
            </p>
          </header>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <Card className="text-center" data-testid="card-metric-calls">
              <CardContent className="pt-6">
                <PhoneOff className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">0</div>
                <div className="text-sm text-muted-foreground">Weekend Calls</div>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="card-metric-clients">
              <CardContent className="pt-6">
                <Server className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">50+</div>
                <div className="text-sm text-muted-foreground">Client Environments</div>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="card-metric-roi">
              <CardContent className="pt-6">
                <DollarSign className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">12,700%</div>
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
                CloudFirst Consulting was drowning in emergency support tickets. Lead Engineer <strong>David Rodriguez</strong> was getting called every weekend to deal with storage crises:
              </p>
              
              <ul className="space-y-2 mb-6">
                {challengeItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <HardDrive className="h-3 w-3 text-red-500" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <PhoneOff className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Weekend Calls</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">2-3</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Time Per Incident</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">3-4 hours</p>
                    <p className="text-sm text-muted-foreground">of emergency work</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-foreground">Client Satisfaction</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">Declining</p>
                    <p className="text-sm text-muted-foreground">due to reactive approach</p>
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
                David built a proactive storage management system using PSForge that runs weekly across all 50+ client environments. Using PSForge's CSV bulk operations feature, he runs the script across all client servers simultaneously, with automated email alerts when storage hits 80% capacity.
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
              <Card className="bg-green-500/5 border-green-500/20" data-testid="card-operational">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-500" />
                    Operational Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Weekend emergency calls reduced from 2-3/month to <strong>zero</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span><strong>100% reduction</strong> in storage-related emergencies</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Proactive alerts catch issues <strong>2-3 weeks before critical</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Automated cleanup recovers <strong>50-200GB per client monthly</strong></span>
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
                      <span>Emergency response time eliminated: <strong>6-12 hours/month</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span>Proactive monitoring time: <strong>30 minutes/week</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span>Net time savings: <strong>4-10 hours/month</strong></span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-purple-500/5 border-purple-500/20" data-testid="card-client">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Client Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>Client retention improved by <strong>15%</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>Upsold storage upgrades based on trend data</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>Positioned as <strong>proactive partner</strong> vs. reactive support</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-amber-500/5 border-amber-500/20" data-testid="card-roi">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                    Financial Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <span>PSForge Pro cost: <strong>$5/month</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <span>Time saved value: <strong>$640-$1,600/month</strong> (at $160/hour consulting rate)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <span>Additional revenue from storage upgrades: <strong>$3,000+/quarter</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <span>ROI: <strong className="text-2xl">12,700%+</strong></span>
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
                  "PSForge transformed how we deliver managed services. We went from firefighting every weekend to proactively managing storage across 50+ environments. Our clients love the proactive approach, and I love having my weekends back. The CSV bulk operations feature is a game-changer for MSPs."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">David Rodriguez</p>
                    <p className="text-sm text-muted-foreground">Lead Engineer, CloudFirst Consulting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="border-t pt-12">
            <Card className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 border-primary/30" data-testid="card-cta">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4" data-testid="text-cta-heading">
                  Ready to Eliminate Your Weekend Emergencies?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Join David and MSPs who've transformed from reactive firefighting to proactive monitoring. Most disk management tasks are available in our free tier.
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
