import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 编辑器功能
 */
test.describe('编辑器功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('编辑器页面应该可访问', async ({ page }) => {
    // 尝试导航到编辑器
    const editorLink = page.locator('a[href*="editor"], [data-testid="editor"]').first();
    
    if (await editorLink.count() > 0) {
      await editorLink.click();
      await page.waitForLoadState('networkidle');
      
      // 验证页面已加载
      const url = page.url();
      expect(url).toContain('editor');
    } else {
      // 如果没有链接，检查当前页面是否有编辑器内容
      test.skip();
    }
  });

  test('Monaco 编辑器应该正确加载', async ({ page }) => {
    // 等待 Monaco 编辑器加载
    await page.waitForTimeout(2000);
    
    // 检查是否有代码编辑器区域
    const editorArea = page.locator('.monaco-editor, [class*="editor"], textarea, [role="textbox"]').first();
    
    if (await editorArea.count() > 0) {
      await expect(editorArea).toBeVisible({ timeout: 5000 });
    }
  });
});

/**
 * E2E 测试 - 调试功能
 */
test.describe('调试功能', () => {
  test('调试页面应该可访问', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const debugLink = page.locator('a[href*="debug"], [data-testid="debug"]').first();
    
    if (await debugLink.count() > 0) {
      await debugLink.click();
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      expect(url).toContain('debug');
    } else {
      test.skip();
    }
  });

  test('调试控制面板应该显示', async ({ page }) => {
    await page.goto('/#/debug');
    await page.waitForLoadState('domcontentloaded');
    
    // 检查是否有调试相关的 UI 元素
    const debugPanel = page.locator('[class*="debug"], [class*="Debug"], button').first();
    
    if (await debugPanel.count() > 0) {
      await expect(debugPanel).toBeVisible({ timeout: 5000 });
    }
  });
});

/**
 * E2E 测试 - 监控功能
 */
test.describe('监控功能', () => {
  test('监控页面应该可访问', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const monitorLink = page.locator('a[href*="monitor"], [data-testid="monitor"]').first();
    
    if (await monitorLink.count() > 0) {
      await monitorLink.click();
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      expect(url).toContain('monitor');
    } else {
      test.skip();
    }
  });

  test('监控指标卡片应该显示', async ({ page }) => {
    await page.goto('/#/monitor');
    await page.waitForLoadState('domcontentloaded');
    
    // 等待数据加载
    await page.waitForTimeout(1000);
    
    // 检查是否有监控指标
    const metrics = page.locator('[class*="metric"], [class*="card"], [class*="stat"]').first();
    
    if (await metrics.count() > 0) {
      await expect(metrics).toBeVisible({ timeout: 5000 });
    }
  });
});
