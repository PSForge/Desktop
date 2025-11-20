import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { 
  Search, 
  Star, 
  Download, 
  Package, 
  Sparkles,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileCode
} from "lucide-react";
import type { Template, TemplateCategory } from "@shared/schema";

const ITEMS_PER_PAGE = 12;

type SortOption = "popular" | "newest" | "top-rated";

interface TemplateWithAuthor extends Template {
  authorName?: string;
  categoryName?: string;
}

export default function TemplatesMarketplace() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"all" | "featured" | "my-published">("all");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch templates based on active tab
  const getTemplatesQueryKey = () => {
    const params = new URLSearchParams();
    
    if (activeTab === "featured") {
      params.append("featured", "true");
      params.append("status", "approved");
    } else if (activeTab === "my-published") {
      // For user's own templates, we want to see all statuses
      return ["/api/templates/my-published"];
    } else {
      // For "all" tab, only show approved templates
      params.append("status", "approved");
    }
    
    if (selectedCategory !== "all") {
      params.append("categoryId", selectedCategory);
    }
    
    const queryString = params.toString();
    return [`/api/templates${queryString ? `?${queryString}` : ""}`];
  };

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TemplateWithAuthor[]>({
    queryKey: getTemplatesQueryKey(),
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<TemplateCategory[]>({
    queryKey: ["/api/template-categories"],
  });

  // Filter and sort templates
  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = [...templates];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.title.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b.downloads || 0) - (a.downloads || 0);
        case "newest":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "top-rated":
          return (b.averageRating || 0) - (a.averageRating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [templates, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTemplates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = filteredAndSortedTemplates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    handleFilterChange();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    handleFilterChange();
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    handleFilterChange();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as typeof activeTab);
    setCurrentPage(1);
  };

  const handleViewDetails = (templateId: string) => {
    setLocation(`/marketplace/${templateId}`);
  };

  const handleInstall = (template: Template) => {
    // TODO: Implement install functionality
    toast({
      title: "Installing template",
      description: `"${template.title}" will be added to your library.`,
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < fullStars
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
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

  return (
    <>
      <Header onExport={() => {}} hasCommands={false} />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Templates Marketplace
            </h1>
          </div>
          <p className="text-muted-foreground">
            Browse and install PowerShell script templates created by the community
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-templates">
              All Templates
            </TabsTrigger>
            <TabsTrigger value="featured" data-testid="tab-featured">
              <Sparkles className="h-4 w-4 mr-2" />
              Featured
            </TabsTrigger>
            {user && (
              <TabsTrigger value="my-published" data-testid="tab-my-templates">
                <FileCode className="h-4 w-4 mr-2" />
                My Published
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-templates"
                />
              </div>

              {/* Category Filter and Sort */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Category Filter */}
                <div className="flex-1">
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-2 pb-2">
                      <Button
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCategoryChange("all")}
                        data-testid="button-category-all"
                      >
                        All Categories
                      </Button>
                      {categoriesLoading ? (
                        <>
                          {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-8 w-24" />
                          ))}
                        </>
                      ) : (
                        categories.map((category) => (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleCategoryChange(category.id!)}
                            data-testid={`button-category-${category.id}`}
                          >
                            {category.name}
                          </Button>
                        ))
                      )}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-full sm:w-48" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Popular
                      </div>
                    </SelectItem>
                    <SelectItem value="newest">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Newest
                      </div>
                    </SelectItem>
                    <SelectItem value="top-rated">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Top Rated
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Templates Grid */}
            {templatesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Skeleton className="h-9 flex-1" />
                      <Skeleton className="h-9 flex-1" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : paginatedTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    {searchQuery
                      ? "Try adjusting your search or filters to find what you're looking for."
                      : activeTab === "my-published"
                      ? "You haven't published any templates yet. Create a script and publish it to the marketplace!"
                      : "No templates are available in this category."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="flex flex-col hover-elevate"
                      data-testid={`template-card-${template.id}`}
                    >
                      <CardHeader className="gap-2 space-y-0 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-2">
                            {template.title}
                          </CardTitle>
                          {template.featured && (
                            <Badge variant="default" className="shrink-0">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        
                        {/* Author and Category */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>by {template.authorName || "Unknown"}</span>
                          {template.categoryName && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="text-xs">
                                {template.categoryName}
                              </Badge>
                            </>
                          )}
                        </div>

                        {/* Status Badge (for admin/author) */}
                        {(user?.role === "admin" || activeTab === "my-published") && template.status && (
                          <Badge variant={getStatusBadgeVariant(template.status)} className="w-fit">
                            {template.status}
                          </Badge>
                        )}
                      </CardHeader>

                      <CardContent className="flex-1">
                        <CardDescription className="line-clamp-3 mb-4">
                          {template.description}
                        </CardDescription>

                        {/* Stats */}
                        <div className="space-y-2">
                          {/* Rating */}
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {renderStars(template.averageRating || 0)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {template.averageRating ? template.averageRating.toFixed(1) : "0.0"} 
                              {" "}({template.totalRatings || 0})
                            </span>
                          </div>

                          {/* Downloads and Installs */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              <span>{template.downloads || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>{template.installs || 0} installs</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleViewDetails(template.id!)}
                          data-testid={`button-view-${template.id}`}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => handleInstall(template)}
                          data-testid={`button-install-${template.id}`}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Install
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first, last, current, and adjacent pages
                          return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, index, array) => {
                          // Add ellipsis
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && (
                                <span className="px-2 text-muted-foreground">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                data-testid={`button-page-${page}`}
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
