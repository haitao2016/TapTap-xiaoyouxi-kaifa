import { Button, Card, CardHeader, CardTitle, CardContent, Icon, Badge } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { useNavigate } from 'react-router-dom';
import { projectManager, buildService, monitorService, pluginManager } from '@tapdev/core';
import { useState, useEffect } from 'react';
import type { ProjectMeta, BuildTask } from '@tapdev/types';

interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

interface DashboardStats {
  totalProjects: number;
  totalBuilds: number;
  successBuilds: number;
  activePlugins: number;
}

export function DashboardPage() {
  const { currentProject, openProject, createProject, startDebug, startBuild, settings } =
    useAppStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalBuilds: 0,
    successBuilds: 0,
    activePlugins: 0,
  });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [recentBuilds, setRecentBuilds] = useState<BuildTask[]>([]);

  const recentProjects = projectManager.getRecentProjects();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const allPlugins = pluginManager.getAllPluginInfo();
      const activePlugins = allPlugins.filter((p) => p.activated).length;
      const allBuilds = buildService.getAllTasks();
      const successBuilds = allBuilds.filter((b) => b.status === 'success').length;

      setStats({
        totalProjects: recentProjects.length,
        totalBuilds: allBuilds.length,
        successBuilds,
        activePlugins,
      });

      setRecentBuilds(allBuilds.slice(0, 5));

      const mockRecentFiles: RecentFile[] = [
        {
          path: 'Assets/Scripts/GameManager.cs',
          name: 'GameManager.cs',
          lastOpened: Date.now() - 300000,
        },
        {
          path: 'Assets/Scripts/PlayerController.cs',
          name: 'PlayerController.cs',
          lastOpened: Date.now() - 600000,
        },
        {
          path: 'tapdev.config.json',
          name: 'tapdev.config.json',
          lastOpened: Date.now() - 1800000,
        },
        { path: 'Assets/Scenes/Main.unity', name: 'Main.unity', lastOpened: Date.now() - 3600000 },
      ];
      setRecentFiles(mockRecentFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = async () => {
    try {
      let projectPath = './projects/demo-game';
      
      // If native bridge is available, let user pick a directory
      if (window.electronAPI?.openDirectory) {
        const picked = await window.electronAPI.openDirectory();
        if (!picked) return;
        projectPath = picked;
      }

      await createProject('新 TapTap 项目', projectPath, 'unity');
      navigate('/editor');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建项目失败');
    }
  };

  const handleOpenProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let projectPath = './projects/demo-game';
      if (window.electronAPI?.openDirectory) {
        const picked = await window.electronAPI.openDirectory();
        if (!picked) return;
        projectPath = picked;
      }
      
      await openProject(projectPath);
      navigate('/editor');
    } catch (err) {
      setError(err instanceof Error ? err.message : '打开项目失败');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return `${days} 天前`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-tap-orange border-t-transparent mx-auto" />
          <p className="text-text-secondary">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon name="alert" size={16} className="text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">TapDev Studio</h1>
          <p className="mt-1 text-sm text-text-secondary">
            跨平台 TapTap 小游戏开发软件 — 支持 PC、手机、平板
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={loadDashboardData}>
            <Icon name="refresh" size={14} /> 刷新
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="项目总数"
          value={stats.totalProjects}
          icon="folder"
          trend="+2"
          trendLabel="本周新增"
        />
        <StatCard
          label="构建次数"
          value={stats.totalBuilds}
          icon="build"
          trend={`${stats.successBuilds > 0 ? Math.round((stats.successBuilds / Math.max(stats.totalBuilds, 1)) * 100) : 0}%`}
          trendLabel="成功率"
          trendPositive={
            stats.successBuilds > 0 && stats.successBuilds / Math.max(stats.totalBuilds, 1) >= 0.8
          }
        />
        <StatCard
          label="活跃插件"
          value={stats.activePlugins}
          icon="plugin"
          trend={`${pluginManager.getAllPluginInfo().length}`}
          trendLabel="总数"
        />
        <StatCard
          label="调试端口"
          value={settings.debugServerPort}
          icon="bug"
          trend="运行中"
          trendLabel="状态"
          trendPositive
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          icon="plus"
          title="新建项目"
          description="创建 TapTap 小游戏项目"
          onClick={handleNewProject}
          color="orange"
        />
        <ActionCard
          icon="folder"
          title="打开项目"
          description="打开已有项目"
          onClick={handleOpenProject}
          color="blue"
        />
        <ActionCard
          icon="bug"
          title="启动调试"
          description="本地服务器 + 真机扫码"
          onClick={() => startDebug()}
          disabled={!currentProject}
          color="green"
        />
        <ActionCard
          icon="build"
          title="构建发布"
          description="生成 game.zip 包"
          onClick={() => startBuild()}
          disabled={!currentProject}
          color="purple"
        />
      </div>

      {currentProject ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>当前项目</CardTitle>
              <Badge variant="success">已打开</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="项目名称" value={currentProject.config.name} />
              <InfoItem label="引擎" value={currentProject.config.engine.toUpperCase()} />
              <InfoItem label="路径" value={currentProject.path} />
              <InfoItem
                label="上次打开"
                value={
                  currentProject.lastOpenedAt
                    ? new Date(currentProject.lastOpenedAt).toLocaleString()
                    : '--'
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate('/editor')}>
                <Icon name="code" size={14} /> 打开编辑器
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/debug')}>
                <Icon name="bug" size={14} /> 调试
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/monitor')}>
                <Icon name="chart" size={14} /> 监控
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/build')}>
                <Icon name="build" size={14} /> 构建
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Icon name="folder" size={48} className="mx-auto mb-3 text-text-muted" />
            <p className="text-text-secondary">尚未打开项目，点击上方按钮开始</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>最近文件</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/editor')}>
                查看全部
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentFiles.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">暂无最近文件</p>
            ) : (
              <ul className="space-y-1">
                {recentFiles.map((file) => (
                  <li key={file.path}>
                    <button
                      onClick={() => {
                        if (currentProject) {
                          navigate('/editor');
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2"
                    >
                      <Icon name="file" size={16} className="text-text-muted" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{file.name}</div>
                        <div className="truncate text-xs text-text-muted">{file.path}</div>
                      </div>
                      <span className="shrink-0 text-xs text-text-muted">
                        {formatTimeAgo(file.lastOpened)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>最近构建</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/build')}>
                查看全部
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBuilds.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">暂无构建记录</p>
            ) : (
              <ul className="space-y-1">
                {recentBuilds.map((build) => (
                  <li key={build.id}>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                      <Badge
                        variant={
                          build.status === 'success'
                            ? 'success'
                            : build.status === 'failed'
                              ? 'error'
                              : build.status === 'running'
                                ? 'info'
                                : 'default'
                        }
                        className="shrink-0"
                      >
                        {build.status}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">v{build.config.version}</div>
                        <div className="truncate text-xs text-text-muted">
                          {build.startedAt ? new Date(build.startedAt).toLocaleString() : '--'}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-text-muted">
                        {build.config.targetPlatform.join(', ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {recentProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近项目</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={async () => {
                    try {
                      await openProject(project.path);
                      navigate('/editor');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : '打开项目失败');
                    }
                  }}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-tap-orange/50 hover:bg-surface-2"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                    <Icon name="folder" size={20} className="text-tap-orange" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {project.name || project.path}
                    </div>
                    <div className="truncate text-xs text-text-muted">{project.path}</div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="调试工具"
          icon="bug"
          items={['本地 HTTP 服务器', '二维码真机调试', '断点与日志', 'Chrome/Safari 测试']}
        />
        <FeatureCard
          title="性能监控"
          icon="chart"
          items={['FPS 实时监控', '内存使用追踪', '网络请求统计', '告警阈值通知']}
        />
        <FeatureCard
          title="构建发布"
          icon="build"
          items={['WebGL/WASM 编译', '资源压缩打包', 'WASM 分包', '多平台适配']}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  trendPositive,
}: {
  label: string;
  value: number | string;
  icon: string;
  trend?: string;
  trendLabel?: string;
  trendPositive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-text-muted">{label}</div>
          <div className="mt-1 text-2xl font-bold">{value}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tap-orange/10">
          <Icon name={icon} size={18} className="text-tap-orange" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span className={trendPositive ? 'text-green-400' : 'text-text-muted'}>{trend}</span>
          {trendLabel && <span className="text-text-muted">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
  disabled,
  color = 'orange',
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  color?: 'orange' | 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    orange: 'hover:border-tap-orange/50 text-tap-orange',
    blue: 'hover:border-blue-500/50 text-blue-400',
    green: 'hover:border-green-500/50 text-green-400',
    purple: 'hover:border-purple-500/50 text-purple-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 rounded-xl border border-border bg-surface-1 p-4 text-left transition-all hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed ${colorClasses[color]}`}
    >
      <Icon name={icon} size={24} />
      <div className="font-medium text-text-primary">{title}</div>
      <div className="text-xs text-text-muted">{description}</div>
    </button>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function FeatureCard({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon name={icon} size={18} className="text-tap-orange" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs">
              <span className="h-1 w-1 rounded-full bg-tap-orange" />
              <span className="text-text-secondary">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
