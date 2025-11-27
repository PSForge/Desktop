import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Clock, 
  DollarSign, 
  Target, 
  TrendingUp,
  Zap,
  Crown,
  CheckCircle,
  ArrowRight,
  Calendar,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { CommunityBadgeDisplay, CommunityBadgeProgress } from "./community-badge-display";
import type { UserStats, UserMilestone } from "@shared/schema";

interface ProgressDashboardProps {
  variant?: "full" | "compact" | "sidebar";
}

const milestoneLabels: Record<string, string> = {
  scripts_created_5: "Created 5 scripts",
  scripts_created_10: "Created 10 scripts",
  scripts_created_25: "Created 25 scripts",
  scripts_created_50: "Created 50 scripts",
  time_saved_5_hours: "Saved 5 hours",
  time_saved_10_hours: "Saved 10 hours",
  time_saved_20_hours: "Saved 20 hours",
  active_7_days: "Active 7 days",
  active_30_days: "Active 30 days",
};

export function ProgressDashboard({ variant = "full" }: ProgressDashboardProps) {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  if (isLoading || !stats) {
    return (
      <Card data-testid="progress-dashboard-loading">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleUpgrade = () => {
    window.location.href = "/account?upgrade=true&promo=FREE30";
  };

  if (variant === "sidebar") {
    return (
      <div className="space-y-4 p-4" data-testid="progress-dashboard-sidebar">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Your Progress</span>
          <CommunityBadgeDisplay size="sm" />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{stats.totalScriptsCreated}</div>
            <div className="text-xs text-muted-foreground">Scripts</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{stats.totalTimeSavedHours}h</div>
            <div className="text-xs text-muted-foreground">Saved</div>
          </div>
        </div>

        {user?.role === "free" && (
          <Button 
            size="sm" 
            className="w-full"
            onClick={handleUpgrade}
            data-testid="button-upgrade-sidebar"
          >
            <Crown className="h-3 w-3 mr-1" />
            Upgrade to Pro
          </Button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card data-testid="progress-dashboard-compact">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CommunityBadgeDisplay size="md" showLabel />
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{stats.totalScriptsCreated}</span>
                  <span className="text-muted-foreground">scripts</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{stats.totalTimeSavedHours}h</span>
                  <span className="text-muted-foreground">saved</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-medium">${stats.totalValueCreated}</span>
                  <span className="text-muted-foreground">value</span>
                </div>
              </div>
            </div>
            
            {user?.role === "free" && (
              <Button size="sm" onClick={handleUpgrade} data-testid="button-upgrade-compact">
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const achievedMilestones = stats.milestones?.filter(m => !m.dismissed) || [];
  const recentMilestone = achievedMilestones[0];

  return (
    <Card data-testid="progress-dashboard-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CommunityBadgeDisplay size="lg" />
            <div>
              <CardTitle>Your PSForge Journey</CardTitle>
              <CardDescription>
                {stats.daysActive} days active • Member since{" "}
                {stats.firstScriptDate 
                  ? new Date(stats.firstScriptDate).toLocaleDateString()
                  : "today"}
              </CardDescription>
            </div>
          </div>
          {user?.role === "subscriber" && (
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
              <Sparkles className="h-3 w-3 mr-1" />
              Pro Member
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold">{stats.totalScriptsCreated}</div>
            <div className="text-sm text-muted-foreground">Scripts Created</div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{stats.totalTimeSavedHours}h</div>
            <div className="text-sm text-muted-foreground">Time Saved</div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold">${stats.totalValueCreated}</div>
            <div className="text-sm text-muted-foreground">Value Created</div>
          </div>
        </div>

        <CommunityBadgeProgress />

        {recentMilestone && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-sm">Latest Achievement</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {milestoneLabels[recentMilestone.milestoneType] || recentMilestone.milestoneType}
            </p>
          </div>
        )}

        {user?.role === "free" && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Unlock {stats.roiMultiplier}x More Value</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pro users save up to ${stats.potentialValueWithPro}/month with AI automation
                </p>
              </div>
              <Button onClick={handleUpgrade} data-testid="button-upgrade-progress">
                <Crown className="h-4 w-4 mr-2" />
                Try Pro Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {achievedMilestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Achievements</h4>
            <div className="flex flex-wrap gap-2">
              {achievedMilestones.slice(0, 5).map((milestone) => (
                <Badge 
                  key={milestone.id} 
                  variant="secondary"
                  className="gap-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  {milestoneLabels[milestone.milestoneType] || milestone.milestoneType}
                </Badge>
              ))}
              {achievedMilestones.length > 5 && (
                <Badge variant="outline">+{achievedMilestones.length - 5} more</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
