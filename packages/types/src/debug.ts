/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 调试日志条目 */
export interface DebugLogEntry {
  id: string;
  level: LogLevel;
  message: string;
  source?: string;
  timestamp: number;
  data?: unknown;
}

/** 断点信息 */
export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  condition?: string;
}

/** 调试会话状态 */
export interface DebugSession {
  id: string;
  projectId: string;
  status: 'connected' | 'disconnected' | 'paused' | 'running';
  breakpoints: Breakpoint[];
  logs: DebugLogEntry[];
  serverPort?: number;
  qrCodeUrl?: string;
  wsUrl?: string;
  gameConnected?: boolean;
  qrCodeDataUrl?: string;
}
