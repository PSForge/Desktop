import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { UpgradeModal } from "@/components/upgrade-modal";
import { Header } from "@/components/header";
import { changePasswordSchema, supportRequestSchema, type ChangePasswordData, type SupportRequestData, type Script, type Template } from "@shared/schema";
import { 
  User, 
  Mail, 
  CreditCard, 
  Calendar, 
  Shield,
  Settings,
  LogOut,
  Sparkles,
  BarChart3,
  Lock,
  Key,
  FileText,
  Trash2,
  FolderOpen,
  Code2,
  MessageSquare,
  Send,
  GitBranch,
  Github,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Download,
  Package,
  Star,
  AlertTriangle,
  Edit,
  Eye,
  DollarSign,
  Store,
  Clock,
  ArrowRight,
  Wallet,
  ShoppingBag
} from "lucide-react";
import { ProgressDashboard } from "@/components/pro-conversion/progress-dashboard";

export default function Account() {
  const { user, subscription, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: scripts, isLoading: scriptsLoading } = useQuery<Script[]>({
    queryKey: ["/api/scripts/user/me"],
    enabled: !!user,
  });

  const { data: githubUser, isLoading: githubUserLoading, error: githubUserError } = useQuery<any>({
    queryKey: ["/api/git/user"],
    enabled: !!user,
    retry: false,
  });

  const { data: gitRepositories, isLoading: gitReposLoading } = useQuery<any[]>({
    queryKey: ["/api/git/repositories"],
    enabled: !!user && !githubUserError,
    retry: false,
  });

  const { data: publishedTemplates, isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates/my-published"],
    enabled: !!user,
  });

  const { data: templateStats, isLoading: statsLoading } = useQuery<{
    totalTemplates: number;
    totalDownloads: number;
    totalInstalls: number;
    avgRating: number;
  }>({
    queryKey: ["/api/templates/stats/user", user?.id],
    enabled: !!user,
  });

  // Seller status query
  const { data: sellerStatus, isLoading: sellerStatusLoading, refetch: refetchSellerStatus } = useQuery<{
    isConnected: boolean;
    isOnboardingComplete: boolean;
    sellerStatus: string | null;
  }>({
    queryKey: ["/api/seller/onboarding-status"],
    enabled: !!user && (user.role === "subscriber" || user.role === "admin"),
  });

  // Seller earnings query
  const { data: sellerEarnings, isLoading: earningsLoading } = useQuery<{
    totalEarnings: number;
    pendingBalance: number;
    paidOut: number;
    totalSales: number;
    sales: any[];
    payouts: any[];
  }>({
    queryKey: ["/api/seller/earnings"],
    enabled: !!sellerStatus?.isOnboardingComplete,
  });

  // User purchases query
  type PurchaseWithTemplate = {
    id: string;
    templateId: string;
    priceCents: number;
    purchasedAt: string;
    status: string;
    template: {
      id: string;
      title: string;
      description: string;
    } | null;
    sellerName: string;
  };
  
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<PurchaseWithTemplate[]>({
    queryKey: ["/api/user/purchases"],
    enabled: !!user,
  });

  // Create Stripe Connect account mutation
  const createSellerAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/seller/connect", "POST");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start seller onboarding",
        variant: "destructive",
      });
    },
  });

  const disconnectRepoMutation = useMutation({
    mutationFn: async (repoId: string) => {
      await apiRequest(`/api/git/repositories/${repoId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git/repositories"] });
      toast({
        title: "Repository disconnected",
        description: "The repository has been disconnected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect failed",
        description: error.message || "Failed to disconnect repository",
        variant: "destructive",
      });
    },
  });

  const deleteScriptMutation = useMutation({
    mutationFn: async (scriptId: string) => {
      await apiRequest(`/api/scripts/${scriptId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts/user/me"] });
      toast({
        title: "Script deleted",
        description: "Your script has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete the script",
        variant: "destructive",
      });
    },
  });

  const handleLoadScript = (script: Script) => {
    localStorage.setItem('loadScript', JSON.stringify(script));
    setLocation("/builder");
  };

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/billing/portal", "POST");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  const passwordForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const response = await apiRequest("/auth/change-password", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your password has been changed successfully",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: ChangePasswordData) => {
    changePasswordMutation.mutate(data);
  };

  const supportForm = useForm<SupportRequestData>({
    resolver: zodResolver(supportRequestSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  const supportMutation = useMutation({
    mutationFn: async (data: SupportRequestData) => {
      const response = await apiRequest("/api/support/request", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Your support request has been sent successfully",
      });
      supportForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send support request",
        variant: "destructive",
      });
    },
  });

  const onSupportSubmit = (data: SupportRequestData) => {
    supportMutation.mutate(data);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  // Redirect to login if not authenticated (in useEffect to avoid side effects in render)
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isSubscriber = user.role === "subscriber";
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Account Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account and subscription</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="default"
                onClick={() => setLocation("/admin")}
                data-testid="button-admin-dashboard"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Admin Dashboard
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setLocation("/builder")}
              data-testid="button-back-to-builder"
            >
              Back to Builder
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-user-email">{user.email}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Account Type</p>
                    <div className="flex items-center gap-2 mt-1">
                      {isAdmin && (
                        <Badge variant="default" data-testid="badge-admin">Admin</Badge>
                      )}
                      {isSubscriber && !isAdmin && (
                        <Badge variant="default" data-testid="badge-subscriber">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Pro Subscriber
                        </Badge>
                      )}
                      {!isSubscriber && !isAdmin && (
                        <Badge variant="secondary" data-testid="badge-free">Free</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Progress & Achievements Dashboard */}
          <ProgressDashboard variant="full" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your current password"
                            {...field}
                            data-testid="input-current-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your new password"
                            {...field}
                            data-testid="input-new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm your new password"
                            {...field}
                            data-testid="input-confirm-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                    data-testid="button-change-password"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {!isSubscriber && !isAdmin && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Upgrade to Pro
                </CardTitle>
                <CardDescription>
                  Unlock AI Assistant and all 16 enterprise IT platform categories for just $5/month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full"
                  data-testid="button-upgrade-to-pro"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade Now - $5/month
                </Button>
              </CardContent>
            </Card>
          )}

          {(isSubscriber || isAdmin) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {subscription ? "Subscription" : "Billing"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Status</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={subscription.status === "active" ? "default" : "secondary"}
                              data-testid="badge-subscription-status"
                            >
                              {subscription.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {subscription.currentPeriodEnd && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-3">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Current Period Ends</p>
                            <p className="text-sm text-muted-foreground" data-testid="text-period-end">
                              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />
                  </>
                )}

                {!subscription && (
                  <p className="text-sm text-muted-foreground">
                    {isAdmin ? "Manage your billing and payment settings" : "View and manage your subscription"}
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  className="w-full"
                  data-testid="button-manage-billing"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {portalMutation.isPending ? "Loading..." : "Manage Billing"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Support Request
              </CardTitle>
              <CardDescription>
                Need help? Send us a message and we'll respond within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...supportForm}>
                <form onSubmit={supportForm.handleSubmit(onSupportSubmit)} className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Mail className="h-4 w-4" />
                    <span>Sending from: <strong>{user.email}</strong></span>
                  </div>

                  <FormField
                    control={supportForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Brief description of your issue"
                            {...field}
                            data-testid="input-support-subject"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supportForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please describe your issue or question in detail..."
                            className="min-h-32 resize-none"
                            {...field}
                            data-testid="input-support-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={supportMutation.isPending}
                    className="w-full"
                    data-testid="button-send-support-request"
                  >
                    {supportMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Sending Request...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Support Request
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Saved Scripts
              </CardTitle>
              <CardDescription>
                Scripts you've saved from the builder
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scriptsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  Loading scripts...
                </div>
              ) : !scripts || scripts.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No saved scripts yet</p>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/builder")}
                    data-testid="button-go-to-builder"
                  >
                    <Code2 className="h-4 w-4 mr-2" />
                    Go to Script Builder
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scripts.map((script) => (
                    <div
                      key={script.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                      data-testid={`script-item-${script.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <h4 className="font-medium text-sm truncate" data-testid={`script-name-${script.id}`}>
                            {script.name}
                          </h4>
                        </div>
                        {script.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {script.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(script.createdAt!).toLocaleDateString()}</span>
                          <span>{(new Blob([script.content]).size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadScript(script)}
                          data-testid={`button-load-${script.id}`}
                        >
                          <Code2 className="h-3.5 w-3.5 mr-1" />
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteScriptMutation.mutate(script.id!)}
                          disabled={deleteScriptMutation.isPending}
                          data-testid={`button-delete-${script.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Git Integration
              </CardTitle>
              <CardDescription>
                Connect your GitHub account to enable version control features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {githubUserLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  Checking GitHub connection...
                </div>
              ) : githubUserError || !githubUser ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">GitHub Not Connected</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Connect your GitHub account to enable commit, push, pull, and branch management features
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => window.open('/__replit/integrations', '_blank')}
                    className="w-full"
                    data-testid="button-connect-github"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    Connect GitHub Account
                    <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </Button>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">How to connect:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the button above to open the Integrations page</li>
                      <li>Find "GitHub" in the list of integrations</li>
                      <li>Click "Connect" and authorize PSForge</li>
                      <li>Return here to see your connection status</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">GitHub Connected</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Logged in as <strong>{githubUser.login}</strong>
                      </p>
                    </div>
                    {githubUser.avatar_url && (
                      <img
                        src={githubUser.avatar_url}
                        alt={githubUser.login}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      To disconnect your GitHub account, click "Manage Connection" and revoke PSForge's access.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.open('/__replit/integrations', '_blank')}
                      className="w-full"
                      data-testid="button-manage-github-connection"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Connection
                      <ExternalLink className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  </div>

                  {gitReposLoading ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-2"></div>
                      Loading repositories...
                    </div>
                  ) : gitRepositories && gitRepositories.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Connected Repositories ({gitRepositories.length})</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {gitRepositories.map((repo: any) => (
                          <div
                            key={repo.id}
                            className="flex items-center gap-2 p-2 rounded border text-sm hover-elevate"
                            data-testid={`git-repo-${repo.id}`}
                          >
                            <Github className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs truncate block">
                                {repo.repoOwner}/{repo.repoName}
                              </span>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {repo.currentBranch}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => disconnectRepoMutation.mutate(repo.id)}
                              disabled={disconnectRepoMutation.isPending}
                              data-testid={`button-disconnect-repo-${repo.id}`}
                              className="shrink-0 h-7"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No repositories connected yet. Go to the Script Builder to connect a repository.
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setLocation("/builder?tab=git")}
                    className="w-full"
                    data-testid="button-manage-git"
                  >
                    <GitBranch className="h-4 w-4 mr-2" />
                    Manage Git Integration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="section-template-contributions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template Contributions
              </CardTitle>
              <CardDescription>
                Templates you've published to the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Summary Card */}
              {statsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              ) : templateStats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border" data-testid="stat-templates-published">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <FileText className="h-4 w-4" />
                      <span>Templates Published</span>
                    </div>
                    <p className="text-2xl font-bold">{templateStats.totalTemplates}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border" data-testid="stat-total-downloads">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Download className="h-4 w-4" />
                      <span>Total Downloads</span>
                    </div>
                    <p className="text-2xl font-bold">{templateStats.totalDownloads}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border" data-testid="stat-total-installs">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Package className="h-4 w-4" />
                      <span>Total Installs</span>
                    </div>
                    <p className="text-2xl font-bold">{templateStats.totalInstalls}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border" data-testid="stat-average-rating">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Star className="h-4 w-4" />
                      <span>Average Rating</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{templateStats.avgRating}</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Star
                            key={rating}
                            className={`h-4 w-4 ${
                              rating <= templateStats.avgRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <Separator />

              {/* Published Templates List */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Published Templates</h3>
                
                {templatesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 rounded-lg border">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-full mb-3" />
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !publishedTemplates || publishedTemplates.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No templates published yet</p>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/marketplace")}
                      data-testid="button-browse-marketplace"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Browse Marketplace
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publishedTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 rounded-lg border hover-elevate"
                        data-testid={`template-contribution-${template.id}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium mb-1 truncate">{template.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={
                                  template.status === "approved"
                                    ? "default"
                                    : template.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {template.status}
                              </Badge>
                              
                              {template.securityScore !== null && template.securityScore !== undefined && template.securityScore < 80 && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Security: {template.securityScore}
                                </Badge>
                              )}
                              
                              <span className="text-xs text-muted-foreground">
                                {new Date(template.createdAt!).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Download className="h-4 w-4" />
                              <span>{template.downloads}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              <span>{template.installs}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{template.averageRating || 0}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {template.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/marketplace/${template.id}`)}
                                data-testid={`button-view-marketplace-${template.id}`}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                            )}
                            
                            {(template.status === "pending" || template.status === "rejected") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/marketplace/${template.id}`)}
                                data-testid={`button-edit-${template.id}`}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* My Purchases Section */}
          <Card data-testid="section-my-purchases">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                My Purchases
              </CardTitle>
              <CardDescription>
                Templates you've purchased from the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {purchasesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-full mb-3" />
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !purchases || purchases.length === 0 ? (
                <div className="text-center py-8 border rounded-lg">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No purchases yet</p>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/marketplace")}
                    data-testid="button-browse-marketplace-purchases"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Browse Marketplace
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="p-4 rounded-lg border"
                      data-testid={`purchase-item-${purchase.id}`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium mb-1 truncate">
                            {purchase.template?.title || "Unknown Template"}
                          </h4>
                          {purchase.template?.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {purchase.template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {purchase.sellerName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(purchase.purchasedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                            ${(purchase.priceCents / 100).toFixed(2)} paid
                          </Badge>
                          {purchase.template && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/marketplace/${purchase.templateId}`)}
                              data-testid={`button-view-purchase-${purchase.id}`}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seller Account Section */}
          <Card data-testid="section-seller-account">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Sell Templates
              </CardTitle>
              <CardDescription>
                Sell your PowerShell templates and earn 70% of each sale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Free users - prompt to upgrade */}
              {user?.role === "free" && (
                <div className="text-center py-4 space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
                    <h4 className="font-medium mb-1">Pro Subscription Required</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upgrade to Pro to sell templates on the marketplace and earn money from your PowerShell expertise.
                    </p>
                    <Button onClick={() => setShowUpgradeModal(true)} data-testid="button-upgrade-to-sell">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Upgrade to Pro - $5/month
                    </Button>
                  </div>
                </div>
              )}

              {/* Pro users - show seller status */}
              {(user?.role === "subscriber" || user?.role === "admin") && (
                <>
                  {sellerStatusLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : !sellerStatus?.isConnected ? (
                    /* Not connected - show onboarding CTA */
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <DollarSign className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">Start Selling Templates</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Connect your bank account via Stripe to receive payouts. You'll earn 70% of every sale (PSForge keeps 30% platform fee).
                            </p>
                            <ul className="text-sm space-y-1 mb-4">
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Secure payments via Stripe
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Price your templates $1-$50
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Automatic tax handling
                              </li>
                            </ul>
                          </div>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => createSellerAccountMutation.mutate()}
                          disabled={createSellerAccountMutation.isPending}
                          data-testid="button-become-seller"
                        >
                          {createSellerAccountMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Starting Onboarding...
                            </>
                          ) : (
                            <>
                              <Store className="h-4 w-4 mr-2" />
                              Become a Seller
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : !sellerStatus.isOnboardingComplete ? (
                    /* Connected but onboarding incomplete */
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-full bg-yellow-500/20">
                            <Clock className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">Complete Your Seller Setup</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              {sellerStatus.sellerStatus === "pending_verification" 
                                ? "Your account is being verified by Stripe. This usually takes 1-2 business days."
                                : "You haven't completed your Stripe Connect onboarding. Finish the setup to start selling."}
                            </p>
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {sellerStatus.sellerStatus === "pending_verification" ? "Under Review" : "Incomplete"}
                            </Badge>
                          </div>
                        </div>
                        {sellerStatus.sellerStatus !== "pending_verification" && (
                          <Button 
                            variant="outline" 
                            className="w-full mt-4"
                            onClick={() => createSellerAccountMutation.mutate()}
                            disabled={createSellerAccountMutation.isPending}
                            data-testid="button-continue-onboarding"
                          >
                            Continue Setup
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Active seller - show earnings dashboard */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active Seller
                        </Badge>
                      </div>

                      {earningsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 rounded-lg border">
                              <Skeleton className="h-4 w-24 mb-2" />
                              <Skeleton className="h-8 w-20" />
                            </div>
                          ))}
                        </div>
                      ) : sellerEarnings ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg border" data-testid="stat-total-earnings">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <DollarSign className="h-4 w-4" />
                              <span>Total Earnings</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                              ${(sellerEarnings.totalEarnings / 100).toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="p-4 rounded-lg border" data-testid="stat-pending-balance">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <Wallet className="h-4 w-4" />
                              <span>Pending Balance</span>
                            </div>
                            <p className="text-2xl font-bold">
                              ${(sellerEarnings.pendingBalance / 100).toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="p-4 rounded-lg border" data-testid="stat-paid-out">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <CreditCard className="h-4 w-4" />
                              <span>Paid Out</span>
                            </div>
                            <p className="text-2xl font-bold">
                              ${(sellerEarnings.paidOut / 100).toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="p-4 rounded-lg border" data-testid="stat-total-sales">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <Package className="h-4 w-4" />
                              <span>Total Sales</span>
                            </div>
                            <p className="text-2xl font-bold">{sellerEarnings.totalSales}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No sales yet. Publish a paid template to start earning!</p>
                        </div>
                      )}

                      <Separator />

                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setLocation("/seller-dashboard")}
                        data-testid="button-seller-dashboard"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Full Seller Dashboard
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <UpgradeModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  );
}
