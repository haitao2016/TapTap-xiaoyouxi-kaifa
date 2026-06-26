/** 应用主题 */
export type Theme = 'dark' | 'light' | 'auto' | 'system';

/** 应用语言 */
export type Language = 'zh-CN' | 'en-US' | 'ja-JP';

/** 主题色 */
export type AccentColor = string;

/** 编辑器字体大小 */
export type EditorFontSize = number;

/** 应用设置 */
export interface AppSettings {
  // 主题与外观
  theme: Theme;
  language: Language;
  accentColor?: AccentColor;
  uiFontSize?: number;
  compactMode?: boolean;
  animationsEnabled?: boolean;

  // 编辑器
  editorFontSize: number;
  editorTabSize: number;
  editorLineWidth: number;
  editorUseSpaces?: boolean;
  editorLineNumbers?: boolean;
  editorMinimap?: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  autoSaveInterval?: number;
  formatOnSave: boolean;
  formatOnPaste: boolean;

  // 调试
  debugServerPort: number;
  debugBreakOnStart: boolean;
  debugBreakOnException: boolean;
  debugInlineValues: boolean;

  // 构建
  buildOutputPath: string;
  defaultBuildPath: string;
  defaultCompress: boolean;
  defaultWasmSplit: boolean;
  buildNotification: boolean;
  maxBuildHistory: number;
  unityPath?: string;

  // 隐私与更新
  autoCheckUpdates?: boolean;
  sendTelemetry?: boolean;

  // 项目与插件
  recentProjects: string[];
  enabledPlugins: string[];
  restoreLastProject?: boolean;

  // 日志
  maxLogLines: number;
  logTimestamps: boolean;
  autoScrollLog: boolean;
}
