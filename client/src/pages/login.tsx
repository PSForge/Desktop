import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { MonitorSmartphone } from "lucide-react";
import logoImage from "@assets/psforge-full-logo-transparent.png";
import { triggerLoginProPrompt } from "@/components/login-pro-prompt";
import { isDesktopApp } from "@/lib/desktop";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const redirectPath = new URLSearchParams(window.location.search).get("redirect") || "/builder";
  const desktopMode = isDesktopApp();

  if (isAuthenticated) {
    navigate(redirectPath);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      triggerLoginProPrompt();
      navigate(redirectPath);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Link href="/">
            <img 
              src={logoImage} 
              alt="PSForge Logo" 
              className="h-16 w-auto cursor-pointer"
            />
          </Link>
          <h1 className="text-2xl font-bold text-center">Welcome Back</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Log in to PSForge</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          {desktopMode && (
            <div className="px-6 pb-2">
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MonitorSmartphone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium">Desktop sign-in moved into the workspace</div>
                    <p className="text-sm text-muted-foreground">
                      Open the desktop workspace and use the License card there to connect your account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@psforge.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Logging in..." : "Log In"}
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:underline" data-testid="link-home">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
