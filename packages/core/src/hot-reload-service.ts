import { globalEventBus } from './event-bus';
import { randomUUID } from './utils/crypto-utils';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface HotReloadClient {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  status: ConnectionStatus;
  connectedAt: number;
  lastSeen: number;
  ip?: string;
  port?: number;
  appVersion?: string;
  sdkVersion?: string;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  size?: number;
  timestamp: number;
  content?: string;
}

export interface PatchInfo {
  id: string;
  version: string;
  baseVersion: string;
  files: FileChange[];
  size: number;
  timestamp: number;
  hash: string;
}

export interface UpdateProgress {
  clientId: string;
  patchId: string;
  status: 'pending' | 'downloading' | 'applying' | 'done' | 'failed';
  progress: number;
  totalFiles: number;
  completedFiles: number;
  error?: string;
}

export interface HotReloadConfig {
  enabled: boolean;
  watchDirs: string[];
  ignorePatterns: string[];
  autoPush: boolean;
  debounce: number;
  maxPatchSize: number;
  preserveState: boolean;
}

export interface HeartbeatInfo {
  clientId: string;
  timestamp: number;
  latency: number;
}

const DEFAULT_CONFIG: HotReloadConfig = {
  enabled: true,
  watchDirs: ['src', 'assets'],
  ignorePatterns: ['node_modules', '.git', '*.map'],
  autoPush: true,
  debounce: 300,
  maxPatchSize: 10 * 1024 * 1024,
  preserveState: true,
};

export class HotReloadService {
  private clients = new Map<string, HotReloadClient>();
  private config: HotReloadConfig = { ...DEFAULT_CONFIG };
  private isWatching = false;
  private isServerRunning = false;
  private serverPort = 8082;
  private pendingChanges: FileChange[] = [];
  private debounceTimer: number | null = null;
  private heartbeatInterval: number | null = null;
  private updateHistory: PatchInfo[] = [];
  private maxHistorySize = 50;
  private currentPatchId: string | null = null;

