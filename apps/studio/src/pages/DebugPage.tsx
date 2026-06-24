import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Icon } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { debugService } from '@tapdev/core';
import { useEffect, useState } from 'react';
import type { DebugLogEntry } from '@tapdev/types';

export function DebugPage() {
  const { debugSession, debugLogs, startDebug, stopDebug, clearDebugLogs, currentProject } =
    useAppStore();
  const [logs, setLogs] = useState<DebugLogEntry[]>(debugLogs);

  useEffect(() => {
    setLogs(debugService.getLogs());
    const interval = setInterval(() => setLogs(debugService.getLogs()), 1000);
    return () => clearInterval(interval);
  }, [debugSession]);

  const isRunning = debugService.isServerRunning();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">调试工具</h2>
          <p className="text-sm text-text-secondary">本地服务器调试 + 真机扫码测试</p>
        </div>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={() => startDebug()} disabled={!currentProject}>
              <Icon name="play" size={14} /> 启动调试服务器
            </Button>
          ) : (
            <Button variant="danger" onClick={() => stopDebug()}>
              <Icon name="stop" size={14} /> 停止
            </Button>
          )}
          <Button variant="secondary" onClick={() => clearDebugLogs()}>
            清空日志
          </Button>
        </div>
      </div>

      <Tabs defaultValue="console" className="flex flex-1 flex-col overflow-hidden">
        <TabsList>
          <TabsTrigger value="console">控制台</TabsTrigger>
          <TabsTrigger value="server">调试服务器</TabsTrigger>
          <TabsTrigger value="breakpoints">断点</TabsTrigger>
        </TabsList>

        <TabsContent value="console" className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto rounded-lg border border-border bg-surface-1 p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-text-muted">暂无日志，启动调试服务器后开始记录</p>
            ) : (
              logs.map((log) => (
                <LogLine key={log.id} log={log} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="server">
          <div className="grid gap-4 md:grid-cols-2">
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
        </TabsContent>

        <TabsContent value="breakpoints">
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            {debugSession?.breakpoints.length ? (
              <ul className="space-y-2">
                {debugSession.breakpoints.map((bp) => (
                  <li key={bp.id} className="flex items-center gap-2 text-sm">
                    <Badge variant={bp.enabled ? 'info' : 'default'}>
                      {bp.enabled ? '启用' : '禁用'}
                    </Badge>
                    <span>
                      {bp.file}:{bp.line}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">
                在编辑器中点击行号设置断点，或在代码中右键添加
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
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

  const time = new Date(log.timestamp).toLocaleTimeString();
  return (
    <div className={`py-0.5 ${colors[log.level]}`}>
      <span className="text-text-muted">[{time}]</span>{' '}
      <span className="uppercase">[{log.level}]</span> {log.message}
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
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <h3 className="mb-3 text-sm font-semibold">服务器状态</h3>
      <div className="space-y-2 text-sm">
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
      </div>
    </div>
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
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <h3 className="mb-3 text-sm font-semibold">真机调试</h3>
      {isRunning && url ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-44 w-44 items-center justify-center rounded-lg bg-white p-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="调试二维码" className="h-full w-full" />
            ) : (
              <QRPlaceholder url={url} />
            )}
          </div>
          <p className="text-center text-xs text-text-muted">
            使用 TapTap App 扫描二维码进行真机调试
          </p>
          <Badge variant={gameConnected ? 'success' : 'default'}>
            {gameConnected ? '游戏已连接' : '等待游戏连接...'}
          </Badge>
        </div>
      ) : (
        <p className="text-sm text-text-muted">启动调试服务器后生成二维码</p>
      )}
    </div>
  );
}

function QRPlaceholder({ url }: { url: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-36 w-36">
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
