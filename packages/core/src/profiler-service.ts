import type { PerformanceMetrics, MonitorAlert } from '@tapdev/types';
import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

export type ProfilerType = 'cpu' | 'memory' | 'fps' | 'network' | 'gpu';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CPUProfileFrame {
  functionName: string;
  file?: string;
  line?: number;
  selfTime: number;
  totalTime: number;
  callCount: number;
  children?: CPUProfileFrame[];
}

export interface CPUProfile {
  id: string;
  timestamp: number;
  duration: number;
  totalSamples: number;
  rootFrames: CPUProfileFrame[];
  flameGraphData: FlameGraphNode[];
}

export interface FlameGraphNode {
  name: string;
  value: number;
  children?: FlameGraphNode[];
}

export interface MemorySnapshot {
  id: string;
  timestamp: number;
  totalSize: number;
  usedSize: number;
  freeSize: number;
  objects: MemoryObject[];
  leakCandidates: MemoryLeakCandidate[];
}

export interface MemoryObject {
  type: string;
  count: number;
  totalSize: number;
  retainedSize: number;
}

export interface MemoryLeakCandidate {
  id: string;
  type: string;
  size: number;
  count: number;
  reason: string;
  stackTrace?: string[];
}

export interface FrameTimeSample {
  timestamp: number;
  frameTime: number;
  fps: number;
  dropped: boolean;
}

export interface FPSAnalysis {
  id: string;
  startTime: number;
  endTime: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameTimeSamples: FrameTimeSample[];
  frameTimeDistribution: FrameTimeDistribution[];
  jankFrames: number;
  totalFrames: number;
}

export interface FrameTimeDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;
  type: string;
  initiator?: string;
  waterfall: WaterfallPhase[];
}

export interface WaterfallPhase {
  name: string;
  startTime: number;
  duration: number;
}

export interface NetworkAnalysis {
  id: string;
  startTime: number;
  endTime: number;
  requests: NetworkRequest[];
  totalRequests: number;
  failedRequests: number;
  totalSize: number;
  averageLatency: number;
  slowestRequests: NetworkRequest[];
}

export interface GPUProfile {
  id: string;
  timestamp: number;
  duration: number;
  drawCalls: number;
  triangles: number;
  gpuTime: number;
  cpuTime: number;
  memoryUsed: number;
  frameTime: number;
  renderPasses: RenderPass[];
}

export interface RenderPass {
  name: string;
  drawCalls: number;
  gpuTime: number;
  triangles: number;
}

export interface AlertRule {
  id: string;
  type: ProfilerType;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  severity: AlertSeverity;
  message: string;
  enabled: boolean;
  cooldown: number;
  lastTriggered?: number;
}

export interface ProfilingSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  types: ProfilerType[];
  isRunning: boolean;
  metrics: PerformanceMetrics[];
  cpuProfiles: CPUProfile[];
  memorySnapshots: MemorySnapshot[];
  fpsAnalyses: FPSAnalysis[];
  networkAnalyses: NetworkAnalysis[];
  gpuProfiles: GPUProfile[];
  alerts: MonitorAlert[];
}

export class ProfilerService {
  private sessions = new Map<string, ProfilingSession>();
  private activeSessionId: string | null = null;
  private isProfiling = false;
  private alertRules = new Map<string, AlertRule>();
  private metricsBuffer: PerformanceMetrics[] = [];
  private maxBufferSize = 300;
  private sampleInterval: number | null = null;
  private sampleRate = 1000;

