import type {
  DebugSession,
  DebugLogEntry,
  Breakpoint,
  LogLevel,
  UnityInstallation,
  UnityProjectValidation,
} from '@tapdev/types';
import { globalEventBus } from './event-bus';
import { debugWebSocketClient } from './debug-client';
import { randomUUID } from 'node:crypto';

export interface StartDebugOptions {
  projectId: string;
  port?: number;
  projectPath?: string;
  staticDir?: string;
  serverInfo?: {
    url: string;
    wsUrl: string;
    qrCodeDataUrl?: string;
  };
}

export interface BreakpointCondition {
  expression: string;
  hitCount: number;
  hitCondition?: 'breakAlways' | 'breakOnCount' | 'breakOnCondition';
  breakCount?: number;
}

export class DebugService {
  private session: DebugSession | null = null;
  private logBuffer: DebugLogEntry[] = [];
  private maxLogs = 2000;
  private serverRunning = false;
  private usingNativeServer = false;
  private breakpointHitCounts = new Map<string, number>();
  /** 公共字段（测试与多会话场景使用） */
  sessions = new Map<string, DebugSession>();
  logs: DebugLogEntry[] = [];
  breakpoints = new Map<string, Breakpoint>();
  activeSessionId: string | null = null;

  getActiveSession(): DebugSession | null {
    return this.activeSessionId ? (this.sessions.get(this.activeSessionId) ?? null) : null;
  }

  getSession(): DebugSession | null {
    return this.activeSessionId ? (this.sessions.get(this.activeSessionId) ?? this.session) : this.session;
  }

  getLogs(level?: LogLevel): DebugLogEntry[] {
    const all = [...this.logs, ...this.logBuffer];
    if (!level) return all;
    return all.filter((e) => e.level === level);
  }

  /**
   * 简化连接 API（兼容测试与移动端使用）
   */
  async connect(url: string): Promise<string> {
    const sessionId = randomUUID();
    this.activeSessionId = sessionId;
    const session: DebugSession = {
      id: sessionId,
      projectId: 'default',
      status: 'running',
      breakpoints: [],
      logs: [],
      serverPort: this.extractPort(url),
      qrCodeUrl: url,
    };
    this.sessions.set(sessionId, session);
    this.session = session;
    globalEventBus.emit('debug:connected', { sessionId });
    return sessionId;
  }

  /** 注册一个已构造的断点（公共 API） */
  registerBreakpoint(bp: Breakpoint): void {
    if (!this.breakpoints.has(bp.id)) {
      this.breakpoints.set(bp.id, bp);
    }
  }

  unregisterBreakpoint(id: string): void {
    this.breakpoints.delete(id);
  }

  /** 浏览器模式：连接已运行的调试服务器 */
  async connectToServer(serverInfo: StartDebugOptions['serverInfo'] & { projectId: string }): Promise<DebugSession> {
    this.serverRunning = true;
    this.session = {
      id: randomUUID(),
      projectId: serverInfo.projectId,
      status: 'running',
      breakpoints: [],
      logs: [],
      serverPort: this.extractPort(serverInfo.url),
      qrCodeUrl: serverInfo.url,
      wsUrl: serverInfo.wsUrl,
      qrCodeDataUrl: serverInfo.qrCodeDataUrl,
      gameConnected: false,
    };

    this.setupWebSocketClient(serverInfo.wsUrl);
    globalEventBus.emit({ type: 'debug:connect', payload: this.session });
    this.log('info', `已连接调试服务器: ${serverInfo.url}`);
    return this.session;
  }

  /** 本地模拟模式（无服务器时降级） */
  async startDebugServer(projectId: string, port = 8081): Promise<DebugSession> {
    this.serverRunning = true;
    const url = `http://127.0.0.1:${port}/debug`;
    const wsUrl = `ws://127.0.0.1:${port}/ws?role=studio`;

    this.session = {
      id: randomUUID(),
      projectId,
      status: 'connected',
      breakpoints: [],
      logs: [],
      serverPort: port,
      qrCodeUrl: url,
      wsUrl,
      gameConnected: false,
    };

    this.setupWebSocketClient(wsUrl);
    globalEventBus.emit({ type: 'debug:connect', payload: this.session });
    this.log('info', `调试服务器地址: ${url}`);
    this.log('info', 'Electron 桌面端将自动启动真实 HTTP/WebSocket 服务器');
    return this.session;
  }

  /** Electron 原生服务器启动后同步会话 */
  syncNativeSession(info: {
    sessionId: string;
    projectId: string;
    url: string;
    wsUrl: string;
    qrCodeDataUrl?: string;
    port: number;
  }): void {
    this.usingNativeServer = true;
    this.serverRunning = true;
    this.session = {
      id: info.sessionId,
      projectId: info.projectId,
      status: 'running',
      breakpoints: [],
      logs: [],
      serverPort: info.port,
      qrCodeUrl: info.url,
      wsUrl: info.wsUrl,
      qrCodeDataUrl: info.qrCodeDataUrl,
      gameConnected: false,
    };

    this.setupWebSocketClient(info.wsUrl);
    globalEventBus.emit({ type: 'debug:connect', payload: this.session });
    this.log('info', `原生调试服务器已启动: ${info.url}`);
  }

