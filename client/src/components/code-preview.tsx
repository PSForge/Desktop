import { useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface CodePreviewProps {
  code: string;
  validationErrors?: Array<{ line?: number; message: string; severity: string }>;
}

export function CodePreview({ code, validationErrors = [] }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "PowerShell script copied successfully",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const lines = code.split('\n');
  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="flex flex-col h-full" data-testid="panel-code-preview">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium" data-testid="text-preview-title">Generated Script</h3>
          {lines.length > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-line-count">
              {lines.length} line{lines.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs" data-testid="badge-error-count">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="text-xs bg-chart-3 text-chart-3-foreground" data-testid="badge-warning-count">
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          disabled={!code}
          className="hover-elevate active-elevate-2"
          data-testid="button-copy-code"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-[#1e1e1e] p-4">
        {code ? (
          <div className="relative">
            <pre
              ref={preRef}
              className="text-sm font-mono leading-relaxed"
              data-testid="code-preview"
            >
              {lines.map((line, index) => {
                const lineNumber = index + 1;
                const lineErrors = validationErrors.filter(e => e.line === lineNumber);
                const hasError = lineErrors.some(e => e.severity === 'error');
                const hasWarning = lineErrors.some(e => e.severity === 'warning');
                
                return (
                  <div
                    key={index}
                    className={`flex ${hasError ? 'bg-destructive/10' : hasWarning ? 'bg-chart-3/10' : ''}`}
                  >
                    <span className="inline-block w-12 text-right pr-4 text-gray-500 select-none shrink-0">
                      {lineNumber}
                    </span>
                    <code className="flex-1">
                      <SyntaxHighlight code={line} />
                    </code>
                  </div>
                );
              })}
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">No script generated yet</p>
              <p className="text-xs mt-1">Add commands to see the generated PowerShell code</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SyntaxHighlight({ code }: { code: string }) {
  if (!code.trim()) {
    return <span>&nbsp;</span>;
  }

  const tokens: Array<{ type: string; value: string; index: number }> = [];
  
  const patterns = [
    { type: 'comment', regex: /#.*/g, className: 'text-green-400' },
    { type: 'string', regex: /"[^"]*"|'[^']*'/g, className: 'text-orange-300' },
    { type: 'keyword', regex: /\b(Get-|Set-|New-|Remove-|Test-|Start-|Stop-|Invoke-|Copy-|Move-|Write-|Read-|Select-|Where-|ForEach-|If|Else|ElseIf|Switch|For|While|Do|Function|Param|Return|Try|Catch|Finally|Throw)\S*/g, className: 'text-blue-400 font-semibold' },
    { type: 'parameter', regex: /-\w+/g, className: 'text-cyan-300' },
    { type: 'variable', regex: /\$\w+/g, className: 'text-purple-300' },
    { type: 'number', regex: /\b\d+\b/g, className: 'text-yellow-300' },
    { type: 'operator', regex: /[=<>!+\-*\/&|]+/g, className: 'text-pink-300' },
  ];

  patterns.forEach(({ type, regex, className }) => {
    let match;
    while ((match = regex.exec(code)) !== null) {
      tokens.push({
        type,
        value: match[0],
        index: match.index,
      });
    }
  });

  tokens.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return b.value.length - a.value.length;
  });

  const elements: JSX.Element[] = [];
  let lastIndex = 0;

  const usedRanges: Array<[number, number]> = [];

  tokens.forEach((token, i) => {
    const tokenEnd = token.index + token.value.length;
    
    const overlaps = usedRanges.some(([start, end]) => 
      (token.index >= start && token.index < end) || 
      (tokenEnd > start && tokenEnd <= end) ||
      (token.index <= start && tokenEnd >= end)
    );
    
    if (overlaps) return;

    if (token.index > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`}>{code.substring(lastIndex, token.index)}</span>
      );
    }

    const className = patterns.find(p => p.type === token.type)?.className || '';
    elements.push(
      <span key={`token-${i}`} className={className}>
        {token.value}
      </span>
    );

    usedRanges.push([token.index, tokenEnd]);
    lastIndex = tokenEnd;
  });

  if (lastIndex < code.length) {
    elements.push(
      <span key={`text-${lastIndex}`}>{code.substring(lastIndex)}</span>
    );
  }

  return <>{elements}</>;
}
