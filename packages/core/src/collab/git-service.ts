/**
 * Git 集成深化服务
 * - 图形化 diff
 * - 冲突解决 UI（3-way merge）
 * - 分支管理
 * - GitHub / Gitee PR/Issue 集成
 * - Stash、fetch、checkout、reset 等高级操作
 */
import { globalEventBus } from '../event-bus';
import { spawn } from 'child_process';
import { randomUUID } from 'node:crypto';
import * as fsPromises from 'fs/promises';
import fs from 'node:fs';
import { randomUUID } from '../utils/crypto-utils';

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  conflicted: string[];
  isGitRepo: boolean;
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
  parents?: string[];
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: { type: 'add' | 'del' | 'context'; content: string; oldLine?: number; newLine?: number }[];
}

export interface GitDiff {
  filePath: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: GitDiffHunk[];
  additions: number;
  deletions: number;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  ahead: number;
  behind: number;
  lastCommitHash: string;
  lastCommitMessage?: string;
  lastCommitAuthor?: string;
  lastCommitDate?: number;
}

export interface GitRemote {
  name: string;
  url: string;
  fetchUrl?: string;
  pushUrl?: string;
}

export interface GitStashEntry {
  index: number;
  name: string;
  message: string;
  date: number;
  branch: string;
}

export interface MergeConflictRegion {
  filePath: string;
  startLine: number;
  endLine: number;
  ours: string;
  theirs: string;
  base: string;
}

export interface GitTag {
  name: string;
  hash: string;
  date?: number;
  message?: string;
}

export class GitService {
  private cwd: string | null = null;

  setWorkingDir(path: string): void {
    this.cwd = path;
  }

