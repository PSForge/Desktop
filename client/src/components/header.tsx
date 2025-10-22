import { Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import logoUrl from "@assets/Full Logo_1761042546255.png";

interface HeaderProps {
  onExport: () => void;
  onSave: () => void;
  hasCommands: boolean;
}

export function Header({ onExport, onSave, hasCommands }: HeaderProps) {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-50" data-testid="header-main">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="PSForge" className="h-14 w-auto" data-testid="logo-psforge" />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={!hasCommands}
          data-testid="button-save-script"
          className="hover-elevate active-elevate-2"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={onExport}
          disabled={!hasCommands}
          data-testid="button-export-script"
          className="hover-elevate active-elevate-2"
        >
          <Download className="h-4 w-4 mr-2" />
          Export .ps1
        </Button>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <ThemeToggle />
      </div>
    </header>
  );
}
