import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Upload,
  X,
  Sparkles,
  Crown,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  FileText,
  Wrench,
  ShieldAlert,
  Lightbulb,
  Terminal,
  Loader2,
} from "lucide-react";

interface TroubleshootIssue {
  severity: "critical" | "error" | "warning" | "info";
  title: string;
  description: string;
  location?: string;
  fix: string;
  powershellFix?: string;
}

interface TroubleshootWorkaround {
  title: string;
  description: string;
  steps: string[];
  powershellScript?: string;
}

interface TroubleshootResult {
  summary: string;
  platform: string;
  logType: string;
  issues: TroubleshootIssue[];
  workarounds: TroubleshootWorkaround[];
  rootCause: string;
  preventionTips: string[];
}

const PLATFORMS = [
  { group: "Windows & Infrastructure", items: [
    "Active Directory",
    "Windows Server",
    "File System",
    "Network",
    "Services",
    "Process Management",
    "Event Logs",
    "Registry",
    "Security",
    "Hyper-V",
    "Windows 365",
  ]},
  { group: "Microsoft 365", items: [
    "Exchange Online",
    "Exchange Server",
    "Azure AD",
    "Azure Resources",
    "SharePoint Online",
    "SharePoint On-Prem",
    "Microsoft Teams",
    "Office 365",
    "OneDrive",
    "Power Platform",
    "Intune",
    "MECM",
  ]},
  { group: "Virtualization & Cloud", items: [
    "VMware vSphere",
    "Nutanix AHV",
    "Citrix Virtual Apps",
    "Amazon AWS",
    "Google Cloud",
    "Docker/Kubernetes",
    "Veeam Backup",
  ]},
  { group: "Security & Identity", items: [
    "CrowdStrike Falcon",
    "Sophos Central",
    "Okta",
    "Duo Security",
    "Fortinet FortiGate",
    "Cisco Meraki",
  ]},
  { group: "ITSM & Monitoring", items: [
    "ServiceNow",
    "ConnectWise",
    "Splunk/Datadog",
    "Jira/Confluence",
    "PDQ Deploy/Inventory",
  ]},
  { group: "Storage & Database", items: [
    "NetApp ONTAP",
    "SQL Server",
  ]},
  { group: "DevOps & Collaboration", items: [
    "GitHub/GitLab",
    "Slack",
    "Zoom",
    "JAMF Pro",
    "Chocolatey/WinGet",
    "Salesforce",
  ]},
];

const ALL_PLATFORMS = PLATFORMS.flatMap(g => g.items);

const SEVERITY_CONFIG = {
  critical: {
    icon: ShieldAlert,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Critical",
    badgeVariant: "destructive" as const,
  },
  error: {
    icon: AlertCircle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    label: "Error",
    badgeVariant: "destructive" as const,
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    label: "Warning",
    badgeVariant: "secondary" as const,
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    label: "Info",
    badgeVariant: "outline" as const,
  },
};

function CodeBlock({ code, onCopyToScript }: { code: string; onCopyToScript?: (code: string) => void }) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard", description: "PowerShell script copied." });
  };

  return (
    <div className="relative mt-2 rounded-md bg-muted/60 border">
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span>PowerShell</span>
        </div>
        <div className="flex items-center gap-1">
          {onCopyToScript && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => { onCopyToScript(code); toast({ title: "Sent to Script Editor" }); }}
              data-testid="button-send-to-editor"
            >
              Send to Editor
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleCopy}
            data-testid="button-copy-code"
          >
            <ClipboardCopy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <pre className="p-3 text-xs overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-words max-h-48">
        {code}
      </pre>
    </div>
  );
}

