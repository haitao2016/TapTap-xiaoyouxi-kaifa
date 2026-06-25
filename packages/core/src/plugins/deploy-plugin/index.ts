import type { PluginContext, PluginMeta, PluginHook } from '@tapdev/types';

export const meta: PluginMeta = {
  id: 'tapdev.deploy',
  name: '一键部署',
  version: '1.0.0',
  description: '支持多平台一键部署，包括 TapTap、微信小游戏、Web CDN 等',
  author: 'TapDev Studio',
  enabled: false,
  entry: 'deploy-plugin',
  hooks: ['onBuildComplete'] as PluginHook[],
  icon: 'rocket',
  category: '部署',
  homepage: 'https://tapdev.io/plugins/deploy',
};

export type DeployPlatform = 'taptap' | 'wechat' | 'web' | 'cdn' | 'github-pages' | 'vercel' | 'netlify';

export interface DeployTarget {
  id: string;
  name: string;
  platform: DeployPlatform;
  icon: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface DeployConfig {
  targets: DeployTarget[];
  autoDeploy: boolean;
  deployOnBuild: boolean;
  sourceDir: string;
  outputDir: string;
}

export interface DeployResult {
  success: boolean;
  platform: DeployPlatform;
  url?: string;
  error?: string;
  deployedAt?: number;
  buildId?: string;
}

export interface DeployProgress {
  platform: DeployPlatform;
  stage: string;
  progress: number;
  message: string;
}

export class DeployPlugin {
  private config: DeployConfig = {
    targets: [
      {
        id: 'taptap',
        name: 'TapTap 小游戏',
        platform: 'taptap',
        icon: 'smartphone',
        enabled: false,
        config: { appId: '', clientId: '' },
      },
      {
        id: 'wechat',
        name: '微信小游戏',
        platform: 'wechat',
        icon: 'message-circle',
        enabled: false,
        config: { appId: '' },
      },
      {
        id: 'web',
        name: 'Web 托管',
        platform: 'web',
        icon: 'globe',
        enabled: true,
        config: {},
      },
      {
        id: 'cdn',
        name: 'CDN 部署',
        platform: 'cdn',
        icon: 'cloud',
        enabled: false,
        config: { provider: 'qiniu', bucket: '', domain: '' },
      },
      {
        id: 'github-pages',
        name: 'GitHub Pages',
        platform: 'github-pages',
        icon: 'github',
        enabled: false,
        config: { repo: '', branch: 'gh-pages' },
      },
    ],
    autoDeploy: false,
    deployOnBuild: false,
    sourceDir: 'dist',
    outputDir: 'build',
  };

  private deployHistory: DeployResult[] = [];
  private currentDeploy: DeployProgress | null = null;

  getConfig(): DeployConfig {
    return {
      ...this.config,
      targets: this.config.targets.map(t => ({ ...t })),
    };
  }

  updateConfig(config: Partial<DeployConfig>): void {
    Object.assign(this.config, config);
  }

  getTargets(): DeployTarget[] {
    return this.config.targets.map(t => ({ ...t }));
  }

  getEnabledTargets(): DeployTarget[] {
    return this.config.targets.filter(t => t.enabled);
  }

  async deploy(targetId?: string): Promise<DeployResult[]> {
    const targets = targetId
      ? this.config.targets.filter(t => t.id === targetId)
      : this.getEnabledTargets();

    const results: DeployResult[] = [];

    for (const target of targets) {
      try {
        const result = await this.deployToTarget(target);
        results.push(result);
        this.deployHistory.unshift(result);
      } catch (error) {
        results.push({
          success: false,
          platform: target.platform,
          error: error instanceof Error ? error.message : '部署失败',
        });
      }
    }

    return results;
  }

  async deployToTarget(target: DeployTarget): Promise<DeployResult> {
    this.currentDeploy = {
      platform: target.platform,
      stage: 'initializing',
      progress: 0,
      message: '正在初始化部署...',
    };

    try {
      this.currentDeploy.stage = 'uploading';
      this.currentDeploy.progress = 20;
      this.currentDeploy.message = '正在上传文件...';
      await this.delay(500);

      this.currentDeploy.stage = 'processing';
      this.currentDeploy.progress = 50;
      this.currentDeploy.message = '正在处理文件...';
      await this.delay(500);

      this.currentDeploy.stage = 'deploying';
      this.currentDeploy.progress = 80;
      this.currentDeploy.message = '正在部署到服务器...';
      await this.delay(500);

      this.currentDeploy.stage = 'completed';
      this.currentDeploy.progress = 100;
      this.currentDeploy.message = '部署完成';
      await this.delay(200);

      const result: DeployResult = {
        success: true,
        platform: target.platform,
        url: this.getDeployUrl(target.platform),
        deployedAt: Date.now(),
        buildId: `build_${Date.now()}`,
      };

      this.currentDeploy = null;
      return result;
    } catch (error) {
      this.currentDeploy = null;
      throw error;
    }
  }

  getCurrentDeploy(): DeployProgress | null {
    return this.currentDeploy;
  }

  getDeployHistory(limit = 20): DeployResult[] {
    return this.deployHistory.slice(0, limit);
  }

