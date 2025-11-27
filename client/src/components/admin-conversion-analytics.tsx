import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, TrendingUp, Zap, Code2, Cpu, FileCode } from "lucide-react";

interface MilestoneDistribution {
  milestone: number;
  count: number;
  percentage: number;
}

interface GenerationSourcesBreakdown {
  source: string;
  count: number;
  percentage: number;
}

export function AdminConversionAnalytics() {
  const { data: milestones, isLoading: milestonesLoading } = useQuery<MilestoneDistribution[]>({
    queryKey: ["/api/admin/stats/milestones"],
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery<GenerationSourcesBreakdown[]>({
    queryKey: ["/api/admin/stats/generation-sources"],
  });

  const milestoneLabels: Record<number, { label: string; icon: typeof Trophy }> = {
    5: { label: "First Steps", icon: Target },
    10: { label: "Getting Started", icon: TrendingUp },
    25: { label: "Power User", icon: Zap },
    50: { label: "Script Master", icon: Trophy },
    100: { label: "Automation Hero", icon: Trophy },
  };

  const sourceIcons: Record<string, typeof Code2> = {
    gui: FileCode,
    ai: Cpu,
    wizard: Zap,
    direct: Code2,
  };

  const sourceLabels: Record<string, string> = {
    gui: "GUI Builder",
    ai: "AI Assistant",
    wizard: "Script Wizard",
    direct: "Direct Coding",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="admin-conversion-analytics">
      <Card data-testid="card-milestone-distribution">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Milestone Distribution
          </CardTitle>
          <CardDescription>User progress through script saving milestones</CardDescription>
        </CardHeader>
        <CardContent>
          {milestonesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : milestones && milestones.length > 0 ? (
            <div className="space-y-4">
              {milestones.map((m) => {
                const config = milestoneLabels[m.milestone];
                const Icon = config?.icon || Trophy;
                return (
                  <div key={m.milestone} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {m.milestone} Scripts
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({config?.label || "Milestone"})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid={`badge-milestone-${m.milestone}`}>
                          {m.count} users
                        </Badge>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {m.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={m.percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No milestone data available yet. Users will trigger milestones as they save scripts.
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-generation-sources">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Script Generation Sources
          </CardTitle>
          <CardDescription>How users are creating their scripts</CardDescription>
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sources && sources.length > 0 ? (
            <div className="space-y-4">
              {sources.map((s) => {
                const Icon = sourceIcons[s.source] || Code2;
                const label = sourceLabels[s.source] || s.source;
                return (
                  <div key={s.source} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid={`badge-source-${s.source}`}>
                          {s.count} scripts
                        </Badge>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {s.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={s.percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No generation data available yet. Script generation will be tracked automatically.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
