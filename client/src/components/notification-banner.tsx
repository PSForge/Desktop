import { useState, useEffect } from "react";
import { X, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PlatformNotification } from "@shared/schema";

export function NotificationBanner() {
  const [dismissed, setDismissed] = useState<string | null>(null);

  const { data: notification } = useQuery<PlatformNotification | null>({
    queryKey: ["/api/notifications/active"],
  });

  useEffect(() => {
    const savedDismissed = localStorage.getItem("dismissed-notification");
    if (savedDismissed) {
      setDismissed(savedDismissed);
    }
  }, []);

  if (!notification || dismissed === notification.id) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(notification.id);
    localStorage.setItem("dismissed-notification", notification.id);
  };

  return (
    <div className="bg-primary text-primary-foreground border-b border-primary/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Bell className="h-5 w-5 flex-shrink-0" data-testid="icon-notification" />
            <p className="text-sm font-medium truncate" data-testid="text-notification-message">
              {notification.message}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 hover-elevate active-elevate-2 rounded-sm p-1 transition-colors"
            aria-label="Dismiss notification"
            data-testid="button-dismiss-notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
