import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from '@tapdev/ui';
import { pluginManager } from '@tapdev/core';
import { useState } from 'react';
import type { PluginInfo, CommandPaletteItem } from '@tapdev/types';

export function PluginsPage() {
  const [activeTab, setActiveTab] = useState('plugins');
  const [searchQuery, setSearchQuery] = useState('');
  const [pluginDetails, setPluginDetails] = useState<PluginInfo | null>(null);

  const plugins = pluginManager.getAllPluginInfo();
  const commands = pluginManager.getCommandPaletteItems(searchQuery);

  const togglePlugin = async (pluginId: string, enabled: boolean) => {
    if (enabled) {
      await pluginManager.deactivatePlugin(pluginId);
    } else {
      await pluginManager.activatePlugin(pluginId);
    }
    setPluginDetails(null);
  };

  const getCategoryItems = (items: CommandPaletteItem[]) => {
    const categories: Record<string, CommandPaletteItem[]> = {};
    items.forEach((item) => {
      const category = item.category || '其他';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });
    return categories;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">插件管理</h2>
        <p className="text-sm text-text-secondary">
          扩展 TapDev Studio 功能，支持自定义插件开发
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="plugins">插件列表</TabsTrigger>
          <TabsTrigger value="commands">命令面板</TabsTrigger>
          <TabsTrigger value="develop">开发指南</TabsTrigger>
        </TabsList>

        <TabsContent value="plugins" className="mt-0 space-y-4">
          {plugins.map((plugin) => (
            <Card key={plugin.meta.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
                      <span className="text-sm">{plugin.meta.icon || '📦'}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{plugin.meta.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Badge variant="default">v{plugin.meta.version}</Badge>
                        {plugin.meta.category && (
                          <span>{plugin.meta.category}</span>
                        )}
                        {plugin.activated && <Badge variant="success">已激活</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPluginDetails(plugin)}
                    >
                      详情
                    </Button>
                    <Button
                      size="sm"
                      variant={plugin.meta.enabled ? 'secondary' : 'primary'}
                      onClick={() => togglePlugin(plugin.meta.id, plugin.meta.enabled)}
                    >
                      {plugin.meta.enabled ? '禁用' : '启用'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{plugin.meta.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plugin.meta.hooks.map((hook) => (
                    <span
                      key={hook}
                      className="rounded bg-surface-2 px-2 py-0.5 font-mono text-xs text-text-muted"
                    >
                      {hook}
                    </span>
                  ))}
                </div>
                {plugin.author && (
                  <p className="mt-2 text-xs text-text-muted">作者: {plugin.author}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="commands" className="mt-0">
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索命令..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
            />
          </div>

          {commands.length === 0 ? (
            <Card>
              <CardContent className="text-center text-text-muted">
                未找到匹配的命令
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(getCategoryItems(commands)).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">{category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
                        onClick={() => pluginManager.executeCommandPaletteItem(item.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{item.icon || '⚡'}</span>
                          <div>
                            <div className="text-sm font-medium">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-text-muted">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                        {item.shortcut && (
                          <Badge variant="default" className="font-mono text-xs">
                            {item.shortcut}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="develop" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>创建自定义插件</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-lg bg-surface-2 p-4 font-mono text-xs">
{`// plugins/my-plugin/index.ts
import type { PluginContext } from '@tapdev/types';

export function activate(ctx: PluginContext) {
  // 注册命令
  ctx.registerCommand('my-command', async () => {
    ctx.showNotification('Hello from my plugin!', 'success');
  }, {
    id: 'my-command',
    title: '我的命令',
    description: '执行自定义操作',
    icon: 'star',
    shortcut: 'Ctrl+M',
    category: '自定义',
  });

  // 注册面板
  ctx.registerPanel('my-panel', {
    id: 'my-panel',
    title: '我的面板',
    icon: 'panel',
    component: 'MyPanel',
    defaultPosition: 'right',
    defaultSize: 400,
  });

  // 注册动作
  ctx.registerAction({
    id: 'my-action',
    type: 'command',
    label: '我的动作',
    icon: 'zap',
    handler: () => {
      console.log('Action triggered!');
    },
  });
}

export function deactivate() {
  // 清理资源
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>可用钩子</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { name: 'onProjectOpen', desc: '项目打开时触发' },
                  { name: 'onProjectClose', desc: '项目关闭时触发' },
                  { name: 'onBuildStart', desc: '构建开始时触发' },
                  { name: 'onBuildComplete', desc: '构建完成时触发' },
                  { name: 'onDebugConnect', desc: '调试连接时触发' },
                  { name: 'onDebugDisconnect', desc: '调试断开时触发' },
                  { name: 'onMonitorTick', desc: '监控每帧触发' },
                  { name: 'onBeforeSave', desc: '保存前触发' },
                  { name: 'onAfterSave', desc: '保存后触发' },
                ].map((hook) => (
                  <div
                    key={hook.name}
                    className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
                  >
                    <code className="text-xs font-mono">{hook.name}</code>
                    <span className="text-xs text-text-muted">{hook.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>插件上下文 API</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  <code className="shrink-0 font-mono text-xs">registerCommand</code>
                  <span className="text-text-muted">注册命令到命令面板</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="shrink-0 font-mono text-xs">registerPanel</code>
                  <span className="text-text-muted">注册侧边面板</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="shrink-0 font-mono text-xs">registerAction</code>
                  <span className="text-text-muted">注册自定义动作</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="shrink-0 font-mono text-xs">showNotification</code>
                  <span className="text-text-muted">显示通知消息</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="shrink-0 font-mono text-xs">openUrl</code>
                  <span className="text-text-muted">在浏览器中打开 URL</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="shrink-0 font-mono text-xs">emit</code>
                  <span className="text-text-muted">发送自定义事件</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {pluginDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPluginDetails(null)}>
          <Card className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
                  <span className="text-lg">{pluginDetails.meta.icon || '📦'}</span>
                </div>
                <div>
                  <CardTitle>{pluginDetails.meta.name}</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Badge variant="default">v{pluginDetails.meta.version}</Badge>
                    {pluginDetails.meta.category && (
                      <span>{pluginDetails.meta.category}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{pluginDetails.meta.description}</p>
              
              {pluginDetails.commands.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">命令</div>
                  <ul className="space-y-1">
                    {pluginDetails.commands.map((cmd) => (
                      <li key={cmd.id} className="flex items-center justify-between rounded bg-surface-2 px-3 py-2 text-sm">
                        <span>{cmd.title}</span>
                        {cmd.shortcut && <Badge variant="default" size="sm">{cmd.shortcut}</Badge>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pluginDetails.panels.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">面板</div>
                  <ul className="space-y-1">
                    {pluginDetails.panels.map((panel) => (
                      <li key={panel.id} className="rounded bg-surface-2 px-3 py-2 text-sm">
                        {panel.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pluginDetails.meta.author && (
                <p className="text-xs text-text-muted">作者: {pluginDetails.meta.author}</p>
              )}
            </CardContent>
            <div className="px-4 pb-4">
              <Button onClick={() => setPluginDetails(null)} className="w-full">关闭</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}