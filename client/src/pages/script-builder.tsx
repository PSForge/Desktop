import { useState, useEffect, useMemo } from "react";
import { Command, ScriptCommand, ValidationResult } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header";
import { CommandSidebar } from "@/components/command-sidebar";
import { ParameterForm } from "@/components/parameter-form";
import { CodePreview } from "@/components/code-preview";
import { ValidationPanel } from "@/components/validation-panel";
import { ExportDialog } from "@/components/export-dialog";
import { generatePowerShellScript } from "@/lib/script-generator";

export default function ScriptBuilder() {
  const [scriptCommands, setScriptCommands] = useState<ScriptCommand[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
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
      const response = await apiRequest<ValidationResult>('/api/validate', {
        method: 'POST',
        body: JSON.stringify({ code }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
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
  }, [generatedCode, lastValidatedCode, validationMutation]);

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

  const handleSave = () => {
    localStorage.setItem('powershell-script', JSON.stringify({
      commands: scriptCommands,
      savedAt: new Date().toISOString(),
    }));
  };

  const handleExport = () => {
    if (scriptCommands.length === 0) return;
    setExportDialogOpen(true);
  };

  useEffect(() => {
    const saved = localStorage.getItem('powershell-script');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.commands) {
          setScriptCommands(data.commands);
        }
      } catch (err) {
        console.error('Failed to load saved script:', err);
      }
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        onExport={handleExport}
        onSave={handleSave}
        hasCommands={scriptCommands.length > 0}
      />

      <div className="flex-1 flex overflow-hidden">
        <CommandSidebar onAddCommand={handleAddCommand} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto border-b">
            <ParameterForm
              scriptCommands={scriptCommands}
              onUpdateCommand={handleUpdateCommand}
              onRemoveCommand={handleRemoveCommand}
              onMoveCommand={handleMoveCommand}
            />
          </div>

          <div className="h-80 border-b">
            <CodePreview code={generatedCode} validationErrors={validationResult.errors || []} />
          </div>

          <div className="p-4">
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
    </div>
  );
}
