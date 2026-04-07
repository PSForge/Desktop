import { useEffect, useState } from "react";
import { Command, ValidationResult, ComprehensiveValidationResult } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CommandSidebar } from "@/components/command-sidebar";
import { ScriptEditor } from "@/components/script-editor";
import { CodePreview } from "@/components/code-preview";
import { ValidationPanel } from "@/components/validation-panel";
import { ComprehensiveValidationPanel } from "@/components/comprehensive-validation-panel";
import { ExportDialog } from "@/components/export-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, FileCheck, List, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScriptGeneratorTabProps {
  script: string;
  setScript: (script: string) => void;
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
  currentFileName?: string;
  setCurrentFileName?: (fileName: string) => void;
}

export function ScriptGeneratorTab({
  script,
  setScript,
  exportDialogOpen,
  setExportDialogOpen,
  currentFileName,
  setCurrentFileName,
}: ScriptGeneratorTabProps) {
  const { toast } = useToast();
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
  });
  const [comprehensiveValidation, setComprehensiveValidation] = useState<ComprehensiveValidationResult | null>(null);
  const [lastValidatedCode, setLastValidatedCode] = useState<string>('');
  const [lastComprehensiveCode, setLastComprehensiveCode] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [validationMode, setValidationMode] = useState<'basic' | 'comprehensive'>('basic');
  const [isCommandLibraryVisible, setIsCommandLibraryVisible] = useState(true);

  const validationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('/api/validate', 'POST', { code });
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
      const response = await apiRequest('/api/validate/comprehensive', 'POST', { code });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setComprehensiveValidation(data);
      setLastComprehensiveCode(variables);
    },
    onError: (error) => {
      console.error('Comprehensive validation failed:', error);
      toast({
        title: 'Validation Failed',
        description: 'Failed to run comprehensive validation. Please try again.',
        variant: 'destructive',
      });
      // Clear comprehensive results on error
      setComprehensiveValidation(null);
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
      setLastComprehensiveCode('');
      // Reset to basic mode when script is empty
      setValidationMode('basic');
      return;
    }

    // Run basic validation
    if (script !== lastValidatedCode && !validationMutation.isPending) {
      validationMutation.mutate(script);
    }

    // If script changed and we have comprehensive results, they're now stale
    if (script !== lastComprehensiveCode && comprehensiveValidation !== null) {
      // Clear stale comprehensive validation results
      setComprehensiveValidation(null);
      // Switch back to basic mode to show current validation
      setValidationMode('basic');
    }
  }, [script, lastValidatedCode, lastComprehensiveCode, comprehensiveValidation]);

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
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Build scripts visually, edit directly, and validate in place.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCommandLibraryVisible((current) => !current)}
              data-testid="button-toggle-command-library"
            >
              {isCommandLibraryVisible ? (
                <PanelLeftClose className="mr-2 h-4 w-4" />
              ) : (
                <PanelLeftOpen className="mr-2 h-4 w-4" />
              )}
              {isCommandLibraryVisible ? "Hide Command Library" : "Show Command Library"}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {isCommandLibraryVisible && (
            <CommandSidebar onAddCommand={handleAddCommand} />
          )}

          <div
            className="grid min-w-0 flex-1 min-h-0 overflow-hidden"
            style={{ gridTemplateRows: "minmax(0, 1fr) clamp(220px, 28vh, 340px)" }}
          >
            <div className="min-h-0 overflow-hidden border-b">
              <ScriptEditor
                script={script}
                onScriptChange={setScript}
                onCursorPositionChange={setCursorPosition}
              />
            </div>

            <div className="min-h-0 overflow-hidden">
              <Tabs defaultValue="preview" className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <TabsList className="grid w-auto grid-cols-3">
                    <TabsTrigger value="preview" className="flex items-center gap-1" data-testid="tab-script-preview">
                      <Eye className="h-4 w-4" />
                      <span>Preview</span>
                    </TabsTrigger>
                    <TabsTrigger value="basic-validation" className="flex items-center gap-1" data-testid="tab-basic-validation">
                      <List className="h-4 w-4" />
                      <span>Basic</span>
                    </TabsTrigger>
                    <TabsTrigger value="comprehensive-validation" className="flex items-center gap-1" data-testid="tab-comprehensive-validation">
                      <FileCheck className="h-4 w-4" />
                      <span>Comprehensive</span>
                    </TabsTrigger>
                  </TabsList>

                  {!comprehensiveValidation && (
                    <div className="flex items-center gap-2">
                      {validationMode === 'comprehensive' && (
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
                  )}
                </div>

                <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  <CodePreview code={script} validationErrors={validationResult.errors || []} />
                </TabsContent>

                <TabsContent value="basic-validation" className="mt-0 min-h-0 flex-1 overflow-auto p-4">
                  <div className="h-full overflow-auto">
                    <ValidationPanel 
                      errors={validationResult.errors || []} 
                      isValidating={validationMutation.isPending}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="comprehensive-validation" className="mt-0 min-h-0 flex-1 overflow-auto p-4">
                  <div className="h-full overflow-auto">
                    {comprehensiveValidation ? (
                      <ComprehensiveValidationPanel result={comprehensiveValidation} />
                    ) : (
                      <div className="rounded-md border py-8 text-center text-muted-foreground">
                        <FileCheck className="mx-auto mb-3 h-12 w-12 opacity-50" />
                        <p className="mb-1 font-medium">Comprehensive Validation</p>
                        <p className="text-sm">
                          Run comprehensive validation for detailed analysis including dependencies, impact analysis, best practices, and compliance checks.
                        </p>
                        <Button
                          className="mt-4"
                          onClick={() => {
                            setValidationMode('comprehensive');
                            runComprehensiveValidation();
                          }}
                          disabled={!script.trim() || comprehensiveValidationMutation.isPending}
                          data-testid="button-run-comprehensive-validation-empty"
                        >
                          {comprehensiveValidationMutation.isPending ? 'Analyzing...' : 'Run Comprehensive Validation'}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        code={script}
        initialFilename={currentFileName}
        onDesktopSaved={(fileName) => setCurrentFileName?.(fileName)}
      />
    </>
  );
}
