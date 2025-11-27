import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserStats } from "@shared/schema";
import { Trophy, Star, Rocket, Crown, Award } from "lucide-react";

interface MilestoneInfo {
  threshold: number;
  title: string;
  message: string;
  proTip: string;
  icon: typeof Trophy;
}

const MILESTONES: MilestoneInfo[] = [
  {
    threshold: 5,
    title: "Getting Started!",
    message: "You've saved 5 scripts! You're building a solid automation toolkit.",
    proTip: "Pro users at this stage typically use GitHub sync to protect their work.",
    icon: Star,
  },
  {
    threshold: 10,
    title: "On a Roll!",
    message: "10 scripts saved! You're becoming an automation pro.",
    proTip: "Pro users save 3x more time with AI-powered script generation.",
    icon: Trophy,
  },
  {
    threshold: 25,
    title: "Power User!",
    message: "25 scripts! You're a certified power user now.",
    proTip: "Want to share your expertise? Pro users can publish templates to the Marketplace.",
    icon: Rocket,
  },
  {
    threshold: 50,
    title: "Automation Expert!",
    message: "50 scripts! You're mastering PowerShell automation.",
    proTip: "AI optimization can make your scripts even more efficient. Try Pro free!",
    icon: Award,
  },
  {
    threshold: 100,
    title: "PSForge Veteran!",
    message: "100 scripts! You're a true automation legend.",
    proTip: "You've proven your expertise. Share your knowledge by publishing templates!",
    icon: Crown,
  },
];

export function useMilestones() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const trackSaveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/user-stats/track-save', 'POST');
      return await response.json() as UserStats & { newMilestone?: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      
      if (data.newMilestone) {
        const milestone = MILESTONES.find(m => m.threshold === data.newMilestone);
        if (milestone) {
          const isPro = user?.role === 'subscriber' || user?.role === 'admin';
          const IconComponent = milestone.icon;
          
          toast({
            title: (
              <div className="flex items-center gap-2">
                <IconComponent className="h-5 w-5 text-yellow-500" />
                <span>{milestone.title}</span>
              </div>
            ) as any,
            description: (
              <div className="space-y-2">
                <p>{milestone.message}</p>
                {!isPro && (
                  <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    {milestone.proTip}
                  </p>
                )}
              </div>
            ) as any,
            duration: 6000,
          });
        }
      }
    },
  });

  const trackGenerationMutation = useMutation({
    mutationFn: async (source: 'gui' | 'ai' | 'wizard' | 'direct') => {
      const response = await apiRequest('/api/user-stats/track-generation', 'POST', { source });
      return await response.json() as UserStats;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
    },
  });

  return {
    trackScriptSaved: () => trackSaveMutation.mutate(),
    trackScriptGenerated: (source: 'gui' | 'ai' | 'wizard' | 'direct') => trackGenerationMutation.mutate(source),
    isTracking: trackSaveMutation.isPending || trackGenerationMutation.isPending,
  };
}
