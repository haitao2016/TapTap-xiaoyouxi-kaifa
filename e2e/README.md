# E2E 测试

本目录包含 TapDev Studio 的端到端 (End-to-End) 测试。

## 技术栈

- **Playwright** - 现代 Web 测试框架
- **TypeScript** - 类型安全的测试编写

## 目录结构

```
e2e/
├── home.spec.ts        # 首页和基础功能测试
├── functions.spec.ts   # 编辑器、调试、监控功能测试
└── README.md           # 本文件
```

## 测试用例

### home.spec.ts
- 主页加载测试
- 导航测试
- 响应式布局测试

### functions.spec.ts
- 编辑器功能测试
- 调试功能测试
- 监控功能测试

## 运行测试

### 前置条件

1. 安装依赖：
```bash
npm install
# 或
pnpm install
```

2. 安装 Playwright 浏览器：
```bash
npx playwright install
```

### 运行所有测试

```bash
npm run test:e2e
```

### 运行特定浏览器测试

```bash
# 仅 Chrome
npm run test:e2e -- --project=chromium

# 仅 Firefox
npm run test:e2e -- --project=firefox

# 仅移动端
npm run test:e2e -- --project="Mobile Chrome"
```

### 以 UI 模式运行

```bash
npm run test:e2e:ui
```

### 运行特定测试文件

```bash
npx playwright test e2e/home.spec.ts
```

### 生成测试报告

```bash
npm run test:e2e:report
```

## 测试配置

主要配置在 `playwright.config.ts` 文件中：

- **测试目录**: `./e2e`
- **并行度**: 完全并行
- **浏览器**: Chromium, Firefox, WebKit + 移动端
- **重试次数**: CI 环境 2 次，本地 0 次
- **Web 服务器**: 自动启动开发服务器

## 编写新测试

创建新的测试文件：

```typescript
import { test, expect } from '@playwright/test';

test.describe('功能描述', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前执行
    await page.goto('/');
  });

  test('测试用例描述', async ({ page }) => {
    // 测试代码
    await page.click('button');
    await expect(page.locator('.result')).toContainText('Success');
  });
});
```

## 最佳实践

1. **使用 `test.skip()` 处理条件测试** - 不要使用 `it.skip()`
2. **使用 `page.waitForLoadState('networkidle')`** - 确保页面完全加载
3. **使用数据测试属性** - 如 `data-testid` 而非 CSS 选择器
4. **避免硬编码超时** - 使用 Playwright 的自动等待机制
5. **清理测试数据** - 每个测试应该是独立的

## 调试

### 使用 Playwright VS Code 扩展

安装 Playwright 扩展后，可以：
- 点击测试行号设置断点
- 使用调试器运行测试
- 查看测试执行步骤

### 使用 trace viewer

```bash
npx playwright show-trace trace.zip
```

## CI/CD 集成

Playwright 会自动：
- 禁用 `test.only`
- 在 CI 环境启用重试
- 生成 HTML 测试报告
- 捕获失败截图
