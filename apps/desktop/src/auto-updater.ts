import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let isUpdating = false;
let updateDownloaded = false;

const isDev = !app.isPackaged;

function sendStatus(channel: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  if (isDev) {
    const devAppUpdateYml = path.join(process.cwd(), 'dev-app-update.yml');
    if (fs.existsSync(devAppUpdateYml)) {
      autoUpdater.updateConfigPath = devAppUpdateYml;
    }
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatus('updater:checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatus('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      files: info.files,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatus('updater:not-available', {
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus('updater:download-progress', {
      bytesPerSecond: progress.bytesPerSecond,
      percent: progress.percent,
      total: progress.total,
      transferred: progress.transferred,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    isUpdating = false;
    sendStatus('updater:downloaded', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('error', (error) => {
    isUpdating = false;
    updateDownloaded = false;
    sendStatus('updater:error', {
      message: error.message,
      stack: error.stack,
    });
  });
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;
  setupAutoUpdater();
  registerIpcHandlers();
}

export function registerIpcHandlers(): void {
  ipcMain.handle('updater:check', async () => {
    if (isDev) {
      return {
        success: false,
        message: '开发环境不支持自动更新',
      };
    }
    if (isUpdating) {
      return {
        success: false,
        message: '正在检查更新中',
      };
    }
    try {
      isUpdating = true;
      updateDownloaded = false;
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      isUpdating = false;
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('updater:download', async () => {
    if (isDev) {
      return {
        success: false,
        message: '开发环境不支持自动更新',
      };
    }
    if (updateDownloaded) {
      return {
        success: false,
        message: '更新包已下载',
      };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('updater:install', async () => {
    if (isDev) {
      return {
        success: false,
        message: '开发环境不支持自动更新',
      };
    }
    if (!updateDownloaded) {
      return {
        success: false,
        message: '更新包尚未下载完成',
      };
    }
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('updater:getCurrentVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('updater:getStatus', () => {
    return {
      isUpdating,
      updateDownloaded,
      currentVersion: app.getVersion(),
    };
  });
}

export function checkForUpdatesOnStartup(): void {
  if (!isDev && mainWindow) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
        // 静默失败，用户可以手动检查
      });
    }, 5000);
  }
}
