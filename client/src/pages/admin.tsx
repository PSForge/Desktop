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
import { Users, DollarSign, TrendingUp, UserCheck, UserX, Activity, Shield, ArrowLeft, UserPlus, Trash2, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { AdminNotificationsSection } from "@/components/admin-notifications-section";
import { AdminEmailTemplatesSection } from "@/components/admin-email-templates-section";
import { AdminTemplateModerationSection } from "@/components/admin-template-moderation-section";
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

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  stripeCustomerId: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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
      <Header onExport={() => {}} hasCommands={false} />
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
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Manage user accounts and subscriptions
            </CardDescription>
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
            ) : users && users.length > 0 ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {users.map((userData) => (
                  <div
                    key={userData.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 border rounded-md hover-elevate"
                    data-testid={`user-row-${userData.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate" data-testid={`text-user-name-${userData.id}`}>
                          {userData.name}
                        </span>
                        <Badge variant={getRoleBadgeVariant(userData.role)} data-testid={`badge-role-${userData.id}`}>
                          {userData.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-user-email-${userData.id}`}>
                        {userData.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(userData.createdAt)}
                      </p>
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
              <p className="text-sm text-muted-foreground text-center py-8">
                No users found
              </p>
            )}
          </CardContent>
        </Card>

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
