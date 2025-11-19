import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");

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
      setIsLoading(false);
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = () => {
    setIsLoading(true);
    checkoutMutation.mutate();
  };

  const features = [
    "AI-powered PowerShell assistant with natural language processing",
    "Access to all 16 enterprise IT platform categories",
    "623 automation tasks across Azure, Office 365, Exchange, and more",
    "Advanced GUI builder with comprehensive task library",
    "Priority support and updates",
    "Unlimited script generation and export",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" data-testid="modal-upgrade">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl">Upgrade to PSForge Pro</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {feature 
              ? `Unlock ${feature} and all premium features for just $5/month`
              : "Unlock all premium features for just $5/month"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">$5</span>
            <span className="text-muted-foreground">/month</span>
            <Badge variant="secondary" className="ml-2">Best Value</Badge>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground">What's included:</p>
            {features.map((feat, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feat}</span>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-md p-4 space-y-2">
            <p className="text-sm font-medium">Free Tier Includes:</p>
            <p className="text-sm text-muted-foreground">
              Script Editor and 8 basic automation categories (File System, Network, Services, 
              Process Management, Event Logs, Active Directory, Registry, Security)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-code" className="flex items-center gap-2 text-sm">
              <Tag className="h-3.5 w-3.5" />
              Promo Code (Optional)
            </Label>
            <Input
              id="promo-code"
              type="text"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              data-testid="input-promo-code"
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Have a promo code for a free trial? Enter it above!
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            data-testid="button-cancel-upgrade"
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleUpgrade}
            disabled={isLoading}
            data-testid="button-confirm-upgrade"
          >
            {isLoading ? "Redirecting..." : "Upgrade Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
