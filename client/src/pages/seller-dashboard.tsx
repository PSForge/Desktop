import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { format } from "date-fns";
import { 
  DollarSign, 
  Wallet,
  CreditCard, 
  Package, 
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Store,
  FileText,
  BarChart3,
  ExternalLink,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface Sale {
  id: string;
  templateId: string;
  templateTitle?: string;
  buyerName?: string;
  priceCents: number;
  platformFeeCents: number;
  sellerEarningsCents: number;
  status: string;
  purchasedAt: string;
}

interface Payout {
  id: string;
  amountCents: number;
  status: string;
  stripePayoutId?: string;
  createdAt: string;
  completedAt?: string;
}

interface EarningsData {
  totalEarnings: number;
  pendingBalance: number;
  paidOut: number;
  totalSales: number;
  sales: Sale[];
  payouts: Payout[];
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Check seller status
  const { data: sellerStatus, isLoading: sellerStatusLoading } = useQuery<{
    hasAccount: boolean;
    onboardingComplete: boolean;
  }>({
    queryKey: ["/api/seller/connect/status"],
    enabled: !!user && (user.role === "subscriber" || user.role === "admin"),
  });

  // Fetch earnings data
  const { data: earnings, isLoading: earningsLoading } = useQuery<EarningsData>({
    queryKey: ["/api/seller/earnings"],
    enabled: !!sellerStatus?.onboardingComplete,
  });

  // Format currency
  const formatCurrency = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Redirect if not a Pro user
  if (!user || user.role === "free") {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Sparkles className="h-16 w-16 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pro Subscription Required</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                Upgrade to Pro to become a seller and earn money from your PowerShell templates.
              </p>
              <Button onClick={() => setLocation("/account")} data-testid="button-upgrade">
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Redirect if seller account not set up
  if (!sellerStatusLoading && !sellerStatus?.onboardingComplete) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/account")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Button>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Store className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Complete Seller Setup</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                You need to complete your Stripe Connect onboarding before you can access the seller dashboard.
              </p>
              <Button onClick={() => setLocation("/account")} data-testid="button-setup">
                <ArrowRight className="h-4 w-4 mr-2" />
                Complete Setup in Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header onExport={() => {}} hasCommands={false} />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/account")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Account
        </Button>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid="page-title">Seller Dashboard</h1>
              <p className="text-muted-foreground">Track your earnings and manage your template sales</p>
            </div>
          </div>
          
          <Badge variant="default" className="gap-1 mt-2">
            <CheckCircle2 className="h-3 w-3" />
            Active Seller
          </Badge>
        </div>

        {earningsLoading || sellerStatusLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-28" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card data-testid="card-total-earnings">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Total Earnings</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ${formatCurrency(earnings?.totalEarnings || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime earnings from template sales
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-pending-balance">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Wallet className="h-4 w-4" />
                    <span>Pending Balance</span>
                  </div>
                  <p className="text-3xl font-bold">
                    ${formatCurrency(earnings?.pendingBalance || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available for payout
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-paid-out">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Paid Out</span>
                  </div>
                  <p className="text-3xl font-bold">
                    ${formatCurrency(earnings?.paidOut || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Successfully transferred
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-sales">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Package className="h-4 w-4" />
                    <span>Total Sales</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {earnings?.totalSales || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Templates sold
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Sales History and Payouts */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview" data-testid="tab-overview">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="sales" data-testid="tab-sales">
                  <FileText className="h-4 w-4 mr-2" />
                  Sales History
                </TabsTrigger>
                <TabsTrigger value="payouts" data-testid="tab-payouts">
                  <Wallet className="h-4 w-4 mr-2" />
                  Payouts
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Sales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Recent Sales
                      </CardTitle>
                      <CardDescription>Your last 5 template sales</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {earnings?.sales && earnings.sales.length > 0 ? (
                        <div className="space-y-4">
                          {earnings.sales.slice(0, 5).map((sale) => (
                            <div 
                              key={sale.id} 
                              className="flex items-center justify-between py-2 border-b last:border-0"
                              data-testid={`recent-sale-${sale.id}`}
                            >
                              <div>
                                <p className="font-medium text-sm">{sale.templateTitle || "Template"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {sale.buyerName || "Customer"} • {format(new Date(sale.purchasedAt), "MMM d, yyyy")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-green-600 dark:text-green-400">
                                  +${formatCurrency(sale.sellerEarningsCents)}
                                </p>
                                {getStatusBadge(sale.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No sales yet</p>
                          <p className="text-sm">Publish a paid template to start earning!</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Earnings Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Earnings Breakdown
                      </CardTitle>
                      <CardDescription>How your earnings are calculated</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <h4 className="font-medium mb-3">Revenue Split</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Your Earnings</span>
                            <span className="font-medium text-green-600 dark:text-green-400">70%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Platform Fee</span>
                            <span className="font-medium text-orange-600 dark:text-orange-400">30%</span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Revenue</span>
                          <span className="font-medium">
                            ${formatCurrency((earnings?.totalEarnings || 0) / 0.7)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Platform Fees</span>
                          <span className="font-medium text-orange-600">
                            -${formatCurrency(((earnings?.totalEarnings || 0) / 0.7) - (earnings?.totalEarnings || 0))}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Your Earnings</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            ${formatCurrency(earnings?.totalEarnings || 0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Sales History Tab */}
              <TabsContent value="sales">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales History</CardTitle>
                    <CardDescription>All your template sales</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {earnings?.sales && earnings.sales.length > 0 ? (
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Template</TableHead>
                              <TableHead>Buyer</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Sale Price</TableHead>
                              <TableHead className="text-right">Your Earnings</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {earnings.sales.map((sale) => (
                              <TableRow key={sale.id} data-testid={`sale-row-${sale.id}`}>
                                <TableCell className="font-medium">
                                  {sale.templateTitle || "Template"}
                                </TableCell>
                                <TableCell>{sale.buyerName || "Customer"}</TableCell>
                                <TableCell>
                                  {format(new Date(sale.purchasedAt), "MMM d, yyyy HH:mm")}
                                </TableCell>
                                <TableCell className="text-right">
                                  ${formatCurrency(sale.priceCents)}
                                </TableCell>
                                <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                                  ${formatCurrency(sale.sellerEarningsCents)}
                                </TableCell>
                                <TableCell>{getStatusBadge(sale.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="font-medium mb-1">No Sales Yet</h3>
                        <p className="text-sm">When customers purchase your templates, they'll appear here.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payouts Tab */}
              <TabsContent value="payouts">
                <Card>
                  <CardHeader>
                    <CardTitle>Payout History</CardTitle>
                    <CardDescription>Your earnings transfers to your bank account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6 p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Available for Payout</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            ${formatCurrency(earnings?.pendingBalance || 0)}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Payouts are processed automatically</p>
                          <p>by Stripe to your connected bank</p>
                        </div>
                      </div>
                    </div>

                    {earnings?.payouts && earnings.payouts.length > 0 ? (
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Completed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {earnings.payouts.map((payout) => (
                              <TableRow key={payout.id} data-testid={`payout-row-${payout.id}`}>
                                <TableCell>
                                  {format(new Date(payout.createdAt), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="font-medium">
                                  ${formatCurrency(payout.amountCents)}
                                </TableCell>
                                <TableCell>{getStatusBadge(payout.status)}</TableCell>
                                <TableCell>
                                  {payout.completedAt 
                                    ? format(new Date(payout.completedAt), "MMM d, yyyy")
                                    : "-"
                                  }
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Wallet className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="font-medium mb-1">No Payouts Yet</h3>
                        <p className="text-sm">Payouts will be processed automatically when you have available earnings.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/library")}
                  data-testid="button-publish-template"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Publish a Template
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/marketplace?tab=my-published")}
                  data-testid="button-my-templates"
                >
                  <Package className="h-4 w-4 mr-2" />
                  My Published Templates
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("https://dashboard.stripe.com/", "_blank")}
                  data-testid="button-stripe-dashboard"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Stripe Dashboard
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
