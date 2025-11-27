import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Award, Star, Crown, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { UserStats, CommunityBadge } from "@shared/schema";

interface CommunityBadgeDisplayProps {
  badge?: CommunityBadge | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  showLabel?: boolean;
}

const badgeConfig: Record<string, {
  icon: typeof Award;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  new_member: {
    icon: Star,
    label: "New Member",
    description: "Just getting started with PSForge",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  active_contributor: {
    icon: Award,
    label: "Active Contributor",
    description: "Created 5+ scripts and actively using PSForge",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  top_contributor: {
    icon: Crown,
    label: "Top Contributor",
    description: "Power user with 20+ scripts created",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  pro_member: {
    icon: Sparkles,
    label: "Pro Member",
    description: "PSForge Pro subscriber with premium features",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  template_author: {
    icon: Users,
    label: "Template Author",
    description: "Published templates to the marketplace",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
};

export function CommunityBadgeDisplay({
  badge,
  size = "md",
  showTooltip = true,
  showLabel = false,
}: CommunityBadgeDisplayProps) {
  const { user } = useAuth();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user && !badge,
  });

  const currentBadge = badge || (user?.role === "subscriber" ? "pro_member" : stats?.communityBadge);

  if (!currentBadge) {
    return null;
  }

  const config = badgeConfig[currentBadge];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const containerSizes = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };

  const badgeContent = (
    <div 
      className={`inline-flex items-center gap-1.5 rounded-full ${config.bgColor} ${containerSizes[size]}`}
      data-testid={`badge-${currentBadge}`}
    >
      <Icon className={`${sizeClasses[size]} ${config.color}`} />
      {showLabel && (
        <span className={`text-xs font-medium ${config.color} pr-1`}>
          {config.label}
        </span>
      )}
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeContent}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-medium">{config.label}</div>
          <div className="text-xs text-muted-foreground">{config.description}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function CommunityBadgeProgress() {
  const { user } = useAuth();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  if (!stats || user?.role !== "free") {
    return null;
  }

  const currentBadge = stats.communityBadge || "new_member";
  const nextBadge = currentBadge === "new_member" 
    ? "active_contributor" 
    : currentBadge === "active_contributor" 
    ? "top_contributor" 
    : null;

  if (!nextBadge) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CommunityBadgeDisplay badge={currentBadge as CommunityBadge} size="sm" />
        <span>You've reached the highest free tier badge!</span>
      </div>
    );
  }

  const scriptsForNextBadge = nextBadge === "active_contributor" ? 5 : 20;
  const scriptsRemaining = Math.max(0, scriptsForNextBadge - stats.totalScriptsCreated);

  return (
    <div className="flex items-center gap-3">
      <CommunityBadgeDisplay badge={currentBadge as CommunityBadge} size="sm" />
      <div className="flex-1 text-sm">
        <span className="text-muted-foreground">
          {scriptsRemaining} more script{scriptsRemaining !== 1 ? "s" : ""} to{" "}
        </span>
        <span className="font-medium">{badgeConfig[nextBadge]?.label}</span>
      </div>
      <div className={`p-1 rounded-full ${badgeConfig[nextBadge]?.bgColor} opacity-50`}>
        {nextBadge === "active_contributor" && <Award className="h-4 w-4 text-muted-foreground" />}
        {nextBadge === "top_contributor" && <Crown className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );
}
