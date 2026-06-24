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
}

export type BuildTaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface BuildTask {
  id: string;
  config: BuildConfig;
  status: BuildTaskStatus;
  progress: number;
  progressMessage?: string;
  result?: BuildResult;
  startedAt?: number;
  finishedAt?: number;
}

export type { UnityInstallation } from './server';

export interface UnityProjectValidation {
  valid: boolean;
  tapTapSDK: {
    installed: boolean;
    version?: string;
  };
  errors: string[];
  warnings: string[];
}

export interface BuildStep {
  name: string;
  weight: number;
  message?: string;
  completed?: boolean;
}

export interface BuildPlatformConfig {
  platform: Platform;
  supported: boolean;
  buildCommand: string;
  outputExtension: string;
  requiresNative?: boolean;
}