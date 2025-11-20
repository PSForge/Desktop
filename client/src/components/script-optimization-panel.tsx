import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, AlertTriangle, ShieldCheck, Lightbulb, TrendingUp, Loader2, CheckCircle2, XCircle, Copy, Lock } from "lucide-react";

interface OptimizationRecommendation {
  type: 'performance' | 'security' | 'best-practice' | 'alternative';
  title: string;
  description: string;
  code?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
}

interface Alternative {
  title: string;
  description: string;
  code: string;
  approach: string;
}

interface OptimizationResult {
  performance: OptimizationRecommendation[];
  security: OptimizationRecommendation[];
  bestPractices: OptimizationRecommendation[];
  alternatives: Alternative[];
  summary: string;
}

interface ScriptOptimizationPanelProps {
  code: string;
  isSubscriber: boolean;
}

const getPriorityBadgeProps = (priority: 'critical' | 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'critical':
      return { variant: 'destructive' as const, className: '' };
    case 'high':
      return { variant: 'secondary' as const, className: 'text-orange-600 dark:text-orange-400' };
    case 'medium':
      return { variant: 'secondary' as const, className: 'text-yellow-600 dark:text-yellow-400' };
    case 'low':
      return { variant: 'secondary' as const, className: 'text-blue-600 dark:text-blue-400' };
  }
};

const priorityBorderColors = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

const priorityIcons = {
  critical: XCircle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: CheckCircle2,
};

export function ScriptOptimizationPanel({ code, isSubscriber }: ScriptOptimizationPanelProps) {
  const { toast } = useToast();
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (): Promise<OptimizationResult> => {
      const response = await apiRequest('/api/ai/optimize', 'POST', { code });
      return await response.json();
    },
    onSuccess: (data: OptimizationResult) => {
      setOptimization(data);
      toast({
        title: "Analysis Complete",
        description: "Script optimization recommendations generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze script. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopyCode = async (codeSnippet: string) => {
    try {
      await navigator.clipboard.writeText(codeSnippet);
      toast({
        title: "Copied!",
        description: "Code snippet copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code snippet.",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = () => {
    if (!code || code.trim().length === 0) {
      toast({
        title: "No Script",
        description: "Please write or generate a script first.",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate();
  };

  if (!isSubscriber) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">AI Script Optimizer</CardTitle>
          </div>
          <CardDescription>
            Unlock advanced AI-powered script analysis and optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Performance recommendations & parallel processing suggestions</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Security vulnerability detection & credential scanning</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4 text-primary" />
              <span>Best practices enforcement & code quality analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Alternative implementation approaches</span>
            </div>
          </div>
          <Separator />
          <Button className="w-full" size="lg" data-testid="button-upgrade-optimizer">
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to Pro ($5/month)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Script Optimizer
            </CardTitle>
            <CardDescription>
              Advanced analysis with performance, security, and best practice recommendations
            </CardDescription>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending || !code}
            data-testid="button-analyze-script"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Script
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {optimization && (
        <CardContent className="space-y-4">
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Analysis Summary</AlertTitle>
            <AlertDescription>{optimization.summary}</AlertDescription>
          </Alert>

          <Accordion type="multiple" defaultValue={["performance", "security", "best-practices", "alternatives"]}>
            {/* Performance Recommendations */}
            {optimization.performance.length > 0 && (
              <AccordionItem value="performance">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold">Performance ({optimization.performance.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-4">
                      {optimization.performance.map((rec, idx) => {
                        const PriorityIcon = priorityIcons[rec.priority];
                        return (
                          <Card key={idx} className={`border-l-4 ${priorityBorderColors[rec.priority]}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <PriorityIcon className="w-4 h-4" />
                                    <CardTitle className="text-sm">{rec.title}</CardTitle>
                                  </div>
                                  <Badge {...getPriorityBadgeProps(rec.priority)}>
                                    {rec.priority.toUpperCase()}
                                  </Badge>
                                  {rec.line && (
                                    <Badge variant="outline" className="ml-2">Line {rec.line}</Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-muted-foreground">{rec.description}</p>
                              {rec.code && (
                                <div className="relative">
                                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                    <code>{rec.code}</code>
                                  </pre>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute top-2 right-2"
                                    onClick={() => handleCopyCode(rec.code!)}
                                    data-testid={`button-copy-performance-${idx}`}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Security Issues */}
            {optimization.security.length > 0 && (
              <AccordionItem value="security">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-500" />
                    <span className="font-semibold">Security ({optimization.security.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-4">
                      {optimization.security.map((rec, idx) => {
                        const PriorityIcon = priorityIcons[rec.priority];
                        return (
                          <Card key={idx} className={`border-l-4 ${priorityBorderColors[rec.priority]}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <PriorityIcon className="w-4 h-4" />
                                    <CardTitle className="text-sm">{rec.title}</CardTitle>
                                  </div>
                                  <Badge {...getPriorityBadgeProps(rec.priority)}>
                                    {rec.priority.toUpperCase()}
                                  </Badge>
                                  {rec.line && (
                                    <Badge variant="outline" className="ml-2">Line {rec.line}</Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-muted-foreground">{rec.description}</p>
                              {rec.code && (
                                <div className="relative">
                                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                    <code>{rec.code}</code>
                                  </pre>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute top-2 right-2"
                                    onClick={() => handleCopyCode(rec.code!)}
                                    data-testid={`button-copy-security-${idx}`}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Best Practices */}
            {optimization.bestPractices.length > 0 && (
              <AccordionItem value="best-practices">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="font-semibold">Best Practices ({optimization.bestPractices.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-4">
                      {optimization.bestPractices.map((rec, idx) => {
                        const PriorityIcon = priorityIcons[rec.priority];
                        return (
                          <Card key={idx} className={`border-l-4 ${priorityBorderColors[rec.priority]}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <PriorityIcon className="w-4 h-4" />
                                    <CardTitle className="text-sm">{rec.title}</CardTitle>
                                  </div>
                                  <Badge {...getPriorityBadgeProps(rec.priority)}>
                                    {rec.priority.toUpperCase()}
                                  </Badge>
                                  {rec.line && (
                                    <Badge variant="outline" className="ml-2">Line {rec.line}</Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-muted-foreground">{rec.description}</p>
                              {rec.code && (
                                <div className="relative">
                                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                    <code>{rec.code}</code>
                                  </pre>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute top-2 right-2"
                                    onClick={() => handleCopyCode(rec.code!)}
                                    data-testid={`button-copy-best-practice-${idx}`}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Alternative Approaches */}
            {optimization.alternatives.length > 0 && (
              <AccordionItem value="alternatives">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold">Alternative Approaches ({optimization.alternatives.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-4">
                      {optimization.alternatives.map((alt, idx) => (
                        <Card key={idx} className="border-l-4 border-l-purple-500">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <CardTitle className="text-sm">{alt.title}</CardTitle>
                                <Badge variant="outline" className="mt-2">{alt.approach}</Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">{alt.description}</p>
                            <div className="relative">
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                <code>{alt.code}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => handleCopyCode(alt.code)}
                                data-testid={`button-copy-alternative-${idx}`}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
}
