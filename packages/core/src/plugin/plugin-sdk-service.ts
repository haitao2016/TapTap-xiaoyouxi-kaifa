// 插件 SDK 2.0 与开放平台
// 强大的扩展能力、开放市场、开发者收入分成

import { globalEventBus } from '../core/event-bus';

// 扩展点
export type ExtensionPoint =
  | 'editor:toolbar' // 编辑器工具栏
  | 'editor:context-menu' // 右键菜单
  | 'editor:status-bar' // 状态栏
  | 'editor:panel' // 侧边面板
  | 'editor:command' // 命令
  | 'editor:language' // 语言服务
  | 'editor:theme' // 主题
  | 'editor:webview' // WebView
  | 'build:task' // 构建任务
  | 'build:target' // 构建目标
  | 'debug:adapter' // 调试适配器
  | 'project:template' // 项目模板
  | 'asset:importer' // 资源导入器
  | 'asset:exporter' // 资源导出器
  | 'ai:provider' // AI 提供商
  | 'cloud:sync'; // 云同步

// 插件清单
export interface PluginManifest {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  publisher: string;
  license: string;
  icon?: string;
  homepage?: string;
  repository?: string;
  // 引擎
  engines: { tapdev: string; node?: string };
  // 入口
  main: string;
  // 贡献
  contributes: PluginContribution[];
  // 依赖
  dependencies: Record<string, string>;
  // 激活事件
  activationEvents: string[];
  // 类别
  categories: string[];
  keywords: string[];
}

// 插件贡献
export interface PluginContribution {
  point: ExtensionPoint;
  // 命令
  command?: { command: string; title: string; category?: string; icon?: string; shortcut?: string };
  // 菜单
  menu?: { location: string; command: string; group?: string; when?: string };
  // 面板
  panel?: { id: string; title: string; icon?: string; location: 'left' | 'right' | 'bottom' };
  // 主题
  theme?: { id: string; label: string; type: 'light' | 'dark' | 'high-contrast' };
  // 模板
  template?: {
    id: string;
    name: string;
    description: string;
    files: { path: string; content: string }[];
  };
  // AI Provider
  aiProvider?: { id: string; name: string; endpoint: string; models: string[] };
  // 自定义
  custom?: any;
}

// 插件开发者
export interface PluginDeveloper {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  organization?: string;
  website?: string;
  // 收入
  totalEarnings: number;
  monthlyEarnings: number;
  // 插件
  pluginIds: string[];
  joinedAt: number;
  // 银行信息（实际不应存于代码中）
  payoutInfo: {
    method: 'paypal' | 'alipay' | 'wechat' | 'bank';
    account: string;
    verified: boolean;
  };
}

// 收入分成
export interface RevenueShare {
  pluginId: string;
  developerId: string;
  period: { start: number; end: number };
  // 数据
  downloads: number;
  activeUsers: number;
  revenue: number;
  // 分成
  developerShare: number; // 0.7 (70%)
  platformShare: number; // 0.3 (30%)
  // 支付
  status: 'pending' | 'paid' | 'processing';
  paidAt?: number;
}

// 插件市场审核
export interface PluginReview {
  id: string;
  pluginId: string;
  version: string;
  status: 'pending' | 'in-review' | 'approved' | 'rejected' | 'changes-requested';
  reviewer?: string;
  comments: { author: string; content: string; timestamp: number }[];
  // 自动检查
  automatedChecks: {
    security: 'pass' | 'fail' | 'warning';
    performance: 'pass' | 'fail' | 'warning';
    compatibility: 'pass' | 'fail' | 'warning';
    codeQuality: 'pass' | 'fail' | 'warning';
  };
  submittedAt: number;
  reviewedAt?: number;
}

class PluginSDKService {
  private plugins = new Map<string, PluginManifest>();
  private developers = new Map<string, PluginDeveloper>();
  private reviews = new Map<string, PluginReview[]>();
  private revenueShares: RevenueShare[] = [];
  private listeners = new Set<(event: string, data: any) => void>();
  // 收入分成比例：开发者 70%，平台 30%
  private readonly DEVELOPER_SHARE = 0.7;

  // 注册插件
  registerPlugin(manifest: PluginManifest): void {
    this.plugins.set(manifest.id, manifest);
    this.notify('plugin:registered', manifest);
  }

  // 提交审核
  submitForReview(pluginId: string, version: string): PluginReview {
    const review: PluginReview = {
      id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pluginId,
      version,
      status: 'pending',
      comments: [],
      automatedChecks: this.runAutomatedChecks(pluginId),
      submittedAt: Date.now(),
    };

    if (!this.reviews.has(pluginId)) this.reviews.set(pluginId, []);
    this.reviews.get(pluginId)!.push(review);
    this.notify('plugin:submitted', review);
    return review;
  }

  // 运行自动检查
  private runAutomatedChecks(pluginId: string): PluginReview['automatedChecks'] {
    return {
      security: Math.random() < 0.9 ? 'pass' : 'warning',
      performance: Math.random() < 0.85 ? 'pass' : 'warning',
      compatibility: Math.random() < 0.95 ? 'pass' : 'warning',
      codeQuality: Math.random() < 0.8 ? 'pass' : 'warning',
    };
  }

