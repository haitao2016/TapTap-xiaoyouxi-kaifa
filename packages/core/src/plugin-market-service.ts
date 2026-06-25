import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  authorEmail?: string;
  authorUrl?: string;
  repository?: string;
  homepage?: string;
  category: string;
  tags: string[];
  icon?: string;
  downloads: number;
  stars: number;
  installed: boolean;
  installedVersion?: string;
  compatibleVersions: string[];
  createdAt: number;
  updatedAt: number;
  license: string;
  dependencies?: Record<string, string>;
  readme?: string;
  screenshots?: string[];
  changelog?: PluginVersion[];
  rating?: number;
  ratingCount?: number;
  featured?: boolean;
  verified?: boolean;
}

export interface PluginVersion {
  version: string;
  releaseDate: number;
  notes: string;
  breakingChanges?: boolean;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  main: string;
  type?: 'esm' | 'cjs';
  dependencies?: Record<string, string>;
  tapdevVersion: string;
}

export interface PluginInstallation {
  pluginId: string;
  version: string;
  installedAt: number;
  enabled: boolean;
}

export interface PluginSearchOptions {
  query?: string;
  category?: string;
  sortBy?: 'downloads' | 'stars' | 'updated' | 'name' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  tags?: string[];
  installed?: boolean;
  featured?: boolean;
  verified?: boolean;
}

export interface PluginSearchResult {
  plugins: Plugin[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PluginCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  pluginCount: number;
}

export interface InstallOptions {
  version?: string;
  enable?: boolean;
  onProgress?: (progress: number, stage: string) => void;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  changelog: PluginVersion[];
}

export class PluginMarketService {
  private installedPlugins = new Map<string, PluginInstallation>();
  private marketplacePlugins: Plugin[] = [];
  private localPlugins: Plugin[] = [];
  private categories: PluginCategory[] = [];

  constructor() {
    this.loadInstalledPlugins();
    this.loadMarketplacePlugins();
    this.loadCategories();
  }

  getInstalledPlugins(): Plugin[] {
    const plugins: Plugin[] = [];
    this.installedPlugins.forEach((install, pluginId) => {
      const marketplacePlugin = this.marketplacePlugins.find(p => p.id === pluginId);
      if (marketplacePlugin) {
        plugins.push({
          ...marketplacePlugin,
          installed: true,
          installedVersion: install.version,
        });
      } else {
        const localPlugin = this.localPlugins.find(p => p.id === pluginId);
        if (localPlugin) {
          plugins.push({
            ...localPlugin,
            installed: true,
            installedVersion: install.version,
          });
        }
      }
    });
    return plugins;
  }

