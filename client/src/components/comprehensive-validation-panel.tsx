import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Shield, 
  Package, 
  Zap,
  ClipboardCheck,
  FileCheck,
  Sparkles
} from "lucide-react";
import type { ComprehensiveValidationResult } from "@shared/schema";

interface ComprehensiveValidationPanelProps {
  result: ComprehensiveValidationResult;
}

export function ComprehensiveValidationPanel({ result }: ComprehensiveValidationPanelProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'syntax': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'dependency': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'impact': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      case 'best-practice': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'compliance': return 'bg-pink-500/10 text-pink-700 dark:text-pink-400';
      case 'security': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  const errorCount = result.issues.filter(i => i.type === 'error').length;
  const warningCount = result.issues.filter(i => i.type === 'warning').length;
  const infoCount = result.issues.filter(i => i.type === 'info').length;

  const issuesByCategory = {
    syntax: result.issues.filter(i => i.category === 'syntax'),
    dependency: result.issues.filter(i => i.category === 'dependency'),
    impact: result.issues.filter(i => i.category === 'impact'),
    'best-practice': result.issues.filter(i => i.category === 'best-practice'),
    compliance: result.issues.filter(i => i.category === 'compliance'),
    security: result.issues.filter(i => i.category === 'security'),
  };

  return (
    <div className="space-y-4" data-testid="comprehensive-validation-panel">
      {/* Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Validation Score
            </span>
            <span className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
              {result.score}/100
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{getScoreLabel(result.score)}</span>
              <span className="text-sm text-muted-foreground">
                {errorCount} errors, {warningCount} warnings, {infoCount} info
              </span>
            </div>
            <Progress value={result.score} className="h-2" data-testid="validation-score-progress" />
          </div>
          
          <Alert data-testid="validation-summary">
            <Info className="h-4 w-4" />
            <AlertTitle>Summary</AlertTitle>
            <AlertDescription>{result.summary}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="issues" data-testid="tab-issues">
            Issues ({result.issues.length})
          </TabsTrigger>
          <TabsTrigger value="dependencies" data-testid="tab-dependencies">
            Dependencies
          </TabsTrigger>
          <TabsTrigger value="impact" data-testid="tab-impact">
            Impact
          </TabsTrigger>
          <TabsTrigger value="best-practices" data-testid="tab-best-practices">
            Best Practices
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          {result.issues.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">No issues found!</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.entries(issuesByCategory).map(([category, issues]) => 
              issues.length > 0 && (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Badge className={getCategoryColor(category)}>
                        {category.replace('-', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({issues.length} {issues.length === 1 ? 'issue' : 'issues'})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="border-l-2 pl-3 py-2 space-y-1"
                          style={{ borderColor: `var(--${issue.type === 'error' ? 'destructive' : issue.type === 'warning' ? 'warning' : 'info'})` }}
                          data-testid={`issue-${category}-${idx}`}
                        >
                          <div className="flex items-start gap-2">
                            {getTypeIcon(issue.type)}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                {issue.line && (
                                  <Badge variant="outline" className="text-xs">
                                    Line {issue.line}
                                  </Badge>
                                )}
                                <Badge variant="outline" className={`text-xs ${getSeverityColor(issue.severity)}`}>
                                  {issue.severity}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{issue.message}</p>
                              <p className="text-xs text-muted-foreground">
                                💡 {issue.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            )
          )}
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Required Dependencies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.dependencies.modules.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    PowerShell Modules
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.dependencies.modules.map((module, idx) => (
                      <Badge key={idx} variant="secondary" data-testid={`module-${idx}`}>
                        {module}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {result.dependencies.permissions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Required Permissions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.dependencies.permissions.map((perm, idx) => (
                      <Badge key={idx} variant="outline" className="bg-orange-500/10" data-testid={`permission-${idx}`}>
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {result.dependencies.externalTools.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    External Tools
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.dependencies.externalTools.map((tool, idx) => (
                      <Badge key={idx} variant="outline" data-testid={`tool-${idx}`}>
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {result.dependencies.modules.length === 0 && 
               result.dependencies.permissions.length === 0 && 
               result.dependencies.externalTools.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No external dependencies detected
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Tab */}
        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Impact Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-md border ${result.impact.createsObjects ? 'bg-blue-500/10 border-blue-500/20' : 'bg-muted'}`}>
                  <div className="text-2xl font-bold">{result.impact.createsObjects ? '✓' : '—'}</div>
                  <div className="text-sm font-medium">Creates Objects</div>
                </div>
                
                <div className={`p-4 rounded-md border ${result.impact.modifiesObjects ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-muted'}`}>
                  <div className="text-2xl font-bold">{result.impact.modifiesObjects ? '✓' : '—'}</div>
                  <div className="text-sm font-medium">Modifies Objects</div>
                </div>
                
                <div className={`p-4 rounded-md border ${result.impact.deletesObjects ? 'bg-red-500/10 border-red-500/20' : 'bg-muted'}`}>
                  <div className="text-2xl font-bold">{result.impact.deletesObjects ? '✓' : '—'}</div>
                  <div className="text-sm font-medium">Deletes Objects</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Impact Level</h4>
                <Badge 
                  className={
                    result.impact.estimatedImpact === 'Critical' ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
                    result.impact.estimatedImpact === 'High' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400' :
                    result.impact.estimatedImpact === 'Medium' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                    'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  }
                  data-testid="impact-level"
                >
                  {result.impact.estimatedImpact}
                </Badge>
              </div>
              
              {result.impact.affectedResources.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Affected Resources</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.impact.affectedResources.map((resource, idx) => (
                      <Badge key={idx} variant="secondary" data-testid={`resource-${idx}`}>
                        {resource}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Best Practices Tab */}
        <TabsContent value="best-practices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                PowerShell Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.bestPractices.map((bp, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-md border ${bp.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}
                    data-testid={`best-practice-${idx}`}
                  >
                    {bp.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm">{bp.category}</div>
                      <div className="text-sm text-muted-foreground">{bp.message}</div>
                      {bp.recommendation && (
                        <div className="text-xs text-muted-foreground">
                          💡 {bp.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {result.bestPractices.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No best practice checks performed
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Compliance & Security Standards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.compliance.map((comp, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-md p-4 ${comp.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                    data-testid={`compliance-${comp.standard.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        {comp.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        {comp.standard}
                      </h4>
                      <Badge variant={comp.passed ? "default" : "destructive"}>
                        {comp.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                    
                    {!comp.passed && comp.issues.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">Issues:</div>
                        <ul className="space-y-1 text-sm">
                          {comp.issues.map((issue, issueIdx) => (
                            <li key={issueIdx} className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {comp.recommendations.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <div className="text-sm font-medium">Recommendations:</div>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {comp.recommendations.map((rec, recIdx) => (
                                <li key={recIdx} className="flex items-start gap-2">
                                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {comp.passed && (
                      <p className="text-sm text-muted-foreground">
                        Script complies with {comp.standard} requirements
                      </p>
                    )}
                  </div>
                ))}
                
                {result.compliance.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No compliance checks performed
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
