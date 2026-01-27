import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  Check,
  Crown,
  Zap,
  Bot,
  Shield,
  Rocket,
  Tag,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const LOGIN_PROMPT_KEY = "psforge_login_prompt_shown";

export function LoginProPrompt() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  useEffect(() => {
    if (isLoading) return;
    
    const shouldShow = sessionStorage.getItem(LOGIN_PROMPT_KEY);
    
    if (shouldShow === "pending" && user && user.role === "free") {
      setIsOpen(true);
      sessionStorage.removeItem(LOGIN_PROMPT_KEY);
    }
  }, [user, isLoading]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/billing/checkout", "POST", {
        promoCode: promoCode.trim() || undefined
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      setIsCheckoutLoading(false);
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = () => {
    setIsCheckoutLoading(true);
    checkoutMutation.mutate();
  };

  const handleAcknowledge = () => {
    setIsOpen(false);
  };

  if (!user || user.role !== "free") {
    return null;
  }

  const proFeatures = [
    {
      icon: Bot,
      title: "AI-Powered Assistant",
      description: "Natural language PowerShell generation and optimization"
    },
    {
      icon: Rocket,
      title: "48 Platform Categories",
      description: "Azure, AWS, Office 365, Exchange, Intune, and 43 more"
    },
    {
      icon: Zap,
      title: "2,400+ Automation Tasks",
      description: "Pre-built tasks for enterprise IT automation"
    },
    {
      icon: Shield,
      title: "Advanced Script Security",
      description: "Full security scanning and compliance analysis"
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleAcknowledge}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="modal-login-pro-prompt">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Crown className="h-10 w-10 text-amber-500" />
          </div>
          <DialogTitle className="text-2xl flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Unlock Your Full Potential with Pro
            <Sparkles className="h-5 w-5 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-base">
            You're currently on the Free tier. Upgrade to Pro and supercharge your PowerShell automation!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-bold">$5</span>
            <div className="text-left">
              <span className="text-muted-foreground text-lg">/month</span>
              <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                Best Value
              </Badge>
            </div>
          </div>

          <div className="grid gap-4">
            {proFeatures.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover-elevate"
              >
                <div className="p-2 rounded-md bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Check className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">What You Get with Pro:</span>
            </div>
            <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                Unlimited script exports
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                AI script optimization
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                Advanced GUI builder
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                Script Wizard access
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                All template categories
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-promo-code" className="flex items-center gap-2 text-sm">
              <Tag className="h-3.5 w-3.5" />
              Promo Code (Optional)
            </Label>
            <Input
              id="login-promo-code"
              type="text"
              placeholder="Enter promo code for discounts"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              disabled={isCheckoutLoading}
              data-testid="input-login-promo-code"
              className="uppercase"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleUpgrade}
            disabled={isCheckoutLoading}
            data-testid="button-upgrade-pro"
          >
            <Crown className="h-4 w-4 mr-2" />
            {isCheckoutLoading ? "Redirecting to Checkout..." : "Upgrade to Pro - $5/month"}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground"
            onClick={handleAcknowledge}
            disabled={isCheckoutLoading}
            data-testid="button-continue-free"
          >
            Continue with Free Tier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function triggerLoginProPrompt() {
  sessionStorage.setItem(LOGIN_PROMPT_KEY, "pending");
}
