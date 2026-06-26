import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Icon,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { monitorService } from '@tapdev/core';
import { useEffect, useState } from 'react';
import type {
  PerformanceMetrics,
  NetworkRequestInfo,
  MonitorStats,
  MonitorAlert,
} from '@tapdev/types';

export function MonitorPage() {
  const { isMonitoring, monitorAlerts, startMonitor, stopMonitor, resolveAlert } = useAppStore();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequestInfo[]>([]);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<'all' | 'active' | 'resolved'>('active');

  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      try {
        setMetrics(monitorService.getLatestMetrics());
        setHistory(monitorService.getMetricsHistory());
        setNetworkRequests(monitorService.getRecentRequests(20));
        setStats(monitorService.getStats());
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取监控数据失败');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  const handleStartMonitor = () => {
    try {
      setLoading(true);
      setError(null);
      startMonitor();
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动监控失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonitor = () => {
    try {
      setLoading(true);
      setError(null);
      stopMonitor();
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止监控失败');
    } finally {
      setLoading(false);
    }
  };

  const avgFps = monitorService.getAverageFps();
  const memoryPercent = metrics ? ((metrics.memory / metrics.memoryLimit) * 100).toFixed(1) : '0';

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

  const filteredAlerts = monitorAlerts.filter((alert) => {
    if (alertFilter === 'active') return !alert.resolved;
    if (alertFilter === 'resolved') return alert.resolved;
    return true;
  });

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
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
          <h2 className="text-lg font-semibold">性能监控</h2>
          <p className="text-sm text-text-secondary">实时 FPS、内存、网络指标追踪</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isMonitoring ? 'success' : 'default'} className="hidden sm:inline-flex">
            <span
              className={`mr-1 h-1.5 w-1.5 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-text-muted'}`}
            />
            {isMonitoring ? '监控中' : '未启动'}
          </Badge>
          {!isMonitoring ? (
            <Button onClick={handleStartMonitor} disabled={loading}>
              <Icon name="play" size={14} /> {loading ? '启动中...' : '开始监控'}
            </Button>
          ) : (
            <Button variant="danger" onClick={handleStopMonitor} disabled={loading}>
              <Icon name="stop" size={14} /> {loading ? '停止中...' : '停止监控'}
            </Button>
          )}
        </div>
      </div>

      {stats && isMonitoring && (
        <div className="flex flex-wrap items-center gap-4 border-b border-border bg-surface-1 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Icon name="clock" size={12} className="text-text-muted" />
            <span className="text-text-muted">运行时间</span>
            <span className="font-mono font-medium">{formatTime(stats.uptime)}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-text-muted">总请求</span>
            <span className="font-mono font-medium">{stats.totalRequests}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-text-muted">失败</span>
            <Badge variant={stats.failedRequests > 0 ? 'error' : 'success'}>
              {stats.failedRequests}
            </Badge>
          </div>
          <div className="h-3 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2 hidden sm:flex">
            <span className="text-text-muted">平均 FPS</span>
            <span className="font-mono font-medium">{avgFps.toFixed(0)}</span>
          </div>
          <div className="h-3 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2 hidden sm:flex">
            <span className="text-text-muted">平均延迟</span>
            <span className="font-mono font-medium">{stats.avgLatency.toFixed(0)}ms</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="FPS"
            value={metrics?.fps ?? '--'}
            sub={`平均: ${avgFps.toFixed(0)}`}
            status={
              metrics && metrics.fps < 30 ? 'warning' : metrics && metrics.fps < 50 ? 'info' : 'ok'
            }
            icon="activity"
          />
          <MetricCard
            label="内存"
            value={metrics ? `${(metrics.memory / 1024 / 1024).toFixed(0)} MB` : '--'}
            sub={`使用率: ${memoryPercent}%`}
            status={
              parseFloat(memoryPercent) > 85
                ? 'critical'
                : parseFloat(memoryPercent) > 70
                  ? 'warning'
                  : 'ok'
            }
            icon="hard-drive"
          />
          <MetricCard
            label="CPU"
            value={metrics?.cpuUsage ?? '--'}
            unit="%"
            sub="处理器使用率"
            status={
              metrics && metrics.cpuUsage && metrics.cpuUsage > 90
                ? 'critical'
                : metrics && metrics.cpuUsage && metrics.cpuUsage > 70
                  ? 'warning'
                  : 'ok'
            }
            icon="cpu"
          />
          <MetricCard
            label="GPU内存"
            value={metrics?.gpuMemory ? `${(metrics.gpuMemory / 1024 / 1024).toFixed(0)} MB` : '--'}
            sub="显存使用"
            icon="gpu"
          />
          <MetricCard
            label="Draw Calls"
            value={metrics?.drawCalls ?? '--'}
            sub="渲染批次"
            icon="layers"
          />
          <MetricCard
            label="延迟"
            value={metrics?.networkLatency ?? '--'}
            unit="ms"
            sub="网络延迟"
            status={
              metrics && metrics.networkLatency && metrics.networkLatency > 2000 ? 'warning' : 'ok'
            }
            icon="wifi"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="network">网络请求</TabsTrigger>
            <TabsTrigger value="alerts">告警</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="activity" size={16} className="text-tap-orange" />
                    FPS 趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FPSChart data={history} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="hard-drive" size={16} className="text-blue-400" />
                    内存使用趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MemoryChart data={history} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="cpu" size={16} className="text-green-400" />
                    CPU 使用趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CPUChart data={history} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="wifi" size={16} className="text-purple-400" />
                    网络延迟趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LatencyChart data={history} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="network" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="globe" size={16} className="text-tap-orange" />
                    网络请求
                  </div>
                  <Badge variant="default">{networkRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {networkRequests.length === 0 ? (
                  <div className="py-8 text-center">
                    <Icon name="globe" size={32} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-sm text-text-muted">暂无网络请求记录</p>
                    <p className="mt-1 text-xs text-text-muted">启动监控后开始记录</p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface-2 px-4 py-2 text-xs font-medium text-text-muted">
                      <div className="col-span-1">状态</div>
                      <div className="col-span-1">方法</div>
                      <div className="col-span-5">URL</div>
                      <div className="col-span-2 text-right">耗时</div>
                      <div className="col-span-2 text-right">大小</div>
                      <div className="col-span-1 text-right">时间</div>
                    </div>
                    {networkRequests.map((req) => (
                      <div
                        key={req.id}
                        className="grid grid-cols-12 gap-2 border-b border-border px-4 py-2 text-sm hover:bg-surface-2"
                      >
                        <div className="col-span-1">
                          <Badge
                            variant={
                              req.status >= 400
                                ? 'error'
                                : req.status >= 300
                                  ? 'warning'
                                  : 'success'
                            }
                            className="text-xs"
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <div className="col-span-1">
                          <span className="font-mono text-xs">{req.method}</span>
                        </div>
                        <div className="col-span-5 truncate text-text-secondary">{req.url}</div>
                        <div className="col-span-2 text-right font-mono text-xs">
                          {req.duration}ms
                        </div>
                        <div className="col-span-2 text-right font-mono text-xs text-text-muted">
                          {formatSize(req.size)}
                        </div>
                        <div className="col-span-1 text-right text-xs text-text-muted">
                          {new Date(req.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="bell" size={16} className="text-tap-orange" />
                    告警
                    {monitorAlerts.filter((a) => !a.resolved).length > 0 && (
                      <Badge variant="warning">
                        {monitorAlerts.filter((a) => !a.resolved).length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {(['active', 'resolved', 'all'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setAlertFilter(filter)}
                        className={`rounded px-2 py-1 text-xs ${
                          alertFilter === filter
                            ? 'bg-tap-orange/20 text-tap-orange'
                            : 'text-text-secondary hover:bg-surface-2'
                        }`}
                      >
                        {filter === 'active' ? '活跃' : filter === 'resolved' ? '已解决' : '全部'}
                      </button>
                    ))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredAlerts.length === 0 ? (
                  <div className="py-8 text-center">
                    <Icon name="bell-off" size={32} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-sm text-text-muted">暂无告警</p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <ul className="divide-y divide-border">
                      {filteredAlerts
                        .slice()
                        .reverse()
                        .map((alert) => (
                          <li
                            key={alert.id}
                            className={`px-4 py-3 ${alert.resolved ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 min-w-0">
                                <Badge
                                  variant={
                                    alert.severity === 'critical'
                                      ? 'error'
                                      : alert.severity === 'warning'
                                        ? 'warning'
                                        : 'info'
                                  }
                                  className="shrink-0"
                                >
                                  {alert.type}
                                </Badge>
                                <div className="min-w-0">
                                  <p
                                    className={alert.resolved ? 'line-through text-text-muted' : ''}
                                  >
                                    {alert.message}
                                  </p>
                                  <p className="mt-1 text-xs text-text-muted">
                                    {new Date(alert.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              {!alert.resolved && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => resolveAlert(alert.id)}
                                >
                                  忽略
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  status = 'ok',
  unit = '',
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  status?: 'ok' | 'info' | 'warning' | 'critical';
  unit?: string;
  icon?: string;
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

  const iconColors = {
    ok: 'text-text-muted',
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400',
  };

  return (
    <div className={`rounded-xl border ${borderColors[status]} ${bgColors[status]} p-4`}>
      <div className="flex items-start justify-between">
        <div className="text-xs text-text-muted">{label}</div>
        {icon && <Icon name={icon} size={16} className={iconColors[status]} />}
      </div>
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
      <line
        x1="0"
        y1="57"
        x2="100"
        y2="57"
        stroke="#2e2e38"
        strokeWidth="0.3"
        strokeDasharray="2"
      />
      <line
        x1="0"
        y1="28"
        x2="100"
        y2="28"
        stroke="#2e2e38"
        strokeWidth="0.2"
        strokeDasharray="1"
      />
      <polyline fill="none" stroke="#ff6b00" strokeWidth="0.8" points={points} />
      <polyline
        fill="none"
        stroke="#6b6b7b"
        strokeWidth="0.5"
        strokeDasharray="2"
        points={avgPoints}
      />
      <text x="2" y="55" fill="#6b6b7b" fontSize="4">
        30
      </text>
      <text x="2" y="26" fill="#6b6b7b" fontSize="4">
        60
      </text>
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
      <line
        x1="0"
        y1="15"
        x2="100"
        y2="15"
        stroke="#2e2e38"
        strokeWidth="0.3"
        strokeDasharray="2"
      />
      <polygon fill="rgba(99, 102, 241, 0.1)" points={areaPoints} />
      <polyline fill="none" stroke="#6366f1" strokeWidth="0.8" points={points} />
      <text x="2" y="13" fill="#6b6b7b" fontSize="4">
        85%
      </text>
    </svg>
  );
}

function CPUChart({ data }: { data: PerformanceMetrics[] }) {
  const recent = data.slice(-60);

  if (recent.length === 0 || !recent[0].cpuUsage) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-muted">
        开始监控后显示 CPU 趋势图
      </div>
    );
  }

  const points = recent
    .filter((m) => m.cpuUsage !== undefined)
    .map((m, i, arr) => {
      const x = (i / Math.max(arr.length - 1, 1)) * 100;
      const y = 100 - (m.cpuUsage! / 100) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <svg viewBox="0 0 100 100" className="h-32 w-full" preserveAspectRatio="none">
      <line
        x1="0"
        y1="30"
        x2="100"
        y2="30"
        stroke="#2e2e38"
        strokeWidth="0.3"
        strokeDasharray="2"
      />
      <polygon fill="rgba(34, 197, 94, 0.1)" points={areaPoints} />
      <polyline fill="none" stroke="#22c55e" strokeWidth="0.8" points={points} />
      <text x="2" y="28" fill="#6b6b7b" fontSize="4">
        70%
      </text>
    </svg>
  );
}

function LatencyChart({ data }: { data: PerformanceMetrics[] }) {
  const recent = data.slice(-60);

  if (recent.length === 0 || !recent[0].networkLatency) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-muted">
        开始监控后显示延迟趋势图
      </div>
    );
  }

  const maxLatency = 3000;

  const points = recent
    .filter((m) => m.networkLatency !== undefined)
    .map((m, i, arr) => {
      const x = (i / Math.max(arr.length - 1, 1)) * 100;
      const y = 100 - Math.min((m.networkLatency! / maxLatency) * 100, 100);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="h-32 w-full" preserveAspectRatio="none">
      <line
        x1="0"
        y1="33"
        x2="100"
        y2="33"
        stroke="#2e2e38"
        strokeWidth="0.3"
        strokeDasharray="2"
      />
      <polyline fill="none" stroke="#a855f7" strokeWidth="0.8" points={points} />
      <text x="2" y="31" fill="#6b6b7b" fontSize="4">
        2s
      </text>
    </svg>
  );
}
