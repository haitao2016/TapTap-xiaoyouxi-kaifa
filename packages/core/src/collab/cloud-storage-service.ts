/**
 * 云端项目存储服务
 * - 增量同步（hash 比对）
 * - 云端项目列表
 * - 离线编辑队列
 * - 项目分享链接
 */
import { globalEventBus } from '../event-bus';
import { randomUUID, generateHash } from '../utils/crypto-utils';

export interface CloudProject {
  id: string;
  name: string;
  ownerId: string;
  /** 本地路径 */
  localPath: string;
  /** 远程最后修改时间 */
  remoteUpdatedAt: number;
  /** 本地最后修改时间 */
  localUpdatedAt: number;
  /** 同步状态 */
  syncStatus: 'synced' | 'pending-upload' | 'pending-download' | 'conflict';
  /** 文件清单及 hash */
  files: Map<string, { hash: string; size: number; updatedAt: number }>;
}

export interface ShareLink {
  token: string;
  url: string;
  projectId: string;
  permission: 'view' | 'edit';
  expiresAt: number;
}

export class CloudStorageService {
  private projects = new Map<string, CloudProject>();
  private shareLinks = new Map<string, ShareLink>();
  private offlineQueue: { projectId: string; op: 'upload' | 'download'; file: string }[] = [];
  private online = true;

  /**
   * 列出云端项目
   */
  async listProjects(): Promise<{ id: string; name: string; updatedAt: number }[]> {
    // 实际应从后端 API 获取
    return Array.from(this.projects.values()).map((p) => ({
      id: p.id,
      name: p.name,
      updatedAt: p.remoteUpdatedAt,
    }));
  }

  /**
   * 注册本地项目用于同步
   */
  registerProject(project: {
    name: string;
    localPath: string;
    files: { path: string; content: string }[];
  }): CloudProject {
    const id = randomUUID();
    const fileMap = new Map<string, { hash: string; size: number; updatedAt: number }>();
    const now = Date.now();
    for (const f of project.files) {
      fileMap.set(f.path, {
        hash: this.hashContent(f.content),
        size: f.content.length,
        updatedAt: now,
      });
    }
    const cp: CloudProject = {
      id,
      name: project.name,
      ownerId: 'local-user',
      localPath: project.localPath,
      remoteUpdatedAt: now,
      localUpdatedAt: now,
      syncStatus: 'synced',
      files: fileMap,
    };
    this.projects.set(id, cp);
    globalEventBus.emit({ type: 'cloud:project-registered', payload: cp });
    return cp;
  }

  /**
   * 同步项目（增量）
   */
  async syncProject(
    projectId: string,
    localFiles: { path: string; content: string }[]
  ): Promise<{
    uploaded: string[];
    downloaded: string[];
    conflicts: string[];
  }> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('项目不存在');
    if (!this.online) {
      for (const f of localFiles) {
        this.offlineQueue.push({ projectId, op: 'upload', file: f.path });
      }
      return { uploaded: [], downloaded: [], conflicts: [] };
    }

    const uploaded: string[] = [];
    const downloaded: string[] = [];
    const conflicts: string[] = [];
    const now = Date.now();

    for (const f of localFiles) {
      const localHash = this.hashContent(f.content);
      const remote = project.files.get(f.path);
      if (!remote) {
        await this.uploadFile(projectId, f.path, f.content);
        uploaded.push(f.path);
      } else if (remote.hash !== localHash) {
        // 简化的冲突处理：远程以服务器为准，本地保留副本
        conflicts.push(f.path);
        project.syncStatus = 'conflict';
      }
    }

    if (uploaded.length > 0) {
      project.localUpdatedAt = now;
      project.remoteUpdatedAt = now;
      project.syncStatus = uploaded.length === localFiles.length ? 'synced' : 'pending-upload';
    }

    globalEventBus.emit({
      type: 'cloud:sync-complete',
      payload: { projectId, uploaded, downloaded, conflicts },
    });
    return { uploaded, downloaded, conflicts };
  }

  /**
   * 生成分享链接
   */
  createShareLink(projectId: string, permission: 'view' | 'edit', expiresInHours = 24): ShareLink {
    const token = randomUUID();
    const link: ShareLink = {
      token,
      url: `https://studio.tapdev.cn/share/${token}`,
      projectId,
      permission,
      expiresAt: Date.now() + expiresInHours * 3600_000,
    };
    this.shareLinks.set(token, link);
    return link;
  }

  revokeShareLink(token: string): void {
    this.shareLinks.delete(token);
  }

  setOnline(online: boolean): void {
    this.online = online;
    if (online) this.flushOfflineQueue();
  }

  private async uploadFile(_projectId: string, _path: string, _content: string): Promise<void> {
    // 实际应上传到云端
    await new Promise((r) => setTimeout(r, 50));
  }

  private hashContent(content: string): string {
    return generateHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  private async flushOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;
    const queue = this.offlineQueue.splice(0);
    globalEventBus.emit({ type: 'cloud:offline-flush', payload: queue });
  }
}

export const cloudStorageService = new CloudStorageService();
