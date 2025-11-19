import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Save, RotateCcw } from "lucide-react";
import type { WelcomeEmailTemplate } from "@shared/schema";

export function AdminEmailTemplatesSection() {
  const { toast } = useToast();
  const [freeSignupSubject, setFreeSignupSubject] = useState("");
  const [freeSignupContent, setFreeSignupContent] = useState("");
  const [freeSignupEnabled, setFreeSignupEnabled] = useState(true);
  const [subscriptionSubject, setSubscriptionSubject] = useState("");
  const [subscriptionContent, setSubscriptionContent] = useState("");
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);

  const { data: templates, isLoading } = useQuery<WelcomeEmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  useEffect(() => {
    if (templates) {
      const freeSignup = templates.find((t: WelcomeEmailTemplate) => t.type === "free_signup");
      const subscription = templates.find((t: WelcomeEmailTemplate) => t.type === "subscription");
      
      if (freeSignup) {
        setFreeSignupSubject(freeSignup.subject);
        setFreeSignupContent(freeSignup.htmlContent);
        setFreeSignupEnabled(freeSignup.enabled);
      }
      
      if (subscription) {
        setSubscriptionSubject(subscription.subject);
        setSubscriptionContent(subscription.htmlContent);
        setSubscriptionEnabled(subscription.enabled);
      }
    }
  }, [templates]);

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WelcomeEmailTemplate> }) => {
      const response = await apiRequest("PATCH", `/api/admin/email-templates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({
        title: "Success",
        description: "Email template updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email template",
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { type: string; subject: string; htmlContent: string; enabled: boolean }) => {
      const response = await apiRequest("/api/admin/email-templates", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({
        title: "Success",
        description: "Email template created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create email template",
        variant: "destructive",
      });
    },
  });

  const handleSaveFreeSignup = () => {
    const existing = templates?.find(t => t.type === "free_signup");
    if (existing) {
      updateTemplateMutation.mutate({
        id: existing.id,
        data: {
          subject: freeSignupSubject,
          htmlContent: freeSignupContent,
          enabled: freeSignupEnabled,
        },
      });
    } else {
      createTemplateMutation.mutate({
        type: "free_signup",
        subject: freeSignupSubject,
        htmlContent: freeSignupContent,
        enabled: freeSignupEnabled,
      });
    }
  };

  const handleSaveSubscription = () => {
    const existing = templates?.find(t => t.type === "subscription");
    if (existing) {
      updateTemplateMutation.mutate({
        id: existing.id,
        data: {
          subject: subscriptionSubject,
          htmlContent: subscriptionContent,
          enabled: subscriptionEnabled,
        },
      });
    } else {
      createTemplateMutation.mutate({
        type: "subscription",
        subject: subscriptionSubject,
        htmlContent: subscriptionContent,
        enabled: subscriptionEnabled,
      });
    }
  };

  const handleResetFreeSignup = () => {
    const template = templates?.find(t => t.type === "free_signup");
    if (template) {
      setFreeSignupSubject(template.subject);
      setFreeSignupContent(template.htmlContent);
      setFreeSignupEnabled(template.enabled);
    }
  };

  const handleResetSubscription = () => {
    const template = templates?.find(t => t.type === "subscription");
    if (template) {
      setSubscriptionSubject(template.subject);
      setSubscriptionContent(template.htmlContent);
      setSubscriptionEnabled(template.enabled);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome Email Templates</CardTitle>
          <CardDescription>Configure automated welcome emails for new users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Welcome Email Templates</CardTitle>
        </div>
        <CardDescription>
          Configure automated welcome emails sent to new users and subscribers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Free Account Signup Email</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="free-signup-enabled">Enabled</Label>
                <Switch
                  id="free-signup-enabled"
                  checked={freeSignupEnabled}
                  onCheckedChange={setFreeSignupEnabled}
                  data-testid="switch-free-signup-enabled"
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This email is sent when a user creates a free account
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="free-signup-subject">Subject Line</Label>
              <Input
                id="free-signup-subject"
                value={freeSignupSubject}
                onChange={(e) => setFreeSignupSubject(e.target.value)}
                placeholder="Welcome to PSForge!"
                data-testid="input-free-signup-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="free-signup-content">Email Content (HTML)</Label>
              <Textarea
                id="free-signup-content"
                value={freeSignupContent}
                onChange={(e) => setFreeSignupContent(e.target.value)}
                placeholder="Enter HTML email template..."
                className="font-mono text-sm min-h-[200px]"
                data-testid="textarea-free-signup-content"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveFreeSignup}
              disabled={updateTemplateMutation.isPending || createTemplateMutation.isPending}
              data-testid="button-save-free-signup"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
            <Button
              variant="outline"
              onClick={handleResetFreeSignup}
              disabled={updateTemplateMutation.isPending || createTemplateMutation.isPending}
              data-testid="button-reset-free-signup"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Subscription Welcome Email</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="subscription-enabled">Enabled</Label>
                <Switch
                  id="subscription-enabled"
                  checked={subscriptionEnabled}
                  onCheckedChange={setSubscriptionEnabled}
                  data-testid="switch-subscription-enabled"
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This email is sent when a user subscribes to PSForge Premium
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscription-subject">Subject Line</Label>
              <Input
                id="subscription-subject"
                value={subscriptionSubject}
                onChange={(e) => setSubscriptionSubject(e.target.value)}
                placeholder="Welcome to PSForge Premium!"
                data-testid="input-subscription-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription-content">Email Content (HTML)</Label>
              <Textarea
                id="subscription-content"
                value={subscriptionContent}
                onChange={(e) => setSubscriptionContent(e.target.value)}
                placeholder="Enter HTML email template..."
                className="font-mono text-sm min-h-[200px]"
                data-testid="textarea-subscription-content"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveSubscription}
              disabled={updateTemplateMutation.isPending || createTemplateMutation.isPending}
              data-testid="button-save-subscription"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
            <Button
              variant="outline"
              onClick={handleResetSubscription}
              disabled={updateTemplateMutation.isPending || createTemplateMutation.isPending}
              data-testid="button-reset-subscription"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
