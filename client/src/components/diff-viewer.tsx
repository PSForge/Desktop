import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, Plus, Minus } from "lucide-react";

interface DiffViewerProps {
  original: string;
  modified: string;
  title?: string;
  description?: string;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'context';
  lineNumber?: number;
  content: string;
  modifiedLineNumber?: number;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const diff: DiffLine[] = [];
  
  let originalIndex = 0;
  let modifiedIndex = 0;
  
  while (originalIndex < originalLines.length || modifiedIndex < modifiedLines.length) {
    const originalLine = originalLines[originalIndex];
    const modifiedLine = modifiedLines[modifiedIndex];
    
    if (originalLine === modifiedLine) {
      // Lines match - unchanged
      diff.push({
        type: 'unchanged',
        lineNumber: originalIndex + 1,
        modifiedLineNumber: modifiedIndex + 1,
        content: originalLine || '',
      });
      originalIndex++;
      modifiedIndex++;
    } else {
      // Lines differ - check if it's an addition, removal, or modification
      const nextOriginalLine = originalLines[originalIndex + 1];
      const nextModifiedLine = modifiedLines[modifiedIndex + 1];
      
      // Check if current modified line matches next original line (insertion)
      if (modifiedLine === nextOriginalLine) {
        diff.push({
          type: 'added',
          modifiedLineNumber: modifiedIndex + 1,
          content: modifiedLine || '',
        });
        modifiedIndex++;
      }
      // Check if current original line matches next modified line (deletion)
      else if (originalLine === nextModifiedLine) {
        diff.push({
          type: 'removed',
          lineNumber: originalIndex + 1,
          content: originalLine || '',
        });
        originalIndex++;
      }
      // Both lines exist but differ (modification)
      else if (originalLine !== undefined && modifiedLine !== undefined) {
        diff.push({
          type: 'removed',
          lineNumber: originalIndex + 1,
          content: originalLine || '',
        });
        diff.push({
          type: 'added',
          modifiedLineNumber: modifiedIndex + 1,
          content: modifiedLine || '',
        });
        originalIndex++;
        modifiedIndex++;
      }
      // Only original line remains (deletion at end)
      else if (originalLine !== undefined) {
        diff.push({
          type: 'removed',
          lineNumber: originalIndex + 1,
          content: originalLine || '',
        });
        originalIndex++;
      }
      // Only modified line remains (addition at end)
      else if (modifiedLine !== undefined) {
        diff.push({
          type: 'added',
          modifiedLineNumber: modifiedIndex + 1,
          content: modifiedLine || '',
        });
        modifiedIndex++;
      }
    }
  }
  
  return diff;
}

export function DiffViewer({ original, modified, title, description }: DiffViewerProps) {
  const diffLines = useMemo(() => computeDiff(original, modified), [original, modified]);
  
  const stats = useMemo(() => {
    const added = diffLines.filter(line => line.type === 'added').length;
    const removed = diffLines.filter(line => line.type === 'removed').length;
    const unchanged = diffLines.filter(line => line.type === 'unchanged').length;
    
    return { added, removed, unchanged, total: diffLines.length };
  }, [diffLines]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            <div>
              <CardTitle>{title || "Script Comparison"}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Plus className="h-3 w-3 text-green-600 dark:text-green-400" />
              {stats.added}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Minus className="h-3 w-3 text-red-600 dark:text-red-400" />
              {stats.removed}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] rounded-md border">
          <div className="font-mono text-xs">
            {diffLines.map((line, index) => {
              const lineNumWidth = "w-12";
              
              return (
                <div
                  key={index}
                  className={`flex ${
                    line.type === 'added'
                      ? 'bg-green-100 dark:bg-green-950/30'
                      : line.type === 'removed'
                      ? 'bg-red-100 dark:bg-red-950/30'
                      : 'bg-background'
                  }`}
                  data-testid={`diff-line-${index}`}
                >
                  {/* Line numbers */}
                  <div className="flex border-r">
                    <div className={`${lineNumWidth} px-2 py-1 text-right text-muted-foreground border-r select-none`}>
                      {line.lineNumber || ''}
                    </div>
                    <div className={`${lineNumWidth} px-2 py-1 text-right text-muted-foreground select-none`}>
                      {line.modifiedLineNumber || ''}
                    </div>
                  </div>
                  
                  {/* Diff indicator */}
                  <div className={`w-8 flex items-center justify-center border-r ${
                    line.type === 'added'
                      ? 'text-green-600 dark:text-green-400'
                      : line.type === 'removed'
                      ? 'text-red-600 dark:text-red-400'
                      : ''
                  }`}>
                    {line.type === 'added' && <Plus className="h-3 w-3" />}
                    {line.type === 'removed' && <Minus className="h-3 w-3" />}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 px-3 py-1 overflow-x-auto whitespace-pre">
                    {line.content || ' '}
                  </div>
                </div>
              );
            })}
            {diffLines.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No differences found</p>
                <p className="text-xs mt-1">Scripts are identical</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
