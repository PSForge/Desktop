import { useState, useEffect } from "react";
import { X, ChevronUp, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScriptCommand } from "@shared/schema";
import { getCommandById } from "@/lib/powershell-commands";

interface ParameterFormProps {
  scriptCommands: ScriptCommand[];
  onUpdateCommand: (id: string, parameters: Record<string, any>) => void;
  onRemoveCommand: (id: string) => void;
  onMoveCommand: (id: string, direction: 'up' | 'down') => void;
}

export function ParameterForm({
  scriptCommands,
  onUpdateCommand,
  onRemoveCommand,
  onMoveCommand
}: ParameterFormProps) {
  if (scriptCommands.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" data-testid="empty-state-commands">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Commands Added</h3>
          <p className="text-sm text-muted-foreground">
            Select commands from the sidebar to start building your PowerShell script.
            Configure parameters for each command and see the generated code in real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-medium" data-testid="text-commands-title">Script Commands</h2>
            <p className="text-xs text-muted-foreground mt-1" data-testid="text-commands-count">
              Configure parameters for {scriptCommands.length} command{scriptCommands.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs" data-testid="badge-command-count">
            {scriptCommands.length} step{scriptCommands.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {scriptCommands.map((scriptCommand, index) => (
          <CommandParameterCard
            key={scriptCommand.id}
            scriptCommand={scriptCommand}
            index={index}
            total={scriptCommands.length}
            onUpdateCommand={onUpdateCommand}
            onRemoveCommand={onRemoveCommand}
            onMoveCommand={onMoveCommand}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function CommandParameterCard({
  scriptCommand,
  index,
  total,
  onUpdateCommand,
  onRemoveCommand,
  onMoveCommand
}: {
  scriptCommand: ScriptCommand;
  index: number;
  total: number;
  onUpdateCommand: (id: string, parameters: Record<string, any>) => void;
  onRemoveCommand: (id: string) => void;
  onMoveCommand: (id: string, direction: 'up' | 'down') => void;
}) {
  const command = getCommandById(scriptCommand.commandId);
  const [parameters, setParameters] = useState<Record<string, any>>(scriptCommand.parameters);

  useEffect(() => {
    setParameters(scriptCommand.parameters);
  }, [scriptCommand.parameters]);

  if (!command) return null;

  const handleParameterChange = (paramId: string, value: any) => {
    const newParams = { ...parameters, [paramId]: value };
    setParameters(newParams);
    onUpdateCommand(scriptCommand.id, newParams);
  };

  return (
    <Card data-testid={`card-script-command-${scriptCommand.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="outline" className="shrink-0">
              {index + 1}
            </Badge>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-mono truncate">{command.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {command.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveCommand(scriptCommand.id, 'up')}
              disabled={index === 0}
              className="hover-elevate active-elevate-2"
              data-testid={`button-move-up-${scriptCommand.id}`}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveCommand(scriptCommand.id, 'down')}
              disabled={index === total - 1}
              className="hover-elevate active-elevate-2"
              data-testid={`button-move-down-${scriptCommand.id}`}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onRemoveCommand(scriptCommand.id)}
              className="hover-elevate active-elevate-2"
              data-testid={`button-remove-command-${scriptCommand.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {command.parameters.map((param) => {
          const value = parameters[param.id] ?? param.defaultValue ?? '';
          
          return (
            <div key={param.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`${scriptCommand.id}-${param.id}`} className="text-sm font-medium">
                  {param.name}
                  {param.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Badge variant="secondary" className="text-xs">
                  {param.type}
                </Badge>
              </div>
              
              {param.description && (
                <p className="text-xs text-muted-foreground">{param.description}</p>
              )}
              
              {param.type === 'switch' || param.type === 'boolean' ? (
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${scriptCommand.id}-${param.id}`}
                    checked={Boolean(value)}
                    onCheckedChange={(checked) => handleParameterChange(param.id, checked)}
                    data-testid={`input-${scriptCommand.id}-${param.id}`}
                  />
                  <Label htmlFor={`${scriptCommand.id}-${param.id}`} className="text-sm text-muted-foreground cursor-pointer">
                    {value ? 'Enabled' : 'Disabled'}
                  </Label>
                </div>
              ) : param.type === 'int' ? (
                <Input
                  id={`${scriptCommand.id}-${param.id}`}
                  type="number"
                  value={value}
                  onChange={(e) => handleParameterChange(param.id, parseInt(e.target.value) || 0)}
                  placeholder={param.defaultValue?.toString() || '0'}
                  data-testid={`input-${scriptCommand.id}-${param.id}`}
                />
              ) : param.type === 'array' ? (
                <Textarea
                  id={`${scriptCommand.id}-${param.id}`}
                  value={Array.isArray(value) ? value.join(', ') : value}
                  onChange={(e) => {
                    const arrayValue = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                    handleParameterChange(param.id, arrayValue);
                  }}
                  placeholder="value1, value2, value3"
                  rows={2}
                  data-testid={`input-${scriptCommand.id}-${param.id}`}
                />
              ) : (
                <Input
                  id={`${scriptCommand.id}-${param.id}`}
                  type="text"
                  value={value}
                  onChange={(e) => handleParameterChange(param.id, e.target.value)}
                  placeholder={param.defaultValue?.toString() || ''}
                  data-testid={`input-${scriptCommand.id}-${param.id}`}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
