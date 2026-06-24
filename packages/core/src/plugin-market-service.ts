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
  sortBy?: 'downloads' | 'stars' | 'updated';
  page?: number;
  pageSize?: number;
}

export class PluginMarketService {
  private installedPlugins = new Map<string, PluginInstallation>();
  private marketplacePlugins: Plugin[] = [];
  private localPlugins: Plugin[] = [];

  constructor() {
    this.loadInstalledPlugins();
    this.loadMarketplacePlugins();
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

  getMarketplacePlugins(options?: PluginSearchOptions): Plugin[] {
    let result = [...this.marketplacePlugins];

    if (options?.query) {
      const query = options.query.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (options?.category) {
      result = result.filter(p => p.category === options.category);
    }

    switch (options?.sortBy) {
      case 'downloads':
        result.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'stars':
        result.sort((a, b) => b.stars - a.stars);
        break;
      case 'updated':
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return result.slice(start, end);
  }

  getCategories(): string[] {
    const categories = new Set(this.marketplacePlugins.map(p => p.category));
    return Array.from(categories).sort();
  }

  async installPlugin(pluginId: string, version?: string): Promise<PluginInstallation> {
    const plugin = this.marketplacePlugins.find(p => p.id === pluginId);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`);
    }

    const targetVersion = version || plugin.version;

    const installation: PluginInstallation = {
      pluginId,
      version: targetVersion,
      installedAt: Date.now(),
      enabled: true,
    };

    this.installedPlugins.set(pluginId, installation);
    this.saveInstalledPlugins();

    globalEventBus.emit({ type: 'plugin:installed', payload: { pluginId, version: targetVersion } });

    return installation;
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    this.installedPlugins.delete(pluginId);
    this.saveInstalledPlugins();
    globalEventBus.emit({ type: 'plugin:uninstalled', payload: { pluginId } });
  }

  togglePlugin(pluginId: string, enabled: boolean): void {
    const install = this.installedPlugins.get(pluginId);
    if (install) {
      install.enabled = enabled;
      this.saveInstalledPlugins();
      globalEventBus.emit({ type: 'plugin:toggled', payload: { pluginId, enabled } });
    }
  }

  getPluginById(pluginId: string): Plugin | undefined {
    return this.marketplacePlugins.find(p => p.id === pluginId) ||
           this.localPlugins.find(p => p.id === pluginId);
  }

  isPluginInstalled(pluginId: string): boolean {
    return this.installedPlugins.has(pluginId);
  }

  getPluginInstallation(pluginId: string): PluginInstallation | undefined {
    return this.installedPlugins.get(pluginId);
  }

  async searchPlugins(query: string): Promise<Plugin[]> {
    return this.getMarketplacePlugins({ query });
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
      // Ignore errors
    }
  }

  private saveInstalledPlugins(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = Object.fromEntries(this.installedPlugins.entries());
        localStorage.setItem('tapdev-installed-plugins', JSON.stringify(data));
      }
    } catch {
      // Ignore errors
    }
  }

  private loadMarketplacePlugins(): void {
    this.marketplacePlugins = [
      {
        id: 'tapdev-theme-manager',
        name: '主题管理器',
        description: '提供更多主题选项和自定义主题编辑器',
        version: '1.0.0',
        author: 'TapDev Team',
        category: 'ui',
        tags: ['theme', 'appearance', 'customization'],
        downloads: 1258,
        stars: 45,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0'],
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        license: 'MIT',
      },
      {
        id: 'tapdev-code-snippets',
        name: '代码片段扩展',
        description: '提供更多编程语言的代码片段',
        version: '1.2.0',
        author: 'TapDev Team',
        category: 'editor',
        tags: ['snippets', 'code', 'productivity'],
        downloads: 892,
        stars: 32,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0'],
        createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        license: 'MIT',
      },
      {
        id: 'tapdev-git-integration',
        name: 'Git 集成',
        description: '内置 Git 版本控制功能',
        version: '0.8.0',
        author: 'TapDev Team',
        category: 'version-control',
        tags: ['git', 'version-control', 'source-control'],
        downloads: 675,
        stars: 28,
        installed: false,
        compatibleVersions: ['0.3.0'],
        createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
        license: 'MIT',
      },
      {
        id: 'tapdev-performance',
        name: '性能分析器',
        description: '实时性能监控和分析工具',
        version: '1.0.0',
        author: 'TapDev Team',
        category: 'debug',
        tags: ['performance', 'profiling', 'debug'],
        downloads: 456,
        stars: 22,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0'],
        createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        license: 'MIT',
      },
      {
        id: 'tapdev-scene-exporter',
        name: '场景导出器',
        description: '将游戏场景导出为多种格式',
        version: '0.9.0',
        author: 'TapDev Team',
        category: 'tools',
        tags: ['export', 'scene', 'assets'],
        downloads: 321,
        stars: 18,
        installed: false,
        compatibleVersions: ['0.2.0', '0.3.0'],
        createdAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
        license: 'MIT',
      },
    ];
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
}

export const pluginMarketService = new PluginMarketService();