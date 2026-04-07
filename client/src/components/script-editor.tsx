import { useEffect, useRef, useState } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCode, Wand2 } from "lucide-react";
import { getCmdletReference, formatCmdletDocumentation } from "@/lib/powershell-cmdlet-reference";
import { useToast } from "@/hooks/use-toast";
import { isDesktopApp } from "@/lib/desktop";
import type * as monaco from 'monaco-editor';

interface ScriptEditorProps {
  script: string;
  onScriptChange: (script: string) => void;
  onCursorPositionChange?: (position: number) => void;
}

export function ScriptEditor({ script, onScriptChange, onCursorPositionChange }: ScriptEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { toast } = useToast();
  const desktopMode = isDesktopApp();
  const [desktopScrollTop, setDesktopScrollTop] = useState(0);

  const handleBeforeMount = (monaco: Monaco) => {
    monaco.editor.defineTheme("psforge-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "E5ECF6", background: "171D2A" },
        { token: "comment", foreground: "7FB069" },
        { token: "string", foreground: "F4A261" },
        { token: "keyword", foreground: "7DB2FF" },
        { token: "number", foreground: "E9C46A" },
      ],
      colors: {
        "editor.background": "#171D2A",
        "editor.foreground": "#E5ECF6",
        "editorLineNumber.foreground": "#7C8AA5",
        "editorLineNumber.activeForeground": "#E5ECF6",
        "editorCursor.foreground": "#F8FAFC",
        "editor.selectionBackground": "#2B64D91F",
        "editor.inactiveSelectionBackground": "#2B64D926",
        "editor.lineHighlightBackground": "#FFFFFF08",
        "editor.lineHighlightBorder": "#00000000",
        "editorWhitespace.foreground": "#5B667A55",
      },
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure PowerShell language
    monaco.languages.setLanguageConfiguration('powershell', {
      comments: {
        lineComment: '#',
        blockComment: ['<#', '#>']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      folding: {
        markers: {
          start: new RegExp('^\\s*#region\\b'),
          end: new RegExp('^\\s*#endregion\\b')
        }
      }
    });

    // Register hover provider for PowerShell cmdlets
    monaco.languages.registerHoverProvider('powershell', {
      provideHover: (model: monaco.editor.ITextModel, position: monaco.Position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const line = model.getLineContent(position.lineNumber);
        const wordStart = word.startColumn - 1;
        
        // Check if there's a dash before the word (cmdlet pattern)
        let cmdletName = word.word;
        if (wordStart > 0 && line[wordStart - 1] === '-') {
          // Include the previous word (verb part)
          const beforeDash = line.substring(0, wordStart - 1).trim().split(/\s+/).pop();
          if (beforeDash) {
            cmdletName = `${beforeDash}-${word.word}`;
          }
        } else if (word.word.includes('-')) {
          cmdletName = word.word;
        } else {
          // Check if this word is followed by a dash (verb part)
          const afterWord = line.substring(word.endColumn - 1).trim();
          if (afterWord.startsWith('-')) {
            const nounPart = afterWord.substring(1).split(/\s+/)[0];
            cmdletName = `${word.word}-${nounPart}`;
          }
        }

        const cmdletRef = getCmdletReference(cmdletName);
        if (!cmdletRef) return null;

        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            { value: formatCmdletDocumentation(cmdletRef) }
          ]
        };
      }
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorPositionChange) {
        const position = editor.getModel()?.getOffsetAt(e.position) || 0;
        onCursorPositionChange(position);
      }
    });

    // Enable code folding by default
    editor.updateOptions({
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
    });

    editor.focus();
  };

  const handleFormat = () => {
    if (desktopMode) {
      const formattedScript = (script || "")
        .split("\n")
        .map((line) => line.replace(/\t/g, "    ").replace(/\s+$/g, ""))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n");

      onScriptChange(formattedScript);
      textareaRef.current?.focus();
      toast({
        title: 'Script Formatted',
        description: 'Whitespace and indentation have been cleaned up for desktop editing.',
      });
      return;
    }

    if (!editorRef.current) {
      toast({
        title: 'Editor not ready',
        description: 'Please wait for the editor to load',
        variant: 'destructive'
      });
      return;
    }

    // Trigger formatting
    editorRef.current.getAction('editor.action.formatDocument')?.run();
    
    toast({
      title: 'Script Formatted',
      description: 'Your PowerShell script has been auto-formatted',
    });
  };

  const lineCount = Math.max(1, (script || '').split('\n').length);
  const gutterWidth = Math.max(56, `${lineCount}`.length * 12 + 28);

  const syncDesktopCursorPosition = () => {
    if (!textareaRef.current || !onCursorPositionChange) {
      return;
    }

    onCursorPositionChange(textareaRef.current.selectionStart || 0);
  };

  const syncDesktopScroll = () => {
    if (!textareaRef.current) {
      return;
    }

    setDesktopScrollTop(textareaRef.current.scrollTop);
  };

  useEffect(() => {
    if (!desktopMode || !textareaRef.current) {
      return;
    }

    const nextScrollTop = Math.max(
      0,
      Math.min(
        textareaRef.current.scrollTop,
        textareaRef.current.scrollHeight - textareaRef.current.clientHeight,
      ),
    );

    textareaRef.current.scrollTop = nextScrollTop;
    setDesktopScrollTop(nextScrollTop);
  }, [desktopMode, script]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium flex items-center gap-2" data-testid="text-editor-title">
            <FileCode className="h-5 w-5" />
            PowerShell Script Editor
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Type your script or click commands from the sidebar • Hover over cmdlets for help
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormat}
            data-testid="button-format-script"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Format
          </Button>
          <Badge variant="secondary" className="text-xs" data-testid="badge-line-count">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>
      
      <div className="min-h-0 flex-1 overflow-hidden" data-testid="monaco-editor-container">
        {desktopMode ? (
          <div className="grid h-full min-h-0 grid-cols-[auto_minmax(0,1fr)] overflow-hidden bg-[#171D2A] text-[#E5ECF6]">
            <div
              className="overflow-hidden border-r border-white/10 bg-[#131927]"
              style={{ width: `${gutterWidth}px` }}
            >
              <div
                className="px-2 py-4 text-right font-mono text-sm leading-6 text-[#7C8AA5] will-change-transform"
                style={{ transform: `translateY(-${desktopScrollTop}px)` }}
              >
                {Array.from({ length: lineCount }, (_, index) => (
                  <div key={index}>{index + 1}</div>
                ))}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={script || ''}
              onChange={(event) => onScriptChange(event.target.value)}
              onClick={syncDesktopCursorPosition}
              onKeyUp={syncDesktopCursorPosition}
              onSelect={syncDesktopCursorPosition}
              onScroll={syncDesktopScroll}
              spellCheck={false}
              wrap="off"
              placeholder="Start typing your PowerShell script here..."
              className="h-full min-h-0 w-full flex-1 resize-none border-0 bg-transparent px-4 py-4 font-mono text-[15px] leading-6 text-[#E5ECF6] caret-[#F8FAFC] outline-none placeholder:text-[#6B778C]"
              style={{ scrollbarGutter: "stable both-edges" }}
              data-testid="desktop-script-textarea"
            />
          </div>
        ) : (
          <Editor
            beforeMount={handleBeforeMount}
            height="100%"
            language="powershell"
            value={script || ''}
            onChange={(value) => onScriptChange(value || '')}
            onMount={handleEditorDidMount}
            theme="psforge-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 15,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: 'on',
              folding: true,
              foldingStrategy: 'indentation',
              showFoldingControls: 'always',
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              formatOnPaste: true,
              formatOnType: true,
              cursorBlinking: 'solid',
              cursorStyle: 'line',
              cursorWidth: 3,
              padding: { top: 16, bottom: 16 },
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
