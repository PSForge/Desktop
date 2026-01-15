import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie, X } from "lucide-react";
import { Link } from "wouter";

declare global {
  interface Window {
    uetq: any[];
    gtag: (...args: any[]) => void;
  }
}

const CONSENT_KEY = "cookie_consent";

type ConsentStatus = "granted" | "denied" | null;

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<ConsentStatus>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "granted" || stored === "denied") {
      setConsent(stored);
      if (stored === "granted") {
        updateConsent("granted");
      }
    } else {
      setVisible(true);
    }
  }, []);

  const updateConsent = (status: "granted" | "denied") => {
    if (typeof window !== "undefined") {
      window.uetq = window.uetq || [];
      window.uetq.push("consent", "update", {
        ad_storage: status,
      });

      if (window.gtag) {
        window.gtag("consent", "update", {
          ad_storage: status,
          analytics_storage: status,
        });
      }
    }
  };

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "granted");
    setConsent("granted");
    updateConsent("granted");
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "denied");
    setConsent("denied");
    updateConsent("denied");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6" data-testid="cookie-consent-banner">
      <Card className="mx-auto max-w-4xl p-4 md:p-6 shadow-lg border bg-card">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">We use cookies</p>
              <p className="text-sm text-muted-foreground">
                We use cookies and similar technologies to improve your experience, analyze traffic, and for advertising. 
                By clicking "Accept", you consent to our use of cookies. See our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>{" "}
                for more information.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="flex-1 md:flex-none"
              data-testid="button-cookie-decline"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 md:flex-none"
              data-testid="button-cookie-accept"
            >
              Accept
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
