import type { PluginContext, PluginMeta, PluginHook } from '@tapdev/types';
import {
  gitService,
  type GitStatus,
  type GitCommit,
  type GitBranch,
  type GitDiff,
} from '../../collab/git-service';

export const meta: PluginMeta = {
  id: 'tapdev.git',
  name: 'Git 集成',
  version: '1.0.0',
  description: '完整的 Git 版本控制集成，支持提交、分支管理、冲突解决',
  author: 'TapDev Studio',
  enabled: false,
  entry: 'git-plugin',
  hooks: ['onProjectOpen', 'onProjectClose'] as PluginHook[],
  icon: 'git-branch',
  category: '版本控制',
  homepage: 'https://tapdev.io/plugins/git',
  repository: 'https://github.com/tapdev/git-plugin',
};

export interface GitPluginConfig {
  autoFetch: boolean;
  fetchInterval: number;
  showUntracked: boolean;
  autoPullOnOpen: boolean;
  commitTemplate: string;
}

export class GitPlugin {
  private config: GitPluginConfig = {
    autoFetch: true,
    fetchInterval: 300000,
    showUntracked: true,
    autoPullOnOpen: false,
    commitTemplate: '',
  };

  private fetchTimer: ReturnType<typeof setInterval> | null = null;

  getConfig(): GitPluginConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<GitPluginConfig>): void {
    Object.assign(this.config, config);

    if (config.autoFetch !== undefined) {
      if (config.autoFetch) {
        this.startAutoFetch();
      } else {
        this.stopAutoFetch();
      }
    }
  }

  setWorkingDir(path: string): void {
    gitService.setWorkingDir(path);
  }

  async getStatus(): Promise<GitStatus | null> {
    return gitService.status();
  }

  async getDiff(filePath?: string): Promise<GitDiff[]> {
    return gitService.diff(filePath);
  }

  async getLog(max = 50): Promise<GitCommit[]> {
    return gitService.log(max);
  }

  async getBranches(): Promise<GitBranch[]> {
    return gitService.branches();
  }

  async createBranch(name: string, from?: string): Promise<boolean> {
    return gitService.createBranch(name, from);
  }

  async commit(message: string, files?: string[]): Promise<string | null> {
    return gitService.commit(message, files);
  }

  async pull(remote = 'origin', branch?: string): Promise<boolean> {
    const result = await gitService.pull(remote, branch);
    return result.success;
  }

  async push(remote = 'origin', branch?: string): Promise<boolean> {
    return gitService.push(remote, branch);
  }

  async stageFile(filePath: string): Promise<boolean> {
    const result = await gitService.exec(['add', filePath]);
    return result.code === 0;
  }

  async unstageFile(filePath: string): Promise<boolean> {
    const result = await gitService.exec(['reset', 'HEAD', '--', filePath]);
    return result.code === 0;
  }

  async discardChanges(filePath: string): Promise<boolean> {
    const result = await gitService.exec(['checkout', '--', filePath]);
    return result.code === 0;
  }

  async initRepository(): Promise<boolean> {
    const result = await gitService.exec(['init']);
    return result.code === 0;
  }

  async cloneRepository(url: string, targetPath?: string): Promise<boolean> {
    const args = targetPath ? ['clone', url, targetPath] : ['clone', url];
    const result = await gitService.exec(args);
    return result.code === 0;
  }

  async getRemotes(): Promise<{ name: string; url: string }[]> {
    const { stdout, code } = await gitService.exec(['remote', '-v']);
    if (code !== 0) return [];

    const remotes = new Map<string, string>();
    stdout.split('\n').forEach((line) => {
      const match = line.match(/^(\S+)\s+(\S+)\s+\(fetch\)/);
      if (match) {
        remotes.set(match[1], match[2]);
      }
    });

    return Array.from(remotes.entries()).map(([name, url]) => ({ name, url }));
  }

  async checkout(branch: string): Promise<boolean> {
    const result = await gitService.exec(['checkout', branch]);
    return result.code === 0;
  }

  async merge(branch: string): Promise<{ success: boolean; conflicts: string[] }> {
    const result = await gitService.exec(['merge', branch, '--no-commit']);
    const status = await this.getStatus();
    return {
      success: result.code === 0,
      conflicts: status?.conflicted || [],
    };
  }

  async stash(message?: string): Promise<boolean> {
    const args = message ? ['stash', 'push', '-m', message] : ['stash', 'push'];
    const result = await gitService.exec(args);
    return result.code === 0;
  }

  async stashList(): Promise<{ id: string; message: string }[]> {
    const { stdout, code } = await gitService.exec(['stash', 'list']);
    if (code !== 0) return [];

    return stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^stash@\{(\d+)\}:\s*(.+)$/);
        return {
          id: match?.[1] || '0',
          message: match?.[2] || line,
        };
      });
  }

  async stashApply(index = 0): Promise<boolean> {
    const result = await gitService.exec(['stash', 'apply', `stash@{${index}}`]);
    return result.code === 0;
  }

  async stashPop(index = 0): Promise<boolean> {
    const result = await gitService.exec(['stash', 'pop', `stash@{${index}}`]);
    return result.code === 0;
  }

  private startAutoFetch(): void {
    if (this.fetchTimer) return;
    this.fetchTimer = setInterval(() => {
      gitService.exec(['fetch', '--all']).catch(() => {});
    }, this.config.fetchInterval);
  }

  private stopAutoFetch(): void {
    if (this.fetchTimer) {
      clearInterval(this.fetchTimer);
      this.fetchTimer = null;
    }
  }
}

