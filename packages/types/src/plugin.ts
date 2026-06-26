import type { ProjectMeta } from './project';

// Plugin Hooks
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

// Extension Points
export type ExtensionPoint =
  | 'editor:toolbar'
  | 'editor:context-menu'
  | 'editor:status-bar'
  | 'editor:panel'
  | 'editor:command'
  | 'editor:language'
  | 'editor:theme'
  | 'editor:webview'
  | 'build:task'
  | 'build:target'
  | 'debug:adapter'
  | 'project:template'
  | 'asset:importer'
  | 'asset:exporter'
  | 'ai:provider'
  | 'cloud:sync';

// Plugin Metadata
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

// Plugin Manifest
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
  engines: { tapdev: string; node?: string };
  main: string;
  contributes: PluginContribution[];
  dependencies: Record<string, string>;
  activationEvents: string[];
  categories: string[];
  keywords: string[];
}

// Plugin Contribution
export interface PluginContribution {
  point: ExtensionPoint;
  command?: {
    command: string;
    title: string;
    category?: string;
    icon?: string;
    shortcut?: string;
  };
  menu?: { location: string; command: string; group?: string; when?: string };
  panel?: {
    id: string;
    title: string;
    icon?: string;
    location?: string;
  };
  language?: {
    id: string;
    extensions: string[];
    aliases?: string[];
  };
  theme?: {
    id: string;
    label: string;
    type: 'light' | 'dark';
    path: string;
  };
}

// Panel & Command Config
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

// Plugin Context
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

// Plugin Info
export interface PluginInfo {
  meta: PluginMeta;
  commands: CommandConfig[];
  panels: PanelConfig[];
  actions: PluginAction[];
  activated: boolean;
}

// Command Palette
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

// Plugin Marketplace
export interface PluginListing {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: PluginPublisher;
  icon?: string;
  screenshots?: string[];
  rating: number;
  downloadCount: number;
  categories: string[];
  tags: string[];
  readme?: string;
  changelog?: string;
  lastUpdated: number;
  pricing: 'free' | 'paid' | 'subscription';
  price?: number;
}

export interface PluginPublisher {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  website?: string;
}

// Plugin Security
export interface PluginPermissions {
  fileSystem: 'none' | 'read' | 'write' | 'full';
  network: 'none' | 'localhost' | 'all';
  process: 'none' | 'spawn' | 'exec';
  shell: boolean;
  env: string[];
}

export interface PluginSandboxConfig {
  enabled: boolean;
  permissions: PluginPermissions;
  resourceLimits?: {
    maxMemory?: number;
    maxCpu?: number;
    maxNetwork?: number;
  };
}
