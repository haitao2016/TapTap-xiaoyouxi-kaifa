import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Icon, Card, CardHeader, CardTitle, CardContent } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { debugService, callStackService } from '@tapdev/core';
import { useEffect, useState, useRef } from 'react';
import type { DebugLogEntry, LogLevel } from '@tapdev/types';
import type { StackFrame } from '@tapdev/core';

interface WatchVariable {
  id: string;
  name: string;
  value: string;
  type: string;
  expanded?: boolean;
  children?: WatchVariable[];
}

export function DebugPage() {
  const { debugSession, debugLogs, startDebug, stopDebug, clearDebugLogs, currentProject } =
    useAppStore();
  const [logs, setLogs] = useState<DebugLogEntry[]>(debugLogs);
  const [logFilter, setLogFilter] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [callStack, setCallStack] = useState<StackFrame[]>([]);
  const [watchVariables, setWatchVariables] = useState<WatchVariable[]>([
    {
      id: '1',
      name: 'gameState',
      value: '"playing"',
      type: 'string',
    },
    {
      id: '2',
      name: 'player',
      value: 'Object',
      type: 'object',
      expanded: false,
      children: [
        { id: '2-1', name: 'position', value: '{x: 0, y: 0, z: 0}', type: 'Vector3' },
        { id: '2-2', name: 'health', value: '100', type: 'number' },
        { id: '2-3', name: 'speed', value: '5.0', type: 'number' },
      ],
    },
    {
      id: '3',
      name: 'score',
      value: '0',
      type: 'number',
    },
    {
      id: '4',
      name: 'level',
      value: '1',
      type: 'number',
    },
  ]);
  const [newWatchExpr, setNewWatchExpr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(debugService.getLogs());
    const interval = setInterval(() => {
      const newLogs = debugService.getLogs();
      setLogs(newLogs);
      setCallStack(callStackService.getFrames());
      
      if (autoScroll && logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [debugSession, autoScroll]);

  const isRunning = debugService.isServerRunning();

  const filteredLogs = logs.filter((log) => {
    if (logFilter !== 'all' && log.level !== logFilter) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleStartDebug = async () => {
    try {
      setLoading(true);
      setError(null);
      await startDebug();
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动调试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStopDebug = async () => {
    try {
      setLoading(true);
      setError(null);
      await stopDebug();
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止调试失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchVariable = (id: string) => {
    const toggle = (vars: WatchVariable[]): WatchVariable[] => {
      return vars.map((v) => {
        if (v.id === id) {
          return { ...v, expanded: !v.expanded };
        }
        if (v.children) {
          return { ...v, children: toggle(v.children) };
        }
        return v;
      });
    };
    setWatchVariables(toggle(watchVariables));
  };

  const addWatchVariable = () => {
    if (!newWatchExpr.trim()) return;
    const newVar: WatchVariable = {
      id: `watch-${Date.now()}`,
      name: newWatchExpr,
      value: 'undefined',
      type: 'unknown',
    };
    setWatchVariables([...watchVariables, newVar]);
    setNewWatchExpr('');
  };

  const removeWatchVariable = (id: string) => {
    const remove = (vars: WatchVariable[]): WatchVariable[] => {
      return vars
        .filter((v) => v.id !== id)
        .map((v) => ({
          ...v,
          children: v.children ? remove(v.children) : undefined,
        }));
    };
    setWatchVariables(remove(watchVariables));
  };

  const logLevelCounts = {
    all: logs.length,
    debug: logs.filter((l) => l.level === 'debug').length,
    info: logs.filter((l) => l.level === 'info').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    error: logs.filter((l) => l.level === 'error').length,
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {error && (
        <div className="flex items-center justify-between border-b border-red-500/50 bg-red-500/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <Icon name="alert" size={16} className="text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">调试工具</h2>
          <p className="text-sm text-text-secondary">本地服务器调试 + 真机扫码测试</p>
        </div>
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <Button onClick={handleStartDebug} disabled={!currentProject || loading}>
              <Icon name="play" size={14} /> {loading ? '启动中...' : '启动调试服务器'}
            </Button>
          ) : (
            <Button variant="danger" onClick={handleStopDebug} disabled={loading}>
              <Icon name="stop" size={14} /> {loading ? '停止中...' : '停止'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => clearDebugLogs()}>
            清空日志
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-1 px-3 py-2">
            <div className="flex gap-1">
              {(['all', 'debug', 'info', 'warn', 'error'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setLogFilter(level)}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    logFilter === level
                      ? 'bg-tap-orange/20 text-tap-orange'
                      : 'text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  {level === 'all' ? '全部' : level.toUpperCase()}
                  <span className="ml-1 text-text-muted">
                    {logLevelCounts[level]}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="relative">
              <Icon
                name="search"
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="过滤日志..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 rounded border border-border bg-surface-0 py-1 pl-7 pr-2 text-xs focus:border-tap-orange focus:outline-none"
              />
            </div>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                autoScroll ? 'text-tap-orange' : 'text-text-secondary hover:bg-surface-2'
              }`}
            >
              <Icon name="arrow-down" size={12} />
              自动滚动
            </button>
          </div>

          <div
            ref={logContainerRef}
            className="flex-1 overflow-auto bg-surface-1 p-2 font-mono text-xs"
          >
            {filteredLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Icon name="terminal" size={32} className="mx-auto mb-2 text-text-muted" />
                  <p className="text-text-muted">
                    {logs.length === 0 ? '暂无日志，启动调试服务器后开始记录' : '没有匹配的日志'}
                  </p>
                </div>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <LogLine key={log.id} log={log} />
              ))
            )}
          </div>
        </div>

        <div className="hidden w-72 flex-col border-l border-border lg:flex">
          <Tabs defaultValue="watch" className="flex flex-1 flex-col">
            <TabsList className="justify-start border-b border-border">
              <TabsTrigger value="watch">监视</TabsTrigger>
              <TabsTrigger value="callstack">调用栈</TabsTrigger>
              <TabsTrigger value="breakpoints">断点</TabsTrigger>
            </TabsList>

            <TabsContent value="watch" className="flex-1 overflow-auto p-0">
              <div className="border-b border-border p-2">
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="添加监视表达式..."
                    value={newWatchExpr}
                    onChange={(e) => setNewWatchExpr(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addWatchVariable()}
                    className="flex-1 rounded border border-border bg-surface-0 px-2 py-1 text-xs focus:border-tap-orange focus:outline-none"
                  />
                  <Button size="sm" onClick={addWatchVariable}>
                    <Icon name="plus" size={12} />
                  </Button>
                </div>
              </div>
              <div className="p-1">
                {watchVariables.length === 0 ? (
                  <p className="p-3 text-center text-xs text-text-muted">暂无监视变量</p>
                ) : (
                  <div className="space-y-0.5">
                    {watchVariables.map((variable) => (
                      <WatchVariableItem
                        variable={variable}
                        depth={0}
                        onToggle={toggleWatchVariable}
                        onRemove={removeWatchVariable}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="callstack" className="flex-1 overflow-auto p-0">
              <div className="p-2">
                {callStack.length === 0 ? (
                  <div className="py-4 text-center">
                    <Icon name="layers" size={24} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-xs text-text-muted">
                      {isRunning ? '等待断点触发后显示调用栈' : '启动调试后显示调用栈'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {callStack.map((frame, index) => (
                      <li
                        key={frame.id}
                        className={`cursor-pointer rounded px-2 py-1.5 text-xs ${
                          index === 0 ? 'bg-tap-orange/10 text-tap-orange' : 'hover:bg-surface-2'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate font-medium">{frame.functionName}</span>
                          <span className="shrink-0 text-text-muted">{index}</span>
                        </div>
                        <div className="truncate text-text-muted">
                          {frame.fileName}:{frame.lineNumber}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="breakpoints" className="flex-1 overflow-auto p-0">
              <div className="p-2">
                {debugSession?.breakpoints.length ? (
                  <ul className="space-y-1">
                    {debugSession.breakpoints.map((bp) => (
                      <li
                        key={bp.id}
                        className="flex items-center justify-between rounded bg-surface-2 px-2 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={bp.enabled ? 'info' : 'default'} className="shrink-0">
                            {bp.enabled ? '启用' : '禁用'}
                          </Badge>
                          <span className="truncate">
                            {bp.file}:{bp.line}
                          </span>
                        </div>
                        <button className="text-text-muted hover:text-text-primary">
                          <Icon name="close" size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-4 text-center">
                    <Icon name="flag" size={24} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-xs text-text-muted">在编辑器中点击行号设置断点</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="border-t border-border bg-surface-1 px-4 py-2">
        <div className="grid gap-4 md:grid-cols-2 lg:hidden">
          <ServerStatusCard
            isRunning={isRunning}
            port={debugSession?.serverPort}
            url={debugSession?.qrCodeUrl}
          />
          <QRCodeCard
            url={debugSession?.qrCodeUrl}
            qrDataUrl={debugSession?.qrCodeDataUrl}
            gameConnected={debugSession?.gameConnected}
            isRunning={isRunning}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span>
              <Badge variant={isRunning ? 'success' : 'default'} className="mr-1">
                {isRunning ? '运行中' : '已停止'}
              </Badge>
              调试服务器
            </span>
            {debugSession?.serverPort && <span>端口: {debugSession.serverPort}</span>}
            {debugSession?.gameConnected !== undefined && (
              <span>
                游戏状态:{' '}
                <Badge variant={debugSession.gameConnected ? 'success' : 'default'}>
                  {debugSession.gameConnected ? '已连接' : '未连接'}
                </Badge>
              </span>
            )}
          </div>
          <span>{filteredLogs.length} 条日志</span>
        </div>
      </div>
    </div>
  );
}

function LogLine({ log }: { log: DebugLogEntry }) {
  const colors: Record<string, string> = {
    debug: 'text-text-muted',
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  const bgColors: Record<string, string> = {
    debug: '',
    info: '',
    warn: 'bg-yellow-500/5',
    error: 'bg-red-500/5',
  };

  const time = new Date(log.timestamp).toLocaleTimeString();
  return (
    <div className={`px-2 py-0.5 ${colors[log.level]} ${bgColors[log.level]} rounded`}>
      <span className="text-text-muted">[{time}]</span>{' '}
      <span className="uppercase font-medium">[{log.level}]</span>{' '}
      <span className="text-text-primary">{log.message}</span>
      {log.source && <span className="text-text-muted ml-2">({log.source})</span>}
    </div>
  );
}

function WatchVariableItem({
  variable,
  depth,
  onToggle,
  onRemove,
}: {
  variable: WatchVariable;
  depth: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const hasChildren = variable.children && variable.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-surface-2"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(variable.id)}
            className="text-text-muted hover:text-text-primary"
          >
            <Icon
              name="chevron"
              size={10}
              className={`transition-transform ${variable.expanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span className="w-2.5" />
        )}
        <span className="truncate text-text-primary">{variable.name}</span>
        <span className="text-text-muted">:</span>
        <span className="truncate text-text-secondary">{variable.value}</span>
        <span className="ml-auto shrink-0 text-text-muted opacity-0 group-hover:opacity-100">
          <button onClick={() => onRemove(variable.id)} className="hover:text-red-400">
            <Icon name="close" size={10} />
          </button>
        </span>
      </div>
      {hasChildren && variable.expanded && (
        <div>
          {variable.children!.map((child) => (
            <WatchVariableItem
              key={child.id}
              variable={child}
              depth={depth + 1}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServerStatusCard({
  isRunning,
  port,
  url,
}: {
  isRunning: boolean;
  port?: number;
  url?: string;
}) {
  return (
    <Card>
      <CardHeader>
      <CardTitle className="text-sm">服务器状态</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">状态</span>
          <Badge variant={isRunning ? 'success' : 'default'}>
            {isRunning ? '运行中' : '已停止'}
          </Badge>
        </div>
        {port && (
          <div className="flex justify-between">
            <span className="text-text-muted">端口</span>
            <span>{port}</span>
          </div>
        )}
        {url && (
          <div className="flex justify-between">
            <span className="text-text-muted">调试 URL</span>
            <span className="truncate text-tap-orange">{url}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QRCodeCard({
  url,
  qrDataUrl,
  gameConnected,
  isRunning,
}: {
  url?: string;
  qrDataUrl?: string;
  gameConnected?: boolean;
  isRunning: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">真机调试</CardTitle>
      </CardHeader>
      <CardContent>
        {isRunning && url ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-white p-2">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="调试二维码" className="h-full w-full" />
              ) : (
                <QRPlaceholder url={url} />
              )}
            </div>
            <p className="text-center text-xs text-text-muted">
              使用 TapTap App 扫描二维码
            </p>
            <Badge variant={gameConnected ? 'success' : 'default'}>
              {gameConnected ? '游戏已连接' : '等待连接...'}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-text-muted">启动调试服务器后生成二维码</p>
        )}
      </CardContent>
    </Card>
  );
}

function QRPlaceholder({ url }: { url: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24">
      <rect width="100" height="100" fill="white" />
      {Array.from({ length: 10 }).map((_, row) =>
        Array.from({ length: 10 }).map((_, col) => {
          const hash = (url.charCodeAt((row * 10 + col) % url.length) + row * col) % 2;
          return hash ? (
            <rect
              key={`${row}-${col}`}
              x={col * 10}
              y={row * 10}
              width="9"
              height="9"
              fill="black"
            />
          ) : null;
        })
      )}
    </svg>
  );
}
