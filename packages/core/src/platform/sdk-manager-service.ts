/**
 * TapTap SDK 版本管理与公告推送服务
 * - SDK 版本检测与查询
 * - SDK 下载安装模拟与进度跟踪
 * - 版本切换与回滚
 * - 依赖检查与兼容性报告
 * - 公告推送（Breaking Changes 提示）
 * - 多 SDK 包管理
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';
import { tapTapAuthService } from './taptap-auth-service';
import * as fs from 'fs';
import * as path from 'path';

export interface SDKRelease {
  version: string;
  releaseDate: string;
  type: 'major' | 'minor' | 'patch';
  breaking: boolean;
  changelog: string;
  downloadUrl: string;
  packageName: string;
  compatNotes: string[];
  fileSize: number;
  dependencies: { name: string; version: string }[];
}

export interface SDKInstalled {
  packageName: string;
  version: string;
  installedAt: number;
  path?: string;
  status: 'installed' | 'installing' | 'upgrading' | 'uninstalling' | 'error';
  previousVersion?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'breaking' | 'feature' | 'deprecation' | 'general';
  publishedAt: number;
  expiresAt?: number;
  read: boolean;
  affectedVersions?: string[];
}

export interface SDKDownloadProgress {
  packageName: string;
  version: string;
  progress: number;
  downloadedSize: number;
  totalSize: number;
  speed: number;
  stage: 'downloading' | 'verifying' | 'extracting' | 'installing' | 'completed';
}

export interface DependencyCheckResult {
  packageName: string;
  version: string;
  dependencies: { name: string; required: string; installed?: string; satisfied: boolean }[];
  allSatisfied: boolean;
  warnings: string[];
}

export interface CompatReport {
  compatible: boolean;
  warnings: string[];
  recommendations: string[];
  versionMatrix: { packageName: string; installed: string; latest: string; outdated: boolean }[];
}

const KNOWN_PACKAGES = [
  '@tapdev/minigame-sdk',
  '@tapdev/minigame-sdk-unity',
  '@tapdev/minigame-sdk-cocos',
  '@tapdev/tapdb-sdk',
  '@tapdev/tappay-sdk',
  '@tapdev/tapshare-sdk',
];

export class SDKManagerService {
  private installed = new Map<string, SDKInstalled>();
  private announcements: Announcement[] = [];
  private readonly updateListeners = new Set<() => void>();
  private readonly downloadListeners = new Map<
    string,
    Set<(progress: SDKDownloadProgress) => void>
  >();
  private downloadTasks = new Map<string, { packageName: string; version: string }>();
  private releaseCache = new Map<string, SDKRelease[]>();

  async detectInstalled(projectPath: string): Promise<SDKInstalled[]> {
    const detected: SDKInstalled[] = [];
    const pkgPath = path.join(projectPath, 'package.json');
    try {
      const content = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      for (const name of KNOWN_PACKAGES) {
        const ver = all[name];
        if (ver) {
          const installed: SDKInstalled = {
            packageName: name,
            version: ver.replace(/^[\^~]/, ''),
            installedAt: Date.now(),
            status: 'installed',
          };
          detected.push(installed);
          this.installed.set(name, installed);
        }
      }
    } catch {
      // no package.json
    }
    globalEventBus.emit({ type: 'sdk:detected', payload: detected });
    return detected;
  }

  async listAvailableVersions(packageName: string): Promise<SDKRelease[]> {
    if (this.releaseCache.has(packageName)) {
      return this.releaseCache.get(packageName)!;
    }
    const account = tapTapAuthService.getActiveAccount();
    try {
      const res = await fetch(
        `https://api.taptap.cn/minigame/v1/sdk/versions?package=${packageName}`,
        {
          headers: account ? { Authorization: `Bearer ${account.accessToken}` } : {},
        }
      );
      if (!res.ok) {
        const mock = this.mockReleases(packageName);
        this.releaseCache.set(packageName, mock);
        return mock;
      }
      const data = (await res.json()) as { data: SDKRelease[] };
      this.releaseCache.set(packageName, data.data);
      return data.data;
    } catch {
      const mock = this.mockReleases(packageName);
      this.releaseCache.set(packageName, mock);
      return mock;
    }
  }

  async getLatestVersion(packageName: string): Promise<SDKRelease | null> {
    const versions = await this.listAvailableVersions(packageName);
    return versions.length > 0 ? versions[0] : null;
  }

  async install(
    projectPath: string,
    packageName: string,
    version: string,
    onProgress?: (progress: SDKDownloadProgress) => void
  ): Promise<boolean> {
    const taskId = randomUUID();
    this.downloadTasks.set(taskId, { packageName, version });

    const existing = this.installed.get(packageName);
    if (existing) {
      existing.previousVersion = existing.version;
      existing.status = 'upgrading';
    } else {
      this.installed.set(packageName, {
        packageName,
        version,
        installedAt: Date.now(),
        status: 'installing',
      });
    }
    this.notifyUpdate();

    const emit = (
      stage: SDKDownloadProgress['stage'],
      progress: number,
      downloaded: number,
      total: number,
      speed: number
    ) => {
      const p: SDKDownloadProgress = {
        packageName,
        version,
        progress,
        downloadedSize: downloaded,
        totalSize: total,
        speed,
        stage,
      };
      onProgress?.(p);
      this.emitDownloadProgress(taskId, p);
    };

    try {
      const versions = await this.listAvailableVersions(packageName);
      const release = versions.find((v) => v.version === version) ?? versions[0];
      const totalSize = release?.fileSize ?? 5 * 1024 * 1024;

      const stages: {
        stage: SDKDownloadProgress['stage'];
        duration: number;
        startProgress: number;
        endProgress: number;
      }[] = [
        { stage: 'downloading', duration: 2000, startProgress: 0, endProgress: 60 },
        { stage: 'verifying', duration: 400, startProgress: 60, endProgress: 70 },
        { stage: 'extracting', duration: 800, startProgress: 70, endProgress: 90 },
        { stage: 'installing', duration: 600, startProgress: 90, endProgress: 100 },
      ];

      for (const s of stages) {
        const steps = 10;
        const stepDuration = s.duration / steps;
        for (let i = 0; i <= steps; i++) {
          const progress = s.startProgress + (s.endProgress - s.startProgress) * (i / steps);
          const downloaded = (progress / 100) * totalSize;
          const speed = i > 0 ? downloaded / ((s.duration * (i / steps)) / 1000) : 0;
          emit(s.stage, progress, downloaded, totalSize, speed);
          await new Promise((r) => setTimeout(r, stepDuration));
        }
      }

      await this.updatePackageJson(projectPath, packageName, version);

      const installed = this.installed.get(packageName)!;
      installed.version = version;
      installed.status = 'installed';
      installed.installedAt = Date.now();

      emit('completed', 100, totalSize, totalSize, 0);
      this.notifyUpdate();
      globalEventBus.emit({ type: 'sdk:installed', payload: { packageName, version } });
      return true;
    } catch (err) {
      const installed = this.installed.get(packageName);
      if (installed) {
        installed.status = 'error';
        if (installed.previousVersion) {
          installed.version = installed.previousVersion;
          installed.status = 'installed';
        }
      }
      this.notifyUpdate();
      return false;
    } finally {
      this.downloadTasks.delete(taskId);
    }
  }

  async upgrade(
    projectPath: string,
    packageName: string,
    version: string,
    onProgress?: (progress: SDKDownloadProgress) => void
  ): Promise<boolean> {
    return this.install(projectPath, packageName, version, onProgress);
  }

  async rollback(packageName: string): Promise<boolean> {
    const installed = this.installed.get(packageName);
    if (!installed?.previousVersion) return false;
    installed.version = installed.previousVersion;
    installed.previousVersion = undefined;
    this.notifyUpdate();
    globalEventBus.emit({
      type: 'sdk:rollback',
      payload: { packageName, version: installed.version },
    });
    return true;
  }

  async uninstall(projectPath: string, packageName: string): Promise<boolean> {
    const installed = this.installed.get(packageName);
    if (!installed) return false;
    installed.status = 'uninstalling';
    this.notifyUpdate();

    try {
      await this.removeFromPackageJson(projectPath, packageName);
      this.installed.delete(packageName);
      this.notifyUpdate();
      globalEventBus.emit({ type: 'sdk:uninstalled', payload: packageName });
      return true;
    } catch {
      installed.status = 'installed';
      this.notifyUpdate();
      return false;
    }
  }

  async checkDependencies(packageName: string, version: string): Promise<DependencyCheckResult> {
    const versions = await this.listAvailableVersions(packageName);
    const release = versions.find((v) => v.version === version) ?? versions[0];
    const deps = release?.dependencies ?? [];

    const results = deps.map((dep) => {
      const installedDep = this.installed.get(dep.name);
      return {
        name: dep.name,
        required: dep.version,
        installed: installedDep?.version,
        satisfied: installedDep
          ? this.compareVersions(installedDep.version, dep.version) >= 0
          : false,
      };
    });

    const warnings: string[] = [];
    for (const r of results) {
      if (!r.satisfied) {
        warnings.push(`依赖 ${r.name} 需要 ${r.required}，当前安装 ${r.installed ?? '未安装'}`);
      }
    }

    return {
      packageName,
      version,
      dependencies: results,
      allSatisfied: results.every((r) => r.satisfied),
      warnings,
    };
  }

  async generateCompatReport(): Promise<CompatReport> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const versionMatrix: {
      packageName: string;
      installed: string;
      latest: string;
      outdated: boolean;
    }[] = [];

    for (const sdk of this.installed.values()) {
      const latest = await this.getLatestVersion(sdk.packageName);
      if (latest) {
        const outdated = this.compareVersions(latest.version, sdk.version) > 0;
        versionMatrix.push({
          packageName: sdk.packageName,
          installed: sdk.version,
          latest: latest.version,
          outdated,
        });
        if (outdated) {
          warnings.push(`${sdk.packageName} v${sdk.version} 可升级到 v${latest.version}`);
          recommendations.push(`升级 ${sdk.packageName} 到 v${latest.version}`);
        }
        if (latest.breaking && outdated) {
          warnings.push(`${sdk.packageName} 最新版本 v${latest.version} 包含 Breaking Changes`);
        }
      }
      const ver = parseInt(sdk.version.split('.')[0], 10);
      if (ver < 2) {
        warnings.push(`${sdk.packageName} v${sdk.version} 已停止维护，建议升级到 v2.x+`);
        recommendations.push(`升级 ${sdk.packageName} 到最新版本`);
      }
    }

    if (this.announcements.some((a) => a.category === 'breaking' && !a.read)) {
      warnings.push('有未读的 Breaking Changes 公告，请检查兼容性');
    }

    return { compatible: warnings.length === 0, warnings, recommendations, versionMatrix };
  }

  async fetchAnnouncements(): Promise<Announcement[]> {
    const account = tapTapAuthService.getActiveAccount();
    try {
      const res = await fetch('https://api.taptap.cn/minigame/v1/announcements', {
        headers: account ? { Authorization: `Bearer ${account.accessToken}` } : {},
      });
      if (!res.ok) {
        this.announcements = this.mockAnnouncements();
        return this.announcements;
      }
      const data = (await res.json()) as { data: Announcement[] };
      this.announcements = data.data.map((a) => ({ ...a, read: false }));
      return this.announcements;
    } catch {
      this.announcements = this.mockAnnouncements();
      return this.announcements;
    }
  }

  markRead(announcementId: string): void {
    const a = this.announcements.find((x) => x.id === announcementId);
    if (a) a.read = true;
  }

  markAllRead(): void {
    for (const a of this.announcements) a.read = true;
  }

  getUnreadCount(): number {
    return this.announcements.filter((a) => !a.read).length;
  }

  onUpdate(listener: () => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  onDownloadProgress(
    packageName: string,
    listener: (progress: SDKDownloadProgress) => void
  ): () => void {
    if (!this.downloadListeners.has(packageName)) {
      this.downloadListeners.set(packageName, new Set());
    }
    this.downloadListeners.get(packageName)!.add(listener);
    return () => {
      this.downloadListeners.get(packageName)?.delete(listener);
    };
  }

  getInstalled(packageName: string): SDKInstalled | undefined {
    return this.installed.get(packageName);
  }

  listInstalled(): SDKInstalled[] {
    return Array.from(this.installed.values());
  }

  isInstalling(packageName: string): boolean {
    return (
      this.installed.get(packageName)?.status === 'installing' ||
      this.installed.get(packageName)?.status === 'upgrading'
    );
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map((n) => parseInt(n, 10));
    const pb = b.split('.').map((n) => parseInt(n, 10));
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] ?? 0;
      const nb = pb[i] ?? 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  private emitDownloadProgress(taskId: string, progress: SDKDownloadProgress): void {
    const listeners = this.downloadListeners.get(progress.packageName);
    if (!listeners) return;
    for (const l of listeners) l(progress);
  }

  private async updatePackageJson(
    projectPath: string,
    packageName: string,
    version: string
  ): Promise<void> {
    const pkgPath = path.join(projectPath, 'package.json');
    try {
      const content = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      pkg.dependencies = pkg.dependencies ?? {};
      pkg.dependencies[packageName] = `^${version}`;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  private async removeFromPackageJson(projectPath: string, packageName: string): Promise<void> {
    const pkgPath = path.join(projectPath, 'package.json');
    try {
      const content = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      if (pkg.dependencies) delete pkg.dependencies[packageName];
      if (pkg.devDependencies) delete pkg.devDependencies[packageName];
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  private notifyUpdate(): void {
    for (const l of this.updateListeners) l();
  }

  private mockReleases(packageName: string): SDKRelease[] {
    return [
      {
        version: '2.5.0',
        releaseDate: '2026-05-15',
        type: 'minor',
        breaking: false,
        changelog: '新增 5 个 API；优化登录性能；修复已知问题。',
        downloadUrl: `https://cdn.taptap.cn/sdk/${packageName}-2.5.0.tgz`,
        packageName,
        compatNotes: ['需要 TapTap 客户端 2.30+'],
        fileSize: 5242880,
        dependencies: [{ name: '@tapdev/core', version: '2.0.0' }],
      },
      {
        version: '2.4.0',
        releaseDate: '2026-04-10',
        type: 'minor',
        breaking: false,
        changelog: '新增分享组件；改进支付流程。',
        downloadUrl: `https://cdn.taptap.cn/sdk/${packageName}-2.4.0.tgz`,
        packageName,
        compatNotes: [],
        fileSize: 4980736,
        dependencies: [{ name: '@tapdev/core', version: '2.0.0' }],
      },
      {
        version: '2.3.1',
        releaseDate: '2026-03-20',
        type: 'patch',
        breaking: false,
        changelog: '修复若干已知 bug。',
        downloadUrl: `https://cdn.taptap.cn/sdk/${packageName}-2.3.1.tgz`,
        packageName,
        compatNotes: [],
        fileSize: 4718592,
        dependencies: [{ name: '@tapdev/core', version: '2.0.0' }],
      },
      {
        version: '1.9.0',
        releaseDate: '2025-12-01',
        type: 'major',
        breaking: true,
        changelog: '废弃旧版 API；性能优化 30%。',
        downloadUrl: `https://cdn.taptap.cn/sdk/${packageName}-1.9.0.tgz`,
        packageName,
        compatNotes: ['废弃 taptap.loginSync()，请使用 taptap.login() async 版本'],
        fileSize: 4194304,
        dependencies: [{ name: '@tapdev/core', version: '1.5.0' }],
      },
    ];
  }

  private mockAnnouncements(): Announcement[] {
    return [
      {
        id: 'a1',
        title: 'TapTap 小游戏 SDK v2.5.0 发布',
        content: '新增社交分享组件、性能优化、bug 修复，详见更新日志。',
        category: 'feature',
        publishedAt: Date.now() - 86400_000,
        read: false,
        affectedVersions: ['2.5.0'],
      },
      {
        id: 'a2',
        title: '【重要】支付 API v1 即将下线',
        content: 'TapPay v1 API 将于 2026-09-01 停止服务，请迁移到 v2。',
        category: 'breaking',
        publishedAt: Date.now() - 2 * 86400_000,
        read: false,
        affectedVersions: ['1.x', '2.0.x', '2.1.x', '2.2.x', '2.3.x'],
      },
      {
        id: 'a3',
        title: 'TapDB SDK 新增实时数据看板',
        content: 'TapDB SDK v2.4.0 新增实时看板功能，支持自定义指标。',
        category: 'feature',
        publishedAt: Date.now() - 5 * 86400_000,
        read: true,
        affectedVersions: ['2.4.0'],
      },
      {
        id: 'a4',
        title: '旧版分享接口将于下月弃用',
        content: 'taptap.share() 旧版接口将在 v2.6.0 中移除，请使用新版 Share API。',
        category: 'deprecation',
        publishedAt: Date.now() - 7 * 86400_000,
        read: false,
        affectedVersions: ['2.5.x'],
      },
    ];
  }
}

export const sdkManagerService = new SDKManagerService();
