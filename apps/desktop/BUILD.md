# 构建配置说明

## 代码签名配置

### Windows 代码签名

设置以下环境变量以启用 Windows 代码签名：

```bash
# 证书文件路径（.pfx 或 .p12）
export CSC_LINK="/path/to/certificate.pfx"

# 证书密码
export CSC_KEY_PASSWORD="your-certificate-password"

# 证书颁发者名称（可选）
export CSC_NAME="Your Company Name"
```

或者使用 Windows 证书存储：

```bash
# 使用 Windows 证书存储中的证书
export CERTIFICATE_SUBJECT_NAME="Your Company Name"
```

### macOS 代码签名

```bash
# Mac 开发者证书
export CSC_LINK="/path/to/mac-certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"

# 苹果开发者团队 ID
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# 应用专用密码（用于公证）
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
```

## 发布与更新配置

### 当前仓库的桌面端发布流程

当前桌面端构建脚本位于 `apps/desktop/package.json`：

- 在仓库根目录执行：`pnpm --filter @tapdev/desktop dist:win`
- 在仓库根目录执行：`pnpm --filter @tapdev/desktop dist:mac`
- 在仓库根目录执行：`pnpm --filter @tapdev/desktop dist:linux`

如果已经进入 `apps/desktop/` 目录，也可以分别执行 `pnpm dist:win`、`pnpm dist:mac`、`pnpm dist:linux`。

当前 `.github/workflows/release.yml` 会在以下场景运行桌面端发布流程：

- 推送 `v*` tag 时构建 Windows / macOS / Linux 三个平台产物
- 手动触发 `Release` workflow 时执行构建作业
- 只有 tag 触发时才会创建 GitHub Release 并附加发布资产

### 当前构建目标与发布资产

`apps/desktop/package.json` 中配置的 `electron-builder` 目标为：

- Windows: `nsis`、`zip`
- macOS: `dmg`、`zip`
- Linux: `AppImage`、`deb`

当前 `Release` workflow 会将以下桌面产物附加到 GitHub Release：

- Windows `.exe`
- macOS `.dmg`
- Linux `.AppImage`

### 如需接入自定义更新源

当前 `apps/desktop/package.json` 未配置 `build.publish`，因此下面的示例不是仓库默认发布流程，而是接入自定义更新源时需要补充的配置：

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://your-update-server.com/updates/",
      "channel": "latest"
    }
  }
}
```

常见 provider 示例：

- `generic` - 通用静态文件服务器
- `github` - GitHub Releases
- `s3` - AWS S3
- `spaces` - DigitalOcean Spaces

## 环境变量列表

| 变量名                        | 说明                                      | 必需 |
| ----------------------------- | ----------------------------------------- | ---- |
| `CSC_LINK`                    | 代码签名证书路径                          | 否   |
| `CSC_KEY_PASSWORD`            | 证书密码                                  | 否   |
| `WIN_CSC_LINK`                | Windows 签名证书（CI Windows runner）     | 否   |
| `WIN_CSC_KEY_PASSWORD`        | Windows 签名证书密码（CI Windows runner） | 否   |
| `CSC_IDENTITY_AUTO_DISCOVERY` | 自动发现证书（false 禁用）                | 否   |
| `APPLE_ID`                    | Apple ID（Mac 公证）                      | 否   |
| `APPLE_APP_SPECIFIC_PASSWORD` | 应用专用密码                              | 否   |
| `APPLE_TEAM_ID`               | 团队 ID                                   | 否   |
| `ELECTRON_BUILDER_CACHE`      | 构建缓存目录                              | 否   |
| `ELECTRON_CACHE`              | Electron 二进制缓存                       | 否   |

## 常见问题

### 1. 构建时签名失败

- 检查 `CSC_LINK` 和 `CSC_KEY_PASSWORD` 是否正确
- GitHub Actions 的 Windows 构建还需要配置 `WIN_CSC_LINK` 和 `WIN_CSC_KEY_PASSWORD`
- 在 Linux/macOS 上构建 Windows 版本需要 Wine
- 禁用签名：设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`

### 2. NSIS 安装包无法生成

- 确保网络连接正常（首次需要下载 NSIS）
- 或使用国内镜像：`ELECTRON_BUILDER_BINARIES_MIRROR`
- 当前仓库未提供 `pnpm dist:win:zip` 脚本；Windows 构建请使用 `pnpm --filter @tapdev/desktop dist:win`（或在 `apps/desktop` 目录执行 `pnpm dist:win`）

### 3. 自动更新失败

- 开发环境不支持自动更新；请在打包后的应用中验证
- 当前仓库默认发布流程基于 GitHub Release；如需自定义更新源，请先补齐 `build.publish` 配置
- 查看应用内更新错误信息
