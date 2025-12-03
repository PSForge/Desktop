import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { scanPowerShellScript, type SecurityScanResult } from "@/lib/security-scanner";
import { 
  Star, 
  Clock, 
  Tag as TagIcon, 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  Copy,
  Plus,
  X,
  FileText,
  Calendar,
  FileCode,
  Sparkles,
  LayoutGrid,
  Wand2,
  Shield,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  DollarSign,
  Store,
  Info
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Script, Tag, TemplateCategory, InsertTemplate } from "@shared/schema";
import { insertTemplateSchema } from "@shared/schema";

export default function ScriptLibrary() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [activeTab, setActiveTab] = useState("all");
  const [managingTagsForScript, setManagingTagsForScript] = useState<string | null>(null);
  const [scriptTags, setScriptTags] = useState<Record<string, Tag[]>>({});
  const [publishingScript, setPublishingScript] = useState<Script | null>(null);
  const [securityScan, setSecurityScan] = useState<SecurityScanResult | null>(null);
  const [risksAcknowledged, setRisksAcknowledged] = useState(false);
  const [securityAnalysisExpanded, setSecurityAnalysisExpanded] = useState(true);
  const [isPaidTemplate, setIsPaidTemplate] = useState(false);
  const [templatePrice, setTemplatePrice] = useState<number>(500); // Default $5.00 in cents

  // Fetch all user scripts
  const { data: scripts = [], isLoading: scriptsLoading } = useQuery<Script[]>({
    queryKey: ['/api/scripts/user/me'],
  });

  // Fetch favorites
  const { data: favorites = [] } = useQuery<Script[]>({
    queryKey: ['/api/scripts/library/favorites'],
  });

  // Fetch recent scripts
  const { data: recentScripts = [] } = useQuery<Script[]>({
    queryKey: ['/api/scripts/library/recent'],
  });

  // Fetch all tags
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ['/api/tags'],
  });

  // Fetch template categories
  const { data: templateCategories = [] } = useQuery<TemplateCategory[]>({
    queryKey: ['/api/template-categories'],
  });

  // Seller status query for paid templates
  const { data: sellerStatus } = useQuery<{
    isConnected: boolean;
    isOnboardingComplete: boolean;
    sellerStatus: string | null;
  }>({
    queryKey: ["/api/seller/onboarding-status"],
    enabled: !!user && (user.role === "subscriber" || user.role === "admin"),
  });

  // Calculate earnings preview
  const PLATFORM_FEE_PERCENTAGE = 30;
  const calculateEarnings = (priceCents: number) => {
    const platformFee = Math.round(priceCents * (PLATFORM_FEE_PERCENTAGE / 100));
    const sellerEarnings = priceCents - platformFee;
    return { platformFee, sellerEarnings };
  };

  // Fetch script tags when managing tags for a script
  const { data: currentScriptTags = [] } = useQuery<Tag[]>({
    queryKey: ['/api/scripts', managingTagsForScript, 'tags'],
    enabled: !!managingTagsForScript,
  });

  // Form for publishing template
  const publishForm = useForm<InsertTemplate>({
    resolver: zodResolver(insertTemplateSchema.extend({
      description: insertTemplateSchema.shape.description.min(50, "Description must be at least 50 characters"),
      tags: insertTemplateSchema.shape.tags.max(5, "Maximum 5 tags allowed"),
    })),
    defaultValues: {
      authorId: user?.id || "",
      sourceScriptId: "",
      title: "",
      description: "",
      content: "",
      categoryId: "",
      tags: [],
      status: "pending",
      featured: false,
      version: "1.0.0",
    },
  });

  // Populate form and run security scan when publishing script is selected
  useEffect(() => {
    if (publishingScript) {
      publishForm.reset({
        authorId: user?.id || "",
        sourceScriptId: publishingScript.id || "",
        title: publishingScript.name,
        description: publishingScript.description || "",
        content: publishingScript.content,
        categoryId: "",
        tags: [],
        status: "pending",
        featured: false,
        version: "1.0.0",
      });
      
      // Run security scan on script content
      const scanResult = scanPowerShellScript(publishingScript.content);
      setSecurityScan(scanResult);
      setRisksAcknowledged(false);
      setSecurityAnalysisExpanded(scanResult.securityLevel === 'dangerous');
      
      // Reset pricing state
      setIsPaidTemplate(false);
      setTemplatePrice(500);
    } else {
      setSecurityScan(null);
      setRisksAcknowledged(false);
      setSecurityAnalysisExpanded(true);
      setIsPaidTemplate(false);
      setTemplatePrice(500);
    }
  }, [publishingScript, user?.id]);

  // Fetch tags for all scripts when they load
  useEffect(() => {
    async function fetchAllScriptTags() {
      const newScriptTags: Record<string, Tag[]> = {};
      
      for (const script of scripts) {
        if (script.id) {
          try {
            const response = await fetch(`/api/scripts/${script.id}/tags`, {
              credentials: 'include',
            });
            if (response.ok) {
              const tags = await response.json();
              newScriptTags[script.id] = tags;
            }
          } catch (error) {
            console.error(`Failed to fetch tags for script ${script.id}:`, error);
          }
        }
      }
      
      setScriptTags(newScriptTags);
    }
    
    if (scripts.length > 0) {
      fetchAllScriptTags();
    }
  }, [scripts]);

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (tagData: { name: string; color?: string }) => {
      return await apiRequest('/api/tags', 'POST', tagData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      toast({
        title: "Tag created",
        description: "Your tag has been created successfully.",
      });
      setShowCreateTag(false);
      setNewTagName("");
      setNewTagColor("#3b82f6");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tag",
        variant: "destructive",
      });
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return await apiRequest(`/api/tags/${tagId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      toast({
        title: "Tag deleted",
        description: "Tag has been removed from all scripts.",
      });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (scriptId: string) => {
      return await apiRequest(`/api/scripts/${scriptId}/favorite`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts/user/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scripts/library/favorites'] });
    },
  });

  // Delete script mutation
  const deleteScriptMutation = useMutation({
    mutationFn: async (scriptId: string) => {
      return await apiRequest(`/api/scripts/${scriptId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts/user/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scripts/library/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scripts/library/recent'] });
      toast({
        title: "Script deleted",
        description: "The script has been removed from your library.",
      });
    },
  });

  // Update last accessed
  const updateAccessMutation = useMutation({
    mutationFn: async (scriptId: string) => {
      return await apiRequest(`/api/scripts/${scriptId}/access`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts/library/recent'] });
    },
  });

  // Add tag to script mutation
  const addTagToScriptMutation = useMutation({
    mutationFn: async ({ scriptId, tagId }: { scriptId: string; tagId: string }) => {
      return await apiRequest(`/api/scripts/${scriptId}/tags/${tagId}`, 'POST');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts', variables.scriptId, 'tags'] });
      
      // Update scriptTags state immediately
      const tag = tags.find(t => t.id === variables.tagId);
      if (tag) {
        setScriptTags(prev => ({
          ...prev,
          [variables.scriptId]: [...(prev[variables.scriptId] || []), tag]
        }));
      }
      
      toast({
        title: "Tag added",
        description: "Tag has been added to the script.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add tag to script",
        variant: "destructive",
      });
    },
  });

  // Remove tag from script mutation
  const removeTagFromScriptMutation = useMutation({
    mutationFn: async ({ scriptId, tagId }: { scriptId: string; tagId: string }) => {
      return await apiRequest(`/api/scripts/${scriptId}/tags/${tagId}`, 'DELETE');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts', variables.scriptId, 'tags'] });
      
      // Update scriptTags state immediately
      setScriptTags(prev => ({
        ...prev,
        [variables.scriptId]: (prev[variables.scriptId] || []).filter(t => t.id !== variables.tagId)
      }));
      
      toast({
        title: "Tag removed",
        description: "Tag has been removed from the script.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove tag from script",
        variant: "destructive",
      });
    },
  });

  // Publish template mutation
  const publishTemplateMutation = useMutation({
    mutationFn: async (data: InsertTemplate) => {
      return await apiRequest('/api/templates', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Template submitted for approval!",
        description: "Your template has been submitted and will be reviewed by an admin before being published to the marketplace.",
      });
      setPublishingScript(null);
      publishForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish template",
        variant: "destructive",
      });
    },
  });

  // Filter scripts based on search and filters
  const filteredScripts = scripts.filter(script => {
    const matchesSearch = !searchQuery || 
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || 
      script.taskCategory === filterCategory || 
      !script.taskCategory;
    
    // Filter by selected tags - script must have ALL selected tags
    const matchesTags = selectedTags.length === 0 || 
      (scriptTags[script.id!] && selectedTags.every(tagId => 
        scriptTags[script.id!]?.some(tag => tag.id === tagId)
      ));
    
    return matchesSearch && matchesCategory && matchesTags;
  });

  // Get display scripts based on active tab
  const displayScripts = activeTab === "all" ? filteredScripts : 
                         activeTab === "favorites" ? favorites :
                         activeTab === "recent" ? recentScripts : [];

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate({
        name: newTagName.trim(),
        color: newTagColor,
      });
    }
  };

  const handleDownloadScript = (script: Script) => {
    const blob = new Blob([script.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.name}.ps1`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Update last accessed
    if (script.id) {
      updateAccessMutation.mutate(script.id);
    }
  };

  const handleCopyScript = async (script: Script) => {
    try {
      await navigator.clipboard.writeText(script.content);
      toast({
        title: "Copied!",
        description: "Script copied to clipboard.",
      });
      if (script.id) {
        updateAccessMutation.mutate(script.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy script to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handlePublishTemplate = (data: InsertTemplate) => {
    const templateData = {
      ...data,
      securityScore: securityScan?.score,
      securityLevel: securityScan?.securityLevel,
      securityWarningsCount: securityScan?.warnings.length,
      // Add pricing data if seller is onboarded and template is paid
      isPaid: isPaidTemplate && sellerStatus?.isOnboardingComplete,
      priceCents: isPaidTemplate && sellerStatus?.isOnboardingComplete ? templatePrice : undefined,
    };
    publishTemplateMutation.mutate(templateData);
  };

  const getSecurityBadgeProps = (level: string, score: number) => {
    if (score >= 80) {
      return {
        variant: "secondary" as const,
        className: "bg-secondary text-green-600 dark:text-green-400",
        icon: Shield,
        label: "Safe"
      };
    } else if (score >= 50) {
      return {
        variant: "secondary" as const,
        className: "bg-secondary text-yellow-600 dark:text-yellow-400",
        icon: AlertTriangle,
        label: "Caution"
      };
    } else {
      return {
        variant: "destructive" as const,
        className: "",
        icon: ShieldAlert,
        label: "Dangerous"
      };
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive" as const;
      case "warning":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  if (scriptsLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6">
          <div className="text-center text-muted-foreground">Loading your script library...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header onExport={() => {}} hasCommands={false} />
      <div className="flex flex-col min-h-screen">
        {/* Builder Navigation Tabs */}
        <div className="border-b px-3 sm:px-6">
          <div className="flex flex-row gap-2 h-10 sm:h-12 overflow-x-auto">
            <div className="h-full inline-flex gap-1 bg-muted p-1 text-muted-foreground rounded-md">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                data-testid="tab-script-generator"
                asChild
              >
                <a href="/builder?tab=script-generator">
                  <FileCode className="h-4 w-4" />
                  <span>Script</span>
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                data-testid="tab-ai-assistant"
                asChild
              >
                <a href="/builder?tab=ai-assistant">
                  <Sparkles className="h-4 w-4" />
                  <span>AI</span>
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                data-testid="tab-gui-builder"
                asChild
              >
                <a href="/builder?tab=gui-builder">
                  <LayoutGrid className="h-4 w-4" />
                  <span>GUI</span>
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                data-testid="tab-script-wizard"
                asChild
              >
                <a href="/builder?tab=script-wizard">
                  <Wand2 className="h-4 w-4" />
                  <span>Wizard</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-library-title">Script Library</h1>
          <p className="text-muted-foreground">
            Manage and organize your PowerShell scripts
          </p>
        </div>
        
        <Dialog open={showCreateTag} onOpenChange={setShowCreateTag}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-tag">
              <Plus className="w-4 h-4 mr-2" />
              New Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a tag to help organize your scripts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  data-testid="input-tag-name"
                  placeholder="e.g., Production, Testing, Azure"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-color">Tag Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tag-color"
                    data-testid="input-tag-color"
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-muted-foreground">{newTagColor}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateTag(false)}
                data-testid="button-cancel-tag"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTagMutation.isPending}
                data-testid="button-save-tag"
              >
                {createTagMutation.isPending ? "Creating..." : "Create Tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags Management Section */}
      {tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              Your Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  style={{ backgroundColor: tag.color || undefined }}
                  className="cursor-pointer hover-elevate"
                  data-testid={`badge-tag-${tag.id}`}
                  onClick={() => {
                    if (tag.id) {
                      setSelectedTags(prev => 
                        prev.includes(tag.id!) 
                          ? prev.filter(t => t !== tag.id)
                          : [...prev, tag.id!]
                      );
                    }
                  }}
                >
                  <TagIcon className="w-3 h-3 mr-1" />
                  {tag.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (tag.id) {
                        deleteTagMutation.mutate(tag.id);
                      }
                    }}
                    className="ml-2 hover:text-destructive"
                    data-testid={`button-delete-tag-${tag.id}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-search-scripts"
                placeholder="Search scripts by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-filter-category">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Active Directory">Active Directory</SelectItem>
                <SelectItem value="Azure">Azure</SelectItem>
                <SelectItem value="Exchange">Exchange</SelectItem>
                <SelectItem value="SharePoint">SharePoint</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scripts Display */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" data-testid="tab-all-scripts">
            <FileText className="w-4 h-4 mr-2" />
            All Scripts ({scripts.length})
          </TabsTrigger>
          <TabsTrigger value="favorites" data-testid="tab-favorites">
            <Star className="w-4 h-4 mr-2" />
            Favorites ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="recent" data-testid="tab-recent">
            <Clock className="w-4 h-4 mr-2" />
            Recent ({recentScripts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {displayScripts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {activeTab === "all" ? "No scripts found. Create your first script in the Script Builder!" :
                 activeTab === "favorites" ? "No favorite scripts yet. Click the star icon to add scripts to favorites." :
                 "No recently accessed scripts."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayScripts.map((script) => (
                <Card key={script.id} className="hover-elevate" data-testid={`card-script-${script.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-1">{script.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {script.description || "No description"}
                        </CardDescription>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => script.id && toggleFavoriteMutation.mutate(script.id)}
                        data-testid={`button-favorite-${script.id}`}
                      >
                        <Star 
                          className={`w-4 h-4 ${script.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} 
                        />
                      </Button>
                    </div>
                    
                    {script.taskCategory && (
                      <Badge variant="secondary" className="w-fit mt-2">
                        {script.taskCategory}
                      </Badge>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {script.lastAccessed && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Last accessed: {new Date(script.lastAccessed).toLocaleDateString()}
                      </div>
                    )}
                    {scriptTags[script.id!] && scriptTags[script.id!].length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {scriptTags[script.id!].map(tag => (
                          <Badge 
                            key={tag.id} 
                            style={{ backgroundColor: tag.color || undefined }}
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex justify-between gap-2 flex-wrap">
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyScript(script)}
                        data-testid={`button-copy-${script.id}`}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadScript(script)}
                        data-testid={`button-download-${script.id}`}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => script.id && setManagingTagsForScript(script.id)}
                        data-testid={`button-manage-tags-${script.id}`}
                      >
                        <TagIcon className="w-3 h-3 mr-1" />
                        Tags
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPublishingScript(script)}
                        data-testid={`button-publish-template-${script.id}`}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Publish
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => script.id && deleteScriptMutation.mutate(script.id)}
                      data-testid={`button-delete-${script.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Tag Management Dialog */}
      <Dialog open={!!managingTagsForScript} onOpenChange={(open) => !open && setManagingTagsForScript(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Script Tags</DialogTitle>
            <DialogDescription>
              Add or remove tags from this script
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentScriptTags.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Current Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {currentScriptTags.map(tag => (
                    <Badge 
                      key={tag.id}
                      style={{ backgroundColor: tag.color || undefined }}
                      className="cursor-pointer"
                      data-testid={`badge-current-tag-${tag.id}`}
                    >
                      {tag.name}
                      <button
                        onClick={() => {
                          if (managingTagsForScript && tag.id) {
                            removeTagFromScriptMutation.mutate({
                              scriptId: managingTagsForScript,
                              tagId: tag.id
                            });
                          }
                        }}
                        className="ml-2 hover:text-destructive"
                        data-testid={`button-remove-current-tag-${tag.id}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {tags.filter(t => !currentScriptTags.some(ct => ct.id === t.id)).length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Available Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.filter(t => !currentScriptTags.some(ct => ct.id === t.id)).map(tag => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="cursor-pointer hover-elevate"
                      onClick={() => {
                        if (managingTagsForScript && tag.id) {
                          addTagToScriptMutation.mutate({
                            scriptId: managingTagsForScript,
                            tagId: tag.id
                          });
                        }
                      }}
                      data-testid={`badge-available-tag-${tag.id}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tags available. Create a tag first using the "New Tag" button.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setManagingTagsForScript(null)} data-testid="button-close-tag-dialog">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Template Dialog */}
      <Dialog open={!!publishingScript} onOpenChange={(open) => !open && setPublishingScript(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish as Template</DialogTitle>
            <DialogDescription>
              Share your script with the community. Your template will be reviewed by an admin before being published to the marketplace.
            </DialogDescription>
          </DialogHeader>

          {/* Security Analysis Section */}
          {securityScan && (
            <div className="space-y-4">
              {/* Security Score Badge */}
              <div className="flex items-center gap-3">
                <Badge 
                  variant={getSecurityBadgeProps(securityScan.securityLevel, securityScan.score).variant}
                  className={getSecurityBadgeProps(securityScan.securityLevel, securityScan.score).className}
                  data-testid="security-score"
                >
                  {(() => {
                    const SecurityIcon = getSecurityBadgeProps(securityScan.securityLevel, securityScan.score).icon;
                    return <SecurityIcon className="w-3 h-3 mr-1" />;
                  })()}
                  {getSecurityBadgeProps(securityScan.securityLevel, securityScan.score).label} ({securityScan.score})
                </Badge>
                <span className="text-sm text-muted-foreground">{securityScan.summary}</span>
              </div>

              {/* Dangerous Script Warning Banner */}
              {securityScan.securityLevel === 'dangerous' && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Security Risk Detected</AlertTitle>
                  <AlertDescription>
                    This script contains potentially dangerous patterns that could harm systems or data. 
                    Please review carefully before publishing.
                  </AlertDescription>
                </Alert>
              )}

              {/* Collapsible Security Analysis */}
              {securityScan.warnings.length > 0 && (
                <Collapsible 
                  open={securityAnalysisExpanded} 
                  onOpenChange={setSecurityAnalysisExpanded}
                >
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-between"
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Security Analysis ({securityScan.warnings.length} warning{securityScan.warnings.length !== 1 ? 's' : ''})
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${securityAnalysisExpanded ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-2">
                      <CardContent className="pt-4">
                        <ScrollArea className="max-h-60">
                          <div className="space-y-3" data-testid="security-warnings-list">
                            {securityScan.warnings.map((warning, index) => (
                              <div key={index} className="pb-3 border-b last:border-0 last:pb-0">
                                <div className="flex items-start gap-2 mb-1">
                                  <Badge variant={getSeverityBadgeVariant(warning.level)} className="mt-0.5">
                                    {warning.level}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{warning.message}</p>
                                    {warning.line > 0 && (
                                      <p className="text-xs text-muted-foreground">Line {warning.line}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">{warning.recommendation}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Risk Acknowledgment for Dangerous Scripts */}
              {securityScan.securityLevel === 'dangerous' && (
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50">
                  <Checkbox
                    id="acknowledge-risks"
                    checked={risksAcknowledged}
                    onCheckedChange={(checked) => setRisksAcknowledged(checked === true)}
                    data-testid="checkbox-acknowledge-risks"
                  />
                  <label
                    htmlFor="acknowledge-risks"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I understand the security risks and have reviewed the warnings above. I take full responsibility for publishing this template.
                  </label>
                </div>
              )}

              <Separator />
            </div>
          )}

          <Form {...publishForm}>
            <form onSubmit={publishForm.handleSubmit(handlePublishTemplate)} className="space-y-4">
              <FormField
                control={publishForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter template title"
                        data-testid="input-template-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={publishForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe what this template does (minimum 50 characters)"
                        rows={4}
                        data-testid="input-template-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a detailed description to help others understand this template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={publishForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templateCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id!}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={publishForm.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter tags separated by commas (max 5)"
                        value={field.value.join(', ')}
                        onChange={(e) => {
                          const tags = e.target.value
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(tag => tag.length > 0)
                            .slice(0, 5);
                          field.onChange(tags);
                        }}
                        data-testid="input-template-tags"
                      />
                    </FormControl>
                    <FormDescription>
                      Add up to 5 tags to help users find your template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={publishForm.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="1.0.0"
                        data-testid="input-template-version"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pricing Section - Only for Pro users with seller account */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Sell this Template
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Set a price and earn money when others purchase
                    </p>
                  </div>
                  <Switch
                    checked={isPaidTemplate}
                    onCheckedChange={setIsPaidTemplate}
                    disabled={!sellerStatus?.isOnboardingComplete}
                    data-testid="switch-paid-template"
                  />
                </div>

                {/* Show different states based on seller status */}
                {!sellerStatus?.isOnboardingComplete && user?.role !== "free" && (
                  <Alert>
                    <Store className="h-4 w-4" />
                    <AlertTitle>Become a Seller First</AlertTitle>
                    <AlertDescription>
                      To sell templates, complete your seller onboarding from your Account page. 
                      You'll earn 70% of each sale!
                    </AlertDescription>
                  </Alert>
                )}

                {user?.role === "free" && (
                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle>Pro Subscription Required</AlertTitle>
                    <AlertDescription>
                      Upgrade to Pro to unlock the ability to sell templates on the marketplace.
                    </AlertDescription>
                  </Alert>
                )}

                {isPaidTemplate && sellerStatus?.isOnboardingComplete && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-2">
                      <Label>Price (USD)</Label>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          step="0.01"
                          value={(templatePrice / 100).toFixed(2)}
                          onChange={(e) => {
                            const dollars = parseFloat(e.target.value) || 0;
                            const cents = Math.round(Math.min(Math.max(dollars, 1), 50) * 100);
                            setTemplatePrice(cents);
                          }}
                          className="w-24"
                          data-testid="input-template-price"
                        />
                        <span className="text-sm text-muted-foreground">($1 - $50 range)</span>
                      </div>
                    </div>

                    {/* Earnings Preview */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Earnings Preview
                      </Label>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="p-2 rounded border text-center">
                          <p className="text-muted-foreground text-xs">Sale Price</p>
                          <p className="font-medium">${(templatePrice / 100).toFixed(2)}</p>
                        </div>
                        <div className="p-2 rounded border text-center">
                          <p className="text-muted-foreground text-xs">Platform Fee (30%)</p>
                          <p className="font-medium text-orange-600">
                            -${(calculateEarnings(templatePrice).platformFee / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="p-2 rounded border text-center bg-green-500/10">
                          <p className="text-muted-foreground text-xs">You Earn (70%)</p>
                          <p className="font-bold text-green-600">
                            ${(calculateEarnings(templatePrice).sellerEarnings / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Separator />

              {user?.role === "admin" && (
                <FormField
                  control={publishForm.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-template-featured"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Featured Template
                        </FormLabel>
                        <FormDescription>
                          Mark this template as featured (admin only)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPublishingScript(null)}
                  disabled={publishTemplateMutation.isPending}
                  data-testid="button-cancel-publish"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    publishTemplateMutation.isPending ||
                    (securityScan?.securityLevel === 'dangerous' && !risksAcknowledged)
                  }
                  data-testid="button-submit-template"
                >
                  {publishTemplateMutation.isPending ? "Publishing..." : "Publish Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </>
  );
}
