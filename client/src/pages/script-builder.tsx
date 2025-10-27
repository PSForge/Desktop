
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ScriptCommand } from "@shared/schema";
import { Header } from "@/components/header";
import { ScriptGeneratorTab } from "@/components/script-generator-tab";
import { AIAssistantTab } from "@/components/ai-assistant-tab";
import { GUIBuilderTab } from "@/components/gui-builder-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Sparkles, LayoutGrid } from "lucide-react";
import { generatePowerShellScript } from "@/lib/script-generator";

export default function ScriptBuilder() {
  const [location] = useLocation();
  const [script, setScript] = useState<string>('');
  const [scriptCommands, setScriptCommands] = useState<ScriptCommand[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedGuiCategory, setSelectedGuiCategory] = useState<string | null>(null);

  // Get tab from URL query parameter
  const defaultTab = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'ai-assistant' || tab === 'gui-builder') {
      return tab;
    }
    return 'script-generator';
  }, [location]);

  const handleSave = () => {
    localStorage.setItem('powershell-script', JSON.stringify({
      script,
      savedAt: new Date().toISOString(),
    }));
  };

  const handleExport = () => {
    if (!script.trim()) return;
    setExportDialogOpen(true);
  };

  useEffect(() => {
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
        onSave={handleSave}
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
          />
        </TabsContent>

        <TabsContent value="gui-builder" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0 data-[state=inactive]:absolute data-[state=inactive]:invisible">
          <GUIBuilderTab 
            selectedCategory={selectedGuiCategory}
            onCategorySelect={setSelectedGuiCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
