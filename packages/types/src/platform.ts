import type { Platform } from './project';
import type { DebugLogEntry } from './debug';
import type { PerformanceMetrics, MonitorAlert } from './monitor';
import type { BuildResult, BuildTask } from './build';
import type { ProjectMeta } from './project';
import type { PluginMeta } from './plugin';

/** 导航菜单项 */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

/** 应用设置 */
export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  language: 'zh-CN' | 'en-US';
  editorFontSize: number;
  editorTabSize: number;
  autoSave: boolean;
  autoSaveDelay: number;
  debugServerPort: number;
  buildOutputPath: string;
  unityPath?: string;
  recentProjects: string[];
  enabledPlugins: string[];
  restoreLastProject?: boolean;
  autoCheckUpdates?: boolean;
  sendTelemetry?: boolean;
  autoSaveInterval?: number;
  accentColor?: string;
  compactMode?: boolean;
  animationsEnabled?: boolean;
  uiFontSize?: number;
  editorUseSpaces?: boolean;
  editorLineNumbers?: boolean;
  editorMinimap?: boolean;
  formatOnSave: boolean;
  formatOnPaste: boolean;
  editorLineWidth: number;
  defaultCompress: boolean;
  defaultWasmSplit: boolean;
  buildNotification: boolean;
  maxBuildHistory: number;
  defaultBuildPath: string;
  debugBreakOnStart: boolean;
  debugBreakOnException: boolean;
  debugInlineValues: boolean;
  maxLogLines: number;
  logTimestamps: boolean;
  autoScrollLog: boolean;
}

/** 平台能力检测结果 */
export interface PlatformCapabilities {
  platform: Platform;
  hasFileSystem: boolean;
  hasNativeMenu: boolean;
  hasNotifications: boolean;
  hasDevTools: boolean;
  screenWidth: number;
  screenHeight: number;
}

/** 事件总线事件类型 */
export type AppEvent =
  | { type: 'project:open'; payload: ProjectMeta }
  | { type: 'project:close'; payload: { projectId: string } }
  | { type: 'project:save'; payload: { projectId: string } }
  | { type: 'debug:log'; payload: DebugLogEntry }
  | { type: 'debug:connect'; payload: import('./debug').DebugSession }
  | { type: 'debug:disconnect'; payload: { sessionId: string } }
  | { type: 'monitor:metrics'; payload: PerformanceMetrics }
  | { type: 'monitor:alert'; payload: MonitorAlert }
  | { type: 'build:start'; payload: BuildTask }
  | { type: 'build:progress'; payload: { taskId: string; progress: number } }
  | { type: 'build:complete'; payload: BuildResult }
  | { type: 'plugin:loaded'; payload: PluginMeta }
  | { type: 'settings:change'; payload: Partial<AppSettings> };
