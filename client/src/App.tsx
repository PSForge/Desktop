import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Home from "@/pages/home";
import ScriptBuilder from "@/pages/script-builder";
import ScriptLibrary from "@/pages/script-library";
import TemplatesMarketplace from "@/pages/marketplace";
import MarketplaceDetail from "@/pages/marketplace-detail";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Account from "@/pages/account";
import AdminDashboard from "@/pages/admin";
import CaseStudies from "@/pages/case-studies";
import CaseStudyTechCorp from "@/pages/case-study-techcorp";
import CaseStudyMidwest from "@/pages/case-study-midwest";
import CaseStudyCloudFirst from "@/pages/case-study-cloudfront";
import About from "@/pages/about";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Security from "@/pages/security";
import SellerDashboard from "@/pages/seller-dashboard";
import Settings from "@/pages/settings";
import CliPage from "@/pages/cli";
import DesktopConnect from "@/pages/desktop-connect";
import NotFound from "@/pages/not-found";
import { ProNudgeModal } from "@/components/pro-conversion/pro-nudge-modal";
import { CookieConsent } from "@/components/cookie-consent";
import { LoginProPrompt } from "@/components/login-pro-prompt";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { isDesktopApp } from "@/lib/desktop";
import { Package, Clock, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import DesktopWorkspace from "@/pages/desktop-workspace";

function MarketplaceComingSoon() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-10 w-10 text-primary" />
          </div>
        </div>
        <Badge variant="secondary" className="px-4 py-1.5 text-sm">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Coming Soon
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Templates Marketplace
        </h1>
        <p className="text-lg text-muted-foreground">
          The PSForge Marketplace is currently in development. Browse and install community PowerShell script templates, sell your own scripts, and discover proven automation solutions.
        </p>
        <Card className="text-left">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">What's coming</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Community-shared script templates, one-click installs, ratings & reviews, and a seller marketplace with 70% revenue share for script creators.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/library">
            <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-coming-soon-library">
              Go to Script Library
            </Button>
          </Link>
          <Link href="/builder">
            <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto" data-testid="button-coming-soon-builder">
              Open Script Builder
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminOnly({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role === "admin") return <Component />;
  return <MarketplaceComingSoon />;
}

function Router() {
  // Track page views when routes change - Google Analytics
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/builder" component={ScriptBuilder} />
      <Route path="/library" component={ScriptLibrary} />
      <Route path="/marketplace/:id" component={() => <AdminOnly component={MarketplaceDetail} />} />
      <Route path="/marketplace" component={() => <AdminOnly component={TemplatesMarketplace} />} />
      <Route path="/account" component={Account} />
      <Route path="/seller-dashboard" component={() => <AdminOnly component={SellerDashboard} />} />
      <Route path="/settings" component={Settings} />
      <Route path="/cli" component={CliPage} />
      <Route path="/desktop-connect" component={DesktopConnect} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/case-studies/techcorp-onboarding-automation" component={CaseStudyTechCorp} />
      <Route path="/case-studies/midwest-healthcare-compliance" component={CaseStudyMidwest} />
      <Route path="/case-studies/cloudfront-storage-management" component={CaseStudyCloudFirst} />
      <Route path="/case-studies" component={CaseStudies} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/security" component={Security} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const desktopMode = isDesktopApp();

  // Initialize Google Analytics when app loads
  useEffect(() => {
    if (desktopMode) {
      return;
    }

    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, [desktopMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="powershell-generator-theme">
          <TooltipProvider>
            <Toaster />
            {desktopMode ? <DesktopWorkspace /> : <Router />}
            {!desktopMode && <LoginProPrompt />}
            {!desktopMode && <ProNudgeModal />}
            {!desktopMode && <CookieConsent />}
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
