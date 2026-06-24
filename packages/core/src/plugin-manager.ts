import type { PluginMeta, PluginContext, PluginHook, PanelConfig, CommandConfig, PluginAction, PluginInfo, CommandPaletteItem } from '@tapdev/types';
import { globalEventBus } from './event-bus';

type PluginActivateFn = (context: PluginContext) => void | Promise<void>;
type PluginDeactivateFn = () => void | Promise<void>;

interface RegisteredPlugin {
  meta: PluginMeta;
  activate?: PluginActivateFn;
  deactivate?: PluginDeactivateFn;
  commands: Map<string, { handler: () => void | Promise<void>; config?: CommandConfig }>;
  panels: Map<string, PanelConfig>;
  actions: Map<string, PluginAction>;
  activated: boolean;
}

export class PluginManager {
  private plugins = new Map<string, RegisteredPlugin>();
  private hookHandlers = new Map<PluginHook, Set<(data?: unknown) => void>>();
  private commandPaletteItems: CommandPaletteItem[] = [];

  registerPlugin(
    meta: PluginMeta,
    activate?: PluginActivateFn,
    deactivate?: PluginDeactivateFn
  ): void {
    this.plugins.set(meta.id, {
      meta,
      activate,
      deactivate,
      commands: new Map(),
      panels: new Map(),
      actions: new Map(),
      activated: false,
    });
    globalEventBus.emit({ type: 'plugin:loaded', payload: meta });
  }

