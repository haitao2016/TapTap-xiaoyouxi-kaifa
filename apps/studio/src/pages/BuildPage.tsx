import {
  Button,
  Badge,
  Progress,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Checkbox,
  Icon,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { getNativeBridge, buildService } from '@tapdev/core';
import { isNativeAvailable } from '../lib/native-bridge';
import { useEffect, useState } from 'react';
import type { UnityInstallation, UnityProjectValidation, BuildTask } from '@tapdev/types';

const PLATFORMS = [
  { id: 'webgl', name: 'WebGL', description: '网页端 WebGL/WASM', icon: 'globe' },
  { id: 'android', name: 'Android', description: 'Android 原生', icon: 'smartphone' },
  { id: 'ios', name: 'iOS', description: 'iOS 原生', icon: 'phone' },
];

export function BuildPage() {
  const {
    currentProject,
    activeBuildTask,
    buildTasks,
    lastBuildResult,
    startBuild,
    cancelBuild,
    settings,
  } = useAppStore();

  const [unityInstalls, setUnityInstalls] = useState<UnityInstallation[]>([]);
  const [validation, setValidation] = useState<UnityProjectValidation | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['webgl']);
  const [version, setVersion] = useState('1.0.0');
  const [compress, setCompress] = useState(true);
  const [wasmSplit, setWasmSplit] = useState(true);
  const [optimizeAssets, setOptimizeAssets] = useState(true);
  const [stripDebug, setStripDebug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedBuilds, setSelectedBuilds] = useState<string[]>([]);
  const native = isNativeAvailable();

  useEffect(() => {
    const bridge = getNativeBridge();
    if (!bridge?.isAvailable()) return;

    bridge.detectUnity().then(setUnityInstalls);
    if (currentProject?.path) {
      bridge.validateUnityProject(currentProject.path).then(setValidation);
    }
  }, [currentProject?.path]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        return prev.filter((p) => p !== platformId);
      }
      return [...prev, platformId];
    });
  };

  const handleStartBuild = async () => {
    try {
      setLoading(true);
      setError(null);
      await startBuild({
        platforms: selectedPlatforms,
        version,
        compress,
        wasmSplit,
        optimizeAssets,
        stripDebug,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '构建启动失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBuild = (taskId: string) => {
    try {
      setError(null);
      cancelBuild(taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消构建失败');
    }
  };

  const toggleBuildSelection = (buildId: string) => {
    setSelectedBuilds((prev) => {
      if (prev.includes(buildId)) {
        return prev.filter((id) => id !== buildId);
      }
      if (prev.length >= 2) {
        return [prev[1], buildId];
      }
      return [...prev, buildId];
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${seconds}秒`;
  };

  const successCount = buildTasks.filter((t) => t.status === 'success').length;
  const failedCount = buildTasks.filter((t) => t.status === 'failed').length;

  const selectedBuildTasks = selectedBuilds
    .map((id) => buildTasks.find((t) => t.id === id))
    .filter((t): t is BuildTask => t !== undefined);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {error && (
        <div className="flex items-center justify-between border-b border-red-500/50 bg-red-500/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <Icon name="alert" size={16} className="text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">构建发布</h2>
          <p className="text-sm text-text-secondary">
            通过 Unity BatchMode 调用 TapTap SDK 生成 game.zip
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted">
            <span>
              总计: <Badge variant="default">{buildTasks.length}</Badge>
            </span>
            <span>
              成功: <Badge variant="success">{successCount}</Badge>
            </span>
            <span>
              失败: <Badge variant="error">{failedCount}</Badge>
            </span>
          </div>
          <Button
            onClick={handleStartBuild}
            disabled={
              !currentProject ||
              activeBuildTask?.status === 'running' ||
              selectedPlatforms.length === 0 ||
              loading
            }
          >
            <Icon name="build" size={14} />
            {loading ? '构建中...' : native ? '开始构建' : '模拟构建'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="config" className="h-full flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="config">构建配置</TabsTrigger>
            <TabsTrigger value="history">
              构建历史
              {buildTasks.length > 0 && (
                <Badge variant="default" className="ml-1">
                  {buildTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="compare">构建对比</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-4xl space-y-6">
              {!native && (
                <Card className="border-yellow-600/50 bg-yellow-500/5">
                  <CardContent className="flex items-start gap-3 py-3">
                    <Icon name="alert" size={18} className="shrink-0 text-yellow-400" />
                    <div>
                      <p className="text-sm text-yellow-400">Web 模式仅支持模拟构建</p>
                      <p className="mt-1 text-xs text-text-muted">
                        真实 Unity 构建请使用 Electron 桌面端：pnpm dev:desktop
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="smartphone" size={16} className="text-tap-orange" />
                      目标平台
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {PLATFORMS.map((platform) => {
                      const disabled =
                        !native && (platform.id === 'android' || platform.id === 'ios');
                      return (
                        <label
                          key={platform.id}
                          className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${
                            selectedPlatforms.includes(platform.id)
                              ? 'border-tap-orange bg-tap-orange/5'
                              : 'border-border hover:border-border-dark'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
                              <Icon name={platform.icon} size={16} className="text-text-muted" />
                            </div>
                            <div>
                              <div className="font-medium">{platform.name}</div>
                              <div className="text-xs text-text-muted">{platform.description}</div>
                            </div>
                          </div>
                          <Checkbox
                            checked={selectedPlatforms.includes(platform.id)}
                            onCheckedChange={() => !disabled && togglePlatform(platform.id)}
                            disabled={disabled}
                          />
                        </label>
                      );
                    })}
                    {!native && (
                      <p className="text-xs text-text-muted">
                        Android/iOS 构建需要 Electron 桌面端环境
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="settings" size={16} className="text-tap-orange" />
                      构建选项
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">版本号</label>
                      <Input
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Checkbox checked={compress} onCheckedChange={setCompress}>
                        压缩打包 (game.zip)
                      </Checkbox>
                      <Checkbox
                        checked={wasmSplit}
                        onCheckedChange={setWasmSplit}
                        disabled={!selectedPlatforms.includes('webgl')}
                      >
                        WASM 分包 (game_wasm_split.zip)
                      </Checkbox>
                      <Checkbox checked={optimizeAssets} onCheckedChange={setOptimizeAssets}>
                        资源优化
                      </Checkbox>
                      <Checkbox checked={stripDebug} onCheckedChange={setStripDebug}>
                        移除调试信息
                      </Checkbox>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {native && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="cpu" size={16} className="text-tap-orange" />
                      Unity 环境
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="text-text-muted">已检测 Unity 安装</div>
                      {unityInstalls.length === 0 ? (
                        <p className="mt-2 text-red-400">未找到 Unity 编辑器</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {unityInstalls.slice(0, 3).map((u) => (
                            <li
                              key={u.path}
                              className={`flex items-center justify-between rounded-lg p-2 ${
                                u.isDefault ? 'bg-tap-orange/5' : 'bg-surface-2'
                              }`}
                            >
                              <div className="font-mono text-xs">
                                {u.version} — {u.path}
                              </div>
                              {u.isDefault && <Badge variant="success">默认</Badge>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {validation && (
                      <div className="rounded-lg bg-surface-2 p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">TapTap SDK</span>
                          <Badge variant={validation.tapTapSDK.installed ? 'success' : 'error'}>
                            {validation.tapTapSDK.installed ? '已安装' : '未安装'}
                          </Badge>
                          {validation.tapTapSDK.version && (
                            <span className="text-xs text-text-muted">
                              v{validation.tapTapSDK.version}
                            </span>
                          )}
                        </div>
                        {validation.errors.map((e) => (
                          <p key={e} className="mt-2 text-xs text-red-400">
                            {e}
                          </p>
                        ))}
                        {validation.warnings.map((w) => (
                          <p key={w} className="mt-2 text-xs text-yellow-400">
                            {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeBuildTask && (
                <Card className="border-tap-orange/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-tap-orange" />
                        构建进行中
                      </span>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleCancelBuild(activeBuildTask.id)}
                      >
                        取消构建
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 text-sm">
                      {activeBuildTask.progressMessage || '正在构建...'}
                    </div>
                    <Progress value={activeBuildTask.progress} />
                    <div className="mt-2 flex justify-between text-xs text-text-muted">
                      <span>状态: {activeBuildTask.status}</span>
                      <span>{activeBuildTask.progress}%</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {lastBuildResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      最近构建结果
                      <Badge variant={lastBuildResult.success ? 'success' : 'error'}>
                        {lastBuildResult.success ? '成功' : '失败'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3 text-sm">
                      <div className="rounded-lg bg-surface-2 p-3">
                        <div className="text-xs text-text-muted">耗时</div>
                        <div className="mt-1 font-medium">
                          {formatDuration(lastBuildResult.duration)}
                        </div>
                      </div>
                      {lastBuildResult.buildNumber && (
                        <div className="rounded-lg bg-surface-2 p-3">
                          <div className="text-xs text-text-muted">构建编号</div>
                          <div className="mt-1 font-mono text-xs">
                            {lastBuildResult.buildNumber}
                          </div>
                        </div>
                      )}
                      {lastBuildResult.buildHash && (
                        <div className="rounded-lg bg-surface-2 p-3">
                          <div className="text-xs text-text-muted">构建哈希</div>
                          <div className="mt-1 font-mono text-xs truncate">
                            {lastBuildResult.buildHash}
                          </div>
                        </div>
                      )}
                    </div>

                    {lastBuildResult.outputFiles.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium">输出文件</div>
                        <ul className="mt-2 space-y-1">
                          {lastBuildResult.outputFiles.map((f) => (
                            <li
                              key={f}
                              className="flex items-center justify-between rounded bg-surface-2 px-3 py-2"
                            >
                              <span className="font-mono text-xs text-tap-orange truncate">
                                {f}
                              </span>
                              <Icon name="download" size={12} className="text-text-muted" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lastBuildResult.errors.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-red-400">错误</div>
                        {lastBuildResult.errors.map((e, i) => (
                          <p key={i} className="mt-2 text-xs text-red-400 font-mono">
                            {e}
                          </p>
                        ))}
                      </div>
                    )}
                    {lastBuildResult.warnings.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-yellow-400">警告</div>
                        {lastBuildResult.warnings.map((w, i) => (
                          <p key={i} className="mt-2 text-xs text-yellow-400 font-mono">
                            {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="file" size={16} className="text-tap-orange" />
                    构建配置摘要
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <ConfigItem label="项目路径" value={currentProject?.path ?? '--'} />
                    <ConfigItem label="Unity 路径" value={settings.unityPath ?? '自动检测'} />
                    <ConfigItem label="目标平台" value={selectedPlatforms.join(', ') || '--'} />
                    <ConfigItem label="版本号" value={version} />
                    <ConfigItem label="输出路径" value={currentProject?.config.buildPath ?? '--'} />
                    <ConfigItem label="CDN" value={currentProject?.config.cdnUrl ?? '未配置'} />
                    <ConfigItem label="压缩打包" value={compress ? '是' : '否'} />
                    <ConfigItem label="WASM 分包" value={wasmSplit ? '是' : '否'} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0 flex-1 overflow-auto">
            <Card>
              <CardContent className="p-0">
                {buildTasks.length === 0 ? (
                  <div className="py-12 text-center">
                    <Icon name="build" size={40} className="mx-auto mb-3 text-text-muted" />
                    <p className="text-text-secondary">暂无构建记录</p>
                    <p className="mt-1 text-xs text-text-muted">点击上方按钮开始构建</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {buildTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 hover:bg-surface-2"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <Badge
                            variant={
                              task.status === 'success'
                                ? 'success'
                                : task.status === 'failed'
                                  ? 'error'
                                  : task.status === 'running'
                                    ? 'info'
                                    : 'default'
                            }
                          >
                            {task.status === 'running' && (
                              <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                            )}
                            {task.status === 'success'
                              ? '成功'
                              : task.status === 'failed'
                                ? '失败'
                                : task.status === 'running'
                                  ? '构建中'
                                  : task.status === 'cancelled'
                                    ? '已取消'
                                    : '待处理'}
                          </Badge>
                          <div className="min-w-0">
                            <div className="font-medium">v{task.config.version}</div>
                            <div className="text-xs text-text-muted">
                              {task.startedAt ? new Date(task.startedAt).toLocaleString() : '--'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted">
                            <span>{task.config.targetPlatform.join(', ')}</span>
                            {task.result?.duration && (
                              <span>{formatDuration(task.result.duration)}</span>
                            )}
                          </div>
                          {task.status === 'running' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelBuild(task.id)}
                            >
                              取消
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare" className="mt-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-4xl space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>构建对比</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-text-muted">选择两个构建进行对比，查看差异</p>
                  <div className="flex flex-wrap gap-2">
                    {buildTasks.slice(0, 10).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => toggleBuildSelection(task.id)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                          selectedBuilds.includes(task.id)
                            ? 'border-tap-orange bg-tap-orange/10 text-tap-orange'
                            : 'border-border hover:border-border-dark'
                        }`}
                      >
                        <div className="font-medium">v{task.config.version}</div>
                        <div className="text-xs text-text-muted">
                          {task.startedAt ? new Date(task.startedAt).toLocaleDateString() : '--'}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedBuildTasks.length === 2 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {selectedBuildTasks.map((task, index) => (
                    <Card key={task.id}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          构建 {index + 1}: v{task.config.version}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">状态</span>
                          <Badge
                            variant={
                              task.status === 'success'
                                ? 'success'
                                : task.status === 'failed'
                                  ? 'error'
                                  : 'default'
                            }
                          >
                            {task.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">耗时</span>
                          <span>
                            {task.result?.duration ? formatDuration(task.result.duration) : '--'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">平台</span>
                          <span>{task.config.targetPlatform.join(', ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">压缩</span>
                          <span>{task.config.compress ? '是' : '否'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">WASM 分包</span>
                          <span>{task.config.wasmSplit ? '是' : '否'}</span>
                        </div>
                        {task.result?.buildNumber && (
                          <div className="flex justify-between">
                            <span className="text-text-muted">构建编号</span>
                            <span className="font-mono text-xs">{task.result.buildNumber}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-text-muted">
                    <Icon name="git-compare" size={32} className="mx-auto mb-2" />
                    <p>请选择两个构建进行对比</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
      <span className="shrink-0 text-text-muted text-xs">{label}</span>
      <span className="truncate text-right font-mono text-xs">{value}</span>
    </div>
  );
}
