# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-28

### 🎉 首个正式版本发布

#### ✨ 新增功能
- 完整的 TapTap 小游戏开发 IDE，基于 Electron + React 构建
- 跨平台支持：Windows (x64)、macOS、Linux
- 代码编辑器（Monaco Editor）集成，支持语法高亮
- 实时游戏预览面板
- Unity 项目构建服务
- 调试服务器，支持游戏实时调试
- 事件总线系统，用于模块间通信
- 插件系统，支持沙箱隔离
- 深色/浅色主题切换
- 多设备响应式布局（PC、手机、平板）
- 自动更新功能（electron-updater）
- AI 辅助开发（raindrop-ai 集成）

#### 🔧 CI/CD 改进
- 修复 Windows 构建产物 artifactName 空格问题
- Windows 新增 NSIS 安装包（.exe）目标
- 修复根目录及 desktop package.json JSON 语法错误
- 升版 v0.2.0 → v1.0.0

#### 📦 发布产物
- `TapDev-Studio-1.0.0-win-x64.exe` — Windows 安装包
- `TapDev-Studio-1.0.0-win-x64.zip` — Windows 便携版
- `TapDev-Studio-1.0.0-mac.dmg` — macOS 安装包
- `TapDev-Studio-1.0.0-linux.AppImage` — Linux 可执行包
- `TapDev-Studio-1.0.0-linux.deb` — Linux Debian 包

## [Unreleased]

### Features

- Initial project setup with monorepo structure
- Core build service for Unity project building
- Debug server for game debugging
- Event bus system for inter-module communication
- Plugin system with sandbox support
- Theme system with dark/light mode support
- Responsive layout for multi-device support

### Bug Fixes

- Fixed build cancellation logic to only cancel target tasks
- Fixed process leak when cancelling Unity builds
- Fixed crypto module import issues
- Fixed build completion handling for cancelled tasks

### Documentation

- Added CONTRIBUTING.md for contributor guidelines
- Added GitHub issue templates for bug reports and feature requests
