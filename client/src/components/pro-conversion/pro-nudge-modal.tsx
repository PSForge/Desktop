import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Trophy, 
  Clock, 
  Target, 
  Crown,
  PartyPopper,
  Zap,
  Star,
  ArrowRight,
  X
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserMilestone, UserStats } from "@shared/schema";

interface ProNudgeModalProps {
  trigger?: "script_saved" | "milestone" | "manual";
  onClose?: () => void;
}

const milestoneConfig: Record<string, {
  icon: typeof Trophy;
  title: string;
  description: string;
  color: string;
  gradient: string;
}> = {
  scripts_created_5: {
    icon: Trophy,
    title: "First Milestone Achieved!",
    description: "You've created 5 scripts with PSForge!",
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  scripts_created_10: {
    icon: Target,
    title: "Power Scripter!",
    description: "10 scripts created - you're on fire!",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  scripts_created_25: {
    icon: Star,
    title: "Script Master!",
    description: "25 scripts created - incredible progress!",
    color: "text-amber-500",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  scripts_created_50: {
    icon: Crown,
    title: "Elite Scripter!",
    description: "50 scripts created - you're a legend!",
    color: "text-pink-500",
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  time_saved_5_hours: {
    icon: Clock,
    title: "Time Saver!",
    description: "You've saved 5 hours of manual work!",
    color: "text-green-500",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  time_saved_10_hours: {
    icon: Clock,
    title: "Efficiency Expert!",
    description: "10 hours saved - that's real productivity!",
    color: "text-teal-500",
    gradient: "from-teal-500/20 to-cyan-500/20",
  },
  time_saved_20_hours: {
    icon: Clock,
    title: "Productivity Champion!",
    description: "20 hours saved - amazing automation!",
    color: "text-indigo-500",
    gradient: "from-indigo-500/20 to-blue-500/20",
  },
  active_7_days: {
    icon: Zap,
    title: "Weekly Warrior!",
    description: "7 days active on PSForge!",
    color: "text-orange-500",
    gradient: "from-orange-500/20 to-amber-500/20",
  },
  active_30_days: {
    icon: PartyPopper,
    title: "Monthly Master!",
    description: "30 days active - true dedication!",
    color: "text-violet-500",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
};

export function ProNudgeModal({ trigger = "milestone", onClose }: ProNudgeModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<UserMilestone | null>(null);

  const { data: milestones, refetch } = useQuery<UserMilestone[]>({
    queryKey: ["/api/user/milestones/unshown"],
    enabled: !!user && user.role === "free",
    refetchOnWindowFocus: false,
  });

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user && user.role === "free",
  });

  const dismissMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      await apiRequest(`/api/user/milestones/${milestoneId}/dismiss`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/milestones/unshown"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
  });

  useEffect(() => {
    if (milestones && milestones.length > 0 && !currentMilestone) {
      setCurrentMilestone(milestones[0]);
      setIsOpen(true);
    }
  }, [milestones]);

  const handleClose = () => {
    if (currentMilestone && currentMilestone.id) {
      dismissMutation.mutate(currentMilestone.id);
    }
    setIsOpen(false);
    setCurrentMilestone(null);
    onClose?.();
    
    setTimeout(() => {
      refetch();
    }, 300);
  };

  const handleUpgrade = () => {
    handleClose();
    window.location.href = "/account?upgrade=true&promo=FREE30";
  };

  if (!user || user.role !== "free" || !currentMilestone) {
    return null;
  }

  const config = milestoneConfig[currentMilestone.milestoneType] || {
    icon: Trophy,
    title: "Achievement Unlocked!",
    description: "You've reached a new milestone!",
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-purple-500/20",
  };

  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="modal-pro-nudge">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={handleClose}
          data-testid="button-close-nudge"
        >
          <X className="h-4 w-4" />
        </Button>

        <DialogHeader className="text-center pt-4">
          <div className={`mx-auto p-4 rounded-full bg-gradient-to-br ${config.gradient} mb-4`}>
            <Icon className={`h-10 w-10 ${config.color}`} />
          </div>
          <DialogTitle className="text-2xl flex items-center justify-center gap-2">
            <PartyPopper className="h-5 w-5 text-amber-500" />
            {config.title}
            <PartyPopper className="h-5 w-5 text-amber-500 scale-x-[-1]" />
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 rounded-lg bg-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Scripts</span>
            <Badge variant="secondary">{stats?.totalScriptsCreated || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Time Saved</span>
            <Badge variant="secondary">{stats?.totalTimeSavedHours || 0}h</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Value Created</span>
            <Badge variant="secondary" className="text-green-600 dark:text-green-400">
              ${stats?.totalValueCreated || 0}
            </Badge>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-sm">Unlock Your Full Potential</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Upgrade to Pro and get AI-powered automation, 3x more scripts per month, 
            and save {stats?.roiMultiplier || 10}x more time. Use code <strong>FREE30</strong> for 30 days free!
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col pt-2">
          <Button 
            className="w-full" 
            onClick={handleUpgrade}
            data-testid="button-upgrade-modal"
          >
            <Crown className="h-4 w-4 mr-2" />
            Try Pro Free for 30 Days
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground"
            onClick={handleClose}
            data-testid="button-maybe-later"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useProNudgeOnSave() {
  const { user } = useAuth();
  const [showNudge, setShowNudge] = useState(false);

  const trackAndShowNudge = useMutation({
    mutationFn: async (timeSavedMinutes: number = 60) => {
      await apiRequest("/api/user/track-script", "POST", { timeSavedMinutes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/milestones/unshown"] });
      if (user?.role === "free") {
        setShowNudge(true);
      }
    },
  });

  return {
    trackScript: trackAndShowNudge.mutate,
    isTracking: trackAndShowNudge.isPending,
    showNudge,
    setShowNudge,
    ProNudgeModal: showNudge ? (
      <ProNudgeModal onClose={() => setShowNudge(false)} />
    ) : null,
  };
}
