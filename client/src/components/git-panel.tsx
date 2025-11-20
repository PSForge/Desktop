import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  Upload, 
  Download, 
  Plus, 
  Trash2,
  RefreshCw,
  Check,
  X,
  Link as LinkIcon,
  GitFork
} from "lucide-react";

interface GitRepository {
  id: string;
  provider: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  currentBranch?: string;
  lastSyncedAt?: string;
  createdAt: string;
}

interface GitBranchData {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface GitCommitData {
  id: string;
  repositoryId: string;
  scriptId?: string;
  commitSha: string;
  message: string;
  branch: string;
  author?: string;
  createdAt: string;
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
}

interface GitPanelProps {
  scriptId?: string;
  scriptName?: string;
  scriptContent?: string;
}

export function GitPanel({ scriptId, scriptName, scriptContent }: GitPanelProps) {
  const { toast } = useToast();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState("");
  const [scriptPath, setScriptPath] = useState("");
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [fromBranch, setFromBranch] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");

  // Fetch connected repositories
  const { data: repositories, isLoading: reposLoading } = useQuery<GitRepository[]>({
    queryKey: ["/api/git/repositories"],
  });

  // Fetch GitHub user
  const { data: githubUser, isError: githubUserError, isLoading: githubUserLoading } = useQuery<GitHubUser>({
    queryKey: ["/api/git/user"],
    retry: false,
  });

  // Fetch branches for selected repo
  const { data: branches, isLoading: branchesLoading } = useQuery<GitBranchData[]>({
    queryKey: ["/api/git/repositories", selectedRepo, "branches"],
    enabled: !!selectedRepo,
  });

  // Fetch commit history
  const { data: commits } = useQuery<GitCommitData[]>({
    queryKey: ["/api/git/repositories", selectedRepo, "commits"],
    enabled: !!selectedRepo,
  });

  // Connect repository mutation
  const connectRepoMutation = useMutation({
    mutationFn: (data: { repoOwner: string; repoName: string }) =>
      apiRequest("/api/git/repositories", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git/repositories"] });
      setShowConnectDialog(false);
      setRepoOwner("");
      setRepoName("");
      toast({
        title: "Repository Connected",
        description: "Successfully connected to GitHub repository",
      });
    },
    onError: (error: any) => {
      // Extract error message from JSON response
      // Error format from apiRequest: "404: {\"error\":\"message\"}"
      let errorMessage = "Failed to connect repository";
      
      console.error("Repository connection error:", error);
      
      try {
        const errorText = error.message || "";
        // Try to extract JSON from error message
        const jsonMatch = errorText.match(/\{.*\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          errorMessage = errorData.error || errorMessage;
        } else if (errorText.includes("not found") || errorText.includes("404")) {
          errorMessage = "Repository not found or you don't have access to it";
        } else {
          errorMessage = errorText || errorMessage;
        }
      } catch (e) {
        console.error("Error parsing error message:", e);
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: (data: { scriptId?: string; message: string; path: string }) =>
      apiRequest(`/api/git/repositories/${selectedRepo}/commit`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git/repositories", selectedRepo, "commits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/git/repositories"] });
      setShowCommitDialog(false);
      setCommitMessage("");
      toast({
        title: "Committed Successfully",
        description: "Your script has been committed to GitHub",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Commit Failed",
        description: error.message || "Failed to commit changes",
        variant: "destructive",
      });
    },
  });

  // Create branch mutation
  const createBranchMutation = useMutation({
    mutationFn: (data: { branchName: string; fromBranch?: string }) =>
      apiRequest(`/api/git/repositories/${selectedRepo}/branches`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git/repositories", selectedRepo, "branches"] });
      setShowBranchDialog(false);
      setNewBranchName("");
      setFromBranch("");
      toast({
        title: "Branch Created",
        description: "New branch created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Branch",
        description: error.message || "Failed to create branch",
        variant: "destructive",
      });
    },
  });

  // Switch branch mutation
  const switchBranchMutation = useMutation({
    mutationFn: (branch: string) =>
      apiRequest(`/api/git/repositories/${selectedRepo}/checkout`, "POST", { branch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git/repositories"] });
      toast({
        title: "Branch Switched",
        description: "Successfully switched branch",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Switch Branch",
        description: error.message || "Failed to switch branch",
        variant: "destructive",
      });
    },
  });

  // Auto-set script path based on script name
  useEffect(() => {
    if (scriptName && !scriptPath) {
      const sanitized = scriptName.replace(/[^a-zA-Z0-9-_]/g, "_");
      setScriptPath(`scripts/${sanitized}.ps1`);
    }
  }, [scriptName, scriptPath]);

  // Auto-select first repository
  useEffect(() => {
    if (repositories && repositories.length > 0 && !selectedRepo) {
      setSelectedRepo(repositories[0].id);
    }
  }, [repositories, selectedRepo]);

  // Update selected branch when repo changes
  useEffect(() => {
    if (selectedRepo && repositories) {
      const repo = repositories.find(r => r.id === selectedRepo);
      if (repo) {
        setSelectedBranch(repo.currentBranch || repo.defaultBranch);
      }
    }
  }, [selectedRepo, repositories]);

  const handleCommit = () => {
    if (!scriptId || !commitMessage.trim() || !scriptPath.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide script, commit message, and file path",
        variant: "destructive",
      });
      return;
    }

    commitMutation.mutate({
      scriptId,
      message: commitMessage,
      path: scriptPath,
    });
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) {
      toast({
        title: "Branch Name Required",
        description: "Please enter a branch name",
        variant: "destructive",
      });
      return;
    }

    createBranchMutation.mutate({
      branchName: newBranchName,
      fromBranch: fromBranch || undefined,
    });
  };

  // Show disconnected state if GitHub user is not available
  if (!githubUser || githubUserError || githubUserLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Git Integration
          </CardTitle>
          <CardDescription>
            {githubUserLoading 
              ? "Checking GitHub connection..." 
              : "GitHub is not connected. Please connect your GitHub account in Account Settings to use Git features."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled data-testid="button-github-not-connected">
            <X className="h-4 w-4 mr-2" />
            {githubUserLoading ? "Connecting..." : "GitHub Not Connected"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentRepo = repositories?.find(r => r.id === selectedRepo);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Git Integration
            </span>
            <Badge variant="outline" className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Connected as {githubUser.login}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Repository Selector */}
          <div className="space-y-2">
            <Label>Repository</Label>
            <div className="flex gap-2">
              <Select value={selectedRepo || ""} onValueChange={setSelectedRepo}>
                <SelectTrigger data-testid="select-git-repository">
                  <SelectValue placeholder="Select repository" />
                </SelectTrigger>
                <SelectContent>
                  {repositories?.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.repoOwner}/{repo.repoName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="button-connect-repo">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Connect Repository</DialogTitle>
                    <DialogDescription>
                      Connect a GitHub repository to sync your PowerShell scripts
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="repo-owner">Repository Owner</Label>
                      <Input
                        id="repo-owner"
                        placeholder="username or organization"
                        value={repoOwner}
                        onChange={(e) => setRepoOwner(e.target.value)}
                        data-testid="input-repo-owner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repo-name">Repository Name</Label>
                      <Input
                        id="repo-name"
                        placeholder="repository-name"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        data-testid="input-repo-name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowConnectDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => connectRepoMutation.mutate({ repoOwner, repoName })}
                      disabled={!repoOwner || !repoName || connectRepoMutation.isPending}
                      data-testid="button-connect-submit"
                    >
                      {connectRepoMutation.isPending ? "Connecting..." : "Connect"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {selectedRepo && currentRepo && (
            <>
              <Separator />

              {/* Branch Selector */}
              <div className="space-y-2">
                <Label>Branch</Label>
                <div className="flex gap-2">
                  <Select value={selectedBranch} onValueChange={(branch) => {
                    setSelectedBranch(branch);
                    switchBranchMutation.mutate(branch);
                  }}>
                    <SelectTrigger data-testid="select-git-branch">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.name} value={branch.name}>
                          <span className="flex items-center gap-2">
                            <GitBranch className="h-3 w-3" />
                            {branch.name}
                            {branch.protected && (
                              <Badge variant="secondary" className="text-xs">Protected</Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" data-testid="button-create-branch">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Branch</DialogTitle>
                        <DialogDescription>
                          Create a new branch for your changes
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="branch-name">Branch Name</Label>
                          <Input
                            id="branch-name"
                            placeholder="feature/my-new-feature"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            data-testid="input-branch-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="from-branch">Create From (Optional)</Label>
                          <Select value={fromBranch} onValueChange={setFromBranch}>
                            <SelectTrigger>
                              <SelectValue placeholder={`Default: ${currentRepo.defaultBranch}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {branches?.map((branch) => (
                                <SelectItem key={branch.name} value={branch.name}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowBranchDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateBranch}
                          disabled={createBranchMutation.isPending}
                          data-testid="button-create-branch-submit"
                        >
                          {createBranchMutation.isPending ? "Creating..." : "Create Branch"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Separator />

              {/* Commit Actions */}
              <div className="flex gap-2">
                <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex-1" disabled={!scriptId} data-testid="button-commit">
                      <GitCommit className="h-4 w-4 mr-2" />
                      Commit & Push
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Commit Script to GitHub</DialogTitle>
                      <DialogDescription>
                        Commit and push your PowerShell script to {currentRepo.repoOwner}/{currentRepo.repoName}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="script-path">File Path</Label>
                        <Input
                          id="script-path"
                          placeholder="scripts/MyScript.ps1"
                          value={scriptPath}
                          onChange={(e) => setScriptPath(e.target.value)}
                          data-testid="input-script-path"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="commit-message">Commit Message</Label>
                        <Textarea
                          id="commit-message"
                          placeholder="feat: Add new PowerShell automation script"
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          rows={3}
                          data-testid="textarea-commit-message"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Branch: <Badge variant="outline">{selectedBranch}</Badge></p>
                        <p className="mt-1">This will commit the current script to GitHub</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCommitDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCommit}
                        disabled={commitMutation.isPending}
                        data-testid="button-commit-submit"
                      >
                        {commitMutation.isPending ? "Committing..." : "Commit & Push"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Commit History */}
              {commits && commits.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Recent Commits</Label>
                    <ScrollArea className="h-[200px] rounded-md border">
                      <div className="p-4 space-y-2">
                        {commits.map((commit) => (
                          <div
                            key={commit.id}
                            className="flex items-start gap-3 p-2 rounded-md hover-elevate"
                            data-testid={`commit-${commit.id}`}
                          >
                            <GitCommit className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{commit.message}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {commit.branch}
                                </Badge>
                                <span>{commit.author}</span>
                                <span>{new Date(commit.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </>
          )}

          {!selectedRepo && repositories && repositories.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No repositories connected</p>
              <p className="text-xs">Connect a repository to start using Git integration</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
