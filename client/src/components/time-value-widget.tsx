import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, DollarSign, Zap, TrendingUp, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import type { UserStats } from "@shared/schema";

const MINUTES_PER_SCRIPT = 15;
const AI_MINUTES_PER_SCRIPT = 2;
const DEFAULT_HOURLY_RATE = 40;

interface TimeValueWidgetProps {
  compact?: boolean;
}

export function TimeValueWidget({ compact = false }: TimeValueWidgetProps) {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ['/api/user-stats'],
    enabled: !!user,
  });

  if (!user || isLoading) {
    return null;
  }

  const scriptsGenerated = stats?.scriptsGenerated || 0;
  const scriptsSaved = stats?.scriptsSaved || 0;
  const totalScripts = Math.max(scriptsGenerated, scriptsSaved);
  
  const minutesSaved = totalScripts * MINUTES_PER_SCRIPT;
  const hoursSaved = Math.floor(minutesSaved / 60);
  const remainingMinutes = minutesSaved % 60;
  
  const dollarsSaved = Math.round((minutesSaved / 60) * DEFAULT_HOURLY_RATE);
  
  const potentialAISavings = totalScripts * (MINUTES_PER_SCRIPT - AI_MINUTES_PER_SCRIPT);
  const potentialExtraHours = Math.floor(potentialAISavings / 60);
  
  const isPro = user.role === 'subscriber' || user.role === 'admin';

  if (compact) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-time-value-compact">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Time Saved</div>
                <div className="text-lg font-bold text-foreground" data-testid="text-time-saved-compact">
                  {hoursSaved > 0 ? `${hoursSaved}h ${remainingMinutes}m` : `${remainingMinutes}m`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Value</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="text-value-saved-compact">
                ${dollarsSaved}
              </div>
            </div>
          </div>
          
          {!isPro && totalScripts >= 3 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  Pro could save {potentialExtraHours}+ more hours
                </span>
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-primary underline-offset-4 hover:underline" data-testid="button-upgrade-compact">
                    Upgrade
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20" data-testid="card-time-value">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Automation Impact
          </CardTitle>
          {isPro && (
            <Badge variant="secondary" className="text-purple-600 dark:text-purple-400">
              <Sparkles className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Time Saved
            </div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-time-saved">
              {hoursSaved > 0 ? `${hoursSaved}h ${remainingMinutes}m` : `${remainingMinutes}m`}
            </div>
            <div className="text-xs text-muted-foreground">
              ~{MINUTES_PER_SCRIPT} min per script
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Estimated Value
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-value-saved">
              ${dollarsSaved}
            </div>
            <div className="text-xs text-muted-foreground">
              at ${DEFAULT_HOURLY_RATE}/hour
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Scripts Created</span>
            <span className="font-medium" data-testid="text-scripts-count">{totalScripts}</span>
          </div>
          <Progress value={Math.min((totalScripts / 100) * 100, 100)} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {totalScripts >= 100 ? 'PSForge Veteran!' : `${100 - totalScripts} more to veteran status`}
          </div>
        </div>

        {!isPro && totalScripts >= 3 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-primary/10 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Pro users save 3x more time
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  With AI assistance, you could save an additional {potentialExtraHours}+ hours. That's ${potentialExtraHours * DEFAULT_HOURLY_RATE}+ in value.
                </div>
                <Link href="/account">
                  <Button size="sm" className="mt-2 gap-1" data-testid="button-upgrade">
                    <Sparkles className="h-3 w-3" />
                    Upgrade to Pro - $5/month
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {isPro && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-primary/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Zap className="h-4 w-4" />
              <span className="font-medium">AI Assistant is boosting your productivity</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