  getSessions(): ProfilingSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.startTime - a.startTime);
  }

  getSession(id: string): ProfilingSession | undefined {
    return this.sessions.get(id);
  }

  getActiveSession(): ProfilingSession | null {
    return this.activeSessionId ? (this.sessions.get(this.activeSessionId) ?? null) : null;
  }

  startSession(name: string, types: ProfilerType[]): ProfilingSession {
    const session: ProfilingSession = {
      id: randomUUID(),
      name,
      startTime: Date.now(),
      types,
      isRunning: true,
      metrics: [],
      cpuProfiles: [],
      memorySnapshots: [],
      fpsAnalyses: [],
      networkAnalyses: [],
      gpuProfiles: [],
      alerts: [],
    };

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    this.isProfiling = true;
    this.metricsBuffer = [];

    this.startSampling();

    globalEventBus.emit({ type: 'profiler:sessionStarted', payload: session });
    return session;
  }

  stopSession(): ProfilingSession | null {
    const session = this.getActiveSession();
    if (!session) return null;

    session.isRunning = false;
    session.endTime = Date.now();
    this.isProfiling = false;
    this.stopSampling();

    globalEventBus.emit({ type: 'profiler:sessionStopped', payload: session });
    return session;
  }

  async takeCPUProfile(duration = 5000): Promise<CPUProfile> {
    const session = this.getActiveSession();
    if (!session) {
      throw new Error('没有活动的分析会话');
    }

    globalEventBus.emit({ type: 'profiler:cpuProfileStart', payload: { duration } });

    await this.delay(duration);

    const profile: CPUProfile = {
      id: randomUUID(),
      timestamp: Date.now(),
      duration,
      totalSamples: Math.floor(duration / 10),
      rootFrames: this.generateMockCPUProfileFrames(),
      flameGraphData: this.generateMockFlameGraphData(),
    };

    session.cpuProfiles.push(profile);
    globalEventBus.emit({ type: 'profiler:cpuProfileComplete', payload: profile });
    return profile;
  }

  async takeMemorySnapshot(): Promise<MemorySnapshot> {
    const session = this.getActiveSession();
    if (!session) {
      throw new Error('没有活动的分析会话');
    }

    globalEventBus.emit({ type: 'profiler:memorySnapshotStart', payload: {} });

    await this.delay(500);

    const snapshot: MemorySnapshot = {
      id: randomUUID(),
      timestamp: Date.now(),
      totalSize: 2 * 1024 * 1024 * 1024,
      usedSize: Math.floor(512 * 1024 * 1024 + Math.random() * 512 * 1024 * 1024),
      freeSize: 0,
      objects: this.generateMockMemoryObjects(),
      leakCandidates: this.generateMockLeakCandidates(),
    };
    snapshot.freeSize = snapshot.totalSize - snapshot.usedSize;

    session.memorySnapshots.push(snapshot);
    globalEventBus.emit({ type: 'profiler:memorySnapshotComplete', payload: snapshot });
    return snapshot;
  }

  async analyzeFPS(duration = 10000): Promise<FPSAnalysis> {
    const session = this.getActiveSession();
    if (!session) {
      throw new Error('没有活动的分析会话');
    }

    globalEventBus.emit({ type: 'profiler:fpsAnalysisStart', payload: { duration } });

    await this.delay(duration);

    const analysis: FPSAnalysis = {
      id: randomUUID(),
      startTime: Date.now() - duration,
      endTime: Date.now(),
      averageFPS: 55 + Math.random() * 5,
      minFPS: 30 + Math.random() * 10,
      maxFPS: 60,
      frameTimeSamples: this.generateMockFrameTimeSamples(duration),
      frameTimeDistribution: this.generateMockFrameTimeDistribution(),
      jankFrames: Math.floor(Math.random() * 20),
      totalFrames: Math.floor(duration / 16.67),
    };

    session.fpsAnalyses.push(analysis);
    globalEventBus.emit({ type: 'profiler:fpsAnalysisComplete', payload: analysis });
    return analysis;
  }

  async analyzeNetwork(duration = 10000): Promise<NetworkAnalysis> {
    const session = this.getActiveSession();
    if (!session) {
      throw new Error('没有活动的分析会话');
    }

    globalEventBus.emit({ type: 'profiler:networkAnalysisStart', payload: { duration } });

    await this.delay(1000);

    const requests = this.generateMockNetworkRequests(duration);
    const analysis: NetworkAnalysis = {
      id: randomUUID(),
      startTime: Date.now() - duration,
      endTime: Date.now(),
      requests,
      totalRequests: requests.length,
      failedRequests: requests.filter((r) => r.status >= 400).length,
      totalSize: requests.reduce((sum, r) => sum + r.size, 0),
      averageLatency: requests.reduce((sum, r) => sum + r.duration, 0) / requests.length,
      slowestRequests: [...requests].sort((a, b) => b.duration - a.duration).slice(0, 5),
    };

    session.networkAnalyses.push(analysis);
    globalEventBus.emit({ type: 'profiler:networkAnalysisComplete', payload: analysis });
    return analysis;
  }

  async profileGPU(duration = 5000): Promise<GPUProfile> {
    const session = this.getActiveSession();
    if (!session) {
      throw new Error('没有活动的分析会话');
    }

    globalEventBus.emit({ type: 'profiler:gpuProfileStart', payload: { duration } });

    await this.delay(duration);

    const profile: GPUProfile = {
      id: randomUUID(),
      timestamp: Date.now(),
      duration,
      drawCalls: Math.floor(100 + Math.random() * 200),
      triangles: Math.floor(50000 + Math.random() * 100000),
      gpuTime: 8 + Math.random() * 8,
      cpuTime: 4 + Math.random() * 4,
      memoryUsed: Math.floor(256 * 1024 * 1024 + Math.random() * 256 * 1024 * 1024),
      frameTime: 14 + Math.random() * 4,
      renderPasses: this.generateMockRenderPasses(),
    };

    session.gpuProfiles.push(profile);
    globalEventBus.emit({ type: 'profiler:gpuProfileComplete', payload: profile });
    return profile;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metricsBuffer];
  }

  getLatestMetrics(): PerformanceMetrics | null {
    if (this.metricsBuffer.length === 0) return null;
    return this.metricsBuffer[this.metricsBuffer.length - 1];
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const alertRule: AlertRule = {
      ...rule,
      id: randomUUID(),
    };

    this.alertRules.set(alertRule.id, alertRule);
    globalEventBus.emit({ type: 'profiler:alertRuleAdded', payload: alertRule });
    return alertRule;
  }

  removeAlertRule(id: string): void {
    this.alertRules.delete(id);
    globalEventBus.emit({ type: 'profiler:alertRuleRemoved', payload: { id } });
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined {
    const rule = this.alertRules.get(id);
    if (!rule) return undefined;

    Object.assign(rule, updates);
    globalEventBus.emit({ type: 'profiler:alertRuleUpdated', payload: rule });
    return rule;
  }

  getAlerts(sessionId?: string): MonitorAlert[] {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      return session?.alerts || [];
    }
    const session = this.getActiveSession();
    return session?.alerts || [];
  }

  clearSession(id: string): void {
    this.sessions.delete(id);
    if (this.activeSessionId === id) {
      this.activeSessionId = null;
      this.isProfiling = false;
      this.stopSampling();
    }
    globalEventBus.emit({ type: 'profiler:sessionCleared', payload: { id } });
  }

  clearAllSessions(): void {
    this.sessions.clear();
    this.activeSessionId = null;
    this.isProfiling = false;
    this.stopSampling();
    this.metricsBuffer = [];
    globalEventBus.emit({ type: 'profiler:allSessionsCleared', payload: {} });
  }

  getSummary(sessionId?: string): {
    avgFPS: number;
    avgMemory: number;
    avgCPU: number;
    totalRequests: number;
    totalAlerts: number;
  } {
    const session = sessionId ? this.sessions.get(sessionId) : this.getActiveSession();
    if (!session || session.metrics.length === 0) {
      return {
        avgFPS: 0,
        avgMemory: 0,
        avgCPU: 0,
        totalRequests: 0,
        totalAlerts: 0,
      };
    }

    const metrics = session.metrics;
    const avgFPS = metrics.reduce((sum, m) => sum + m.fps, 0) / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + m.memory, 0) / metrics.length;
    const avgCPU = metrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / metrics.length;

    return {
      avgFPS: Math.round(avgFPS * 10) / 10,
      avgMemory: Math.round((avgMemory / 1024 / 1024) * 10) / 10,
      avgCPU: Math.round(avgCPU * 10) / 10,
      totalRequests: metrics[metrics.length - 1]?.networkRequests || 0,
      totalAlerts: session.alerts.length,
    };
  }

  isActive(): boolean {
    return this.isProfiling;
  }

  private startSampling(): void {
    if (this.sampleInterval) return;

    this.sampleInterval = window.setInterval(() => {
      if (!this.isProfiling) return;

      const metrics = this.collectMetrics();
      this.metricsBuffer.push(metrics);
      if (this.metricsBuffer.length > this.maxBufferSize) {
        this.metricsBuffer.shift();
      }

      const session = this.getActiveSession();
      if (session) {
        session.metrics.push(metrics);
        this.checkAlertRules(metrics, session);
      }

      globalEventBus.emit({ type: 'profiler:metricsUpdate', payload: metrics });
    }, this.sampleRate);
  }

  private stopSampling(): void {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
  }

  private collectMetrics(): PerformanceMetrics {
    const baseFPS = 55 + Math.random() * 5;
    const baseMemory = 256 * 1024 * 1024 + Math.random() * 128 * 1024 * 1024;

    return {
      fps: Math.round(baseFPS * 10) / 10,
      memory: Math.floor(baseMemory),
      memoryLimit: 2 * 1024 * 1024 * 1024,
      drawCalls: Math.floor(100 + Math.random() * 100),
      triangles: Math.floor(50000 + Math.random() * 50000),
      networkRequests: Math.floor(Math.random() * 10),
      networkLatency: Math.floor(50 + Math.random() * 100),
      loadTime: undefined,
      cpuUsage: Math.round((20 + Math.random() * 30) * 10) / 10,
      gpuMemory: Math.floor(128 * 1024 * 1024 + Math.random() * 64 * 1024 * 1024),
      frameTime: Math.round((14 + Math.random() * 4) * 100) / 100,
      timestamp: Date.now(),
    };
  }

  private checkAlertRules(metrics: PerformanceMetrics, session: ProfilingSession): void {
    const now = Date.now();

    this.alertRules.forEach((rule) => {
      if (!rule.enabled) return;
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown) return;

      const value = this.getMetricValue(metrics, rule.metric);
      if (value === undefined) return;

      let triggered = false;
      switch (rule.operator) {
        case 'gt':
          triggered = value > rule.threshold;
          break;
        case 'lt':
          triggered = value < rule.threshold;
          break;
        case 'gte':
          triggered = value >= rule.threshold;
          break;
        case 'lte':
          triggered = value <= rule.threshold;
          break;
      }

      if (triggered) {
        rule.lastTriggered = now;
        const alert: MonitorAlert = {
          id: randomUUID(),
          type: rule.type as MonitorAlert['type'],
          severity: rule.severity,
          message: rule.message,
          timestamp: now,
          resolved: false,
          metadata: { metric: rule.metric, value, threshold: rule.threshold },
        };
        session.alerts.push(alert);
        globalEventBus.emit({ type: 'profiler:alert', payload: alert });
      }
    });
  }

  private getMetricValue(metrics: PerformanceMetrics, metric: string): number | undefined {
    switch (metric) {
      case 'fps':
        return metrics.fps;
      case 'memory':
        return metrics.memory;
      case 'cpuUsage':
        return metrics.cpuUsage;
      case 'drawCalls':
        return metrics.drawCalls;
      case 'networkLatency':
        return metrics.networkLatency;
      case 'gpuMemory':
        return metrics.gpuMemory;
      case 'frameTime':
        return metrics.frameTime;
      default:
        return undefined;
    }
  }

  private generateMockCPUProfileFrames(): CPUProfileFrame[] {
    const functions = [
      'update()',
      'render()',
      'handleInput()',
      'physics.step()',
      'audio.update()',
      'ui.render()',
      'loadResource()',
      'animation.update()',
    ];

    return functions.map((name, i) => ({
      functionName: name,
      file: `src/${name.split('(')[0]}.ts`,
      line: 10 + i * 20,
      selfTime: Math.floor(5 + Math.random() * 20),
      totalTime: Math.floor(20 + Math.random() * 50),
      callCount: Math.floor(10 + Math.random() * 100),
      children: [
        {
          functionName: `helper_${i}()`,
          selfTime: Math.floor(2 + Math.random() * 10),
          totalTime: Math.floor(5 + Math.random() * 15),
          callCount: Math.floor(5 + Math.random() * 50),
        },
      ],
    }));
  }

  private generateMockFlameGraphData(): FlameGraphNode[] {
    return [
      {
        name: 'main',
        value: 100,
        children: [
          {
            name: 'update',
            value: 40,
            children: [
              { name: 'physics', value: 20 },
              { name: 'ai', value: 15 },
            ],
          },
          {
            name: 'render',
            value: 50,
            children: [
              { name: 'draw', value: 30 },
              { name: 'upload', value: 15 },
            ],
          },
          { name: 'input', value: 10 },
        ],
      },
    ];
  }

  private generateMockMemoryObjects(): MemoryObject[] {
    const types = [
      'Array',
      'Object',
      'String',
      'Function',
      'Number',
      'Texture',
      'Mesh',
      'AudioBuffer',
    ];
    return types.map((type) => ({
      type,
      count: Math.floor(100 + Math.random() * 1000),
      totalSize: Math.floor(10000 + Math.random() * 1000000),
      retainedSize: Math.floor(20000 + Math.random() * 2000000),
    }));
  }

  private generateMockLeakCandidates(): MemoryLeakCandidate[] {
    return [
      {
        id: randomUUID(),
        type: 'EventEmitter',
        size: 102400,
        count: 25,
        reason: '未移除的事件监听器',
        stackTrace: ['app.ts:120', 'component.ts:45', 'utils.ts:78'],
      },
      {
        id: randomUUID(),
        type: 'Timer',
        size: 51200,
        count: 12,
        reason: '未清除的定时器',
        stackTrace: ['animation.ts:200'],
      },
    ];
  }

  private generateMockFrameTimeSamples(duration: number): FrameTimeSample[] {
    const samples: FrameTimeSample[] = [];
    const sampleCount = Math.floor(duration / 100);
    const startTime = Date.now() - duration;

    for (let i = 0; i < sampleCount; i++) {
      const frameTime = 14 + Math.random() * 8;
      const fps = Math.round(1000 / frameTime);
      samples.push({
        timestamp: startTime + i * 100,
        frameTime: Math.round(frameTime * 100) / 100,
        fps,
        dropped: frameTime > 20,
      });
    }

    return samples;
  }

  private generateMockFrameTimeDistribution(): FrameTimeDistribution[] {
    return [
      { range: '0-16ms', count: 450, percentage: 75 },
      { range: '16-20ms', count: 100, percentage: 16.7 },
      { range: '20-30ms', count: 40, percentage: 6.7 },
      { range: '30ms+', count: 10, percentage: 1.6 },
    ];
  }

  private generateMockNetworkRequests(duration: number): NetworkRequest[] {
    const count = Math.floor(duration / 500 + Math.random() * 10);
    const requests: NetworkRequest[] = [];
    const startTime = Date.now() - duration;

    const urls = [
      { url: '/api/user/profile', method: 'GET', type: 'xhr' },
      { url: '/assets/texture.png', method: 'GET', type: 'fetch' },
      { url: '/audio/bgm.mp3', method: 'GET', type: 'fetch' },
      { url: '/api/leaderboard', method: 'POST', type: 'xhr' },
      { url: '/assets/model.glb', method: 'GET', type: 'fetch' },
    ];

    for (let i = 0; i < count; i++) {
      const template = urls[i % urls.length];
      const reqStart = startTime + Math.random() * duration;
      const durationReq = 50 + Math.random() * 300;

      requests.push({
        id: `req_${i}`,
        url: template.url,
        method: template.method,
        status: Math.random() > 0.9 ? 500 : 200,
        startTime: reqStart,
        endTime: reqStart + durationReq,
        duration: Math.round(durationReq),
        size: Math.floor(1000 + Math.random() * 500000),
        type: template.type,
        initiator: 'app.ts',
        waterfall: [
          { name: 'DNS', startTime: reqStart, duration: 10 },
          { name: 'Connect', startTime: reqStart + 10, duration: 20 },
          { name: 'Request', startTime: reqStart + 30, duration: durationReq - 50 },
          { name: 'Response', startTime: reqStart + durationReq - 20, duration: 20 },
        ],
      });
    }

    return requests.sort((a, b) => a.startTime - b.startTime);
  }

  private generateMockRenderPasses(): RenderPass[] {
    return [
      { name: 'Shadow Map', drawCalls: 20, gpuTime: 1.5, triangles: 10000 },
      { name: 'Opaque', drawCalls: 80, gpuTime: 5.0, triangles: 30000 },
      { name: 'Transparent', drawCalls: 30, gpuTime: 2.0, triangles: 5000 },
      { name: 'Post Processing', drawCalls: 10, gpuTime: 1.5, triangles: 2 },
      { name: 'UI', drawCalls: 40, gpuTime: 1.0, triangles: 1000 },
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const profilerService = new ProfilerService();
