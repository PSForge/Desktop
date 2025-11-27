import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, Clock, Zap, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { UserStats } from "@shared/schema";

interface NudgeConfig {
  id: string;
  title: string;
  message: string;
  icon: typeof Sparkles;
  ctaText: string;
  condition: (stats: UserStats, userRole: string) => boolean;
}

const NUDGES: NudgeConfig[] = [
  {
    id: 'ai-speed',
    title: "Pro Tip",
    message: "AI can build this script in 30 seconds. Want to try?",
    icon: Zap,
    ctaText: "Try AI Free",
    condition: (stats, role) => role === 'free' && stats.generationSources.gui >= 3,
  },
  {
    id: 'time-savings',
    title: "Time Savings",
    message: "You've used the GUI Builder 5+ times. Pro users save 3x more time with AI assistance.",
    icon: Clock,
    ctaText: "See How",
    condition: (stats, role) => role === 'free' && stats.generationSources.gui >= 5,
  },
  {
    id: 'growing-library',
    title: "Growing Library",
    message: "Your script library is growing! Pro includes GitHub sync to protect your work.",
    icon: TrendingUp,
    ctaText: "Learn More",
    condition: (stats, role) => role === 'free' && stats.scriptsSaved >= 5,
  },
];

interface ConversionNudgeProps {
  context: 'gui-builder' | 'script-saved' | 'general';
  onDismiss?: () => void;
}

export function ConversionNudge({ context, onDismiss }: ConversionNudgeProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  
  const { data: stats } = useQuery<UserStats>({
    queryKey: ['/api/user-stats'],
    enabled: !!user,
  });

  const dismissMutation = useMutation({
    mutationFn: async (nudgeId: string) => {
      return apiRequest('/api/user-stats/dismiss-nudge', 'POST', { nudgeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
    },
  });

  if (!user || !stats || dismissed) {
    return null;
  }

  const isPro = user.role === 'subscriber' || user.role === 'admin';
  if (isPro) {
    return null;
  }

  // Find applicable nudge that hasn't been dismissed
  const applicableNudge = NUDGES.find(nudge => 
    nudge.condition(stats, user.role) && 
    !stats.nudgesDismissed.includes(nudge.id)
  );

  if (!applicableNudge) {
    return null;
  }

  const handleDismiss = () => {
    dismissMutation.mutate(applicableNudge.id);
    setDismissed(true);
    onDismiss?.();
  };

  const IconComponent = applicableNudge.icon;

  return (
    <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-primary/5" data-testid="card-conversion-nudge">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <IconComponent className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-foreground">{applicableNudge.title}</span>
              <Badge variant="secondary" className="text-purple-600 dark:text-purple-400 text-xs">
                <Sparkles className="h-2 w-2 mr-1" />
                Pro
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {applicableNudge.message}
            </p>
            <div className="flex items-center gap-2">
              <Link href="/account">
                <Button size="sm" className="gap-1" data-testid="button-nudge-cta">
                  <Sparkles className="h-3 w-3" />
                  {applicableNudge.ctaText}
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDismiss}
                data-testid="button-nudge-dismiss"
              >
                Not now
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            data-testid="button-nudge-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Post-generation nudge that shows after script is generated
interface PostGenerationNudgeProps {
  source: 'gui' | 'wizard' | 'direct';
  onDismiss: () => void;
}

export function PostGenerationNudge({ source, onDismiss }: PostGenerationNudgeProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!user || !visible) {
    return null;
  }

  const isPro = user.role === 'subscriber' || user.role === 'admin';
  if (isPro) {
    return null;
  }

  const timeEstimate = source === 'direct' ? '15+ minutes' : '~15 minutes';

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300" data-testid="nudge-post-generation">
      <Card className="w-80 border-purple-500/30 bg-background/95 backdrop-blur shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground mb-1">
                This took {timeEstimate} to build.
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                With AI, it could take just 2 minutes. (13+ min saved!)
              </p>
              <div className="flex items-center gap-2">
                <Link href="/account">
                  <Button size="sm" variant="default" className="gap-1 h-7 text-xs" data-testid="button-post-gen-upgrade">
                    <Sparkles className="h-3 w-3" />
                    Try Pro Free
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setVisible(false);
                    onDismiss();
                  }}
                  data-testid="button-post-gen-dismiss"
                >
                  Dismiss
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setVisible(false);
                onDismiss();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
