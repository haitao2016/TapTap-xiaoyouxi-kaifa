import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { platformService } from '@tapdev/core';

const NAV_ITEMS = [
  { id: 'dashboard', label: '工作台', icon: 'home', path: '/' },
  { id: 'editor', label: '编辑器', icon: 'code', path: '/editor' },
  { id: 'debug', label: '调试', icon: 'bug', path: '/debug' },
  { id: 'monitor', label: '监控', icon: 'chart', path: '/monitor' },
  { id: 'build', label: '构建', icon: 'build', path: '/build' },
  { id: 'docs', label: '文档', icon: 'book', path: '/docs' },
  { id: 'plugins', label: '插件', icon: 'plugin', path: '/plugins' },
  { id: 'settings', label: '设置', icon: 'settings', path: '/settings' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, currentProject, platform } = useAppStore();
  const isMobile = platformService.isMobileLayout();
  const isTablet = platformService.isTabletLayout();

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-surface-1 transition-all duration-200 ${
          sidebarOpen ? (isMobile ? 'w-16' : 'w-56') : 'w-0 overflow-hidden'
        } ${isMobile && sidebarOpen ? 'absolute z-50 h-full' : ''}`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tap-orange">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          {!isMobile && (
            <div>
              <div className="text-sm font-semibold">TapDev Studio</div>
              <div className="text-xs text-text-muted">TapTap 小游戏开发</div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-tap-orange/10 text-tap-orange'
                    : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                }`}
                title={item.label}
              >
                <Icon name={item.icon} size={18} />
                {!isMobile && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {currentProject && !isMobile && (
          <div className="border-t border-border p-3">
            <div className="truncate text-xs text-text-muted">当前项目</div>
            <div className="truncate text-sm font-medium">{currentProject.config.name}</div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface-1 px-4">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          >
            <Icon name="menu" size={18} />
          </button>

          <div className="flex-1" />

          <PlatformBadge platform={platform} />

          {currentProject && (
            <span className="hidden rounded-md bg-surface-2 px-2 py-1 text-xs text-text-secondary sm:inline-block">
              {currentProject.config.engine.toUpperCase()}
            </span>
          )}
        </header>

        <main className={`flex-1 overflow-auto ${isTablet ? 'p-4' : 'p-0'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = {
    pc: 'PC',
    mobile: '手机',
    tablet: '平板',
  };
  return (
    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-text-muted">
      {labels[platform] ?? platform}
    </span>
  );
}
