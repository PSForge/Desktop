import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ValidationPanelProps {
  errors: Array<{ line?: number; message: string; severity: string }>;
  isValidating?: boolean;
}

export function ValidationPanel({ errors, isValidating }: ValidationPanelProps) {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const infoCount = errors.filter(e => e.severity === 'info').length;

  if (isValidating) {
    return (
      <Card data-testid="validation-loading">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <CardTitle className="text-sm">Validating Script...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-chart-3" />;
      case 'info':
        return <Info className="h-4 w-4 text-primary" />;
      default:
        return <CheckCircle className="h-4 w-4 text-chart-2" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-l-destructive bg-destructive/5';
      case 'warning':
        return 'border-l-chart-3 bg-chart-3/5';
      case 'info':
        return 'border-l-primary bg-primary/5';
      default:
        return 'border-l-chart-2 bg-chart-2/5';
    }
  };

  if (errors.length === 0 && !isValidating) {
    return (
      <Card className="border-chart-2 bg-chart-2/5" data-testid="validation-success">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-chart-2" />
            <CardTitle className="text-sm">Validation Passed</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground" data-testid="text-validation-success">
            No errors or warnings detected in the generated script.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="validation-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm" data-testid="text-validation-title">Validation Results</CardTitle>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs" data-testid="badge-validation-errors">
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="text-xs bg-chart-3 text-white" data-testid="badge-validation-warnings">
                {warningCount} warning{warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-validation-info">
                {infoCount} info
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div
                key={index}
                className={`border-l-2 p-3 rounded-md ${getSeverityColor(error.severity)}`}
                data-testid={`validation-${error.severity}-${index}`}
              >
                <div className="flex items-start gap-2">
                  {getSeverityIcon(error.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {error.severity}
                      </span>
                      {error.line && (
                        <Badge variant="outline" className="text-xs">
                          Line {error.line}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{error.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
