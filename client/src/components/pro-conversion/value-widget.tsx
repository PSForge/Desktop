import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, DollarSign, Zap, TrendingUp, Sparkles, X, ArrowRight, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserStats } from "@shared/schema";

interface ValueWidgetProps {
  variant?: "compact" | "full" | "minimal";
  showUpgradeButton?: boolean;
  onUpgradeClick?: () => void;
}

export function ValueWidget({ 
  variant = "full", 
  showUpgradeButton = true,
  onUpgradeClick 
}: ValueWidgetProps) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user && user.role === "free",
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/user/nudges/value_widget/dismiss", "POST");
    },
    onSuccess: () => {
      setDismissed(true);
    },
  });

  if (!user || user.role !== "free" || dismissed || isLoading) {
    return null;
  }

  if (!stats || stats.totalScriptsCreated === 0) {
    return null;
  }

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      window.location.href = "/account?upgrade=true&promo=FREE30";
    }
  };

  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50" data-testid="value-widget-minimal">
        <Clock className="h-4 w-4 text-blue-500" />
        <span className="text-sm">
          <span className="font-medium">{stats.totalTimeSavedHours}h</span> saved
        </span>
        <span className="text-muted-foreground">•</span>
        <DollarSign className="h-4 w-4 text-green-500" />
        <span className="text-sm">
          <span className="font-medium">${stats.totalValueCreated}</span> value
        </span>
        {showUpgradeButton && (
          <Button 
            size="sm" 
            variant="outline" 
            className="ml-auto h-7 text-xs"
            onClick={handleUpgrade}
            data-testid="button-upgrade-minimal"
          >
            <Crown className="h-3 w-3 mr-1" />
            Pro
          </Button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card className="overflow-visible" data-testid="value-widget-compact">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div className="font-semibold">{stats.totalTimeSavedHours}h</div>
                  <div className="text-xs text-muted-foreground">Time Saved</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <div className="font-semibold">${stats.totalValueCreated}</div>
                  <div className="text-xs text-muted-foreground">Value Created</div>
                </div>
              </div>
            </div>
            {showUpgradeButton && (
              <Button 
                size="sm" 
                onClick={handleUpgrade}
                data-testid="button-upgrade-compact"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Unlock {stats.roiMultiplier}x More
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierProgress = stats.currentTier === "power_user" ? 100 : 
    stats.currentTier === "regular_user" ? 60 : 30;

  return (
    <Card className="overflow-visible relative" data-testid="value-widget-full">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={() => dismissMutation.mutate()}
        data-testid="button-dismiss-value-widget"
      >
        <X className="h-3 w-3" />
      </Button>
      
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Your PSForge Impact</CardTitle>
            <CardDescription>Based on {stats.totalScriptsCreated} scripts created</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Time Saved</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalTimeSavedHours}h</div>
            <div className="text-xs text-muted-foreground mt-1">
              vs. manual scripting
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Value Created</span>
            </div>
            <div className="text-2xl font-bold">${stats.totalValueCreated}</div>
            <div className="text-xs text-muted-foreground mt-1">
              at $40/hr IT rate
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Pro Potential</span>
            </div>
            <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
              {stats.roiMultiplier}x ROI
            </Badge>
          </div>
          <div className="text-lg font-semibold">${stats.potentialValueWithPro}/month</div>
          <div className="text-xs text-muted-foreground">
            With AI-powered automation at just $5/month
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your Usage Level</span>
            <Badge 
              variant={stats.currentTier === "power_user" ? "default" : "secondary"}
              className={stats.currentTier === "power_user" ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}
            >
              {stats.currentTier === "power_user" ? "Power User" : 
               stats.currentTier === "regular_user" ? "Regular User" : "New User"}
            </Badge>
          </div>
          <Progress value={tierProgress} className="h-2" />
          {stats.currentTier !== "power_user" && (
            <div className="text-xs text-muted-foreground">
              {stats.currentTier === "new_user" 
                ? `${6 - stats.totalScriptsCreated} more scripts to Regular User`
                : `${21 - stats.totalScriptsCreated} more scripts to Power User`}
            </div>
          )}
        </div>

        {showUpgradeButton && (
          <Button 
            className="w-full" 
            onClick={handleUpgrade}
            data-testid="button-upgrade-full"
          >
            <Crown className="h-4 w-4 mr-2" />
            Unlock Pro with FREE30 Code
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
