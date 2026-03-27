import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { adminCreateUserSchema, type AdminCreateUserData } from "@shared/schema";
import { Users, DollarSign, TrendingUp, UserCheck, UserX, Activity, Shield, ArrowLeft, UserPlus, Trash2, FileText, Search, X, ArrowUpDown, ScanSearch, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { AdminNotificationsSection } from "@/components/admin-notifications-section";
import { AdminEmailTemplatesSection } from "@/components/admin-email-templates-section";
import { AdminTemplateModerationSection } from "@/components/admin-template-moderation-section";
import { AdminProConversionSection } from "@/components/admin-pro-conversion-section";
import { Header } from "@/components/header";

interface AnalyticsOverview {
  totalUsers: number;
  activeSubscribers: number;
  freeUsers: number;
  monthlyRecurringRevenue: number;
  totalRevenue: number;
  churnRate: number | null;
  newSignupsThisMonth: number;
  cancellationsThisMonth: number;
  totalScriptsGenerated: number;
  totalScriptsSaved: number;
  topTasks: Array<{ taskName: string; taskCategory: string; count: number }>;
  referralSources: Array<{ source: string; count: number; percentage: number }>;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  trends: {
    signupsLast30Days: number;
    subscriptionsLast30Days: number;
  };
}

interface TroubleshootAnalytics {
  totalAnalyses: number;
  analysesLast30Days: number;
  severity: {
    totalIssues: number;
    criticalCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  topPlatforms: Array<{ platform: string; count: number }>;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  stripeCustomerId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "email" | "role" | "date" | "lastLogin">("date");

  const createUserForm = useForm<AdminCreateUserData>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "free",
    },
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    enabled: user?.role === "admin",
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === "admin",
  });

  const { data: troubleshootAnalytics, isLoading: troubleshootLoading } = useQuery<TroubleshootAnalytics>({
    queryKey: ["/api/admin/troubleshoot-analytics"],
    enabled: user?.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest(`/api/admin/users/${userId}/role`, "PATCH", { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      setEditingUserId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: AdminCreateUserData) => {
      const response = await apiRequest("/api/admin/users", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      createUserForm.reset();
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest(`/api/admin/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({
        title: "Success",
        description: "User account deleted successfully",
      });
      setDeletingUserId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const syncSubscriptionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/admin/sync-subscriptions", "POST", {});
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      
      const { summary, details } = data;
      toast({
        title: "Subscription Sync Complete",
        description: `Scanned ${summary.total} users. Updated ${summary.updated} to Pro tier. ${summary.errors} errors.`,
      });
      
      // Log details for admin review
      console.log("Sync details:", details);
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync subscriptions",
        variant: "destructive",
      });
    },
  });

  const filteredAndSortedUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = users.filter((userData) => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      const name = (userData.name || "").toLowerCase();
      const email = (userData.email || "").toLowerCase();
      const role = (userData.role || "").toLowerCase();
      
      return (
        name.includes(query) ||
        email.includes(query) ||
        role.includes(query)
      );
    });
    
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "email":
          return (a.email || "").localeCompare(b.email || "");
        case "role":
          return (a.role || "").localeCompare(b.role || "");
        case "date":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "lastLogin":
          const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return bLogin - aLogin;
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [users, searchQuery, sortBy]);

  const onCreateUserSubmit = (data: AdminCreateUserData) => {
    createUserMutation.mutate(data);
  };

  if (authLoading || !user || user.role !== "admin") {
    return null;
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" => {
    switch (role) {
      case "admin":
        return "destructive";
      case "subscriber":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                PSForge platform analytics and user management
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/account")}
              data-testid="button-back-to-account"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Account Settings
            </Button>
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">Subscription Sync Tool</h3>
                  <p className="text-sm text-muted-foreground">
                    Sync user accounts with Stripe to grant Pro access to paid subscribers
                  </p>
                </div>
                <Button
                  onClick={() => syncSubscriptionsMutation.mutate()}
                  disabled={syncSubscriptionsMutation.isPending}
                  data-testid="button-sync-subscriptions"
                >
                  {syncSubscriptionsMutation.isPending ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Sync Subscriptions
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {analyticsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card data-testid="card-total-users">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-users">
                    {analytics.overview.totalUsers}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.trends.signupsLast30Days} new in last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-active-subscribers">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-subscribers">
                    {analytics.overview.activeSubscribers}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.trends.subscriptionsLast30Days} new in last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-mrr">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-mrr">
                    {formatCurrency(analytics.overview.monthlyRecurringRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MRR from {analytics.overview.activeSubscribers} subscribers
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-churn-rate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-churn-rate">
                    {analytics.overview.churnRate !== null 
                      ? `${analytics.overview.churnRate.toFixed(1)}%`
                      : "N/A"
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.overview.cancellationsThisMonth} cancellations this month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card data-testid="card-scripts-generated">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scripts Generated</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-scripts-generated">
                    {analytics.overview.totalScriptsGenerated}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total scripts created by users
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-scripts-saved">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scripts Saved</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-scripts-saved">
                    {analytics.overview.totalScriptsSaved}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saved to user profiles
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Breakdown</CardTitle>
                  <CardDescription>Distribution by account type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Subscribers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {analytics.overview.activeSubscribers}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({analytics.overview.totalUsers > 0 
                            ? ((analytics.overview.activeSubscribers / analytics.overview.totalUsers) * 100).toFixed(1)
                            : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Free Users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {analytics.overview.freeUsers}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({analytics.overview.totalUsers > 0 
                            ? ((analytics.overview.freeUsers / analytics.overview.totalUsers) * 100).toFixed(1)
                            : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">New Signups</span>
                      </div>
                      <span className="text-sm font-medium">
                        {analytics.trends.signupsLast30Days}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">New Subscriptions</span>
                      </div>
                      <span className="text-sm font-medium">
                        {analytics.trends.subscriptionsLast30Days}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Cancellations</span>
                      </div>
                      <span className="text-sm font-medium">
                        {analytics.overview.cancellationsThisMonth}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-8">
              <Card data-testid="card-top-tasks">
                <CardHeader>
                  <CardTitle>Top Tasks</CardTitle>
                  <CardDescription>Most frequently used automation tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    {analytics.overview.topTasks.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.overview.topTasks.map((task, index) => (
                          <div key={index} className="flex items-center justify-between gap-2 pb-3 border-b last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{task.taskName}</p>
                              <p className="text-xs text-muted-foreground truncate">{task.taskCategory}</p>
                            </div>
                            <Badge variant="secondary" data-testid={`badge-task-count-${index}`}>
                              {task.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No task data available yet</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card data-testid="card-referral-sources">
                <CardHeader>
                  <CardTitle>Referral Sources</CardTitle>
                  <CardDescription>Marketing attribution & user acquisition</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    {analytics.overview.referralSources.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.overview.referralSources.map((source, index) => (
                          <div key={index} className="flex items-center justify-between gap-2 pb-3 border-b last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{source.source}</p>
                              <p className="text-xs text-muted-foreground">{source.percentage.toFixed(1)}% of users</p>
                            </div>
                            <Badge variant="secondary" data-testid={`badge-source-count-${index}`}>
                              {source.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No referral data available yet</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        {/* Log Troubleshooter Analytics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-muted-foreground" />
            Log Troubleshooter Analytics
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Log content is processed in memory and never stored. Only anonymised metadata (platform and issue counts) is recorded.
          </p>

          {troubleshootLoading ? (
            <div className="grid gap-4 md:grid-cols-4 mb-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-24" /></CardContent></Card>
              ))}
            </div>
          ) : troubleshootAnalytics ? (
            <>
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <Card data-testid="card-total-analyses">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                    <ScanSearch className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-analyses">
                      {troubleshootAnalytics.totalAnalyses}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {troubleshootAnalytics.analysesLast30Days} in the last 30 days
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-critical-issues">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Critical Issues Found</CardTitle>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive" data-testid="text-critical-count">
                      {troubleshootAnalytics.severity.criticalCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      + {troubleshootAnalytics.severity.errorCount} errors detected
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-warning-issues">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Warnings Detected</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-warning-count">
                      {troubleshootAnalytics.severity.warningCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all log analyses
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-info-issues">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Issues Found</CardTitle>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-issues">
                      {troubleshootAnalytics.severity.totalIssues}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {troubleshootAnalytics.severity.infoCount} informational
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="card-top-platforms">
                <CardHeader>
                  <CardTitle>Top Platforms Analysed</CardTitle>
                  <CardDescription>Platforms most frequently submitted for log troubleshooting</CardDescription>
                </CardHeader>
                <CardContent>
                  {troubleshootAnalytics.topPlatforms.length > 0 ? (
                    <div className="space-y-3">
                      {troubleshootAnalytics.topPlatforms.map((p, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 pb-3 border-b last:border-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-platform-${index}`}>{p.platform}</p>
                          <Badge variant="secondary" data-testid={`badge-platform-count-${index}`}>{p.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No log analyses recorded yet</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Create New User</CardTitle>
                <CardDescription>
                  Add a new user account with a specific role
                </CardDescription>
              </div>
              {!showCreateForm && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  data-testid="button-show-create-user"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              )}
            </div>
          </CardHeader>
          {showCreateForm && (
            <CardContent>
              <Form {...createUserForm}>
                <form onSubmit={createUserForm.handleSubmit(onCreateUserSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createUserForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              {...field}
                              data-testid="input-create-user-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createUserForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="user@example.com"
                              {...field}
                              data-testid="input-create-user-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createUserForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="At least 8 characters"
                              {...field}
                              data-testid="input-create-user-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createUserForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-create-user-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="subscriber">Subscriber</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={createUserMutation.isPending}
                      data-testid="button-submit-create-user"
                    >
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        createUserForm.reset();
                      }}
                      disabled={createUserMutation.isPending}
                      data-testid="button-cancel-create-user"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Manage user accounts and subscriptions
                </CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                    data-testid="input-search-users"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      data-testid="button-clear-search"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-48" data-testid="select-sort-users">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Join Date</SelectItem>
                    <SelectItem value="lastLogin">Sort by Last Login</SelectItem>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="email">Sort by Email</SelectItem>
                    <SelectItem value="role">Sort by Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {users && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedUsers.length} of {users.length} users
                  {searchQuery && ` (filtered by "${searchQuery}")`}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredAndSortedUsers.length > 0 ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {filteredAndSortedUsers.map((userData) => (
                  <div
                    key={userData.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 border rounded-md hover-elevate"
                    data-testid={`user-row-${userData.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate" data-testid={`text-user-name-${userData.id}`}>
                          {userData.name || "Unknown User"}
                        </span>
                        <Badge variant={getRoleBadgeVariant(userData.role || "free")} data-testid={`badge-role-${userData.id}`}>
                          {userData.role || "free"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-user-email-${userData.id}`}>
                        {userData.email || "No email"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>Joined {formatDate(userData.createdAt)}</span>
                        <span>Last login: {userData.lastLoginAt ? formatDate(userData.lastLoginAt) : "Never"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {userData.stripeCustomerId && (
                        <Badge variant="outline" className="text-xs">
                          Stripe Customer
                        </Badge>
                      )}
                      {userData.id === user?.id ? (
                        <Badge variant="outline" className="text-xs">
                          Your Account
                        </Badge>
                      ) : editingUserId === userData.id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            defaultValue={userData.role}
                            onValueChange={(value) => {
                              updateRoleMutation.mutate({
                                userId: userData.id,
                                role: value,
                              });
                            }}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-role-${userData.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="subscriber">Subscriber</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUserId(null)}
                            data-testid={`button-cancel-edit-${userData.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUserId(userData.id)}
                            data-testid={`button-edit-role-${userData.id}`}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Change Role
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingUserId(userData.id)}
                            data-testid={`button-delete-${userData.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-2">
                  {searchQuery ? "No users match your search" : "No users found"}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    data-testid="button-clear-search-empty"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <AdminProConversionSection />

        <AdminNotificationsSection />
        
        <AdminEmailTemplatesSection />
        
        <AdminTemplateModerationSection />
      </div>

      <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user account? This action cannot be undone.
              All user data, scripts, and subscriptions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingUserId) {
                  deleteUserMutation.mutate(deletingUserId);
                }
              }}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
