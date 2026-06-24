import { pluginManager } from './plugin-manager';
import { pluginMarketService } from './plugin-market-service';

export interface OfficialPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  enabledByDefault: boolean;
  dependencies?: string[];
}

export class OfficialPluginsService {
  private officialPlugins: OfficialPlugin[] = [];

  constructor() {
    this.registerOfficialPlugins();
  }

  getOfficialPlugins(): OfficialPlugin[] {
    return this.officialPlugins;
  }

  getOfficialPluginsByCategory(category: string): OfficialPlugin[] {
    return this.officialPlugins.filter(p => p.category === category);
  }

  getPluginById(id: string): OfficialPlugin | undefined {
    return this.officialPlugins.find(p => p.id === id);
  }

  async installOfficialPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.getPluginById(pluginId);
    if (!plugin) {
      return false;
    }

    try {
      await pluginManager.loadPlugin(pluginId);
      
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          await pluginManager.loadPlugin(dep);
        }
      }

      pluginMarketService.addLocalPlugin({
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        author: 'TapDev Team',
        category: plugin.category,
        tags: plugin.tags,
        downloads: 0,
        stars: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        license: 'MIT',
        compatibleVersions: ['0.2.0', '0.3.0'],
      });

      return true;
    } catch {
      return false;
    }
  }

  async installAllDefaultPlugins(): Promise<void> {
    const defaultPlugins = this.officialPlugins.filter(p => p.enabledByDefault);
    for (const plugin of defaultPlugins) {
      await this.installOfficialPlugin(plugin.id);
    }
  }

  isOfficialPlugin(pluginId: string): boolean {
    return this.officialPlugins.some(p => p.id === pluginId);
  }

  private registerOfficialPlugins(): void {
    this.officialPlugins = [
      {
        id: 'tapdev-core-ui',
        name: '核心UI组件',
        description: '提供基础UI组件和布局',
        version: '1.0.0',
        category: 'ui',
        tags: ['ui', 'components', 'layout'],
        enabledByDefault: true,
      },
      {
        id: 'tapdev-debugger',
        name: '调试器',
        description: '游戏调试和性能分析工具',
        version: '1.0.0',
        category: 'debug',
        tags: ['debug', 'debugger', 'performance'],
        enabledByDefault: true,
      },
      {
        id: 'tapdev-build',
        name: '构建工具',
        description: '项目构建和打包工具',
        version: '1.0.0',
        category: 'build',
        tags: ['build', 'compile', 'package'],
        enabledByDefault: true,
      },
      {
        id: 'tapdev-scene',
        name: '场景编辑器',
        description: '可视化场景编辑工具',
        version: '0.9.0',
        category: 'editor',
        tags: ['scene', 'editor', 'visual'],
        enabledByDefault: false,
      },
      {
        id: 'tapdev-assets',
        name: '资源管理器',
        description: '游戏资源管理和预览',
        version: '0.9.0',
        category: 'tools',
        tags: ['assets', 'resources', 'preview'],
        enabledByDefault: false,
      },
      {
        id: 'tapdev-profiler',
        name: '性能分析器',
        description: '实时性能监控和分析',
        version: '0.8.0',
        category: 'debug',
        tags: ['profiler', 'performance', 'monitoring'],
        enabledByDefault: false,
      },
    ];
  }
}

export const officialPluginsService = new OfficialPluginsService();