import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Icon, Input, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@tapdev/ui';
import { pluginMarketService, templateMarketService, snippetService } from '@tapdev/core';
import type { Plugin, ProjectTemplate } from '@tapdev/core';
import type { Snippet, SnippetCategory } from '@tapdev/types';
import { useAppStore } from '../store/app-store';

export function MarketPage() {
  const [activeTab, setActiveTab] = useState('plugins');
  const [pluginSearch, setPluginSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [snippetSearch, setSnippetSearch] = useState('');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [categories, setCategories] = useState<SnippetCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [newSnippet, setNewSnippet] = useState({ name: '', prefix: '', body: '', description: '' });

  useEffect(() => {
    loadPlugins();
    loadTemplates();
    loadSnippets();
  }, []);

  const loadPlugins = async () => {
    try {
      const result = await pluginMarketService.searchPlugins(pluginSearch);
      setPlugins(result);
    } catch (e) {
      console.error('加载插件失败:', e);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await templateMarketService.searchTemplates(templateSearch);
      setTemplates(result);
    } catch (e) {
      console.error('加载模板失败:', e);
    }
  };

  const loadSnippets = () => {
    setSnippets(snippetService.getSnippets());
    setCategories(snippetService.getCategories());
  };

  const handleInstallPlugin = async (pluginId: string) => {
    setIsLoading(true);
    try {
      await pluginMarketService.installPlugin(pluginId);
      await loadPlugins();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstallPlugin = async (pluginId: string) => {
    setIsLoading(true);
    try {
      await pluginMarketService.uninstallPlugin(pluginId);
      await loadPlugins();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    const template = templateMarketService.getTemplateById(templateId);
    if (template) {
      setSelectedTemplate(template);
    }
  };

  const handleAddSnippet = () => {
    if (!newSnippet.name || !newSnippet.prefix || !newSnippet.body) return;
    snippetService.addUserSnippet({
      id: `user-${Date.now()}`,
      name: newSnippet.name,
      description: newSnippet.description,
      prefix: newSnippet.prefix,
      body: newSnippet.body.split('\n'),
      category: 'user',
      scope: 'javascript,typescript',
    });
    setNewSnippet({ name: '', prefix: '', body: '', description: '' });
    setShowSnippetModal(false);
    loadSnippets();
  };

  const handleDeleteSnippet = (id: string) => {
    snippetService.removeUserSnippet(id);
    loadSnippets();
  };

  const filteredSnippets = snippets.filter((s) => {
    const matchesSearch = !snippetSearch ||
      s.name.toLowerCase().includes(snippetSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(snippetSearch.toLowerCase());
    const matchesCategory = !selectedCategory || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num.toLocaleString();
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border px-4 flex items-center justify-between">
          <TabsList className="mt-2">
            <TabsTrigger value="plugins">插件市场</TabsTrigger>
            <TabsTrigger value="templates">模板市场</TabsTrigger>
            <TabsTrigger value="snippets">代码片段</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="plugins" className="mt-0 flex-1 overflow-auto">
          <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    value={pluginSearch}
                    onChange={(e) => setPluginSearch(e.target.value)}
                    placeholder="搜索插件..."
                    onKeyDown={(e) => e.key === 'Enter' && loadPlugins()}
                  />
                </div>
                <select className="rounded-lg border border-border bg-surface-1 px-3 text-sm">
                  <option value="downloads">按下载量</option>
                  <option value="stars">按评分</option>
                  <option value="updated">按更新时间</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plugins.map((plugin) => (
                  <Card key={plugin.id} className="hover:border-tap-orange/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedPlugin(plugin)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-surface-2 flex items-center justify-center text-2xl shrink-0">
                          {plugin.icon || '🔌'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{plugin.name}</div>
                          <div className="text-xs text-text-muted truncate">{plugin.author}</div>
                        </div>
                        {plugin.installed && (
                          <Badge variant="success">已安装</Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                        {plugin.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Icon name="download" size={12} /> {formatNumber(plugin.downloads)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="star" size={12} /> {plugin.stars}
                          </span>
                        </div>
                        <span>v{plugin.version}</span>
                      </div>
                      {plugin.installed ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUninstallPlugin(plugin.id);
                          }}
                        >
                          卸载
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstallPlugin(plugin.id);
                          }}
                          disabled={isLoading}
                        >
                          安装
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {plugins.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                  <Icon name="search" size={48} className="mx-auto mb-4" />
                  <p>没有找到匹配的插件</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-0 flex-1 overflow-auto">
          <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="搜索模板..."
                    onKeyDown={(e) => e.key === 'Enter' && loadTemplates()}
                  />
                </div>
                <select className="rounded-lg border border-border bg-surface-1 px-3 text-sm">
                  <option value="">全部类型</option>
                  <option value="unity">Unity</option>
                  <option value="cocos">Cocos</option>
                  <option value="html5">HTML5</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:border-tap-orange/50 transition-colors cursor-pointer overflow-hidden"
                    onClick={() => handleUseTemplate(template.id)}>
                    <div className="h-32 bg-gradient-to-br from-tap-orange/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-4xl">{(template as any).icon || (template as any).thumbnail || '📦'}</span>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium">{template.name}</div>
                        <Badge variant="default">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <div className="flex items-center gap-2">
                          {(template.tags || []).slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="default">{tag}</Badge>
                          ))}
                        </div>
                        <span className="flex items-center gap-1">
                          <Icon name="download" size={12} /> {(template as any).downloads || 0}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {templates.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                  <Icon name="folder" size={48} className="mx-auto mb-4" />
                  <p>没有找到匹配的模板</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="snippets" className="mt-0 flex-1 overflow-auto">
          <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="w-64">
                    <Input
                      value={snippetSearch}
                      onChange={(e) => setSnippetSearch(e.target.value)}
                      placeholder="搜索代码片段..."
                    />
                  </div>
                </div>
                <Button onClick={() => setShowSnippetModal(true)}>
                  <Icon name="plus" size={14} /> 新建片段
                </Button>
              </div>

              <div className="flex gap-6">
                <div className="w-48 shrink-0 space-y-1">
                  <div
                    className={`px-3 py-2 rounded-lg cursor-pointer text-sm ${
                      !selectedCategory ? 'bg-tap-orange/10 text-tap-orange' : 'hover:bg-surface-2'
                    }`}
                    onClick={() => setSelectedCategory(null)}
                  >
                    全部
                  </div>
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className={`px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 ${
                        selectedCategory === cat.id ? 'bg-tap-orange/10 text-tap-orange' : 'hover:bg-surface-2'
                      }`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <Icon name={cat.icon || 'code'} size={14} />
                      {cat.name}
                    </div>
                  ))}
                </div>

                <div className="flex-1">
                  <div className="space-y-2">
                    {filteredSnippets.map((snippet) => (
                      <Card key={snippet.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-sm">{snippet.name}</div>
                              <div className="text-xs text-text-muted">{snippet.description}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default">{snippet.prefix}</Badge>
                              {(snippet as any).isUser && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteSnippet(snippet.id)}
                                >
                                  <Icon name="trash" size={12} />
                                </Button>
                              )}
                            </div>
                          </div>
                          <pre className="bg-surface-2 rounded p-3 text-xs font-mono overflow-auto max-h-32">
                            <code>{snippet.body.join('\n')}</code>
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {filteredSnippets.length === 0 && (
                    <div className="text-center py-12 text-text-muted">
                      <Icon name="code" size={48} className="mx-auto mb-4" />
                      <p>没有找到匹配的代码片段</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {selectedPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedPlugin(null)}>
          <Card className="max-w-lg w-full mx-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-surface-2 flex items-center justify-center text-2xl">
                  {selectedPlugin.icon || '🔌'}
                </div>
                <div className="flex-1">
                  <CardTitle>{selectedPlugin.name}</CardTitle>
                  <div className="text-xs text-text-muted">
                    {selectedPlugin.author} · v{selectedPlugin.version}
                  </div>
                </div>
                <button onClick={() => setSelectedPlugin(null)}>
                  <Icon name="close" size={20} className="text-text-muted" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{selectedPlugin.description}</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-surface-2 rounded-lg p-3">
                  <div className="text-lg font-bold">{formatNumber(selectedPlugin.downloads)}</div>
                  <div className="text-xs text-text-muted">下载量</div>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                  <div className="text-lg font-bold">{selectedPlugin.stars}</div>
                  <div className="text-xs text-text-muted">评分</div>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                  <div className="text-lg font-bold">{selectedPlugin.license}</div>
                  <div className="text-xs text-text-muted">协议</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">标签</div>
                <div className="flex flex-wrap gap-2">
                  {selectedPlugin.tags.map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              </div>
              {selectedPlugin.installed ? (
                <Button variant="secondary" className="w-full" onClick={() => {
                  handleUninstallPlugin(selectedPlugin.id);
                  setSelectedPlugin(null);
                }}>
                  卸载插件
                </Button>
              ) : (
                <Button className="w-full" onClick={() => {
                  handleInstallPlugin(selectedPlugin.id);
                  setSelectedPlugin(null);
                }}>
                  安装插件
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showSnippetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSnippetModal(false)}>
          <Card className="max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">新建代码片段</CardTitle>
                <button onClick={() => setShowSnippetModal(false)}>
                  <Icon name="close" size={20} className="text-text-muted" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary">名称</label>
                <Input
                  value={newSnippet.name}
                  onChange={(e) => setNewSnippet({ ...newSnippet, name: e.target.value })}
                  placeholder="片段名称"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary">触发前缀</label>
                <Input
                  value={newSnippet.prefix}
                  onChange={(e) => setNewSnippet({ ...newSnippet, prefix: e.target.value })}
                  placeholder="例如: myfunc"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary">描述</label>
                <Input
                  value={newSnippet.description}
                  onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
                  placeholder="片段描述"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary">代码</label>
                <textarea
                  value={newSnippet.body}
                  onChange={(e) => setNewSnippet({ ...newSnippet, body: e.target.value })}
                  placeholder="输入代码内容，使用 ${1:placeholder} 表示占位符"
                  className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm font-mono resize-none h-32 focus:outline-none focus:border-tap-orange/50"
                />
              </div>
              <Button className="w-full" onClick={handleAddSnippet} disabled={!newSnippet.name || !newSnippet.prefix || !newSnippet.body}>
                创建片段
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
