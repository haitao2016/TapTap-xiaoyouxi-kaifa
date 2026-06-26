import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

export type GameTemplateType = 'match3' | 'platformer' | 'roguelike' | 'card' | 'tower-defense';

export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'extreme';

export interface TemplateFileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  extension?: string;
  children?: TemplateFileNode[];
}

export interface GameFeature {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface GameConfigParam {
  id: string;
  name: string;
  description: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'color';
  defaultValue: unknown;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  category: string;
}

export interface GameSkin {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  themeColor: string;
}

export interface LevelInfo {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  stars?: number;
  unlocked?: boolean;
}

export interface GameTemplate {
  id: string;
  name: string;
  type: GameTemplateType;
  tagline: string;
  description: string;
  longDescription: string;
  version: string;
  minTapDevVersion: string;
  author: string;
  authorId: string;
  category: string;
  tags: string[];
  icon: string;
  bannerImage: string;
  screenshots: string[];
  previewVideo?: string;
  features: GameFeature[];
  files: TemplateFileNode;
  totalSize: number;
  fileCount: number;
  configParams: GameConfigParam[];
  defaultDifficulty: DifficultyLevel;
  availableDifficulties: DifficultyLevel[];
  skins: GameSkin[];
  defaultSkinId: string;
  levelCount: number;
  levels: LevelInfo[];
  downloads: number;
  stars: number;
  rating: number;
  ratingCount: number;
  createdAt: number;
  updatedAt: number;
  documentation: {
    quickStart: string;
    gameplayGuide: string;
    customizationGuide: string;
    apiReference?: string;
  };
  techStack: string[];
  supportedPlatforms: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  isHot?: boolean;
}

export interface CreateTemplateProjectOptions {
  templateId: string;
  projectName: string;
  projectPath: string;
  skinId?: string;
  difficulty?: DifficultyLevel;
  configOverrides?: Record<string, unknown>;
  includeDemoLevels?: boolean;
  onProgress?: (progress: number, stage: string) => void;
}

export interface CreatedTemplateProject {
  projectId: string;
  projectName: string;
  projectPath: string;
  templateId: string;
  templateName: string;
  createdAt: number;
  size: number;
  fileCount: number;
}

export interface GameTemplateSearchOptions {
  query?: string;
  type?: GameTemplateType;
  sortBy?: 'downloads' | 'rating' | 'created' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  difficulty?: DifficultyLevel;
  featured?: boolean;
  tags?: string[];
}

export interface GameTemplateSearchResult {
  templates: GameTemplate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class GameTemplatesService {
  private templates: GameTemplate[] = [];

  constructor() {
    this.loadTemplates();
  }

  getTemplates(options?: GameTemplateSearchOptions): GameTemplateSearchResult {
    let result = [...this.templates];

    if (options?.query) {
      const query = options.query.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          t.tagline.toLowerCase().includes(query)
      );
    }

    if (options?.type) {
      result = result.filter((t) => t.type === options.type);
    }

    if (options?.difficulty) {
      result = result.filter((t) => t.availableDifficulties.includes(options.difficulty!));
    }

    if (options?.featured) {
      result = result.filter((t) => t.isFeatured);
    }

    if (options?.tags && options.tags.length > 0) {
      result = result.filter((t) => options.tags!.some((tag) => t.tags.includes(tag)));
    }

    const sortBy = options?.sortBy || 'downloads';
    const sortOrder = options?.sortOrder || 'desc';

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'downloads':
          comparison = b.downloads - a.downloads;
          break;
        case 'rating':
          comparison = b.rating - a.rating;
          break;
        case 'created':
          comparison = b.createdAt - a.createdAt;
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

  getTemplateById(templateId: string): GameTemplate | undefined {
    return this.templates.find((t) => t.id === templateId);
  }

  getTemplateByType(type: GameTemplateType): GameTemplate[] {
    return this.templates.filter((t) => t.type === type);
  }

  getFeaturedTemplates(limit = 5): GameTemplate[] {
    return this.templates.filter((t) => t.isFeatured).slice(0, limit);
  }

  getHotTemplates(limit = 10): GameTemplate[] {
    return [...this.templates].sort((a, b) => b.downloads - a.downloads).slice(0, limit);
  }

  getNewTemplates(limit = 10): GameTemplate[] {
    return [...this.templates].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  getTopRatedTemplates(limit = 10): GameTemplate[] {
    return [...this.templates].sort((a, b) => b.rating - a.rating).slice(0, limit);
  }

  getTemplateTypes(): {
    id: GameTemplateType;
    name: string;
    icon: string;
    description: string;
    count: number;
  }[] {
    const typeMeta: Record<GameTemplateType, { name: string; icon: string; description: string }> =
      {
        match3: { name: '三消游戏', icon: 'grid-3x3', description: '休闲益智类三消游戏' },
        platformer: { name: '平台跳跃', icon: 'move-vertical', description: '经典平台跳跃游戏' },
        roguelike: { name: 'Roguelike', icon: 'sword', description: '随机地牢冒险游戏' },
        card: { name: '卡牌游戏', icon: 'layers', description: '策略卡牌对战游戏' },
        'tower-defense': { name: '塔防游戏', icon: 'shield', description: '策略塔防游戏' },
      };

    const typeMap = new Map<GameTemplateType, number>();
    this.templates.forEach((t) => {
      typeMap.set(t.type, (typeMap.get(t.type) || 0) + 1);
    });

    return (Object.keys(typeMeta) as GameTemplateType[]).map((id) => ({
      id,
      name: typeMeta[id].name,
      icon: typeMeta[id].icon,
      description: typeMeta[id].description,
      count: typeMap.get(id) || 0,
    }));
  }

  async createProject(options: CreateTemplateProjectOptions): Promise<CreatedTemplateProject> {
    const template = this.templates.find((t) => t.id === options.templateId);
    if (!template) {
      throw new Error(`模板不存在: ${options.templateId}`);
    }

    const stages = [
      { progress: 10, stage: '正在验证模板...' },
      { progress: 25, stage: '正在创建项目结构...' },
      { progress: 40, stage: '正在复制模板文件...' },
      { progress: 55, stage: '正在应用皮肤配置...' },
      { progress: 70, stage: '正在配置难度参数...' },
      { progress: 85, stage: '正在生成关卡数据...' },
      { progress: 95, stage: '正在初始化项目...' },
      { progress: 100, stage: '项目创建完成！' },
    ];

    if (options.onProgress) {
      for (const { progress, stage } of stages) {
        options.onProgress(progress, stage);
        await this.delay(200);
      }
    }

    const project: CreatedTemplateProject = {
      projectId: randomUUID(),
      projectName: options.projectName,
      projectPath: options.projectPath,
      templateId: template.id,
      templateName: template.name,
      createdAt: Date.now(),
      size: template.totalSize,
      fileCount: template.fileCount,
    };

    template.downloads++;

    globalEventBus.emit({
      type: 'template:project-created',
      payload: { project, template },
    });

    return project;
  }

  getTemplateConfig(templateId: string): GameConfigParam[] | undefined {
    const template = this.templates.find((t) => t.id === templateId);
    return template?.configParams;
  }

  getTemplateSkins(templateId: string): GameSkin[] | undefined {
    const template = this.templates.find((t) => t.id === templateId);
    return template?.skins;
  }

  getTemplateLevels(templateId: string): LevelInfo[] | undefined {
    const template = this.templates.find((t) => t.id === templateId);
    return template?.levels;
  }

  getTemplateDocumentation(templateId: string): GameTemplate['documentation'] | undefined {
    const template = this.templates.find((t) => t.id === templateId);
    return template?.documentation;
  }

  getTemplateFileStructure(templateId: string): TemplateFileNode | undefined {
    const template = this.templates.find((t) => t.id === templateId);
    return template?.files;
  }

  getTotalCount(): number {
    return this.templates.length;
  }

  private loadTemplates(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.templates = [
      this.createMatch3Template(now, day),
      this.createPlatformerTemplate(now, day),
      this.createRoguelikeTemplate(now, day),
      this.createCardTemplate(now, day),
      this.createTowerDefenseTemplate(now, day),
    ];
  }

  private createMatch3Template(now: number, day: number): GameTemplate {
    return {
      id: 'template-match3',
      name: '三消游戏模板',
      type: 'match3',
      tagline: '轻松上手，快速开发你的三消游戏',
      description:
        '完整的三消游戏模板，包含核心玩法、关卡系统、分数系统、道具系统。开箱即用，快速上线。',
      longDescription:
        '这是一个功能完整的三消游戏项目模板，包含了三消游戏的所有核心要素。\n\n**核心玩法**：经典的三消匹配机制，支持横向和纵向匹配，4连、5连、L型、T型等特殊消除。\n\n**关卡系统**：内置30个精心设计的关卡，支持关卡编辑器，轻松添加更多关卡。\n\n**分数系统**：连击加分、特殊方块加分、剩余步数奖励等多种计分方式。\n\n**道具系统**：炸弹、彩虹糖、锤子等多种道具，支持道具商店。',
      version: '2.0.0',
      minTapDevVersion: '0.4.0',
      author: 'TapDev官方',
      authorId: 'tapdev-official',
      category: '休闲益智',
      tags: ['三消', '休闲', '益智', '消除', '关卡'],
      icon: 'grid-3x3',
      bannerImage: 'match3-banner.png',
      screenshots: ['match3-1.png', 'match3-2.png', 'match3-3.png', 'match3-4.png'],
      previewVideo: 'match3-demo.mp4',
      features: [
        { id: 'f1', name: '核心匹配系统', description: '支持多种匹配类型和特殊方块', icon: 'grid' },
        { id: 'f2', name: '关卡编辑器', description: '可视化关卡编辑，轻松创建关卡', icon: 'edit' },
        { id: 'f3', name: '道具系统', description: '多种道具类型和商店系统', icon: 'gift' },
        { id: 'f4', name: '成就系统', description: '丰富的成就和奖励系统', icon: 'award' },
        { id: 'f5', name: '排行榜', description: '支持本地和在线排行榜', icon: 'trophy' },
        { id: 'f6', name: '多平台支持', description: '支持Web、移动端、小游戏', icon: 'globe' },
      ],
      files: {
        name: 'match3-template',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: '/src',
            children: [
              {
                name: 'game',
                type: 'directory',
                path: '/src/game',
                children: [
                  {
                    name: 'Board.ts',
                    type: 'file',
                    path: '/src/game/Board.ts',
                    size: 20480,
                    extension: 'ts',
                  },
                  {
                    name: 'MatchLogic.ts',
                    type: 'file',
                    path: '/src/game/MatchLogic.ts',
                    size: 25600,
                    extension: 'ts',
                  },
                  {
                    name: 'Piece.ts',
                    type: 'file',
                    path: '/src/game/Piece.ts',
                    size: 10240,
                    extension: 'ts',
                  },
                  {
                    name: 'PowerUp.ts',
                    type: 'file',
                    path: '/src/game/PowerUp.ts',
                    size: 15360,
                    extension: 'ts',
                  },
                ],
              },
              {
                name: 'levels',
                type: 'directory',
                path: '/src/levels',
                children: [
                  {
                    name: 'LevelManager.ts',
                    type: 'file',
                    path: '/src/levels/LevelManager.ts',
                    size: 12288,
                    extension: 'ts',
                  },
                  {
                    name: 'levelData.json',
                    type: 'file',
                    path: '/src/levels/levelData.json',
                    size: 51200,
                    extension: 'json',
                  },
                ],
              },
              {
                name: 'ui',
                type: 'directory',
                path: '/src/ui',
                children: [
                  {
                    name: 'GameUI.ts',
                    type: 'file',
                    path: '/src/ui/GameUI.ts',
                    size: 18432,
                    extension: 'ts',
                  },
                  {
                    name: 'LevelSelect.ts',
                    type: 'file',
                    path: '/src/ui/LevelSelect.ts',
                    size: 15360,
                    extension: 'ts',
                  },
                  {
                    name: 'MainMenu.ts',
                    type: 'file',
                    path: '/src/ui/MainMenu.ts',
                    size: 12288,
                    extension: 'ts',
                  },
                ],
              },
              { name: 'main.ts', type: 'file', path: '/src/main.ts', size: 5120, extension: 'ts' },
            ],
          },
          {
            name: 'assets',
            type: 'directory',
            path: '/assets',
            children: [
              { name: 'pieces', type: 'directory', path: '/assets/pieces' },
              { name: 'ui', type: 'directory', path: '/assets/ui' },
              { name: 'audio', type: 'directory', path: '/assets/audio' },
            ],
          },
          {
            name: 'project.json',
            type: 'file',
            path: '/project.json',
            size: 2048,
            extension: 'json',
          },
          { name: 'README.md', type: 'file', path: '/README.md', size: 4096, extension: 'md' },
        ],
      },
      totalSize: 15728640,
      fileCount: 48,
      configParams: [
        {
          id: 'boardSize',
          name: '棋盘大小',
          description: '游戏棋盘的尺寸',
          type: 'select',
          defaultValue: 8,
          category: '游戏玩法',
          options: [
            { value: 6, label: '6x6 (简单)' },
            { value: 7, label: '7x7 (中等)' },
            { value: 8, label: '8x8 (标准)' },
            { value: 9, label: '9x9 (困难)' },
          ],
        },
        {
          id: 'matchMin',
          name: '最小匹配数',
          description: '触发消除的最少方块数',
          type: 'number',
          defaultValue: 3,
          min: 3,
          max: 5,
          category: '游戏玩法',
        },
        {
          id: 'comboTime',
          name: '连击时间窗口',
          description: '连续消除的时间窗口（秒）',
          type: 'number',
          defaultValue: 2,
          min: 1,
          max: 5,
          category: '游戏玩法',
        },
        {
          id: 'startMoves',
          name: '初始步数',
          description: '每关的初始步数',
          type: 'number',
          defaultValue: 20,
          min: 10,
          max: 50,
          category: '关卡设置',
        },
        {
          id: 'scoreMultiplier',
          name: '分数倍率',
          description: '整体得分倍率',
          type: 'number',
          defaultValue: 1,
          min: 0.5,
          max: 3,
          category: '分数系统',
        },
        {
          id: 'enableSound',
          name: '启用音效',
          description: '是否播放游戏音效',
          type: 'boolean',
          defaultValue: true,
          category: '音频设置',
        },
        {
          id: 'enableMusic',
          name: '启用音乐',
          description: '是否播放背景音乐',
          type: 'boolean',
          defaultValue: true,
          category: '音频设置',
        },
        {
          id: 'themeColor',
          name: '主题色',
          description: '游戏界面主题色',
          type: 'color',
          defaultValue: '#FF6B9D',
          category: '视觉设置',
        },
      ],
      defaultDifficulty: 'normal',
      availableDifficulties: ['easy', 'normal', 'hard'],
      skins: [
        {
          id: 'default',
          name: '经典糖果',
          description: '经典的糖果风格主题',
          previewImage: 'skin-candy.png',
          themeColor: '#FF6B9D',
        },
        {
          id: 'fruits',
          name: '水果乐园',
          description: '新鲜水果风格主题',
          previewImage: 'skin-fruits.png',
          themeColor: '#4CAF50',
        },
        {
          id: 'gems',
          name: '宝石迷阵',
          description: '闪亮宝石风格主题',
          previewImage: 'skin-gems.png',
          themeColor: '#9C27B0',
        },
        {
          id: 'ocean',
          name: '海洋之心',
          description: '海洋主题风格',
          previewImage: 'skin-ocean.png',
          themeColor: '#2196F3',
        },
      ],
      defaultSkinId: 'default',
      levelCount: 30,
      levels: Array.from({ length: 30 }, (_, i) => ({
        id: `level-${i + 1}`,
        name: `第 ${i + 1} 关`,
        description: `关卡 ${i + 1} 的挑战目标`,
        difficulty: Math.min(5, Math.floor(i / 6) + 1),
        unlocked: i < 5,
        stars: i < 3 ? 3 : i < 5 ? 2 : 0,
      })),
      downloads: 12560,
      stars: 980,
      rating: 4.9,
      ratingCount: 567,
      createdAt: now - 180 * day,
      updatedAt: now - 15 * day,
      documentation: {
        quickStart: '# 快速开始\n\n1. 从模板创建项目\n2. 运行预览游戏\n3. 开始定制你的游戏',
        gameplayGuide:
          '# 玩法说明\n\n## 基本规则\n- 交换相邻的两个方块\n- 三个或更多相同颜色连成一线即可消除\n- 消除越多，得分越高',
        customizationGuide:
          '# 自定义指南\n\n## 添加新关卡\n使用关卡编辑器创建新关卡...\n\n## 添加新皮肤\n参考皮肤系统文档...',
      },
      techStack: ['TypeScript', 'TapDev Engine', 'Canvas 2D'],
      supportedPlatforms: ['Web', 'iOS', 'Android', '微信小游戏'],
      isFeatured: true,
      isHot: true,
      isNew: false,
    };
  }

