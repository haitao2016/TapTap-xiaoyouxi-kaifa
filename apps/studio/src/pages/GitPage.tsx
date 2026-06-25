import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Icon, Input, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@tapdev/ui';
import { gitService } from '@tapdev/core';
import type { GitStatus, GitCommit, GitBranch, GitDiffHunk, MergeConflictRegion } from '@tapdev/core';
import { useAppStore } from '../store/app-store';

export function GitPage() {
  const { currentProject } = useAppStore();
  const [activeTab, setActiveTab] = useState('changes');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [diff, setDiff] = useState<GitDiffHunk[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [conflicts, setConflicts] = useState<MergeConflictRegion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitRepo, setIsGitRepo] = useState(false);

  useEffect(() => {
    if (currentProject) {
      gitService.setWorkingDir(currentProject.path);
      checkGitRepo();
    }
  }, [currentProject]);

  const checkGitRepo = async () => {
    try {
      const s = await gitService.status();
      setIsGitRepo(!!s);
      if (s) {
        refreshAll();
      }
    } catch {
      setIsGitRepo(false);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      const [s, c, b] = await Promise.all([
        gitService.status(),
        gitService.log(),
        gitService.branches(),
      ]);
      setStatus(s);
      setCommits(c);
      setBranches(b);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDiff = async (filePath: string) => {
    setSelectedFile(filePath);
    const d = await gitService.diff(filePath);
    setDiff(d);
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setIsLoading(true);
    try {
      await gitService.commit(commitMessage);
      setCommitMessage('');
      await refreshAll();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setIsLoading(true);
    try {
      await gitService.createBranch(newBranchName);
      setNewBranchName('');
      setShowNewBranch(false);
      await refreshAll();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    setIsLoading(true);
    try {
      await gitService.pull();
      await refreshAll();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    setIsLoading(true);
    try {
      await gitService.push();
      await refreshAll();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflict = async (filePath: string, strategy: 'ours' | 'theirs') => {
    setIsLoading(true);
    try {
      const regions = await gitService.parseConflicts(filePath);
      await gitService.resolveConflict(filePath, regions, strategy);
      await refreshAll();
      setConflicts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const initGit = async () => {
    setIsLoading(true);
    try {
      await gitService.exec(['init']);
      await checkGitRepo();
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isGitRepo) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Card className="max-w-md text-center">
          <CardHeader>
          <CardTitle>Git 仓库未初始化</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary">当前项目不是 Git 仓库</p>
            <Button onClick={initGit} disabled={isLoading}>
              {isLoading ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
              初始化 Git 仓库
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border px-4 flex items-center justify-between">
          <TabsList className="mt-2">
            <TabsTrigger value="changes">变更</TabsTrigger>
            <TabsTrigger value="history">历史</TabsTrigger>
            <TabsTrigger value="branches">分支</TabsTrigger>
            <TabsTrigger value="conflicts">冲突</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={refreshAll} disabled={isLoading}>
              <Icon name="refresh" size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={handlePull} disabled={isLoading}>
              <Icon name="download" size={14} /> 拉取
            </Button>
            <Button size="sm" variant="ghost" onClick={handlePush} disabled={isLoading}>
              <Icon name="upload" size={14} /> 推送
            </Button>
          </div>
        </div>

        <TabsContent value="changes" className="mt-0 flex-1 flex overflow-hidden">
          {/* 左侧文件列表*/}
          <div className="w-72 shrink-0 border-r border-border overflow-auto">
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">暂存区</span>
                <Badge variant="success">{status?.staged.length || 0}</Badge>
              </div>
              <div className="space-y-1">
                {status?.staged.map((file) => (
                  <div
                    key={file.path}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${
                      selectedFile === file.path ? 'bg-tap-orange/10 text-tap-orange' : 'hover:bg-surface-2'
                    }`}
                    onClick={() => handleViewDiff(file.path)}
                  >
                    <Icon name="file" size={14} className="text-green-500" />
                    <span className="flex-1 truncate">{file.path}</span>
                    <Badge variant="success">+{file.additions} -{file.deletions}</Badge>
                  </div>
                ))}
                {status?.staged.length === 0 && (
                  <div className="text-xs text-text-muted py-2 text-center">暂无暂存文件</div>
                )}
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">更改</span>
                <Badge variant="default">{(status?.unstaged.length || 0) + (status?.untracked.length || 0)}</Badge>
              </div>
              <div className="space-y-1">
                {status?.unstaged.map((file) => (
                  <div
                    key={file.path}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${
                      selectedFile === file.path ? 'bg-tap-orange/10 text-tap-orange' : 'hover:bg-surface-2'
                    }`}
                    onClick={() => handleViewDiff(file.path)}
                  >
                    <Icon name="file" size={14} className="text-yellow-500" />
                    <span className="flex-1 truncate">{file.path}</span>
                    <Badge variant="default">+{file.additions} -{file.deletions}</Badge>
                  </div>
                ))}
                {status?.untracked.map((path) => (
                  <div
                    key={path}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${
                      selectedFile === path ? 'bg-tap-orange/10 text-tap-orange' : 'hover:bg-surface-2'
                    }`}
                    onClick={() => handleViewDiff(path)}
                  >
                    <Icon name="plus" size={14} className="text-blue-500" />
                    <span className="flex-1 truncate">{path}</span>
                    <Badge variant="default">新文件</Badge>
                  </div>
                ))}
                {status?.unstaged.length === 0 && status?.untracked.length === 0 && (
                  <div className="text-xs text-text-muted py-2 text-center">工作区干净</div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧 diff 视图 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedFile ? (
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium">{selectedFile}</h3>
                </div>
              <div className="bg-surface-1 rounded-lg border border-border overflow-hidden">
                {diff.length > 0 ? (
                  <div className="font-mono text-sm">
                    {diff.map((hunk, hunkIdx) => (
                      <div key={hunkIdx} className="border-b border-border last:border-b-0">
                        <div className="bg-surface-2 px-3 py-1 text-xs text-text-muted">
                          @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                        </div>
                        {hunk.lines.map((line, lineIdx) => (
                          <div
                            key={lineIdx}
                            className={`flex ${
                              line.type === 'add'
                                ? 'bg-green-500/10 text-green-400'
                                : line.type === 'del'
                                ? 'bg-red-500/10 text-red-400'
                                : ''
                            }`}
                          >
                            <span className="w-12 shrink-0 text-right pr-3 text-text-muted select-none border-r border-border">
                              {line.oldLine ?? ''}
                            </span>
                            <span className="w-12 shrink-0 text-right pr-3 text-text-muted select-none border-r border-border">
                              {line.newLine ?? ''}
                            </span>
                            <span className="px-2">{line.content}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-text-muted">
                    二进制文件或新文件，无法显示 diff
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              选择文件查看变更
            </div>
          )}

            {/* 提交区 */}
            <div className="border-t border-border p-4">
              <div className="space-y-3">
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="提交信息..."
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:border-tap-orange/50"
                />
                <div className="flex justify-end">
                  <Button onClick={handleCommit} disabled={isLoading || !commitMessage.trim()}>
                    {isLoading ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
                    提交
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <div className="p-4 overflow-auto h-full">
            <div className="max-w-3xl mx-auto space-y-2">
              {commits.map((commit) => (
                <div key={commit.hash} className="bg-surface-1 rounded-lg border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-tap-orange/20 flex items-center justify-center text-tap-orange text-sm font-medium shrink-0">
                      {commit.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{commit.message}</div>
                      {commit.body && <div className="text-xs text-text-muted mt-1">{commit.body}</div>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span>{commit.author}</span>
                        <span>·</span>
                        <span>{formatDate(commit.date)}</span>
                        <span>·</span>
                        <code className="font-mono">{commit.shortHash}</code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {commits.length === 0 && (
                <div className="text-center text-text-muted py-8">暂无提交记录</div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branches" className="mt-0">
          <div className="p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">分支列表</h3>
                <Button size="sm" onClick={() => setShowNewBranch(!showNewBranch)}>
                  <Icon name="plus" size={14} /> 新建分支
                </Button>
              </div>

              {showNewBranch && (
                <Card>
                  <CardContent className="space-y-3">
                    <Input
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="分支名称"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setShowNewBranch(false)}>
                        取消
                      </Button>
                      <Button size="sm" onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
                        创建
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {branches.map((branch) => (
                <div
                  key={branch.name}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    branch.current
                      ? 'border-tap-orange/50 bg-tap-orange/5'
                      : 'border-border bg-surface-1 hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="git-branch" size={16} className={branch.current ? 'text-tap-orange' : 'text-text-muted'} />
                    <div>
                      <div className="text-sm font-medium">{branch.name}</div>
                      <div className="text-xs text-text-muted">
                        {branch.current ? '当前分支' : `最后提交: ${branch.lastCommitHash.slice(0, 7)}`}
                      </div>
                    </div>
                  </div>
                  {branch.current && <Badge variant="success">当前</Badge>}
                </div>
              ))}
            </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conflicts" className="mt-0">
          <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">合并冲突</h3>
                <Badge variant="default">{status?.conflicted.length || 0} 个冲突文件</Badge>
              </div>

              {status?.conflicted && status.conflicted.length > 0 ? (
                <div className="space-y-4">
                  {status.conflicted.map((filePath) => (
                    <Card key={filePath}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon name="alert-triangle" size={16} className="text-yellow-500" />
                            <CardTitle className="text-base">{filePath}</CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleResolveConflict(filePath, 'ours')}>
                              使用我方
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleResolveConflict(filePath, 'theirs')}>
                              使用对方
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-surface-2 rounded p-3 font-mono text-xs overflow-auto max-h-64">
                          <div className="text-red-400">&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD (我方)</div>
                          <div className="text-green-400">======= (对方)</div>
                          <div className="text-blue-400">&gt;&gt;&gt;&gt;&gt;&gt;&gt; branch</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-text-muted py-8">
                  <Icon name="check-circle" size={48} className="mx-auto mb-2 text-green-500" />
                  <p>没有冲突</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
