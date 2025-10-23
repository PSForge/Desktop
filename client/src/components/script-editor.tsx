import { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileCode } from "lucide-react";

interface ScriptEditorProps {
  script: string;
  onScriptChange: (script: string) => void;
  onCursorPositionChange?: (position: number) => void;
}

export function ScriptEditor({ script, onScriptChange, onCursorPositionChange }: ScriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onScriptChange(e.target.value);
  };

  const handleCursorChange = () => {
    if (textareaRef.current && onCursorPositionChange) {
      onCursorPositionChange(textareaRef.current.selectionStart);
    }
  };

  // Track cursor position on selection change and click
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('click', handleCursorChange);
    textarea.addEventListener('keyup', handleCursorChange);
    textarea.addEventListener('select', handleCursorChange);

    return () => {
      textarea.removeEventListener('click', handleCursorChange);
      textarea.removeEventListener('keyup', handleCursorChange);
      textarea.removeEventListener('select', handleCursorChange);
    };
  }, [onCursorPositionChange]);

  const lineCount = (script || '').split('\n').length;

  return (
    <div className="flex-1 flex flex-col md:overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium flex items-center gap-2" data-testid="text-editor-title">
            <FileCode className="h-5 w-5" />
            PowerShell Script Editor
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Type your script or click commands from the sidebar to insert them
          </p>
        </div>
        <Badge variant="secondary" className="text-xs" data-testid="badge-line-count">
          {lineCount} line{lineCount !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="flex-1 p-6 md:overflow-auto">
        <Textarea
          ref={textareaRef}
          value={script || ''}
          onChange={handleChange}
          placeholder="# Start typing your PowerShell script here...
# Or select commands from the sidebar to insert them

# Example:
Get-Service | Where-Object {$_.Status -eq 'Running'}
"
          className="font-mono text-sm min-h-[400px] md:min-h-full resize-none"
          data-testid="textarea-script-editor"
        />
      </div>
    </div>
  );
}
