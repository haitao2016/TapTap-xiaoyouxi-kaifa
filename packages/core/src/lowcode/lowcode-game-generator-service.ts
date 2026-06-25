// 低代码游戏生成器
// 通过表单配置快速生成完整游戏

import { globalEventBus } from '../core/event-bus';

// 游戏类型
export type GameGenre = 'platformer' | 'puzzle' | 'racing' | 'shooter' | 'rpg' | 'strategy' | 'casual' | 'arcade' | 'simulation' | 'fighting';

// 游戏配置
export interface GameConfig {
  // 基础信息
  title: string;
  description: string;
  genre: GameGenre;
  // 美术
  artStyle: 'pixel' | 'cartoon' | 'realistic' | 'flat' | 'low-poly' | 'anime';
  // 视口
  viewport: { width: number; height: number };
  // 玩法参数
  gameplay: {
    playerSpeed: number;
    difficulty: 'easy' | 'normal' | 'hard' | 'expert';
    lives: number;
    scoreSystem: boolean;
    timeLimit?: number;
    levels: number;
  };
  // 元素
  elements: {
    player: { type: string; abilities: string[] };
    enemies: { type: string; count: number; behavior: string }[];
    collectibles: { type: string; value: number }[];
    obstacles: { type: string; count: number }[];
  };
  // 控件
  controls: 'touch' | 'keyboard' | 'both' | 'auto';
  // 平台
  platforms: ('web' | 'ios' | 'android' | 'taptap')[];
  // AI 辅助
  aiAssistance: boolean;
  customization: Record<string, any>;
}

// 生成的项目
export interface GeneratedProject {
  id: string;
  config: GameConfig;
  files: { path: string; content: string }[];
  dependencies: { name: string; version: string }[];
  // 生成进度
  progress: number;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  error?: string;
  createdAt: number;
}

// 游戏模板
export interface GameTemplate {
  id: string;
  name: string;
  genre: GameGenre;
  description: string;
  thumbnail?: string;
  preview: string;
  defaultConfig: Partial<GameConfig>;
  // 模板变量
  variables: { name: string; type: 'string' | 'number' | 'boolean' | 'color'; defaultValue: any; description: string }[];
}

class LowCodeGameGeneratorService {
  private templates = new Map<string, GameTemplate>();
  private projects = new Map<string, GeneratedProject>();
  private listeners = new Set<(event: string, data: any) => void>();

  constructor() {
    this.registerBuiltInTemplates();
  }

  // 注册模板
  private registerBuiltInTemplates(): void {
    const templates: GameTemplate[] = [
      {
        id: 'platformer-basic',
        name: '经典平台跳跃',
        genre: 'platformer',
        description: '横版平台跳跃游戏，类似超级马里奥',
        preview: 'platformer.gif',
        defaultConfig: {
          title: '我的平台跳跃',
          genre: 'platformer',
          artStyle: 'pixel',
          viewport: { width: 800, height: 600 },
          gameplay: { playerSpeed: 5, difficulty: 'normal', lives: 3, scoreSystem: true, levels: 5 },
          elements: {
            player: { type: 'hero', abilities: ['jump', 'double-jump'] },
            enemies: [
              { type: 'slime', count: 10, behavior: 'patrol' },
              { type: 'bird', count: 5, behavior: 'fly' }
            ],
            collectibles: [{ type: 'coin', value: 10 }, { type: 'gem', value: 50 }],
            obstacles: [{ type: 'spike', count: 20 }, { type: 'pit', count: 5 }]
          },
          controls: 'both',
          platforms: ['web', 'taptap']
        },
        variables: [
          { name: 'gravity', type: 'number', defaultValue: 0.8, description: '重力大小' },
          { name: 'jumpForce', type: 'number', defaultValue: -15, description: '跳跃力度' },
          { name: 'playerColor', type: 'color', defaultValue: '#FF6B6B', description: '主角颜色' }
        ]
      },
      {
        id: 'match3',
        name: '三消游戏',
        genre: 'puzzle',
        description: '经典三消玩法',
        defaultConfig: {
          title: '宝石三消',
          genre: 'puzzle',
          artStyle: 'cartoon',
          viewport: { width: 600, height: 800 },
          gameplay: { playerSpeed: 0, difficulty: 'normal', lives: 0, scoreSystem: true, levels: 50, timeLimit: 60 },
          elements: {
            player: { type: 'cursor', abilities: ['swap'] },
            enemies: [],
            collectibles: [{ type: 'gem', value: 10 }],
            obstacles: []
          },
          controls: 'touch',
          platforms: ['web', 'ios', 'android', 'taptap']
        },
        variables: [
          { name: 'gridSize', type: 'number', defaultValue: 8, description: '网格大小' },
          { name: 'gemTypes', type: 'number', defaultValue: 6, description: '宝石种类' }
        ]
      },
      {
        id: 'endless-runner',
        name: '无尽跑酷',
        genre: 'arcade',
        description: '无尽的跑酷游戏',
        defaultConfig: {
          title: '疾风跑酷',
          genre: 'arcade',
          artStyle: 'flat',
          viewport: { width: 480, height: 800 },
          gameplay: { playerSpeed: 8, difficulty: 'normal', lives: 1, scoreSystem: true, levels: 0 },
          elements: {
            player: { type: 'runner', abilities: ['jump', 'slide'] },
            enemies: [{ type: 'obstacle', count: 100, behavior: 'static' }],
            collectibles: [{ type: 'coin', value: 1 }],
            obstacles: [{ type: 'barrier', count: 100 }]
          },
          controls: 'touch',
          platforms: ['web', 'ios', 'android', 'taptap']
        },
        variables: [
          { name: 'baseSpeed', type: 'number', defaultValue: 8, description: '基础速度' },
          { name: 'speedIncrease', type: 'number', defaultValue: 0.01, description: '速度增加' }
        ]
      }
    ];

    for (const t of templates) {
      this.templates.set(t.id, t);
    }
  }

