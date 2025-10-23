import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ScriptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: string;
  taskName: string;
}

export function ScriptPreviewDialog({ open, onOpenChange, script, taskName }: ScriptPreviewDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${taskName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.ps1`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generated PowerShell Script</DialogTitle>
          <DialogDescription>
            Review and download your {taskName} script
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-muted/30">
          <pre className="p-4 text-xs sm:text-sm font-mono">
            <code>{script}</code>
          </pre>
        </div>

        <DialogFooter className="flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleCopy}
            data-testid="button-copy-script"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            data-testid="button-download-script"
          >
            <Download className="h-4 w-4 mr-2" />
            Download .ps1
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
