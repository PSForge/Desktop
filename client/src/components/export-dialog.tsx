import { useState } from "react";
import { Download, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SecurityDashboard } from "@/components/security-dashboard";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const { toast } = useToast();
  const { user } = useAuth();

  const trackScriptMutation = useMutation({
    mutationFn: async () => {
      const timeSavedMinutes = Math.max(30, Math.min(120, Math.round(code.length / 100) * 10));
      await apiRequest("/api/user/track-script", "POST", { timeSavedMinutes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/milestones/unshown"] });
    },
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
      trackScriptMutation.mutate();
      toast({
        title: "Script saved",
        description: "Your script has been saved to your profile",
      });
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

      if (user) {
        trackScriptMutation.mutate();
      }

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
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-export">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Save PowerShell Script
          </DialogTitle>
          <DialogDescription>
            Save to your profile or download as a .ps1 file that can be executed on any Windows machine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              <ScrollArea className="h-64 rounded-md border bg-muted/30">
                <pre className="p-4 text-xs font-mono" data-testid="text-script-preview">
                  <code>{code || '# No script content'}</code>
                </pre>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Review your script before exporting
              </p>
            </TabsContent>

            <TabsContent value="security" className="mt-4">
              <ScrollArea className="h-[400px]">
                <SecurityDashboard script={code} />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
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
  );
}
