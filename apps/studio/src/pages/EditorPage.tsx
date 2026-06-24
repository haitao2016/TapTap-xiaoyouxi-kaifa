import { useAppStore } from '../store/app-store';
import { projectManager, snippetService } from '@tapdev/core';
import { Icon } from '@tapdev/ui';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { FileNode, Snippet } from '@tapdev/types';
import { useState, useEffect, useCallback } from 'react';

export function EditorPage() {
  const {
    currentProject,
    editorTabs,
    activeTabId,
    openFile,
    closeTab,
    setActiveTab,
    updateTabContent,
    settings,
  } = useAppStore();

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['Assets']));
  const [cursorCount, setCursorCount] = useState(1);
  const [showSnippets, setShowSnippets] = useState(false);
  const [snippetQuery, setSnippetQuery] = useState('');
  const [snippets, setSnippets] = useState<Snippet[]>([]);

  const monacoInstance = useMonaco();

  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.defineTheme('tapdev-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          'editor.selectionBackground': '#264f78',
          'editor.cursorForeground': '#aeafad',
          'editor.inactiveSelectionBackground': '#1e3a5f',
          'editor.lineHighlightBackground': '#2a2a2a',
          'editorLineNumber.foreground': '#6b6b6b',
          'editorLineNumber.activeForeground': '#c6c6c6',
          'editorWhitespace.foreground': '#3b3b3b',
          'editorCursor.foreground': '#aeafad',
          'editorCursor.background': '#aeafad',
        },
      });
    }
  }, [monacoInstance]);

  const handleEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editor.onDidChangeCursorSelection((event: monaco.editor.ICursorSelectionChangedEvent) => {
      const selections = editor.getSelections();
      setCursorCount(selections?.length || 1);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      const model = editor.getModel();
      const selection = editor.getSelection();
      if (model && selection) {
        const word = model.getWordAtPosition(selection.getStartPosition());
        if (word) {
          const selections = editor.getSelections() || [];
          const newSelection = new monaco.Selection(
            selection.startLineNumber,
            word.startColumn,
            selection.startLineNumber,
            word.endColumn
          );
          editor.setSelections([...selections, newSelection]);
        }
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      const selections = editor.getSelections();
      if (selections && selections.length > 1) {
        editor.setSelections([selections[0]]);
      }
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
      e.preventDefault();
      setShowSnippets(true);
      setSnippets(snippetService.getSnippets());
    }
    if (e.key === 'Escape') {
      setShowSnippets(false);
    }
  }, []);

  const handleSnippetSelect = useCallback((snippet: Snippet) => {
    const activeTab = editorTabs.find((t) => t.id === activeTabId);
    if (activeTab && monacoInstance) {
      const editor = monacoInstance.editor.getEditors()[0];
      if (editor) {
        const body = snippet.body.join('\n');
        const insertText = body.replace(/\${(\d+):([^}]*)}/g, (_, num, defaultValue) => defaultValue);
        
        const selection = editor.getSelection();
        if (selection) {
          const model = editor.getModel();
          if (model) {
            model.applyEdits([{
              range: new monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.endLineNumber,
                selection.endColumn
              ),
              text: insertText,
            }]);
          }
        }
        updateTabContent(activeTab.id, (editor.getModel()?.getValue() || ''));
      }
    }
    setShowSnippets(false);
    setSnippetQuery('');
  }, [activeTabId, editorTabs, updateTabContent, monacoInstance]);

  useEffect(() => {
    const filtered = snippetService.searchSnippets(snippetQuery);
    setSnippets(filtered);
  }, [snippetQuery]);

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        请先从工作台打开或创建一个项目
      </div>
    );
  }

  const fileTree = projectManager.getFileTree(currentProject.path);
  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]" onKeyDown={handleKeyDown}>
      {/* File explorer */}
      <div className="w-56 shrink-0 overflow-auto border-r border-border bg-surface-1">
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-text-muted">
          资源管理器
        </div>
        <div className="p-1">
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedDirs={expandedDirs}
              onToggle={toggleDir}
              onOpen={openFile}
            />
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Tab bar */}
        {editorTabs.length > 0 && (
          <div className="flex overflow-x-auto border-b border-border bg-surface-1">
            {editorTabs.map((tab) => (
              <div
                key={tab.id}
                className={`group flex shrink-0 items-center gap-1 border-r border-border px-3 py-2 text-xs ${
                  tab.id === activeTabId
                    ? 'bg-surface-0 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-2'
                }`}
              >
                <button onClick={() => setActiveTab(tab.id)} className="flex items-center gap-1">
                  <Icon name="file" size={12} />
                  {tab.name}
                  {tab.modified && <span className="text-tap-orange">●</span>}
                </button>
                <button
                  onClick={() => closeTab(tab.id)}
                  className="ml-1 hidden rounded p-0.5 hover:bg-surface-3 group-hover:inline-flex"
                >
                  <Icon name="close" size={10} />
                </button>
              </div>
            ))}
            {cursorCount > 1 && (
              <div className="ml-auto flex items-center gap-1 px-3 text-xs text-text-muted">
                <Icon name="cursor" size={12} />
                {cursorCount} 个光标
              </div>
            )}
          </div>
        )}

        {/* Monaco editor */}
        {activeTab ? (
          <>
            <Editor
              height="100%"
              language={activeTab.language}
              value={activeTab.content}
              theme="tapdev-dark"
              onChange={(value) => updateTabContent(activeTab.id, value ?? '')}
              onMount={handleEditorMount}
              options={{
                fontSize: settings.editorFontSize,
                tabSize: settings.editorTabSize,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                multiCursorModifier: 'ctrlCmd',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                cursorWidth: 2,
                selectionHighlight: true,
                occurrencesHighlight: 'singleFile',
                renderLineHighlight: 'line',
                folding: true,
                foldingHighlight: true,
                bracketPairColorization: { enabled: true },
                quickSuggestions: {
                  other: true,
                  comments: true,
                  strings: true,
                },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
              }}
            />
            {/* Status bar */}
            <div className="flex items-center justify-between border-t border-border px-3 py-1 text-xs text-text-muted bg-surface-1">
              <div className="flex items-center gap-4">
                <span>{activeTab.name}</span>
                <span>{activeTab.language}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>按 Ctrl+空格 打开代码片段</span>
                <span>多光标: {cursorCount}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            从左侧选择文件开始编辑
          </div>
        )}
      </div>

      {/* Snippet picker */}
      {showSnippets && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-surface-0 shadow-xl border border-border">
            <div className="border-b border-border px-4 py-3">
              <input
                type="text"
                placeholder="搜索代码片段..."
                value={snippetQuery}
                onChange={(e) => setSnippetQuery(e.target.value)}
                className="w-full bg-transparent text-text-primary placeholder:text-text-muted outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-auto">
              {snippets.map((snippet) => (
                <button
                  key={snippet.id}
                  onClick={() => handleSnippetSelect(snippet)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-1"
                >
                  <Icon name="code" size={16} className="text-text-muted" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">{snippet.name}</div>
                    <div className="text-xs text-text-muted">{snippet.description}</div>
                  </div>
                  <span className="text-xs text-tap-orange">{snippet.prefix}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileTreeNode({
  node,
  depth,
  expandedDirs,
  onToggle,
  onOpen,
}: {
  node: FileNode;
  depth: number;
  expandedDirs: Set<string>;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
}) {
  const isDir = node.type === 'directory';
  const expanded = expandedDirs.has(node.path);

  return (
    <>
      <button
        onClick={() => (isDir ? onToggle(node.path) : onOpen(node.path))}
        className="flex w-full items-center gap-1 rounded px-1 py-1 text-xs hover:bg-surface-2"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isDir && (
          <Icon
            name="chevron"
            size={12}
            className={`text-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        )}
        <Icon name={isDir ? 'folder' : 'file'} size={14} className="text-text-muted" />
        <span className="truncate">{node.name}</span>
      </button>
      {isDir &&
        expanded &&
        node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedDirs={expandedDirs}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}
    </>
  );
}
