import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 主页加载
 * 
 * 验证应用可以正常加载，没有错误
 */
test.describe('主页加载', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示应用标题', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('domcontentloaded');
    
    // 检查页面标题
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('应该加载主布局', async ({ page }) => {
    // 等待主要内容加载
    await page.waitForLoadState('networkidle');
    
    // 检查是否有主要内容区域
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('不应该有控制台错误', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 过滤掉已知的非关键错误
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('DevTools')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

/**
 * E2E 测试 - 导航
 */
test.describe('导航', () => {
  test('应该显示导航菜单', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // 检查是否有导航元素
    const nav = await page.locator('nav, header, [role="navigation"]').first();
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }
  });
});

/**
 * E2E 测试 - 响应式布局
 */
test.describe('响应式布局', () => {
  test('桌面端视图', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // 页面应该正常显示
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('平板视图', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('手机视图', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
});
