import type {
  PluginMeta,
  PluginContext,
  PluginHook,
  PanelConfig,
  CommandConfig,
  PluginAction,
  PluginInfo,
  CommandPaletteItem,
  ProjectMeta,
} from '@tapdev/types';
import { globalEventBus } from './event-bus';

export type PluginPermission =
  | 'fileSystem:read'
  | 'fileSystem:write'
  | 'network:fetch'
  | 'network:websocket'
  | 'childProcess:spawn'
  | 'clipboard:read'
  | 'clipboard:write'
  | 'notifications'
  | 'commands'
  | 'panels'
  | 'project:read'
  | 'project:write'
  | 'settings:read'
  | 'settings:write'
  | 'theme:read'
  | 'theme:write';

export interface PluginPermissions {
  allowed: PluginPermission[];
  denied: PluginPermission[];
}

export interface PluginDependency {
  id: string;
  version?: string;
  optional?: boolean;
}

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
  permissions: PluginPermissions;
  dependencies: PluginDependency[];
  activationError?: string;
  loadedAt?: number;
  activatedAt?: number;
}

export interface PluginLoadOptions {
  enable?: boolean;
  project?: ProjectMeta;
  permissions?: Partial<PluginPermissions>;
}

export class PluginManager {
  private plugins = new Map<string, RegisteredPlugin>();
  private hookHandlers = new Map<PluginHook, Set<(data?: unknown) => void>>();
  private commandPaletteItems: CommandPaletteItem[] = [];
  private currentProject?: ProjectMeta;

  registerPlugin(
    meta: PluginMeta,
    activate?: PluginActivateFn,
    deactivate?: PluginDeactivateFn,
    options?: { permissions?: PluginPermission[]; dependencies?: PluginDependency[] }
  ): void {
    const permissions: PluginPermissions = {
      allowed: options?.permissions ?? [
        'commands',
        'panels',
        'notifications',
        'project:read',
        'theme:read',
      ],
      denied: [],
    };

    this.plugins.set(meta.id, {
      meta,
      activate,
      deactivate,
      commands: new Map(),
      panels: new Map(),
      actions: new Map(),
      activated: false,
      permissions,
      dependencies: options?.dependencies ?? [],
      loadedAt: Date.now(),
    });
    globalEventBus.emit({ type: 'plugin:registered', payload: meta });
  }

