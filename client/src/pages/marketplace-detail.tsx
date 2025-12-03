import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft,
  Download,
  Wrench,
  Star,
  Trash2,
  Edit,
  User,
  Calendar,
  Package,
  ChevronRight,
  DollarSign,
  ShoppingCart,
  Check,
  Lock,
} from "lucide-react";
import type { Template, TemplateRating } from "@shared/schema";
import { format } from "date-fns";

interface TemplateWithAuthor extends Template {
  authorName?: string;
  categoryName?: string;
  isPaid?: boolean;
  priceCents?: number;
}

interface Purchase {
  id: string;
  templateId: string;
  purchasedAt: string;
}

interface TemplateRatingWithUser extends TemplateRating {
  userName?: string;
}

export default function MarketplaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch template details
  const { data: template, isLoading: templateLoading } = useQuery<TemplateWithAuthor>({
    queryKey: ["/api/templates", id],
    enabled: !!id,
  });

  // Fetch template ratings
  const { data: ratings = [], isLoading: ratingsLoading } = useQuery<TemplateRatingWithUser[]>({
    queryKey: ["/api/templates", id, "ratings"],
    enabled: !!id,
  });

  // Fetch user's own rating (if logged in)
  const { data: myRatingData } = useQuery<{ rating: TemplateRatingWithUser | null }>({
    queryKey: ["/api/templates", id, "my-rating"],
    enabled: !!id && !!user,
  });

  const myRating = myRatingData?.rating;

  // Fetch user's purchases to check ownership
  const { data: purchases = [] } = useQuery<Purchase[]>({
    queryKey: ["/api/user/purchases"],
    enabled: !!user,
  });

  // Helper to check if user owns the template (purchased or is author)
  const hasTemplateAccess = (): boolean => {
    if (!template?.isPaid) return true;
    if (template?.authorId === user?.id) return true;
    return purchases.some(p => p.templateId === template?.id);
  };

  // Format price for display
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  // Install mutation
  const installMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/templates/${id}/install`, "POST");
    },
    onSuccess: () => {
      // Copy template content to localStorage and navigate to script builder
      if (template) {
        localStorage.setItem('powershell-script', JSON.stringify({ script: template.content }));
        setLocation('/builder');
        toast({
          title: "Template Installed",
          description: `"${template.title}" has been loaded into the script builder.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Installation Failed",
        description: error.message || "Failed to install template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      if (!rating) {
        throw new Error("Please select a rating");
      }
      return await apiRequest(`/api/templates/${id}/rate`, "POST", {
        rating,
        review: review.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates", id, "ratings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates", id, "my-rating"] });
      setRating(0);
      setReview("");
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rating Failed",
        description: error.message || "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "The template has been removed from the marketplace.",
      });
      setLocation("/marketplace");
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = () => {
    if (!template) return;

    const blob = new Blob([template.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template.title.replace(/[^a-z0-9]/gi, "_")}.ps1`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: `Downloading ${template.title}.ps1`,
    });
  };

  const handleInstall = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to install templates.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    
    // Check if this is a paid template the user hasn't purchased
    if (template?.isPaid && !hasTemplateAccess()) {
      toast({
        title: "Purchase Required",
        description: `This template costs $${formatPrice(template.priceCents || 0)}. Please purchase to install.`,
        variant: "destructive",
      });
      return;
    }
    
    installMutation.mutate();
  };

  // Handle purchase - create Stripe checkout
  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase templates.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    try {
      const response = await apiRequest(`/api/templates/${id}/purchase`, "POST");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No checkout URL returned");
      }
    } catch (error: unknown) {
      console.error("Purchase error:", error);
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Could not initiate purchase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitRating = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to rate templates.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    submitRatingMutation.mutate();
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const renderStars = (count: number, interactive: boolean = false) => {
    const stars = [];
    const displayRating = interactive ? (hoverRating || rating) : count;

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-5 w-5 ${interactive ? "cursor-pointer" : ""} ${
            i <= displayRating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
          onClick={interactive ? () => setRating(i) : undefined}
          onMouseEnter={interactive ? () => setHoverRating(i) : undefined}
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        />
      );
    }

    return stars;
  };

  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const isAuthor = user?.id === template?.authorId;
  const isAdmin = user?.role === "admin";
  const canEdit = isAuthor || isAdmin;
  const canRate = user && !isAuthor && !myRating;
  const showStatus = (template?.status !== "approved") && canEdit;

  if (templateLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!template) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Template Not Found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                The template you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/marketplace")} data-testid="button-back-to-marketplace">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header onExport={() => {}} hasCommands={false} />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button and Breadcrumb */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/marketplace")}
            className="mb-4"
            data-testid="button-back-to-marketplace"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Marketplace</span>
            <ChevronRight className="h-4 w-4" />
            {template.categoryName && (
              <>
                <span>{template.categoryName}</span>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
            <span className="text-foreground">{template.title}</span>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Main Content Section (7/10) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Title and Metadata */}
            <div>
              <h1 className="text-3xl font-bold mb-4" data-testid="text-template-title">
                {template.title}
              </h1>

              {/* Author Info */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground" data-testid="text-author-name">
                    by {template.authorName || "Unknown Author"}
                  </span>
                </div>

                {template.categoryName && (
                  <Badge variant="outline" data-testid="badge-category">
                    {template.categoryName}
                  </Badge>
                )}

                {showStatus && (
                  <Badge variant={getStatusBadgeVariant(template.status)} data-testid="badge-status">
                    {template.status}
                  </Badge>
                )}
              </div>

              {/* Rating and Stats */}
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(template.averageRating || 0))}
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-rating-count">
                    ({template.totalRatings || 0} {template.totalRatings === 1 ? 'rating' : 'ratings'})
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm text-muted-foreground" data-testid="text-downloads">
                  {template.downloads || 0} downloads
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm text-muted-foreground" data-testid="text-installs">
                  {template.installs || 0} installs
                </span>
              </div>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm" data-testid="text-description">
                    {template.description}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* PowerShell Code Preview */}
            <Card>
              <CardHeader>
                <CardTitle>PowerShell Code</CardTitle>
                <CardDescription>Preview of the template script</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden" data-testid="template-code-editor">
                  <Editor
                    height="400px"
                    language="powershell"
                    value={template.content}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      lineNumbers: "on",
                      folding: true,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" data-testid={`badge-tag-${index}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle>Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Version:</span>
                  <span data-testid="text-version">{template.version || "1.0.0"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span data-testid="text-created">
                    {template.createdAt ? format(new Date(template.createdAt), "PPP") : "Unknown"}
                  </span>
                </div>
                {template.updatedAt && template.updatedAt !== template.createdAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated:</span>
                    <span data-testid="text-updated">
                      {format(new Date(template.updatedAt), "PPP")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ratings & Reviews Section */}
            <Card>
              <CardHeader>
                <CardTitle>Ratings & Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rating Form (if logged in and not author and hasn't rated) */}
                {canRate && (
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="font-medium">Rate this template</h3>
                    <div className="flex items-center gap-2">
                      {renderStars(rating, true)}
                    </div>
                    <Textarea
                      placeholder="Write a review (optional)"
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      rows={3}
                      data-testid="input-review"
                    />
                    <Button
                      onClick={handleSubmitRating}
                      disabled={rating === 0 || submitRatingMutation.isPending}
                      data-testid="button-submit-rating"
                    >
                      {submitRatingMutation.isPending ? "Submitting..." : "Submit Rating"}
                    </Button>
                  </div>
                )}

                {/* Display Ratings */}
                {ratingsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : ratings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No reviews yet. Be the first to rate this template!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {ratings.map((r) => (
                      <div
                        key={r.id}
                        className={`space-y-2 pb-4 border-b last:border-0 ${
                          r.userId === user?.id ? "bg-accent/10 p-4 rounded-md" : ""
                        }`}
                        data-testid={`review-${r.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>
                                <User className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm" data-testid={`review-user-${r.id}`}>
                              {r.userName || "Anonymous"}
                              {r.userId === user?.id && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  You
                                </Badge>
                              )}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground" data-testid={`review-date-${r.id}`}>
                            {r.createdAt ? format(new Date(r.createdAt), "PPP") : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" data-testid={`review-stars-${r.id}`}>
                          {renderStars(r.rating)}
                        </div>
                        {r.review && (
                          <p className="text-sm whitespace-pre-wrap" data-testid={`review-text-${r.id}`}>
                            {r.review}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Section (3/10) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Pricing Badge */}
            {template.isPaid && template.priceCents ? (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="pt-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Template Price</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${formatPrice(template.priceCents)}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-green-500/30" />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Template Price</p>
                    <p className="text-2xl font-bold">Free</p>
                  </div>
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                {/* Primary action button - Purchase or Install */}
                {(() => {
                  const isPaid = template.isPaid && template.priceCents;
                  const hasAccess = hasTemplateAccess();
                  
                  if (isPaid && !hasAccess && !isAuthor) {
                    // Paid template user hasn't purchased
                    return (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handlePurchase}
                        data-testid="button-purchase-template"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase for ${formatPrice(template.priceCents!)}
                      </Button>
                    );
                  } else if (isPaid && hasAccess && !isAuthor) {
                    // User has purchased this template
                    return (
                      <>
                        <Badge className="w-full justify-center py-2 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                          <Check className="h-4 w-4 mr-2" />
                          Purchased
                        </Badge>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleInstall}
                          disabled={installMutation.isPending}
                          data-testid="button-install-template"
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          {installMutation.isPending ? "Installing..." : "Install Template"}
                        </Button>
                      </>
                    );
                  } else {
                    // Free template or author's own template
                    return (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleInstall}
                        disabled={installMutation.isPending}
                        data-testid="button-install-template"
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        {installMutation.isPending ? "Installing..." : "Install Template"}
                      </Button>
                    );
                  }
                })()}

                {/* Download button - only show if user has access */}
                {hasTemplateAccess() && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleDownload}
                    data-testid="button-download-template"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download .ps1
                  </Button>
                )}
                
                {/* Show locked indicator for paid templates without access */}
                {template.isPaid && !hasTemplateAccess() && !isAuthor && (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 inline mr-1" />
                    Purchase to access download
                  </div>
                )}

                {canEdit && (
                  <>
                    <Separator />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setLocation(`/marketplace/${id}/edit`)}
                      data-testid="button-edit-template"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Template
                    </Button>
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      data-testid="button-delete-template"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Template
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Downloads</span>
                  <span className="font-medium" data-testid="sidebar-downloads">
                    {template.downloads || 0}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Installs</span>
                  <span className="font-medium" data-testid="sidebar-installs">
                    {template.installs || 0}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ratings</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium" data-testid="sidebar-rating">
                      {template.averageRating?.toFixed(1) || "0.0"} ({template.totalRatings || 0})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Author Card */}
            <Card>
              <CardHeader>
                <CardTitle>Author</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium" data-testid="sidebar-author-name">
                      {template.authorName || "Unknown Author"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Template Author
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
