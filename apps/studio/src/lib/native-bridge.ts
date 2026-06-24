import {
  setNativeBridge,
  getNativeBridge,
  type NativeBridge,
} from '@tapdev/core';

function createElectronBridge(): NativeBridge | null {
  const api = window.electronAPI?.native;
  if (!api) return null;

  return {
    isAvailable: () => true,
    startDebugServer: async (opts) => {
      const result = await api.startDebugServer({
        projectId: opts.projectId,
        port: opts.port ?? 8081,
        projectPath: opts.projectPath,
        staticDir: opts.staticDir,
      });
      return result;
    },
    stopDebugServer: () => api.stopDebugServer(),
    detectUnity: () => api.detectUnity(),
    validateUnityProject: (path) => api.validateUnityProject(path),
    startUnityBuild: (config) => api.startUnityBuild(config),
    cancelUnityBuild: (taskId) => api.cancelUnityBuild(taskId),
    onBuildProgress: (cb) => api.onBuildProgress(cb),
    onBuildComplete: (cb) => api.onBuildComplete(cb),
  };
}

let initialized = false;

export function initNativeBridge(): NativeBridge | null {
  if (initialized) return getNativeBridge();
  initialized = true;

  const bridge = createElectronBridge();
  if (bridge) setNativeBridge(bridge);
  return bridge;
}

export function isNativeAvailable(): boolean {
  return !!window.electronAPI?.native?.isAvailable?.();
}

export async function openProjectDirectory(): Promise<string | null> {
  if (window.electronAPI?.openDirectory) {
    return window.electronAPI.openDirectory();
  }
  return null;
}
