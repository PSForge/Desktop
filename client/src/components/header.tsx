import { Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import logoUrl from "@assets/Full Logo Transparent_1761225336537.png";

interface HeaderProps {
  onExport: () => void;
  onSave: () => void;
  hasCommands: boolean;
}

export function Header({ onExport, onSave, hasCommands }: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 border-b bg-background flex items-center justify-between px-3 sm:px-6 sticky top-0 z-50" data-testid="header-main">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={logoUrl} alt="PSForge" className="h-10 sm:h-14 w-auto" data-testid="logo-psforge" />
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={!hasCommands}
          data-testid="button-save-script"
          className="hover-elevate active-elevate-2"
        >
          <Save className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={onExport}
          disabled={!hasCommands}
          data-testid="button-export-script"
          className="hover-elevate active-elevate-2"
        >
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Export .ps1</span>
        </Button>
        
        <div className="w-px h-6 bg-border mx-1 sm:mx-2 hidden sm:block" />
        
        <ThemeToggle />
      </div>
    </header>
  );
}
