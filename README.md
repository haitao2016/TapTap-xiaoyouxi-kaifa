# TapDev Studio

跨平台 TapTap 小游戏开发软件，支持 **PC**、**手机**、**平板** 三个平台。

## 功能特性

| 模块 | 功能 |
|------|------|
| **编辑器** | Monaco 代码编辑器、资源管理器、多标签页、C#/JSON 语法高亮 |
| **调试** | 本地 HTTP 调试服务器、二维码真机调试、断点管理、控制台日志 |
| **监控** | FPS 实时追踪、内存使用监控、网络请求统计、告警阈值通知 |
| **构建** | WebGL/WASM 编译、资源压缩、WASM 分包、多平台适配输出 |
| **文档** | 内置 TapTap 官方文档、API 参考、搜索功能 |
| **插件** | 可扩展插件系统，支持自定义命令和面板 |

## 项目结构

```
tapdev-studio/
├── apps/
│   ├── studio/      # 主应用 (React + Vite)
│   ├── desktop/     # PC 桌面端 (Electron)
│   └── mobile/      # 手机/平板端 (Capacitor)
├── packages/
│   ├── types/       # 共享 TypeScript 类型
│   ├── core/        # 核心业务逻辑 + WebSocket 客户端
│   ├── server/      # Node 调试服务器 + Unity 构建引擎
│   └── ui/          # 共享 UI 组件库
├── templates/
│   └── unity/       # Unity Editor 构建脚本模板
└── package.json
```

## 环境要求

- Node.js >= 18
- pnpm >= 8
- Unity 2021.3+ / 2022.3+（真实构建时需要）
- TapTap 小游戏 Unity SDK

## 安装说明

### 使用 pnpm

```bash
# 安装 pnpm（如未安装）
npm install -g pnpm

# 安装依赖
pnpm install

# Web 开发（响应式 UI，模拟构建）
pnpm dev

# Electron 桌面端（完整功能：真实调试 + Unity 构建）
pnpm dev:desktop

# 独立调试服务器（Web 模式配合使用）
pnpm dev:server
```

根目录脚本和工作区配置都依赖 `pnpm`，因此请先确保本机可用 `pnpm` 命令。

### Windows PowerShell 注意事项

如果在 Windows PowerShell 中遇到执行策略问题：

```powershell
# 安装 pnpm（如未安装）
npm.cmd install -g pnpm

# 使用 .cmd 后缀运行 pnpm
pnpm.cmd install
pnpm.cmd dev

# 或临时允许脚本执行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Unity 真实构建流程

Electron 桌面端通过 Unity BatchMode 调用 TapTap SDK：

1. 在 Unity 项目中安装 [TapTap 小游戏 SDK](https://github.com/taptap/minigame-sdk-unity)
2. 首次构建时自动安装 `Assets/Editor/TapDevBuildRunner.cs`（也可手动复制 `templates/unity/`）
3. 在 TapDev Studio 中打开 Unity 项目目录
4. 点击「Unity 构建」，流程如下：

```
验证项目 → 检测 SDK → Unity BatchMode → TapTap 构建菜单 → 输出 game.zip
```

构建命令等价于：

```bash
Unity.exe -batchmode -nographics -quit \
  -projectPath "你的项目路径" \
  -executeMethod TapDevStudio.BuildRunner.ExecuteBuild \
  -tapdevOutput "输出目录" \
  -tapdevWasmSplit 1
```

## 调试服务器 (HTTP + WebSocket)

| 端点 | 说明 |
|------|------|
| `GET /debug` | 真机调试 landing 页 + QR 码 |
| `GET /api/status` | 服务器状态 JSON |
| `GET /api/qrcode` | QR 码 Data URL |
| `WS /ws?role=studio` | Studio 客户端连接 |
| `WS /ws?role=game` | 游戏/真机客户端连接 |

WebSocket 消息：`log`、`breakpoint-sync`、`breakpoint-hit`、`command`、`metrics`

```bash
# 独立启动（Web 开发时）
pnpm dev:server

# Electron 内自动启动，无需手动
```

## 平台支持

### PC (Electron)

```bash
pnpm dev:desktop          # 开发
pnpm build:desktop        # 打包安装程序

# 分平台打包
cd apps/desktop
pnpm dist:win             # Windows NSIS 安装包
pnpm dist:mac             # macOS DMG
pnpm dist:linux           # Linux AppImage/deb
```

### 手机 & 平板 (Capacitor)

```bash
cd apps/mobile
pnpm sync                 # 构建 Web + 同步原生项目
pnpm open:android         # Android Studio
pnpm open:ios             # Xcode (macOS)
pnpm release:android      # Release APK
pnpm release:android:bundle  # Release AAB (Google Play)
```

发布详细说明：
- [Android 发布配置](apps/mobile/docs/android-release.md)
- [iOS 发布配置](apps/mobile/docs/ios-release.md)

## 插件开发

创建自定义插件扩展功能：

```typescript
// plugins/my-plugin/index.ts
import type { PluginContext } from '@tapdev/types';

export function activate(ctx: PluginContext) {
  ctx.registerCommand('my-command', async () => {
    // 自定义逻辑
  });

  ctx.registerPanel('my-panel', {
    id: 'my-panel',
    title: '我的面板',
    component: 'MyPanel',
    defaultPosition: 'right',
  });
}
```

支持的插件钩子：
- `onProjectOpen` / `onProjectClose`
- `onBuildStart` / `onBuildComplete`
- `onDebugConnect` / `onDebugDisconnect`
- `onMonitorTick`
- `onBeforeSave` / `onAfterSave`

## TapTap 官方资源

- [小游戏开发者文档](https://developer.taptap.cn/minigameapidoc/quick-start/document-guide/)
- [Unity WebGL 适配方案](https://developer.taptap.cn/minigameapidoc/dev/engine/unity-adaptation/unity-webGL/)
- [Unity SDK (GitHub)](https://github.com/taptap/minigame-sdk-unity)

## 技术栈

- **前端**: React 18, TypeScript, Vite, Tailwind CSS
- **编辑器**: Monaco Editor
- **状态管理**: Zustand
- **PC 端**: Electron 33
- **移动端**: Capacitor 6
- **包管理**: pnpm Workspaces

## License

MIT
