import type { ProjectMeta } from './project';

export type PluginHook =
  | 'onProjectOpen'
  | 'onProjectClose'
  | 'onBuildStart'
  | 'onBuildComplete'
  | 'onDebugConnect'
  | 'onDebugDisconnect'
  | 'onMonitorTick'
  | 'onBeforeSave'
  | 'onAfterSave';

export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  entry: string;
  hooks: PluginHook[];
  icon?: string;
  category?: string;
  homepage?: string;
  repository?: string;
}

export interface PanelConfig {
  id: string;
  title: string;
  icon?: string;
  component: string;
  defaultPosition?: 'left' | 'right' | 'bottom' | 'center';
  defaultSize?: number;
}

export interface CommandConfig {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  category?: string;
  enabled?: boolean;
}

export interface PluginAction {
  id: string;
  type: 'command' | 'menu' | 'button';
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  handler: () => void | Promise<void>;
}

export interface PluginContext {
  project?: ProjectMeta;
  emit: (event: string, data?: unknown) => void;
  registerCommand: (
    id: string,
    handler: () => void | Promise<void>,
    config?: CommandConfig
  ) => void;
  registerPanel: (id: string, config: PanelConfig) => void;
  registerAction: (action: PluginAction) => void;
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  openUrl: (url: string) => void;
}

export interface PluginInfo {
  meta: PluginMeta;
  commands: CommandConfig[];
  panels: PanelConfig[];
  actions: PluginAction[];
  activated: boolean;
}

export interface CommandPaletteItem {
  id: string;
  pluginId: string;
  title: string;
  description?: string;
  icon?: string;
  category?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
}
