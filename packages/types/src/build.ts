import type { Platform } from './project';

export interface BuildConfig {
  projectId: string;
  projectPath: string;
  outputPath: string;
  compress: boolean;
  wasmSplit: boolean;
  development: boolean;
  targetPlatform: Platform[];
  cdnUrl?: string;
  version: string;
  unityPath?: string;
  appId?: string;
  optimizeAssets?: boolean;
  stripDebugInfo?: boolean;
  enableWebAssembly?: boolean;
  wasmMemorySize?: number;
  customDefines?: string[];
  androidKeystorePath?: string;
  androidKeystoreAlias?: string;
  iosTeamId?: string;
  iosBundleId?: string;
  useCache?: boolean;
}

export interface BuildResult {
  id: string;
  projectId: string;
  success: boolean;
  outputFiles: string[];
  duration: number;
  errors: string[];
  warnings: string[];
  timestamp: number;
  buildNumber?: string;
  buildHash?: string;
  cacheInfo?: BuildCacheInfo;
}

export type BuildTaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface BuildCacheInfo {
  enabled: boolean;
  hit: boolean;
  cachedAt?: number;
  cacheKey?: string;
  hash?: string;
  lastModified?: number;
  valid?: boolean;
  skippedSteps?: string[];
  hitCount?: number;
}

export interface BuildTask {
  id: string;
  config: BuildConfig;
  status: BuildTaskStatus;
  progress: number;
  progressMessage?: string;
  result?: BuildResult;
  startedAt?: number;
  finishedAt?: number;
  cacheInfo?: BuildCacheInfo;
}

export type { UnityInstallation, UnityProjectValidation } from './server';

export interface BuildStep {
  name: string;
  weight?: number;
  message?: string;
  completed?: boolean;
  status?: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
  detail?: string;
  cacheable?: boolean;
}

export interface BuildPlatformConfig {
  platform: Platform;
  supported: boolean;
  buildCommand: string;
  outputExtension: string;
  requiresNative?: boolean;
}
