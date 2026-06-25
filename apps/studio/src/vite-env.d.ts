/// <reference types="vite/client" />

import type {
  BuildConfig,
  BuildResult,
  DebugLogEntry,
  UnityInstallation,
  UnityProjectValidation,
} from '@tapdev/types';

export {};

declare global {
  interface Window {
    electronAPI?: {
      openDirectory: () => Promise<string | null>;
      openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
      getPlatform: () => Promise<string>;
      getVersion: () => Promise<string>;
      onMenuAction: (callback: (action: string, data?: unknown) => void) => void;
      native?: {
        isAvailable: () => boolean;
        startDebugServer: (opts: {
          projectId: string;
          port: number;
          projectPath?: string;
          staticDir?: string;
        }) => Promise<{
          sessionId: string;
          url: string;
          wsUrl: string;
          qrCodeDataUrl?: string;
          port: number;
        }>;
        stopDebugServer: () => Promise<void>;
        detectUnity: () => Promise<UnityInstallation[]>;
        validateUnityProject: (path: string) => Promise<UnityProjectValidation>;
        startUnityBuild: (config: BuildConfig) => Promise<{ taskId: string }>;
        cancelUnityBuild: (taskId: string) => Promise<void>;
        onBuildProgress: (
          cb: (data: { taskId: string; progress: number; message: string }) => void
        ) => () => void;
        onBuildComplete: (cb: (result: BuildResult) => void) => () => void;
        onDebugLog: (cb: (entry: DebugLogEntry) => void) => () => void;
        onGameConnected: (cb: () => void) => () => void;
        onGameDisconnected: (cb: () => void) => () => void;
      };
      updater?: {
        check: () => Promise<{ success: boolean; message?: string }>;
        download: () => Promise<{ success: boolean; message?: string }>;
        install: () => Promise<{ success: boolean; message?: string }>;
        getCurrentVersion: () => Promise<string>;
        getStatus: () => Promise<{
          isUpdating: boolean;
          updateDownloaded: boolean;
          currentVersion: string;
        }>;
        onChecking: (cb: () => void) => () => void;
        onAvailable: (
          cb: (info: {
            version: string;
            releaseDate: string;
            releaseNotes: unknown;
            files: unknown[];
          }) => void
        ) => () => void;
        onNotAvailable: (cb: (info: { version: string }) => void) => () => void;
        onDownloadProgress: (
          cb: (progress: {
            bytesPerSecond: number;
            percent: number;
            total: number;
            transferred: number;
          }) => void
        ) => () => void;
        onDownloaded: (
          cb: (info: {
            version: string;
            releaseDate: string;
            releaseNotes: unknown;
          }) => void
        ) => () => void;
        onError: (cb: (error: { message: string; stack?: string }) => void) => () => void;
      };
    };
  }
}
