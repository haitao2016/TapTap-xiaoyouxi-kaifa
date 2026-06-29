import { useAppStore } from '../store/app-store';
import { projectManager, snippetService, formatService } from '@tapdev/core';
import { Icon, Button, Badge } from '@tapdev/ui';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { FileNode, Snippet } from '@tapdev/types';
import { useState, useEffect, useCallback, useRef } from 'react';
import { registerSnippets } from '../lib/monaco-snippets';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formatting, setFormatting] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const monacoInstance = useMonaco();

  useEffect(() => {
    if (monacoInstance) {
      registerSnippets(monacoInstance);

      monacoInstance.editor.defineTheme('tapdev-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0d0d0f',
          'editor.foreground': '#f0f0f5',
          'editor.selectionBackground': '#264f78',
          'editor.lineHighlightBackground': '#16161a',
          'editorCursor.foreground': '#ff6b00',
          'editorWhitespace.foreground': '#2e2e38',
          'editorIndentGuide.background': '#2e2e38',
          'editorIndentGuide.activeBackground': '#6b6b7b',
        },
      });
    }
  }, [monacoInstance]);

  const handleEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorSelection((event: monaco.editor.ICursorSelectionChangedEvent) => {
      const selections = editor.getSelections();
      setCursorCount(selections?.length || 1);

      const position = editor.getPosition();
      if (position) {
        setCursorPosition({ line: position.lineNumber, column: position.column });
      }
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

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      setShowSnippets(true);
      setSnippets(snippetService.getSnippets());
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      handleFormat();
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

  const handleSnippetSelect = useCallback(
    (snippet: Snippet) => {
      const activeTab = editorTabs.find((t) => t.id === activeTabId);
      if (activeTab && editorRef.current) {
        const editor = editorRef.current;
        const body = snippet.body.join('\n');
        const insertText = body.replace(
          /\${(\d+):([^}]*)}/g,
          (_, num, defaultValue) => defaultValue
        );

        const selection = editor.getSelection();
        if (selection) {
          const model = editor.getModel();
          if (model) {
            model.applyEdits([
              {
                range: new monaco.Range(
                  selection.startLineNumber,
                  selection.startColumn,
                  selection.endLineNumber,
                  selection.endColumn
                ),
                text: insertText,
              },
            ]);
          }
        }
        updateTabContent(activeTab.id, editor.getModel()?.getValue() || '');
      }
      setShowSnippets(false);
      setSnippetQuery('');
    },
    [activeTabId, editorTabs, updateTabContent]
  );

  useEffect(() => {
    const filtered = snippetService.searchSnippets(snippetQuery);
    setSnippets(filtered);
  }, [snippetQuery]);

  const handleFormat = async () => {
    const activeTab = editorTabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    try {
      setFormatting(true);
      setError(null);

      const result = formatService.format(activeTab.content, activeTab.language, {
        tabSize: settings.editorTabSize,
        printWidth: 100,
        semi: true,
        singleQuote: false,
        trailingComma: 'es5',
      });

      if (result.success) {
        updateTabContent(activeTab.id, result.code);
        if (editorRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            model.setValue(result.code);
          }
        }
      } else {
        setError(result.error || '格式化失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '格式化失败');
    } finally {
      setFormatting(false);
    }
  };

  const handleSave = () => {
    const activeTab = editorTabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    try {
      setError(null);
      if (activeTab.modified) {
        updateTabContent(activeTab.id, activeTab.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <Icon name="folder" size={48} className="text-text-muted" />
        <div>
          <h3 className="text-lg font-medium">请先打开项目</h3>
          <p className="mt-1 text-sm text-text-secondary">从工作台打开或创建一个项目</p>
        </div>
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

  const handleOpenFile = (path: string) => {
    try {
      setError(null);
      setLoading(true);
      openFile(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : '打开文件失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]" onKeyDown={handleKeyDown}>
      {error && (
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2">
          <Icon name="alert" size={14} className="text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <Icon name="close" size={12} />
          </button>
        </div>
      )}

      <div
        className={`flex flex-col border-r border-border bg-surface-1 transition-all duration-200 ${
          sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-text-muted">资源管理器</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-text-muted hover:bg-surface-2 hover:text-text-primary"
          >
            <Icon name="chevron" size={12} className="rotate-180" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-1">
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedDirs={expandedDirs}
              onToggle={toggleDir}
              onOpen={handleOpenFile}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {editorTabs.length > 0 && (
          <div className="flex items-center border-b border-border bg-surface-1">
            <div className="flex flex-1 overflow-x-auto">
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
            </div>
            <div className="flex shrink-0 items-center gap-1 px-2">
              {activeTab && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSave}
                    disabled={!activeTab.modified}
                    title="保存 (Ctrl+S)"
                  >
                    <Icon name="save" size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleFormat}
                    disabled={formatting}
                    title="格式化 (Shift+Alt+F)"
                  >
                    <Icon name="format" size={14} />
                  </Button>
                </>
              )}
              {!sidebarOpen && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSidebarOpen(true)}
                  title="显示资源管理器"
                >
                  <Icon name="files" size={14} />
                </Button>
              )}
            </div>
          </div>
        )}

        {activeTab ? (
          <>
            {loading && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30">
                <div className="rounded-lg bg-surface-1 p-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-tap-orange border-t-transparent" />
                </div>
              </div>
            )}
            <Editor
              height="100%"
              language={activeTab.language}
              value={activeTab.content}
              theme="tapdev-dark"
              onChange={(value) => updateTabContent(activeTab.id, value ?? '')}
              onMount={handleEditorMount}
              loading={
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-tap-orange border-t-transparent" />
                    <p className="text-xs text-text-muted">加载编辑器...</p>
                  </div>
                </div>
              }
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
                fixedOverflowWidgets: true,
                snippetSuggestions: 'inline',
                quickSuggestions: {
                  other: true,
                  comments: true,
                  strings: true,
                },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
            <div className="flex items-center justify-between border-t border-border px-3 py-1 text-xs text-text-muted bg-surface-1">
              <div className="flex items-center gap-4">
                <span className="truncate max-w-[200px]">{activeTab.name}</span>
                <span className="hidden sm:inline">{activeTab.language}</span>
                {activeTab.modified && (
                  <Badge variant="warning" className="hidden sm:inline-flex">
                    未保存
                  </Badge>
                )}
                {formatting && (
                  <Badge variant="info" className="hidden sm:inline-flex">
                    格式化中...
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline">按 Ctrl+Shift+P 打开命令面板</span>
                <span>
                  行 {cursorPosition.line}, 列 {cursorPosition.column}
                </span>
                {cursorCount > 1 && (
                  <span className="flex items-center gap-1">
                    <Icon name="cursor" size={12} />
                    {cursorCount}
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-text-muted">
            <Icon name="file" size={48} />
            <div className="text-center">
              <p className="text-sm">从左侧选择文件开始编辑</p>
              <p className="mt-1 text-xs">支持 C#, TypeScript, JavaScript, JSON, HTML, CSS 等</p>
            </div>
            <div className="flex gap-2">
              {!sidebarOpen && (
                <Button size="sm" onClick={() => setSidebarOpen(true)}>
                  <Icon name="files" size={14} /> 显示文件树
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {showSnippets && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50"
          onClick={() => setShowSnippets(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-surface-0 shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-4 py-3">
              <input
                type="text"
                placeholder="搜索代码片段 (Ctrl+空格)..."
                value={snippetQuery}
                onChange={(e) => setSnippetQuery(e.target.value)}
                className="w-full bg-transparent text-text-primary placeholder:text-text-muted outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-auto">
              {snippets.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-muted">未找到匹配的代码片段</div>
              ) : (
                snippets.map((snippet) => (
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
                ))
              )}
            </div>
            <div className="border-t border-border px-4 py-2 text-xs text-text-muted">
              <div className="flex items-center justify-between">
                <span>↑↓ 选择 · Enter 插入 · Esc 关闭</span>
                <span>{snippets.length} 个片段</span>
              </div>
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

  const getFileIcon = (ext?: string) => {
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'cs':
        return 'csharp';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'md':
        return 'markdown';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return 'image';
      default:
        return 'file';
    }
  };

  const getIconColor = (ext?: string) => {
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'text-blue-400';
      case 'js':
      case 'jsx':
        return 'text-yellow-400';
      case 'cs':
        return 'text-purple-400';
      case 'json':
        return 'text-orange-300';
      case 'css':
        return 'text-blue-300';
      case 'html':
        return 'text-orange-400';
      case 'md':
        return 'text-text-muted';
      default:
        return 'text-text-muted';
    }
  };

  return (
    <>
      <button
        onClick={() => (isDir ? onToggle(node.path) : onOpen(node.path))}
        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors hover:bg-surface-2"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={node.path}
      >
        {isDir ? (
          <Icon
            name="chevron"
            size={10}
            className={`text-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <div className="w-2.5" />
        )}
        <Icon
          name={isDir ? (expanded ? 'folder-open' : 'folder') : getFileIcon(node.extension)}
          size={14}
          className={isDir ? 'text-tap-orange' : getIconColor(node.extension)}
        />
        <span className={`truncate ${isDir ? 'font-medium' : 'text-text-secondary'}`}>
          {node.name}
        </span>
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
