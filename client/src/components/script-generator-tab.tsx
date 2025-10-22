import { useState, useEffect, useMemo } from "react";
import { Command, ScriptCommand, ValidationResult } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CommandSidebar } from "@/components/command-sidebar";
import { ParameterForm } from "@/components/parameter-form";
import { CodePreview } from "@/components/code-preview";
import { ValidationPanel } from "@/components/validation-panel";
import { ExportDialog } from "@/components/export-dialog";
import { generatePowerShellScript } from "@/lib/script-generator";
import { powershellCommands } from "@/lib/powershell-commands";

interface ScriptGeneratorTabProps {
  scriptCommands: ScriptCommand[];
  setScriptCommands: (commands: ScriptCommand[]) => void;
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
}

export function ScriptGeneratorTab({
  scriptCommands,
  setScriptCommands,
  exportDialogOpen,
  setExportDialogOpen
}: ScriptGeneratorTabProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
  });
  const [lastValidatedCode, setLastValidatedCode] = useState<string>('');

  const generatedCode = useMemo(() => {
    return generatePowerShellScript(scriptCommands);
  }, [scriptCommands]);

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

  useEffect(() => {
    if (!generatedCode.trim()) {
      setValidationResult({
        isValid: true,
        errors: [],
      });
      setLastValidatedCode('');
      return;
    }

    if (generatedCode !== lastValidatedCode && !validationMutation.isPending) {
      validationMutation.mutate(generatedCode);
    }
  }, [generatedCode, lastValidatedCode]);

  const handleAddCommand = (command: Command) => {
    const defaultParameters: Record<string, any> = {};
    
    command.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        defaultParameters[param.id] = param.defaultValue;
      } else if (param.type === 'switch' || param.type === 'boolean') {
        defaultParameters[param.id] = false;
      } else if (param.type === 'array') {
        defaultParameters[param.id] = [];
      } else if (param.type === 'int') {
        defaultParameters[param.id] = 0;
      } else {
        defaultParameters[param.id] = '';
      }
    });

    const newCommand: ScriptCommand = {
      id: crypto.randomUUID(),
      commandId: command.id,
      commandName: command.name,
      parameters: defaultParameters,
      order: scriptCommands.length,
    };

    setScriptCommands([...scriptCommands, newCommand]);
  };

  const handleUpdateCommand = (id: string, parameters: Record<string, any>) => {
    setScriptCommands(scriptCommands.map(cmd =>
      cmd.id === id ? { ...cmd, parameters } : cmd
    ));
  };

  const handleRemoveCommand = (id: string) => {
    setScriptCommands(scriptCommands.filter(cmd => cmd.id !== id));
  };

  const handleMoveCommand = (id: string, direction: 'up' | 'down') => {
    const index = scriptCommands.findIndex(cmd => cmd.id === id);
    if (index === -1) return;

    const newCommands = [...scriptCommands];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newCommands.length) return;

    [newCommands[index], newCommands[targetIndex]] = [newCommands[targetIndex], newCommands[index]];
    
    setScriptCommands(newCommands.map((cmd, idx) => ({ ...cmd, order: idx })));
  };

  return (
    <>
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden min-h-0">
        <CommandSidebar onAddCommand={handleAddCommand} />

        <div className="flex-1 flex flex-col md:overflow-hidden min-w-0 min-h-0">
          <div className="md:flex-1 md:flex md:flex-col border-b md:overflow-auto md:min-h-0">
            <ParameterForm
              scriptCommands={scriptCommands}
              onUpdateCommand={handleUpdateCommand}
              onRemoveCommand={handleRemoveCommand}
              onMoveCommand={handleMoveCommand}
            />
          </div>

          <div className="h-48 sm:h-64 md:flex-1 border-b md:shrink-0 overflow-hidden md:min-h-0">
            <CodePreview code={generatedCode} validationErrors={validationResult.errors || []} />
          </div>

          <div className="p-4 md:shrink-0">
            <ValidationPanel 
              errors={validationResult.errors || []} 
              isValidating={validationMutation.isPending}
            />
          </div>
        </div>
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        code={generatedCode}
      />
    </>
  );
}
