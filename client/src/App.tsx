import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
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
import NotFound from "@/pages/not-found";
import { ProNudgeModal } from "@/components/pro-conversion/pro-nudge-modal";
import { CookieConsent } from "@/components/cookie-consent";
import { LoginProPrompt } from "@/components/login-pro-prompt";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";

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
      <Route path="/marketplace/:id" component={MarketplaceDetail} />
      <Route path="/marketplace" component={TemplatesMarketplace} />
      <Route path="/account" component={Account} />
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/settings" component={Settings} />
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
  // Initialize Google Analytics when app loads
  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="powershell-generator-theme">
          <TooltipProvider>
            <Toaster />
            <Router />
            <LoginProPrompt />
            <ProNudgeModal />
            <CookieConsent />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
