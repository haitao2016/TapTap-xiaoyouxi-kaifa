import { useState, useEffect, useCallback } from 'react';
import { Button } from '@tapdev/ui';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: unknown;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

export function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [currentVersion, setCurrentVersion] = useState('0.1.0');
  const [latestVersion, setLatestVersion] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updater = window.electronAPI?.updater;
    setIsDesktop(!!updater);

    if (updater) {
      updater.getCurrentVersion().then((v) => setCurrentVersion(v));

      const unsubChecking = updater.onChecking(() => {
        setStatus('checking');
      });
      const unsubAvailable = updater.onAvailable((info) => {
        setLatestVersion(info);
        setStatus('available');
      });
      const unsubNotAvailable = updater.onNotAvailable(() => {
        setStatus('not-available');
      });
      const unsubProgress = updater.onDownloadProgress((progress) => {
        setDownloadProgress(progress);
        setStatus('downloading');
      });
      const unsubDownloaded = updater.onDownloaded((info) => {
        setLatestVersion(info);
        setStatus('downloaded');
      });
      const unsubError = updater.onError((error) => {
        setErrorMessage(error.message);
        setStatus('error');
      });

      return () => {
        unsubChecking();
        unsubAvailable();
        unsubNotAvailable();
        unsubProgress();
        unsubDownloaded();
        unsubError();
      };
    }
  }, []);

  const handleCheck = useCallback(async () => {
    const updater = window.electronAPI?.updater;
    if (!updater) return;
    setStatus('checking');
    setErrorMessage('');
    const result = await updater.check();
    if (!result.success && result.message) {
      setErrorMessage(result.message);
      setStatus('error');
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const updater = window.electronAPI?.updater;
    if (!updater) return;
    setStatus('downloading');
    setErrorMessage('');
    const result = await updater.download();
    if (!result.success && result.message) {
      setErrorMessage(result.message);
      setStatus('error');
    }
  }, []);

  const handleInstall = useCallback(async () => {
    const updater = window.electronAPI?.updater;
    if (!updater) return;
    const result = await updater.install();
    if (!result.success && result.message) {
      setErrorMessage(result.message);
      setStatus('error');
    }
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bps: number) => `${formatBytes(bps)}/s`;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">关于 TapDev Studio</h3>
          <p className="text-xs text-text-muted">版本 {currentVersion}</p>
        </div>
        {isDesktop && status === 'idle' && (
          <Button size="sm" variant="secondary" onClick={handleCheck}>
            检查更新
          </Button>
        )}
      </div>

      {status === 'checking' && (
        <div className="rounded-lg bg-surface-2 p-3 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-tap-orange border-t-transparent" />
            正在检查更新...
          </div>
        </div>
      )}

      {status === 'not-available' && (
        <div className="rounded-lg bg-surface-2 p-3 text-sm text-text-secondary">
          当前已是最新版本
        </div>
      )}

      {status === 'available' && latestVersion && (
        <div className="space-y-3 rounded-lg bg-surface-2 p-3">
          <div>
            <div className="text-sm font-medium text-tap-orange">发现新版本 v{latestVersion.version}</div>
            {latestVersion.releaseDate && (
              <div className="text-xs text-text-muted">
                发布时间: {new Date(latestVersion.releaseDate).toLocaleDateString('zh-CN')}
              </div>
            )}
          </div>
          <Button size="sm" onClick={handleDownload}>
            下载更新
          </Button>
        </div>
      )}

      {status === 'downloading' && downloadProgress && (
        <div className="space-y-2 rounded-lg bg-surface-2 p-3">
          <div className="text-sm text-text-secondary">正在下载更新...</div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full bg-tap-orange transition-all duration-300"
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span>{downloadProgress.percent.toFixed(1)}%</span>
            <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
            <span>
              {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
            </span>
          </div>
        </div>
      )}

      {status === 'downloaded' && (
        <div className="space-y-3 rounded-lg bg-tap-orange/10 p-3">
          <div className="text-sm font-medium text-tap-orange">
            更新已下载，点击安装即可重启应用
          </div>
          <Button size="sm" onClick={handleInstall}>
            立即安装并重启
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <div className="text-sm text-red-400">更新失败: {errorMessage}</div>
          <Button size="sm" variant="secondary" className="mt-2" onClick={handleCheck}>
            重试
          </Button>
        </div>
      )}

      {!isDesktop && (
        <div className="rounded-lg bg-surface-2 p-3 text-xs text-text-muted">
          自动更新功能仅在桌面端应用中可用
        </div>
      )}
    </section>
  );
}