  // 审核插件
  reviewPlugin(
    reviewId: string,
    decision: PluginReview['status'],
    reviewer: string,
    comment: string
  ): void {
    for (const reviews of this.reviews.values()) {
      const review = reviews.find((r) => r.id === reviewId);
      if (review) {
        review.status = decision;
        review.reviewer = reviewer;
        review.comments.push({ author: reviewer, content: comment, timestamp: Date.now() });
        review.reviewedAt = Date.now();
        this.notify('plugin:reviewed', review);
        return;
      }
    }
  }

  // 创建开发者账户
  createDeveloper(
    developer: Omit<
      PluginDeveloper,
      'id' | 'totalEarnings' | 'monthlyEarnings' | 'pluginIds' | 'joinedAt'
    >
  ): PluginDeveloper {
    const newDeveloper: PluginDeveloper = {
      ...developer,
      id: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      totalEarnings: 0,
      monthlyEarnings: 0,
      pluginIds: [],
      joinedAt: Date.now(),
    };
    this.developers.set(newDeveloper.id, newDeveloper);
    return newDeveloper;
  }

  // 计算收入分成
  calculateRevenueShare(
    pluginId: string,
    period: { start: number; end: number },
    revenue: number,
    downloads: number,
    activeUsers: number
  ): RevenueShare {
    const manifest = this.plugins.get(pluginId);
    if (!manifest) throw new Error('插件不存在');
    const developer = Array.from(this.developers.values()).find((d) =>
      d.pluginIds.includes(pluginId)
    );
    if (!developer) throw new Error('开发者不存在');

    const share: RevenueShare = {
      pluginId,
      developerId: developer.id,
      period,
      downloads,
      activeUsers,
      revenue,
      developerShare: revenue * this.DEVELOPER_SHARE,
      platformShare: revenue * (1 - this.DEVELOPER_SHARE),
      status: 'pending',
    };

    this.revenueShares.push(share);
    developer.totalEarnings += share.developerShare;
    developer.monthlyEarnings += share.developerShare;
    return share;
  }

  // 支付分成
  payShare(shareId: string): void {
    const share = this.revenueShares.find(
      (s) =>
        `${s.pluginId}-${s.period.start}` === shareId ||
        this.revenueShares.indexOf(s) === this.revenueShares.length - 1
    );
    if (!share) return;
    share.status = 'paid';
    share.paidAt = Date.now();
  }

  // 获取插件
  getPlugin(id: string): PluginManifest | undefined {
    return this.plugins.get(id);
  }

  // 列出插件
  listPlugins(filter?: { category?: string; verified?: boolean }): PluginManifest[] {
    let plugins = Array.from(this.plugins.values());
    if (filter?.category) plugins = plugins.filter((p) => p.categories.includes(filter.category!));
    if (filter?.verified !== undefined) {
      plugins = plugins.filter((p) => {
        const dev = Array.from(this.developers.values()).find((d) => d.pluginIds.includes(p.id));
        return dev?.verified === filter.verified;
      });
    }
    return plugins;
  }

  // 列出开发者
  listDevelopers(): PluginDeveloper[] {
    return Array.from(this.developers.values());
  }

  // 获取开发者
  getDeveloper(id: string): PluginDeveloper | undefined {
    return this.developers.get(id);
  }

  // 获取审核记录
  getReviews(pluginId: string): PluginReview[] {
    return this.reviews.get(pluginId) || [];
  }

  // 插件脚手架
  generateScaffolding(
    name: string,
    template: 'tool' | 'theme' | 'language' | 'panel' | 'ai-provider'
  ): { path: string; content: string }[] {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const files: { path: string; content: string }[] = [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: id,
            displayName: name,
            version: '0.1.0',
            description: `${name} 插件`,
            engines: { tapdev: '^3.0.0' },
            main: './out/extension.js',
            activationEvents: ['*'],
            contributes: [],
            keywords: [],
          },
          null,
          2
        ),
      },
      {
        path: 'src/extension.ts',
        content: `import * as tapdev from '@tapdev/plugin-api';

export function activate(context: tapdev.ExtensionContext) {
  console.log('${name} 插件已激活');

  // 注册命令
  const disposable = tapdev.commands.registerCommand('${id}.hello', () => {
    tapdev.window.showInformationMessage('Hello from ${name}!');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
`,
      },
      {
        path: 'README.md',
        content: `# ${name}

这是 ${name} 插件的说明文档。

## 功能
- 功能 1
- 功能 2

## 使用
\`\`\`typescript
// 激活后可在命令面板找到相关命令
\`\`\`
`,
      },
    ];

    if (template === 'theme') {
      files.push({
        path: 'themes/theme.json',
        content: JSON.stringify(
          {
            id: `${id}-theme`,
            label: name,
            type: 'dark',
            colors: {
              'editor.background': '#1e1e1e',
              'editor.foreground': '#d4d4d4',
            },
          },
          null,
          2
        ),
      });
    }

    return files;
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

export const pluginSDKService = new PluginSDKService();
