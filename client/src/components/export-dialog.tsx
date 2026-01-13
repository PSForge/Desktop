import { useState } from "react";
import { Download, FileText, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SecurityDashboard } from "@/components/security-dashboard";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Script } from "@shared/schema";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  taskCategory?: string;
  taskName?: string;
}

export function ExportDialog({ open, onOpenChange, code, taskCategory, taskName }: ExportDialogProps) {
  const [filename, setFilename] = useState("script.ps1");
  const [description, setDescription] = useState("");
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [existingScript, setExistingScript] = useState<Script | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user scripts to check for duplicates
  const { data: userScripts = [] } = useQuery<Script[]>({
    queryKey: ['/api/scripts/user/me'],
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const scriptName = filename.replace(/\.ps1$/, '');
      const response = await apiRequest("/api/scripts/save", "POST", {
        name: scriptName,
        content: code,
        description: description || undefined,
        taskCategory: taskCategory || undefined,
        taskName: taskName || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts/user/me'] });
      toast({
        title: "Script saved",
        description: "Your script has been saved to your profile",
      });
      setShowOverwriteDialog(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Could not save the script",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating an existing script
  const updateMutation = useMutation({
    mutationFn: async (scriptId: string) => {
      const scriptName = filename.replace(/\.ps1$/, '');
      const response = await apiRequest(`/api/scripts/${scriptId}`, "PUT", {
        name: scriptName,
        content: code,
        description: description || undefined,
        taskCategory: taskCategory || undefined,
        taskName: taskName || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts/user/me'] });
      toast({
        title: "Script updated",
        description: "Your script has been overwritten",
      });
      setShowOverwriteDialog(false);
      setExistingScript(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update the script",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    try {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.ps1') ? filename : `${filename}.ps1`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Script exported",
        description: `Successfully exported ${a.download}`,
      });
      
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Could not export the script file",
        variant: "destructive",
      });
    }
  };

  const handleSaveToProfile = () => {
    if (!filename.trim()) {
      toast({
        title: "Filename required",
        description: "Please enter a filename for your script",
        variant: "destructive",
      });
      return;
    }

    // Check if a script with the same name already exists
    const scriptName = filename.replace(/\.ps1$/, '');
    const existing = userScripts.find(
      s => s.name.toLowerCase() === scriptName.toLowerCase()
    );

    if (existing) {
      setExistingScript(existing);
      setShowOverwriteDialog(true);
    } else {
      saveMutation.mutate();
    }
  };

  const handleOverwrite = () => {
    if (existingScript?.id) {
      updateMutation.mutate(existingScript.id);
    }
  };

  const handleSaveAsNew = () => {
    // Add a suffix to make the name unique and save immediately
    const scriptName = filename.replace(/\.ps1$/, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const newFilename = `${scriptName}-${timestamp}`;
    setFilename(`${newFilename}.ps1`);
    setShowOverwriteDialog(false);
    setExistingScript(null);
    
    // Directly save with the new name using mutation
    const saveWithNewName = async () => {
      const response = await apiRequest("/api/scripts/save", "POST", {
        name: newFilename,
        content: code,
        description: description || undefined,
        taskCategory: taskCategory || undefined,
        taskName: taskName || undefined,
      });
      return response.json();
    };
    
    saveWithNewName()
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/scripts/user/me'] });
        toast({
          title: "Script saved",
          description: `Your script has been saved as "${newFilename}"`,
        });
        onOpenChange(false);
      })
      .catch((error: any) => {
        toast({
          title: "Save failed",
          description: error.message || "Could not save the script",
          variant: "destructive",
        });
      });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" data-testid="dialog-export">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Save PowerShell Script
          </DialogTitle>
          <DialogDescription>
            Save to your profile or download as a .ps1 file that can be executed on any Windows machine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-2">
            <Label htmlFor="filename">Script Name</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="script.ps1"
              data-testid="input-export-filename"
            />
            <p className="text-xs text-muted-foreground">
              The .ps1 extension will be added automatically if not included
            </p>
          </div>

          {user && (
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this script does..."
                rows={2}
                data-testid="input-script-description"
              />
            </div>
          )}

          <div className="rounded-md border p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">Script Details</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Size: {new Blob([code]).size} bytes</p>
                  <p>Lines: {(code || '').split('\n').length}</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview" data-testid="tab-preview">Script Preview</TabsTrigger>
              <TabsTrigger value="security" data-testid="tab-security">Security Analysis</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="space-y-2 mt-4">
              <div className="h-64 rounded-md border bg-muted/30 overflow-y-auto">
                <pre className="p-4 text-xs font-mono" data-testid="text-script-preview">
                  <code>{code || '# No script content'}</code>
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                Review your script before exporting
              </p>
            </TabsContent>

            <TabsContent value="security" className="mt-4">
              <div className="h-[400px] overflow-y-auto">
                <SecurityDashboard script={code} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-export-cancel"
          >
            Cancel
          </Button>
          {user && (
            <Button
              variant="outline"
              onClick={handleSaveToProfile}
              disabled={saveMutation.isPending}
              data-testid="button-save-to-profile"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save to Profile"}
            </Button>
          )}
          <Button
            onClick={handleExport}
            data-testid="button-export-confirm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download .ps1
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Overwrite Confirmation Dialog */}
    <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
      <AlertDialogContent data-testid="dialog-overwrite">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Script Already Exists
          </AlertDialogTitle>
          <AlertDialogDescription>
            A script named "{existingScript?.name}" already exists in your library. 
            What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={() => {
              setShowOverwriteDialog(false);
              setExistingScript(null);
            }}
            data-testid="button-overwrite-cancel"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleSaveAsNew}
            data-testid="button-rename-script"
          >
            Rename Script
          </Button>
          <AlertDialogAction
            onClick={handleOverwrite}
            disabled={updateMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-overwrite-confirm"
          >
            {updateMutation.isPending ? "Overwriting..." : "Overwrite Existing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
