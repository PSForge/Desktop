import { Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Link } from "wouter";
import logoUrl from "@assets/Full Logo Transparent_1761567685412.png";

interface HeaderProps {
  onExport: () => void;
  hasCommands: boolean;
}

export function Header({ onExport, hasCommands }: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 border-b bg-background flex items-center justify-between px-3 sm:px-6 sticky top-0 z-50" data-testid="header-main">
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/">
          <img src={logoUrl} alt="PSForge" className="h-10 sm:h-12 w-auto cursor-pointer" data-testid="logo-psforge" />
        </Link>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onExport}
          disabled={!hasCommands}
          data-testid="button-save-script"
          className="hover-elevate active-elevate-2"
        >
          <Save className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        
        <div className="w-px h-6 bg-border mx-1 sm:mx-2 hidden sm:block" />
        
        <Link href="/account">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            data-testid="button-account"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </Button>
        </Link>
        
        <ThemeToggle />
      </div>
    </header>
  );
}
