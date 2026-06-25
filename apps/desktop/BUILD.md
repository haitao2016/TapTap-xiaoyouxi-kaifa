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

## 自动更新配置

### 修改更新服务器地址

编辑 `package.json` 中的 `build.publish.url`：

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

### 支持的发布提供者

- `generic` - 通用静态文件服务器
- `github` - GitHub Releases
- `s3` - AWS S3
- `spaces` - DigitalOcean Spaces

### 上传更新文件

构建完成后，将 `release/` 目录下的所有文件上传到服务器：

```
latest.yml               - 版本元数据（必需）
*.exe                    - 完整安装包
*.nsis.7z                - 增量更新包
*-portable.exe           - 便携版
*.zip                    - 压缩包
```

## 环境变量列表

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `CSC_LINK` | 代码签名证书路径 | 否 |
| `CSC_KEY_PASSWORD` | 证书密码 | 否 |
| `CSC_IDENTITY_AUTO_DISCOVERY` | 自动发现证书（false 禁用） | 否 |
| `APPLE_ID` | Apple ID（Mac 公证） | 否 |
| `APPLE_APP_SPECIFIC_PASSWORD` | 应用专用密码 | 否 |
| `APPLE_TEAM_ID` | 团队 ID | 否 |
| `ELECTRON_BUILDER_CACHE` | 构建缓存目录 | 否 |
| `ELECTRON_CACHE` | Electron 二进制缓存 | 否 |

## 常见问题

### 1. 构建时签名失败

- 检查 `CSC_LINK` 和 `CSC_KEY_PASSWORD` 是否正确
- 在 Linux/macOS 上构建 Windows 版本需要 Wine
- 禁用签名：设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`

### 2. NSIS 安装包无法生成

- 确保网络连接正常（首次需要下载 NSIS）
- 或使用国内镜像：`ELECTRON_BUILDER_BINARIES_MIRROR`
- 只需要 ZIP 格式用：`pnpm dist:win:zip`

### 3. 自动更新失败

- 确保 `latest.yml` 和安装包在同一目录
- 检查 URL 是否可访问
- 查看应用内更新错误信息
