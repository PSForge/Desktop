import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoFullTransparent from "@assets/Full Logo Transparent_1761567685412.png";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Policy - PSForge</title>
        <meta name="description" content="PSForge Privacy Policy. Learn how we collect, use, and protect your personal information." />
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <img 
                src={logoFullTransparent} 
                alt="PSForge Logo" 
                className="h-8 cursor-pointer"
                data-testid="img-logo"
              />
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: December 2025
          </p>

          <Card className="mb-8">
            <CardContent className="pt-6 prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
                <p className="text-muted-foreground mb-4">
                  PSForge ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web-based PowerShell script building service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
                <h3 className="text-lg font-medium text-foreground mb-2">Account Information</h3>
                <p className="text-muted-foreground mb-4">
                  When you create an account, we collect your email address and password (securely hashed). If you subscribe to Pro, we collect payment information through Stripe—we never store your credit card details directly.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2">Usage Data</h3>
                <p className="text-muted-foreground mb-4">
                  We collect information about how you use PSForge, including scripts you create, features you use, and time spent in the application. This helps us improve the product and provide usage analytics in your account dashboard.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2">Script Content</h3>
                <p className="text-muted-foreground mb-4">
                  Scripts you save to your account are stored securely on our servers. Scripts you export without saving are not retained. We do not access or analyze the content of your scripts except for security scanning.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>To provide, maintain, and improve PSForge services</li>
                  <li>To process your subscription and payments</li>
                  <li>To send transactional emails (password resets, support responses)</li>
                  <li>To detect and prevent security threats or fraud</li>
                  <li>To analyze usage patterns and improve user experience</li>
                  <li>To respond to your support requests</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">4. Data Sharing</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell your personal information. We may share data with:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Stripe:</strong> For payment processing</li>
                  <li><strong>GitHub:</strong> Only if you connect your GitHub account for Git integration</li>
                  <li><strong>OpenAI:</strong> Script content may be sent to OpenAI for AI Assistant features (Pro users only)</li>
                  <li><strong>Service Providers:</strong> Hosting and infrastructure partners under strict data protection agreements</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement industry-standard security measures including:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Password hashing using bcrypt</li>
                  <li>HTTPS encryption for all data transmission</li>
                  <li>Session-based authentication with secure cookies</li>
                  <li>Regular security audits and updates</li>
                  <li>Malicious code scanning for all scripts</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Data Retention</h2>
                <p className="text-muted-foreground mb-4">
                  We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law or for legitimate business purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">7. Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Delete your account and associated data</li>
                  <li>Export your saved scripts</li>
                  <li>Opt out of marketing communications</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">8. Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  We use essential cookies for session management and authentication. We may use analytics cookies (like Google Analytics) to understand how users interact with PSForge. You can control cookie preferences through your browser settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">9. Children's Privacy</h2>
                <p className="text-muted-foreground mb-4">
                  PSForge is not intended for users under 16 years of age. We do not knowingly collect personal information from children.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">10. Changes to This Policy</h2>
                <p className="text-muted-foreground mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">11. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions about this Privacy Policy or your data, please contact us through the support form in your account settings.
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
              <Link href="/terms">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Terms</span>
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
