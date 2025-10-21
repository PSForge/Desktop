import { ScriptCommand } from "@shared/schema";
import { AIHelperBot } from "@/components/ai-helper-bot";
import { powershellCommands } from "@/lib/powershell-commands";

interface AIAssistantTabProps {
  scriptCommands: ScriptCommand[];
  setScriptCommands: (commands: ScriptCommand[]) => void;
}

export function AIAssistantTab({ scriptCommands, setScriptCommands }: AIAssistantTabProps) {
  const handleAddCommandFromBot = (commandId: string, suggestedParameters?: Record<string, string>) => {
    const command = powershellCommands.find(cmd => cmd.id === commandId);
    if (!command) return;

    const defaultParameters: Record<string, any> = {};
    
    command.parameters.forEach(param => {
      if (suggestedParameters && suggestedParameters[param.id] !== undefined) {
        const suggestedValue = suggestedParameters[param.id];
        
        if (param.type === 'switch' || param.type === 'boolean') {
          defaultParameters[param.id] = 
            suggestedValue === 'true' || 
            suggestedValue === 'True' || 
            suggestedValue === '1' || 
            suggestedValue === 'yes';
        } else if (param.type === 'int') {
          const parsed = parseInt(suggestedValue as string, 10);
          defaultParameters[param.id] = isNaN(parsed) ? 0 : parsed;
        } else if (param.type === 'array') {
          if (Array.isArray(suggestedValue)) {
            defaultParameters[param.id] = suggestedValue;
          } else if (typeof suggestedValue === 'string') {
            defaultParameters[param.id] = suggestedValue
              .split(',')
              .map(v => v.trim())
              .filter(v => v.length > 0);
          } else {
            defaultParameters[param.id] = [];
          }
        } else {
          defaultParameters[param.id] = suggestedValue;
        }
      } else if (param.defaultValue !== undefined) {
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

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1">
        <AIHelperBot
          onAddCommand={handleAddCommandFromBot}
          isOpen={true}
          onToggle={() => {}}
        />
      </div>
    </div>
  );
}
