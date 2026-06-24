/**
 * TapTap SDK 版本管理与公告推送服务
 * - SDK 版本检测
 * - 一键升级 SDK
 * - 公告推送（Breaking Changes 提示）
 * - 兼容性报告
 */
import { globalEventBus } from '../event-bus';
import { tapTapAuthService } from './taptap-auth-service';

export interface SDKRelease {
  version: string;
  releaseDate: string;
  /** 变更类型 */
  type: 'major' | 'minor' | 'patch';
  /** 重大变更 */
  breaking: boolean;
  /** 变更日志 */
  changelog: string;
  /** 下载地址 */
  downloadUrl: string;
  /** npm 包名 */
  packageName: string;
  /** 兼容性提示 */
  compatNotes: string[];
}

export interface SDKInstalled {
  packageName: string;
  version: string;
  installedAt: number;
  path?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'breaking' | 'feature' | 'deprecation' | 'general';
  publishedAt: number;
  expiresAt?: number;
  read: boolean;
}

const KNOWN_PACKAGES = [
  '@tapdev/minigame-sdk',
  '@tapdev/minigame-sdk-unity',
  '@tapdev/minigame-sdk-cocos',
];

export class SDKManagerService {
  private installed = new Map<string, SDKInstalled>();
  private announcements: Announcement[] = [];
  private readonly updateListeners = new Set<() => void>();

  /**
   * 检测已安装的 SDK
   */
  async detectInstalled(projectPath: string): Promise<SDKInstalled[]> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const detected: SDKInstalled[] = [];
    const pkgPath = path.join(projectPath, 'package.json');
    try {
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      for (const name of KNOWN_PACKAGES) {
        const ver = all[name];
        if (ver) {
          const installed: SDKInstalled = {
            packageName: name,
            version: ver.replace(/^[\^~]/, ''),
            installedAt: Date.now(),
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

  /**
   * 查询可用版本
   */
  async listAvailableVersions(packageName: string): Promise<SDKRelease[]> {
    const account = tapTapAuthService.getActiveAccount();
    try {
      const res = await fetch(`https://api.taptap.cn/minigame/v1/sdk/versions?package=${packageName}`, {
        headers: account ? { Authorization: `Bearer ${account.accessToken}` } : {},
      });
      if (!res.ok) return this.mockReleases(packageName);
      const data = (await res.json()) as { data: SDKRelease[] };
      return data.data;
    } catch {
      return this.mockReleases(packageName);
    }
  }

  /**
   * 一键升级 SDK
   */
  async upgrade(projectPath: string, packageName: string, version: string): Promise<boolean> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const pkgPath = path.join(projectPath, 'package.json');
    try {
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      pkg.dependencies = pkg.dependencies ?? {};
      pkg.dependencies[packageName] = `^${version}`;
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
      this.installed.set(packageName, {
        packageName,
        version,
        installedAt: Date.now(),
      });
      this.notifyUpdate();
      globalEventBus.emit({ type: 'sdk:upgraded', payload: { packageName, version } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取公告列表
   */
  async fetchAnnouncements(): Promise<Announcement[]> {
    const account = tapTapAuthService.getActiveAccount();
    try {
      const res = await fetch('https://api.taptap.cn/minigame/v1/announcements', {
        headers: account ? { Authorization: `Bearer ${account.accessToken}` } : {},
      });
      if (!res.ok) return this.mockAnnouncements();
      const data = (await res.json()) as { data: Announcement[] };
      this.announcements = data.data.map((a) => ({ ...a, read: false }));
      return this.announcements;
    } catch {
      return this.mockAnnouncements();
    }
  }

  markRead(announcementId: string): void {
    const a = this.announcements.find((x) => x.id === announcementId);
    if (a) a.read = true;
  }

  /**
   * 订阅升级事件
   */
  onUpdate(listener: () => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  /**
   * 兼容性报告
   */
  generateCompatReport(): { compatible: boolean; warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    for (const sdk of this.installed.values()) {
      const ver = parseInt(sdk.version.split('.')[0], 10);
      if (ver < 2) {
        warnings.push(`${sdk.packageName} v${sdk.version} 已停止维护，建议升级到 v2.x+`);
        recommendations.push(`升级 ${sdk.packageName} 到最新版本`);
      }
    }
    if (this.announcements.some((a) => a.category === 'breaking' && !a.read)) {
      warnings.push('有未读的 Breaking Changes 公告，请检查兼容性');
    }
    return { compatible: warnings.length === 0, warnings, recommendations };
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
      },
      {
        id: 'a2',
        title: '【重要】支付 API v1 即将下线',
        content: 'TapPay v1 API 将于 2026-09-01 停止服务，请迁移到 v2。',
        category: 'breaking',
        publishedAt: Date.now() - 2 * 86400_000,
        read: false,
      },
    ];
  }
}

export const sdkManagerService = new SDKManagerService();