export const gitPlugin = new GitPlugin();

export function activate(ctx: PluginContext): void {
  const plugin = gitPlugin;

  ctx.registerCommand(
    'git-commit',
    async () => {
      ctx.showNotification('正在提交...', 'info');
    },
    {
      id: 'git-commit',
      title: '提交更改',
      description: '提交当前的更改到仓库',
      icon: 'git-commit',
      shortcut: 'Ctrl+Shift+C',
      category: 'Git',
    }
  );

  ctx.registerCommand(
    'git-push',
    async () => {
      const result = await plugin.push();
      ctx.showNotification(result ? '推送成功' : '推送失败', result ? 'success' : 'error');
    },
    {
      id: 'git-push',
      title: '推送更改',
      description: '将本地提交推送到远程仓库',
      icon: 'upload-cloud',
      shortcut: 'Ctrl+Shift+P',
      category: 'Git',
    }
  );

  ctx.registerCommand(
    'git-pull',
    async () => {
      const result = await plugin.pull();
      ctx.showNotification(result ? '拉取成功' : '拉取失败', result ? 'success' : 'error');
    },
    {
      id: 'git-pull',
      title: '拉取更改',
      description: '从远程仓库拉取最新更改',
      icon: 'download-cloud',
      shortcut: 'Ctrl+Shift+U',
      category: 'Git',
    }
  );

  ctx.registerCommand(
    'git-status',
    async () => {
      const status = await plugin.getStatus();
      if (status) {
        ctx.showNotification(`分支: ${status.branch}`, 'info');
      }
    },
    {
      id: 'git-status',
      title: '查看状态',
      description: '查看当前 Git 仓库状态',
      icon: 'git-branch',
      category: 'Git',
    }
  );

  ctx.registerCommand(
    'git-branches',
    async () => {
      ctx.showNotification('打开分支管理器', 'info');
    },
    {
      id: 'git-branches',
      title: '分支管理',
      description: '管理 Git 分支',
      icon: 'git-branch',
      category: 'Git',
    }
  );

  ctx.registerCommand(
    'git-log',
    async () => {
      ctx.showNotification('打开提交历史', 'info');
    },
    {
      id: 'git-log',
      title: '提交历史',
      description: '查看提交历史记录',
      icon: 'history',
      category: 'Git',
    }
  );

  ctx.registerPanel('git-panel', {
    id: 'git-panel',
    title: 'Git 版本控制',
    icon: 'git-branch',
    component: 'GitPanel',
    defaultPosition: 'left',
    defaultSize: 350,
  });

  ctx.showNotification('Git 集成插件已激活', 'success');
}

export function deactivate(): void {
  console.log('[Git Plugin] 已停用');
}
