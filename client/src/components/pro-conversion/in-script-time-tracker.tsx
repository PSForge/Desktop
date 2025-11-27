import { useState, useEffect, useRef } from "react";
import { Clock, Play, Pause, CheckCircle, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

interface InScriptTimeTrackerProps {
  isActive?: boolean;
  onTimeUpdate?: (elapsedSeconds: number) => void;
  estimatedManualMinutes?: number;
  showProTip?: boolean;
}

export function InScriptTimeTracker({
  isActive = true,
  onTimeUpdate,
  estimatedManualMinutes = 30,
  showProTip = true,
}: InScriptTimeTrackerProps) {
  const { user } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        const newElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(newElapsed);
        onTimeUpdate?.(newElapsed);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, onTimeUpdate]);

  const togglePause = () => {
    if (isPaused) {
      startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    }
    setIsPaused(!isPaused);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const elapsedMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
  const timeSavedMinutes = Math.max(0, estimatedManualMinutes - elapsedMinutes);
  const savingsPercentage = Math.round((timeSavedMinutes / estimatedManualMinutes) * 100);

  const getProTimeSaved = () => {
    return Math.round(estimatedManualMinutes * 0.7);
  };

  if (!isActive) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t"
      data-testid="time-tracker-footer"
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={togglePause}
                data-testid="button-toggle-timer"
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-medium" data-testid="text-elapsed-time">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                <span className="font-medium text-green-600 dark:text-green-400">
                  ~{timeSavedMinutes} min
                </span>
                <span className="text-muted-foreground ml-1">saved vs manual</span>
              </span>
              <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                {savingsPercentage}% faster
              </Badge>
            </div>
          </div>

          {showProTip && user?.role === "free" && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm">
                <span className="font-medium">Pro users</span>
                <span className="text-muted-foreground"> save </span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {getProTimeSaved()} more min
                </span>
                <span className="text-muted-foreground"> with AI</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function useTimeTracker() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  const startTracking = () => {
    setElapsedSeconds(0);
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
    return elapsedSeconds;
  };

  const getElapsedMinutes = () => Math.ceil(elapsedSeconds / 60);

  return {
    elapsedSeconds,
    isTracking,
    startTracking,
    stopTracking,
    getElapsedMinutes,
    TimeTracker: isTracking ? (
      <InScriptTimeTracker
        isActive={isTracking}
        onTimeUpdate={setElapsedSeconds}
      />
    ) : null,
  };
}
