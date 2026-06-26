import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

export interface VirtualFile {
  path: string;
  name: string;
  content?: string;
  type: 'file' | 'directory';
  children?: VirtualFile[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  thumbnail?: string;
  downloads: number;
  stars: number;
  createdAt: number;
  updatedAt: number;
  license: string;
  framework: string;
  languages: string[];
  features: string[];
  compatibleVersions: string[];
  fileStructure?: VirtualFile[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  templateCount: number;
}

export interface TemplateSearchOptions {
  query?: string;
  category?: string;
  framework?: string;
  language?: string;
  sortBy?: 'downloads' | 'stars' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface TemplateSearchResult {
  templates: ProjectTemplate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateProjectOptions {
  templateId: string;
  projectName: string;
  destination?: string;
  variables?: Record<string, string>;
  onProgress?: (progress: number, stage: string) => void;
}

export interface CreatedProject {
  projectId: string;
  projectName: string;
  templateId: string;
  files: VirtualFile[];
  createdAt: number;
}

export class TemplateService {
  private templates: ProjectTemplate[] = [];
  private categories: TemplateCategory[] = [];
  private createdProjects = new Map<string, CreatedProject>();

  constructor() {
    this.loadTemplates();
    this.loadCategories();
  }

  getTemplates(options?: TemplateSearchOptions): TemplateSearchResult {
    let result = [...this.templates];

    if (options?.query) {
      const query = options.query.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          t.features.some((f) => f.toLowerCase().includes(query)) ||
          t.framework.toLowerCase().includes(query)
      );
    }

    if (options?.category) {
      result = result.filter((t) => t.category === options.category);
    }

    if (options?.framework) {
      result = result.filter((t) => t.framework.toLowerCase() === options.framework!.toLowerCase());
    }

    if (options?.language) {
      result = result.filter((t) =>
        t.languages.some((l) => l.toLowerCase() === options.language!.toLowerCase())
      );
    }

    const sortBy = options?.sortBy || 'downloads';
    const sortOrder = options?.sortOrder || 'desc';

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'downloads':
          comparison = b.downloads - a.downloads;
          break;
        case 'stars':
          comparison = b.stars - a.stars;
          break;
        case 'updated':
          comparison = b.updatedAt - a.updatedAt;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    const total = result.length;
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const totalPages = Math.ceil(total / pageSize);

    return {
      templates: result.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  getCategories(): TemplateCategory[] {
    return this.categories;
  }

  getCategoryById(categoryId: string): TemplateCategory | undefined {
    return this.categories.find((c) => c.id === categoryId);
  }

  getFrameworks(): string[] {
    const frameworks = new Set(this.templates.map((t) => t.framework));
    return Array.from(frameworks).sort();
  }

  getLanguages(): string[] {
    const languages = new Set<string>();
    this.templates.forEach((t) => t.languages.forEach((l) => languages.add(l)));
    return Array.from(languages).sort();
  }

  getTemplateById(templateId: string): ProjectTemplate | undefined {
    return this.templates.find((t) => t.id === templateId);
  }

  getTemplateDetail(templateId: string): ProjectTemplate | undefined {
    return this.getTemplateById(templateId);
  }

  async createProjectFromTemplate(
    templateId: string,
    projectName: string,
    destination?: string
  ): Promise<{ success: boolean; projectId: string }> {
    const result = await this.createProject({ templateId, projectName, destination });
    return { success: true, projectId: result.projectId };
  }

  async createProject(options: CreateProjectOptions): Promise<CreatedProject> {
    const template = this.getTemplateById(options.templateId);
    if (!template) {
      throw new Error(`模板不存在: ${options.templateId}`);
    }

    const projectId = randomUUID();
    const variables: Record<string, string> = {
      projectName: options.projectName,
      projectId,
      ...options.variables,
    };

    globalEventBus.emit({
      type: 'template:createProject',
      payload: { ...options, projectId },
    });

    if (options.onProgress) {
      options.onProgress(10, '正在初始化项目...');
      await this.delay(100);
      options.onProgress(30, '正在生成文件结构...');
      await this.delay(100);
      options.onProgress(60, '正在配置依赖...');
      await this.delay(100);
      options.onProgress(80, '正在写入文件...');
      await this.delay(100);
      options.onProgress(100, '项目创建完成');
    }

    const files = template.fileStructure
      ? this.applyTemplateVariables(template.fileStructure, variables)
      : this.generateDefaultFileStructure(template, variables);

    const project: CreatedProject = {
      projectId,
      projectName: options.projectName,
      templateId: options.templateId,
      files,
      createdAt: Date.now(),
    };

    this.createdProjects.set(projectId, project);

    globalEventBus.emit({
      type: 'template:projectCreated',
      payload: project,
    });

    return project;
  }

  getCreatedProject(projectId: string): CreatedProject | undefined {
    return this.createdProjects.get(projectId);
  }

  getAllCreatedProjects(): CreatedProject[] {
    return Array.from(this.createdProjects.values());
  }

  getProjectFiles(projectId: string): VirtualFile[] | undefined {
    return this.createdProjects.get(projectId)?.files;
  }

  getProjectFileContent(projectId: string, filePath: string): string | undefined {
    const project = this.createdProjects.get(projectId);
    if (!project) return undefined;
    return this.findFileContent(project.files, filePath);
  }

  async searchTemplates(
    query: string,
    options?: Omit<TemplateSearchOptions, 'query'>
  ): Promise<TemplateSearchResult> {
    return this.getTemplates({ ...options, query });
  }

  getPopularTemplates(limit = 10): ProjectTemplate[] {
    return [...this.templates].sort((a, b) => b.downloads - a.downloads).slice(0, limit);
  }

  getNewestTemplates(limit = 10): ProjectTemplate[] {
    return [...this.templates].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  getFeaturedTemplates(): ProjectTemplate[] {
    return this.templates.filter((t) => (t as any).featured);
  }

  getTemplatesByCategory(category: string): ProjectTemplate[] {
    return this.templates.filter((t) => t.category === category);
  }

  private applyTemplateVariables(
    files: VirtualFile[],
    variables: Record<string, string>
  ): VirtualFile[] {
    return files.map((file) => {
      const newFile = { ...file };
      newFile.name = this.replaceVariables(file.name, variables);
      newFile.path = this.replaceVariables(file.path, variables);

      if (file.type === 'file') {
        newFile.content = this.replaceVariables(file.content || '', variables);
      }

      if (file.children) {
        newFile.children = this.applyTemplateVariables(file.children, variables);
      }

      return newFile;
    });
  }

  private replaceVariables(str: string, variables: Record<string, string>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
  }

  private findFileContent(files: VirtualFile[], path: string): string | undefined {
    for (const file of files) {
      if (file.path === path && file.type === 'file') {
        return file.content;
      }
      if (file.children) {
        const found = this.findFileContent(file.children, path);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  private generateDefaultFileStructure(
    template: ProjectTemplate,
    variables: Record<string, string>
  ): VirtualFile[] {
    const projectName = variables.projectName || 'my-project';
    const pkg = {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: template.scripts || {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: template.dependencies || {},
      devDependencies: template.devDependencies || {},
    };

    const files: VirtualFile[] = [
      {
        path: 'package.json',
        name: 'package.json',
        type: 'file',
        content: JSON.stringify(pkg, null, 2),
      },
      {
        path: 'README.md',
        name: 'README.md',
        type: 'file',
        content: `# ${projectName}\n\n基于 ${template.name} 模板创建\n\n## 安装\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## 开发\n\n\`\`\`bash\nnpm run dev\n\`\`\`\n\n## 构建\n\n\`\`\`bash\nnpm run build\n\`\`\`\n`,
      },
      {
        path: '.gitignore',
        name: '.gitignore',
        type: 'file',
        content: `node_modules\ndist\ndist-ssr\n.local\n.env\n.env.*\n!.env.example\n*.log\n.DS_Store\n`,
      },
      {
        path: 'src',
        name: 'src',
        type: 'directory',
        children: [
          {
            path: 'src/main.ts',
            name: 'main.ts',
            type: 'file',
            content: `console.log('${projectName} 已启动');\n`,
          },
          {
            path: 'src/App.ts',
            name: 'App.ts',
            type: 'file',
            content: `export class App {\n  constructor() {\n    console.log('App 初始化');\n  }\n\n  start(): void {\n    console.log('应用启动');\n  }\n}\n`,
          },
          {
            path: 'src/styles',
            name: 'styles',
            type: 'directory',
            children: [
              {
                path: 'src/styles/main.css',
                name: 'main.css',
                type: 'file',
                content: `:root {\n  --color-primary: #5B5FFF;\n  --color-background: #ffffff;\n  --color-text: #333333;\n}\n\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  background: var(--color-background);\n  color: var(--color-text);\n}\n`,
              },
            ],
          },
          {
            path: 'src/assets',
            name: 'assets',
            type: 'directory',
            children: [],
          },
        ],
      },
      {
        path: 'public',
        name: 'public',
        type: 'directory',
        children: [
          {
            path: 'public/favicon.svg',
            name: 'favicon.svg',
            type: 'file',
            content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n  <rect width="32" height="32" rx="6" fill="#5B5FFF"/>\n  <text x="16" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold">T</text>\n</svg>\n`,
          },
        ],
      },
      {
        path: 'tsconfig.json',
        name: 'tsconfig.json',
        type: 'file',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              module: 'ESNext',
              moduleResolution: 'bundler',
              strict: true,
              jsx: 'preserve',
              sourceMap: true,
              resolveJsonModule: true,
              esModuleInterop: true,
              lib: ['ES2020', 'DOM', 'DOM.Iterable'],
              skipLibCheck: true,
              outDir: 'dist',
            },
            include: ['src/**/*.ts', 'src/**/*.d.ts'],
          },
          null,
          2
        ),
      },
    ];

    return files;
  }

  private loadTemplates(): void {
    const now = Date.now();

    this.templates = [
      {
        id: 'tapdev-empty-project',
        name: '空项目',
        description: '最基础的项目模板，适合从零开始构建你的游戏或应用',
        category: 'starter',
        tags: ['empty', 'minimal', 'vanilla', '基础'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 23410,
        stars: 189,
        createdAt: now - 90 * 24 * 60 * 60 * 1000,
        updatedAt: now - 15 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Vanilla',
        languages: ['JavaScript', 'TypeScript'],
        features: ['基础项目结构', 'TapTap SDK 集成', '构建配置', 'TypeScript 支持'],
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        dependencies: {},
        devDependencies: {
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        fileStructure: [
          {
            path: 'package.json',
            name: 'package.json',
            type: 'file',
            content: `{\n  "name": "{{projectName}}",\n  "version": "0.1.0",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },\n  "devDependencies": {\n    "typescript": "^5.0.0",\n    "vite": "^5.0.0"\n  }\n}\n`,
          },
          {
            path: 'index.html',
            name: 'index.html',
            type: 'file',
            content: `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>{{projectName}}</title>\n</head>\n<body>\n  <div id="app"></div>\n  <script type="module" src="/src/main.ts"></script>\n</body>\n</html>\n`,
          },
          {
            path: 'src/main.ts',
            name: 'main.ts',
            type: 'file',
            content: `import './style.css';\n\nconsole.log('{{projectName}} 已启动');\n\ndocument.querySelector('#app')!.innerHTML = \`\n  <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">\n    <h1>{{projectName}}</h1>\n    <p>项目已创建成功，开始你的开发之旅吧！</p>\n  </div>\n\`;\n`,
          },
          {
            path: 'src/style.css',
            name: 'style.css',
            type: 'file',
            content: `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  background: #f5f5f5;\n  color: #333;\n}\n`,
          },
          {
            path: 'tsconfig.json',
            name: 'tsconfig.json',
            type: 'file',
            content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "strict": true,\n    "sourceMap": true,\n    "resolveJsonModule": true,\n    "esModuleInterop": true,\n    "lib": ["ES2020", "DOM", "DOM.Iterable"],\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}\n`,
          },
          {
            path: 'README.md',
            name: 'README.md',
            type: 'file',
            content: `# {{projectName}}\n\n## 开始使用\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
          },
          {
            path: '.gitignore',
            name: '.gitignore',
            type: 'file',
            content: `node_modules\ndist\n*.log\n.DS_Store\n`,
          },
        ],
      },
      {
        id: 'tapdev-phaser-game',
        name: 'Phaser 游戏',
        description: '基于 Phaser.js 的 2D 游戏模板，包含场景管理、资源加载和游戏循环',
        category: 'game-2d',
        tags: ['phaser', '2d', 'game', '游戏', '休闲'],
        author: 'TapDev Team',
        version: '1.2.0',
        downloads: 18760,
        stars: 324,
        createdAt: now - 75 * 24 * 60 * 60 * 1000,
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Phaser',
        languages: ['TypeScript'],
        features: ['Phaser 框架', '游戏场景管理', '资源加载', 'TapTap 社交功能', '物理引擎'],
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        dependencies: {
          phaser: '^3.70.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      },
      {
        id: 'tapdev-threejs-game',
        name: 'Three.js 3D 游戏',
        description: '基于 Three.js 的 3D 游戏模板，包含 3D 场景、相机控制和光照系统',
        category: 'game-3d',
        tags: ['threejs', '3d', 'game', 'webgl', '游戏'],
        author: 'TapDev Team',
        version: '1.1.0',
        downloads: 9890,
        stars: 267,
        createdAt: now - 60 * 24 * 60 * 60 * 1000,
        updatedAt: now - 8 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Three.js',
        languages: ['TypeScript'],
        features: ['Three.js 框架', '3D 场景', 'WebGL 渲染', '轨道控制', '光照系统'],
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        dependencies: {
          three: '^0.160.0',
        },
        devDependencies: {
          '@types/three': '^0.160.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      },
      {
        id: 'tapdev-react-game',
        name: 'React 游戏 UI',
        description: '基于 React 的游戏 UI 模板，适合构建游戏界面和管理系统',
        category: 'framework',
        tags: ['react', 'component', 'ui', '界面', '管理后台'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 12340,
        stars: 156,
        createdAt: now - 50 * 24 * 60 * 60 * 1000,
        updatedAt: now - 10 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'React',
        languages: ['TypeScript', 'JavaScript'],
        features: ['React 组件', '状态管理', '现代化 UI', '路由系统', 'Hook 支持'],
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
        devDependencies: {
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          '@vitejs/plugin-react': '^4.0.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      },
      {
        id: 'tapdev-puzzle-game',
        name: '三消游戏',
        description: '完整的三消游戏模板，包含关卡系统、计分系统和动画效果',
        category: 'game-2d',
        tags: ['puzzle', 'match3', 'casual', '消除', '休闲游戏'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 8543,
        stars: 234,
        createdAt: now - 40 * 24 * 60 * 60 * 1000,
        updatedAt: now - 3 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Phaser',
        languages: ['TypeScript'],
        features: ['三消逻辑', '关卡系统', '计分系统', '道具系统', '排行榜'],
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
      },
      {
        id: 'tapdev-arcade-game',
        name: '街机游戏',
        description: '经典街机风格游戏模板，包含玩家控制、敌人 AI 和碰撞检测',
        category: 'game-2d',
        tags: ['arcade', 'retro', 'pixel', '街机', '像素'],
        author: 'TapDev Team',
        version: '0.9.0',
        downloads: 6421,
        stars: 198,
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now - 2 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Phaser',
        languages: ['TypeScript'],
        features: ['像素风格', '街机物理', '高分系统', '多关卡', 'Boss 战'],
        compatibleVersions: ['0.3.0', '0.4.0'],
      },
      {
        id: 'tapdev-platformer',
        name: '平台跳跃游戏',
        description: '2D 平台跳跃游戏模板，包含角色控制、关卡设计和收集系统',
        category: 'game-2d',
        tags: ['platformer', '2d', 'jump', '平台', '跳跃'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 5678,
        stars: 178,
        createdAt: now - 35 * 24 * 60 * 60 * 1000,
        updatedAt: now - 7 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Phaser',
        languages: ['TypeScript'],
        features: ['平台物理', '角色动画', '关卡编辑器', '收集品', '存档系统'],
        compatibleVersions: ['0.3.0', '0.4.0'],
      },
      {
        id: 'tapdev-vue-dashboard',
        name: 'Vue 管理面板',
        description: '基于 Vue 3 的游戏管理后台模板，包含常用组件和布局',
        category: 'framework',
        tags: ['vue', 'dashboard', 'admin', '管理', '后台'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 4321,
        stars: 145,
        createdAt: now - 25 * 24 * 60 * 60 * 1000,
        updatedAt: now - 4 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Vue',
        languages: ['TypeScript', 'Vue'],
        features: ['Vue 3 组合式 API', '路由系统', '状态管理', '图表组件', '权限控制'],
        compatibleVersions: ['0.3.0', '0.4.0'],
        dependencies: {
          vue: '^3.4.0',
          'vue-router': '^4.0.0',
          pinia: '^2.0.0',
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^5.0.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      },
      {
        id: 'tapdev-cocos-creator',
        name: 'Cocos Creator',
        description: 'Cocos Creator 游戏项目模板，支持 2D 和 3D 游戏开发',
        category: 'game-3d',
        tags: ['cocos', 'creator', '游戏引擎', '跨平台'],
        author: 'TapDev Team',
        version: '0.8.0',
        downloads: 3456,
        stars: 112,
        createdAt: now - 20 * 24 * 60 * 60 * 1000,
        updatedAt: now - 1 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Cocos Creator',
        languages: ['TypeScript', 'JavaScript'],
        features: ['Cocos Creator 3.x', '2D/3D 支持', '资源管理', '动画系统', '物理引擎'],
        compatibleVersions: ['0.3.0', '0.4.0'],
      },
      {
        id: 'tapdev-multiplayer',
        name: '多人在线游戏',
        description: '实时多人在线游戏模板，包含房间系统、同步机制和服务器架构',
        category: 'game-2d',
        tags: ['multiplayer', 'online', 'websocket', '多人', '在线'],
        author: 'TapDev Team',
        version: '0.7.0',
        downloads: 2890,
        stars: 156,
        createdAt: now - 15 * 24 * 60 * 60 * 1000,
        updatedAt: now - 6 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Phaser',
        languages: ['TypeScript'],
        features: ['实时同步', '房间系统', 'WebSocket', '匹配机制', '服务器端'],
        compatibleVersions: ['0.3.0', '0.4.0'],
      },
      {
        id: 'tapdev-taptap-mini',
        name: 'TapTap 小游戏',
        description: '专为 TapTap 小游戏平台优化的项目模板，快速上架 TapTap',
        category: 'starter',
        tags: ['taptap', 'minigame', '小游戏', '上架', '发布'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 15670,
        stars: 289,
        createdAt: now - 45 * 24 * 60 * 60 * 1000,
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Vanilla',
        languages: ['TypeScript', 'JavaScript'],
        features: ['TapTap SDK', '排行榜', '成就系统', '分享功能', '支付集成'],
        compatibleVersions: ['0.2.0', '0.3.0', '0.4.0'],
      },
      {
        id: 'tapdev-wechat-mini',
        name: '微信小游戏',
        description: '微信小游戏项目模板，快速适配微信小游戏平台',
        category: 'starter',
        tags: ['wechat', 'minigame', '微信', '小游戏', '发布'],
        author: 'TapDev Team',
        version: '0.9.0',
        downloads: 7890,
        stars: 167,
        createdAt: now - 35 * 24 * 60 * 60 * 1000,
        updatedAt: now - 10 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Vanilla',
        languages: ['TypeScript', 'JavaScript'],
        features: ['微信适配', '开放数据域', '排行榜', '分享', '广告集成'],
        compatibleVersions: ['0.3.0', '0.4.0'],
      },
    ];
  }

  private loadCategories(): void {
    const categoryMap = new Map<string, number>();
    this.templates.forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1);
    });

    const categoryMeta: Record<string, { name: string; icon: string; description: string }> = {
      starter: { name: '入门模板', icon: 'rocket', description: '快速开始的基础模板' },
      'game-2d': { name: '2D 游戏', icon: 'gamepad-2', description: '2D 游戏开发模板' },
      'game-3d': { name: '3D 游戏', icon: 'box', description: '3D 游戏开发模板' },
      framework: { name: '框架集成', icon: 'layers', description: '基于主流框架的模板' },
    };

    this.categories = Array.from(categoryMap.entries()).map(([id, count]) => ({
      id,
      name: categoryMeta[id]?.name || id,
      icon: categoryMeta[id]?.icon,
      description: categoryMeta[id]?.description,
      templateCount: count,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const templateService = new TemplateService();
