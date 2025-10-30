import { useRef, useEffect } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCode, Wand2 } from "lucide-react";
import { getCmdletReference, formatCmdletDocumentation } from "@/lib/powershell-cmdlet-reference";
import { useToast } from "@/hooks/use-toast";
import type * as monaco from 'monaco-editor';

interface ScriptEditorProps {
  script: string;
  onScriptChange: (script: string) => void;
  onCursorPositionChange?: (position: number) => void;
}

export function ScriptEditor({ script, onScriptChange, onCursorPositionChange }: ScriptEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { toast } = useToast();

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
      provideHover: (model, position) => {
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
  };

  const handleFormat = () => {
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

  const lineCount = (script || '').split('\n').length;

  return (
    <div className="flex-1 flex flex-col md:overflow-hidden">
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
      
      <div className="flex-1 md:overflow-hidden" data-testid="monaco-editor-container">
        <Editor
          height="100%"
          language="powershell"
          value={script || ''}
          onChange={(value) => onScriptChange(value || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
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
          }}
        />
      </div>
    </div>
  );
}