  getConfig(): HotReloadConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<HotReloadConfig>): void {
    this.config = { ...this.config, ...config };
    globalEventBus.emit({ type: 'hotreload:configUpdated', payload: this.config });
  }

  getClients(): HotReloadClient[] {
    return Array.from(this.clients.values()).sort((a, b) => b.connectedAt - a.connectedAt);
  }

  getClient(id: string): HotReloadClient | undefined {
    return this.clients.get(id);
  }

  getConnectedClients(): HotReloadClient[] {
    return this.getClients().filter((c) => c.status === 'connected');
  }

  async startServer(port = 8082): Promise<void> {
    if (this.isServerRunning) return;

    this.serverPort = port;
    this.isServerRunning = true;

    this.startHeartbeatCheck();

    globalEventBus.emit({
      type: 'hotreload:serverStarted',
      payload: { port, url: `ws://localhost:${port}` },
    });

    this.simulateClientConnections();
  }

  stopServer(): void {
    if (!this.isServerRunning) return;

    this.isServerRunning = false;
    this.stopHeartbeatCheck();
    this.clients.clear();
    this.pendingChanges = [];

    globalEventBus.emit({ type: 'hotreload:serverStopped', payload: {} });
  }

  isServerActive(): boolean {
    return this.isServerRunning;
  }

  getServerPort(): number {
    return this.serverPort;
  }

  async connectClient(
    clientInfo: Omit<HotReloadClient, 'id' | 'status' | 'connectedAt' | 'lastSeen'>
  ): Promise<HotReloadClient> {
    const client: HotReloadClient = {
      ...clientInfo,
      id: randomUUID(),
      status: 'connected',
      connectedAt: Date.now(),
      lastSeen: Date.now(),
    };

    this.clients.set(client.id, client);

    globalEventBus.emit({ type: 'hotreload:clientConnected', payload: client });
    return client;
  }

  async disconnectClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.status = 'disconnected';
    this.clients.delete(clientId);

    globalEventBus.emit({ type: 'hotreload:clientDisconnected', payload: { clientId } });
  }

  startWatching(): void {
    if (this.isWatching) return;

    this.isWatching = true;
    this.pendingChanges = [];

    globalEventBus.emit({
      type: 'hotreload:watchingStarted',
      payload: { dirs: this.config.watchDirs },
    });
  }

  stopWatching(): void {
    if (!this.isWatching) return;

    this.isWatching = false;
    this.clearDebounceTimer();
    this.pendingChanges = [];

    globalEventBus.emit({ type: 'hotreload:watchingStopped', payload: {} });
  }

  isWatchingActive(): boolean {
    return this.isWatching;
  }

  onFileChange(change: FileChange): void {
    if (!this.isWatching) return;
    if (this.shouldIgnoreFile(change.path)) return;

    const existingIndex = this.pendingChanges.findIndex((c) => c.path === change.path);
    if (existingIndex >= 0) {
      if (change.type === 'deleted') {
        this.pendingChanges[existingIndex] = change;
      } else {
        this.pendingChanges[existingIndex] = {
          ...this.pendingChanges[existingIndex],
          ...change,
          type: this.pendingChanges[existingIndex].type === 'added' ? 'added' : 'modified',
        };
      }
    } else {
      this.pendingChanges.push(change);
    }

    this.schedulePatchGeneration();

    globalEventBus.emit({ type: 'hotreload:fileChanged', payload: change });
  }

  async generatePatch(): Promise<PatchInfo | null> {
    if (this.pendingChanges.length === 0) return null;

    const files = [...this.pendingChanges];
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    if (totalSize > this.config.maxPatchSize) {
      globalEventBus.emit({
        type: 'hotreload:error',
        payload: { error: `补丁大小超过限制: ${totalSize} > ${this.config.maxPatchSize}` },
      });
      return null;
    }

    const patch: PatchInfo = {
      id: randomUUID(),
      version: this.generateVersion(),
      baseVersion:
        this.updateHistory.length > 0
          ? this.updateHistory[this.updateHistory.length - 1].version
          : '0.0.0',
      files,
      size: totalSize,
      timestamp: Date.now(),
      hash: this.generateHash(files),
    };

    this.updateHistory.push(patch);
    if (this.updateHistory.length > this.maxHistorySize) {
      this.updateHistory.shift();
    }

    this.pendingChanges = [];
    this.currentPatchId = patch.id;

    globalEventBus.emit({ type: 'hotreload:patchGenerated', payload: patch });
    return patch;
  }

  async pushUpdates(clientIds?: string[]): Promise<PatchInfo | null> {
    const patch = await this.generatePatch();
    if (!patch) return null;

    const targets = clientIds
      ? (clientIds.map((id) => this.clients.get(id)).filter(Boolean) as HotReloadClient[])
      : this.getConnectedClients();

    if (targets.length === 0) {
      globalEventBus.emit({
        type: 'hotreload:warning',
        payload: { message: '没有连接的客户端' },
      });
      return patch;
    }

    globalEventBus.emit({
      type: 'hotreload:pushStart',
      payload: { patchId: patch.id, clientCount: targets.length, files: patch.files.length },
    });

    targets.forEach((client) => {
      this.simulatePushToClient(client, patch);
    });

    return patch;
  }

  async applyPatch(clientId: string, patch: PatchInfo): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client || client.status !== 'connected') {
      throw new Error('客户端未连接');
    }

    const progress: UpdateProgress = {
      clientId,
      patchId: patch.id,
      status: 'applying',
      progress: 0,
      totalFiles: patch.files.length,
      completedFiles: 0,
    };

    globalEventBus.emit({ type: 'hotreload:applyStart', payload: progress });

    await this.delay(500);

    progress.status = 'done';
    progress.progress = 100;
    progress.completedFiles = patch.files.length;

    globalEventBus.emit({ type: 'hotreload:applyComplete', payload: progress });
    return true;
  }

  getUpdateHistory(): PatchInfo[] {
    return [...this.updateHistory].sort((a, b) => b.timestamp - a.timestamp);
  }

  getLatestPatch(): PatchInfo | null {
    if (this.updateHistory.length === 0) return null;
    return this.updateHistory[this.updateHistory.length - 1];
  }

  rollback(patchId: string): Promise<boolean> {
    const patchIndex = this.updateHistory.findIndex((p) => p.id === patchId);
    if (patchIndex === -1) {
      throw new Error('补丁不存在');
    }

    globalEventBus.emit({ type: 'hotreload:rollbackStart', payload: { patchId } });

    return new Promise((resolve) => {
      setTimeout(() => {
        this.updateHistory.splice(patchIndex);
        globalEventBus.emit({ type: 'hotreload:rollbackComplete', payload: { patchId } });
        resolve(true);
      }, 500);
    });
  }

  getPendingChanges(): FileChange[] {
    return [...this.pendingChanges];
  }

  clearPendingChanges(): void {
    this.pendingChanges = [];
    this.clearDebounceTimer();
    globalEventBus.emit({ type: 'hotreload:pendingCleared', payload: {} });
  }

  getStats(): {
    connectedClients: number;
    totalUpdates: number;
    totalFilesPushed: number;
    averagePatchSize: number;
  } {
    const totalFiles = this.updateHistory.reduce((sum, p) => sum + p.files.length, 0);
    const totalSize = this.updateHistory.reduce((sum, p) => sum + p.size, 0);

    return {
      connectedClients: this.getConnectedClients().length,
      totalUpdates: this.updateHistory.length,
      totalFilesPushed: totalFiles,
      averagePatchSize: this.updateHistory.length > 0 ? totalSize / this.updateHistory.length : 0,
    };
  }

  clear(): void {
    this.stopServer();
    this.stopWatching();
    this.updateHistory = [];
    this.pendingChanges = [];
    this.clients.clear();
    globalEventBus.emit({ type: 'hotreload:cleared', payload: {} });
  }

  private schedulePatchGeneration(): void {
    if (!this.config.autoPush) return;

    this.clearDebounceTimer();
    this.debounceTimer = window.setTimeout(() => {
      this.pushUpdates().catch((error) => {
        globalEventBus.emit({
          type: 'hotreload:error',
          payload: { error: error instanceof Error ? error.message : '推送失败' },
        });
      });
    }, this.config.debounce);
  }

  private clearDebounceTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private shouldIgnoreFile(path: string): boolean {
    return this.config.ignorePatterns.some((pattern) => {
      if (pattern.startsWith('*')) {
        return path.endsWith(pattern.slice(1));
      }
      return path.includes(pattern);
    });
  }

  private startHeartbeatCheck(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = window.setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client) => {
        if (client.status === 'connected' && now - client.lastSeen > 30000) {
          client.status = 'error';
          globalEventBus.emit({
            type: 'hotreload:clientTimeout',
            payload: { clientId: client.id },
          });
        }
      });
    }, 10000);
  }

  private stopHeartbeatCheck(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private simulateClientConnections(): void {
    setTimeout(() => {
      if (!this.isServerRunning) return;

      const mockClients: Omit<HotReloadClient, 'id' | 'status' | 'connectedAt' | 'lastSeen'>[] = [
        {
          deviceId: 'dev_001',
          deviceName: 'Pixel 7 Pro',
          platform: 'android',
          ip: '192.168.1.101',
          port: 8082,
          appVersion: '1.0.0',
          sdkVersion: '0.3.0',
        },
        {
          deviceId: 'dev_002',
          deviceName: 'iPhone 15 Pro',
          platform: 'ios',
          ip: '192.168.1.102',
          port: 8082,
          appVersion: '1.0.0',
          sdkVersion: '0.3.0',
        },
      ];

      mockClients.forEach((client, index) => {
        setTimeout(() => {
          if (this.isServerRunning) {
            this.connectClient(client);
          }
        }, index * 1000);
      });
    }, 500);
  }

  private simulatePushToClient(client: HotReloadClient, patch: PatchInfo): void {
    const progress: UpdateProgress = {
      clientId: client.id,
      patchId: patch.id,
      status: 'downloading',
      progress: 0,
      totalFiles: patch.files.length,
      completedFiles: 0,
    };

    globalEventBus.emit({ type: 'hotreload:updateProgress', payload: progress });

    let completed = 0;
    const total = patch.files.length;

    const interval = setInterval(() => {
      completed += Math.ceil(Math.random() * 3);
      if (completed >= total) {
        completed = total;
        clearInterval(interval);
        progress.status = 'done';
        progress.progress = 100;
        progress.completedFiles = total;
        client.lastSeen = Date.now();
      } else {
        progress.progress = Math.round((completed / total) * 80);
        progress.completedFiles = completed;
      }

      globalEventBus.emit({ type: 'hotreload:updateProgress', payload: { ...progress } });
    }, 100);
  }

  private generateVersion(): string {
    const now = new Date();
    const major = now.getFullYear() % 100;
    const minor = now.getMonth() + 1;
    const patch = now.getDate();
    const build = Math.floor((now.getTime() / 1000) % 100000);
    return `${major}.${minor}.${patch}-${build}`;
  }

  private generateHash(files: FileChange[]): string {
    const content = files.map((f) => `${f.path}:${f.type}:${f.size || 0}`).join('|');
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const hotReloadService = new HotReloadService();
