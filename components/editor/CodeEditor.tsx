'use client';
import { useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { editor } from 'monaco-editor';
import { useIDEStore } from '@/lib/store';
import { X } from 'lucide-react';
import { iconForFile, cn } from '@/lib/utils';

export default function CodeEditor() {
  const {
    activeProjectId,
    projects,
    activeFile,
    openFiles,
    openFile,
    closeFile,
    updateFileContent,
    markFileSaved,
  } = useIDEStore();

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monaco = useMonaco();
  const { resolved } = useTheme();

  const project = projects.find((p) => p.id === activeProjectId);
  const currentFile = project?.files.find((f) => f.name === activeFile);

  // Define Arduino dark theme once Monaco loads
  useEffect(() => {
    if (!monaco) return;
    // Sync Monaco editor theme with app theme
    if (resolved === 'light') {
      monaco.editor.setTheme('arduino-light');
    } else {
      monaco.editor.setTheme('arduino-dark');
    }

    // ── Light theme ──────────────────────────────────────────
    monaco.editor.defineTheme('arduino-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'cf222e' },
        { token: 'string', foreground: '0550ae' },
        { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
        { token: 'number', foreground: '0550ae' },
        { token: 'type', foreground: '953800' },
        { token: 'delimiter', foreground: '1f2328' },
        { token: 'identifier', foreground: '1f2328' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1f2328',
        'editorLineNumber.foreground': '#6e7781',
        'editorLineNumber.activeForeground': '#1f2328',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editorCursor.foreground': '#0550ae',
        'editor.selectionBackground': '#dce9ff',
        'editorIndentGuide.background1': '#eaeef2',
        'editorWidget.background': '#f6f8fa',
        'editorSuggestWidget.background': '#f6f8fa',
        'editorSuggestWidget.border': '#d0d7de',
        'input.background': '#ffffff',
        'dropdown.background': '#f6f8fa',
      },
    });

    // ── Dark theme ───────────────────────────────────────────
    monaco.editor.defineTheme('arduino-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'delimiter', foreground: 'c9d1d9' },
        { token: 'macro', foreground: 'ffa657' },
        { token: 'identifier', foreground: 'e6edf3' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': '#e6edf3',
        'editor.lineHighlightBackground': '#161b22',
        'editorCursor.foreground': '#58a6ff',
        'editor.selectionBackground': '#264f78',
        'editorIndentGuide.background1': '#21262d',
        'editorWidget.background': '#161b22',
        'editorSuggestWidget.background': '#161b22',
        'editorSuggestWidget.border': '#30363d',
        'input.background': '#0d1117',
        'dropdown.background': '#161b22',
      },
    });
    monaco.editor.setTheme('arduino-dark');

    // Arduino-specific autocomplete
    monaco.languages.registerCompletionItemProvider('cpp', {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const keywords = [
          'Serial',
          'Serial.begin',
          'Serial.print',
          'Serial.println',
          'Serial.available',
          'Serial.read',
          'Serial.readStringUntil',
          'pinMode',
          'digitalWrite',
          'digitalRead',
          'analogRead',
          'analogWrite',
          'delay',
          'delayMicroseconds',
          'millis',
          'micros',
          'Wire',
          'Wire.begin',
          'Wire.beginTransmission',
          'Wire.endTransmission',
          'Wire.write',
          'Wire.requestFrom',
          'Wire.read',
          'Wire.setClock',
          'INPUT',
          'OUTPUT',
          'INPUT_PULLUP',
          'HIGH',
          'LOW',
          'uint8_t',
          'uint16_t',
          'uint32_t',
          'int8_t',
          'int16_t',
          'int32_t',
          'unsigned long',
          'boolean',
          'byte',
          'String',
          'void setup',
          'void loop',
          'Timer1.initialize',
          'Timer1.attachInterrupt',
          'Timer1.start',
          'Timer1.stop',
          'noInterrupts',
          'interrupts',
          'EEPROM.read',
          'EEPROM.write',
          'EEPROM.put',
          'EEPROM.get',
        ];
        return {
          suggestions: keywords.map((kw) => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          })),
        };
      },
    });
  }, [monaco, resolved]);

  function handleEditorMount(ed: editor.IStandaloneCodeEditor) {
    editorRef.current = ed;
    // Ctrl+S to save/download current file
    ed.addCommand(monaco?.KeyMod.CtrlCmd! | monaco?.KeyCode.KeyS!, () => {
      if (activeFile) markFileSaved(activeFile);
    });
  }

  function handleChange(value: string | undefined) {
    if (activeFile && value !== undefined) updateFileContent(activeFile, value);
  }

  const tabFiles = openFiles
    .map((name) => project?.files.find((f) => f.name === name))
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex items-end bg-bg-surface border-b border-border-subtle overflow-x-auto flex-shrink-0 h-9">
        {tabFiles.map(
          (f) =>
            f && (
              <div
                key={f.name}
                onClick={() => openFile(f.name)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-border-subtle',
                  'font-mono text-[11px] whitespace-nowrap transition-all select-none group',
                  'border-t-2',
                  activeFile === f.name
                    ? 'bg-bg-base text-fg-default border-t-accent-blue'
                    : 'text-fg-muted hover:text-fg-default hover:bg-bg-raised border-t-transparent'
                )}
              >
                <span className="opacity-50 text-[10px]">
                  {iconForFile(f.name)}
                </span>
                <span>{f.name}</span>
                {f.modified && (
                  <span className="text-accent-amber text-[9px]">●</span>
                )}
                <button
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 ml-0.5 rounded text-fg-subtle hover:text-fg-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(f.name);
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            )
        )}
      </div>

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        {currentFile ? (
          <Editor
            height="100%"
            language={currentFile.language}
            value={currentFile.content}
            theme={resolved === 'light' ? 'arduino-light' : 'arduino-dark'}
            onChange={handleChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineNumbers: 'on',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'off',
              tabSize: 4,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              padding: { top: 8 },
              readOnly: currentFile.readonly,
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              suggest: { showKeywords: true },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-fg-subtle font-mono text-sm">
            Open a file from the explorer
          </div>
        )}
      </div>
    </div>
  );
}