  async activatePlugin(pluginId: string, project?: PluginContext['project']): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.activate || plugin.activated) return;

    const context: PluginContext = {
      project,
      emit: (_event, _data) => {
      },
      registerCommand: (id, handler, config) => {
        plugin.commands.set(id, { handler, config });
        if (config) {
          this.commandPaletteItems.push({
            id: `${pluginId}.${id}`,
            pluginId,
            title: config.title,
            description: config.description,
            icon: config.icon,
            category: config.category,
            shortcut: config.shortcut,
            action: handler,
          });
        }
      },
      registerPanel: (id, config) => {
        plugin.panels.set(id, config);
      },
      registerAction: (action) => {
        plugin.actions.set(action.id, action);
        if (action.type === 'command') {
          this.commandPaletteItems.push({
            id: `${pluginId}.${action.id}`,
            pluginId,
            title: action.label,
            description: action.description,
            icon: action.icon,
            shortcut: action.shortcut,
            action: action.handler,
          });
        }
      },
      showNotification: (message, type = 'info') => {
        globalEventBus.emit({ type: 'plugin:notification', payload: { message, type } });
      },
      openUrl: (url) => {
        globalEventBus.emit({ type: 'plugin:open-url', payload: { url } });
      },
    };

    await plugin.activate(context);
    plugin.activated = true;
    plugin.meta.enabled = true;
    globalEventBus.emit({ type: 'plugin:activated', payload: plugin.meta });
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.activated) return;

    await plugin.deactivate?.();
    plugin.activated = false;
    plugin.meta.enabled = false;
    this.commandPaletteItems = this.commandPaletteItems.filter((item) => item.pluginId !== pluginId);
    globalEventBus.emit({ type: 'plugin:deactivated', payload: plugin.meta });
  }

  async loadPlugin(pluginId: string): Promise<void> {
    await this.activatePlugin(pluginId);
  }

  getPlugins(): PluginMeta[] {
    return [...this.plugins.values()].map((p) => p.meta);
  }

  getEnabledPlugins(): PluginMeta[] {
    return this.getPlugins().filter((p) => p.enabled);
  }

  getPluginInfo(pluginId: string): PluginInfo | null {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    return {
      meta: plugin.meta,
      commands: [...plugin.commands.values()].map((c) => c.config).filter((c): c is CommandConfig => !!c),
      panels: [...plugin.panels.values()],
      actions: [...plugin.actions.values()],
      activated: plugin.activated,
    };
  }

  getAllPluginInfo(): PluginInfo[] {
    return [...this.plugins.keys()].map((id) => this.getPluginInfo(id)).filter((info): info is PluginInfo => !!info);
  }

  executeCommand(pluginId: string, commandId: string): void {
    const plugin = this.plugins.get(pluginId);
    plugin?.commands.get(commandId)?.handler();
  }

  getPluginPanels(pluginId: string): PanelConfig[] {
    const plugin = this.plugins.get(pluginId);
    return plugin ? [...plugin.panels.values()] : [];
  }

  getAllPanels(): PanelConfig[] {
    const panels: PanelConfig[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.activated) {
        panels.push(...plugin.panels.values());
      }
    }
    return panels;
  }

  getCommandPaletteItems(filter?: string): CommandPaletteItem[] {
    let items = this.commandPaletteItems;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerFilter) ||
          item.description?.toLowerCase().includes(lowerFilter) ||
          item.category?.toLowerCase().includes(lowerFilter)
      );
    }
    return items.sort((a, b) => {
      const categoryA = a.category || '';
      const categoryB = b.category || '';
      if (categoryA !== categoryB) return categoryA.localeCompare(categoryB);
      return a.title.localeCompare(b.title);
    });
  }

  executeCommandPaletteItem(itemId: string): void {
    const item = this.commandPaletteItems.find((i) => i.id === itemId);
    item?.action();
  }

  onHook(hook: PluginHook, handler: (data?: unknown) => void): () => void {
    if (!this.hookHandlers.has(hook)) {
      this.hookHandlers.set(hook, new Set());
    }
    this.hookHandlers.get(hook)!.add(handler);
    return () => this.hookHandlers.get(hook)?.delete(handler);
  }

  triggerHook(hook: PluginHook, data?: unknown): void {
    this.hookHandlers.get(hook)?.forEach((handler) => handler(data));
  }

  loadBuiltinPlugins(): void {
    this.registerPlugin(
      {
        id: 'tapdev.unity-tools',
        name: 'Unity 工具集',
        version: '1.0.0',
        description: 'Unity 资源优化与 DevTools 集成',
        author: 'TapDev Studio',
        enabled: true,
        entry: 'unity-tools',
        hooks: ['onProjectOpen', 'onBuildStart'],
        icon: 'wrench',
        category: '工具',
      },
      (ctx) => {
        ctx.registerCommand('optimize-assets', async () => {
          ctx.showNotification('资源优化已启动', 'info');
        }, {
          id: 'optimize-assets',
          title: '优化资源',
          description: '优化 Unity 项目中的资源文件',
          icon: 'compress',
          shortcut: 'Ctrl+Shift+O',
          category: 'Unity',
        });

        ctx.registerCommand('clear-cache', async () => {
          ctx.showNotification('缓存已清除', 'success');
        }, {
          id: 'clear-cache',
          title: '清除缓存',
          description: '清除 Unity 缓存和构建缓存',
          icon: 'trash',
          shortcut: 'Ctrl+Shift+Delete',
          category: 'Unity',
        });

        ctx.registerPanel('unity-optimizer', {
          id: 'unity-optimizer',
          title: '资源优化',
          icon: 'wrench',
          component: 'UnityOptimizerPanel',
          defaultPosition: 'right',
          defaultSize: 400,
        });
      }
    );

    this.registerPlugin(
      {
        id: 'tapdev.network-test',
        name: '网络测试',
        version: '1.0.0',
        description: 'CDN 和网络连通性测试工具',
        author: 'TapDev Studio',
        enabled: false,
        entry: 'network-test',
        hooks: ['onDebugConnect'],
        icon: 'network',
        category: '测试',
      },
      (ctx) => {
        ctx.registerCommand('test-cdn', async () => {
          ctx.showNotification('CDN 测试已启动', 'info');
        }, {
          id: 'test-cdn',
          title: '测试 CDN',
          description: '测试 CDN 连通性和延迟',
          icon: 'cloud',
          category: '网络',
        });

        ctx.registerCommand('test-ping', async () => {
          ctx.showNotification('Ping 测试已启动', 'info');
        }, {
          id: 'test-ping',
          title: 'Ping 测试',
          description: '测试服务器延迟',
          icon: 'activity',
          category: '网络',
        });
      }
    );

    this.registerPlugin(
      {
        id: 'tapdev.debug-tools',
        name: '调试工具',
        version: '1.0.0',
        description: '高级调试和性能分析工具',
        author: 'TapDev Studio',
        enabled: true,
        entry: 'debug-tools',
        hooks: ['onDebugConnect', 'onDebugDisconnect'],
        icon: 'bug',
        category: '调试',
      },
      (ctx) => {
        ctx.registerCommand('take-snapshot', async () => {
          ctx.showNotification('性能快照已保存', 'success');
        }, {
          id: 'take-snapshot',
          title: '性能快照',
          description: '捕获当前性能快照',
          icon: 'camera',
          shortcut: 'Ctrl+Shift+P',
          category: '调试',
        });

        ctx.registerCommand('show-callstack', async () => {
          ctx.showNotification('调用栈面板已打开', 'info');
        }, {
          id: 'show-callstack',
          title: '显示调用栈',
          description: '查看当前调用栈',
          icon: 'list',
          category: '调试',
        });
      }
    );
  }
}

export const pluginManager = new PluginManager();