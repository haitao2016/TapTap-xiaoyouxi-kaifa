/**
 * Git 集成深化服务
 * - 图形化 diff
 * - 冲突解决 UI（3-way merge）
 * - 分支管理
 * - GitHub / Gitee PR/Issue 集成
 */
import { globalEventBus } from '../event-bus';
import { spawn } from 'child_process';
import { generateId as randomUUID } from '../utils/uuid';

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  conflicted: string[];
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string;
  additions: number;
  deletions: number;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: number;
  message: string;
  body?: string;
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: { type: 'add' | 'del' | 'context'; content: string; oldLine?: number; newLine?: number }[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  ahead: number;
  behind: number;
  lastCommitHash: string;
}

export interface MergeConflictRegion {
  filePath: string;
  startLine: number;
  endLine: number;
  ours: string;
  theirs: string;
  base: string;
}

export class GitService {
  private cwd: string | null = null;

  setWorkingDir(path: string): void {
    this.cwd = path;
  }

  async exec(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      if (!this.cwd) return resolve({ stdout: '', stderr: 'No working dir', code: 1 });
      const proc = spawn('git', args, { cwd: this.cwd });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    });
  }

  async status(): Promise<GitStatus | null> {
    const { stdout, code } = await this.exec(['status', '--porcelain=v1', '-b']);
    if (code !== 0) return null;
    return this.parseStatus(stdout);
  }

  async diff(filePath?: string): Promise<GitDiffHunk[]> {
    const args = filePath ? ['diff', '--no-color', filePath] : ['diff', '--no-color'];
    const { stdout, code } = await this.exec(args);
    if (code !== 0) return [];
    return this.parseDiff(stdout);
  }

  async log(max = 50): Promise<GitCommit[]> {
    const format = '%H%n%h%n%an%n%ae%n%at%n%s%n%b%n--END--';
    const { stdout, code } = await this.exec(['log', `--max-count=${max}`, `--format=${format}`]);
    if (code !== 0) return [];
    return this.parseLog(stdout);
  }

  async branches(): Promise<GitBranch[]> {
    const { stdout, code } = await this.exec(['branch', '-vv', '--no-color']);
    if (code !== 0) return [];
    return this.parseBranches(stdout);
  }

  async createBranch(name: string, from?: string): Promise<boolean> {
    const args = from ? ['checkout', '-b', name, from] : ['checkout', '-b', name];
    const { code } = await this.exec(args);
    return code === 0;
  }

  async commit(message: string, files?: string[]): Promise<string | null> {
    if (files && files.length > 0) {
      await this.exec(['add', ...files]);
    } else {
      await this.exec(['add', '-A']);
    }
    const { stdout, code } = await this.exec(['commit', '-m', message]);
    if (code !== 0) return null;
    const m = stdout.match(/\[[\w-]+(?:\s+\w+)*\s+([a-f0-9]+)\]/);
    return m?.[1] ?? null;
  }

  async pull(remote = 'origin', branch?: string): Promise<boolean> {
    const args = branch ? ['pull', remote, branch] : ['pull'];
    const { code } = await this.exec(args);
    return code === 0;
  }

  async push(remote = 'origin', branch?: string): Promise<boolean> {
    const args = branch ? ['push', remote, branch] : ['push'];
    const { code } = await this.exec(args);
    return code === 0;
  }

  /**
   * 解析冲突区域
   */
  async parseConflicts(filePath: string): Promise<MergeConflictRegion[]> {
    const fs = await import('fs/promises');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseConflictMarkers(content, filePath);
    } catch {
      return [];
    }
  }

  /**
   * 解决冲突（选择 ours / theirs / 两者都要）
   */
  async resolveConflict(
    filePath: string,
    regions: MergeConflictRegion[],
    strategy: 'ours' | 'theirs' | 'manual',
    manualContent?: string,
  ): Promise<boolean> {
    const fs = await import('fs/promises');
    let content = await fs.readFile(filePath, 'utf-8');
    for (const region of regions) {
      const block = `<<<<<<< HEAD\n${region.ours}\n=======\n${region.theirs}\n>>>>>>> `;
      const replacement = strategy === 'ours' ? region.ours : strategy === 'theirs' ? region.theirs : (manualContent ?? region.ours);
      content = content.replace(block, replacement);
    }
    await fs.writeFile(filePath, content, 'utf-8');
    await this.exec(['add', filePath]);
    globalEventBus.emit({ type: 'git:conflict-resolved', payload: { filePath, strategy } });
    return true;
  }

  /**
   * 集成 GitHub / Gitee PR
   */
  async createPR(options: {
    platform: 'github' | 'gitee';
    owner: string;
    repo: string;
    head: string;
    base: string;
    title: string;
    body?: string;
    token: string;
  }): Promise<{ url: string; number: number } | null> {
    const baseUrl = options.platform === 'github' ? 'https://api.github.com' : 'https://gitee.com/api/v5';
    const url = `${baseUrl}/repos/${options.owner}/${options.repo}/pulls`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${options.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: options.title,
        head: options.head,
        base: options.base,
        body: options.body,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { html_url: string; number: number };
    return { url: data.html_url, number: data.number };
  }

  private parseStatus(out: string): GitStatus {
    const lines = out.split('\n').filter(Boolean);
    const branchLine = lines.shift() ?? '';
    const branchMatch = branchLine.match(/^##\s+(?:No commits yet on\s+)?(\S+?)(?:\.\.\.(\S+))?(?:\s+\[([^\]]+)\])?/);
    const branch = branchMatch?.[1] ?? 'main';
    const status: GitStatus = {
      branch,
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
    };
    if (branchMatch?.[3]) {
      const m = branchMatch[3].match(/ahead\s+(\d+)/);
      const b = branchMatch[3].match(/behind\s+(\d+)/);
      if (m) status.ahead = parseInt(m[1], 10);
      if (b) status.behind = parseInt(b[1], 10);
    }
    for (const line of lines) {
      const code = line.slice(0, 2);
      const path = line.slice(3);
      if (code === '??') status.untracked.push(path);
      else if (code === 'UU' || code === 'AA' || code === 'DD') status.conflicted.push(path);
      else if (/[A-Z]/.test(code[0] ?? '')) status.staged.push({ path, status: 'modified', additions: 0, deletions: 0 });
      else status.unstaged.push({ path, status: 'modified', additions: 0, deletions: 0 });
    }
    return status;
  }

  private parseDiff(out: string): GitDiffHunk[] {
    const hunks: GitDiffHunk[] = [];
    const blocks = out.split(/^diff --git /m).filter(Boolean);
    for (const block of blocks) {
      const lines = block.split('\n');
      let i = 0;
      while (i < lines.length) {
        const m = lines[i].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (m) {
          const hunk: GitDiffHunk = {
            oldStart: parseInt(m[1], 10),
            oldLines: parseInt(m[2] ?? '1', 10),
            newStart: parseInt(m[3], 10),
            newLines: parseInt(m[4] ?? '1', 10),
            lines: [],
          };
          i++;
          let oldLine = hunk.oldStart;
          let newLine = hunk.newStart;
          while (i < lines.length && !lines[i].startsWith('diff ') && !lines[i].startsWith('@@')) {
            const l = lines[i];
            if (l.startsWith('+')) {
              hunk.lines.push({ type: 'add', content: l.slice(1), newLine: newLine++ });
            } else if (l.startsWith('-')) {
              hunk.lines.push({ type: 'del', content: l.slice(1), oldLine: oldLine++ });
            } else {
              hunk.lines.push({ type: 'context', content: l.slice(1), oldLine: oldLine++, newLine: newLine++ });
            }
            i++;
          }
          hunks.push(hunk);
        } else {
          i++;
        }
      }
    }
    return hunks;
  }

  private parseLog(out: string): GitCommit[] {
    const commits: GitCommit[] = [];
    const blocks = out.split('--END--').map((b) => b.trim()).filter(Boolean);
    for (const b of blocks) {
      const lines = b.split('\n');
      if (lines.length < 6) continue;
      const [hash, shortHash, author, email, date, subject, ...body] = lines;
      commits.push({
        hash,
        shortHash,
        author,
        email,
        date: parseInt(date, 10) * 1000,
        message: subject,
        body: body.join('\n').trim() || undefined,
      });
    }
    return commits;
  }

  private parseBranches(out: string): GitBranch[] {
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const current = line.startsWith('*');
        const clean = line.replace(/^\*?\s+/, '');
        const m = clean.match(/^(\S+)\s+([a-f0-9]+)\s+(?:\[[^\]]+\]\s+)?(.*)$/);
        if (!m) return null;
        return {
          name: m[1],
          current,
          ahead: 0,
          behind: 0,
          lastCommitHash: m[2],
        } as GitBranch;
      })
      .filter((b): b is GitBranch => !!b);
  }

  private parseConflictMarkers(content: string, filePath: string): MergeConflictRegion[] {
    const regions: MergeConflictRegion[] = [];
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const re = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]*\n?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(normalized))) {
      const startLine = normalized.slice(0, m.index).split('\n').length - 1;
      const endLine = startLine + m[0].split('\n').length;
      regions.push({
        filePath,
        startLine,
        endLine,
        ours: (m[1] ?? '').replace(/\n+$/, ''),
        theirs: (m[2] ?? '').replace(/\n+$/, ''),
        base: '',
      });
    }
    return regions;
  }
}

export const gitService = new GitService();
