# TapDev Studio API 参考文档

## 核心服务

### MonitorService

监控服务用于实时追踪游戏性能指标。

#### 方法

**startMonitoring(intervalMs: number)**

启动性能监控。

```typescript
monitorService.startMonitoring(1000); // 每秒收集一次
```

**stopMonitoring()**

停止性能监控。

```typescript
monitorService.stopMonitoring();
```

**getLatestMetrics(): PerformanceMetrics | null**

获取最新的性能指标。

```typescript
const metrics = monitorService.getLatestMetrics();
// { fps: 58, memory: 256000000, memoryLimit: 512000000, ... }
```

**getStats(): MonitorStats**

获取统计摘要。

```typescript
const stats = monitorService.getStats();
// { avgFps: 58, avgMemoryUsage: 50, totalRequests: 100, ... }
```

**recordNetworkRequest(request: NetworkRequestInfo)**

记录网络请求。

```typescript
monitorService.recordNetworkRequest({
  url: 'https://api.example.com/data',
  method: 'GET',
  status: 200,
  duration: 150,
  size: 1024,
  type: 'fetch',
});
```

**setThresholds(thresholds: Partial<MonitorThresholds>)**

设置告警阈值。

```typescript
monitorService.setThresholds({
  fps: 30,
  memoryRatio: 0.85,
});
```

### BuildService

构建服务用于执行 Unity 项目构建。

#### 方法

**startBuild(config: BuildConfig): Promise<BuildTask>**

启动构建任务。

```typescript
const task = await buildService.startBuild({
  projectId: 'my-project',
  projectPath: '/path/to/project',
  outputPath: '/path/to/output',
  compress: true,
  wasmSplit: true,
  development: false,
  targetPlatform: ['webgl', 'android'],
  version: '1.0.0',
});
```

**validateConfig(config: BuildConfig): { valid: boolean; errors: string[] }**

验证构建配置。

```typescript
const result = buildService.validateConfig(config);
if (!result.valid) {
  console.error(result.errors);
}
```

**getActiveTask(): BuildTask | null**

获取当前活动的构建任务。

### PluginManager

插件管理器用于管理和扩展应用功能。

#### 方法

**registerPlugin(meta: PluginMeta, activate?, deactivate?)**

注册插件。

```typescript
pluginManager.registerPlugin(
  {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Custom plugin',
    enabled: true,
    entry: 'my-plugin',
    hooks: ['onProjectOpen'],
  },
  (ctx) => {
    // 激活时执行
    ctx.registerCommand('my-cmd', () => {}, {
      title: 'My Command',
    });
  },
  () => {
    // 停用时执行
  }
);
```

**activatePlugin(pluginId: string)**

激活插件。

```typescript
await pluginManager.activatePlugin('my-plugin');
```

**deactivatePlugin(pluginId: string)**

停用插件。

```typescript
await pluginManager.deactivatePlugin('my-plugin');
```

**getCommandPaletteItems(filter?: string): CommandPaletteItem[]**

获取命令面板条目。

```typescript
const items = pluginManager.getCommandPaletteItems('build');
```

## 类型定义

### PerformanceMetrics

性能指标数据结构。

```typescript
interface PerformanceMetrics {
  fps: number;           // 帧率
  memory: number;        // 内存使用量（字节）
  memoryLimit: number;   // 内存限制
  drawCalls?: number;    // 绘制调用次数
  triangles?: number;    // 三角形数量
  networkRequests: number; // 网络请求数
  networkLatency?: number; // 网络延迟（毫秒）
  cpuUsage?: number;     // CPU 使用率（%）
  gpuMemory?: number;    // GPU 内存
  frameTime?: number;    // 帧时间（毫秒）
  timestamp: number;     // 时间戳
}
```

### MonitorAlert

告警信息。

```typescript
interface MonitorAlert {
  id: string;
  type: 'fps' | 'memory' | 'network' | 'error' | 'cpu' | 'gpu';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
}
```

### BuildConfig

构建配置。

```typescript
interface BuildConfig {
  projectId: string;
  projectPath: string;
  outputPath: string;
  compress: boolean;      // 是否压缩打包
  wasmSplit: boolean;     // 是否 WASM 分包
  development: boolean;   // 是否开发模式
  targetPlatform: Platform[];
  version: string;
  unityPath?: string;
  optimizeAssets?: boolean;
  stripDebugInfo?: boolean;
}
```

## 事件系统

使用全局事件总线进行通信。

```typescript
import { globalEventBus } from '@tapdev/core';

// 监听事件
globalEventBus.on('monitor:metrics', (event) => {
  console.log(event.payload);
});

// 触发事件
globalEventBus.emit({ type: 'plugin:notification', payload: { message: 'Hello' } });
```

### 可用事件

| 事件名 | 描述 | 负载类型 |
|--------|------|----------|
| `monitor:metrics` | 性能指标更新 | `PerformanceMetrics` |
| `monitor:alert` | 告警触发 | `MonitorAlert` |
| `monitor:network-request` | 网络请求记录 | `NetworkRequestInfo` |
| `build:start` | 构建开始 | `BuildTask` |
| `build:progress` | 构建进度 | `{ taskId, progress, message }` |
| `build:complete` | 构建完成 | `BuildResult` |
| `plugin:loaded` | 插件加载 | `PluginMeta` |
| `plugin:activated` | 插件激活 | `PluginMeta` |
| `plugin:deactivated` | 插件停用 | `PluginMeta` |
