import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle } from "lucide-react";
import logoImage from "@assets/Full Logo Transparent_1761559782392.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
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
          <h1 className="text-2xl font-bold text-center">Reset Your Password</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Forgot Password?
            </CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {!emailSent ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@psforge.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll send you a password reset link to this email address
                  </p>
                </div>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Check Your Email</strong>
                    <br />
                    <p className="mt-2">
                      If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      The link will expire in 1 hour. Check your spam folder if you don't see it in your inbox.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {!emailSent ? (
                <>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    data-testid="button-send-reset-link"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <div className="text-sm text-center text-muted-foreground">
                    Remember your password?{" "}
                    <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                      Log in
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full" 
                    onClick={() => {
                      setEmailSent(false);
                      setEmail("");
                    }}
                    data-testid="button-try-another-email"
                  >
                    Try Another Email
                  </Button>
                  <div className="text-sm text-center text-muted-foreground">
                    <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                      Back to Login
                    </Link>
                  </div>
                </>
              )}
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
