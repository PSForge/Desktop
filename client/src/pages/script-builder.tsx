
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ScriptCommand } from "@shared/schema";
import { Header } from "@/components/header";
import { ScriptGeneratorTab } from "@/components/script-generator-tab";
import { AIAssistantTab } from "@/components/ai-assistant-tab";
import { GUIBuilderTab } from "@/components/gui-builder-tab";
import { ScriptWizardTab } from "@/components/script-wizard-tab";
import { GitPanel } from "@/components/git-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Sparkles, LayoutGrid, Wand2, GitBranch } from "lucide-react";
import { generatePowerShellScript } from "@/lib/script-generator";
import { useToast } from "@/hooks/use-toast";

export default function ScriptBuilder() {
  const [location] = useLocation();
  const [script, setScript] = useState<string>('');
  const [scriptCommands, setScriptCommands] = useState<ScriptCommand[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedGuiCategory, setSelectedGuiCategory] = useState<string | null>(null);
  const { toast } = useToast();

  // Get tab from URL query parameter
  const defaultTab = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'ai-assistant' || tab === 'gui-builder' || tab === 'script-wizard' || tab === 'git') {
      return tab;
    }
    return 'script-generator';
  }, [location]);

  const handleExport = () => {
    if (!script.trim()) return;
    setExportDialogOpen(true);
  };

  useEffect(() => {
    // Check if loading a specific script from account page
    const loadScript = localStorage.getItem('loadScript');
    if (loadScript) {
      try {
        const scriptData = JSON.parse(loadScript);
        setScript(scriptData.content);
        localStorage.removeItem('loadScript'); // Clear after loading
        return;
      } catch (err) {
        console.error('Failed to load script from account:', err);
      }
    }

    // Otherwise, load auto-saved script
    const saved = localStorage.getItem('powershell-script');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.script) {
          // New format: use script directly
          setScript(data.script);
        } else if (data.commands && Array.isArray(data.commands)) {
          // Legacy support: convert old command-based format to script
          const convertedScript = generatePowerShellScript(data.commands);
          setScript(convertedScript);
          setScriptCommands(data.commands); // Keep for AI assistant tab
        }
      } catch (err) {
        console.error('Failed to load saved script:', err);
      }
    }
  }, []);

  return (
    <div className="min-h-screen md:h-screen flex flex-col bg-background">
      <Header
        onExport={handleExport}
        hasCommands={script.trim().length > 0}
      />

      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col md:overflow-hidden min-h-0">
        <div className="border-b px-3 sm:px-6">
          <div className="flex flex-row gap-2 h-10 sm:h-12 overflow-x-auto">
            <TabsList className="h-full inline-flex">
              <TabsTrigger value="script-generator" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-script-generator">
                <FileCode className="h-4 w-4" />
                <span>Script</span>
              </TabsTrigger>
              <TabsTrigger value="ai-assistant" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-ai-assistant">
                <Sparkles className="h-4 w-4" />
                <span>AI</span>
              </TabsTrigger>
              <TabsTrigger value="gui-builder" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-gui-builder">
                <LayoutGrid className="h-4 w-4" />
                <span>GUI</span>
              </TabsTrigger>
              <TabsTrigger value="script-wizard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-script-wizard">
                <Wand2 className="h-4 w-4" />
                <span>Wizard</span>
              </TabsTrigger>
              <TabsTrigger value="git" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-git">
                <GitBranch className="h-4 w-4" />
                <span>Git</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="script-generator" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0 data-[state=inactive]:absolute data-[state=inactive]:invisible">
          <ScriptGeneratorTab
            script={script}
            setScript={setScript}
            exportDialogOpen={exportDialogOpen}
            setExportDialogOpen={setExportDialogOpen}
          />
        </TabsContent>

        <TabsContent value="ai-assistant" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0 data-[state=inactive]:absolute data-[state=inactive]:invisible">
          <AIAssistantTab
            scriptCommands={scriptCommands}
            setScriptCommands={setScriptCommands}
            script={script}
            setScript={setScript}
          />
        </TabsContent>

        <TabsContent value="gui-builder" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0 data-[state=inactive]:absolute data-[state=inactive]:invisible">
          <GUIBuilderTab 
            selectedCategory={selectedGuiCategory}
            onCategorySelect={setSelectedGuiCategory}
            script={script}
            setScript={setScript}
          />
        </TabsContent>

        <TabsContent value="script-wizard" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0 data-[state=inactive]:absolute data-[state=inactive]:invisible">
          <ScriptWizardTab 
            script={script}
            setScript={setScript}
          />
        </TabsContent>

        <TabsContent value="git" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0 data-[state=inactive]:absolute data-[state=inactive]:invisible">
          <div className="flex-1 flex flex-col overflow-auto p-6">
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Git Integration</h1>
                <p className="text-muted-foreground">
                  Connect your GitHub repositories and manage PowerShell scripts with version control
                </p>
              </div>
              <GitPanel />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
