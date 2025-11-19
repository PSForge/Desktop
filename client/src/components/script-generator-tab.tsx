import { useState, useEffect, useMemo, useRef } from "react";
import { Command, ValidationResult, ComprehensiveValidationResult } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CommandSidebar } from "@/components/command-sidebar";
import { ScriptEditor } from "@/components/script-editor";
import { CodePreview } from "@/components/code-preview";
import { ValidationPanel } from "@/components/validation-panel";
import { ComprehensiveValidationPanel } from "@/components/comprehensive-validation-panel";
import { ExportDialog } from "@/components/export-dialog";
import { powershellCommands } from "@/lib/powershell-commands";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, List } from "lucide-react";

interface ScriptGeneratorTabProps {
  script: string;
  setScript: (script: string) => void;
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
}

export function ScriptGeneratorTab({
  script,
  setScript,
  exportDialogOpen,
  setExportDialogOpen
}: ScriptGeneratorTabProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
  });
  const [comprehensiveValidation, setComprehensiveValidation] = useState<ComprehensiveValidationResult | null>(null);
  const [lastValidatedCode, setLastValidatedCode] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [validationMode, setValidationMode] = useState<'basic' | 'comprehensive'>('basic');

  const validationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/validate', { code });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setValidationResult(data);
      setLastValidatedCode(variables);
    },
    onError: (error, variables) => {
      console.error('Validation failed:', error);
      setValidationResult({
        isValid: false,
        errors: [{
          line: 0,
          message: 'Failed to validate script - please try again',
          severity: 'error'
        }],
      });
      setLastValidatedCode(variables);
    },
  });

  const comprehensiveValidationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/validate/comprehensive', { code });
      return response.json();
    },
    onSuccess: (data) => {
      setComprehensiveValidation(data);
    },
    onError: (error) => {
      console.error('Comprehensive validation failed:', error);
    },
  });

  useEffect(() => {
    if (!script.trim()) {
      setValidationResult({
        isValid: true,
        errors: [],
      });
      setComprehensiveValidation(null);
      setLastValidatedCode('');
      return;
    }

    if (script !== lastValidatedCode && !validationMutation.isPending) {
      validationMutation.mutate(script);
    }
  }, [script, lastValidatedCode]);

  const runComprehensiveValidation = () => {
    if (script.trim()) {
      setValidationMode('comprehensive');
      comprehensiveValidationMutation.mutate(script);
    }
  };

  const handleAddCommand = (command: Command) => {
    // Generate command syntax with parameters
    let commandSyntax = `${command.name}`;
    
    // Add parameters
    if (command.parameters.length > 0) {
      const params = command.parameters.map(param => {
        if (param.type === 'switch' || param.type === 'boolean') {
          return `-${param.name}`;
        } else if (param.required) {
          return `-${param.name} <${param.name}>`;
        } else {
          return `-${param.name} [${param.name}]`;
        }
      }).join(' ');
      commandSyntax += ` ${params}`;
    }

    // Add newline before if there's content and cursor is not at start of a new line
    let insertion = commandSyntax;
    if (script.length > 0 && cursorPosition > 0 && script[cursorPosition - 1] !== '\n') {
      insertion = '\n' + insertion;
    }
    
    // Add newline after
    insertion += '\n';

    // Insert at cursor position
    const before = script.substring(0, cursorPosition);
    const after = script.substring(cursorPosition);
    const newScript = before + insertion + after;
    
    setScript(newScript);
    
    // Update cursor position to end of inserted text
    setCursorPosition(cursorPosition + insertion.length);
  };

  return (
    <>
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden min-h-0">
        <CommandSidebar onAddCommand={handleAddCommand} />

        <div className="flex-1 flex flex-col md:overflow-hidden min-w-0 min-h-0">
          <div className="md:flex-1 md:flex md:flex-col border-b md:overflow-auto md:min-h-0">
            <ScriptEditor
              script={script}
              onScriptChange={setScript}
              onCursorPositionChange={setCursorPosition}
            />
          </div>

          <div className="h-48 sm:h-64 md:flex-1 border-b overflow-hidden md:min-h-0">
            <CodePreview code={script} validationErrors={validationResult.errors || []} />
          </div>

          <div className="p-4 md:shrink-0">
            <Tabs value={validationMode} onValueChange={(val) => setValidationMode(val as 'basic' | 'comprehensive')}>
              <div className="flex items-center justify-between mb-2">
                <TabsList className="grid w-auto grid-cols-2">
                  <TabsTrigger value="basic" className="flex items-center gap-1" data-testid="tab-basic-validation">
                    <List className="h-4 w-4" />
                    <span>Basic</span>
                  </TabsTrigger>
                  <TabsTrigger value="comprehensive" className="flex items-center gap-1" data-testid="tab-comprehensive-validation">
                    <FileCheck className="h-4 w-4" />
                    <span>Comprehensive</span>
                  </TabsTrigger>
                </TabsList>
                
                {validationMode === 'comprehensive' && !comprehensiveValidation && (
                  <Button
                    size="sm"
                    onClick={runComprehensiveValidation}
                    disabled={!script.trim() || comprehensiveValidationMutation.isPending}
                    data-testid="button-run-comprehensive-validation"
                  >
                    {comprehensiveValidationMutation.isPending ? 'Analyzing...' : 'Run Analysis'}
                  </Button>
                )}
              </div>
              
              <TabsContent value="basic" className="mt-0">
                <ValidationPanel 
                  errors={validationResult.errors || []} 
                  isValidating={validationMutation.isPending}
                />
              </TabsContent>
              
              <TabsContent value="comprehensive" className="mt-0">
                {comprehensiveValidation ? (
                  <ComprehensiveValidationPanel result={comprehensiveValidation} />
                ) : (
                  <div className="text-center text-muted-foreground py-8 border rounded-md">
                    <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-1">Comprehensive Validation</p>
                    <p className="text-sm">
                      Run comprehensive validation for detailed analysis including dependencies, impact analysis, best practices, and compliance checks.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={runComprehensiveValidation}
                      disabled={!script.trim() || comprehensiveValidationMutation.isPending}
                      data-testid="button-run-comprehensive-validation-empty"
                    >
                      {comprehensiveValidationMutation.isPending ? 'Analyzing...' : 'Run Comprehensive Validation'}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        code={script}
      />
    </>
  );
}
