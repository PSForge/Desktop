import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Key, Copy, Check, Terminal, Shield, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

interface ApiKeyPublic {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface CreatedKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  key: string;
}

function NewKeyReveal({ data, onDismiss }: { data: CreatedKey; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(data.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Copy your key now — it will never be shown again
        </p>
      </div>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 rounded-sm bg-background border border-border px-3 py-2 text-xs font-mono text-foreground overflow-x-auto"
          data-testid="text-new-api-key"
        >
          {data.key}
        </code>
        <Button
          size="icon"
          variant="outline"
          onClick={copy}
          data-testid="button-copy-api-key"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onDismiss}
        data-testid="button-dismiss-new-key"
      >
        I've saved my key
      </Button>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [createName, setCreateName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<CreatedKey | null>(null);

  if (!user) {
    navigate("/login");
    return null;
  }

  const keysQuery = useQuery<ApiKeyPublic[]>({
    queryKey: ["/api/user/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/user/api-keys", { name });
      return await res.json() as CreatedKey;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      setCreateDialogOpen(false);
      setCreateName("");
      setNewlyCreated(created);
    },
    onError: (err: any) => {
      toast({ title: "Failed to create key", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/user/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      toast({ title: "API key revoked" });
    },
    onError: () => {
      toast({ title: "Failed to revoke key", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!createName.trim()) return;
    createMutation.mutate(createName.trim());
  };

  const keys = keysQuery.data ?? [];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="heading-settings">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your API keys and CLI Companion configuration.
          </p>
        </div>

        {/* CLI Companion Info */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 flex-wrap pb-3">
            <Terminal className="h-5 w-5 text-primary shrink-0" />
            <div>
              <CardTitle className="text-base">CLI Companion</CardTitle>
              <CardDescription>
                Use PSForge's AI directly from your terminal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              The PSForge CLI Companion lets IT admins access AI log diagnosis, script
              validation, and script management without leaving the command line. Authenticate
              using an API key below.
            </p>
            <div className="rounded-md bg-muted/40 border border-border p-4 space-y-2">
              <p className="font-medium text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Quick start
              </p>
              <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{`# Set your key as an environment variable
export PSFORGE_API_KEY="psf_your_key_here"

# Validate a script
psforge validate ./MyScript.ps1

# Diagnose a log file (Pro)
psforge diagnose ./system.log --platform "Windows Server"

# List your saved scripts
psforge scripts list`}</pre>
            </div>
            <p className="text-xs">
              The CLI Companion is a separate open-source project. API keys authenticate all
              CLI requests as Bearer tokens.
            </p>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-base">API Keys</CardTitle>
                <CardDescription>
                  Keys grant access to CLI endpoints. Keep them secret.
                </CardDescription>
              </div>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-api-key">
                  <Plus className="h-4 w-4 mr-1" />
                  New key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API key</DialogTitle>
                  <DialogDescription>
                    Give your key a descriptive name so you remember what it's for.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <Input
                    placeholder="e.g. Home lab, Work laptop"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                    maxLength={100}
                    data-testid="input-api-key-name"
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreate}
                    disabled={!createName.trim() || createMutation.isPending}
                    data-testid="button-confirm-create-key"
                  >
                    {createMutation.isPending ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="space-y-4">
            {newlyCreated && (
              <NewKeyReveal
                data={newlyCreated}
                onDismiss={() => setNewlyCreated(null)}
              />
            )}

            {keysQuery.isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}

            {!keysQuery.isLoading && keys.length === 0 && (
              <div
                className="py-8 text-center text-sm text-muted-foreground"
                data-testid="text-no-api-keys"
              >
                No API keys yet. Create one to use the CLI Companion.
              </div>
            )}

            {keys.map(key => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0"
                data-testid={`row-api-key-${key.id}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium text-foreground truncate" data-testid={`text-key-name-${key.id}`}>
                    {key.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs text-muted-foreground font-mono">
                      {key.prefix}••••••••••••••••••••
                    </code>
                    <Badge variant="secondary" className="text-xs">
                      Created {formatDate(key.createdAt)}
                    </Badge>
                    {key.lastUsedAt && (
                      <span className="text-xs text-muted-foreground">
                        Last used {formatDate(key.lastUsedAt)}
                      </span>
                    )}
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-revoke-key-${key.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Any CLI tools using <strong>{key.name}</strong> will stop working
                        immediately. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(key.id)}
                        data-testid={`button-confirm-revoke-${key.id}`}
                      >
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