  // 从模板生成
  async generateFromTemplate(templateId: string, config: Partial<GameConfig>, onProgress?: (progress: number) => void): Promise<GeneratedProject> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('模板不存在');

    const fullConfig: GameConfig = {
      title: config.title || template.defaultConfig.title || '未命名游戏',
      description: config.description || '',
      genre: template.genre,
      artStyle: config.artStyle || template.defaultConfig.artStyle || 'pixel',
      viewport: config.viewport || template.defaultConfig.viewport || { width: 800, height: 600 },
      gameplay: { ...(template.defaultConfig.gameplay || {}), ...(config.gameplay || {}) } as GameConfig['gameplay'],
      elements: { ...(template.defaultConfig.elements || {}), ...(config.elements || {}) } as GameConfig['elements'],
      controls: config.controls || template.defaultConfig.controls || 'both',
      platforms: config.platforms || template.defaultConfig.platforms || ['web'],
      aiAssistance: config.aiAssistance ?? true,
      customization: { ...(template.defaultConfig.customization || {}), ...(config.customization || {}) }
    };

    const project: GeneratedProject = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      config: fullConfig,
      files: [],
      dependencies: [],
      progress: 0,
      status: 'generating',
      createdAt: Date.now()
    };

    this.projects.set(project.id, project);
    this.notify('generation:started', project);

    try {
      // 1. 准备项目结构
      project.progress = 0.1;
      onProgress?.(0.1);
      await this.delay(300);
      this.notify('generation:progress', project);

      // 2. 生成核心文件
      project.progress = 0.3;
      onProgress?.(0.3);
      const coreFiles = this.generateCoreFiles(fullConfig);
      project.files.push(...coreFiles);
      await this.delay(300);

      // 3. 生成游戏场景
      project.progress = 0.5;
      onProgress?.(0.5);
      const sceneFiles = this.generateSceneFiles(fullConfig);
      project.files.push(...sceneFiles);
      await this.delay(300);

      // 4. 生成玩家和敌人
      project.progress = 0.7;
      onProgress?.(0.7);
      const entityFiles = this.generateEntityFiles(fullConfig);
      project.files.push(...entityFiles);
      await this.delay(300);

      // 5. 生成 UI
      project.progress = 0.85;
      onProgress?.(0.85);
      const uiFiles = this.generateUIFiles(fullConfig);
      project.files.push(...uiFiles);
      await this.delay(300);

      // 6. 生成配置文件
      project.progress = 0.95;
      onProgress?.(0.95);
      const configFiles = this.generateConfigFiles(fullConfig);
      project.files.push(...configFiles);
      await this.delay(200);

      // 7. 完成
      project.dependencies = this.getDependencies(fullConfig);
      project.progress = 1.0;
      project.status = 'ready';
      this.notify('generation:completed', project);
    } catch (e: any) {
      project.status = 'failed';
      project.error = e.message;
      this.notify('generation:failed', project);
    }

    return project;
  }

  // 生成核心文件
  private generateCoreFiles(config: GameConfig): { path: string; content: string }[] {
    return [
      {
        path: 'src/main.ts',
        content: `// ${config.title} - 主入口
import { Game } from './core/Game';

const game = new Game({
  title: '${config.title}',
  width: ${config.viewport.width},
  height: ${config.viewport.height},
  artStyle: '${config.artStyle}'
});

window.addEventListener('load', () => {
  game.start();
});
`
      },
      {
        path: 'src/core/Game.ts',
        content: `export interface GameOptions {
  title: string;
  width: number;
  height: number;
  artStyle: string;
}

export class Game {
  title: string;
  width: number;
  height: number;
  artStyle: string;
  scene: any;
  isRunning = false;

  constructor(options: GameOptions) {
    this.title = options.title;
    this.width = options.width;
    this.height = options.height;
    this.artStyle = options.artStyle;
  }

  start() {
    this.isRunning = true;
    console.log(\`游戏 \${this.title} 启动\`);
  }

  stop() {
    this.isRunning = false;
  }
}
`
      }
    ];
  }

  // 生成场景文件
  private generateSceneFiles(config: GameConfig): { path: string; content: string }[] {
    return [
      {
        path: 'src/scenes/MainScene.ts',
        content: `// 主场景
export class MainScene {
  load() {
    // 加载资源
  }

  update(dt: number) {
    // 更新游戏逻辑
  }

  render(ctx: CanvasRenderingContext2D) {
    // 渲染
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, ${config.viewport.width}, ${config.viewport.height});
  }
}
`
      }
    ];
  }

  // 生成实体文件
  private generateEntityFiles(config: GameConfig): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [
      {
        path: 'src/entities/Player.ts',
        content: `// 玩家
export class Player {
  x = 100;
  y = 100;
  speed = ${config.gameplay.playerSpeed};
  lives = ${config.gameplay.lives};
  abilities = ${JSON.stringify(config.elements.player.abilities)};

  update(dt: number) {
    // 玩家更新
  }

  jump() {
    // 跳跃逻辑
  }
}
`
      }
    ];

    if (config.elements.enemies.length > 0) {
      files.push({
        path: 'src/entities/Enemy.ts',
        content: `// 敌人基类
export class Enemy {
  x = 0;
  y = 0;
  type: string;
  behavior: string;

  constructor(type: string, behavior: string) {
    this.type = type;
    this.behavior = behavior;
  }

  update(dt: number) {
    // 敌人 AI
  }
}
`
      });
    }

    return files;
  }

  // 生成 UI 文件
  private generateUIFiles(config: GameConfig): { path: string; content: string }[] {
    return [
      {
        path: 'src/ui/HUD.ts',
        content: `// 游戏 UI
export class HUD {
  score = 0;
  lives = ${config.gameplay.lives};
  level = 1;

  update() {
    // 更新 UI
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.fillText(\`分数: \${this.score}\`, 10, 30);
    ctx.fillText(\`生命: \${this.lives}\`, 10, 60);
  }
}
`
      }
    ];
  }

  // 生成配置文件
  private generateConfigFiles(config: GameConfig): { path: string; content: string }[] {
    return [
      {
        path: 'tapdev.config.json',
        content: JSON.stringify({
          name: config.title,
          description: config.description,
          genre: config.genre,
          viewport: config.viewport,
          platforms: config.platforms
        }, null, 2)
      },
      {
        path: 'README.md',
        content: `# ${config.title}

${config.description}

## 游戏类型
${config.genre}

## 视口
${config.viewport.width} x ${config.viewport.height}

## 支持平台
${config.platforms.join(', ')}

## 运行
\`\`\`bash
npm install
npm run dev
\`\`\`
`
      }
    ];
  }

  // 获取依赖
  private getDependencies(config: GameConfig): { name: string; version: string }[] {
    const deps = [
      { name: 'typescript', version: '^5.0.0' }
    ];
    if (config.platforms.includes('taptap')) {
      deps.push({ name: '@taptap/sdk', version: '^1.0.0' });
    }
    return deps;
  }

  // 获取模板
  getTemplate(id: string): GameTemplate | undefined {
    return this.templates.get(id);
  }

  // 列出模板
  listTemplates(filter?: { genre?: GameGenre }): GameTemplate[] {
    let templates = Array.from(this.templates.values());
    if (filter?.genre) templates = templates.filter(t => t.genre === filter.genre);
    return templates;
  }

  // 获取项目
  getProject(id: string): GeneratedProject | undefined {
    return this.projects.get(id);
  }

  // 列出项目
  listProjects(): GeneratedProject[] {
    return Array.from(this.projects.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}

export const lowCodeGameGeneratorService = new LowCodeGameGeneratorService();
