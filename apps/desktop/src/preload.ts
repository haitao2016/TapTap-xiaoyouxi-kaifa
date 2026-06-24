import { contextBridge, ipcRenderer } from 'electron';
import type { BuildConfig, BuildResult, DebugLogEntry, UnityInstallation, UnityProjectValidation } from '@tapdev/types';

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory') as Promise<string | null>,
  openFile: (filters?: Electron.FileFilter[]) =>
    ipcRenderer.invoke('dialog:openFile', filters) as Promise<string | null>,
  getPlatform: () => ipcRenderer.invoke('app:getPlatform') as Promise<string>,
  getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,

  onMenuAction: (callback: (action: string, data?: unknown) => void) => {
    const actions = [
      'menu:new-project',
      'menu:open-project',
      'menu:save',
      'menu:start-debug',
      'menu:start-build',
      'menu:about',
    ];
    actions.forEach((action) => {
      ipcRenderer.on(action, (_event, data) => callback(action, data));
    });
  },

  native: {
    isAvailable: () => true,
    startDebugServer: (opts: {
      projectId: string;
      port: number;
      projectPath?: string;
      staticDir?: string;
    }) =>
      ipcRenderer.invoke('native:startDebugServer', opts) as Promise<{
        sessionId: string;
        url: string;
        wsUrl: string;
        qrCodeDataUrl?: string;
        port: number;
      }>,
    stopDebugServer: () => ipcRenderer.invoke('native:stopDebugServer') as Promise<void>,
    detectUnity: () => ipcRenderer.invoke('native:detectUnity') as Promise<UnityInstallation[]>,
    validateUnityProject: (path: string) =>
      ipcRenderer.invoke('native:validateProject', path) as Promise<UnityProjectValidation>,
    startUnityBuild: async (config: BuildConfig) => {
      const taskId = await ipcRenderer.invoke('native:startBuild', config) as string;
      return { taskId };
    },
    cancelUnityBuild: (taskId: string) =>
      ipcRenderer.invoke('native:cancelBuild', taskId) as Promise<void>,
    onBuildProgress: (cb: (data: { taskId: string; progress: number; message: string }) => void) => {
      const handler = (_: unknown, data: { taskId: string; progress: number; message: string }) =>
        cb(data);
      ipcRenderer.on('native:build-progress', handler);
      return () => ipcRenderer.removeListener('native:build-progress', handler);
    },
    onBuildComplete: (cb: (result: BuildResult) => void) => {
      const handler = (_: unknown, result: BuildResult) => cb(result);
      ipcRenderer.on('native:build-complete', handler);
      return () => ipcRenderer.removeListener('native:build-complete', handler);
    },
    onDebugLog: (cb: (entry: DebugLogEntry) => void) => {
      const handler = (_: unknown, entry: DebugLogEntry) => cb(entry);
      ipcRenderer.on('native:debug-log', handler);
      return () => ipcRenderer.removeListener('native:debug-log', handler);
    },
    onGameConnected: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on('native:game-connected', handler);
      return () => ipcRenderer.removeListener('native:game-connected', handler);
    },
    onGameDisconnected: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on('native:game-disconnected', handler);
      return () => ipcRenderer.removeListener('native:game-disconnected', handler);
    },
  },

  updater: {
    check: () => ipcRenderer.invoke('updater:check') as Promise<{ success: boolean; message?: string }>,
    download: () => ipcRenderer.invoke('updater:download') as Promise<{ success: boolean; message?: string }>,
    install: () => ipcRenderer.invoke('updater:install') as Promise<{ success: boolean; message?: string }>,
    getCurrentVersion: () => ipcRenderer.invoke('updater:getCurrentVersion') as Promise<string>,
    getStatus: () =>
      ipcRenderer.invoke('updater:getStatus') as Promise<{
        isUpdating: boolean;
        updateDownloaded: boolean;
        currentVersion: string;
      }>,
    onChecking: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on('updater:checking', handler);
      return () => ipcRenderer.removeListener('updater:checking', handler);
    },
    onAvailable: (cb: (info: {
      version: string;
      releaseDate: string;
      releaseNotes: unknown;
      files: unknown[];
    }) => void) => {
      const handler = (_: unknown, info: {
        version: string;
        releaseDate: string;
        releaseNotes: unknown;
        files: unknown[];
      }) => cb(info);
      ipcRenderer.on('updater:available', handler);
      return () => ipcRenderer.removeListener('updater:available', handler);
    },
    onNotAvailable: (cb: (info: { version: string }) => void) => {
      const handler = (_: unknown, info: { version: string }) => cb(info);
      ipcRenderer.on('updater:not-available', handler);
      return () => ipcRenderer.removeListener('updater:not-available', handler);
    },
    onDownloadProgress: (cb: (progress: {
      bytesPerSecond: number;
      percent: number;
      total: number;
      transferred: number;
    }) => void) => {
      const handler = (_: unknown, progress: {
        bytesPerSecond: number;
        percent: number;
        total: number;
        transferred: number;
      }) => cb(progress);
      ipcRenderer.on('updater:download-progress', handler);
      return () => ipcRenderer.removeListener('updater:download-progress', handler);
    },
    onDownloaded: (cb: (info: {
      version: string;
      releaseDate: string;
      releaseNotes: unknown;
    }) => void) => {
      const handler = (_: unknown, info: {
        version: string;
        releaseDate: string;
        releaseNotes: unknown;
      }) => cb(info);
      ipcRenderer.on('updater:downloaded', handler);
      return () => ipcRenderer.removeListener('updater:downloaded', handler);
    },
    onError: (cb: (error: { message: string; stack?: string }) => void) => {
      const handler = (_: unknown, error: { message: string; stack?: string }) => cb(error);
      ipcRenderer.on('updater:error', handler);
      return () => ipcRenderer.removeListener('updater:error', handler);
    },
  },
});
