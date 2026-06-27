import { globalEventBus } from './event-bus';
import { generateId as randomUUID } from './utils/uuid';

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
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface TemplateSearchOptions {
  query?: string;
  category?: string;
  framework?: string;
  language?: string;
  sortBy?: 'downloads' | 'stars' | 'updated';
  page?: number;
  pageSize?: number;
}

export class TemplateService {
  private templates: ProjectTemplate[] = [];

  constructor() {
    this.loadTemplates();
  }

  getTemplates(options?: TemplateSearchOptions): ProjectTemplate[] {
    let result = [...this.templates];

    if (options?.query) {
      const query = options.query.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query)) ||
        t.features.some(f => f.toLowerCase().includes(query))
      );
    }

    if (options?.category) {
      result = result.filter(t => t.category === options.category);
    }

    if (options?.framework) {
      result = result.filter(t => t.framework.toLowerCase() === options.framework!.toLowerCase());
    }

    if (options?.language) {
      result = result.filter(t => t.languages.some(l => l.toLowerCase() === options.language!.toLowerCase()));
    }

    switch (options?.sortBy) {
      case 'downloads':
        result.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'stars':
        result.sort((a, b) => b.stars - a.stars);
        break;
      case 'updated':
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return result.slice(start, end);
  }

  getCategories(): TemplateCategory[] {
    const categories = new Map<string, TemplateCategory>();
    
    this.templates.forEach(template => {
      if (!categories.has(template.category)) {
        categories.set(template.category, {
          id: template.category,
          name: this.getCategoryDisplayName(template.category),
        });
      }
    });

    return Array.from(categories.values());
  }

  getFrameworks(): string[] {
    const frameworks = new Set(this.templates.map(t => t.framework));
    return Array.from(frameworks).sort();
  }

  getLanguages(): string[] {
    const languages = new Set<string>();
    this.templates.forEach(t => t.languages.forEach(l => languages.add(l)));
    return Array.from(languages).sort();
  }

  getTemplateById(templateId: string): ProjectTemplate | undefined {
    return this.templates.find(t => t.id === templateId);
  }

  async createProjectFromTemplate(templateId: string, projectName: string, destination: string): Promise<{ success: boolean; projectId: string }> {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return { success: false, projectId: '' };
    }

    const projectId = randomUUID();
    
    globalEventBus.emit({ 
      type: 'template:createProject', 
      payload: { templateId, projectName, destination, projectId } 
    });

    await this.delay(1000);

    globalEventBus.emit({ 
      type: 'template:projectCreated', 
      payload: { projectId, templateId, projectName } 
    });

    return { success: true, projectId };
  }

  async searchTemplates(query: string): Promise<ProjectTemplate[]> {
    return this.getTemplates({ query });
  }

  private loadTemplates(): void {
    this.templates = [
      {
        id: 'tapdev-empty-project',
        name: '空项目',
        description: '最基础的项目模板，适合从零开始',
        category: 'starter',
        tags: ['empty', 'minimal', 'vanilla'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 2341,
        stars: 89,
        createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Vanilla',
        languages: ['JavaScript', 'TypeScript'],
        features: ['基础项目结构', 'TapTap SDK 集成', '构建配置'],
        compatibleVersions: ['0.2.0', '0.3.0'],
      },
      {
        id: 'tapdev-phaser-game',
        name: 'Phaser 游戏',
        description: '基于 Phaser.js 的 2D 游戏模板',
        category: 'game-2d',
        tags: ['phaser', '2d', 'game'],
        author: 'TapDev Team',
        version: '1.1.0',
        downloads: 1876,
        stars: 124,
        createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Phaser',
        languages: ['TypeScript'],
        features: ['Phaser 框架', '游戏场景管理', 'TapTap 社交功能'],
        compatibleVersions: ['0.2.0', '0.3.0'],
      },
      {
        id: 'tapdev-threejs-game',
        name: 'Three.js 游戏',
        description: '基于 Three.js 的 3D 游戏模板',
        category: 'game-3d',
        tags: ['threejs', '3d', 'game'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 789,
        stars: 67,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Three.js',
        languages: ['TypeScript'],
        features: ['Three.js 框架', '3D 场景', 'WebGL 渲染'],
        compatibleVersions: ['0.2.0', '0.3.0'],
      },
      {
        id: 'tapdev-react-game',
        name: 'React 游戏',
        description: '基于 React 的游戏模板',
        category: 'framework',
        tags: ['react', 'component', 'ui'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 1234,
        stars: 56,
        createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'React',
        languages: ['TypeScript', 'JavaScript'],
        features: ['React 组件', '状态管理', '现代化 UI'],
        compatibleVersions: ['0.2.0', '0.3.0'],
      },
      {
        id: 'tapdev-puzzle-game',
        name: '消除类游戏',
        description: '三消游戏模板，适合休闲游戏开发',
        category: 'game-2d',
        tags: ['puzzle', 'match3', 'casual'],
        author: 'TapDev Team',
        version: '1.0.0',
        downloads: 543,
        stars: 34,
        createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Phaser',
        languages: ['TypeScript'],
        features: ['三消逻辑', '关卡系统', '计分系统'],
        compatibleVersions: ['0.2.0', '0.3.0'],
      },
      {
        id: 'tapdev-arcade-game',
        name: '街机游戏',
        description: '经典街机风格游戏模板',
        category: 'game-2d',
        tags: ['arcade', 'retro', 'pixel'],
        author: 'TapDev Team',
        version: '0.9.0',
        downloads: 421,
        stars: 28,
        createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
        license: 'MIT',
        framework: 'Phaser',
        languages: ['TypeScript'],
        features: ['像素风格', '街机物理', '高分系统'],
        compatibleVersions: ['0.2.0', '0.3.0'],
      },
    ];
  }

  private getCategoryDisplayName(category: string): string {
    const map: Record<string, string> = {
      starter: '入门',
      'game-2d': '2D 游戏',
      'game-3d': '3D 游戏',
      framework: '框架',
    };
    return map[category] || category;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const templateService = new TemplateService();