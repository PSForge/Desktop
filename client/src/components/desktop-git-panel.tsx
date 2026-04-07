import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  FolderOpen,
  GitBranch,
  GitCommit,
  History,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  checkoutDesktopGitBranch,
  commitDesktopGitScript,
  createDesktopGitBranch,
  getDesktopGitStatus,
  getDesktopStorageItem,
  initializeDesktopGitRepo,
  isDesktopApp,
  openDesktopDirectory,
  openDesktopPath,
  openExternalUrl,
  setDesktopStorageItem,
  type DesktopGitRepoState,
} from "@/lib/desktop";

interface DesktopGitPanelProps {
  scriptName?: string;
  scriptContent?: string;
}

const GIT_REPO_STORAGE_KEY = "psforge-desktop-git-repo-path";

function buildDefaultRelativePath(scriptName?: string) {
  const fallback = "script.ps1";
  const fileName = (scriptName || fallback).trim() || fallback;
  const sanitized = fileName.replace(/[<>:"/\\|?*]+/g, "-");
  return sanitized.toLowerCase().endsWith(".ps1") ? `scripts/${sanitized}` : `scripts/${sanitized}.ps1`;
}

export function DesktopGitPanel({ scriptName, scriptContent }: DesktopGitPanelProps) {
  const { toast } = useToast();
  const [repoPath, setRepoPath] = useState(() => getDesktopStorageItem(GIT_REPO_STORAGE_KEY) || "");
  const [repoState, setRepoState] = useState<DesktopGitRepoState | null>(null);
  const [loading, setLoading] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [fromBranch, setFromBranch] = useState("");
  const [relativePath, setRelativePath] = useState(() => buildDefaultRelativePath(scriptName));
  const [commitMessage, setCommitMessage] = useState("");

  const isDesktop = isDesktopApp();
  const currentBranch = repoState?.currentBranch || "";
  const hasScriptToCommit = Boolean(scriptContent?.trim());

  useEffect(() => {
    setRelativePath((current) => {
      if (current && current !== "scripts/script.ps1") {
        return current;
      }

      return buildDefaultRelativePath(scriptName);
    });
  }, [scriptName]);

  const refreshRepo = async (nextRepoPath = repoPath, silent = false) => {
    if (!nextRepoPath) {
      setRepoState(null);
      return;
    }

    setLoading(true);
    try {
      const state = await getDesktopGitStatus(nextRepoPath);
      setRepoState(state);
      if (!silent) {
        toast({
          title: state.isRepo ? "Repository refreshed" : "Folder selected",
          description: state.isRepo
            ? `Loaded ${state.rootPath || nextRepoPath}`
            : "This folder is ready to be initialized as a Git repository.",
        });
      }
    } catch (error: any) {
      setRepoState(null);
      toast({
        title: "Git refresh failed",
        description: error?.message || "Could not read the selected repository.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!repoPath) {
      return;
    }

    refreshRepo(repoPath, true);
  }, [repoPath]);

  useEffect(() => {
    if (!repoState?.branches?.length) {
      return;
    }

    setFromBranch((current) => current || repoState.currentBranch || repoState.branches[0] || "");
  }, [repoState?.branches, repoState?.currentBranch]);

  const branchOptions = useMemo(() => {
    if (!repoState?.branches?.length) {
      return currentBranch ? [currentBranch] : [];
    }

    return repoState.branches;
  }, [currentBranch, repoState?.branches]);

  const chooseRepository = async () => {
    const selection = await openDesktopDirectory();
    if (!selection || selection.canceled || !selection.filePath) {
      return;
    }

    setRepoPath(selection.filePath);
    setDesktopStorageItem(GIT_REPO_STORAGE_KEY, selection.filePath);
    await refreshRepo(selection.filePath);
  };

  const initializeRepo = async () => {
    if (!repoPath) {
      return;
    }

    setInitLoading(true);
    try {
      const state = await initializeDesktopGitRepo(repoPath, "main");
      setRepoState(state);
      toast({
        title: "Repository initialized",
        description: `Git is now ready in ${state.rootPath || repoPath}.`,
      });
    } catch (error: any) {
      toast({
        title: "Initialization failed",
        description: error?.message || "Could not initialize this folder as a repository.",
        variant: "destructive",
      });
    } finally {
      setInitLoading(false);
    }
  };

  const handleBranchSwitch = async (branchName: string) => {
    if (!repoPath || branchName === currentBranch) {
      return;
    }

    setBranchLoading(true);
    try {
      const state = await checkoutDesktopGitBranch(repoPath, branchName);
      setRepoState(state);
      toast({
        title: "Branch switched",
        description: `Now working on ${branchName}.`,
      });
    } catch (error: any) {
      toast({
        title: "Branch switch failed",
        description: error?.message || "Could not switch branches.",
        variant: "destructive",
      });
    } finally {
      setBranchLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!repoPath || !newBranchName.trim()) {
      return;
    }

    setBranchLoading(true);
    try {
      const state = await createDesktopGitBranch(repoPath, newBranchName.trim(), fromBranch || undefined);
      setRepoState(state);
      setNewBranchName("");
      setShowBranchDialog(false);
      toast({
        title: "Branch created",
        description: `Created and checked out ${state.currentBranch || newBranchName.trim()}.`,
      });
    } catch (error: any) {
      toast({
        title: "Create branch failed",
        description: error?.message || "Could not create that branch.",
        variant: "destructive",
      });
    } finally {
      setBranchLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!repoPath || !relativePath.trim() || !commitMessage.trim() || !scriptContent?.trim()) {
      toast({
        title: "Missing information",
        description: "Choose a repository, set a file path, add a commit message, and make sure the script has content.",
        variant: "destructive",
      });
      return;
    }

    setCommitLoading(true);
    try {
      const result = await commitDesktopGitScript(repoPath, relativePath.trim(), scriptContent, commitMessage.trim());
      await refreshRepo(repoPath, true);
      toast({
        title: result.committed ? "Commit created" : "Nothing to commit",
        description: result.message,
        variant: result.committed ? "default" : "destructive",
      });
      if (result.committed) {
        setCommitMessage("");
      }
    } catch (error: any) {
      toast({
        title: "Commit failed",
        description: error?.message || "Could not commit the current script.",
        variant: "destructive",
      });
    } finally {
      setCommitLoading(false);
    }
  };

  if (!isDesktop) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Git Integration</CardTitle>
          <CardDescription>Desktop Git tools are available in the Windows app.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (repoState && !repoState.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-chart-3" />
            Git for Windows Needed
          </CardTitle>
          <CardDescription>{repoState.error}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => openExternalUrl("https://git-scm.com/download/win")}>
            Install Git
          </Button>
          <Button variant="outline" onClick={chooseRepository}>
            Choose Folder
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5" />
            Desktop Git Workspace
          </CardTitle>
          <CardDescription>
            Work with a real local repository, keep your scripts on disk, and commit changes directly from PSForge Desktop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Selected Folder</div>
              <div className="mt-2 break-all text-sm font-medium">
                {repoPath || "No Git folder selected yet."}
              </div>
              {repoState?.rootPath && repoState.rootPath !== repoPath && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Repository root: {repoState.rootPath}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button variant="outline" onClick={chooseRepository}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Choose Folder
              </Button>
              <Button variant="outline" onClick={() => refreshRepo()} disabled={!repoPath || loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => openDesktopPath(repoState?.rootPath || repoPath)} disabled={!repoPath}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Folder
              </Button>
            </div>
          </div>

          {!repoPath && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Choose a folder to connect the desktop Git workflow to a local repository.
            </div>
          )}

          {repoPath && repoState && !repoState.isRepo && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div>
                <div className="font-medium">This folder is not a Git repository yet.</div>
                <div className="text-sm text-muted-foreground">
                  Initialize Git here and PSForge will start tracking script changes locally.
                </div>
              </div>
              <Button onClick={initializeRepo} disabled={initLoading}>
                <GitBranch className="mr-2 h-4 w-4" />
                {initLoading ? "Initializing..." : "Initialize Repository"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {repoState?.isRepo && (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
            <Card className="min-h-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Branches
                </CardTitle>
                <CardDescription>Switch branches or create a new one without leaving the desktop app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Current: {currentBranch || "No branch yet"}
                  </Badge>
                  <Badge variant="secondary">{repoState.changedFiles.length} changed file{repoState.changedFiles.length !== 1 ? "s" : ""}</Badge>
                </div>

                <div className="flex gap-2">
                  <Select value={currentBranch} onValueChange={handleBranchSwitch} disabled={branchLoading || branchOptions.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        New Branch
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Branch</DialogTitle>
                        <DialogDescription>Create a new local branch for this repository.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="desktop-branch-name">Branch Name</Label>
                          <Input
                            id="desktop-branch-name"
                            placeholder="feature/new-automation"
                            value={newBranchName}
                            onChange={(event) => setNewBranchName(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="desktop-from-branch">Create From</Label>
                          <Select value={fromBranch} onValueChange={setFromBranch}>
                            <SelectTrigger id="desktop-from-branch">
                              <SelectValue placeholder="Current branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branchOptions.map((branch) => (
                                <SelectItem key={branch} value={branch}>
                                  {branch}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBranchDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateBranch} disabled={branchLoading || !newBranchName.trim()}>
                          {branchLoading ? "Creating..." : "Create Branch"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommit className="h-5 w-5" />
                  Commit Current Script
                </CardTitle>
                <CardDescription>
                  Save the script currently open in PSForge into this repository and create a local commit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="desktop-git-relative-path">Repository File Path</Label>
                  <Input
                    id="desktop-git-relative-path"
                    value={relativePath}
                    onChange={(event) => setRelativePath(event.target.value)}
                    placeholder="scripts/example.ps1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desktop-git-commit-message">Commit Message</Label>
                  <Textarea
                    id="desktop-git-commit-message"
                    rows={3}
                    value={commitMessage}
                    onChange={(event) => setCommitMessage(event.target.value)}
                    placeholder="feat: update automation script"
                  />
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {hasScriptToCommit
                    ? `The current editor contents will be written to ${relativePath || "your chosen path"} before commit.`
                    : "Open or create a script in the Script tab before committing to Git."}
                </div>

                <Button className="w-full" onClick={handleCommit} disabled={commitLoading || !hasScriptToCommit}>
                  <GitCommit className="mr-2 h-4 w-4" />
                  {commitLoading ? "Saving & Committing..." : "Save Current Script and Commit"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
            <Card className="min-h-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Changed Files</CardTitle>
                <CardDescription>Live status from the selected repository.</CardDescription>
              </CardHeader>
              <CardContent className="min-h-0">
                {repoState.changedFiles.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Working tree is clean.
                  </div>
                ) : (
                  <ScrollArea className="h-[260px] rounded-lg border">
                    <div className="space-y-2 p-3">
                      {repoState.changedFiles.map((file) => (
                        <div key={`${file.status}-${file.path}`} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                          <div className="min-w-0">
                            <div className="break-all text-sm font-medium">{file.path}</div>
                          </div>
                          <Badge variant="outline">{file.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Commits
                </CardTitle>
                <CardDescription>The latest local commit history for this repository.</CardDescription>
              </CardHeader>
              <CardContent className="min-h-0">
                {repoState.recentCommits.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No commits yet. Initialize the repo and commit your first script when you're ready.
                  </div>
                ) : (
                  <ScrollArea className="h-[260px] rounded-lg border">
                    <div className="space-y-3 p-3">
                      {repoState.recentCommits.map((commit, index) => (
                        <div key={commit.sha} className="space-y-2 rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{commit.message}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {commit.author} • {commit.date}
                              </div>
                            </div>
                            <Badge variant="secondary">{commit.shortSha}</Badge>
                          </div>
                          {index < repoState.recentCommits.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
