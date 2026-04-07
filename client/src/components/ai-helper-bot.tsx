import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Plus, ChevronRight, Sparkles, Code2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

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

export function AIHelperBot({ onAddCommand, onUseCustomScript, isOpen, onToggle }: AIHelperBotProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ai-bot-messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (err) {
        console.error('Failed to load AI messages:', err);
      }
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! I'm your PowerShell assistant. Ask me anything about building scripts, and I'll suggest the right commands for your task.",
        timestamp: new Date(),
      },
    ];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('ai-bot-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiRequest("/api/ai-helper", "POST", {
        message: input.trim(),
        conversationHistory: messages,
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
    <div className="flex flex-col h-full border-l bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b">
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

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
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
                  "flex flex-col gap-2 max-w-[80%]",
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
                  <div className="space-y-2 w-full">
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
                    <Card className="p-3 bg-muted/50">
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
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
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about PowerShell commands..."
            disabled={isLoading}
            className="flex-1"
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
