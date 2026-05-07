import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy, CreditCard, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createDesktopBillingCheckout } from "@/lib/desktop-auth";
import { openExternalUrl, setDesktopStorageItem } from "@/lib/desktop";

export const DESKTOP_FREE_TRIAL_PROMO_CODE = "FREE30";
export const DESKTOP_POST_UPGRADE_CONTEXT_KEY = "psforge-desktop-post-upgrade-context";

type DesktopUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  title?: string;
  description?: string;
  previewTitle?: string;
  previewItems?: string[];
  highlights?: string[];
  ctaLabel?: string;
  contextLabel?: string;
};

const defaultHighlights = [
  "Secure Stripe-hosted checkout tied to your PSForge account",
  "Use promo code FREE30 at checkout for a 30-day Pro trial",
  "Cancel anytime and keep your desktop access synced with the web app",
];

export function DesktopUpgradeDialog({
  open,
  onOpenChange,
  feature,
  title,
  description,
  previewTitle = "What Pro unlocks next",
  previewItems = [],
  highlights = defaultHighlights,
  ctaLabel = "Start 30-day Pro trial",
  contextLabel,
}: DesktopUpgradeDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [promoCopied, setPromoCopied] = useState(false);

  const handleCopyPromoCode = async () => {
    try {
      await navigator.clipboard.writeText(DESKTOP_FREE_TRIAL_PROMO_CODE);
      setPromoCopied(true);
      window.setTimeout(() => setPromoCopied(false), 2000);
      toast({
        title: "Promo code copied",
        description: "Paste FREE30 into Stripe checkout to start the 30-day Pro trial.",
      });
    } catch (error: any) {
      toast({
        title: "Could not copy promo code",
        description: error?.message || "Please copy FREE30 manually at checkout.",
        variant: "destructive",
      });
    }
  };

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      setDesktopStorageItem(
        DESKTOP_POST_UPGRADE_CONTEXT_KEY,
        JSON.stringify({
          label: contextLabel || feature,
          startedAt: new Date().toISOString(),
        }),
      );

      const { url } = await createDesktopBillingCheckout();
      await openExternalUrl(url);
      toast({
        title: "Secure checkout opened",
        description: `Paste FREE30 into Stripe checkout to start the 30-day Pro trial for ${feature}.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Checkout unavailable",
        description: error?.message || "Could not open secure checkout for PSForge Pro.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>{title || `Unlock ${feature} with PSForge Pro`}</DialogTitle>
            <Badge variant="default">30-day trial</Badge>
          </div>
          <DialogDescription>
            {description || `PSForge Pro is the fastest way to finish ${feature.toLowerCase()} with AI, guided workflows, and premium automation packs.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <Tag className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">Use this promo code at checkout</div>
            <Badge variant="outline" className="font-mono">{DESKTOP_FREE_TRIAL_PROMO_CODE}</Badge>
            <div className="text-sm text-muted-foreground">Paste it into Stripe checkout to start Pro with a free 30-day trial.</div>
            <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={handleCopyPromoCode}>
              {promoCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {promoCopied ? "Copied" : "Copy code"}
            </Button>
          </div>

          {previewItems.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{previewTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {previewItems.map((item) => (
                  <div key={item} className="rounded-md border bg-background/60 px-3 py-2">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>
              Maybe later
            </Button>
          </DialogClose>
          <Button onClick={handleUpgrade} disabled={isLoading}>
            <CreditCard className="mr-2 h-4 w-4" />
            {isLoading ? "Opening secure checkout..." : ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
