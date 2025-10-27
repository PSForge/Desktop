import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { UpgradeModal } from "@/components/upgrade-modal";
import { 
  User, 
  Mail, 
  CreditCard, 
  Calendar, 
  Shield,
  Settings,
  LogOut,
  Sparkles
} from "lucide-react";

export default function Account() {
  const { user, subscription, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/portal");
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

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  const isSubscriber = user.role === "subscriber";
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Account Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account and subscription</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/builder")}
            data-testid="button-back-to-builder"
          >
            Back to Builder
          </Button>
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

          {(isSubscriber || isAdmin) && subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
