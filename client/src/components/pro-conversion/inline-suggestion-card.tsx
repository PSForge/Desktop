import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Sparkles, 
  Zap, 
  Crown, 
  Bot, 
  Wand2, 
  ShieldCheck,
  FileText,
  ArrowRight 
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import type { NudgeType } from "@shared/schema";

type SuggestionContext = 
  | "ai_assistant_locked" 
  | "optimization_locked" 
  | "documentation_locked" 
  | "advanced_tasks_locked"
  | "security_deep_scan"
  | "template_marketplace";

interface InlineSuggestionCardProps {
  context: SuggestionContext;
  featureName?: string;
  compact?: boolean;
  onDismiss?: () => void;
  onUpgrade?: () => void;
}

const contextConfig: Record<SuggestionContext, {
  icon: typeof Sparkles;
  title: string;
  description: string;
  benefit: string;
  color: string;
  nudgeType: NudgeType;
}> = {
  ai_assistant_locked: {
    icon: Bot,
    title: "AI-Powered Script Generation",
    description: "Describe what you need in plain English and let AI create the script for you.",
    benefit: "Save 80% more time with intelligent automation",
    color: "text-purple-500",
    nudgeType: "ai_feature_teaser",
  },
  optimization_locked: {
    icon: Zap,
    title: "AI Script Optimization",
    description: "Get performance analysis, security deep-scans, and best practices recommendations.",
    benefit: "Catch issues before they become problems",
    color: "text-amber-500",
    nudgeType: "ai_feature_teaser",
  },
  documentation_locked: {
    icon: FileText,
    title: "AI Documentation Generator",
    description: "Auto-generate professional comment-based help documentation for your scripts.",
    benefit: "Save hours of documentation work",
    color: "text-blue-500",
    nudgeType: "ai_feature_teaser",
  },
  advanced_tasks_locked: {
    icon: Wand2,
    title: "Advanced Automation Tasks",
    description: "Access 800+ additional enterprise automation tasks across 48 platforms.",
    benefit: "Microsoft 365, Azure AD, Security, and more",
    color: "text-green-500",
    nudgeType: "power_user_prompt",
  },
  security_deep_scan: {
    icon: ShieldCheck,
    title: "Deep Security Analysis",
    description: "AI-powered security scanning with vulnerability detection and remediation advice.",
    benefit: "Enterprise-grade script security",
    color: "text-red-500",
    nudgeType: "ai_feature_teaser",
  },
  template_marketplace: {
    icon: Crown,
    title: "Premium Template Access",
    description: "Download and use premium community templates with verified security.",
    benefit: "Pre-built solutions by IT experts",
    color: "text-pink-500",
    nudgeType: "community_teaser",
  },
};

export function InlineSuggestionCard({
  context,
  featureName,
  compact = false,
  onDismiss,
  onUpgrade,
}: InlineSuggestionCardProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const config = contextConfig[context];
      await apiRequest(`/api/user/nudges/${config.nudgeType}/dismiss`, "POST");
    },
    onSuccess: () => {
      setIsDismissed(true);
      onDismiss?.();
    },
  });

  if (!user || user.role !== "free" || isDismissed) {
    return null;
  }

  const config = contextConfig[context];
  const Icon = config.icon;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = "/account?upgrade=true&promo=FREE30";
    }
  };

  if (compact) {
    return (
      <div 
        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed"
        data-testid={`suggestion-card-${context}-compact`}
      >
        <div className={`p-1.5 rounded ${config.color} bg-current/10`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {featureName || config.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {config.benefit}
          </p>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          className="shrink-0"
          onClick={handleUpgrade}
          data-testid="button-unlock-compact"
        >
          <Crown className="h-3 w-3 mr-1" />
          Unlock
        </Button>
      </div>
    );
  }

  return (
    <Card 
      className="overflow-visible relative border-dashed"
      data-testid={`suggestion-card-${context}`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={() => dismissMutation.mutate()}
        data-testid="button-dismiss-suggestion"
      >
        <X className="h-3 w-3" />
      </Button>

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.color} bg-current/10`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{featureName || config.title}</h4>
              <Badge variant="secondary" className="text-xs">
                Pro
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
            
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {config.benefit}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={handleUpgrade}
                data-testid="button-try-pro"
              >
                <Crown className="h-3 w-3 mr-1" />
                Try Pro Free
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Use code FREE30
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LockedFeatureOverlay({
  context,
  children,
}: {
  context: SuggestionContext;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || user.role !== "free") {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none blur-sm">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <InlineSuggestionCard context={context} compact />
      </div>
    </div>
  );
}
