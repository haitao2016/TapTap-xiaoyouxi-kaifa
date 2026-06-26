import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Icon,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Button,
} from '@tapdev/ui';
import { useAppStore } from '../store/app-store';

interface DocSection {
  id: string;
  title: string;
  icon: string;
  items: DocItem[];
}

interface DocItem {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'guides' | 'api' | 'faq';
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'getting-started',
    title: '快速开始',
    icon: 'rocket',
    items: [
      {
        id: 'intro',
        title: '产品简介',
        description: '了解 TapDev Studio 的核心功能和定位',
        category: 'getting-started',
      },
      {
        id: 'install',
        title: '安装与配置',
        description: '下载安装并完成初始配置',
        category: 'getting-started',
      },
      {
        id: 'quickstart',
        title: '快速上手',
        description: '5 分钟完成第一个项目',
        category: 'getting-started',
      },
      {
        id: 'faq',
        title: '常见问题',
        description: '使用过程中常见问题解答',
        category: 'getting-started',
      },
    ],
  },
  {
    id: 'core-features',
    title: '核心功能',
    icon: 'cpu',
    items: [
      {
        id: 'project',
        title: '项目管理',
        description: '创建、导入和管理 Unity 项目',
        category: 'guides',
      },
      {
        id: 'code-editor',
        title: '代码编辑器',
        description: '语法高亮、智能补全、格式化',
        category: 'guides',
      },
      {
        id: 'debugger',
        title: '调试器',
        description: '断点、监视变量、调用堆栈',
        category: 'guides',
      },
      { id: 'build', title: '构建发布', description: '一键构建多平台游戏包', category: 'guides' },
      { id: 'monitor', title: '性能监控', description: '实时监控游戏运行性能', category: 'guides' },
    ],
  },
  {
    id: 'plugins',
    title: '插件系统',
    icon: 'puzzle',
    items: [
      {
        id: 'plugin-intro',
        title: '插件简介',
        description: '了解插件系统架构和能力',
        category: 'guides',
      },
      {
        id: 'plugin-dev',
        title: '插件开发指南',
        description: '从零开始开发第一个插件',
        category: 'guides',
      },
      { id: 'plugin-api', title: '插件 API', description: '完整的插件 API 文档', category: 'api' },
      {
        id: 'plugin-market',
        title: '插件市场',
        description: '发现和安装第三方插件',
        category: 'guides',
      },
    ],
  },
  {
    id: 'api',
    title: 'API 参考',
    icon: 'code',
    items: [
      {
        id: 'core-api',
        title: 'Core API',
        description: '@tapdev/core 核心服务 API',
        category: 'api',
      },
      { id: 'ui-api', title: 'UI 组件库', description: '@tapdev/ui 组件文档', category: 'api' },
      {
        id: 'types-api',
        title: '类型定义',
        description: '@tapdev/types 类型参考',
        category: 'api',
      },
    ],
  },
];