  async activatePlugin(pluginId: string, project?: PluginContext['project']): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.activate || plugin.activated) return;

    try {
      await this.checkDependencies(pluginId);
    } catch (error) {
      plugin.activationError = error instanceof Error ? error.message : '依赖检查失败';
      globalEventBus.emit({
        type: 'plugin:activation-failed',
        payload: { pluginId, error: plugin.activationError },
      });
      throw error;
    }

    const context = this.createPluginContext(pluginId, project ?? this.currentProject);

    try {
      await plugin.activate(context);
      plugin.activated = true;
      plugin.activatedAt = Date.now();
      plugin.meta.enabled = true;
      plugin.activationError = undefined;
      this.registerPluginHooks(pluginId);
      globalEventBus.emit({ type: 'plugin:activated', payload: plugin.meta });
    } catch (error) {
      plugin.activationError = error instanceof Error ? error.message : '插件激活失败';
      globalEventBus.emit({
        type: 'plugin:activation-failed',
        payload: { pluginId, error: plugin.activationError },
      });
      throw error;
    }
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.activated) return;

    try {
      await plugin.deactivate?.();
    } catch (error) {
      console.error(`插件 ${pluginId} 停用时出错:`, error);
    }

    plugin.activated = false;
    plugin.activatedAt = undefined;
    plugin.meta.enabled = false;
    this.commandPaletteItems = this.commandPaletteItems.filter(
      (item) => item.pluginId !== pluginId
    );
    this.unregisterPluginHooks(pluginId);
    globalEventBus.emit({ type: 'plugin:deactivated', payload: plugin.meta });
  }

  async loadPlugin(pluginId: string, options?: PluginLoadOptions): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`);
    }

    if (options?.permissions) {
      Object.assign(plugin.permissions, options.permissions);
    }

    if (options?.enable !== false) {
      await this.activatePlugin(pluginId, options?.project);
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId);
  }

  async reloadPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId);
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
      commands: [...plugin.commands.values()]
        .map((c) => c.config)
        .filter((c): c is CommandConfig => !!c),
      panels: [...plugin.panels.values()],
      actions: [...plugin.actions.values()],
      activated: plugin.activated,
    };
  }

  getAllPluginInfo(): PluginInfo[] {
    return [...this.plugins.keys()]
      .map((id) => this.getPluginInfo(id))
      .filter((info): info is PluginInfo => !!info);
  }

  getPluginActivationError(pluginId: string): string | undefined {
    return this.plugins.get(pluginId)?.activationError;
  }

  getPluginDependencies(pluginId: string): PluginDependency[] {
    return this.plugins.get(pluginId)?.dependencies ?? [];
  }

  getPluginPermissions(pluginId: string): PluginPermissions | null {
    return this.plugins.get(pluginId)?.permissions ?? null;
  }

  setPluginPermissions(pluginId: string, permissions: Partial<PluginPermissions>): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      if (permissions.allowed) plugin.permissions.allowed = permissions.allowed;
      if (permissions.denied) plugin.permissions.denied = permissions.denied;
      globalEventBus.emit({
        type: 'plugin:permissions-updated',
        payload: { pluginId, permissions: plugin.permissions },
      });
    }
  }

  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    if (plugin.permissions.denied.includes(permission)) return false;
    return plugin.permissions.allowed.includes(permission);
  }

  grantPermission(pluginId: string, permission: PluginPermission): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin && !plugin.permissions.allowed.includes(permission)) {
      plugin.permissions.allowed.push(permission);
      plugin.permissions.denied = plugin.permissions.denied.filter((p) => p !== permission);
    }
  }

  revokePermission(pluginId: string, permission: PluginPermission): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.permissions.allowed = plugin.permissions.allowed.filter((p) => p !== permission);
      if (!plugin.permissions.denied.includes(permission)) {
        plugin.permissions.denied.push(permission);
      }
    }
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

  setCurrentProject(project?: ProjectMeta): void {
    this.currentProject = project;
    if (project) {
      this.triggerHook('onProjectOpen', project);
    }
  }

  getCurrentProject(): ProjectMeta | undefined {
    return this.currentProject;
  }

  async activateAllEnabledPlugins(): Promise<void> {
    const enabled = this.getPlugins().filter((p) => p.enabled);
    for (const meta of enabled) {
      try {
        await this.activatePlugin(meta.id);
      } catch (error) {
        console.error(`激活插件 ${meta.id} 失败:`, error);
      }
    }
  }

  async deactivateAllPlugins(): Promise<void> {
    const activated = [...this.plugins.values()].filter((p) => p.activated);
    for (const plugin of activated) {
      await this.deactivatePlugin(plugin.meta.id);
    }
  }

  isPluginActivated(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.activated ?? false;
  }

  isPluginRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin?.activated) {
      this.deactivatePlugin(pluginId);
    }
    this.plugins.delete(pluginId);
    globalEventBus.emit({ type: 'plugin:unregistered', payload: pluginId });
  }

  getActivatedPluginsCount(): number {
    return [...this.plugins.values()].filter((p) => p.activated).length;
  }

  getRegisteredPluginsCount(): number {
    return this.plugins.size;
  }

  private createPluginContext(pluginId: string, project?: ProjectMeta): PluginContext {
    const plugin = this.plugins.get(pluginId)!;

    return {
      project,
      emit: (event: string, data?: unknown) => {
        globalEventBus.emit({ type: `plugin:${pluginId}:${event}`, payload: data });
      },
      registerCommand: (id, handler, config) => {
        if (!this.hasPermission(pluginId, 'commands')) {
          console.warn(`插件 ${pluginId} 没有注册命令的权限`);
          return;
        }
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
        if (!this.hasPermission(pluginId, 'panels')) {
          console.warn(`插件 ${pluginId} 没有注册面板的权限`);
          return;
        }
        plugin.panels.set(id, config);
        globalEventBus.emit({ type: 'panel:registered', payload: { pluginId, panel: config } });
      },
      registerAction: (action) => {
        if (!this.hasPermission(pluginId, 'commands')) {
          console.warn(`插件 ${pluginId} 没有注册操作的权限`);
          return;
        }
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
        if (!this.hasPermission(pluginId, 'notifications')) {
          console.warn(`插件 ${pluginId} 没有发送通知的权限`);
          return;
        }
        globalEventBus.emit({ type: 'plugin:notification', payload: { message, type, pluginId } });
      },
      openUrl: (url) => {
        if (!this.hasPermission(pluginId, 'network:fetch')) {
          console.warn(`插件 ${pluginId} 没有打开 URL 的权限`);
          return;
        }
        globalEventBus.emit({ type: 'plugin:open-url', payload: { url, pluginId } });
      },
    };
  }

  private async checkDependencies(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    for (const dep of plugin.dependencies) {
      const depPlugin = this.plugins.get(dep.id);
      if (!depPlugin) {
        if (dep.optional) continue;
        throw new Error(`缺少必需的依赖插件: ${dep.id}`);
      }
      if (!depPlugin.activated) {
        await this.activatePlugin(dep.id);
      }
    }
  }

  private registerPluginHooks(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin?.meta.hooks) return;

    for (const hook of plugin.meta.hooks) {
      if (!this.hookHandlers.has(hook)) {
        this.hookHandlers.set(hook, new Set());
      }
    }
  }

  private unregisterPluginHooks(_pluginId: string): void {}

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
        ctx.registerCommand(
          'optimize-assets',
          async () => {
            ctx.showNotification('资源优化已启动', 'info');
          },
          {
            id: 'optimize-assets',
            title: '优化资源',
            description: '优化 Unity 项目中的资源文件',
            icon: 'compress',
            shortcut: 'Ctrl+Shift+O',
            category: 'Unity',
          }
        );

        ctx.registerCommand(
          'clear-cache',
          async () => {
            ctx.showNotification('缓存已清除', 'success');
          },
          {
            id: 'clear-cache',
            title: '清除缓存',
            description: '清除 Unity 缓存和构建缓存',
            icon: 'trash',
            shortcut: 'Ctrl+Shift+Delete',
            category: 'Unity',
          }
        );

        ctx.registerPanel('unity-optimizer', {
          id: 'unity-optimizer',
          title: '资源优化',
          icon: 'wrench',
          component: 'UnityOptimizerPanel',
          defaultPosition: 'right',
          defaultSize: 400,
        });
      },
      undefined,
      {
        permissions: ['commands', 'panels', 'notifications', 'project:read', 'fileSystem:read'],
        dependencies: [],
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
        ctx.registerCommand(
          'test-cdn',
          async () => {
            ctx.showNotification('CDN 测试已启动', 'info');
          },
          {
            id: 'test-cdn',
            title: '测试 CDN',
            description: '测试 CDN 连通性和延迟',
            icon: 'cloud',
            category: '网络',
          }
        );

        ctx.registerCommand(
          'test-ping',
          async () => {
            ctx.showNotification('Ping 测试已启动', 'info');
          },
          {
            id: 'test-ping',
            title: 'Ping 测试',
            description: '测试服务器延迟',
            icon: 'activity',
            category: '网络',
          }
        );
      },
      undefined,
      {
        permissions: ['commands', 'notifications', 'network:fetch'],
        dependencies: [],
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
        ctx.registerCommand(
          'take-snapshot',
          async () => {
            ctx.showNotification('性能快照已保存', 'success');
          },
          {
            id: 'take-snapshot',
            title: '性能快照',
            description: '捕获当前性能快照',
            icon: 'camera',
            shortcut: 'Ctrl+Shift+P',
            category: '调试',
          }
        );

        ctx.registerCommand(
          'show-callstack',
          async () => {
            ctx.showNotification('调用栈面板已打开', 'info');
          },
          {
            id: 'show-callstack',
            title: '显示调用栈',
            description: '查看当前调用栈',
            icon: 'list',
            category: '调试',
          }
        );
      },
      undefined,
      {
        permissions: ['commands', 'panels', 'notifications', 'project:read'],
        dependencies: [],
      }
    );
  }
}

export const pluginManager = new PluginManager();
