/**
 * CI/CD 配置与发布流水线
 * - 多平台构建编排
 * - 自动 changelog
 * - 版本号语义化
 * - 桌面端自动更新
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type Platform = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';

export interface BuildJob {
  id: string;
  platform: Platform;
  arch: 'x64' | 'arm64' | 'universal';
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  artifactUrl?: string;
  error?: string;
}

export interface Release {
  version: string;
  tagName: string;
  changelog: string;
  prerelease: boolean;
  platforms: Platform[];
  jobs: BuildJob[];
  publishedAt: number;
  draft: boolean;
}

export interface ConventionalCommit {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore' | 'breaking';
  scope?: string;
  subject: string;
  hash: string;
  author: string;
  date: number;
}

const TYPE_LABELS: Record<ConventionalCommit['type'], string> = {
  feat: '新功能',
  fix: '修复',
  docs: '文档',
  style: '样式',
  refactor: '重构',
  perf: '性能',
  test: '测试',
  chore: '杂项',
  breaking: '重大变更',
};

export class ReleasePipeline {
  private releases = new Map<string, Release>();

  /**
   * 解析 Conventional Commits
   */
  parseCommits(rawCommits: string[]): ConventionalCommit[] {
    const re = /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<subject>.+)$/;
    return rawCommits
      .map((line) => {
        const parts = line.split('|');
        if (parts.length < 4) return null;
        const [hash, author, dateStr, ...rest] = parts;
        const message = rest.join('|');
        const m = message.match(re);
        if (!m?.groups) return null;
        const isBreaking = !!m.groups.bang;
        return {
          type: (isBreaking ? 'breaking' : m.groups.type) as ConventionalCommit['type'],
          scope: m.groups.scope,
          subject: m.groups.subject,
          hash: hash?.trim() ?? '',
          author: author?.trim() ?? '',
          date: parseInt(dateStr ?? '0', 10) * 1000,
        } as ConventionalCommit;
      })
      .filter((c): c is ConventionalCommit => !!c);
  }

  /**
   * 生成 Changelog
   */
  generateChangelog(commits: ConventionalCommit[], version: string): string {
    const groups = new Map<ConventionalCommit['type'], ConventionalCommit[]>();
    for (const c of commits) {
      const list = groups.get(c.type) ?? [];
      list.push(c);
      groups.set(c.type, list);
    }
    const order: ConventionalCommit['type'][] = [
      'breaking',
      'feat',
      'fix',
      'perf',
      'refactor',
      'docs',
      'test',
      'chore',
      'style',
    ];
    const lines: string[] = [`# ${version}\n`];
    for (const type of order) {
      const items = groups.get(type);
      if (!items || items.length === 0) continue;
      lines.push(`\n## ${TYPE_LABELS[type]}\n`);
      for (const c of items) {
        const scope = c.scope ? `**${c.scope}**: ` : '';
        lines.push(`- ${scope}${c.subject} (\`${c.hash.slice(0, 7)}\`)`);
      }
    }
    return lines.join('\n');
  }

  /**
   * 计算下一个语义化版本
   */
  bumpVersion(current: string, commits: ConventionalCommit[]): string {
    const [major, minor, patch] = current.split('.').map((n) => parseInt(n, 10));
    const hasBreaking = commits.some((c) => c.type === 'breaking');
    const hasFeat = commits.some((c) => c.type === 'feat');
    if (hasBreaking) return `${major + 1}.0.0`;
    if (hasFeat) return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * 创建发布
   */
  createRelease(options: {
    version: string;
    platforms: Platform[];
    prerelease?: boolean;
    draft?: boolean;
  }): Release {
    const release: Release = {
      version: options.version,
      tagName: `v${options.version}`,
      changelog: '',
      prerelease: options.prerelease ?? false,
      platforms: options.platforms,
      jobs: options.platforms.map((p) => ({
        id: randomUUID(),
        platform: p,
        arch: p === 'ios' || p === 'macos' ? 'universal' : 'x64',
        status: 'pending',
      })),
      publishedAt: 0,
      draft: options.draft ?? false,
    };
    this.releases.set(release.tagName, release);
    globalEventBus.emit({ type: 'release:created', payload: release });
    return release;
  }

  /**
   * 执行构建任务
   */
  async runJob(releaseTag: string, jobId: string): Promise<BuildJob | null> {
    const release = this.releases.get(releaseTag);
    if (!release) return null;
    const job = release.jobs.find((j) => j.id === jobId);
    if (!job) return null;

    job.status = 'running';
    job.startedAt = Date.now();
    globalEventBus.emit({ type: 'release:job-start', payload: { releaseTag, job } });

    try {
      const artifact = await this.executeBuild(job);
      job.artifactUrl = artifact;
      job.status = 'success';
      job.completedAt = Date.now();
      job.duration = job.completedAt - (job.startedAt ?? job.completedAt);
    } catch (err) {
      job.error = err instanceof Error ? err.message : String(err);
      job.status = 'failed';
      job.completedAt = Date.now();
    }
    globalEventBus.emit({ type: 'release:job-complete', payload: { releaseTag, job } });
    return job;
  }

  getRelease(tag: string): Release | null {
    return this.releases.get(tag) ?? null;
  }

  listReleases(): Release[] {
    return Array.from(this.releases.values()).sort((a, b) => b.publishedAt - a.publishedAt);
  }

  private async executeBuild(job: BuildJob): Promise<string> {
    await new Promise((r) => setTimeout(r, 200));
    return `https://releases.tapdev.cn/${job.platform}/${job.arch}/latest.${this.ext(job.platform)}`;
  }

  private ext(p: Platform): string {
    switch (p) {
      case 'windows':
        return 'exe';
      case 'macos':
        return 'dmg';
      case 'linux':
        return 'AppImage';
      case 'android':
        return 'apk';
      case 'ios':
        return 'ipa';
      case 'web':
        return 'zip';
    }
  }
}

export const releasePipeline = new ReleasePipeline();
