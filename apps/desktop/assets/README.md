# 应用图标资源

此目录用于存放 TapDev Studio 的应用图标文件。

## 需要的图标文件

### Windows 平台
- `icon.ico` - Windows 应用图标（推荐尺寸：256x256 像素，多尺寸 ICO 格式）

### macOS 平台（可选）
- `icon.icns` - macOS 应用图标（推荐尺寸：512x512 像素，ICNS 格式）

### Linux 平台（可选）
- `icon.png` - Linux 应用图标（推荐尺寸：512x512 像素，PNG 格式）

## 图标要求

1. **格式**：
   - Windows: ICO 格式（包含多种尺寸：16x16, 32x32, 48x48, 64x64, 128x128, 256x256）
   - macOS: ICNS 格式
   - Linux: PNG 格式（透明背景）

2. **设计建议**：
   - 简洁明了，易于识别
   - 在小尺寸下仍清晰可见
   - 符合 TapTap 品牌风格

## 如何生成图标

### 在线工具
- [ICO Convert](https://icoconvert.com/) - 在线生成 ICO 文件
- [Icon Convert](https://iconverticons.com/online/) - 生成多种格式图标

### 本地工具
- [ImageMagick](https://imagemagick.org/) - 命令行工具
  ```bash
  convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
  ```

## 注意事项

- 如果不提供图标文件，electron-builder 会使用默认图标
- 图标文件应放在此目录下
- 打包时会自动包含在应用中