  stopDebugServer(): void {
    debugWebSocketClient.disconnect();
    if (!this.session) return;
    const sessionId = this.session.id;
    this.serverRunning = false;
    this.usingNativeServer = false;
    this.session = null;
    this.breakpointHitCounts.clear();
    globalEventBus.emit({ type: 'debug:disconnect', payload: { sessionId } });
  }

  disconnect(): void {
    this.stopDebugServer();
    // 测试与多会话场景：同时清空所有内部状态
    this.session = null;
    this.activeSessionId = null;
    this.sessions.clear();
    this.logBuffer = [];
    this.logs = [];
    this.breakpoints.clear();
  }

  log(level: LogLevel, message: string, source?: string, data?: unknown): void;
  log(entry: DebugLogEntry): void;
  log(
    arg1: LogLevel | DebugLogEntry,
    arg2?: string,
    arg3?: string,
    arg4?: unknown
  ): void {
    const entry: DebugLogEntry =
      typeof arg1 === 'string'
        ? {
            id: randomUUID(),
            level: arg1,
            message: arg2 ?? '',
            source: arg3,
            timestamp: Date.now(),
            data: arg4,
          }
        : { ...arg1, id: arg1.id ?? randomUUID(), timestamp: arg1.timestamp ?? Date.now() };

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxLogs) this.logBuffer.shift();
    if (this.session) this.session.logs.push(entry);
    globalEventBus.emit({ type: 'debug:log', payload: entry });
  }

  addBreakpoint(file: string, line: number, id?: string, condition?: string): Breakpoint {
    // 重复检测：相同 file+line 视为重复
    const existing = [...this.breakpoints.values()].find(
      (b) => b.file === file && b.line === line
    );
    if (existing) return existing;

    const bp: Breakpoint = {
      id: id ?? randomUUID(),
      file,
      line,
      enabled: true,
      condition,
    };
    this.breakpoints.set(bp.id, bp);
    if (this.session) this.session.breakpoints.push(bp);
    this.breakpointHitCounts.set(bp.id, 0);

    if (condition) {
      const validation = this.validateCondition(condition);
      if (!validation.valid) {
        this.log('warn', `断点条件验证失败: ${validation.error}`, 'breakpoint');
      }
    }
    debugWebSocketClient.addBreakpoint(file, line, condition);
    this.log('debug', `断点已设置: ${file}:${line}${condition ? ` (条件: ${condition})` : ''}`);
    return bp;
  }

  /**
   * 返回指定脚本的所有断点（公共 API，测试可访问）。
   * 不传脚本 ID 则返回全部。
   */
  getBreakpoints(scriptId?: string): Breakpoint[] {
    const all = [...this.breakpoints.values()];
    if (!scriptId) return all;
    return all.filter((b) => b.file === scriptId);
  }

  /**
   * 清除指定脚本的全部断点（公共 API，测试可访问）。
   */
  clearBreakpoints(scriptId?: string): void {
    if (!scriptId) {
      this.breakpoints.clear();
      this.breakpointHitCounts.clear();
      if (this.session) this.session.breakpoints = [];
      return;
    }
    const removed = [...this.breakpoints.values()].filter((b) => b.file === scriptId);
    removed.forEach((b) => {
      this.breakpoints.delete(b.id);
      this.breakpointHitCounts.delete(b.id);
    });
    if (this.session) {
      this.session.breakpoints = this.session.breakpoints.filter(
        (b) => b.file !== scriptId
      );
    }
  }

  updateBreakpoint(breakpointId: string, updates: Partial<Pick<Breakpoint, 'condition' | 'enabled'>>): void {
    if (!this.session) return;
    const bp = this.session.breakpoints.find((b) => b.id === breakpointId);
    if (bp) {
      if (updates.condition !== undefined) {
        bp.condition = updates.condition;
        if (updates.condition) {
          const validation = this.validateCondition(updates.condition);
          if (!validation.valid) {
            this.log('warn', `断点条件验证失败: ${validation.error}`, 'breakpoint');
          }
        }
      }
      if (updates.enabled !== undefined) {
        bp.enabled = updates.enabled;
      }
      debugWebSocketClient.updateBreakpoint(breakpointId, updates);
    }
  }

  removeBreakpoint(breakpointId: string): void;
  removeBreakpoint(file: string, line: number): void;
  removeBreakpoint(arg1: string, arg2?: number): void {
    let targetIds: string[] = [];
    if (arg2 === undefined) {
      targetIds = [arg1];
    } else {
      targetIds = [...this.breakpoints.entries()]
        .filter(([, bp]) => bp.file === arg1 && bp.line === arg2)
        .map(([id]) => id);
    }
    if (targetIds.length === 0) return;
    if (this.session) {
      this.session.breakpoints = this.session.breakpoints.filter(
        (bp) => !targetIds.includes(bp.id)
      );
    }
    targetIds.forEach((id) => {
      this.breakpoints.delete(id);
      this.breakpointHitCounts.delete(id);
    });
    targetIds.forEach((id) => debugWebSocketClient.removeBreakpoint(id));
  }

  toggleBreakpoint(breakpointId: string): void {
    if (!this.session) return;
    const bp = this.session.breakpoints.find((b) => b.id === breakpointId);
    if (bp) {
      bp.enabled = !bp.enabled;
      debugWebSocketClient.updateBreakpoint(breakpointId, { enabled: bp.enabled });
    }
  }

  resetBreakpointHitCount(breakpointId: string): void {
    this.breakpointHitCounts.set(breakpointId, 0);
  }

  getBreakpointHitCount(breakpointId: string): number {
    return this.breakpointHitCounts.get(breakpointId) || 0;
  }

  incrementBreakpointHitCount(breakpointId: string): number {
    const current = this.breakpointHitCounts.get(breakpointId) || 0;
    const next = current + 1;
    this.breakpointHitCounts.set(breakpointId, next);
    return next;
  }

  validateCondition(expression: string): { valid: boolean; error?: string } {
    if (!expression || expression.trim() === '') {
      return { valid: true };
    }

    try {
      new Function(expression);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '无效的条件表达式',
      };
    }
  }

  evaluateCondition(breakpoint: Breakpoint, context: Record<string, unknown>): boolean {
    if (!breakpoint.condition) return true;
    
    try {
      const fn = new Function(...Object.keys(context), `return ${breakpoint.condition}`);
      const result = fn(...Object.values(context));
      return Boolean(result);
    } catch {
      return true;
    }
  }

  pause(): void {
    if (this.session) this.session.status = 'paused';
    debugWebSocketClient.sendCommand('pause');
    this.log('info', '调试已暂停');
  }

  resume(): void {
    if (this.session) this.session.status = 'running';
    debugWebSocketClient.sendCommand('resume');
    this.log('info', '调试已继续');
  }

  /**
   * 获取指定脚本在某行的源代码（简化实现，未找到时返回 null）
   */
  async getSource(_scriptId: string, _line: number): Promise<string | null> {
    return null;
  }

  clearLogs(): void {
    this.logBuffer = [];
    if (this.session) this.session.logs = [];
  }

  isServerRunning(): boolean {
    return this.serverRunning;
  }

  isUsingNativeServer(): boolean {
    return this.usingNativeServer;
  }

  private setupWebSocketClient(wsUrl: string): void {
    debugWebSocketClient.disconnect();
    debugWebSocketClient.setEvents({
      onLog: (entry) => {
        this.logBuffer.push(entry);
        if (this.logBuffer.length > this.maxLogs) this.logBuffer.shift();
        if (this.session) this.session.logs.push(entry);
        globalEventBus.emit({ type: 'debug:log', payload: entry });
      },
      onSessionUpdate: (partial) => {
        if (this.session) Object.assign(this.session, partial);
      },
      onGameConnected: () => {
        if (this.session) this.session.gameConnected = true;
        this.log('info', '游戏客户端已连接', 'ws');
      },
      onGameDisconnected: () => {
        if (this.session) this.session.gameConnected = false;
        this.log('warn', '游戏客户端已断开', 'ws');
      },
      onBreakpointsSync: (breakpoints) => {
        if (this.session) this.session.breakpoints = breakpoints;
        breakpoints.forEach(bp => {
          if (!this.breakpointHitCounts.has(bp.id)) {
            this.breakpointHitCounts.set(bp.id, 0);
          }
        });
      },
      onBreakpointHit: (breakpointId) => {
        const count = this.incrementBreakpointHitCount(breakpointId);
        globalEventBus.emit({ type: 'debug:breakpointHit', payload: { breakpointId, hitCount: count } });
      },
      onError: (err) => this.log('error', err, 'ws'),
    });
    debugWebSocketClient.connect(wsUrl);
  }

  private extractPort(url: string): number {
    try {
      return Number(new URL(url).port) || 8081;
    } catch {
      return 8081;
    }
  }
}

export interface NativeBridge {
  isAvailable: () => boolean;
  startDebugServer: (opts: StartDebugOptions) => Promise<{
    sessionId: string;
    url: string;
    wsUrl: string;
    qrCodeDataUrl?: string;
    port: number;
  }>;
  stopDebugServer: () => Promise<void>;
  detectUnity: () => Promise<UnityInstallation[]>;
  validateUnityProject: (path: string) => Promise<UnityProjectValidation>;
  startUnityBuild: (config: import('@tapdev/types').BuildConfig) => Promise<{ taskId: string }>;
  cancelUnityBuild: (taskId: string) => Promise<void>;
  onBuildProgress: (cb: (data: { taskId: string; progress: number; message: string }) => void) => () => void;
  onBuildComplete: (cb: (result: import('@tapdev/types').BuildResult) => void) => () => void;
}

let nativeBridge: NativeBridge | null = null;

export function setNativeBridge(bridge: NativeBridge): void {
  nativeBridge = bridge;
}

export function getNativeBridge(): NativeBridge | null {
  return nativeBridge;
}

export const debugService = new DebugService();
