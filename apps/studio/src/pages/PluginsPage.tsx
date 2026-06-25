import { useEffect, useState, useMemo } from 'react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Input, Icon, Tabs, TabsList, TabsTrigger, TabsContent, Switch } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { pluginManager } from '@tapdev/core';
import type { PluginInfo } from '@tapdev/types';

interface MarketPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  downloads: number;
  rating: number;
  installed: boolean;
  icon: string;
  tags: string[];
}

const CATEGORIES = [
  { id: 'all', name: '全部', icon: 'grid' },
  { id: 'devtools', name: '开发工具', icon: 'wrench' },
  { id: 'themes', name: '主题美化', icon: 'palette' },
  { id: 'frameworks', name: '框架集成', icon: 'layers' },
  { id: 'analytics', name: '数据分析', icon: 'bar-chart' },
  { id: 'other', name: '其他', icon: 'more-horizontal' },
];

const MARKET_PLUGINS: MarketPlugin[] = [
  {
    id: 'unity-integration',
    name: 'Unity 深度集成',
    description: '提供 Unity 编辑器深度集成，支持脚本同步、资源预览、场景编辑等功能',
    version: '2.1.0',
    author: 'TapDev 官方',
    category: 'devtools',
    downloads: 12580,
    rating: 4.8,
    installed: true,
    icon: 'cpu',
    tags: ['官方', '推荐'],
  },
  {
    id: 'git-integration',
    name: 'Git 版本控制',
    description: '集成 Git 版本控制功能，支持提交、拉取、分支管理、冲突解决',
    version: '1.5.2',
    author: 'TapDev 官方',
    category: 'devtools',
    downloads: 9876,
    rating: 4.6,
    installed: true,
    icon: 'git-branch',
    tags: ['官方'],
  },
  {
    id: 'dark-theme-pro',
    name: '深色主题 Pro',
    description: '精心设计的深色主题，护眼舒适，支持多种配色方案自定义',
    version: '3.0.0',
    author: 'ThemeStudio',
    category: 'themes',
    downloads: 8543,
    rating: 4.9,
    installed: false,
    icon: 'moon',
    tags: ['热门'],
  },
  {
    id: 'light-theme',
    name: '清新浅色主题',
    description: '简洁明亮的浅色主题，适合日间使用，减少眼部疲劳',
    version: '1.2.0',
    author: 'DesignLab',
    category: 'themes',
    downloads: 6234,
    rating: 4.5,
    installed: false,
    icon: 'sun',
    tags: [],
  },
  {
    id: 'addressables',
    name: 'Addressables 管理',
    description: 'Unity Addressables 资源管理工具，支持资源打包、分析、优化',
    version: '1.8.0',
    author: 'UnityTech',
    category: 'frameworks',
    downloads: 5678,
    rating: 4.4,
    installed: false,
    icon: 'package',
    tags: [],
  },
  {
    id: 'playfab',
    name: 'PlayFab 集成',
    description: '微软 PlayFab 后端服务集成，支持玩家数据、排行榜、商店等功能',
    version: '2.0.1',
    author: 'Microsoft',
    category: 'frameworks',
    downloads: 4321,
    rating: 4.3,
    installed: false,
    icon: 'cloud',
    tags: [],
  },
  {
    id: 'analytics-dashboard',
    name: '数据分析面板',
    description: '强大的游戏数据分析面板，支持自定义指标、漏斗分析、留存分析',
    version: '1.3.0',
    author: 'DataPro',
    category: 'analytics',
    downloads: 3456,
    rating: 4.7,
    installed: false,
    icon: 'bar-chart-2',
    tags: ['热门'],
  },
  {
    id: 'crash-report',
    name: '崩溃报告',
    description: '自动收集和分析游戏崩溃信息，帮助快速定位和修复问题',
    version: '1.1.0',
    author: 'StabilityLab',
    category: 'analytics',
    downloads: 2890,
    rating: 4.6,
    installed: false,
    icon: 'alert-triangle',
    tags: [],
  },
  {
    id: 'code-snippets',
    name: '代码片段库',
    description: '丰富的 C# 代码片段库，提高编码效率，支持自定义片段',
    version: '2.2.0',
    author: 'CodeMaster',
    category: 'devtools',
    downloads: 7654,
    rating: 4.5,
    installed: false,
    icon: 'file-code',
    tags: ['推荐'],
  },
  {
    id: 'asset-preview',
    name: '资源预览器',
    description: '支持多种 Unity 资源格式的预览，包括模型、纹理、动画、音频',
    version: '1.4.0',
    author: 'AssetView',
    category: 'devtools',
    downloads: 5432,
    rating: 4.4,
    installed: false,
    icon: 'image',
    tags: [],
  },
  {
    id: 'localization',
    name: '本地化工具',
    description: '游戏本地化管理工具，支持多语言翻译、术语库、批量导入导出',
    version: '1.0.0',
    author: 'i18nTeam',
    category: 'other',
    downloads: 1234,
    rating: 4.2,
    installed: false,
    icon: 'globe',
    tags: ['新上线'],
  },
  {
    id: 'todo-list',
    name: '开发待办',
    description: '内置待办事项管理，支持任务优先级、截止日期、进度跟踪',
    version: '1.0.1',
    author: 'Productivity',
    category: 'other',
    downloads: 2345,
    rating: 4.3,
    installed: false,
    icon: 'check-square',
    tags: [],
  },
];

