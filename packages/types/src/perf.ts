// Performance & Analytics types

// Memory types
export interface MemorySample {
  timestamp: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  domNodes: number;
  listenerCount: number;
}

export interface PerformanceBudget {
  metric: string;
  value: number;
  warning: number;
  exceeded: number;
  unit: string;
}

export interface MemorySnapshot {
  id: string;
  timestamp: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  gcType?: 'minor' | 'major';
}

export interface MemoryLeakReport {
  suspectedLeak: boolean;
  growthRateMBPerHour: number;
  heapDeltaMB: number;
  timeline: MemorySnapshot[];
  recommendations: string[];
}

// Startup Monitor types
export interface StartupMetric {
  phase: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface StartupReport {
  totalTime: number;
  phases: StartupMetric[];
  criticalPath: string[];
  bottlenecks: { phase: string; duration: number }[];
}

// Webview Performance Baseline types
export interface WebviewPerfMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface WebviewPerfBaseline {
  fps: number;
  memoryMB: number;
  cpuPercent: number;
  loadTimeMs: number;
}

export interface WebviewPerfReport {
  baseline: WebviewPerfBaseline;
  current: WebviewPerfMetric[];
  deviations: { metric: string; expected: number; actual: number }[];
}

// i18n types
export type Locale = 'en-US' | 'zh-CN' | 'ja-JP';

export interface I18nEntry {
  key: string;
  translations: Record<Locale, string>;
  description?: string;
  context?: string;
}

export interface I18nNamespace {
  name: string;
  entries: I18nEntry[];
  lastUpdated: number;
}

// Error Localization types
export interface LocalizedError {
  code: string;
  message: Record<Locale, string>;
  documentation?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ErrorMapping {
  errorCode: string;
  localizedError: LocalizedError;
  fallbackMessage: string;
}

// Release Pipeline types
export interface ReleaseStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  artifacts?: string[];
  error?: string;
}

export interface ReleasePipeline {
  id: string;
  version: string;
  stages: ReleaseStage[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}
