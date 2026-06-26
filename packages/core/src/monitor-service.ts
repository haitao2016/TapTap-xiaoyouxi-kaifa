import type {
  PerformanceMetrics,
  MonitorAlert,
  MonitorStats,
  MonitorThresholds,
  NetworkRequestInfo,
} from '@tapdev/types';
import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

const DEFAULT_THRESHOLDS: MonitorThresholds = {
  fps: 30,
  memoryRatio: 0.85,
  cpuUsage: 90,
  networkLatency: 2000,
  requestTimeout: 10000,
};

export class MonitorService {
  private metricsHistory: PerformanceMetrics[] = [];
  private alerts: MonitorAlert[] = [];
  private networkRequests: NetworkRequestInfo[] = [];
  private maxHistory = 300;
  private maxRequests = 100;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isMonitoring = false;
  private startTime = 0;
  private thresholds = DEFAULT_THRESHOLDS;

  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metricsHistory.at(-1) ?? null;
  }

  getAlerts(): MonitorAlert[] {
    return [...this.alerts];
  }

  getUnresolvedAlerts(): MonitorAlert[] {
    return this.alerts.filter((a) => !a.resolved);
  }

  getNetworkRequests(): NetworkRequestInfo[] {
    return [...this.networkRequests];
  }

  getRecentRequests(count = 20): NetworkRequestInfo[] {
    return this.networkRequests.slice(-count).reverse();
  }

  getFailedRequests(): NetworkRequestInfo[] {
    return this.networkRequests.filter((r) => r.status >= 400);
  }

  getStats(): MonitorStats {
    const recent = this.metricsHistory.slice(-60);
    const avgFps =
      recent.length > 0 ? recent.reduce((sum, m) => sum + m.fps, 0) / recent.length : 0;

    const avgMemoryUsage =
      recent.length > 0
        ? recent.reduce((sum, m) => sum + m.memory / m.memoryLimit, 0) / recent.length
        : 0;

    const totalRequests = this.networkRequests.length;
    const failedRequests = this.networkRequests.filter((r) => r.status >= 400).length;

    const avgLatency =
      this.networkRequests.length > 0
        ? this.networkRequests.reduce((sum, r) => sum + r.duration, 0) / this.networkRequests.length
        : 0;

    return {
      avgFps: Math.round(avgFps),
      avgMemoryUsage: Math.round(avgMemoryUsage * 100),
      totalRequests,
      failedRequests,
      avgLatency: Math.round(avgLatency),
      uptime: this.startTime ? Date.now() - this.startTime : 0,
    };
  }

  startMonitoring(intervalMs = 1000): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.startTime = Date.now();

    this.pollingInterval = setInterval(() => {
      const metrics = this.collectMetrics();
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistory) {
        this.metricsHistory.shift();
      }
      globalEventBus.emit({ type: 'monitor:metrics', payload: metrics });
      this.checkThresholds(metrics);
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isMonitoring = false;
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) alert.resolved = true;
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  clearNetworkRequests(): void {
    this.networkRequests = [];
  }

  getAverageFps(windowSize = 10): number {
    const recent = this.metricsHistory.slice(-windowSize);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  recordNetworkRequest(request: Omit<NetworkRequestInfo, 'id' | 'timestamp'>): void {
    const info: NetworkRequestInfo = {
      ...request,
      id: randomUUID(),
      timestamp: Date.now(),
    };

    this.networkRequests.push(info);
    if (this.networkRequests.length > this.maxRequests) {
      this.networkRequests.shift();
    }

    globalEventBus.emit({ type: 'monitor:network-request', payload: info });

    if (request.status >= 400) {
      this.createAlert(
        'network',
        'warning',
        `请求失败: ${request.method} ${request.url} (${request.status})`
      );
    }

    if (request.duration > this.thresholds.networkLatency) {
      this.createAlert('network', 'warning', `请求超时: ${request.url} (${request.duration}ms)`);
    }
  }

  setThresholds(thresholds: Partial<MonitorThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getThresholds(): MonitorThresholds {
    return { ...this.thresholds };
  }

  private collectMetrics(): PerformanceMetrics {
    const memoryLimit = 512 * 1024 * 1024;
    const baseFps = 58 + Math.random() * 4;
    const memory = Math.floor(memoryLimit * (0.3 + Math.random() * 0.4));
    const cpuUsage = 20 + Math.random() * 30;
    const gpuMemory = Math.floor(128 * 1024 * 1024 * (0.2 + Math.random() * 0.4));
    const frameTime = 14 + Math.random() * 4;

    return {
      fps: Math.round(baseFps),
      memory,
      memoryLimit,
      drawCalls: Math.floor(50 + Math.random() * 100),
      triangles: Math.floor(5000 + Math.random() * 20000),
      networkRequests: Math.floor(Math.random() * 5),
      networkLatency: Math.floor(100 + Math.random() * 500),
      loadTime: 1200 + Math.random() * 800,
      cpuUsage: Math.round(cpuUsage),
      gpuMemory,
      frameTime: Math.round(frameTime),
      timestamp: Date.now(),
    };
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    if (metrics.fps < this.thresholds.fps) {
      this.createAlert('fps', 'warning', `FPS 过低: ${metrics.fps} (阈值: ${this.thresholds.fps})`);
    }

    const memoryRatio = metrics.memory / metrics.memoryLimit;
    if (memoryRatio > this.thresholds.memoryRatio) {
      this.createAlert('memory', 'critical', `内存使用率过高: ${(memoryRatio * 100).toFixed(1)}%`);
    }

    if (metrics.cpuUsage && metrics.cpuUsage > this.thresholds.cpuUsage) {
      this.createAlert('cpu', 'warning', `CPU 使用率过高: ${metrics.cpuUsage}%`);
    }

    if (metrics.networkLatency && metrics.networkLatency > this.thresholds.networkLatency) {
      this.createAlert('network', 'warning', `网络延迟过高: ${metrics.networkLatency}ms`);
    }
  }

  private createAlert(
    type: MonitorAlert['type'],
    severity: MonitorAlert['severity'],
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const recent = this.alerts.find(
      (a) => a.type === type && !a.resolved && Date.now() - a.timestamp < 5000
    );
    if (recent) return;

    const alert: MonitorAlert = {
      id: randomUUID(),
      type,
      severity,
      message,
      timestamp: Date.now(),
      resolved: false,
      metadata,
    };

    this.alerts.push(alert);
    globalEventBus.emit({ type: 'monitor:alert', payload: alert });
  }
}

export const monitorService = new MonitorService();
