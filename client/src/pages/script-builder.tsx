
import { useState, useEffect } from "react";
import { ScriptCommand } from "@shared/schema";
import { Header } from "@/components/header";
import { ScriptGeneratorTab } from "@/components/script-generator-tab";
import { AIAssistantTab } from "@/components/ai-assistant-tab";
import { GUIBuilderTab } from "@/components/gui-builder-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Sparkles, LayoutGrid } from "lucide-react";

export default function ScriptBuilder() {
  const [scriptCommands, setScriptCommands] = useState<ScriptCommand[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedGuiCategory, setSelectedGuiCategory] = useState<string | null>(null);

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
    <div className="min-h-screen md:h-screen flex flex-col bg-background">
      <Header
        onExport={handleExport}
        onSave={handleSave}
        hasCommands={scriptCommands.length > 0}
      />

      <Tabs defaultValue="script-generator" className="flex-1 flex flex-col md:overflow-hidden min-h-0">
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

        <TabsContent value="script-generator" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0">
          <ScriptGeneratorTab
            scriptCommands={scriptCommands}
            setScriptCommands={setScriptCommands}
            exportDialogOpen={exportDialogOpen}
            setExportDialogOpen={setExportDialogOpen}
          />
        </TabsContent>

        <TabsContent value="ai-assistant" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0">
          <AIAssistantTab
            scriptCommands={scriptCommands}
            setScriptCommands={setScriptCommands}
          />
        </TabsContent>

        <TabsContent value="gui-builder" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0">
          <GUIBuilderTab 
            selectedCategory={selectedGuiCategory}
            onCategorySelect={setSelectedGuiCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
