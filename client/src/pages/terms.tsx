import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Terms of Service - PSForge</title>
        <meta name="description" content="PSForge Terms of Service. Read our terms and conditions for using the PowerShell script builder platform." />
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <span className="text-xl font-bold text-primary cursor-pointer" data-testid="link-home">PSForge</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" data-testid="button-login">Login</Button>
              </Link>
              <Link href="/signup">
                <Button data-testid="button-signup">Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-page-title">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: December 2025
          </p>

          <Card className="mb-8">
            <CardContent className="pt-6 prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-4">
                  By accessing or using PSForge ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Description of Service</h2>
                <p className="text-muted-foreground mb-4">
                  PSForge is a web-based platform that allows users to create, edit, validate, and export PowerShell scripts. The Service includes a free tier with basic features and a paid Pro tier with advanced capabilities including AI-powered assistance.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">3. Account Registration</h2>
                <p className="text-muted-foreground mb-4">
                  To use certain features of PSForge, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your password</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">4. Subscription and Payments</h2>
                <h3 className="text-lg font-medium text-foreground mb-2">Free Tier</h3>
                <p className="text-muted-foreground mb-4">
                  The free tier provides access to basic script building features with limited automation tasks. Free accounts may be subject to usage limits.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2">Pro Subscription</h3>
                <p className="text-muted-foreground mb-4">
                  Pro subscriptions are billed monthly at the current rate (currently $5/month). Payments are processed through Stripe. You may cancel your subscription at any time; access will continue until the end of your billing period.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2">Promo Codes</h3>
                <p className="text-muted-foreground mb-4">
                  Promotional codes may be offered from time to time. Promo codes are subject to specific terms and expiration dates.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Acceptable Use</h2>
                <p className="text-muted-foreground mb-4">
                  You agree not to use PSForge to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Create scripts intended for malicious purposes</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Share your account credentials with others</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Intellectual Property</h2>
                <h3 className="text-lg font-medium text-foreground mb-2">Your Scripts</h3>
                <p className="text-muted-foreground mb-4">
                  You retain ownership of scripts you create using PSForge. By using the Service, you grant us a limited license to store, process, and display your scripts as necessary to provide the Service.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2">PSForge Content</h3>
                <p className="text-muted-foreground mb-4">
                  PSForge and its original content, features, and functionality are owned by us and are protected by copyright, trademark, and other intellectual property laws.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">7. Script Responsibility</h2>
                <p className="text-muted-foreground mb-4">
                  You are solely responsible for the scripts you create and how you use them. While PSForge includes security scanning features, you should always:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Review scripts before running them in production</li>
                  <li>Test scripts in a safe environment first</li>
                  <li>Maintain appropriate backups</li>
                  <li>Follow your organization's security policies</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">8. Disclaimer of Warranties</h2>
                <p className="text-muted-foreground mb-4">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. SCRIPTS GENERATED BY PSFORGE SHOULD BE TESTED BEFORE PRODUCTION USE.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
                <p className="text-muted-foreground mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, PSFORGE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, BUSINESS INTERRUPTION, OR SYSTEM DAMAGE RESULTING FROM YOUR USE OF SCRIPTS CREATED WITH THE SERVICE.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">10. Termination</h2>
                <p className="text-muted-foreground mb-4">
                  We may terminate or suspend your account at any time for violations of these Terms. You may delete your account at any time through your account settings. Upon termination, your right to use the Service will immediately cease.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">11. Changes to Terms</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page. Continued use of the Service after changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">12. Contact</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms, please contact us through the support form in your account settings.
                </p>
              </section>
            </CardContent>
          </Card>
        </article>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Back to Home
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/about">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">About</span>
              </Link>
              <Link href="/privacy">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Privacy</span>
              </Link>
              <Link href="/security">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Security</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
