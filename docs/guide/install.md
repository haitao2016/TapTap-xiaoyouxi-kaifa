# 安装指南

## 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0

## 使用安装包

### Windows

下载最新的 `.exe` 安装包并运行安装程序。

### macOS

下载最新的 `.dmg` 镜像文件，拖放应用程序到 Applications 文件夹。

### Linux

下载最新的 `.deb` 或 `.rpm` 包进行安装。

## 从源码构建

```bash
# 克隆仓库
git clone https://github.com/tapdev/tapdev-studio.git
cd tapdev-studio

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 启动开发服务器
pnpm dev
```

## 验证安装

运行以下命令验证安装是否成功：

```bash
pnpm --version
node --version
```

确保输出的版本号满足系统要求。