  private createPlatformerTemplate(now: number, day: number): GameTemplate {
    return {
      id: 'template-platformer',
      name: '平台跳跃游戏模板',
      type: 'platformer',
      tagline: '打造你的2D平台跳跃冒险游戏',
      description:
        '完整的2D平台跳跃游戏模板，包含角色控制、关卡设计、金币收集、敌人系统等完整功能。',
      longDescription:
        '这是一个经典的2D平台跳跃游戏项目模板，提供了完整的游戏框架。\n\n**角色控制**：流畅的移动、精确的跳跃、墙壁滑行、二段跳等多种动作。\n\n**关卡系统**：内置10个精心设计的关卡，支持关卡编辑器。\n\n**收集系统**：金币、宝石、道具等多种收集要素。\n\n**敌人系统**：多种敌人类型，各有特色的AI行为。',
      version: '1.5.0',
      minTapDevVersion: '0.3.0',
      author: 'TapDev官方',
      authorId: 'tapdev-official',
      category: '动作冒险',
      tags: ['平台跳跃', '2D', '动作', '冒险', '收集'],
      icon: 'move-vertical',
      bannerImage: 'platformer-banner.png',
      screenshots: ['platformer-1.png', 'platformer-2.png', 'platformer-3.png'],
      previewVideo: 'platformer-demo.mp4',
      features: [
        { id: 'f1', name: '流畅控制', description: '手感出色的角色控制器', icon: 'user' },
        { id: 'f2', name: '关卡编辑器', description: '可视化关卡设计工具', icon: 'edit' },
        { id: 'f3', name: '多种敌人', description: '各具特色的敌人AI', icon: 'skull' },
        { id: 'f4', name: '道具系统', description: '多种能力提升道具', icon: 'zap' },
        { id: 'f5', name: '存档系统', description: '自动保存游戏进度', icon: 'save' },
      ],
      files: {
        name: 'platformer-template',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: '/src',
            children: [
              { name: 'player', type: 'directory', path: '/src/player' },
              { name: 'enemies', type: 'directory', path: '/src/enemies' },
              { name: 'levels', type: 'directory', path: '/src/levels' },
              { name: 'main.ts', type: 'file', path: '/src/main.ts', size: 4096, extension: 'ts' },
            ],
          },
          { name: 'assets', type: 'directory', path: '/assets' },
        ],
      },
      totalSize: 20971520,
      fileCount: 56,
      configParams: [
        {
          id: 'playerSpeed',
          name: '移动速度',
          description: '玩家移动速度',
          type: 'number',
          defaultValue: 5,
          min: 1,
          max: 10,
          category: '角色控制',
        },
        {
          id: 'jumpForce',
          name: '跳跃力',
          description: '跳跃初始力度',
          type: 'number',
          defaultValue: 12,
          min: 5,
          max: 20,
          category: '角色控制',
        },
        {
          id: 'gravity',
          name: '重力',
          description: '重力加速度',
          type: 'number',
          defaultValue: 0.5,
          min: 0.1,
          max: 1,
          category: '物理设置',
        },
        {
          id: 'doubleJump',
          name: '二段跳',
          description: '是否允许二段跳',
          type: 'boolean',
          defaultValue: true,
          category: '角色控制',
        },
        {
          id: 'wallSlide',
          name: '墙壁滑行',
          description: '是否允许墙壁滑行',
          type: 'boolean',
          defaultValue: true,
          category: '角色控制',
        },
      ],
      defaultDifficulty: 'normal',
      availableDifficulties: ['easy', 'normal', 'hard', 'extreme'],
      skins: [
        {
          id: 'default',
          name: '像素风格',
          description: '经典像素艺术风格',
          previewImage: 'skin-pixel.png',
          themeColor: '#FF9800',
        },
        {
          id: 'cartoon',
          name: '卡通风格',
          description: '可爱卡通风格',
          previewImage: 'skin-cartoon.png',
          themeColor: '#E91E63',
        },
        {
          id: 'neon',
          name: '霓虹风格',
          description: '赛博朋克霓虹风',
          previewImage: 'skin-neon.png',
          themeColor: '#00BCD4',
        },
      ],
      defaultSkinId: 'default',
      levelCount: 10,
      levels: Array.from({ length: 10 }, (_, i) => ({
        id: `level-${i + 1}`,
        name: `关卡 ${i + 1}`,
        description: [
          '草原启程',
          '森林探秘',
          '洞穴冒险',
          '机关重重',
          'BOSS挑战',
          '雪山之巅',
          '天空之城',
          '机械工厂',
          '熔岩地狱',
          '最终决战',
        ][i],
        difficulty: i < 3 ? 1 : i < 6 ? 2 : i < 9 ? 3 : 5,
        unlocked: i === 0,
        stars: 0,
      })),
      downloads: 8970,
      stars: 756,
      rating: 4.8,
      ratingCount: 345,
      createdAt: now - 150 * day,
      updatedAt: now - 10 * day,
      documentation: {
        quickStart: '# 快速开始\n\n1. 创建项目\n2. 运行游戏\n3. 使用方向键控制角色移动',
        gameplayGuide:
          '# 玩法说明\n\n## 操作\n- 方向键/AD：移动\n- 空格/W：跳跃\n- 长按跳跃键：跳得更高',
        customizationGuide:
          '# 自定义指南\n\n## 添加新关卡\n使用关卡编辑器...\n\n## 添加新敌人\n参考敌人基类...',
      },
      techStack: ['TypeScript', 'TapDev Engine', 'Canvas 2D', '物理系统'],
      supportedPlatforms: ['Web', 'iOS', 'Android'],
      isFeatured: true,
      isHot: true,
      isNew: false,
    };
  }

  private createRoguelikeTemplate(now: number, day: number): GameTemplate {
    return {
      id: 'template-roguelike',
      name: 'Roguelike游戏模板',
      type: 'roguelike',
      tagline: '探索随机生成的地牢，每一局都是新冒险',
      description:
        '完整的Roguelike动作游戏模板，包含随机地牢生成、角色成长、装备系统、技能树等核心功能。',
      longDescription:
        '这是一个功能丰富的Roguelike游戏项目模板，为你的地牢探险游戏提供坚实基础。\n\n**随机地牢**：每次游戏都会生成完全不同的地牢布局。\n\n**角色成长**：多种职业、技能树、属性成长系统。\n\n**装备系统**：武器、防具、饰品，丰富的装备组合。\n\n**多样化敌人**：普通怪物、精英怪、BOSS，层层递进的挑战。',
      version: '1.2.0',
      minTapDevVersion: '0.4.0',
      author: 'TapDev官方',
      authorId: 'tapdev-official',
      category: '角色扮演',
      tags: ['Roguelike', '地牢', 'RPG', '随机', '动作'],
      icon: 'sword',
      bannerImage: 'roguelike-banner.png',
      screenshots: ['roguelike-1.png', 'roguelike-2.png', 'roguelike-3.png', 'roguelike-4.png'],
      previewVideo: 'roguelike-demo.mp4',
      features: [
        { id: 'f1', name: '随机地牢', description: '程序化生成的无限地牢', icon: 'map' },
        { id: 'f2', name: '职业系统', description: '多种职业各有特色', icon: 'users' },
        { id: 'f3', name: '技能树', description: '丰富的技能成长路线', icon: 'git-branch' },
        { id: 'f4', name: '装备系统', description: '海量装备等你收集', icon: 'package' },
        { id: 'f5', name: '永久死亡', description: '经典Roguelike规则', icon: 'skull' },
        { id: 'f6', name: '解锁系统', description: '死亡也能获得永久强化', icon: 'unlock' },
      ],
      files: {
        name: 'roguelike-template',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: '/src',
            children: [
              { name: 'dungeon', type: 'directory', path: '/src/dungeon' },
              { name: 'player', type: 'directory', path: '/src/player' },
              { name: 'enemies', type: 'directory', path: '/src/enemies' },
              { name: 'items', type: 'directory', path: '/src/items' },
              { name: 'skills', type: 'directory', path: '/src/skills' },
              { name: 'main.ts', type: 'file', path: '/src/main.ts', size: 5120, extension: 'ts' },
            ],
          },
        ],
      },
      totalSize: 31457280,
      fileCount: 78,
      configParams: [
        {
          id: 'dungeonSize',
          name: '地牢大小',
          description: '地牢生成的尺寸范围',
          type: 'select',
          defaultValue: 'medium',
          category: '地牢生成',
          options: [
            { value: 'small', label: '小型（快节奏）' },
            { value: 'medium', label: '中型（标准）' },
            { value: 'large', label: '大型（探索向）' },
          ],
        },
        {
          id: 'roomDensity',
          name: '房间密度',
          description: '地牢中的房间数量',
          type: 'number',
          defaultValue: 0.6,
          min: 0.3,
          max: 0.9,
          category: '地牢生成',
        },
        {
          id: 'enemyDifficulty',
          name: '敌人强度',
          description: '敌人属性倍率',
          type: 'number',
          defaultValue: 1,
          min: 0.5,
          max: 3,
          category: '难度设置',
        },
        {
          id: 'permadeath',
          name: '永久死亡',
          description: '是否启用永久死亡',
          type: 'boolean',
          defaultValue: true,
          category: '游戏规则',
        },
      ],
      defaultDifficulty: 'normal',
      availableDifficulties: ['easy', 'normal', 'hard', 'extreme'],
      skins: [
        {
          id: 'default',
          name: '暗黑地牢',
          description: '经典暗黑地牢风格',
          previewImage: 'skin-dark.png',
          themeColor: '#5D4037',
        },
        {
          id: 'pixel',
          name: '像素地牢',
          description: '复古像素风格',
          previewImage: 'skin-pixel-dungeon.png',
          themeColor: '#33691E',
        },
        {
          id: 'scifi',
          name: '太空站',
          description: '科幻太空站风格',
          previewImage: 'skin-scifi.png',
          themeColor: '#0D47A1',
        },
      ],
      defaultSkinId: 'default',
      levelCount: 10,
      levels: Array.from({ length: 10 }, (_, i) => ({
        id: `floor-${i + 1}`,
        name: `第 ${i + 1} 层`,
        description: i < 3 ? '地牢浅层' : i < 7 ? '地牢中层' : '地牢深层',
        difficulty: i + 1,
        unlocked: i === 0,
      })),
      downloads: 6780,
      stars: 623,
      rating: 4.9,
      ratingCount: 289,
      createdAt: now - 90 * day,
      updatedAt: now - 7 * day,
      documentation: {
        quickStart: '# 快速开始\n\n1. 创建项目\n2. 选择职业\n3. 开始你的地牢探险！',
        gameplayGuide:
          '# 玩法说明\n\n## 基本操作\n- WASD/方向键：移动\n- 鼠标点击：攻击/交互\n- E：使用道具\n- I：打开背包',
        customizationGuide:
          '# 自定义指南\n\n## 添加新职业\n创建新的职业类...\n\n## 添加新物品\n扩展物品数据库...',
      },
      techStack: ['TypeScript', 'TapDev Engine', 'Canvas 2D', 'ECS架构'],
      supportedPlatforms: ['Web', 'iOS', 'Android', 'PC'],
      isFeatured: true,
      isHot: true,
      isNew: true,
    };
  }

  private createCardTemplate(now: number, day: number): GameTemplate {
    return {
      id: 'template-card',
      name: '卡牌游戏模板',
      type: 'card',
      tagline: '构建你的卡组，展开策略对决',
      description: '完整的卡牌对战游戏模板，包含卡组构建、战斗系统、卡牌收集、关卡推进等完整功能。',
      longDescription:
        '这是一套完整的卡牌游戏开发模板，让你快速搭建自己的TCG卡牌游戏。\n\n**战斗系统**：回合制战斗，丰富的卡牌效果，AI对手。\n\n**卡组构建**：收藏卡牌，构建个性化卡组。\n\n**单人战役**：多个章节，层层递进的挑战。\n\n**卡牌收集**：抽卡系统，卡牌合成，图鉴收集。',
      version: '1.1.0',
      minTapDevVersion: '0.4.0',
      author: 'TapDev官方',
      authorId: 'tapdev-official',
      category: '策略卡牌',
      tags: ['卡牌', '策略', 'TCG', '对战', '收集'],
      icon: 'layers',
      bannerImage: 'card-banner.png',
      screenshots: ['card-1.png', 'card-2.png', 'card-3.png', 'card-4.png'],
      previewVideo: 'card-demo.mp4',
      features: [
        { id: 'f1', name: '战斗系统', description: '完整的回合制卡牌战斗', icon: 'swords' },
        { id: 'f2', name: '卡组构建', description: '自由构建你的卡组', icon: 'layout-list' },
        { id: 'f3', name: 'AI对手', description: '聪明的AI对战系统', icon: 'cpu' },
        { id: 'f4', name: '抽卡系统', description: '经典的卡牌抽取机制', icon: 'gift' },
        { id: 'f5', name: '战役模式', description: '丰富的单人关卡', icon: 'map' },
        { id: 'f6', name: '卡牌图鉴', description: '收集所有卡牌', icon: 'book-open' },
      ],
      files: {
        name: 'card-template',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: '/src',
            children: [
              { name: 'battle', type: 'directory', path: '/src/battle' },
              { name: 'cards', type: 'directory', path: '/src/cards' },
              { name: 'deck', type: 'directory', path: '/src/deck' },
              { name: 'ai', type: 'directory', path: '/src/ai' },
              { name: 'main.ts', type: 'file', path: '/src/main.ts', size: 4096, extension: 'ts' },
            ],
          },
        ],
      },
      totalSize: 25165824,
      fileCount: 65,
      configParams: [
        {
          id: 'startHealth',
          name: '初始生命',
          description: '双方初始生命值',
          type: 'number',
          defaultValue: 30,
          min: 10,
          max: 100,
          category: '战斗设置',
        },
        {
          id: 'startHand',
          name: '起始手牌',
          description: '游戏开始时的手牌数',
          type: 'number',
          defaultValue: 4,
          min: 1,
          max: 10,
          category: '战斗设置',
        },
        {
          id: 'maxMana',
          name: '最大法力',
          description: '每回合最大法力值',
          type: 'number',
          defaultValue: 10,
          min: 5,
          max: 20,
          category: '战斗设置',
        },
        {
          id: 'deckSize',
          name: '卡组大小',
          description: '规定的卡组卡牌数',
          type: 'number',
          defaultValue: 30,
          min: 20,
          max: 60,
          category: '卡组设置',
        },
      ],
      defaultDifficulty: 'normal',
      availableDifficulties: ['easy', 'normal', 'hard'],
      skins: [
        {
          id: 'default',
          name: '经典奇幻',
          description: '经典奇幻风格卡牌',
          previewImage: 'skin-fantasy.png',
          themeColor: '#8B4513',
        },
        {
          id: 'scifi',
          name: '星际科幻',
          description: '未来科幻风格卡牌',
          previewImage: 'skin-sci-fi.png',
          themeColor: '#1E88E5',
        },
        {
          id: 'cute',
          name: '可爱萌系',
          description: 'Q版可爱风格卡牌',
          previewImage: 'skin-cute.png',
          themeColor: '#EC407A',
        },
      ],
      defaultSkinId: 'default',
      levelCount: 20,
      levels: Array.from({ length: 20 }, (_, i) => ({
        id: `stage-${i + 1}`,
        name: i < 5 ? '新手教程' : i < 10 ? '初级挑战' : i < 15 ? '中级挑战' : '高级挑战',
        description: `第 ${i + 1} 关`,
        difficulty: Math.floor(i / 5) + 1,
        unlocked: i < 3,
        stars: i < 2 ? 3 : 0,
      })),
      downloads: 5670,
      stars: 512,
      rating: 4.7,
      ratingCount: 234,
      createdAt: now - 60 * day,
      updatedAt: now - 5 * day,
      documentation: {
        quickStart: '# 快速开始\n\n1. 创建项目\n2. 进入游戏\n3. 完成新手教程',
        gameplayGuide:
          '# 玩法说明\n\n## 基本规则\n- 每回合获得法力值\n- 使用卡牌消耗法力\n- 将对手生命降至0获胜',
        customizationGuide:
          '# 自定义指南\n\n## 添加新卡牌\n创建新的卡牌定义...\n\n## 添加新技能\n实现卡牌效果...',
      },
      techStack: ['TypeScript', 'TapDev Engine', 'Canvas 2D'],
      supportedPlatforms: ['Web', 'iOS', 'Android', '微信小游戏'],
      isFeatured: true,
      isHot: false,
      isNew: true,
    };
  }

  private createTowerDefenseTemplate(now: number, day: number): GameTemplate {
    return {
      id: 'template-tower-defense',
      name: '塔防游戏模板',
      type: 'tower-defense',
      tagline: '建造防御塔，抵御敌人的进攻',
      description: '完整的塔防游戏模板，包含多种防御塔、敌人波次、路径系统、升级系统等核心功能。',
      longDescription:
        '这是一个经典的塔防游戏项目模板，提供了完整的塔防游戏框架。\n\n**防御塔**：多种防御塔类型，各有特点和升级路线。\n\n**敌人波次**：多种敌人类型，一波接一波的挑战。\n\n**地图系统**：多张地图，不同的路径布局。\n\n**升级系统**：塔升级、技能树、全局强化。',
      version: '1.3.0',
      minTapDevVersion: '0.3.0',
      author: 'TapDev官方',
      authorId: 'tapdev-official',
      category: '策略塔防',
      tags: ['塔防', '策略', '防御', '波次', '升级'],
      icon: 'shield',
      bannerImage: 'towerdefense-banner.png',
      screenshots: ['towerdefense-1.png', 'towerdefense-2.png', 'towerdefense-3.png'],
      previewVideo: 'towerdefense-demo.mp4',
      features: [
        { id: 'f1', name: '多种防御塔', description: '各有特色的防御塔', icon: 'target' },
        { id: 'f2', name: '敌人波次', description: '层层递进的敌人波次', icon: 'waves' },
        { id: 'f3', name: '升级系统', description: '塔升级和全局强化', icon: 'trending-up' },
        { id: 'f4', name: '地图编辑器', description: '创建你自己的地图', icon: 'map' },
        { id: 'f5', name: '特殊技能', description: '强力的主动技能', icon: 'zap' },
      ],
      files: {
        name: 'tower-defense-template',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: '/src',
            children: [
              { name: 'towers', type: 'directory', path: '/src/towers' },
              { name: 'enemies', type: 'directory', path: '/src/enemies' },
              { name: 'wave', type: 'directory', path: '/src/wave' },
              { name: 'path', type: 'directory', path: '/src/path' },
              { name: 'main.ts', type: 'file', path: '/src/main.ts', size: 4096, extension: 'ts' },
            ],
          },
        ],
      },
      totalSize: 18874368,
      fileCount: 52,
      configParams: [
        {
          id: 'startGold',
          name: '初始金币',
          description: '游戏开始时的金币数',
          type: 'number',
          defaultValue: 500,
          min: 100,
          max: 2000,
          category: '经济系统',
        },
        {
          id: 'startLives',
          name: '初始生命',
          description: '可以漏掉的敌人数量',
          type: 'number',
          defaultValue: 20,
          min: 1,
          max: 100,
          category: '游戏设置',
        },
        {
          id: 'sellRefund',
          name: '出售返还',
          description: '出售塔返还金币比例',
          type: 'number',
          defaultValue: 0.7,
          min: 0,
          max: 1,
          category: '经济系统',
        },
        {
          id: 'waveInterval',
          name: '波次间隔',
          description: '波次之间的间隔（秒）',
          type: 'number',
          defaultValue: 5,
          min: 1,
          max: 20,
          category: '游戏设置',
        },
      ],
      defaultDifficulty: 'normal',
      availableDifficulties: ['easy', 'normal', 'hard', 'extreme'],
      skins: [
        {
          id: 'default',
          name: '中世纪',
          description: '经典中世纪风格',
          previewImage: 'skin-medieval.png',
          themeColor: '#8D6E63',
        },
        {
          id: 'scifi',
          name: '科幻塔防',
          description: '未来科技风格',
          previewImage: 'skin-futuristic.png',
          themeColor: '#00BCD4',
        },
        {
          id: 'nature',
          name: '自然之塔',
          description: '自然森林风格',
          previewImage: 'skin-nature.png',
          themeColor: '#4CAF50',
        },
      ],
      defaultSkinId: 'default',
      levelCount: 15,
      levels: Array.from({ length: 15 }, (_, i) => ({
        id: `map-${i + 1}`,
        name: i < 5 ? '新手关卡' : i < 10 ? '进阶关卡' : '挑战关卡',
        description: `地图 ${i + 1}`,
        difficulty: Math.min(5, Math.floor(i / 3) + 1),
        unlocked: i < 3,
        stars: i < 2 ? 3 : 0,
      })),
      downloads: 7890,
      stars: 634,
      rating: 4.8,
      ratingCount: 312,
      createdAt: now - 120 * day,
      updatedAt: now - 20 * day,
      documentation: {
        quickStart: '# 快速开始\n\n1. 创建项目\n2. 选择地图\n3. 建造防御塔抵御敌人',
        gameplayGuide:
          '# 玩法说明\n\n## 基本操作\n- 点击塔图标选择防御塔\n- 在地图上点击放置\n- 点击已放置的塔可以升级或出售',
        customizationGuide:
          '# 自定义指南\n\n## 添加新塔\n创建新的塔类...\n\n## 添加新敌人\n扩展敌人类型...',
      },
      techStack: ['TypeScript', 'TapDev Engine', 'Canvas 2D'],
      supportedPlatforms: ['Web', 'iOS', 'Android', '微信小游戏'],
      isFeatured: true,
      isHot: true,
      isNew: false,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const gameTemplatesService = new GameTemplatesService();
