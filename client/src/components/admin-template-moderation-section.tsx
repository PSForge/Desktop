import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import { FileCheck, FileX, Eye, CheckCircle, XCircle, Shield, AlertTriangle, ShieldAlert } from "lucide-react";
import type { Template } from "@shared/schema";
import { format } from "date-fns";

interface TemplateStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
}

interface TemplateWithAuthor extends Template {
  authorName?: string;
  categoryName?: string;
}

interface ModerationAction {
  templateId: string;
  action: "approve" | "reject";
}

export function AdminTemplateModerationSection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [moderationAction, setModerationAction] = useState<ModerationAction | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<TemplateStats>({
    queryKey: ["/api/templates/stats"],
  });

  const statusFilter = activeTab === "all" ? undefined : activeTab;
  
  const { data: templates = [], isLoading: templatesLoading} = useQuery<TemplateWithAuthor[]>({
    queryKey: ["/api/admin/templates", statusFilter],
    queryFn: async () => {
      const url = statusFilter 
        ? `/api/admin/templates?status=${statusFilter}`
        : "/api/admin/templates";
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ templateId, status }: { templateId: string; status: "approved" | "rejected" }) => {
      const response = await apiRequest("PUT", `/api/templates/${templateId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template moderated",
        description: `Template has been ${moderationAction?.action === "approve" ? "approved" : "rejected"} successfully`,
      });
      setModerationAction(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to moderate template",
        variant: "destructive",
      });
    },
  });

  const handleModerationConfirm = () => {
    if (!moderationAction) return;
    
    const status = moderationAction.action === "approve" ? "approved" : "rejected";
    moderateMutation.mutate({ templateId: moderationAction.templateId, status });
  };

  const handleViewTemplate = (templateId: string) => {
    window.open(`/marketplace/${templateId}`, "_blank");
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const getSecurityBadgeProps = (score: number | null | undefined) => {
    if (!score && score !== 0) return null;
    
    if (score >= 80) {
      return {
        variant: "secondary" as const,
        className: "bg-secondary text-green-600 dark:text-green-400",
        icon: Shield,
        label: "Safe",
        priority: 3
      };
    } else if (score >= 50) {
      return {
        variant: "secondary" as const,
        className: "bg-secondary text-yellow-600 dark:text-yellow-400",
        icon: AlertTriangle,
        label: "Caution",
        priority: 2
      };
    } else {
      return {
        variant: "destructive" as const,
        className: "",
        icon: ShieldAlert,
        label: "Dangerous",
        priority: 1
      };
    }
  };

  // Sort templates by security level (dangerous first for review priority)
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const aSecurity = getSecurityBadgeProps(a.securityScore);
      const bSecurity = getSecurityBadgeProps(b.securityScore);
      
      // Templates without security scan come last
      if (!aSecurity && !bSecurity) return 0;
      if (!aSecurity) return 1;
      if (!bSecurity) return -1;
      
      // Sort by priority (1=dangerous, 2=caution, 3=safe)
      // Lower priority number (dangerous) comes first
      return aSecurity.priority - bSecurity.priority;
    });
  }, [templates]);

  const renderTemplateCard = (template: TemplateWithAuthor) => {
    const securityProps = getSecurityBadgeProps(template.securityScore);
    
    return (
    <div
      key={template.id}
      className="flex flex-col gap-4 p-4 border rounded-lg hover-elevate"
      data-testid={`template-moderation-${template.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-base font-bold" data-testid={`text-template-title-${template.id}`}>
              {template.title}
            </h3>
            {template.categoryName && (
              <Badge variant="secondary" data-testid={`badge-category-${template.id}`}>
                {template.categoryName}
              </Badge>
            )}
            {securityProps && (
              <Badge 
                variant={securityProps.variant}
                className={securityProps.className}
                data-testid={`security-badge-${template.id}`}
              >
                {(() => {
                  const SecurityIcon = securityProps.icon;
                  return <SecurityIcon className="w-3 h-3 mr-1" />;
                })()}
                {securityProps.label} ({template.securityScore})
                {template.securityWarningsCount && template.securityWarningsCount > 0 && (
                  <span className="ml-1">• {template.securityWarningsCount} warning{template.securityWarningsCount !== 1 ? 's' : ''}</span>
                )}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {truncateText(template.description)}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {template.authorName && (
              <span data-testid={`text-author-${template.id}`}>
                Author: {template.authorName}
              </span>
            )}
            <span data-testid={`text-version-${template.id}`}>
              v{template.version || "1.0.0"}
            </span>
            <span data-testid={`text-created-${template.id}`}>
              Created {format(new Date(template.createdAt!), "MMM d, yyyy")}
            </span>
            <span data-testid={`text-stats-${template.id}`}>
              {template.downloads || 0} downloads • {template.installs || 0} installs
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewTemplate(template.id!)}
            data-testid={`button-view-template-${template.id}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          
          {template.status === "pending" && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setModerationAction({ templateId: template.id!, action: "approve" })}
                data-testid={`button-approve-${template.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setModerationAction({ templateId: template.id!, action: "reject" })}
                data-testid={`button-reject-${template.id}`}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
  };

  const renderEmptyState = (status: string) => (
    <div className="text-center py-12 space-y-2">
      <p className="text-sm text-muted-foreground">
        No {status === "all" ? "" : status} templates found
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-4 p-4 border rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="section-template-moderation">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Template Moderation
          </CardTitle>
          <CardDescription>
            Review and approve community-submitted PowerShell templates for the marketplace
          </CardDescription>
          
          <div className="flex items-center gap-4 pt-4 flex-wrap">
            {statsLoading ? (
              <>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-32" />
              </>
            ) : stats ? (
              <>
                <Badge variant="secondary" data-testid="badge-stats-pending">
                  Pending: {stats.totalPending}
                </Badge>
                <Badge variant="default" data-testid="badge-stats-approved">
                  Approved: {stats.totalApproved}
                </Badge>
                <Badge variant="destructive" data-testid="badge-stats-rejected">
                  Rejected: {stats.totalRejected}
                </Badge>
              </>
            ) : null}
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger 
                value="pending" 
                data-testid="tab-pending-templates"
              >
                Pending
                {stats && stats.totalPending > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.totalPending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="approved" 
                data-testid="tab-approved-templates"
              >
                Approved
                {stats && stats.totalApproved > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.totalApproved}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="rejected" 
                data-testid="tab-rejected-templates"
              >
                Rejected
                {stats && stats.totalRejected > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.totalRejected}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                All
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-0">
              <ScrollArea className="h-[600px] pr-4">
                {templatesLoading ? (
                  renderLoadingState()
                ) : sortedTemplates.length > 0 ? (
                  <div className="space-y-4">
                    {sortedTemplates.map(renderTemplateCard)}
                  </div>
                ) : (
                  renderEmptyState("pending")
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="approved" className="mt-0">
              <ScrollArea className="h-[600px] pr-4">
                {templatesLoading ? (
                  renderLoadingState()
                ) : sortedTemplates.length > 0 ? (
                  <div className="space-y-4">
                    {sortedTemplates.map(renderTemplateCard)}
                  </div>
                ) : (
                  renderEmptyState("approved")
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="rejected" className="mt-0">
              <ScrollArea className="h-[600px] pr-4">
                {templatesLoading ? (
                  renderLoadingState()
                ) : sortedTemplates.length > 0 ? (
                  <div className="space-y-4">
                    {sortedTemplates.map(renderTemplateCard)}
                  </div>
                ) : (
                  renderEmptyState("rejected")
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="all" className="mt-0">
              <ScrollArea className="h-[600px] pr-4">
                {templatesLoading ? (
                  renderLoadingState()
                ) : sortedTemplates.length > 0 ? (
                  <div className="space-y-4">
                    {sortedTemplates.map(renderTemplateCard)}
                  </div>
                ) : (
                  renderEmptyState("all")
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog 
        open={!!moderationAction} 
        onOpenChange={(open) => !open && setModerationAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {moderationAction?.action === "approve" ? "Approve Template" : "Reject Template"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {moderationAction?.action === "approve"
                ? "Are you sure you want to approve this template? It will be published to the marketplace and visible to all users."
                : "Are you sure you want to reject this template? The author will be notified and the template will not appear in the marketplace."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-moderation">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleModerationConfirm}
              disabled={moderateMutation.isPending}
              className={
                moderationAction?.action === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
              data-testid="button-confirm-moderation"
            >
              {moderateMutation.isPending
                ? "Processing..."
                : moderationAction?.action === "approve"
                ? "Approve Template"
                : "Reject Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
