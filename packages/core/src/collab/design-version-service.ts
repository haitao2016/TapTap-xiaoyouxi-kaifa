// 设计资源版本管理
// PSD/AI/Figma 等设计文件的版本管理

import { globalEventBus } from '../core/event-bus';

// 设计资源类型
export type DesignFormat = 'psd' | 'ai' | 'figma' | 'sketch' | 'xd' | 'svg' | 'pdf';

// 设计资源
export interface DesignResource {
  id: string;
  name: string;
  format: DesignFormat;
  url: string;
  thumbnailUrl?: string;
  size: number; // bytes
  width?: number;
  height?: number;
  projectId: string;
  // 关联
  relatedCode?: { filePath: string; commitSha?: string }[];
  relatedCommits: string[];
  // 标签
  tags: string[];
  description?: string;
  // 状态
  status: 'draft' | 'in-progress' | 'final' | 'archived';
  // 元数据
  metadata: {
    designTool: string;
    version: string;
    colors: string[];
    fonts: string[];
    layers: number;
    artboards: number;
  };
  // 版本
  currentVersion: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  // 自动快照
  autoSnapshotEnabled: boolean;
  lastSnapshotAt?: number;
}

// 设计版本
export interface DesignVersion {
  id: string;
  resourceId: string;
  versionNumber: number;
  url: string;
  size: number;
  uploader: string;
  uploadedAt: number;
  changeNote: string;
  // 差异信息
  diff: {
    sizeDelta: number;
    layerChanges: { added: number; removed: number; modified: number };
    visualDiff: number; // 0-1 相似度
  };
  isAutoSnapshot: boolean;
  // 标签
  tag?: string; // v1.0, v1.1
}

// 版本对比结果
export interface VersionComparison {
  oldVersion: DesignVersion;
  newVersion: DesignVersion;
  differences: {
    layerChanges: { added: string[]; removed: string[]; modified: string[] };
    colorChanges: { added: string[]; removed: string[] };
    sizeDelta: number;
  };
  // 视觉对比图
  diffImage?: string;
}

class DesignVersionService {
  private resources = new Map<string, DesignResource>();
  private versions = new Map<string, DesignVersion[]>();
  private listeners = new Set<(event: string, data: any) => void>();
  private currentUser = 'user-1';
  private autoSnapshotInterval = 30 * 60 * 1000; // 30 分钟

