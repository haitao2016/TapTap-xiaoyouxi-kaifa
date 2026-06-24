import { globalEventBus } from './event-bus';

export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  syncOnStartup: boolean;
}

export interface SyncItem {
  id: string;
  type: string;
  data: any;
  lastModified: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface SyncConflict {
  local: SyncItem;
  remote: SyncItem;
  resolution: 'local' | 'remote' | 'merge';
}

export class CloudSyncService {
  private syncConfig: SyncConfig = {
    enabled: false,
    autoSync: true,
    syncInterval: 300000,
    syncOnStartup: true,
  };

  private syncItems = new Map<string, SyncItem>();
  private syncIntervalId?: ReturnType<typeof setInterval>;

  constructor() {
    this.loadConfig();
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

    if (this.syncConfig.autoSync) {
      this.syncItem(id);
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
    return Array.from(this.syncItems.values()).filter(item => item.type === type);
  }

  async syncItem(id: string): Promise<void> {
    const item = this.syncItems.get(id);
    if (!item) return;

    try {
      await this.uploadToCloud(item);
      item.syncStatus = 'synced';
      globalEventBus.emit({ type: 'sync:itemSynced', payload: item });
    } catch {
      item.syncStatus = 'pending';
      globalEventBus.emit({ type: 'sync:itemFailed', payload: item });
    }
  }

  async syncAll(): Promise<void> {
    const pendingItems = this.getAllSyncItems().filter(item => item.syncStatus !== 'synced');
    
    for (const item of pendingItems) {
      await this.syncItem(item.id);
    }

    await this.downloadFromCloud();
    globalEventBus.emit({ type: 'sync:completed' });
  }

  async resolveConflict(conflict: SyncConflict): Promise<void> {
    const { local, remote, resolution } = conflict;

    switch (resolution) {
      case 'local':
        await this.uploadToCloud(local);
        this.syncItems.set(local.id, { ...local, syncStatus: 'synced' });
        break;
      case 'remote':
        this.syncItems.set(remote.id, { ...remote, syncStatus: 'synced' });
        break;
      case 'merge':
        const merged = this.mergeItems(local, remote);
        await this.uploadToCloud(merged);
        this.syncItems.set(local.id, { ...merged, syncStatus: 'synced' });
        break;
    }

    globalEventBus.emit({ type: 'sync:conflictResolved', payload: conflict });
  }

  async checkForConflicts(): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];
    return conflicts;
  }

  async backup(): Promise<string> {
    const data = JSON.stringify(Array.from(this.syncItems.values()), null, 2);
    const backupId = `backup-${Date.now()}`;
    await this.uploadToCloud({
      id: backupId,
      type: 'backup',
      data,
      lastModified: Date.now(),
      syncStatus: 'pending',
    });
    return backupId;
  }

  async restore(backupId: string): Promise<boolean> {
    try {
      const backupData = await this.downloadFromCloud(backupId);
      const items = JSON.parse(backupData);
      items.forEach((item: SyncItem) => {
        this.syncItems.set(item.id, item);
      });
      globalEventBus.emit({ type: 'sync:restored', payload: backupId });
      return true;
    } catch {
      return false;
    }
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
    await this.delay(1000);
  }

  private async downloadFromCloud(id?: string): Promise<string> {
    await this.delay(500);
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
          this.syncConfig = JSON.parse(saved);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  private saveConfig(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tapdev-sync-config', JSON.stringify(this.syncConfig));
      }
    } catch {
      // Ignore errors
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const cloudSyncService = new CloudSyncService();