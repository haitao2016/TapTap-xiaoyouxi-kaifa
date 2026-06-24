import { globalEventBus } from './event-bus';
import { randomUUID, createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  syncOnStartup: boolean;
  cloudStoragePath: string;
}

export interface SyncItem {
  id: string;
  type: string;
  data: any;
  lastModified: number;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'syncing';
}

export interface SyncConflict {
  id: string;
  filePath: string;
  local: SyncFileInfo;
  remote: SyncFileInfo;
  resolution?: 'local' | 'remote' | 'merge';
  resolvedAt?: number;
}

export interface SyncFileInfo {
  path: string;
  size: number;
  hash: string;
  lastModified: number;
  content?: string;
}

export interface SyncQueueItem {
  id: string;
  filePath: string;
  operation: 'upload' | 'download' | 'delete';
  priority: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  createdAt: number;
  error?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt?: number;
  pendingCount: number;
  conflictCount: number;
  totalFiles: number;
  syncedFiles: number;
  currentSyncFile?: string;
}

const DEFAULT_CONFIG: SyncConfig = {
  enabled: false,
  autoSync: true,
  syncInterval: 300000,
  syncOnStartup: true,
  cloudStoragePath: '',
};

export class CloudSyncService {
  private syncConfig: SyncConfig = { ...DEFAULT_CONFIG };
  private syncItems = new Map<string, SyncItem>();
  private syncIntervalId?: ReturnType<typeof setInterval>;
  private syncQueue: SyncQueueItem[] = [];
  private conflicts: SyncConflict[] = [];
  private localFiles = new Map<string, SyncFileInfo>();
  private remoteFiles = new Map<string, SyncFileInfo>();
  private syncing = false;
  private currentSyncFile?: string;
  private lastSyncAt?: number;

  constructor() {
    this.loadConfig();
    if (this.syncConfig.enabled && this.syncConfig.syncOnStartup) {
      this.initializeLocalFiles();
      this.initializeRemoteFiles();
    }
    if (this.syncConfig.enabled && this.syncConfig.autoSync) {
      this.startAutoSync();
    }
  }

  getConfig(): SyncConfig {
    return { ...this.syncConfig };
  }

  setConfig(config: Partial<SyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...config };
    this.saveConfig();

    if (this.syncConfig.enabled && this.syncConfig.autoSync) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  setCloudStoragePath(storagePath: string): void {
    this.syncConfig.cloudStoragePath = storagePath;
    this.saveConfig();
    if (this.syncConfig.enabled) {
      this.initializeRemoteFiles();
    }
  }

  initializeLocalFiles(basePath?: string): void {
    const targetPath = basePath ?? process.cwd();
    this.localFiles = this.scanDirectory(targetPath);
    globalEventBus.emit({ type: 'sync:local-scanned', payload: { count: this.localFiles.size } });
  }

  initializeRemoteFiles(): void {
    if (!this.syncConfig.cloudStoragePath) {
      this.remoteFiles = new Map();
      return;
    }
    try {
      if (!fs.existsSync(this.syncConfig.cloudStoragePath)) {
        fs.mkdirSync(this.syncConfig.cloudStoragePath, { recursive: true });
      }
      this.remoteFiles = this.scanDirectory(this.syncConfig.cloudStoragePath);
      globalEventBus.emit({ type: 'sync:remote-scanned', payload: { count: this.remoteFiles.size } });
    } catch {
      this.remoteFiles = new Map();
    }
  }