  // 创建资源
  createResource(
    config: Omit<
      DesignResource,
      'id' | 'currentVersion' | 'createdAt' | 'updatedAt' | 'relatedCommits'
    >
  ): DesignResource {
    const resource: DesignResource = {
      ...config,
      id: `design-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      currentVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      relatedCommits: [],
    };
    this.resources.set(resource.id, resource);
    this.versions.set(resource.id, [
      {
        id: `ver-${Date.now()}`,
        resourceId: resource.id,
        versionNumber: 1,
        url: resource.url,
        size: resource.size,
        uploader: this.currentUser,
        uploadedAt: Date.now(),
        changeNote: '初始版本',
        diff: { sizeDelta: 0, layerChanges: { added: 0, removed: 0, modified: 0 }, visualDiff: 0 },
        isAutoSnapshot: false,
      },
    ]);

    if (resource.autoSnapshotEnabled) {
      this.scheduleAutoSnapshot(resource.id);
    }

    this.notify('resource:created', resource);
    return resource;
  }

  // 上传新版本
  uploadVersion(
    resourceId: string,
    file: { url: string; size: number },
    changeNote: string,
    isAutoSnapshot: boolean = false
  ): DesignVersion {
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error('资源不存在');

    const oldVersions = this.versions.get(resourceId) || [];
    const lastVersion = oldVersions[oldVersions.length - 1];
    const newVersion: DesignVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      resourceId,
      versionNumber: oldVersions.length + 1,
      url: file.url,
      size: file.size,
      uploader: this.currentUser,
      uploadedAt: Date.now(),
      changeNote,
      diff: this.calculateDiff(lastVersion, file),
      isAutoSnapshot,
    };

    oldVersions.push(newVersion);
    this.versions.set(resourceId, oldVersions);
    resource.currentVersion = newVersion.versionNumber;
    resource.url = file.url;
    resource.size = file.size;
    resource.updatedAt = Date.now();
    if (isAutoSnapshot) resource.lastSnapshotAt = Date.now();

    this.notify('version:uploaded', { resourceId, version: newVersion });
    return newVersion;
  }

  // 自动快照
  scheduleAutoSnapshot(resourceId: string): void {
    setInterval(() => {
      const resource = this.resources.get(resourceId);
      if (!resource) return;
      if (resource.status === 'archived' || resource.status === 'final') return;

      // 模拟自动快照
      this.uploadVersion(
        resourceId,
        {
          url: resource.url,
          size: resource.size + Math.floor(Math.random() * 1000),
        },
        '自动快照',
        true
      );
    }, this.autoSnapshotInterval);
  }

  // 计算差异
  private calculateDiff(
    oldVersion: DesignVersion | undefined,
    newFile: { size: number }
  ): DesignVersion['diff'] {
    if (!oldVersion) {
      return {
        sizeDelta: newFile.size,
        layerChanges: { added: 0, removed: 0, modified: 0 },
        visualDiff: 0,
      };
    }
    const sizeDelta = newFile.size - oldVersion.size;
    return {
      sizeDelta,
      layerChanges: {
        added: Math.floor(Math.random() * 5),
        removed: Math.floor(Math.random() * 3),
        modified: Math.floor(Math.random() * 10),
      },
      visualDiff: 0.7 + Math.random() * 0.3,
    };
  }

  // 添加版本标签
  tagVersion(resourceId: string, versionNumber: number, tag: string): void {
    const versions = this.versions.get(resourceId) || [];
    const v = versions.find((v) => v.versionNumber === versionNumber);
    if (!v) throw new Error('版本不存在');
    v.tag = tag;
    this.notify('version:tagged', { resourceId, versionNumber, tag });
  }

  // 比较版本
  compareVersions(resourceId: string, oldV: number, newV: number): VersionComparison {
    const versions = this.versions.get(resourceId) || [];
    const vA = versions.find((v) => v.versionNumber === oldV);
    const vB = versions.find((v) => v.versionNumber === newV);
    if (!vA || !vB) throw new Error('版本不存在');

    return {
      oldVersion: vA,
      newVersion: vB,
      differences: {
        layerChanges: {
          added: [`新背景层 v${newV}`, `新装饰元素 v${newV}`],
          removed: [`已删除的占位符`],
          modified: [`主标题`, `按钮样式`],
        },
        colorChanges: {
          added: ['#FF6B6B', '#4ECDC4'],
          removed: ['#999999'],
        },
        sizeDelta: vB.size - vA.size,
      },
      diffImage: this.generateDiffImage(resourceId, oldV, newV),
    };
  }

  // 生成 diff 图
  private generateDiffImage(resourceId: string, v1: number, v2: number): string {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="200" height="300" fill="#444"/><rect x="200" width="200" height="300" fill="#666"/><text x="100" y="150" text-anchor="middle" fill="white">v${v1}</text><text x="300" y="150" text-anchor="middle" fill="white">v${v2}</text></svg>`;
  }

  // 关联 Git 提交
  linkCommit(resourceId: string, commitSha: string): void {
    const resource = this.resources.get(resourceId);
    if (!resource) return;
    if (!resource.relatedCommits.includes(commitSha)) {
      resource.relatedCommits.push(commitSha);
    }
    this.notify('commit:linked', { resourceId, commitSha });
  }

  // 关联代码文件
  linkCodeFile(resourceId: string, filePath: string, commitSha?: string): void {
    const resource = this.resources.get(resourceId);
    if (!resource) return;
    if (!resource.relatedCode) resource.relatedCode = [];
    resource.relatedCode.push({ filePath, commitSha });
    this.notify('code:linked', { resourceId, filePath });
  }

  // 恢复历史版本
  restoreVersion(resourceId: string, versionNumber: number): DesignVersion {
    const versions = this.versions.get(resourceId) || [];
    const v = versions.find((v) => v.versionNumber === versionNumber);
    if (!v) throw new Error('版本不存在');
    return this.uploadVersion(
      resourceId,
      { url: v.url, size: v.size },
      `从 v${versionNumber} 恢复`
    );
  }

  // 搜索资源
  searchResources(
    query: string,
    filter?: { format?: DesignFormat; status?: DesignResource['status']; projectId?: string }
  ): DesignResource[] {
    const q = query.toLowerCase();
    let resources = Array.from(this.resources.values());
    if (filter?.format) resources = resources.filter((r) => r.format === filter.format);
    if (filter?.status) resources = resources.filter((r) => r.status === filter.status);
    if (filter?.projectId) resources = resources.filter((r) => r.projectId === filter.projectId);
    return resources.filter(
      (r) => r.name.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // 获取资源
  getResource(resourceId: string): DesignResource | undefined {
    return this.resources.get(resourceId);
  }

  // 列出资源
  listResources(filter?: { projectId?: string }): DesignResource[] {
    let resources = Array.from(this.resources.values());
    if (filter?.projectId) resources = resources.filter((r) => r.projectId === filter.projectId);
    return resources.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // 获取版本历史
  getVersions(resourceId: string): DesignVersion[] {
    return this.versions.get(resourceId) || [];
  }

  // 获取指定版本
  getVersion(resourceId: string, versionNumber: number): DesignVersion | undefined {
    const versions = this.versions.get(resourceId) || [];
    return versions.find((v) => v.versionNumber === versionNumber);
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const designVersionService = new DesignVersionService();
