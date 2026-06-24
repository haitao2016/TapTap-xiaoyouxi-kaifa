import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { monitorService } from '@tapdev/core';
import { useEffect, useState } from 'react';
import type { PerformanceMetrics, NetworkRequestInfo, MonitorStats } from '@tapdev/types';

export function MonitorPage() {
  const { isMonitoring, monitorAlerts, startMonitor, stopMonitor, resolveAlert } = useAppStore();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequestInfo[]>([]);
  const [stats, setStats] = useState<MonitorStats | null>(null);

  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      setMetrics(monitorService.getLatestMetrics());
      setHistory(monitorService.getMetricsHistory());
      setNetworkRequests(monitorService.getRecentRequests(20));
      setStats(monitorService.getStats());
    }, 1000);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  const avgFps = monitorService.getAverageFps();
  const memoryPercent = metrics
    ? ((metrics.memory / metrics.memoryLimit) * 100).toFixed(1)
    : '0';

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">性能监控</h2>
          <p className="text-sm text-text-secondary">实时 FPS、内存、网络指标追踪</p>
        </div>
        <div className="flex gap-2">
          {!isMonitoring ? (
            <Button onClick={() => startMonitor()}>开始监控</Button>
          ) : (
            <Button variant="danger" onClick={() => stopMonitor()}>
              停止监控
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="flex items-center gap-4 rounded-xl bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">运行时间</span>
            <span className="font-mono text-sm">{formatTime(stats.uptime)}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">总请求</span>
            <span className="font-mono text-sm">{stats.totalRequests}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">失败</span>
            <Badge variant={stats.failedRequests > 0 ? 'error' : 'success'}>
              {stats.failedRequests}
            </Badge>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard
          label="FPS"
          value={metrics?.fps ?? '--'}
          sub={`平均: ${avgFps.toFixed(0)}`}
          status={metrics && metrics.fps < 30 ? 'warning' : metrics && metrics.fps < 50 ? 'info' : 'ok'}
        />
        <MetricCard
          label="内存"
          value={metrics ? `${(metrics.memory / 1024 / 1024).toFixed(0)} MB` : '--'}
          sub={`使用率: ${memoryPercent}%`}
          status={parseFloat(memoryPercent) > 85 ? 'critical' : parseFloat(memoryPercent) > 70 ? 'warning' : 'ok'}
        />
        <MetricCard
          label="CPU"
          value={metrics?.cpuUsage ?? '--'}
          unit="%"
          sub="处理器使用率"
          status={metrics && metrics.cpuUsage && metrics.cpuUsage > 90 ? 'critical' : metrics && metrics.cpuUsage && metrics.cpuUsage > 70 ? 'warning' : 'ok'}
        />
        <MetricCard
          label="GPU内存"
          value={metrics?.gpuMemory ? `${(metrics.gpuMemory / 1024 / 1024).toFixed(0)} MB` : '--'}
          sub="显存使用"
        />
        <MetricCard
          label="Draw Calls"
          value={metrics?.drawCalls ?? '--'}
          sub="渲染批次"
        />
        <MetricCard
          label="延迟"
          value={metrics?.networkLatency ?? '--'}
          unit="ms"
          sub="网络延迟"
          status={metrics && metrics.networkLatency && metrics.networkLatency > 2000 ? 'warning' : 'ok'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>FPS 趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <FPSChart data={history} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>内存使用趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <MemoryChart data={history} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            网络请求
            <Badge variant="default" className="ml-2">
              {networkRequests.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {networkRequests.length === 0 ? (
            <p className="text-sm text-text-muted">暂无网络请求记录</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {networkRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant={
                        req.status >= 400 ? 'error' : req.status >= 300 ? 'warning' : 'success'
                      }
                      className="shrink-0"
                    >
                      {req.status}
                    </Badge>
                    <span className="shrink-0 font-mono text-xs">{req.method}</span>
                    <span className="truncate text-text-secondary">{req.url}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-text-muted">{req.duration}ms</span>
                    <span className="text-xs text-text-muted">{formatSize(req.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            告警
            {monitorAlerts.filter((a) => !a.resolved).length > 0 && (
              <Badge variant="warning" className="ml-2">
                {monitorAlerts.filter((a) => !a.resolved).length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monitorAlerts.length === 0 ? (
            <p className="text-sm text-text-muted">暂无告警</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {monitorAlerts.slice(-15).reverse().map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        alert.severity === 'critical'
                          ? 'error'
                          : alert.severity === 'warning'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {alert.type}
                    </Badge>
                    <span className={alert.resolved ? 'text-text-muted line-through' : ''}>
                      {alert.message}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                    {!alert.resolved && (
                      <Button size="sm" variant="ghost" onClick={() => resolveAlert(alert.id)}>
                        忽略
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  status = 'ok',
  unit = '',
}: {
  label: string;
  value: string | number;
  sub?: string;
  status?: 'ok' | 'info' | 'warning' | 'critical';
  unit?: string;
}) {
  const borderColors = {
    ok: 'border-border',
    info: 'border-blue-600/50',
    warning: 'border-yellow-600/50',
    critical: 'border-red-600/50',
  };

  const bgColors = {
    ok: '',
    info: 'bg-blue-500/5',
    warning: 'bg-yellow-500/5',
    critical: 'bg-red-500/5',
  };

  return (
    <div className={`rounded-xl border ${borderColors[status]} ${bgColors[status]} p-4`}>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-xs text-text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

function FPSChart({ data }: { data: PerformanceMetrics[] }) {
  const recent = data.slice(-60);
  const maxFps = 70;

  if (recent.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-muted">
        开始监控后显示 FPS 趋势图
      </div>
    );
  }

  const points = recent
    .map((m, i) => {
      const x = (i / Math.max(recent.length - 1, 1)) * 100;
      const y = 100 - (m.fps / maxFps) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const avgPoints = recent
    .reduce((acc, m, i) => {
      const x = (i / Math.max(recent.length - 1, 1)) * 100;
      const avgFps = recent.slice(0, i + 1).reduce((sum, m) => sum + m.fps, 0) / (i + 1);
      const y = 100 - (avgFps / maxFps) * 100;
      return `${acc} ${x},${y}`;
    }, '')
    .trim();

  return (
    <svg viewBox="0 0 100 100" className="h-32 w-full" preserveAspectRatio="none">
      <line x1="0" y1="57" x2="100" y2="57" stroke="#2e2e38" strokeWidth="0.3" strokeDasharray="2" />
      <line x1="0" y1="28" x2="100" y2="28" stroke="#2e2e38" strokeWidth="0.2" strokeDasharray="1" />
      <polyline fill="none" stroke="#ff6b00" strokeWidth="0.8" points={points} />
      <polyline fill="none" stroke="#6b6b7b" strokeWidth="0.5" strokeDasharray="2" points={avgPoints} />
      <text x="2" y="55" fill="#6b6b7b" fontSize="4">30</text>
      <text x="2" y="26" fill="#6b6b7b" fontSize="4">60</text>
    </svg>
  );
}

function MemoryChart({ data }: { data: PerformanceMetrics[] }) {
  const recent = data.slice(-60);

  if (recent.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-muted">
        开始监控后显示内存趋势图
      </div>
    );
  }

  const maxMemory = 512 * 1024 * 1024;

  const points = recent
    .map((m, i) => {
      const x = (i / Math.max(recent.length - 1, 1)) * 100;
      const y = 100 - (m.memory / maxMemory) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <svg viewBox="0 0 100 100" className="h-32 w-full" preserveAspectRatio="none">
      <line x1="0" y1="15" x2="100" y2="15" stroke="#2e2e38" strokeWidth="0.3" strokeDasharray="2" />
      <polygon fill="rgba(99, 102, 241, 0.1)" points={areaPoints} />
      <polyline fill="none" stroke="#6366f1" strokeWidth="0.8" points={points} />
      <text x="2" y="13" fill="#6b6b7b" fontSize="4">85%</text>
    </svg>
  );
}