  getMarketplacePlugins(options?: PluginSearchOptions): PluginSearchResult {
    let result = [...this.marketplacePlugins];

    if (options?.query) {
      const query = options.query.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query)) ||
        p.author.toLowerCase().includes(query)
      );
    }

    if (options?.category) {
      result = result.filter(p => p.category === options.category);
    }

    if (options?.tags && options.tags.length > 0) {
      result = result.filter(p => 
        options.tags!.some(tag => p.tags.includes(tag))
      );
    }

    if (options?.installed !== undefined) {
      result = result.filter(p => {
        const isInstalled = this.installedPlugins.has(p.id);
        return options.installed ? isInstalled : !isInstalled;
      });
    }

    if (options?.featured) {
      result = result.filter(p => p.featured);
    }

    if (options?.verified) {
      result = result.filter(p => p.verified);
    }

    const sortBy = options?.sortBy || 'downloads';
    const sortOrder = options?.sortOrder || 'desc';

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'downloads':
          comparison = b.downloads - a.downloads;
          break;
        case 'stars':
          comparison = b.stars - a.stars;
          break;
        case 'updated':
          comparison = b.updatedAt - a.updatedAt;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = (b.rating || 0) - (a.rating || 0);
          break;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    const total = result.length;
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const totalPages = Math.ceil(total / pageSize);

    return {
      plugins: result.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  getCategories(): PluginCategory[] {
    return this.categories;
  }

  getCategoryById(categoryId: string): PluginCategory | undefined {
    return this.categories.find(c => c.id === categoryId);
  }

  getPluginById(pluginId: string): Plugin | undefined {
    const marketplace = this.marketplacePlugins.find(p => p.id === pluginId);
    if (marketplace) {
      const installed = this.installedPlugins.has(pluginId);
      return {
        ...marketplace,
        installed,
        installedVersion: installed ? this.installedPlugins.get(pluginId)?.version : undefined,
      };
    }
    const local = this.localPlugins.find(p => p.id === pluginId);
    if (local) {
      const installed = this.installedPlugins.has(pluginId);
      return {
        ...local,
        installed,
        installedVersion: installed ? this.installedPlugins.get(pluginId)?.version : undefined,
      };
    }
    return undefined;
  }

  getPluginDetail(pluginId: string): Plugin | undefined {
    return this.getPluginById(pluginId);
  }

  isPluginInstalled(pluginId: string): boolean {
    return this.installedPlugins.has(pluginId);
  }

  getPluginInstallation(pluginId: string): PluginInstallation | undefined {
    return this.installedPlugins.get(pluginId);
  }

  async installPlugin(pluginId: string, options?: InstallOptions): Promise<PluginInstallation> {
    const plugin = this.marketplacePlugins.find(p => p.id === pluginId) || 
                   this.localPlugins.find(p => p.id === pluginId);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`);
    }

    const targetVersion = options?.version || plugin.version;

    if (options?.onProgress) {
      options.onProgress(10, '正在下载插件...');
      await this.delay(200);
      options.onProgress(40, '正在验证文件...');
      await this.delay(200);
      options.onProgress(70, '正在安装依赖...');
      await this.delay(200);
      options.onProgress(100, '安装完成');
    }

    const installation: PluginInstallation = {
      pluginId,
      version: targetVersion,
      installedAt: Date.now(),
      enabled: options?.enable !== false,
    };

    this.installedPlugins.set(pluginId, installation);
    this.saveInstalledPlugins();

    globalEventBus.emit({ 
      type: 'plugin:installed', 
      payload: { pluginId, version: targetVersion, plugin } 
    });

    return installation;
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const install = this.installedPlugins.get(pluginId);
    if (!install) return;

    globalEventBus.emit({ type: 'plugin:uninstalling', payload: { pluginId } });

    await this.delay(300);

    this.installedPlugins.delete(pluginId);
    this.saveInstalledPlugins();
    globalEventBus.emit({ type: 'plugin:uninstalled', payload: { pluginId } });
  }

  async updatePlugin(pluginId: string, targetVersion?: string): Promise<PluginInstallation> {
    const install = this.installedPlugins.get(pluginId);
    if (!install) {
      throw new Error(`插件未安装: ${pluginId}`);
    }

    const plugin = this.getPluginById(pluginId);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`);
    }

    const latestVersion = targetVersion || plugin.version;
    if (install.version === latestVersion) {
      return install;
    }

    globalEventBus.emit({ 
      type: 'plugin:updating', 
      payload: { pluginId, fromVersion: install.version, toVersion: latestVersion } 
    });

    await this.delay(500);

    install.version = latestVersion;
    this.saveInstalledPlugins();

    globalEventBus.emit({ 
      type: 'plugin:updated', 
      payload: { pluginId, version: latestVersion } 
    });

    return install;
  }

  getUpdateInfo(pluginId: string): UpdateInfo | null {
    const install = this.installedPlugins.get(pluginId);
    const plugin = this.getPluginById(pluginId);
    
    if (!install || !plugin) return null;

    return {
      hasUpdate: install.version !== plugin.version,
      currentVersion: install.version,
      latestVersion: plugin.version,
      changelog: plugin.changelog || [],
    };
  }

  getAllUpdates(): { pluginId: string; updateInfo: UpdateInfo }[] {
    const updates: { pluginId: string; updateInfo: UpdateInfo }[] = [];
    this.installedPlugins.forEach((_, pluginId) => {
      const updateInfo = this.getUpdateInfo(pluginId);
      if (updateInfo?.hasUpdate) {
        updates.push({ pluginId, updateInfo });
      }
    });
    return updates;
  }

  async updateAllPlugins(): Promise<void> {
    const updates = this.getAllUpdates();
    for (const { pluginId } of updates) {
      try {
        await this.updatePlugin(pluginId);
      } catch (error) {
        console.error(`更新插件 ${pluginId} 失败:`, error);
      }
    }
  }

  togglePlugin(pluginId: string, enabled: boolean): void {
    const install = this.installedPlugins.get(pluginId);
    if (install) {
      install.enabled = enabled;
      this.saveInstalledPlugins();
      globalEventBus.emit({ type: 'plugin:toggled', payload: { pluginId, enabled } });
    }
  }

  async searchPlugins(query: string, options?: Omit<PluginSearchOptions, 'query'>): Promise<PluginSearchResult> {
    return this.getMarketplacePlugins({ ...options, query });
  }

  getFeaturedPlugins(): Plugin[] {
    return this.marketplacePlugins.filter(p => p.featured);
  }

  getPopularPlugins(limit = 10): Plugin[] {
    return [...this.marketplacePlugins]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  getNewestPlugins(limit = 10): Plugin[] {
    return [...this.marketplacePlugins]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  getRelatedPlugins(pluginId: string, limit = 5): Plugin[] {
    const plugin = this.getPluginById(pluginId);
    if (!plugin) return [];

    return this.marketplacePlugins
      .filter(p => p.id !== pluginId && p.category === plugin.category)
      .slice(0, limit);
  }

  getPluginsByCategory(category: string): Plugin[] {
    return this.marketplacePlugins.filter(p => p.category === category);
  }

  addLocalPlugin(plugin: Omit<Plugin, 'installed'>): void {
    const existing = this.localPlugins.find(p => p.id === plugin.id);
    if (!existing) {
      this.localPlugins.push({ ...plugin, installed: false });
    }
  }

  removeLocalPlugin(pluginId: string): void {
    this.localPlugins = this.localPlugins.filter(p => p.id !== pluginId);
  }

  getLocalPlugins(): Plugin[] {
    return this.localPlugins;
  }

  getInstalledCount(): number {
    return this.installedPlugins.size;
  }

  getMarketplaceCount(): number {
    return this.marketplacePlugins.length;
  }

  private loadInstalledPlugins(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tapdev-installed-plugins');
        if (saved) {
          const data = JSON.parse(saved);
          Object.entries(data).forEach(([id, install]) => {
            this.installedPlugins.set(id, install as PluginInstallation);
          });
        }
      }
    } catch {
    }
  }

  private saveInstalledPlugins(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = Object.fromEntries(this.installedPlugins.entries());
        localStorage.setItem('tapdev-installed-plugins', JSON.stringify(data));
      }
    } catch {
    }
  }

  private loadMarketplacePlugins(): void {
    const now = Date.now();

    this.marketplacePlugins = [
      {
        id: 'tapdev-theme-manager',
        name: '主题管理器',
        description: '提供更多主题选项和自定义主题编辑器，支持自定义颜色、字体和界面样式',
        version: '1.2.0',
        author: 'TapDev Team',
        authorEmail: 'support@tapdev.io',
        repository: 'https://github.com/tapdev/theme-manager',
        homepage: 'https://tapdev.io/plugins/theme-manager',
        category: 'ui',
        tags: ['theme', 'appearance', 'customization', 'dark-mode'],
        icon: 'palette',
        downloads: 12580,
        stars: 456,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        createdAt: now - 60 * 24 * 60 * 60 * 1000,
        updatedAt: now - 2 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        readme: '# 主题管理器\n\n提供丰富的主题定制功能...',
        screenshots: ['theme-1.png', 'theme-2.png'],
        changelog: [
          { version: '1.2.0', releaseDate: now - 2 * 24 * 60 * 60 * 1000, notes: '新增主题编辑器，支持自定义配色方案' },
          { version: '1.1.0', releaseDate: now - 15 * 24 * 60 * 60 * 1000, notes: '新增 5 款预设主题' },
          { version: '1.0.0', releaseDate: now - 60 * 24 * 60 * 60 * 1000, notes: '初始版本' },
        ],
        rating: 4.8,
        ratingCount: 125,
        featured: true,
        verified: true,
      },
      {
        id: 'tapdev-code-formatter',
        name: '代码格式化',
        description: '强大的代码格式化工具，支持多种编程语言和格式化风格配置',
        version: '2.1.0',
        author: 'TapDev Team',
        authorEmail: 'support@tapdev.io',
        repository: 'https://github.com/tapdev/code-formatter',
        category: 'editor',
        tags: ['format', 'prettier', 'code', 'lint', 'productivity'],
        icon: 'code',
        downloads: 9820,
        stars: 378,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        createdAt: now - 50 * 24 * 60 * 60 * 1000,
        updatedAt: now - 1 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        readme: '# 代码格式化\n\n支持多种语言的代码格式化...',
        changelog: [
          { version: '2.1.0', releaseDate: now - 1 * 24 * 60 * 60 * 1000, notes: '新增 Vue/Svelte 支持，优化格式化性能' },
          { version: '2.0.0', releaseDate: now - 20 * 24 * 60 * 60 * 1000, notes: '重构格式化引擎，支持更多语言', breakingChanges: true },
        ],
        rating: 4.6,
        ratingCount: 89,
        featured: true,
        verified: true,
      },
      {
        id: 'tapdev-git-integration',
        name: 'Git 集成',
        description: '内置 Git 版本控制功能，支持提交、分支管理、冲突解决和代码审查',
        version: '1.5.0',
        author: 'TapDev Team',
        repository: 'https://github.com/tapdev/git-integration',
        category: 'version-control',
        tags: ['git', 'version-control', 'source-control', 'diff', 'merge'],
        icon: 'git-branch',
        downloads: 8750,
        stars: 425,
        installed: false,
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 40 * 24 * 60 * 60 * 1000,
        updatedAt: now - 3 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        readme: '# Git 集成\n\n完整的 Git 版本控制功能...',
        screenshots: ['git-1.png', 'git-2.png'],
        changelog: [
          { version: '1.5.0', releaseDate: now - 3 * 24 * 60 * 60 * 1000, notes: '新增交互式变基，优化冲突解决界面' },
          { version: '1.4.0', releaseDate: now - 10 * 24 * 60 * 60 * 1000, notes: '新增 GitHub/Gitee PR 集成' },
        ],
        rating: 4.9,
        ratingCount: 210,
        featured: true,
        verified: true,
      },
      {
        id: 'tapdev-ai-assistant',
        name: 'AI 编程助手',
        description: '智能 AI 助手，提供代码补全、代码生成、重构建议和错误诊断',
        version: '0.9.0',
        author: 'TapDev Team',
        category: 'ai',
        tags: ['ai', 'copilot', 'code-generation', 'completion', 'refactor'],
        icon: 'sparkles',
        downloads: 15680,
        stars: 520,
        installed: false,
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 25 * 24 * 60 * 60 * 1000,
        updatedAt: now - 12 * 60 * 60 * 1000,
        license: 'MIT',
        readme: '# AI 编程助手\n\n智能代码补全和生成...',
        changelog: [
          { version: '0.9.0', releaseDate: now - 12 * 60 * 60 * 1000, notes: '新增对话式 AI，支持多模型切换' },
          { version: '0.8.0', releaseDate: now - 5 * 24 * 60 * 60 * 1000, notes: '优化代码补全准确率' },
        ],
        rating: 4.7,
        ratingCount: 312,
        featured: true,
        verified: true,
      },
      {
        id: 'tapdev-deploy',
        name: '一键部署',
        description: '支持多种平台的一键部署功能，包括 TapTap、微信小游戏、Web 等',
        version: '1.3.0',
        author: 'TapDev Team',
        category: 'deployment',
        tags: ['deploy', 'publish', 'cdn', 'taptap', 'wechat'],
        icon: 'rocket',
        downloads: 6540,
        stars: 234,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        createdAt: now - 35 * 24 * 60 * 60 * 1000,
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        readme: '# 一键部署\n\n支持多平台部署...',
        changelog: [
          { version: '1.3.0', releaseDate: now - 5 * 24 * 60 * 60 * 1000, notes: '新增微信小游戏部署支持' },
          { version: '1.2.0', releaseDate: now - 18 * 24 * 60 * 60 * 1000, notes: '新增部署回滚功能' },
        ],
        rating: 4.5,
        ratingCount: 67,
        verified: true,
      },
      {
        id: 'tapdev-performance',
        name: '性能分析器',
        description: '实时性能监控和分析工具，帮助定位性能瓶颈',
        version: '1.1.0',
        author: 'TapDev Team',
        category: 'debug',
        tags: ['performance', 'profiling', 'debug', 'monitoring'],
        icon: 'activity',
        downloads: 4560,
        stars: 189,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        createdAt: now - 45 * 24 * 60 * 60 * 1000,
        updatedAt: now - 7 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        rating: 4.4,
        ratingCount: 45,
        verified: true,
      },
      {
        id: 'tapdev-scene-exporter',
        name: '场景导出器',
        description: '将游戏场景导出为多种格式，支持预览和批量导出',
        version: '0.9.0',
        author: 'TapDev Team',
        category: 'tools',
        tags: ['export', 'scene', 'assets', 'converter'],
        icon: 'download',
        downloads: 3210,
        stars: 98,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0'],
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now - 10 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        rating: 4.2,
        ratingCount: 28,
      },
      {
        id: 'tapdev-code-snippets',
        name: '代码片段扩展',
        description: '提供更多编程语言的代码片段和快捷模板',
        version: '1.2.0',
        author: 'TapDev Team',
        category: 'editor',
        tags: ['snippets', 'code', 'productivity', 'templates'],
        icon: 'file-code',
        downloads: 2890,
        stars: 112,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        createdAt: now - 55 * 24 * 60 * 60 * 1000,
        updatedAt: now - 15 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        rating: 4.3,
        ratingCount: 34,
      },
      {
        id: 'tapdev-translation',
        name: '国际化助手',
        description: '游戏多语言翻译管理工具，支持批量导入导出',
        version: '1.0.0',
        author: 'TapDev Team',
        category: 'tools',
        tags: ['i18n', 'translation', 'localization', 'i18next'],
        icon: 'globe',
        downloads: 1560,
        stars: 76,
        installed: false,
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 20 * 24 * 60 * 60 * 1000,
        updatedAt: now - 8 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        rating: 4.6,
        ratingCount: 19,
      },
      {
        id: 'tapdev-test-runner',
        name: '测试运行器',
        description: '集成单元测试和集成测试运行器，支持多种测试框架',
        version: '0.8.0',
        author: 'TapDev Team',
        category: 'testing',
        tags: ['test', 'unit-test', 'integration-test', 'jest', 'vitest'],
        icon: 'check-circle',
        downloads: 980,
        stars: 45,
        installed: false,
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 15 * 24 * 60 * 60 * 1000,
        updatedAt: now - 4 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        rating: 4.1,
        ratingCount: 12,
      },
    ];
  }

  private loadCategories(): void {
    const categoryMap = new Map<string, number>();
    this.marketplacePlugins.forEach(p => {
      categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
    });

    const categoryMeta: Record<string, { name: string; icon: string; description: string }> = {
      ui: { name: '界面美化', icon: 'palette', description: '主题、图标和界面定制插件' },
      editor: { name: '编辑器扩展', icon: 'edit-3', description: '增强编辑器功能的插件' },
      'version-control': { name: '版本控制', icon: 'git-branch', description: 'Git 和版本管理工具' },
      ai: { name: 'AI 工具', icon: 'sparkles', description: '人工智能辅助开发工具' },
      deployment: { name: '部署发布', icon: 'rocket', description: '构建、部署和发布工具' },
      debug: { name: '调试分析', icon: 'bug', description: '调试和性能分析工具' },
      tools: { name: '实用工具', icon: 'wrench', description: '各类开发辅助工具' },
      testing: { name: '测试工具', icon: 'check-circle', description: '测试和质量保证工具' },
    };

    this.categories = Array.from(categoryMap.entries()).map(([id, count]) => ({
      id,
      name: categoryMeta[id]?.name || id,
      icon: categoryMeta[id]?.icon,
      description: categoryMeta[id]?.description,
      pluginCount: count,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const pluginMarketService = new PluginMarketService();