const DOC_CONTENT: Record<string, { title: string; content: string[] }> = {
  intro: {
    title: '产品简介',
    content: [
      'TapDev Studio 是一款面向 Unity 开发者的一站式开发工具，集成了代码编辑、调试、构建、监控等核心功能。',
      '通过统一的工作台界面，开发者可以高效地完成从编码到发布的全流程工作。',
      '',
      '## 核心特性',
      '',
      '- **智能代码编辑**：支持 C#、JavaScript、TypeScript 等多种语言，提供语法高亮、智能补全、代码格式化',
      '- **可视化调试**：断点调试、监视变量、调用堆栈、日志查看',
      '- **一键构建**：支持 WebGL、Android、iOS 多平台构建',
      '- **性能监控**：实时监控 CPU、内存、帧率等性能指标',
      '- **插件系统**：丰富的插件生态，支持自定义扩展',
      '- **原生集成**：Electron 桌面端提供完整的 Unity 集成能力',
    ],
  },
  install: {
    title: '安装与配置',
    content: [
      '## 系统要求',
      '',
      '- Windows 10+ / macOS 11+ / Linux',
      '- Node.js 18+',
      '- Unity 2021.3+ (可选，用于原生构建)',
      '',
      '## 安装步骤',
      '',
      '### 1. 克隆项目',
      '```bash',
      'git clone https://github.com/tapdev/studio.git',
      'cd studio',
      '```',
      '',
      '### 2. 安装依赖',
      '```bash',
      'pnpm install',
      '```',
      '',
      '### 3. 启动开发服务器',
      '',
      'Web 模式（快速开发）：',
      '```bash',
      'pnpm dev:web',
      '```',
      '',
      '桌面端模式（完整功能）：',
      '```bash',
      'pnpm dev:desktop',
      '```',
    ],
  },
  quickstart: {
    title: '快速上手',
    content: [
      '## 5 分钟快速上手',
      '',
      '### 第一步：创建项目',
      '',
      '1. 打开 TapDev Studio',
      '2. 点击「新建项目」按钮',
      '3. 选择项目模板（2D / 3D / URP / HDRP）',
      '4. 输入项目名称和路径',
      '5. 点击「创建」',
      '',
      '### 第二步：编写代码',
      '',
      '1. 在左侧文件树中找到 `Assets/Scripts` 目录',
      '2. 右键点击，选择「新建 C# 脚本」',
      '3. 输入脚本名称，如 `GameManager`',
      '4. 在编辑器中编写代码',
      '5. 按 `Ctrl+S` 保存',
      '',
      '### 第三步：调试运行',
      '',
      '1. 切换到「调试」页面',
      '2. 点击「启动调试」按钮',
      '3. 在代码中设置断点',
      '4. 查看变量值和调用堆栈',
      '',
      '### 第四步：构建发布',
      '',
      '1. 切换到「构建」页面',
      '2. 选择目标平台（WebGL / Android / iOS）',
      '3. 配置构建选项',
      '4. 点击「开始构建」',
    ],
  },
  faq: {
    title: '常见问题',
    content: [
      '## 常见问题',
      '',
      '### Q: Web 模式和桌面端模式有什么区别？',
      '',
      'A: Web 模式仅提供前端界面，无法调用本地 Unity 编辑器和文件系统。桌面端模式基于 Electron，可以完整访问本地资源，支持真实的 Unity 构建和调试。',
      '',
      '### Q: 如何添加自定义插件？',
      '',
      'A: 在「插件」页面中，点击「安装插件」按钮，可以从本地文件夹或插件市场安装插件。插件开发请参考插件开发指南。',
      '',
      '### Q: 支持哪些 Unity 版本？',
      '',
      'A: 推荐使用 Unity 2021.3 LTS 及以上版本。低版本可能存在兼容性问题。',
      '',
      '### Q: 如何报告 Bug 或提交功能建议？',
      '',
      'A: 请在 GitHub Issues 中提交问题，我们会尽快回复。',
    ],
  },
  project: {
    title: '项目管理',
    content: [
      '## 项目管理',
      '',
      '### 创建项目',
      '',
      '点击「新建项目」按钮，选择模板：',
      '- 2D：2D 游戏模板',
      '- 3D：3D 游戏模板',
      '- URP：通用渲染管线模板',
      '- HDRP：高清渲染管线模板',
      '',
      '### 导入项目',
      '',
      '点击「导入项目」按钮，选择本地 Unity 项目文件夹。系统会自动检测项目配置。',
      '',
      '### 项目设置',
      '',
      '在项目设置中可以配置：',
      '- 项目名称和描述',
      '- Unity 版本',
      '- 构建输出路径',
      '- CDN 配置',
      '- 插件管理',
    ],
  },
  'code-editor': {
    title: '代码编辑器',
    content: [
      '## 代码编辑器',
      '',
      '### 支持的语言',
      '',
      '- C# (.cs)',
      '- JavaScript (.js)',
      '- TypeScript (.ts)',
      '- JSON (.json)',
      '- Markdown (.md)',
      '- Shader (.shader)',
      '',
      '### 快捷键',
      '',
      '| 功能 | 快捷键 |',
      '|------|--------|',
      '| 保存 | Ctrl+S |',
      '| 格式化 | Shift+Alt+F |',
      '| 查找 | Ctrl+F |',
      '| 替换 | Ctrl+H |',
      '| 撤销 | Ctrl+Z |',
      '| 重做 | Ctrl+Y |',
      '',
      '### 代码格式化',
      '',
      '编辑器集成了代码格式化功能，支持 Prettier 风格配置。可以在设置中自定义格式化选项。',
    ],
  },
  debugger: {
    title: '调试器',
    content: [
      '## 调试器',
      '',
      '### 启动调试',
      '',
      '在调试页面点击「启动调试」按钮，选择调试目标：',
      '- Unity Editor：连接 Unity 编辑器调试',
      '- WebGL 预览：在浏览器中调试 WebGL 构建',
      '',
      '### 断点管理',
      '',
      '- 设置断点：点击行号区域',
      '- 条件断点：右键断点设置条件',
      '- 禁用断点：点击断点图标',
      '',
      '### 监视变量',
      '',
      '在监视面板中可以添加变量，实时查看变量值变化。支持对象展开和属性查看。',
      '',
      '### 调用堆栈',
      '',
      '调试暂停时，调用堆栈面板显示当前执行的函数调用链。点击堆栈帧可以跳转到对应代码位置。',
    ],
  },
  build: {
    title: '构建发布',
    content: [
      '## 构建发布',
      '',
      '### 支持的平台',
      '',
      '- **WebGL**：网页端运行，支持 WASM 分包',
      '- **Android**：Android APK / AAB',
      '- **iOS**：iOS Xcode 工程',
      '',
      '### 构建选项',
      '',
      '- 版本号：设置构建版本',
      '- 压缩打包：生成 game.zip',
      '- WASM 分包：WebGL 专用，优化加载性能',
      '- 资源优化：压缩纹理和模型',
      '- 移除调试信息：发布版本使用',
      '',
      '### 构建历史',
      '',
      '所有构建记录都会保存在构建历史中，可以查看构建详情、下载输出文件、对比不同构建。',
    ],
  },
  monitor: {
    title: '性能监控',
    content: [
      '## 性能监控',
      '',
      '### 监控指标',
      '',
      '- **帧率 (FPS)**：实时帧率和帧率趋势',
      '- **CPU 使用率**：总体 CPU 和各核心使用率',
      '- **内存使用**：已用内存、堆内存、GC 分配',
      '- **网络请求**：请求列表、响应时间、状态码',
      '',
      '### 告警系统',
      '',
      '可以设置性能告警阈值，当指标超过阈值时自动触发告警：',
      '- 帧率低于阈值',
      '- 内存超过限制',
      '- CPU 使用率过高',
      '',
      '### 性能分析',
      '',
      '录制一段时间的性能数据，生成性能分析报告，帮助定位性能瓶颈。',
    ],
  },
  'plugin-intro': {
    title: '插件简介',
    content: [
      '## 插件系统简介',
      '',
      'TapDev Studio 采用微内核 + 插件的架构设计，所有功能都通过插件实现。',
      '',
      '### 插件能力',
      '',
      '- 自定义页面和侧边栏入口',
      '- 扩展编辑器功能',
      '- 添加构建步骤',
      '- 集成第三方服务',
      '- 自定义主题和样式',
      '',
      '### 插件类型',
      '',
      '- **官方插件**：由 TapDev 团队维护的核心插件',
      '- **社区插件**：由社区开发者贡献的插件',
      '- **私有插件**：团队内部使用的私有插件',
    ],
  },
  'plugin-dev': {
    title: '插件开发指南',
    content: [
      '## 插件开发指南',
      '',
      '### 创建插件',
      '',
      '```bash',
      'npm create tapdev-plugin@latest my-plugin',
      'cd my-plugin',
      'npm install',
      'npm run dev',
      '```',
      '',
      '### 插件结构',
      '',
      '```',
      'my-plugin/',
      '├── src/',
      '│   ├── index.ts      # 插件入口',
      '│   └── components/   # React 组件',
      '├── package.json',
      '└── tapdev.config.ts  # 插件配置',
      '```',
      '',
      '### 基本示例',
      '',
      '```typescript',
      "import { definePlugin } from '@tapdev/core';",
      '',
      'export default definePlugin({',
      "  id: 'my-plugin',",
      "  name: '我的插件',",
      "  version: '1.0.0',",
      '  activate(ctx) {',
      '    ctx.sidebar.register({',
      "      id: 'my-page',",
      "      title: '我的页面',",
      "      icon: 'star',",
      '      component: MyPage,',
      '    });',
      '  },',
      '});',
      '```',
    ],
  },
  'plugin-api': {
    title: '插件 API',
    content: [
      '## 插件 API 参考',
      '',
      '### PluginContext',
      '',
      '插件激活时传入的上下文对象，包含所有可用的 API。',
      '',
      '#### sidebar',
      '',
      '- `register(item: SidebarItem): void` - 注册侧边栏项目',
      '- `unregister(id: string): void` - 注销侧边栏项目',
      '',
      '#### editor',
      '',
      '- `registerLanguage(lang: LanguageDefinition): void` - 注册语言支持',
      '- `registerCommand(cmd: Command): void` - 注册编辑器命令',
      '',
      '#### build',
      '',
      '- `registerStep(step: BuildStep): void` - 注册构建步骤',
      '- `on(event: string, handler: Function): void` - 监听构建事件',
      '',
      '#### store',
      '',
      '- `getState(): AppState` - 获取全局状态',
      '- `setState(partial: Partial<AppState>): void` - 更新全局状态',
      '- `subscribe(listener: Function): Function` - 订阅状态变化',
    ],
  },
  'plugin-market': {
    title: '插件市场',
    content: [
      '## 插件市场',
      '',
      '### 浏览插件',
      '',
      '在「插件」页面可以浏览所有可用插件，包括：',
      '- 官方推荐插件',
      '- 热门插件排行',
      '- 按分类筛选',
      '- 搜索插件',
      '',
      '### 安装插件',
      '',
      '点击插件卡片上的「安装」按钮即可安装。安装后需要重启应用才能生效。',
      '',
      '### 管理插件',
      '',
      '在「已安装」标签页中可以：',
      '- 查看已安装的插件',
      '- 启用/禁用插件',
      '- 卸载插件',
      '- 更新插件到最新版本',
    ],
  },
  'core-api': {
    title: 'Core API',
    content: [
      '## @tapdev/core API 参考',
      '',
      '### ProjectManager',
      '',
      '项目管理服务，负责项目的创建、导入、配置管理。',
      '',
      '```typescript',
      "import { projectManager } from '@tapdev/core';",
      '',
      '// 获取所有项目',
      'const projects = projectManager.getAllProjects();',
      '',
      '// 创建新项目',
      'const project = await projectManager.createProject({',
      "  name: 'MyGame',",
      "  template: '2d',",
      "  path: '/path/to/project',",
      '});',
      '```',
      '',
      '### BuildService',
      '',
      '构建服务，负责 Unity 构建的调度和管理。',
      '',
      '```typescript',
      "import { buildService } from '@tapdev/core';",
      '',
      '// 开始构建',
      'const task = buildService.startBuild({',
      "  platform: 'webgl',",
      "  version: '1.0.0',",
      '});',
      '',
      '// 获取构建状态',
      'const status = buildService.getTask(task.id);',
      '```',
    ],
  },
  'ui-api': {
    title: 'UI 组件库',
    content: [
      '## @tapdev/ui 组件库',
      '',
      '### 基础组件',
      '',
      '- `Button` - 按钮组件',
      '- `Input` - 输入框组件',
      '- `Checkbox` - 复选框组件',
      '- `Select` - 下拉选择组件',
      '- `Switch` - 开关组件',
      '- `Slider` - 滑块组件',
      '',
      '### 布局组件',
      '',
      '- `Card` - 卡片组件',
      '- `Tabs` - 标签页组件',
      '- `Dialog` - 对话框组件',
      '- `Drawer` - 抽屉组件',
      '- `Dropdown` - 下拉菜单组件',
      '',
      '### 数据展示',
      '',
      '- `Badge` - 徽章组件',
      '- `Progress` - 进度条组件',
      '- `Table` - 表格组件',
      '- `Tree` - 树组件',
      '- `Icon` - 图标组件',
    ],
  },
  'types-api': {
    title: '类型定义',
    content: [
      '## @tapdev/types 类型定义',
      '',
      '### Project',
      '',
      '```typescript',
      'interface Project {',
      '  id: string;',
      '  name: string;',
      '  path: string;',
      '  template: ProjectTemplate;',
      '  createdAt: number;',
      '  lastOpenedAt?: number;',
      '  config: ProjectConfig;',
      '}',
      '```',
      '',
      '### BuildTask',
      '',
      '```typescript',
      'interface BuildTask {',
      '  id: string;',
      '  status: BuildStatus;',
      '  progress: number;',
      '  config: BuildConfig;',
      '  result?: BuildResult;',
      '  startedAt?: number;',
      '  finishedAt?: number;',
      '}',
      '```',
      '',
      '### PluginInfo',
      '',
      '```typescript',
      'interface PluginInfo {',
      '  id: string;',
      '  name: string;',
      '  version: string;',
      '  description: string;',
      '  author?: string;',
      '  activated: boolean;',
      '  installed: boolean;',
      '}',
      '```',
    ],
  },
};

