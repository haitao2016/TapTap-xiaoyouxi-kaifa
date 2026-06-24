export interface NetworkRequestInfo {
  id: string;
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  timestamp: number;
  type: 'fetch' | 'xhr' | 'websocket';
}

export interface PerformanceMetrics {
  fps: number;
  memory: number;
  memoryLimit: number;
  drawCalls?: number;
  triangles?: number;
  networkRequests: number;
  networkLatency?: number;
  loadTime?: number;
  cpuUsage?: number;
  gpuMemory?: number;
  frameTime?: number;
  timestamp: number;
}

export interface MonitorAlert {
  id: string;
  type: 'fps' | 'memory' | 'network' | 'error' | 'cpu' | 'gpu';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

export interface MonitorStats {
  avgFps: number;
  avgMemoryUsage: number;
  totalRequests: number;
  failedRequests: number;
  avgLatency: number;
  uptime: number;
}

export interface MonitorThresholds {
  fps: number;
  memoryRatio: number;
  cpuUsage: number;
  networkLatency: number;
  requestTimeout: number;
}