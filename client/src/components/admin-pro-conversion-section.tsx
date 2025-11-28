import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  TrendingUp, 
  Users, 
  Award, 
  Target,
  Clock,
  Trophy,
  ArrowRight,
  Sparkles,
  Settings,
  Save
} from "lucide-react";

interface ProConversionAnalytics {
  badgeDistribution: Array<{ badge: string; count: number }>;
  milestoneStats: Array<{ milestone: string; usersAchieved: number; usersConverted: number }>;
  conversionFunnel: {
    totalFreeUsers: number;
    usersWithMilestones: number;
    usersConverted: number;
    conversionRate: number;
  };
  topScriptCreators: Array<{ 
    userId: string; 
    email: string; 
    scriptsCreated: number; 
    timeSaved: number; 
    badge: string | null 
  }>;
}

const BADGE_LABELS: Record<string, { label: string; color: string }> = {
  none: { label: "No Badge", color: "secondary" },
  new_member: { label: "Newcomer", color: "secondary" },
  active_contributor: { label: "Builder", color: "default" },
  top_contributor: { label: "Craftsman", color: "default" },
  verified_pro: { label: "Expert", color: "default" },
  pro_contributor: { label: "Master", color: "default" },
  featured_expert: { label: "Featured Expert", color: "default" },
  pro_founder: { label: "Pro Founder", color: "default" },
};

const MILESTONE_LABELS: Record<string, string> = {
  scripts_created_5: "5 Scripts",
  scripts_created_10: "10 Scripts",
  scripts_created_25: "25 Scripts",
  scripts_created_50: "50 Scripts",
  time_saved_5_hours: "5 Hours Saved",
  time_saved_10_hours: "10 Hours Saved",
  time_saved_20_hours: "20 Hours Saved",
  first_marketplace_template: "First Template",
  active_7_days: "7 Days Active",
  active_30_days: "30 Days Active",
};