export function DocsPage() {
  const { currentProject } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const allItems = useMemo(() => {
    return DOC_SECTIONS.flatMap((section) =>
      section.items.map((item) => ({ ...item, sectionId: section.id, sectionIcon: section.icon }))
    );
  }, []);

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
      );
    }

    if (activeTab !== 'all') {
      items = items.filter((item) => item.category === activeTab);
    }

    return items;
  }, [allItems, searchQuery, activeTab]);

  const selectedContent = selectedDoc ? DOC_CONTENT[selectedDoc] : null;

  const handleBack = () => {
    setSelectedDoc(null);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">文档中心</h2>
          <p className="text-sm text-text-secondary">
            {selectedDoc ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-text-secondary hover:text-tap-orange transition-colors"
              >
                <Icon name="chevron-left" size={14} />
                返回文档列表
              </button>
            ) : (
              '了解如何使用 TapDev Studio'
            )}
          </p>
        </div>
        {currentProject && (
          <Badge variant="default" className="hidden sm:inline-flex">
            {currentProject.name}
          </Badge>
        )}
      </div>

      {selectedDoc && selectedContent ? (
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl p-6">
            <h1 className="text-2xl font-bold mb-6">{selectedContent.title}</h1>
            <div className="prose prose-invert max-w-none">
              {selectedContent.content.map((line, index) => {
                if (line.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-xl font-semibold mt-8 mb-4 text-text-primary">
                      {line.replace('## ', '')}
                    </h2>
                  );
                }
                if (line.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-lg font-medium mt-6 mb-3 text-text-primary">
                      {line.replace('### ', '')}
                    </h3>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <li key={index} className="ml-4 text-text-secondary">
                      {line.replace('- ', '')}
                    </li>
                  );
                }
                if (line.startsWith('```')) {
                  return null;
                }
                if (line.startsWith('|')) {
                  return null;
                }
                if (line === '') {
                  return <div key={index} className="h-4" />;
                }
                return (
                  <p key={index} className="text-text-secondary leading-relaxed">
                    {line}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl p-4 space-y-6">
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <Input
                placeholder="搜索文档..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="getting-started">快速开始</TabsTrigger>
                <TabsTrigger value="guides">指南</TabsTrigger>
                <TabsTrigger value="api">API</TabsTrigger>
              </TabsList>
            </Tabs>

            {searchQuery && (
              <div className="text-sm text-text-muted">找到 {filteredItems.length} 个相关结果</div>
            )}

            {searchQuery ? (
              <div className="space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <Icon name="search" size={40} className="mx-auto mb-3 text-text-muted" />
                    <p className="text-text-secondary">未找到相关文档</p>
                    <p className="mt-1 text-xs text-text-muted">尝试使用其他关键词搜索</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedDoc(item.id)}
                      className="w-full text-left rounded-lg border border-border p-4 hover:border-tap-orange hover:bg-surface-2 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          name={item.sectionIcon}
                          size={20}
                          className="mt-0.5 text-tap-orange shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-text-primary">{item.title}</div>
                          <div className="mt-1 text-sm text-text-muted line-clamp-2">
                            {item.description}
                          </div>
                        </div>
                        <Icon name="chevron-right" size={16} className="text-text-muted shrink-0" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {DOC_SECTIONS.map((section) => (
                  <Card key={section.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon name={section.icon} size={18} className="text-tap-orange" />
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {section.items.map((item) => (
                          <li key={item.id}>
                            <button
                              onClick={() => setSelectedDoc(item.id)}
                              className="w-full text-left rounded-lg p-3 hover:bg-surface-2 transition-colors group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium group-hover:text-tap-orange transition-colors">
                                  {item.title}
                                </span>
                                <Icon
                                  name="chevron-right"
                                  size={14}
                                  className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                              </div>
                              <p className="mt-1 text-xs text-text-muted line-clamp-2">
                                {item.description}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card className="border-tap-orange/30 bg-tap-orange/5">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tap-orange/20">
                    <Icon name="message-circle" size={20} className="text-tap-orange" />
                  </div>
                  <div>
                    <div className="font-medium">需要帮助？</div>
                    <div className="text-sm text-text-muted">
                      加入我们的社区，获取更多支持和资源
                    </div>
                  </div>
                </div>
                <Button variant="secondary">加入社区</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