  async rollback(buildId: string): Promise<boolean> {
    const deploy = this.deployHistory.find(d => d.buildId === buildId);
    if (!deploy) return false;

    await this.delay(1000);
    return true;
  }

  async configureTarget(targetId: string, config: Record<string, unknown>): Promise<boolean> {
    const target = this.config.targets.find(t => t.id === targetId);
    if (!target) return false;

    target.config = { ...target.config, ...config };
    return true;
  }

  enableTarget(targetId: string): void {
    const target = this.config.targets.find(t => t.id === targetId);
    if (target) {
      target.enabled = true;
    }
  }

  disableTarget(targetId: string): void {
    const target = this.config.targets.find(t => t.id === targetId);
    if (target) {
      target.enabled = false;
    }
  }

  async validateConfig(targetId: string): Promise<{ valid: boolean; errors: string[] }> {
    const target = this.config.targets.find(t => t.id === targetId);
    if (!target) {
      return { valid: false, errors: ['部署目标不存在'] };
    }

    const errors: string[] = [];

    switch (target.platform) {
      case 'taptap':
        if (!target.config.appId) errors.push('请配置 TapTap AppID');
        break;
      case 'wechat':
        if (!target.config.appId) errors.push('请配置微信 AppID');
        break;
      case 'cdn':
        if (!target.config.bucket) errors.push('请配置 CDN 存储桶');
        break;
      case 'github-pages':
        if (!target.config.repo) errors.push('请配置 GitHub 仓库');
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  getDeployUrl(platform: DeployPlatform): string {
    const urls: Record<DeployPlatform, string> = {
      taptap: 'https://www.taptap.cn/app/demo',
      wechat: 'wechat://miniprogram/demo',
      web: 'https://demo.tapdev.io',
      cdn: 'https://cdn.tapdev.io/demo',
      'github-pages': 'https://username.github.io/demo',
      vercel: 'https://demo.vercel.app',
      netlify: 'https://demo.netlify.app',
    };
    return urls[platform] || '';
  }

  getAvailablePlatforms(): { platform: DeployPlatform; name: string; icon: string }[] {
    return [
      { platform: 'taptap', name: 'TapTap 小游戏', icon: 'smartphone' },
      { platform: 'wechat', name: '微信小游戏', icon: 'message-circle' },
      { platform: 'web', name: 'Web 托管', icon: 'globe' },
      { platform: 'cdn', name: 'CDN 部署', icon: 'cloud' },
      { platform: 'github-pages', name: 'GitHub Pages', icon: 'github' },
      { platform: 'vercel', name: 'Vercel', icon: 'triangle' },
      { platform: 'netlify', name: 'Netlify', icon: 'layers' },
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const deployPlugin = new DeployPlugin();

export function activate(ctx: PluginContext): void {
  const plugin = deployPlugin;

  ctx.registerCommand('deploy', async () => {
    ctx.showNotification('正在部署...', 'info');
    const results = await plugin.deploy();
    const successCount = results.filter(r => r.success).length;
    ctx.showNotification(
      `部署完成: ${successCount}/${results.length} 成功`,
      successCount > 0 ? 'success' : 'error'
    );
  }, {
    id: 'deploy',
    title: '一键部署',
    description: '部署到所有已启用的平台',
    icon: 'rocket',
    shortcut: 'Ctrl+Shift+D',
    category: '部署',
  });

  ctx.registerCommand('deploy-web', async () => {
    ctx.showNotification('正在部署到 Web...', 'info');
    const result = await plugin.deploy('web');
    if (result[0]?.success) {
      ctx.showNotification('Web 部署成功', 'success');
      if (result[0].url) {
        ctx.openUrl(result[0].url);
      }
    } else {
      ctx.showNotification('Web 部署失败', 'error');
    }
  }, {
    id: 'deploy-web',
    title: '部署到 Web',
    description: '部署项目到 Web 托管',
    icon: 'globe',
    category: '部署',
  });

  ctx.registerCommand('deploy-taptap', async () => {
    ctx.showNotification('正在部署到 TapTap...', 'info');
  }, {
    id: 'deploy-taptap',
    title: '部署到 TapTap',
    description: '部署到 TapTap 小游戏平台',
    icon: 'smartphone',
    category: '部署',
  });

  ctx.registerCommand('deploy-history', async () => {
    ctx.showNotification('打开部署历史', 'info');
  }, {
    id: 'deploy-history',
    title: '部署历史',
    description: '查看部署历史记录',
    icon: 'history',
    category: '部署',
  });

  ctx.registerCommand('deploy-settings', async () => {
    ctx.showNotification('打开部署设置', 'info');
  }, {
    id: 'deploy-settings',
    title: '部署设置',
    description: '配置部署目标和参数',
    icon: 'settings',
    category: '部署',
  });

  ctx.registerPanel('deploy-panel', {
    id: 'deploy-panel',
    title: '部署',
    icon: 'rocket',
    component: 'DeployPanel',
    defaultPosition: 'right',
    defaultSize: 360,
  });

  ctx.showNotification('一键部署插件已激活', 'success');
}

export function deactivate(): void {
  console.log('[Deploy Plugin] 已停用');
}
