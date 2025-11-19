import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header";
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
  Calendar
} from "lucide-react";
import type { Script, Tag } from "@shared/schema";

export default function ScriptLibrary() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [activeTab, setActiveTab] = useState("all");
  const [managingTagsForScript, setManagingTagsForScript] = useState<string | null>(null);
  const [scriptTags, setScriptTags] = useState<Record<string, Tag[]>>({});

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

  // Fetch script tags when managing tags for a script
  const { data: currentScriptTags = [] } = useQuery<Tag[]>({
    queryKey: ['/api/scripts', managingTagsForScript, 'tags'],
    enabled: !!managingTagsForScript,
  });

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

  if (scriptsLoading) {
    return (
      <>
        <Header onExport={() => {}} hasCommands={false} />
        <div className="container mx-auto p-6">
          <div className="text-center text-muted-foreground">Loading your script library...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header onExport={() => {}} hasCommands={false} />
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
                    <div className="flex gap-2">
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
      </div>
    </>
  );
}
