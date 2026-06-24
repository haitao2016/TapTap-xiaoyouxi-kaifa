import { Button, Card, CardHeader, CardTitle, CardContent, Icon } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { useNavigate } from 'react-router-dom';
import { projectManager } from '@tapdev/core';

export function DashboardPage() {
  const { currentProject, openProject, createProject, startDebug, startBuild } = useAppStore();
  const navigate = useNavigate();
  const recentProjects = projectManager.getRecentProjects();

  const handleNewProject = () => {
    createProject('Demo TapTap Game', './projects/demo-game', 'unity');
    navigate('/editor');
  };

  const handleOpenDemo = () => {
    openProject('./projects/demo-game');
    navigate('/editor');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">TapDev Studio</h1>
        <p className="mt-1 text-text-secondary">
          跨平台 TapTap 小游戏开发软件 — 支持 PC、手机、平板
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          icon="plus"
          title="新建项目"
          description="创建 TapTap 小游戏项目"
          onClick={handleNewProject}
        />
        <ActionCard
          icon="folder"
          title="打开项目"
          description="打开已有项目"
          onClick={handleOpenDemo}
        />
        <ActionCard
          icon="bug"
          title="启动调试"
          description="本地服务器 + 真机扫码"
          onClick={() => startDebug()}
          disabled={!currentProject}
        />
        <ActionCard
          icon="build"
          title="构建发布"
          description="生成 game.zip 包"
          onClick={() => startBuild()}
          disabled={!currentProject}
        />
      </div>

      {/* Current project */}
      {currentProject ? (
        <Card>
          <CardHeader>
            <CardTitle>当前项目</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoItem label="项目名称" value={currentProject.config.name} />
              <InfoItem label="引擎" value={currentProject.config.engine} />
              <InfoItem label="路径" value={currentProject.path} />
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
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-text-secondary">尚未打开项目，点击上方按钮开始</p>
          </CardContent>
        </Card>
      )}

      {/* Recent projects */}
      {recentProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近项目</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentProjects.map((path) => (
                <li key={path}>
                  <button
                    onClick={() => {
                      openProject(path);
                      navigate('/editor');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <Icon name="folder" size={16} className="text-text-muted" />
                    <span className="truncate">{path}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Feature overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="调试工具"
          items={['本地 HTTP 服务器', '二维码真机调试', '断点与日志', 'Chrome/Safari 测试']}
        />
        <FeatureCard
          title="性能监控"
          items={['FPS 实时监控', '内存使用追踪', '网络请求统计', '告警阈值通知']}
        />
        <FeatureCard
          title="构建发布"
          items={['WebGL/WASM 编译', '资源压缩打包', 'WASM 分包', '多平台适配']}
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface-1 p-4 text-left transition-colors hover:border-tap-orange/50 hover:bg-surface-2 disabled:opacity-40"
    >
      <Icon name={icon} size={24} className="text-tap-orange" />
      <div className="font-medium">{title}</div>
      <div className="text-xs text-text-muted">{description}</div>
    </button>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function FeatureCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs">
              <span className="h-1 w-1 rounded-full bg-tap-orange" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
