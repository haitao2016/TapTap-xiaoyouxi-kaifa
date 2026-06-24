import type { DebugLogEntry, Breakpoint } from './debug';
import type { PerformanceMetrics } from './monitor';

/** WebSocket 消息类型 */
export type WSMessageType =
  | 'connected'
  | 'log'
  | 'breakpoint-add'
  | 'breakpoint-remove'
  | 'breakpoint-hit'
  | 'breakpoint-sync'
  | 'command'
  | 'metrics'
  | 'game-connected'
  | 'game-disconnected'
  | 'ping'
  | 'pong'
  | 'error';

/** WebSocket 客户端角色 */
export type WSClientRole = 'studio' | 'game' | 'monitor';

/** WebSocket 消息 */
export interface WSMessage {
  type: WSMessageType;
  payload?: unknown;
  timestamp?: number;
}

/** 调试服务器配置 */
export interface DebugServerConfig {
  port: number;
  host?: string;
  projectId: string;
  projectPath?: string;
  staticDir?: string;
}

/** 调试服务器状态 */
export interface DebugServerStatus {
  running: boolean;
  port: number;
  host: string;
  url: string;
  wsUrl: string;
  gameConnected: boolean;
  studioClients: number;
  gameClients: number;
}

/** Unity 安装信息 */
export interface UnityInstallation {
  version: string;
  path: string;
  isHub: boolean;
}

/** TapTap SDK 检测结果 */
export interface TapTapSDKInfo {
  installed: boolean;
  packagePath?: string;
  packageVersion?: string;
  hasBuildScript: boolean;
}

/** Unity 项目验证结果 */
export interface UnityProjectValidation {
  valid: boolean;
  projectPath: string;
  unityVersion?: string;
  tapTapSDK: TapTapSDKInfo;
  errors: string[];
  warnings: string[];
}

/** Unity 构建选项 */
export interface UnityBuildOptions {
  projectPath: string;
  outputPath: string;
  unityPath?: string;
  wasmSplit: boolean;
  development: boolean;
  compress: boolean;
  cdnUrl?: string;
  appId?: string;
}

/** Unity 构建进度 */
export interface UnityBuildProgress {
  phase: string;
  progress: number;
  message: string;
}

/** 远程日志上报 */
export interface RemoteLogPayload {
  level: DebugLogEntry['level'];
  message: string;
  source?: string;
  data?: unknown;
}

/** 断点同步 */
export interface BreakpointSyncPayload {
  breakpoints: Breakpoint[];
}

/** 调试命令 */
export interface DebugCommandPayload {
  action: 'pause' | 'resume' | 'step' | 'reload';
}

/** 性能指标上报 */
export interface MetricsPayload extends PerformanceMetrics {}