export function AdminProConversionSection() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [scriptsCreated, setScriptsCreated] = useState<string>("");
  const [timeSavedMinutes, setTimeSavedMinutes] = useState<string>("");
  const { toast } = useToast();

  const { data: analytics, isLoading } = useQuery<ProConversionAnalytics>({
    queryKey: ["/api/admin/pro-conversion-analytics"],
  });

  const adjustStatsMutation = useMutation({
    mutationFn: async (data: { userId: string; scriptsCreated: number; timeSavedMinutes: number }) => {
      const response = await apiRequest(`/api/admin/users/${data.userId}/stats-adjust`, "POST", {
        scriptsCreated: data.scriptsCreated,
        timeSavedMinutes: data.timeSavedMinutes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stats Updated",
        description: "User analytics have been successfully adjusted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pro-conversion-analytics"] });
      setSelectedUser(null);
      setScriptsCreated("");
      setTimeSavedMinutes("");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to adjust user stats",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pro Conversion Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  const { badgeDistribution, milestoneStats, conversionFunnel, topScriptCreators } = analytics;
  const totalUsersWithBadges = badgeDistribution.reduce((sum, b) => sum + b.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Pro Conversion Analytics
        </CardTitle>
        <CardDescription>
          Track user engagement, badge distribution, milestone achievements, and conversion metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Conversion Funnel */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Conversion Funnel
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-3xl font-bold" data-testid="text-free-users">
                      {conversionFunnel.totalFreeUsers}
                    </div>
                    <p className="text-sm text-muted-foreground">Free Users</p>
                  </div>
                </CardContent>
              </Card>
              <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
            </div>
            
            <div className="relative">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Award className="h-8 w-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
                    <div className="text-3xl font-bold" data-testid="text-users-milestones">
                      {conversionFunnel.usersWithMilestones}
                    </div>
                    <p className="text-sm text-muted-foreground">With Milestones</p>
                  </div>
                </CardContent>
              </Card>
              <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
            </div>
            
            <div className="relative">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-3xl font-bold" data-testid="text-users-converted">
                      {conversionFunnel.usersConverted}
                    </div>
                    <p className="text-sm text-muted-foreground">Converted to Pro</p>
                  </div>
                </CardContent>
              </Card>
              <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
            </div>
            
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-3xl font-bold text-primary" data-testid="text-conversion-rate">
                    {conversionFunnel.conversionRate}%
                  </div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Badge Distribution */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            Badge Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badgeDistribution.map((item) => {
              const badgeInfo = BADGE_LABELS[item.badge] || { label: item.badge, color: "secondary" };
              const percentage = totalUsersWithBadges > 0 
                ? Math.round((item.count / totalUsersWithBadges) * 100) 
                : 0;
              
              return (
                <Card key={item.badge} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={badgeInfo.color as any} className="text-xs">
                        {badgeInfo.label}
                      </Badge>
                      <span className="text-2xl font-bold" data-testid={`text-badge-count-${item.badge}`}>
                        {item.count}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{percentage}% of users</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Milestone Stats */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
            Milestone Achievements
          </h3>
          {milestoneStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No milestone data yet</p>
          ) : (
            <div className="space-y-3">
              {milestoneStats.map((stat) => {
                const label = MILESTONE_LABELS[stat.milestone] || stat.milestone;
                const conversionRate = stat.usersAchieved > 0 
                  ? Math.round((stat.usersConverted / stat.usersAchieved) * 100) 
                  : 0;
                
                return (
                  <div 
                    key={stat.milestone} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                    data-testid={`milestone-row-${stat.milestone}`}
                  >
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.usersAchieved} users achieved
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {stat.usersConverted} converted
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {conversionRate}% conversion
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Script Creators */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Top Script Creators
          </h3>
          {topScriptCreators.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No script creation data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Rank</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Badge</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Scripts</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Time Saved</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topScriptCreators.map((creator, index) => {
                    const badgeInfo = creator.badge 
                      ? BADGE_LABELS[creator.badge] || { label: creator.badge, color: "secondary" }
                      : null;
                    const timeSavedHours = Math.round(creator.timeSaved / 60 * 10) / 10;
                    const isEditing = selectedUser === creator.userId;
                    
                    return (
                      <tr 
                        key={creator.userId} 
                        className="border-b last:border-0"
                        data-testid={`creator-row-${index}`}
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-medium truncate max-w-[200px] block">
                            {creator.email}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {badgeInfo ? (
                            <Badge variant={badgeInfo.color as any} className="text-xs">
                              {badgeInfo.label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-bold">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={scriptsCreated}
                              onChange={(e) => setScriptsCreated(e.target.value)}
                              className="w-20 h-8 text-right"
                              min="0"
                              data-testid={`input-scripts-${index}`}
                            />
                          ) : (
                            creator.scriptsCreated
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={timeSavedMinutes}
                              onChange={(e) => setTimeSavedMinutes(e.target.value)}
                              className="w-24 h-8 text-right"
                              min="0"
                              placeholder="minutes"
                              data-testid={`input-time-${index}`}
                            />
                          ) : (
                            <div className="flex items-center justify-end gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{timeSavedHours}h</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedUser(null);
                                  setScriptsCreated("");
                                  setTimeSavedMinutes("");
                                }}
                                data-testid={`button-cancel-${index}`}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  adjustStatsMutation.mutate({
                                    userId: creator.userId,
                                    scriptsCreated: parseInt(scriptsCreated) || 0,
                                    timeSavedMinutes: parseInt(timeSavedMinutes) || 0,
                                  });
                                }}
                                disabled={adjustStatsMutation.isPending}
                                data-testid={`button-save-${index}`}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(creator.userId);
                                setScriptsCreated(String(creator.scriptsCreated));
                                setTimeSavedMinutes(String(creator.timeSaved));
                              }}
                              data-testid={`button-edit-${index}`}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Manual Stats Adjustment */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Backdate User Stats
          </h3>
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Use this form to manually adjust user statistics for backdating purposes. 
                Enter a user email to search, then set their script count and time saved.
              </p>
              <BackdateUserStatsForm 
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/pro-conversion-analytics"] });
                }}
              />
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function BackdateUserStatsForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [scriptsCount, setScriptsCount] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const { toast } = useToast();

  const { data: users } = useQuery<Array<{ id: string; email: string; name: string }>>({
    queryKey: ["/api/admin/users"],
  });

  const matchingUser = users?.find(u => u.email.toLowerCase() === email.toLowerCase());

  const adjustMutation = useMutation({
    mutationFn: async (data: { userId: string; scriptsCreated: number; timeSavedMinutes: number }) => {
      const response = await apiRequest(`/api/admin/users/${data.userId}/stats-adjust`, "POST", {
        scriptsCreated: data.scriptsCreated,
        timeSavedMinutes: data.timeSavedMinutes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stats Updated",
        description: `Successfully updated stats for ${email}`,
      });
      setEmail("");
      setUserId(null);
      setScriptsCount("");
      setTimeMinutes("");
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to adjust user stats",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!matchingUser) {
      toast({
        title: "User Not Found",
        description: "Please enter a valid user email",
        variant: "destructive",
      });
      return;
    }

    const scripts = parseInt(scriptsCount) || 0;
    const minutes = parseInt(timeMinutes) || 0;

    if (scripts < 0 || minutes < 0) {
      toast({
        title: "Invalid Values",
        description: "Values cannot be negative",
        variant: "destructive",
      });
      return;
    }

    adjustMutation.mutate({
      userId: matchingUser.id,
      scriptsCreated: scripts,
      timeSavedMinutes: minutes,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="user-email">User Email</Label>
          <Input
            id="user-email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="input-backdate-email"
          />
          {email && (
            <p className={`text-xs ${matchingUser ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              {matchingUser ? `Found: ${matchingUser.name}` : 'User not found'}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="scripts-count">Scripts Created</Label>
            <Input
              id="scripts-count"
              type="number"
              placeholder="0"
              min="0"
              value={scriptsCount}
              onChange={(e) => setScriptsCount(e.target.value)}
              data-testid="input-backdate-scripts"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-minutes">Time Saved (min)</Label>
            <Input
              id="time-minutes"
              type="number"
              placeholder="0"
              min="0"
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(e.target.value)}
              data-testid="input-backdate-time"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!matchingUser || adjustMutation.isPending}
          data-testid="button-backdate-submit"
        >
          <Save className="h-4 w-4 mr-2" />
          {adjustMutation.isPending ? "Updating..." : "Update Stats"}
        </Button>
      </div>
    </div>
  );
}
