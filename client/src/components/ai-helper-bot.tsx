import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, Plus, ChevronRight, Sparkles, Code2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { getDesktopStorageItem, setDesktopStorageItem, writeDesktopDebugLog } from "@/lib/desktop";
import { trackDesktopAnalyticsEvent } from "@/lib/desktop-analytics";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: CommandSuggestion[];
  customScript?: string;
  timestamp: Date;
}

interface CommandSuggestion {
  commandId: string;
  commandName: string;
  reason: string;
  suggestedParameters?: Record<string, string>;
}

interface AIHelperBotProps {
  onAddCommand: (commandId: string, parameters?: Record<string, string>) => void;
  onUseCustomScript?: (script: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const AI_CHAT_HISTORY_KEY = "psforge-desktop-ai-chat-history";
const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm your PowerShell assistant. Ask me anything about building scripts, and I'll suggest the right commands for your task.",
  timestamp: new Date(),
};

export function AIHelperBot({ onAddCommand, onUseCustomScript, isOpen, onToggle }: AIHelperBotProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = getDesktopStorageItem(AI_CHAT_HISTORY_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const restoredMessages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));

        if (restoredMessages.length > 0) {
          return restoredMessages;
        }
      } catch (err) {
        console.error('Failed to load AI messages:', err);
      }
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDesktopStorageItem(AI_CHAT_HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }

    let lastScrollLog = 0;
    let lastWheelLog = 0;

    const describeElement = (element: Element | null) => {
      if (!(element instanceof HTMLElement)) {
        return "unknown";
      }

      const className = typeof element.className === "string" ? element.className.replace(/\s+/g, ".").slice(0, 120) : "";
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${className ? `.${className}` : ""}`;
    };

    const logMetrics = async (label: string) => {
      const style = window.getComputedStyle(container);
      await writeDesktopDebugLog(
        [
          `AI_SCROLL ${label}`,
          `clientHeight=${container.clientHeight}`,
          `scrollHeight=${container.scrollHeight}`,
          `scrollTop=${container.scrollTop}`,
          `offsetHeight=${container.offsetHeight}`,
          `overflowY=${style.overflowY}`,
          `maxHeight=${style.maxHeight}`,
          `messages=${messages.length}`,
        ].join(" "),
      );
    };

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollLog < 250) {
        return;
      }
      lastScrollLog = now;
      void logMetrics("scroll");
    };

    const handleWheel = (event: WheelEvent) => {
      const now = Date.now();
      if (now - lastWheelLog < 250) {
        return;
      }
      lastWheelLog = now;
      void writeDesktopDebugLog(
        [
          "AI_SCROLL wheel",
          `deltaY=${event.deltaY}`,
          `target=${describeElement(event.target as Element | null)}`,
          `currentTarget=${describeElement(event.currentTarget as Element | null)}`,
          `clientHeight=${container.clientHeight}`,
          `scrollHeight=${container.scrollHeight}`,
          `scrollTop=${container.scrollTop}`,
        ].join(" "),
      );
    };

    void logMetrics("mount");

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleScroll);
    };
  }, [messages.length]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isLoading && isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, isOpen]);

  const sendCurrentMessage = async () => {
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };
    const conversationHistory = [...messages, userMessage];

    setMessages(conversationHistory);
    setInput("");
    setIsLoading(true);
    void trackDesktopAnalyticsEvent("desktop_ai_prompt_sent");

    try {
      const response = await apiRequest("/api/ai-helper", "POST", {
        message: messageContent,
        conversationHistory,
      });
      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        suggestions: data.suggestions || [],
        customScript: data.customScript,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      void trackDesktopAnalyticsEvent("desktop_ai_response_received");
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error instanceof Error && error.message
          ? `I hit an error: ${error.message}`
          : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendCurrentMessage();
  };

  const handleAddSuggestion = (suggestion: CommandSuggestion) => {
    onAddCommand(suggestion.commandId, suggestion.suggestedParameters);
  };

  const handleUseCustomScript = (script: string) => {
    if (onUseCustomScript) {
      onUseCustomScript(script);
    }
  };

  const handleCopyScript = async (script: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedScriptId(messageId);
      setTimeout(() => setCopiedScriptId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        data-testid="button-open-ai-bot"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">AI Assistant</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          data-testid="button-close-ai-bot"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={messageListRef}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 24rem)" }}
      >
        <div className="space-y-4 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "flex max-w-[80%] min-w-0 flex-col gap-2",
                  message.role === "user" && "items-end"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="space-y-2 w-full">
                    <p className="text-xs text-muted-foreground">Suggested commands:</p>
                    {message.suggestions.map((suggestion, idx) => (
                      <Card key={idx} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {suggestion.commandName}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {suggestion.reason}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddSuggestion(suggestion)}
                            data-testid={`button-add-suggestion-${suggestion.commandId}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {message.customScript && (
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Code2 className="h-3 w-3" />
                        Custom PowerShell Script
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyScript(message.customScript!, message.id)}
                        data-testid={`button-copy-script-${message.id}`}
                      >
                        {copiedScriptId === message.id ? (
                          <><Check className="h-3 w-3 mr-1" />Copied</>
                        ) : (
                          <><Copy className="h-3 w-3 mr-1" />Copy</>
                        )}
                      </Button>
                    </div>
                    <Card className="bg-muted/50 p-3">
                      <pre className="overflow-x-auto text-xs font-mono whitespace-pre-wrap break-words">
                        {message.customScript}
                      </pre>
                    </Card>
                    {onUseCustomScript && (
                      <Button
                        size="sm"
                        onClick={() => handleUseCustomScript(message.customScript!)}
                        className="w-full gap-2"
                        data-testid={`button-use-custom-script-${message.id}`}
                      >
                        <Code2 className="h-3 w-3" />
                        Use This Script
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium">You</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-lg px-3 py-2 bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t bg-background p-4">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about PowerShell commands..."
            disabled={isLoading}
            rows={3}
            className="min-h-[72px] flex-1 resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendCurrentMessage();
              }
            }}
            data-testid="input-ai-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            data-testid="button-send-message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
