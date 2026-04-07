import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { MonitorSmartphone, ShieldCheck } from "lucide-react";

export default function DesktopConnect() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [status, setStatus] = useState<"idle" | "approving" | "approved" | "error">("idle");
  const [message, setMessage] = useState("Approve this sign-in to connect PSForge Desktop to your account.");

  const params = new URLSearchParams(window.location.search);
  const userCode = params.get("user_code") || "";
  const redirectToLogin = `/login?redirect=${encodeURIComponent(`/desktop-connect?user_code=${encodeURIComponent(userCode)}`)}`;

  useEffect(() => {
    if (!isAuthenticated || !userCode || status === "approved" || status === "approving") {
      return;
    }

    setStatus("approving");
    apiRequest("/api/desktop-auth/approve", "POST", { userCode })
      .then(() => {
        setStatus("approved");
        setMessage("Your desktop app is approved. You can return to PSForge Desktop now.");
      })
      .catch((error: any) => {
        setStatus("error");
        setMessage(error.message || "We couldn't approve this desktop sign-in.");
      });
  }, [isAuthenticated, status, userCode]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <MonitorSmartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Connect PSForge Desktop</CardTitle>
              <CardDescription>Use your existing web account to sign in on Windows.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="text-sm text-muted-foreground mb-2">Desktop code</div>
            <div className="text-2xl font-semibold tracking-[0.2em]">{userCode || "Missing code"}</div>
          </div>

          <div className="rounded-lg border p-4 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          {!userCode && (
            <p className="text-sm text-destructive">This desktop sign-in link is missing its verification code.</p>
          )}

          {!isLoading && !isAuthenticated && userCode && (
            <Button asChild className="w-full" data-testid="button-desktop-connect-login">
              <Link href={redirectToLogin}>Sign in to approve</Link>
            </Button>
          )}

          {isAuthenticated && status === "approved" && (
            <Button asChild className="w-full" data-testid="button-desktop-connect-return-home">
              <Link href="/builder">Open PSForge</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
