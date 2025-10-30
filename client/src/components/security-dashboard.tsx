import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  XCircle,
  Copy,
  CheckCircle
} from 'lucide-react';
import { 
  scanPowerShellScript, 
  SecurityScanResult,
  getSecurityLevelColor,
  getWarningLevelColor
} from '@/lib/security-scanner';
import { 
  generateScriptIntegrity, 
  formatHashForDisplay,
  copyHashToClipboard,
  ScriptIntegrity
} from '@/lib/script-integrity';
import { useToast } from '@/hooks/use-toast';

interface SecurityDashboardProps {
  script: string;
  className?: string;
}

export function SecurityDashboard({ script, className = '' }: SecurityDashboardProps) {
  const [scanResult, setScanResult] = useState<SecurityScanResult | null>(null);
  const [integrity, setIntegrity] = useState<ScriptIntegrity | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const performScan = async () => {
      if (!script || script.trim() === '') {
        setScanResult(null);
        setIntegrity(null);
        return;
      }

      setIsScanning(true);
      
      try {
        // Scan for security issues
        const result = scanPowerShellScript(script);
        setScanResult(result);

        // Generate integrity hash
        const integrityData = await generateScriptIntegrity(script);
        setIntegrity(integrityData);
      } catch (error) {
        console.error('Security scan error:', error);
      } finally {
        setIsScanning(false);
      }
    };

    performScan();
  }, [script]);

  const handleCopyHash = async () => {
    if (!integrity?.hash) return;

    const success = await copyHashToClipboard(integrity.hash);
    if (success) {
      toast({
        title: 'Hash Copied',
        description: 'Script integrity hash copied to clipboard.',
      });
    } else {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy hash to clipboard.',
        variant: 'destructive',
      });
    }
  };

  if (!scanResult || !integrity) {
    return (
      <Card className={className} data-testid="security-dashboard">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Analysis
          </CardTitle>
          <CardDescription>
            {isScanning ? 'Scanning script...' : 'No script to analyze'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const SecurityIcon = scanResult.securityLevel === 'safe' 
    ? ShieldCheck 
    : scanResult.securityLevel === 'caution'
    ? ShieldAlert
    : Shield;

  const criticalWarnings = scanResult.warnings.filter(w => w.level === 'critical');
  const regularWarnings = scanResult.warnings.filter(w => w.level === 'warning');
  const infoWarnings = scanResult.warnings.filter(w => w.level === 'info');

  return (
    <Card className={className} data-testid="security-dashboard">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SecurityIcon className={`h-5 w-5 ${getSecurityLevelColor(scanResult.securityLevel)}`} />
            Security Analysis
          </div>
          <Badge 
            variant={scanResult.securityLevel === 'dangerous' ? 'destructive' : 'default'}
            data-testid="security-level-badge"
          >
            {scanResult.securityLevel.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>{scanResult.summary}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Security Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Security Score</span>
            <span className={`font-bold ${getSecurityLevelColor(scanResult.securityLevel)}`} data-testid="security-score">
              {scanResult.score}/100
            </span>
          </div>
          <Progress 
            value={scanResult.score} 
            className="h-2"
            data-testid="security-score-progress"
          />
        </div>

        <Separator />

        {/* Script Integrity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Script Integrity (SHA-256)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyHash}
              className="h-7 gap-2"
              data-testid="button-copy-hash"
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </div>
          <code className="block text-xs bg-muted p-2 rounded border break-all" data-testid="text-integrity-hash">
            {formatHashForDisplay(integrity.hash, 32)}
          </code>
          <p className="text-xs text-muted-foreground">
            Generated: {new Date(integrity.timestamp).toLocaleString()} • Size: {integrity.size.toLocaleString()} bytes
          </p>
        </div>

        {/* Warnings */}
        {scanResult.warnings.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                Security Findings ({scanResult.warnings.length})
              </h4>

              {/* Critical Warnings */}
              {criticalWarnings.length > 0 && (
                <div className="space-y-2">
                  {criticalWarnings.map((warning, index) => (
                    <Alert key={`critical-${index}`} variant="destructive" data-testid={`warning-critical-${index}`}>
                      <XCircle className="h-4 w-4" />
                      <AlertDescription className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">Line {warning.line}: {warning.message}</span>
                        </div>
                        <p className="text-xs opacity-90">{warning.recommendation}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Regular Warnings */}
              {regularWarnings.length > 0 && (
                <div className="space-y-2">
                  {regularWarnings.map((warning, index) => (
                    <Alert key={`warning-${index}`} data-testid={`warning-warning-${index}`}>
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <AlertDescription className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">Line {warning.line}: {warning.message}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{warning.recommendation}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Info Items */}
              {infoWarnings.length > 0 && (
                <div className="space-y-2">
                  {infoWarnings.map((warning, index) => (
                    <Alert key={`info-${index}`} className="border-blue-200 dark:border-blue-800" data-testid={`warning-info-${index}`}>
                      {warning.message.includes('good practice') ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                      <AlertDescription className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-sm">Line {warning.line}: {warning.message}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{warning.recommendation}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* No Issues Found */}
        {scanResult.warnings.length === 0 && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>No security concerns detected in this script.</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
