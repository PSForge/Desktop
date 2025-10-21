import { useState } from "react";
import { Download, FileText } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
}

export function ExportDialog({ open, onOpenChange, code }: ExportDialogProps) {
  const [filename, setFilename] = useState("script.ps1");
  const { toast } = useToast();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-export">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export PowerShell Script
          </DialogTitle>
          <DialogDescription>
            Save your generated PowerShell script as a .ps1 file that can be executed on any Windows machine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
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

          <div className="rounded-md border p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">Script Details</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Size: {new Blob([code]).size} bytes</p>
                  <p>Lines: {code.split('\n').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-export-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            data-testid="button-export-confirm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Script
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
