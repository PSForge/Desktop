import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, Save } from "lucide-react";
import type { PlatformNotification } from "@shared/schema";
import { format } from "date-fns";

export function AdminNotificationsSection() {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  const { data: notifications = [], isLoading } = useQuery<PlatformNotification[]>({
    queryKey: ["/api/admin/notifications"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { message: string; enabled: boolean }) => {
      const response = await apiRequest("/api/admin/notifications", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/active"] });
      setNewMessage("");
      setNewEnabled(true);
      toast({
        title: "Notification created",
        description: "Platform notification has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create notification",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlatformNotification> }) => {
      const response = await apiRequest(`/api/admin/notifications/${id}`, "PATCH", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/active"] });
      toast({
        title: "Notification updated",
        description: "Platform notification has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/admin/notifications/${id}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/active"] });
      toast({
        title: "Notification deleted",
        description: "Platform notification has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newMessage.trim()) {
      toast({
        title: "Validation error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({ message: newMessage, enabled: newEnabled });
  };

  const handleToggle = (id: string, enabled: boolean) => {
    updateMutation.mutate({ id, updates: { enabled } });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this notification?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <Card data-testid="card-create-notification">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Create Platform Notification
          </CardTitle>
          <CardDescription>
            Display an announcement banner at the top of the homepage for all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-message">Message</Label>
            <Input
              id="notification-message"
              placeholder="e.g., New features added: Script Wizard now supports bulk CSV operations!"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              data-testid="input-notification-message"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="notification-enabled"
              checked={newEnabled}
              onCheckedChange={setNewEnabled}
              data-testid="switch-notification-enabled"
            />
            <Label htmlFor="notification-enabled">Enable immediately</Label>
          </div>

          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            data-testid="button-create-notification"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createMutation.isPending ? "Creating..." : "Create Notification"}
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-notifications-list">
        <CardHeader>
          <CardTitle>Existing Notifications</CardTitle>
          <CardDescription>
            Manage platform-wide notification banners
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notifications created yet
            </p>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-medium break-words" data-testid={`text-notification-${notification.id}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created {format(new Date(notification.createdAt), "MMM d, yyyy")}</span>
                      {notification.updatedAt !== notification.createdAt && (
                        <span>Updated {format(new Date(notification.updatedAt), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={notification.enabled}
                        onCheckedChange={(checked) => handleToggle(notification.id, checked)}
                        disabled={updateMutation.isPending}
                        data-testid={`switch-notification-${notification.id}`}
                      />
                      <Label className="text-xs">
                        {notification.enabled ? "Active" : "Inactive"}
                      </Label>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(notification.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${notification.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
