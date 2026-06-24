/**
 * 示例插件 - 展示如何扩展 TapDev Studio
 * 将此目录复制到 plugins/ 并在插件管理中启用
 */
import type { PluginContext } from '@tapdev/types';

export function activate(ctx: PluginContext): void {
  ctx.registerCommand('hello-taptap', async () => {
    console.log('[Hello TapTap Plugin] 插件已激活!');
  });

  ctx.registerPanel('hello-panel', {
    id: 'hello-panel',
    title: 'Hello TapTap',
    icon: 'plugin',
    component: 'HelloTapTapPanel',
    defaultPosition: 'right',
  });
}

export function deactivate(): void {
  console.log('[Hello TapTap Plugin] 插件已停用');
}

export const meta = {
  id: 'example.hello-taptap',
  name: 'Hello TapTap',
  version: '1.0.0',
  description: '示例插件，展示插件开发方式',
  hooks: ['onProjectOpen'] as const,
};
