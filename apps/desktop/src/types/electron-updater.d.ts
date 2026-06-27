// electron-updater 模块的类型声明（用于在未安装时的编译）
declare module 'electron-updater' {
  interface UpdateInfo {
    version: string;
    releaseDate?: string;
    releaseNotes?: string | null;
    files?: Array<{ url: string; sha2?: string; size?: number }>;
  }
  interface ProgressInfo {
    bytesPerSecond: number;
    percent: number;
    total: number;
    transferred: number;
  }
  interface Logger {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  }
  interface AppUpdater {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    updateConfigPath: string | null;
    logger: Logger | null;
    on(event: 'checking-for-update', listener: () => void): this;
    on(event: 'update-available', listener: (info: UpdateInfo) => void): this;
    on(event: 'update-not-available', listener: (info: UpdateInfo) => void): this;
    on(event: 'download-progress', listener: (progress: ProgressInfo) => void): this;
    on(event: 'update-downloaded', listener: (info: UpdateInfo) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    checkForUpdates(): Promise<unknown>;
    downloadUpdate(): Promise<unknown>;
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  }
  const autoUpdater: AppUpdater;
  export { autoUpdater };
}