export function PluginsPage() {
  const { plugins, setPlugins, togglePlugin } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('market');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketPlugins, setMarketPlugins] = useState<MarketPlugin[]>(MARKET_PLUGINS);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      setError(null);
      const allPlugins = pluginManager.getAllPluginInfo();
      setPlugins(allPlugins);
      setMarketPlugins((prev) =>
        prev.map((p) => ({
          ...p,
          installed: allPlugins.some((ap) => ap.meta.id === p.id),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载插件失败');
    } finally {
      setLoading(false);
    }
  };

  const installedPlugins = useMemo(() => {
    return plugins;
  }, [plugins]);

  const activePlugins = useMemo(() => {
    return plugins.filter((p) => p.activated);
  }, [plugins]);

  const filteredMarketPlugins = useMemo(() => {
    let result = marketPlugins;

    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.author.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    return result;
  }, [marketPlugins, activeCategory, searchQuery]);

  const handleInstall = async (pluginId: string) => {
    try {
      setError(null);
      setLoading(true);
      const marketPlugin = marketPlugins.find((p) => p.id === pluginId);
      if (marketPlugin && !pluginManager.isPluginRegistered(pluginId)) {
        pluginManager.registerPlugin(
          {
            id: marketPlugin.id,
            name: marketPlugin.name,
            version: marketPlugin.version,
            description: marketPlugin.description,
            author: marketPlugin.author,
            enabled: true,
            entry: marketPlugin.id,
            hooks: [],
            icon: marketPlugin.icon,
            category: marketPlugin.category,
          },
          undefined,
          undefined
        );
        await pluginManager.activatePlugin(pluginId);
      }
      setMarketPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, installed: true } : p))
      );
      const allPlugins = pluginManager.getAllPluginInfo();
      setPlugins(allPlugins);
    } catch (err) {
      setError(err instanceof Error ? err.message : '安装插件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    try {
      setError(null);
      setLoading(true);
      if (pluginManager.isPluginRegistered(pluginId)) {
        pluginManager.unregisterPlugin(pluginId);
      }
      setMarketPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, installed: false } : p))
      );
      const allPlugins = pluginManager.getAllPluginInfo();
      setPlugins(allPlugins);
    } catch (err) {
      setError(err instanceof Error ? err.message : '卸载插件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (pluginId: string) => {
    try {
      setError(null);
      await togglePlugin(pluginId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const formatDownloads = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {error && (
        <div className="flex items-center justify-between border-b border-red-500/50 bg-red-500/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <Icon name="alert" size={16} className="text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">插件管理</h2>
          <p className="text-sm text-text-secondary">
            管理和扩展 TapDev Studio 的功能
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="hidden sm:inline-flex">
            已安装 {installedPlugins.length}
          </Badge>
          <Badge variant="default" className="hidden sm:inline-flex">
            已启用 {activePlugins.length}
          </Badge>
          <Button onClick={loadPlugins} disabled={loading}>
            <Icon name="refresh-cw" size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-border px-4">
            <TabsList>
              <TabsTrigger value="market">插件市场</TabsTrigger>
              <TabsTrigger value="installed">
                已安装
                {installedPlugins.length > 0 && (
                  <Badge variant="default" className="ml-1">{installedPlugins.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="market" className="mt-0 flex-1 overflow-auto">
            <div className="p-4 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Icon
                    name="search"
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input
                    placeholder="搜索插件..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                        activeCategory === cat.id
                          ? 'bg-tap-orange text-white'
                          : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                      }`}
                    >
                      <Icon name={cat.icon} size={14} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {loading && plugins.length === 0 ? (
                <div className="py-12 text-center">
                  <Icon name="loader" size={32} className="mx-auto mb-3 animate-spin text-text-muted" />
                  <p className="text-text-secondary">加载插件中...</p>
                </div>
              ) : filteredMarketPlugins.length === 0 ? (
                <div className="py-12 text-center">
                  <Icon name="search" size={40} className="mx-auto mb-3 text-text-muted" />
                  <p className="text-text-secondary">未找到相关插件</p>
                  <p className="mt-1 text-xs text-text-muted">尝试使用其他关键词或分类</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredMarketPlugins.map((plugin) => (
                    <Card key={plugin.id} className="flex flex-col">
                      <CardContent className="flex-1 flex flex-col p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tap-orange/10">
                            <Icon name={plugin.icon} size={24} className="text-tap-orange" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium leading-tight">{plugin.name}</div>
                            <div className="mt-0.5 text-xs text-text-muted">
                              {plugin.author} · v{plugin.version}
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-text-secondary line-clamp-2 mb-3 flex-1">
                          {plugin.description}
                        </p>

                        {plugin.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {plugin.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant={tag === '官方' || tag === '推荐' ? 'success' : 'default'}
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-text-muted mb-3">
                          <span className="flex items-center gap-1">
                            <Icon name="download" size={12} />
                            {formatDownloads(plugin.downloads)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="star" size={12} className="text-yellow-400" />
                            {plugin.rating}
                          </span>
                        </div>

                        <Button
                          variant={plugin.installed ? 'outline' : 'primary'}
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            plugin.installed ? handleUninstall(plugin.id) : handleInstall(plugin.id)
                          }
                          disabled={loading}
                        >
                          <Icon name={plugin.installed ? 'trash-2' : 'plus'} size={14} />
                          {plugin.installed ? '卸载' : '安装'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="installed" className="mt-0 flex-1 overflow-auto">
            <div className="p-4">
              {loading && plugins.length === 0 ? (
                <div className="py-12 text-center">
                  <Icon name="loader" size={32} className="mx-auto mb-3 animate-spin text-text-muted" />
                  <p className="text-text-secondary">加载插件中...</p>
                </div>
              ) : installedPlugins.length === 0 ? (
                <div className="py-12 text-center">
                  <Icon name="puzzle" size={40} className="mx-auto mb-3 text-text-muted" />
                  <p className="text-text-secondary">暂无已安装的插件</p>
                  <p className="mt-1 text-xs text-text-muted">前往插件市场发现更多功能</p>
                  <Button
                    className="mt-4"
                    onClick={() => setActiveTab('market')}
                  >
                    浏览插件市场
                  </Button>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-2">
                  {installedPlugins.map((plugin) => (
                    <div
                      key={plugin.meta.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tap-orange/10">
                          <Icon name="puzzle" size={20} className="text-tap-orange" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{plugin.meta.name}</span>
                            <span className="text-xs text-text-muted">v{plugin.meta.version}</span>
                          </div>
                          {plugin.meta.description && (
                            <p className="mt-1 text-sm text-text-muted line-clamp-1">
                              {plugin.meta.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={plugin.activated ? 'success' : 'default'}>
                          {plugin.activated ? '已启用' : '已禁用'}
                        </Badge>
                        <Switch
                          checked={plugin.activated}
                          onCheckedChange={() => handleToggle(plugin.meta.id)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUninstall(plugin.meta.id)}
                        >
                          <Icon name="trash-2" size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
