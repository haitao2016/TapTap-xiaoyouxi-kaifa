# Contributing to TapDev Studio

感谢你有兴趣为 TapDev Studio 贡献代码！

## 行为准则

我们期望所有贡献者遵守以下准则：

- 尊重他人，保持友好和专业的态度
- 欢迎提出问题和建议
- 提供清晰、有建设性的反馈
- 尊重项目的代码风格和规范

## 如何贡献

### 报告 Bug

请使用 [Bug Report 模板](.github/ISSUE_TEMPLATE/bug-report.md) 报告问题。

### 提出功能建议

请使用 [Feature Request 模板](.github/ISSUE_TEMPLATE/feature-request.md) 提出新功能建议。

### 提交代码

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/your-feature-name`
3. 提交你的更改：`git commit -m "feat: add your feature"`
4. 推送到远程分支：`git push origin feature/your-feature-name`
5. 创建 Pull Request

## 开发环境

### 前置依赖

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 运行开发服务器

```bash
pnpm dev
```

### 运行测试

```bash
pnpm test
```

### 代码检查

```bash
pnpm lint
pnpm typecheck
```

## 代码规范

### TypeScript

- 使用 TypeScript 严格模式
- 避免使用 `any` 类型
- 为所有公共 API 添加类型定义

### ESLint

项目使用 ESLint 进行代码检查，请确保代码通过：

```bash
pnpm lint
```

### Prettier

项目使用 Prettier 进行代码格式化：

```bash
pnpm format
```

## 提交信息规范

请使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构（既不新增功能，也不是修复 bug）
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(editor): add multi-cursor editing support

fix(build): resolve process leak on cancel

docs: update contributing guide
```

## 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。

## 联系方式

如有任何问题，请通过 GitHub Issues 联系我们。