function IssueCard({ issue, index, onCopyToScript }: { issue: TroubleshootIssue; index: number; onCopyToScript: (code: string) => void }) {
  const [expanded, setExpanded] = useState(index === 0);
  const config = SEVERITY_CONFIG[issue.severity];
  const IconComponent = config.icon;

  return (
    <div className={`rounded-md border ${config.borderColor} ${config.bgColor} overflow-hidden`} data-testid={`issue-card-${index}`}>
      <button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-issue-expand-${index}`}
      >
        <IconComponent className={`h-4 w-4 shrink-0 ${config.color}`} />
        <span className="flex-1 font-medium text-sm">{issue.title}</span>
        <Badge variant={config.badgeVariant} className="text-xs shrink-0">
          {config.label}
        </Badge>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-sm text-muted-foreground">{issue.description}</p>
          {issue.location && (
            <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
              Found at: {issue.location}
            </p>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommended Fix</p>
            <p className="text-sm">{issue.fix}</p>
          </div>
          {issue.powershellFix && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">PowerShell Fix</p>
              <CodeBlock code={issue.powershellFix} onCopyToScript={onCopyToScript} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkaroundCard({ workaround, index, onCopyToScript }: { workaround: TroubleshootWorkaround; index: number; onCopyToScript: (code: string) => void }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="rounded-md border overflow-hidden" data-testid={`workaround-card-${index}`}>
      <button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-workaround-expand-${index}`}
      >
        <Wrench className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="flex-1 font-medium text-sm">{workaround.title}</span>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-sm text-muted-foreground">{workaround.description}</p>
          {workaround.steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Steps</p>
              <ol className="space-y-1">
                {workaround.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-muted-foreground font-mono text-xs mt-0.5">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {workaround.powershellScript && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">PowerShell Script</p>
              <CodeBlock code={workaround.powershellScript} onCopyToScript={onCopyToScript} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TroubleshooterTabProps {
  setScript: (script: string) => void;
}

export function TroubleshooterTab({ setScript }: TroubleshooterTabProps) {
  const { user, featureAccess } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [logContent, setLogContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [platform, setPlatform] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<TroubleshootResult | null>(null);

  const isPro = featureAccess?.hasPremiumCategories === true;

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai/troubleshoot", "POST", {
        logContent,
        platform,
        context: context.trim() || undefined,
      });
      return response.json();
    },
    onSuccess: (data: TroubleshootResult) => {
      setResult(data);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error?.message || "Failed to analyze the log file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogContent(ev.target?.result as string || "");
      setResult(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogContent(ev.target?.result as string || "");
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleClearLog = () => {
    setLogContent("");
    setFileName(null);
    setResult(null);
  };

  const handleSendToEditor = (code: string) => {
    setScript(code);
    toast({ title: "Script sent to editor", description: "The PowerShell script has been sent to the Script tab." });
  };

  const canAnalyze = logContent.trim().length >= 20 && platform;

  if (!isPro) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="rounded-full bg-primary/10 p-5">
            <Crown className="h-10 w-10 text-primary" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-bold">AI Log Troubleshooter</h2>
            <p className="text-muted-foreground">
              Upload log files from any IT platform and get instant AI-powered analysis with specific fix recommendations and PowerShell remediation scripts.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left">
            <div className="rounded-md border p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Any Log Format
              </div>
              <p className="text-xs text-muted-foreground">Windows Event Logs, service logs, application logs, and more</p>
            </div>
            <div className="rounded-md border p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4 text-primary" />
                Instant Fixes
              </div>
              <p className="text-xs text-muted-foreground">Ready-to-run PowerShell scripts for each identified issue</p>
            </div>
            <div className="rounded-md border p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                50+ Platforms
              </div>
              <p className="text-xs text-muted-foreground">Supports all PSForge platforms from Active Directory to VMware</p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => setShowUpgradeModal(true)}
            data-testid="button-upgrade-troubleshooter"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Pro
          </Button>
        </div>
        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
      {/* Left panel: input */}
      <div className="w-full md:w-96 lg:w-[420px] border-b md:border-b-0 md:border-r flex flex-col overflow-y-auto p-4 gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Log Troubleshooter
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a log file for AI-powered diagnosis and fix recommendations.
          </p>
        </div>

        {/* Platform selector */}
        <div className="space-y-1.5">
          <Label htmlFor="platform-select">Platform</Label>
          <Select value={platform} onValueChange={(v) => { setPlatform(v); setResult(null); }}>
            <SelectTrigger id="platform-select" data-testid="select-platform">
              <SelectValue placeholder="Select platform..." />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {PLATFORMS.map((group) => (
                <div key={group.group}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.group}
                  </div>
                  {group.items.map((item) => (
                    <SelectItem key={item} value={item} data-testid={`platform-option-${item}`}>
                      {item}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File upload */}
        <div className="space-y-1.5">
          <Label>Log File</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt,.evtx,.csv,.json,.xml,.evt"
            className="hidden"
            onChange={handleFileUpload}
            data-testid="input-log-file"
          />
          {!logContent ? (
            <div
              className="border-2 border-dashed rounded-md p-6 flex flex-col items-center gap-3 cursor-pointer hover-elevate"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              data-testid="dropzone-log-file"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop log file here</p>
                <p className="text-xs text-muted-foreground mt-0.5">or click to browse (.log, .txt, .json, .xml, .csv)</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName || "Pasted log content"}</p>
                <p className="text-xs text-muted-foreground">{logContent.split("\n").length} lines · {(logContent.length / 1024).toFixed(1)} KB</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleClearLog}
                data-testid="button-clear-log"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Paste log content */}
        <div className="space-y-1.5">
          <Label htmlFor="log-textarea">Or paste log content</Label>
          <Textarea
            id="log-textarea"
            value={logContent}
            onChange={(e) => { setLogContent(e.target.value); setFileName(null); setResult(null); }}
            placeholder="Paste your log content here..."
            className="font-mono text-xs resize-none h-40"
            data-testid="textarea-log-content"
          />
        </div>

        {/* Optional context */}
        <div className="space-y-1.5">
          <Label htmlFor="context-input">
            Additional Context <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Textarea
            id="context-input"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. This started after a Windows update on March 15..."
            className="resize-none h-20 text-sm"
            data-testid="textarea-context"
          />
        </div>

        <Button
          onClick={() => analyzeMutation.mutate()}
          disabled={!canAnalyze || analyzeMutation.isPending}
          className="w-full"
          data-testid="button-analyze-log"
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze Log
            </>
          )}
        </Button>
      </div>

      {/* Right panel: results */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {!result && !analyzeMutation.isPending && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-muted-foreground">
            <div className="rounded-full bg-muted/50 p-6">
              <FileText className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <div>
              <p className="font-medium">No analysis yet</p>
              <p className="text-sm mt-1">Upload a log file and select a platform to get started.</p>
            </div>
          </div>
        )}

        {analyzeMutation.isPending && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-medium">Analyzing your log file...</p>
              <p className="text-sm mt-1">The AI is examining issues and preparing recommendations.</p>
            </div>
          </div>
        )}

        {result && !analyzeMutation.isPending && (
          <div className="space-y-5 max-w-3xl">
            {/* Summary card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">Analysis Results</CardTitle>
                  <Badge variant="secondary">{result.platform}</Badge>
                  <Badge variant="outline">{result.logType}</Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">{result.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted/50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Root Cause</p>
                  <p className="text-sm">{result.rootCause}</p>
                </div>
              </CardContent>
            </Card>

            {/* Severity summary */}
            {result.issues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(["critical", "error", "warning", "info"] as const).map((sev) => {
                  const count = result.issues.filter(i => i.severity === sev).length;
                  if (!count) return null;
                  const config = SEVERITY_CONFIG[sev];
                  const IconComp = config.icon;
                  return (
                    <div key={sev} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${config.bgColor} ${config.color}`}>
                      <IconComp className="h-4 w-4" />
                      <span className="font-medium">{count} {config.label}{count > 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Issues */}
            {result.issues.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Issues Found ({result.issues.length})
                </h3>
                <div className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <IssueCard
                      key={i}
                      issue={issue}
                      index={i}
                      onCopyToScript={handleSendToEditor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Workarounds */}
            {result.workarounds.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Workarounds ({result.workarounds.length})
                </h3>
                <div className="space-y-2">
                  {result.workarounds.map((w, i) => (
                    <WorkaroundCard
                      key={i}
                      workaround={w}
                      index={i}
                      onCopyToScript={handleSendToEditor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Prevention tips */}
            {result.preventionTips.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Prevention Tips
                </h3>
                <ul className="space-y-1.5">
                  {result.preventionTips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Re-analyze button */}
            <Button
              variant="outline"
              onClick={handleClearLog}
              className="w-full"
              data-testid="button-new-analysis"
            >
              <X className="h-4 w-4 mr-2" />
              Start New Analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
