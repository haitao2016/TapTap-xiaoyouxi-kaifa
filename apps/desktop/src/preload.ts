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
});
