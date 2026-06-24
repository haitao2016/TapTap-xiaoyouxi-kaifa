import { Button, Badge, Progress, Card, CardHeader, CardTitle, CardContent, Input, Checkbox } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { getNativeBridge, buildService } from '@tapdev/core';
import { isNativeAvailable } from '../lib/native-bridge';
import { useEffect, useState } from 'react';
import type { UnityInstallation, UnityProjectValidation } from '@tapdev/types';

const PLATFORMS = [
  { id: 'webgl', name: 'WebGL', description: '网页端 WebGL/WASM' },
  { id: 'android', name: 'Android', description: 'Android 原生' },
  { id: 'ios', name: 'iOS', description: 'iOS 原生' },
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

  const handleStartBuild = () => {
    startBuild({
      platforms: selectedPlatforms,
      version,
      compress,
      wasmSplit,
      optimizeAssets,
      stripDebug,
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">构建发布</h2>
          <p className="text-sm text-text-secondary">
            通过 Unity BatchMode 调用 TapTap SDK 生成 game.zip / game_wasm_split.zip
          </p>
        </div>
        <Button
          onClick={handleStartBuild}
          disabled={!currentProject || activeBuildTask?.status === 'running' || selectedPlatforms.length === 0}
        >
          {native ? 'Unity 构建' : '模拟构建'}
        </Button>
      </div>

      {!native && (
        <Card>
          <CardContent className="py-3 text-sm text-yellow-400">
            Web 模式仅支持模拟构建。真实 Unity 构建请使用 Electron 桌面端：pnpm dev:desktop
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>目标平台</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLATFORMS.map((platform) => (
              <label
                key={platform.id}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${
                  selectedPlatforms.includes(platform.id)
                    ? 'border-tap-orange bg-tap-orange/5'
                    : 'border-border hover:border-border-dark'
                }`}
              >
                <div>
                  <div className="font-medium">{platform.name}</div>
                  <div className="text-xs text-text-muted">{platform.description}</div>
                </div>
                <Checkbox
                  checked={selectedPlatforms.includes(platform.id)}
                  onCheckedChange={() => togglePlatform(platform.id)}
                  disabled={!native && (platform.id === 'android' || platform.id === 'ios')}
                />
              </label>
            ))}
            {!native && (
              <p className="text-xs text-text-muted">
                Android/iOS 构建需要 Electron 桌面端环境
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>构建选项</CardTitle>
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
              <Checkbox
                checked={compress}
                onCheckedChange={setCompress}
              >
                压缩打包 (game.zip)
              </Checkbox>
              <Checkbox
                checked={wasmSplit}
                onCheckedChange={setWasmSplit}
                disabled={!selectedPlatforms.includes('webgl')}
              >
                WASM 分包 (game_wasm_split.zip)
              </Checkbox>
              <Checkbox
                checked={optimizeAssets}
                onCheckedChange={setOptimizeAssets}
              >
                资源优化
              </Checkbox>
              <Checkbox
                checked={stripDebug}
                onCheckedChange={setStripDebug}
              >
                移除调试信息
              </Checkbox>
            </div>
          </CardContent>
        </Card>
      </div>

      {native && (
        <Card>
          <CardHeader>
            <CardTitle>Unity 环境</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="text-text-muted">已检测 Unity 安装</div>
              {unityInstalls.length === 0 ? (
                <p className="text-red-400">未找到 Unity 编辑器</p>
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
                      {u.isDefault && (
                        <Badge variant="success" size="sm">默认</Badge>
                      )}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>构建进行中</span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => cancelBuild(activeBuildTask.id)}
              >
                取消
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-sm text-text-muted">
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
                <div className="mt-1 font-medium">{(lastBuildResult.duration / 1000).toFixed(1)}s</div>
              </div>
              {lastBuildResult.buildNumber && (
                <div className="rounded-lg bg-surface-2 p-3">
                  <div className="text-xs text-text-muted">构建编号</div>
                  <div className="mt-1 font-mono text-xs">{lastBuildResult.buildNumber}</div>
                </div>
              )}
              {lastBuildResult.buildHash && (
                <div className="rounded-lg bg-surface-2 p-3">
                  <div className="text-xs text-text-muted">构建哈希</div>
                  <div className="mt-1 font-mono text-xs">{lastBuildResult.buildHash}</div>
                </div>
              )}
            </div>

            {lastBuildResult.outputFiles.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-text-muted">输出文件</div>
                <ul className="mt-2 space-y-1">
                  {lastBuildResult.outputFiles.map((f) => (
                    <li key={f} className="font-mono text-xs text-tap-orange">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastBuildResult.errors.map((e, i) => (
              <p key={i} className="mt-2 text-xs text-red-400">
                {e}
              </p>
            ))}
            {lastBuildResult.warnings.map((w, i) => (
              <p key={i} className="mt-2 text-xs text-yellow-400">
                {w}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>构建配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
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

      {buildTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>构建历史</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {buildTasks.slice(0, 8).map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span>{new Date(task.startedAt ?? 0).toLocaleString()}</span>
                    <span className="text-text-muted">
                      v{task.config.version}
                    </span>
                  </div>
                  <Badge
                    variant={
                      task.status === 'success'
                        ? 'success'
                        : task.status === 'failed'
                        ? 'error'
                        : task.status === 'cancelled'
                        ? 'default'
                        : 'default'
                    }
                  >
                    {task.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
      <span className="shrink-0 text-text-muted">{label}</span>
      <span className="truncate text-right font-mono text-xs">{value}</span>
    </div>
  );
}