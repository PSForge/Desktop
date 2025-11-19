import { useState } from "react";
import { ScriptCommand } from "@shared/schema";
import { AIHelperBot } from "@/components/ai-helper-bot";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useAuth } from "@/lib/auth-context";
import { powershellCommands } from "@/lib/powershell-commands";
import { generatePowerShellScript } from "@/lib/script-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Lock, CheckCircle, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AIAssistantTabProps {
  scriptCommands: ScriptCommand[];
  setScriptCommands: (commands: ScriptCommand[]) => void;
  script: string;
  setScript: (script: string) => void;
}

export function AIAssistantTab({ scriptCommands, setScriptCommands, script, setScript }: AIAssistantTabProps) {
  const { featureAccess } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();
  
  const handleGenerateScript = () => {
    if (scriptCommands.length === 0) {
      toast({
        title: "No commands to generate",
        description: "Ask the AI to suggest commands first",
        variant: "destructive",
      });
      return;
    }
    
    const generatedScript = generatePowerShellScript(scriptCommands);
    setScript(generatedScript);
    
    // Track script generation for analytics (non-blocking, fails silently)
    apiRequest("POST", "/api/metrics/script-generated", {
      builderType: "ai_assistant",
    }).catch((error) => {
      // Silently fail tracking - don't disrupt user experience
      console.debug("Script generation tracking skipped:", error.message);
    });
    
    toast({
      title: "Script Generated!",
      description: "Switch to the Script tab to view and edit your generated script",
    });
  };
  
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

  const handleUseCustomScript = (customScript: string) => {
    setScript(customScript);
    
    // Track script generation for analytics
    apiRequest("POST", "/api/metrics/script-generated", {
      builderType: "ai_assistant",
    }).catch((error) => {
      console.debug("Script generation tracking skipped:", error.message);
    });
    
    toast({
      title: "Custom Script Added!",
      description: "Switch to the Script tab to view and edit your script",
    });
  };

  if (!featureAccess?.hasAIAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Sparkles className="h-16 w-16 text-primary" />
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl">AI Assistant is a Pro Feature</CardTitle>
            <CardDescription className="text-base mt-2">
              Upgrade to PSForge Pro to unlock AI-powered PowerShell assistance with natural language command suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Natural Language Processing</p>
                  <p className="text-sm text-muted-foreground">
                    Describe what you want in plain English, get PowerShell commands instantly
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Smart Parameter Suggestions</p>
                  <p className="text-sm text-muted-foreground">
                    AI automatically fills in command parameters based on your requirements
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Context-Aware Recommendations</p>
                  <p className="text-sm text-muted-foreground">
                    Get relevant command suggestions based on your current script
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-md p-4 text-center">
              <p className="text-2xl font-bold">$5/month</p>
              <p className="text-sm text-muted-foreground mt-1">
                Plus access to all 16 enterprise IT platform categories
              </p>
            </div>

            <Button 
              onClick={() => setShowUpgradeModal(true)}
              className="w-full"
              size="lg"
              data-testid="button-upgrade-ai"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>

        <UpgradeModal 
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="AI Assistant"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="p-4 sm:p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">AI Assistant</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Describe your automation needs in plain English
          </p>
        </div>
        {scriptCommands.length > 0 && (
          <Button 
            onClick={handleGenerateScript}
            className="gap-2"
            data-testid="button-generate-script"
          >
            <Code className="h-4 w-4" />
            Generate Script ({scriptCommands.length} {scriptCommands.length === 1 ? 'command' : 'commands'})
          </Button>
        )}
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <AIHelperBot
            onAddCommand={handleAddCommandFromBot}
            onUseCustomScript={handleUseCustomScript}
            isOpen={true}
            onToggle={() => {}}
          />
        </div>
      </div>
      <UpgradeModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="AI Assistant"
      />
    </div>
  );
}