  private scanDirectory(dirPath: string, basePath?: string): Map<string, SyncFileInfo> {
    const files = new Map<string, SyncFileInfo>();
    const base = basePath ?? dirPath;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(base, fullPath);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          const subFiles = this.scanDirectory(fullPath, base);
          for (const [key, value] of subFiles) {
            files.set(key, value);
          }
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            const content = fs.readFileSync(fullPath, 'utf-8');
            const hash = this.computeHash(content);
            files.set(relativePath, {
              path: relativePath,
              size: stat.size,
              hash,
              lastModified: stat.mtime.getTime(),
            });
          } catch {
            // 跳过无法读取的文件
          }
        }
      }
    } catch {
      // 目录不存在时返回空
    }
    return files;
  }

  private computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  addSyncItem(type: string, data: any): string {
    const id = `${type}-${Date.now()}`;
    const item: SyncItem = {
      id,
      type,
      data,
      lastModified: Date.now(),
      syncStatus: 'pending',
    };

    this.syncItems.set(id, item);
    globalEventBus.emit({ type: 'sync:itemAdded', payload: item });

    if (this.syncConfig.autoSync && this.syncConfig.enabled) {
      this.queueSync(id, 'upload');
    }

    return id;
  }

  getSyncItem(id: string): SyncItem | undefined {
    return this.syncItems.get(id);
  }

  getAllSyncItems(): SyncItem[] {
    return Array.from(this.syncItems.values());
  }

  getSyncItemsByType(type: string): SyncItem[] {
    return Array.from(this.syncItems.values()).filter((item) => item.type === type);
  }

  getSyncStatus(): SyncStatus {
    return {
      isSyncing: this.syncing,
      lastSyncAt: this.lastSyncAt,
      pendingCount: this.syncQueue.filter((q) => q.status === 'queued').length,
      conflictCount: this.conflicts.filter((c) => !c.resolvedAt).length,
      totalFiles: this.localFiles.size,
      syncedFiles: this.getSyncedFilesCount(),
      currentSyncFile: this.currentSyncFile,
    };
  }

  private getSyncedFilesCount(): number {
    let count = 0;
    for (const [localPath, localFile] of this.localFiles) {
      const remoteFile = this.remoteFiles.get(localPath);
      if (remoteFile && remoteFile.hash === localFile.hash) {
        count++;
      }
    }
    return count;
  }

  getQueue(): SyncQueueItem[] {
    return [...this.syncQueue];
  }

  queueSync(filePath: string, operation: 'upload' | 'download' | 'delete', priority = 0): string {
    const existing = this.syncQueue.find((q) => q.filePath === filePath && q.status === 'queued');
    if (existing) {
      existing.priority = Math.max(existing.priority, priority);
      return existing.id;
    }
    const item: SyncQueueItem = {
      id: randomUUID(),
      filePath,
      operation,
      priority,
      status: 'queued',
      retryCount: 0,
      createdAt: Date.now(),
    };
    this.syncQueue.push(item);
    this.syncQueue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    globalEventBus.emit({ type: 'sync:queued', payload: item });
    if (this.syncConfig.enabled && !this.syncing) {
      this.processQueue();
    }
    return item.id;
  }

  private async processQueue(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;
    globalEventBus.emit({ type: 'sync:started' });
    try {
      while (this.syncQueue.length > 0) {
        const queued = this.syncQueue.find((q) => q.status === 'queued');
        if (!queued) break;
        queued.status = 'processing';
        this.currentSyncFile = queued.filePath;
        globalEventBus.emit({ type: 'sync:processing', payload: queued });
        try {
          await this.processQueueItem(queued);
          queued.status = 'completed';
          globalEventBus.emit({ type: 'sync:item-completed', payload: queued });
        } catch (error) {
          queued.retryCount++;
          if (queued.retryCount < 3) {
            queued.status = 'queued';
            queued.priority = Math.max(queued.priority - 1, -10);
          } else {
            queued.status = 'failed';
            queued.error = error instanceof Error ? error.message : String(error);
            globalEventBus.emit({ type: 'sync:item-failed', payload: queued });
          }
        }
      }
    } finally {
      this.syncing = false;
      this.currentSyncFile = undefined;
      this.lastSyncAt = Date.now();
      this.syncQueue = this.syncQueue.filter((q) => q.status === 'queued');
      globalEventBus.emit({ type: 'sync:completed', payload: { lastSyncAt: this.lastSyncAt } });
    }
  }

  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.syncConfig.cloudStoragePath) {
      throw new Error('云存储路径未配置');
    }
    if (item.operation === 'upload') {
      await this.uploadFile(item.filePath);
    } else if (item.operation === 'download') {
      await this.downloadFile(item.filePath);
    } else if (item.operation === 'delete') {
      await this.deleteRemoteFile(item.filePath);
    }
    await this.delay(100);
  }

  async syncItem(id: string): Promise<void> {
    const item = this.syncItems.get(id);
    if (!item) return;
    try {
      item.syncStatus = 'syncing';
      globalEventBus.emit({ type: 'sync:itemSyncing', payload: item });
      await this.uploadToCloud(item);
      item.syncStatus = 'synced';
      globalEventBus.emit({ type: 'sync:itemSynced', payload: item });
    } catch {
      item.syncStatus = 'pending';
      globalEventBus.emit({ type: 'sync:itemFailed', payload: item });
    }
  }

  async syncAll(): Promise<void> {
    if (!this.syncConfig.enabled) return;
    this.detectChanges();
    await this.processQueue();
    await this.downloadFromCloud();
  }

  detectChanges(): SyncConflict[] {
    const newConflicts: SyncConflict[] = [];
    const uploaded: string[] = [];
    const downloaded: string[] = [];
    for (const [localPath, localFile] of this.localFiles) {
      const remoteFile = this.remoteFiles.get(localPath);
      if (!remoteFile) {
        this.queueSync(localPath, 'upload', 1);
        uploaded.push(localPath);
      } else if (remoteFile.hash !== localFile.hash) {
        const conflict = this.createConflict(localPath, localFile, remoteFile);
        newConflicts.push(conflict);
        this.conflicts.push(conflict);
      }
    }
    for (const [remotePath, remoteFile] of this.remoteFiles) {
      if (!this.localFiles.has(remotePath)) {
        this.queueSync(remotePath, 'download', 1);
        downloaded.push(remotePath);
      }
    }
    if (newConflicts.length > 0) {
      globalEventBus.emit({ type: 'sync:conflicts-detected', payload: newConflicts });
    }
    globalEventBus.emit({
      type: 'sync:changes-detected',
      payload: { uploaded, downloaded, conflicts: newConflicts.length },
    });
    return newConflicts;
  }

  private createConflict(filePath: string, local: SyncFileInfo, remote: SyncFileInfo): SyncConflict {
    return {
      id: randomUUID(),
      filePath,
      local,
      remote,
    };
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedContent?: string,
  ): Promise<boolean> {
    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (!conflict || conflict.resolvedAt) return false;
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();
    if (resolution === 'local') {
      this.queueSync(conflict.filePath, 'upload', 10);
    } else if (resolution === 'remote') {
      this.queueSync(conflict.filePath, 'download', 10);
    } else if (resolution === 'merge' && mergedContent !== undefined) {
      await this.writeLocalFile(conflict.filePath, mergedContent);
      this.queueSync(conflict.filePath, 'upload', 10);
    }
    globalEventBus.emit({ type: 'sync:conflict-resolved', payload: conflict });
    return true;
  }

  getConflicts(): SyncConflict[] {
    return this.conflicts.filter((c) => !c.resolvedAt);
  }

  async checkForConflicts(): Promise<SyncConflict[]> {
    return this.detectChanges();
  }

  async uploadFile(filePath: string): Promise<void> {
    if (!this.syncConfig.cloudStoragePath) {
      throw new Error('云存储路径未配置');
    }
    const localFile = this.localFiles.get(filePath);
    if (!localFile) {
      throw new Error(`本地文件不存在: ${filePath}`);
    }
    const remotePath = path.join(this.syncConfig.cloudStoragePath, filePath);
    const remoteDir = path.dirname(remotePath);
    if (!fs.existsSync(remoteDir)) {
      fs.mkdirSync(remoteDir, { recursive: true });
    }
    const content = this.readLocalFile(filePath);
    if (content === null) {
      throw new Error(`读取文件失败: ${filePath}`);
    }
    fs.writeFileSync(remotePath, content, 'utf-8');
    const stat = fs.statSync(remotePath);
    this.remoteFiles.set(filePath, {
      path: filePath,
      size: stat.size,
      hash: this.computeHash(content),
      lastModified: stat.mtime.getTime(),
    });
    const syncItem = this.syncItems.get(filePath);
    if (syncItem) {
      syncItem.syncStatus = 'synced';
      syncItem.lastModified = Date.now();
    }
  }

  async downloadFile(filePath: string): Promise<void> {
    if (!this.syncConfig.cloudStoragePath) {
      throw new Error('云存储路径未配置');
    }
    const remoteFile = this.remoteFiles.get(filePath);
    if (!remoteFile) {
      throw new Error(`远程文件不存在: ${filePath}`);
    }
    const remotePath = path.join(this.syncConfig.cloudStoragePath, filePath);
    const content = fs.readFileSync(remotePath, 'utf-8');
    this.writeLocalFile(filePath, content);
    const syncItem = this.syncItems.get(filePath);
    if (syncItem) {
      syncItem.syncStatus = 'synced';
      syncItem.lastModified = Date.now();
    }
  }

  private async deleteRemoteFile(filePath: string): Promise<void> {
    if (!this.syncConfig.cloudStoragePath) return;
    const remotePath = path.join(this.syncConfig.cloudStoragePath, filePath);
    try {
      if (fs.existsSync(remotePath)) {
        fs.unlinkSync(remotePath);
      }
      this.remoteFiles.delete(filePath);
    } catch {
      // 删除失败时忽略
    }
  }

  private readLocalFile(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private writeLocalFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    const stat = fs.statSync(filePath);
    this.localFiles.set(filePath, {
      path: filePath,
      size: stat.size,
      hash: this.computeHash(content),
      lastModified: stat.mtime.getTime(),
    });
  }

  async backup(): Promise<string> {
    const backupId = `backup-${Date.now()}`;
    const backupData = {
      id: backupId,
      timestamp: Date.now(),
      files: Array.from(this.localFiles.entries()),
      items: Array.from(this.syncItems.values()),
    };
    const backupItem: SyncItem = {
      id: backupId,
      type: 'backup',
      data: backupData,
      lastModified: Date.now(),
      syncStatus: 'pending',
    };
    await this.uploadToCloud(backupItem);
    globalEventBus.emit({ type: 'sync:backup-created', payload: backupId });
    return backupId;
  }

  async restore(backupId: string): Promise<boolean> {
    try {
      const backupData = await this.downloadFromCloud(backupId);
      const data = JSON.parse(backupData);
      if (data.files) {
        for (const [filePath, fileInfo] of data.files as [string, SyncFileInfo][]) {
          if (fileInfo.content) {
            this.writeLocalFile(filePath, fileInfo.content);
          }
        }
      }
      if (data.items) {
        for (const item of data.items as SyncItem[]) {
          this.syncItems.set(item.id, item);
        }
      }
      globalEventBus.emit({ type: 'sync:restored', payload: backupId });
      return true;
    } catch {
      return false;
    }
  }

  getLocalFiles(): Map<string, SyncFileInfo> {
    return new Map(this.localFiles);
  }

  getRemoteFiles(): Map<string, SyncFileInfo> {
    return new Map(this.remoteFiles);
  }

  private startAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    this.syncIntervalId = setInterval(() => {
      this.syncAll();
    }, this.syncConfig.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }

  private async uploadToCloud(item: SyncItem): Promise<void> {
    if (!this.syncConfig.cloudStoragePath) {
      throw new Error('云存储路径未配置');
    }
    const filePath = path.join(this.syncConfig.cloudStoragePath, `${item.id}.json`);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(item, null, 2), 'utf-8');
    await this.delay(100);
  }

  private async downloadFromCloud(id?: string): Promise<string> {
    await this.delay(50);
    if (id && this.syncConfig.cloudStoragePath) {
      const filePath = path.join(this.syncConfig.cloudStoragePath, `${id}.json`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    }
    return JSON.stringify({});
  }

  private mergeItems(local: SyncItem, remote: SyncItem): SyncItem {
    return {
      ...local,
      data: { ...local.data, ...remote.data },
      lastModified: Date.now(),
    };
  }

  private loadConfig(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tapdev-sync-config');
        if (saved) {
          this.syncConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        }
      }
    } catch {
      // 忽略错误
    }
  }

  private saveConfig(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tapdev-sync-config', JSON.stringify(this.syncConfig));
      }
    } catch {
      // 忽略错误
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const cloudSyncService = new CloudSyncService();