  getWorkingDir(): string | null {
    return this.cwd;
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

  async isGitRepo(): Promise<boolean> {
    const { code } = await this.exec(['rev-parse', '--is-inside-work-tree']);
    return code === 0;
  }

  async init(): Promise<boolean> {
    const { code } = await this.exec(['init']);
    if (code === 0) {
      globalEventBus.emit({ type: 'git:initialized', payload: { cwd: this.cwd } });
    }
    return code === 0;
  }

  async status(): Promise<GitStatus | null> {
    const { stdout, code } = await this.exec(['status', '--porcelain=v2', '-b']);
    if (code !== 0) return null;
    return this.parseStatus(stdout);
  }

  async diff(filePath?: string, staged = false): Promise<GitDiff[]> {
    const args = ['diff', '--no-color', '--unified=3'];
    if (staged) args.push('--cached');
    if (filePath) args.push(filePath);
    const { stdout, code } = await this.exec(args);
    if (code !== 0) return [];
    return this.parseDiffOutput(stdout);
  }

  async diffStaged(filePath?: string): Promise<GitDiff[]> {
    return this.diff(filePath, true);
  }

  async diffCommits(fromHash: string, toHash: string, filePath?: string): Promise<GitDiff[]> {
    const args = ['diff', '--no-color', '--unified=3', `${fromHash}..${toHash}`];
    if (filePath) args.push(filePath);
    const { stdout, code } = await this.exec(args);
    if (code !== 0) return [];
    return this.parseDiffOutput(stdout);
  }

  async log(
    max = 50,
    options?: { since?: number; author?: string; branch?: string }
  ): Promise<GitCommit[]> {
    const format = '%H%n%h%n%an%n%ae%n%at%n%s%n%b%n%P%n--END--';
    const args = ['log', `--max-count=${max}`, `--format=${format}`];
    if (options?.since) {
      args.push(`--since=${new Date(options.since).toISOString()}`);
    }
    if (options?.author) {
      args.push(`--author=${options.author}`);
    }
    if (options?.branch) {
      args.push(options.branch);
    }
    const { stdout, code } = await this.exec(args);
    if (code !== 0) return [];
    return this.parseLog(stdout);
  }

  async showCommit(hash: string): Promise<GitCommit | null> {
    const format = '%H%n%h%n%an%n%ae%n%at%n%s%n%b%n%P%n--END--';
    const { stdout, code } = await this.exec(['show', `--format=${format}`, '--no-patch', hash]);
    if (code !== 0) return null;
    const commits = this.parseLog(stdout);
    return commits[0] ?? null;
  }

  async branches(all = false): Promise<GitBranch[]> {
    const args = ['branch', '-vv', '--no-color'];
    if (all) args.push('-a');
    const { stdout, code } = await this.exec(args);
    if (code !== 0) return [];
    return this.parseBranches(stdout);
  }

  async remoteBranches(remote = 'origin'): Promise<string[]> {
    const { stdout, code } = await this.exec(['branch', '-r', '--no-color']);
    if (code !== 0) return [];
    return stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && l.startsWith(remote + '/'))
      .map((l) => l.replace(/^remotes\//, ''));
  }

  async currentBranch(): Promise<string | null> {
    const { stdout, code } = await this.exec(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (code !== 0) return null;
    return stdout.trim() || null;
  }

  async createBranch(name: string, from?: string): Promise<boolean> {
    const args = from ? ['checkout', '-b', name, from] : ['checkout', '-b', name];
    const { code } = await this.exec(args);
    if (code === 0) {
      globalEventBus.emit({ type: 'git:branch-created', payload: { name, from } });
    }
    return code === 0;
  }

  async deleteBranch(name: string, force = false): Promise<boolean> {
    const args = force ? ['branch', '-D', name] : ['branch', '-d', name];
    const { code } = await this.exec(args);
    if (code === 0) {
      globalEventBus.emit({ type: 'git:branch-deleted', payload: { name } });
    }
    return code === 0;
  }

  async checkoutBranch(name: string): Promise<boolean> {
    const { code } = await this.exec(['checkout', name]);
    if (code === 0) {
      globalEventBus.emit({ type: 'git:checkout', payload: { branch: name } });
    }
    return code === 0;
  }

  async renameBranch(oldName: string, newName: string): Promise<boolean> {
    const { code } = await this.exec(['branch', '-m', oldName, newName]);
    return code === 0;
  }

  async add(files: string[] | string = '.'): Promise<boolean> {
    const fileList = Array.isArray(files) ? files : [files];
    const { code } = await this.exec(['add', ...fileList]);
    return code === 0;
  }

  async reset(filePath: string, staged = true): Promise<boolean> {
    if (staged) {
      const { code } = await this.exec(['reset', 'HEAD', '--', filePath]);
      return code === 0;
    }
    const { code } = await this.exec(['checkout', '--', filePath]);
    return code === 0;
  }

  async resetHard(commit: string = 'HEAD'): Promise<boolean> {
    const { code } = await this.exec(['reset', '--hard', commit]);
    return code === 0;
  }

  async resetSoft(commit: string): Promise<boolean> {
    const { code } = await this.exec(['reset', '--soft', commit]);
    return code === 0;
  }

  async commit(message: string, files?: string[]): Promise<string | null> {
    if (files && files.length > 0) {
      await this.exec(['add', ...files]);
    }
    const { stdout, code } = await this.exec(['commit', '-m', message]);
    if (code !== 0) return null;
    const m = stdout.match(/\[[\w-]+(?:\s+\w+)*\s+([a-f0-9]+)\]/);
    const hash = m?.[1] ?? null;
    if (hash) {
      globalEventBus.emit({ type: 'git:commit', payload: { hash, message } });
    }
    return hash;
  }

  async commitAmend(message?: string): Promise<string | null> {
    const args = ['commit', '--amend'];
    if (message) {
      args.push('-m', message);
    } else {
      args.push('--no-edit');
    }
    const { stdout, code } = await this.exec(args);
    if (code !== 0) return null;
    const m = stdout.match(/\[[\w-]+(?:\s+\w+)*\s+([a-f0-9]+)\]/);
    return m?.[1] ?? null;
  }

  async pull(
    remote = 'origin',
    branch?: string
  ): Promise<{ success: boolean; conflicts: string[] }> {
    const args = branch ? ['pull', '--no-rebase', remote, branch] : ['pull', '--no-rebase'];
    const { code, stdout } = await this.exec(args);
    const conflicts: string[] = [];
    if (code !== 0) {
      const status = await this.status();
      if (status) {
        conflicts.push(...status.conflicted);
      }
    }
    if (code === 0) {
      globalEventBus.emit({ type: 'git:pull', payload: { remote, branch } });
    }
    return { success: code === 0, conflicts };
  }

  async push(remote = 'origin', branch?: string, setUpstream = false): Promise<boolean> {
    const args = ['push'];
    if (setUpstream) args.push('-u');
    args.push(remote);
    if (branch) args.push(branch);
    const { code } = await this.exec(args);
    if (code === 0) {
      globalEventBus.emit({ type: 'git:push', payload: { remote, branch } });
    }
    return code === 0;
  }

  async fetch(remote = 'origin'): Promise<boolean> {
    const { code } = await this.exec(['fetch', remote]);
    if (code === 0) {
      globalEventBus.emit({ type: 'git:fetch', payload: { remote } });
    }
    return code === 0;
  }

  async remotes(): Promise<GitRemote[]> {
    const { stdout, code } = await this.exec(['remote', '-v']);
    if (code !== 0) return [];
    return this.parseRemotes(stdout);
  }

  async addRemote(name: string, url: string): Promise<boolean> {
    const { code } = await this.exec(['remote', 'add', name, url]);
    return code === 0;
  }

  async removeRemote(name: string): Promise<boolean> {
    const { code } = await this.exec(['remote', 'remove', name]);
    return code === 0;
  }

  async stash(message?: string): Promise<string | null> {
    const args = ['stash', 'push'];
    if (message) args.push('-m', message);
    const { stdout, code } = await this.exec(args);
    if (code !== 0) return null;
    const m = stdout.match(/Saved working directory.*WIP on (\w+):\s*([a-f0-9]+)/);
    return m?.[2] ?? stdout.trim();
  }

  async stashList(): Promise<GitStashEntry[]> {
    const format = '%gd%n%gs%n%at%n%gD%n--END--';
    const { stdout, code } = await this.exec(['stash', 'list', `--format=${format}`]);
    if (code !== 0) return [];
    return this.parseStashList(stdout);
  }

  async stashPop(index = 0): Promise<boolean> {
    const { code } = await this.exec(['stash', 'pop', `stash@{${index}}`]);
    if (code === 0) {
      globalEventBus.emit({ type: 'git:stash-pop', payload: { index } });
    }
    return code === 0;
  }

  async stashApply(index = 0): Promise<boolean> {
    const { code } = await this.exec(['stash', 'apply', `stash@{${index}}`]);
    return code === 0;
  }

  async stashDrop(index = 0): Promise<boolean> {
    const { code } = await this.exec(['stash', 'drop', `stash@{${index}}`]);
    return code === 0;
  }

  async stashClear(): Promise<boolean> {
    const { code } = await this.exec(['stash', 'clear']);
    return code === 0;
  }

  async tags(): Promise<GitTag[]> {
    const format =
      '%(refname:short)%n%(objectname)%n%(taggerdate:unix)%n%(contents:subject)%n--END--';
    const { stdout, code } = await this.exec(['tag', '--format', format, '--sort=-taggerdate']);
    if (code !== 0) return [];
    return this.parseTags(stdout);
  }

  async createTag(name: string, message?: string, commit?: string): Promise<boolean> {
    const args = ['tag'];
    if (message) {
      args.push('-a', name, '-m', message);
    } else {
      args.push(name);
    }
    if (commit) args.push(commit);
    const { code } = await this.exec(args);
    return code === 0;
  }

  async deleteTag(name: string): Promise<boolean> {
    const { code } = await this.exec(['tag', '-d', name]);
    return code === 0;
  }

  async merge(branch: string): Promise<{ success: boolean; conflicts: string[] }> {
    const { code } = await this.exec(['merge', '--no-ff', branch]);
    const conflicts: string[] = [];
    if (code !== 0) {
      const status = await this.status();
      if (status) {
        conflicts.push(...status.conflicted);
      }
    }
    if (code === 0) {
      globalEventBus.emit({ type: 'git:merge', payload: { branch } });
    }
    return { success: code === 0, conflicts };
  }

  async rebase(branch: string): Promise<{ success: boolean; conflicts: string[] }> {
    const { code } = await this.exec(['rebase', branch]);
    const conflicts: string[] = [];
    if (code !== 0) {
      const status = await this.status();
      if (status) {
        conflicts.push(...status.conflicted);
      }
    }
    return { success: code === 0, conflicts };
  }

  async abortMerge(): Promise<boolean> {
    const { code } = await this.exec(['merge', '--abort']);
    return code === 0;
  }

  async abortRebase(): Promise<boolean> {
    const { code } = await this.exec(['rebase', '--abort']);
    return code === 0;
  }

  async continueRebase(): Promise<boolean> {
    const { code } = await this.exec(['rebase', '--continue']);
    return code === 0;
  }

  async cherryPick(commit: string): Promise<boolean> {
    const { code } = await this.exec(['cherry-pick', commit]);
    return code === 0;
  }

  async revert(commit: string): Promise<boolean> {
    const { code } = await this.exec(['revert', '--no-edit', commit]);
    return code === 0;
  }

  /**
   * 解析冲突区域
   */
  async parseConflicts(filePath: string): Promise<MergeConflictRegion[]> {
    try {
      const content = await fsPromises.readFile(filePath, 'utf-8');
      const content = await (fs as any).promises.readFile(filePath, 'utf-8');
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
    manualContent?: string
  ): Promise<boolean> {
    let content = await fsPromises.readFile(filePath, 'utf-8');
    let content = await (fs as any).promises.readFile(filePath, 'utf-8');
    for (const region of regions) {
      const blockRegex = new RegExp(
        `<<<<<<< HEAD\\n([\\s\\S]*?)=======\\n([\\s\\S]*?)>>>>>>> [^\\n]*\\n?`,
        'g'
      );
      const replacement =
        strategy === 'ours'
          ? region.ours
          : strategy === 'theirs'
            ? region.theirs
            : (manualContent ?? region.ours);
      content = content.replace(blockRegex, replacement);
    }
    await fsPromises.writeFile(filePath, content, 'utf-8');
    await (fs as any).promises.writeFile(filePath, content, 'utf-8');
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
    const baseUrl =
      options.platform === 'github' ? 'https://api.github.com' : 'https://gitee.com/api/v5';
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

  async blame(
    filePath: string
  ): Promise<{ line: number; hash: string; author: string; date: number; content: string }[]> {
    const { stdout, code } = await this.exec(['blame', '--line-porcelain', filePath]);
    if (code !== 0) return [];
    return this.parseBlame(stdout);
  }

  private parseStatus(out: string): GitStatus {
    const lines = out.split('\n').filter(Boolean);
    const branchLine = lines.find((l) => l.startsWith('# ')) ?? '';
    const status: GitStatus = {
      branch: 'main',
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      isGitRepo: true,
    };
    const branchMatch = branchLine.match(/^# branch\.head\s+(.+)/);
    if (branchMatch) status.branch = branchMatch[1]!;
    const aheadMatch = out.match(/^# branch\.ab\s+\+(\d+)\s+-\d+/m);
    const behindMatch = out.match(/^# branch\.ab\s+\+\d+\s+-(\d+)/m);
    if (aheadMatch) status.ahead = parseInt(aheadMatch[1]!, 10);
    if (behindMatch) status.behind = parseInt(behindMatch[1]!, 10);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i]!;
      if (line.startsWith('# ')) {
        i++;
        continue;
      }
      const statusCode = line.slice(0, 2);
      const path = line.slice(3);
      if (statusCode === '? ') {
        status.untracked.push(path);
      } else if (
        statusCode === 'U ' ||
        statusCode === ' U' ||
        statusCode === 'AA' ||
        statusCode === 'DD'
      ) {
        status.conflicted.push(path);
      } else if (statusCode[0] !== '.' && statusCode[0] !== '?') {
        status.staged.push({
          path,
          status: this.parseStatusChar(statusCode[0]!),
          additions: 0,
          deletions: 0,
        });
      } else if (statusCode[1] !== '.' && statusCode[1] !== '?') {
        status.unstaged.push({
          path,
          status: this.parseStatusChar(statusCode[1]!),
          additions: 0,
          deletions: 0,
        });
      }
      i++;
    }
    return status;
  }

  private parseStatusChar(c: string): GitFileChange['status'] {
    switch (c) {
      case 'M':
        return 'modified';
      case 'A':
        return 'added';
      case 'D':
        return 'deleted';
      case 'R':
        return 'renamed';
      case 'C':
        return 'copied';
      default:
        return 'modified';
    }
  }

  private parseDiffOutput(out: string): GitDiff[] {
    const diffs: GitDiff[] = [];
    const blocks = out.split(/^diff --git /m).filter(Boolean);
    for (const block of blocks) {
      const lines = block.split('\n');
      let filePath = '';
      let oldPath: string | undefined;
      let fileStatus: GitDiff['status'] = 'modified';
      let i = 0;
      while (i < lines.length && !lines[i]!.startsWith('@@')) {
        const line = lines[i]!;
        if (line.startsWith('--- a/')) {
          oldPath = line.slice(6);
        } else if (line.startsWith('+++ b/')) {
          filePath = line.slice(6);
        } else if (line.startsWith('new file mode')) {
          fileStatus = 'added';
        } else if (line.startsWith('deleted file mode')) {
          fileStatus = 'deleted';
        } else if (line.startsWith('rename from')) {
          oldPath = line.slice(12);
          fileStatus = 'renamed';
        }
        i++;
      }
      const hunks: GitDiffHunk[] = [];
      let additions = 0;
      let deletions = 0;
      while (i < lines.length) {
        const m = lines[i]!.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (m) {
          const hunk: GitDiffHunk = {
            oldStart: parseInt(m[1]!, 10),
            oldLines: parseInt(m[2] ?? '1', 10),
            newStart: parseInt(m[3]!, 10),
            newLines: parseInt(m[4] ?? '1', 10),
            lines: [],
          };
          i++;
          let oldLine = hunk.oldStart;
          let newLine = hunk.newStart;
          while (
            i < lines.length &&
            !lines[i]!.startsWith('diff ') &&
            !lines[i]!.startsWith('@@')
          ) {
            const l = lines[i]!;
            if (l.startsWith('+')) {
              hunk.lines.push({ type: 'add', content: l.slice(1), newLine: newLine++ });
              additions++;
            } else if (l.startsWith('-')) {
              hunk.lines.push({ type: 'del', content: l.slice(1), oldLine: oldLine++ });
              deletions++;
            } else if (l.startsWith(' ')) {
              hunk.lines.push({
                type: 'context',
                content: l.slice(1),
                oldLine: oldLine++,
                newLine: newLine++,
              });
            }
            i++;
          }
          hunks.push(hunk);
        } else {
          i++;
        }
      }
      diffs.push({
        filePath: filePath || oldPath || '',
        oldPath,
        status: fileStatus,
        hunks,
        additions,
        deletions,
      });
    }
    return diffs;
  }

  private parseLog(out: string): GitCommit[] {
    const commits: GitCommit[] = [];
    const blocks = out
      .split('--END--')
      .map((b) => b.trim())
      .filter(Boolean);
    for (const b of blocks) {
      const lines = b.split('\n').filter((l, i, arr) => !(i === arr.length - 1 && l === ''));
      if (lines.length < 6) continue;
      const [hash, shortHash, author, email, date, subject, ...rest] = lines;
      const parentsLine = rest.pop();
      const body = rest.join('\n').trim() || undefined;
      const parents = parentsLine ? parentsLine.split(' ').filter(Boolean) : undefined;
      commits.push({
        hash: hash ?? '',
        shortHash: shortHash ?? '',
        author: author ?? '',
        email: email ?? '',
        date: parseInt(date ?? '0', 10) * 1000,
        message: subject ?? '',
        body,
        parents,
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
        const name = m[1]!;
        const lastCommitHash = m[2]!;
        const rest = m[3] ?? '';
        const aheadMatch = rest.match(/ahead\s+(\d+)/);
        const behindMatch = rest.match(/behind\s+(\d+)/);
        return {
          name,
          current,
          ahead: aheadMatch ? parseInt(aheadMatch[1]!, 10) : 0,
          behind: behindMatch ? parseInt(behindMatch[1]!, 10) : 0,
          lastCommitHash,
          lastCommitMessage: rest.replace(/\[[^\]]+\]\s*/, '').trim() || undefined,
        } as GitBranch;
      })
      .filter((b): b is GitBranch => !!b);
  }

  private parseRemotes(out: string): GitRemote[] {
    const remotes = new Map<string, GitRemote>();
    const lines = out.split('\n').filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^(\S+)\s+(\S+)\s+\((push|fetch)\)$/);
      if (!m) continue;
      const name = m[1]!;
      const url = m[2]!;
      const type = m[3]! as 'push' | 'fetch';
      if (!remotes.has(name)) {
        remotes.set(name, { name, url });
      }
      const remote = remotes.get(name)!;
      if (type === 'fetch') {
        remote.fetchUrl = url;
      } else {
        remote.pushUrl = url;
      }
    }
    return Array.from(remotes.values());
  }

  private parseStashList(out: string): GitStashEntry[] {
    const entries: GitStashEntry[] = [];
    const blocks = out
      .split('--END--')
      .map((b) => b.trim())
      .filter(Boolean);
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 4) continue;
      const [ref, subject, timestamp, refDesc] = lines;
      const indexMatch = ref?.match(/\{(\d+)\}/);
      const index = indexMatch ? parseInt(indexMatch[1]!, 10) : entries.length;
      const branchMatch = refDesc?.match(/On (\w+):/);
      entries.push({
        index,
        name: ref ?? '',
        message: subject ?? '',
        date: parseInt(timestamp ?? '0', 10) * 1000,
        branch: branchMatch?.[1] ?? '',
      });
    }
    return entries;
  }

  private parseTags(out: string): GitTag[] {
    const tags: GitTag[] = [];
    const blocks = out
      .split('--END--')
      .map((b) => b.trim())
      .filter(Boolean);
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 2) continue;
      const [name, hash, date, ...msgLines] = lines;
      tags.push({
        name: name ?? '',
        hash: hash ?? '',
        date: date ? parseInt(date, 10) * 1000 : undefined,
        message: msgLines.join('\n').trim() || undefined,
      });
    }
    return tags;
  }

  parseConflictMarkers(content: string, filePath: string): MergeConflictRegion[] {
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

  private parseBlame(
    out: string
  ): { line: number; hash: string; author: string; date: number; content: string }[] {
    const result: { line: number; hash: string; author: string; date: number; content: string }[] =
      [];
    const lines = out.split('\n');
    let i = 0;
    while (i < lines.length) {
      const headerLine = lines[i];
      if (!headerLine) {
        i++;
        continue;
      }
      const parts = headerLine.split(' ');
      const hash = parts[0] ?? '';
      const lineNum = parts[2] ? parseInt(parts[2], 10) : 0;
      i++;
      let author = '';
      let date = 0;
      let content = '';
      while (i < lines.length && !/^[a-f0-9]{40}\s/.test(lines[i]!)) {
        const line = lines[i]!;
        if (line.startsWith('author ')) {
          author = line.slice(7);
        } else if (line.startsWith('author-time ')) {
          date = parseInt(line.slice(11), 10) * 1000;
        } else if (line.startsWith('\t')) {
          content = line.slice(1);
          i++;
          break;
        }
        i++;
      }
      if (lineNum > 0) {
        result.push({ line: lineNum, hash, author, date, content });
      }
    }
    return result;
  }
}

export const gitService = new GitService();
