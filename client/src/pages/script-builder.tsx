import { useState, useEffect } from "react";
import { ScriptCommand } from "@shared/schema";
import { Header } from "@/components/header";
import { ScriptGeneratorTab } from "@/components/script-generator-tab";
import { AIAssistantTab } from "@/components/ai-assistant-tab";
import { GUIBuilderTab } from "@/components/gui-builder-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Sparkles, Layout } from "lucide-react";

export default function ScriptBuilder() {
  const [scriptCommands, setScriptCommands] = useState<ScriptCommand[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);


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

      <Tabs defaultValue="script-generator" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6">
          <TabsList className="h-12">
            <TabsTrigger value="script-generator" className="flex items-center gap-2" data-testid="tab-script-generator">
              <FileCode className="h-4 w-4" />
              Script Generator
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="flex items-center gap-2" data-testid="tab-ai-assistant">
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="gui-builder" className="flex items-center gap-2" data-testid="tab-gui-builder">
              <Layout className="h-4 w-4" />
              GUI Builder
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="script-generator" className="flex-1 flex flex-col overflow-hidden mt-0">
          <ScriptGeneratorTab
            scriptCommands={scriptCommands}
            setScriptCommands={setScriptCommands}
            exportDialogOpen={exportDialogOpen}
            setExportDialogOpen={setExportDialogOpen}
          />
        </TabsContent>

        <TabsContent value="ai-assistant" className="flex-1 flex flex-col overflow-hidden mt-0">
          <AIAssistantTab
            scriptCommands={scriptCommands}
            setScriptCommands={setScriptCommands}
          />
        </TabsContent>

        <TabsContent value="gui-builder" className="flex-1 flex flex-col overflow-hidden mt-0">
          <GUIBuilderTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
