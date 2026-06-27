import { randomUUID } from 'node:crypto';
import { debugServer, unityBuildRunner } from '@tapdev/server';
import type { BuildConfig, BuildResult, DebugLogEntry, PerformanceMetrics } from '@tapdev/types';
import { BrowserWindow } from 'electron';

const buildTasks = new Map<string, { cancelled: boolean }>();

export async function startNativeDebugServer(opts: {
  projectId: string;
  port: number;
  projectPath?: string;
  staticDir?: string;
}) {
  debugServer.setEvents({
    onLog: (entry: DebugLogEntry) => {
      broadcast('native:debug-log', entry);
    },
    onGameConnected: () => broadcast('native:game-connected', {}),
    onGameDisconnected: () => broadcast('native:game-disconnected', {}),
    onMetrics: (metrics: PerformanceMetrics) => broadcast('native:metrics', metrics),
  });

  const status = await debugServer.start({
    port: opts.port,
    projectId: opts.projectId,
    projectPath: opts.projectPath,
    staticDir: opts.staticDir,
    host: '0.0.0.0',
  });

  const session = debugServer.getSessionInfo();
  return {
    sessionId: session.id,
    url: status.url,
    wsUrl: status.wsUrl,
    qrCodeDataUrl: session.qrCodeDataUrl,
    port: status.port,
  };
}

export async function stopNativeDebugServer(): Promise<void> {
  await debugServer.stop();
}

export function detectUnityInstallations() {
  return unityBuildRunner.detectUnity();
}

export function validateUnityProject(projectPath: string) {
  return unityBuildRunner.validateProject(projectPath);
}

export async function startUnityBuild(config: BuildConfig): Promise<string> {
  const taskId = randomUUID();
  const startTime = Date.now();
  buildTasks.set(taskId, { cancelled: false });

  unityBuildRunner
    .build(
      {
        projectPath: config.projectPath,
        outputPath: config.outputPath,
        unityPath: config.unityPath,
        wasmSplit: config.wasmSplit,
        development: config.development,
        compress: config.compress,
        cdnUrl: config.cdnUrl,
        appId: config.appId,
      },
      (progress: { progress: number; message?: string }) => {
        broadcast('native:build-progress', {
          taskId,
          progress: progress.progress,
          message: progress.message,
        });
      }
    )
    .then((result: { success: boolean; outputFiles: string[]; errors: string[]; warnings: string[] }) => {
      const task = buildTasks.get(taskId);
      if (task?.cancelled) {
        unityBuildRunner.cancel();
        buildTasks.delete(taskId);
        return;
      }
      const duration = Date.now() - startTime;
      const buildResult: BuildResult = {
        id: randomUUID(),
        projectId: config.projectId,
        success: result.success,
        outputFiles: result.outputFiles,
        duration,
        errors: result.errors,
        warnings: result.warnings,
        timestamp: Date.now(),
      };
      broadcast('native:build-complete', buildResult);
      buildTasks.delete(taskId);
    })
    .catch((err: Error) => {
      const task = buildTasks.get(taskId);
      if (task?.cancelled) {
        unityBuildRunner.cancel();
        buildTasks.delete(taskId);
        return;
      }
      const duration = Date.now() - startTime;
      broadcast('native:build-complete', {
        id: randomUUID(),
        projectId: config.projectId,
        success: false,
        outputFiles: [],
        duration,
        errors: [String(err)],
        warnings: [],
        timestamp: Date.now(),
      } satisfies BuildResult);
      buildTasks.delete(taskId);
    });

  return taskId;
}

export function cancelUnityBuild(_taskId: string): void {
  const task = buildTasks.get(_taskId);
  if (task) {
    task.cancelled = true;
    if (buildTasks.has(_taskId)) {
      unityBuildRunner.cancel();
    }
  }
}

function broadcast(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, data);
  }
}
