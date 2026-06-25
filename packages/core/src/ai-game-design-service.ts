import { globalEventBus } from './event-bus';

export type GameGenre = 'rpg' | 'casual' | 'strategy' | 'action' | 'puzzle';

export interface GameConcept {
  title: string;
  genre: GameGenre;
  tagline: string;
  description: string;
  coreGameplay: string[];
  uniqueSellingPoints: string[];
  targetAudience: string;
  estimatedPlaytime: string;
  artStyle: string;
  mood: string;
}

export interface LevelDesign {
  levelNumber: number;
  name: string;
  description: string;
  layout: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  enemies: EnemyConfig[];
  objectives: string[];
  rewards: string[];
  puzzles: string[];
  secrets: string[];
  boss?: BossConfig;
}

export interface EnemyConfig {
  name: string;
  type: string;
  count: number;
  hp: number;
  damage: number;
  speed: number;
  description: string;
}

export interface BossConfig {
  name: string;
  hp: number;
  damage: number;
  phases: number;
  abilities: string[];
  weakness: string;
  description: string;
}

export interface DifficultyCurve {
  levels: { level: number; difficulty: number }[];
  description: string;
  spikes: number[];
  valleys: number[];
}

export interface StoryContent {
  mainPlot: string[];
  characters: Character[];
  dialogues: DialogueLine[];
  quests: Quest[];
  endings: Ending[];
}

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'companion' | 'npc';
  description: string;
  personality: string[];
  background: string;
  motivations: string[];
  appearance: string;
  skills: string[];
}

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  emotion: string;
  context?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'main' | 'side' | 'daily';
  objectives: string[];
  rewards: string[];
  difficulty: string;
}

export interface Ending {
  id: string;
  name: string;
  description: string;
  condition: string;
  type: 'good' | 'bad' | 'neutral' | 'hidden';
}

export interface CharacterStats {
  name: string;
  class: string;
  baseStats: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
    magic: number;
  };
  growthRates: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
    magic: number;
  };
  skills: Skill[];
}

export interface Skill {
  name: string;
  description: string;
  type: 'active' | 'passive';
  cooldown: number;
  damage?: number;
  healing?: number;
  effect?: string;
}

export interface EconomyBalance {
  currency: string;
  startingGold: number;
  goldPerLevel: number;
  itemPriceRange: {
    common: [number, number];
    rare: [number, number];
    epic: [number, number];
    legendary: [number, number];
  };
  experienceCurve: number[];
  levelUpRewards: string[];
}

export interface EquipmentItem {
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stats: Record<string, number>;
  description: string;
  value: number;
}

export interface DesignDocument {
  id: string;
  title: string;
  gameTitle: string;
  genre: GameGenre;
  createdAt: string;
  updatedAt: string;
  sections: DocumentSection[];
  revisionHistory: RevisionEntry[];
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface RevisionEntry {
  version: string;
  date: string;
  author: string;
  changes: string[];
}

export interface DesignIteration {
  iteration: number;
  feedback: string;
  changes: string[];
  previousVersion: string;
  currentVersion: string;
}

const PRESET_CHARACTERS: Character[] = [
  {
    id: 'hero-warrior',
    name: '艾伦',
    role: 'protagonist',
    description: '出身贫寒的年轻战士，拥有强烈的正义感',
    personality: ['勇敢', '正直', '有点冲动', '重视伙伴'],
    background: '从小在乡村长大，父母在一次魔物袭击中去世，被村里的老兵收养',
    motivations: ['为父母报仇', '保护弱小', '成为最强的战士'],
    appearance: '金色短发，蓝色眼睛，身材高大，穿着蓝色铠甲',
    skills: ['剑术精通', '护盾防御', '战吼', '致命一击'],
  },
  {
    id: 'hero-mage',
    name: '莉娜',
    role: 'companion',
    description: '魔法学院的天才少女，性格活泼开朗',
    personality: ['聪明', '好奇', '乐观', '有点小傲娇'],
    background: '出生于魔法世家，从小就展现出惊人的魔法天赋',
    motivations: ['探索未知魔法', '证明自己的实力', '帮助朋友'],
    appearance: '紫色长发，绿色眼睛，穿着紫色魔法袍，戴着尖顶帽',
    skills: ['火球术', '冰霜新星', '治疗术', '传送门'],
  },
  {
    id: 'villain-dark-lord',
    name: '暗影魔王',
    role: 'antagonist',
    description: '千年之前被封印的黑暗君主，如今再次苏醒',
    personality: ['冷酷', '狡猾', '野心勃勃', '看不起人类'],
    background: '曾经是天界的天使，因为反抗神的权威而被打入深渊',
    motivations: ['征服世界', '向神复仇', '建立永恒的黑暗王国'],
    appearance: '全身被黑色铠甲覆盖，双眼散发红色光芒，手持暗黑巨剑',
    skills: ['暗影斩', '亡灵召唤', '黑暗护盾', '毁灭光束'],
  },
];

const PRESET_QUESTS: Quest[] = [
  {
    id: 'quest-001',
    title: '初出茅庐',
    description: '离开家乡，踏上冒险之旅',
    type: 'main',
    objectives: ['离开村庄', '前往附近的城镇', '报告给镇长'],
    rewards: ['100金币', '新手剑', '50经验值'],
    difficulty: '简单',
  },
  {
    id: 'quest-002',
    title: '森林中的威胁',
    description: '调查森林中出现的魔物',
    type: 'main',
    objectives: ['进入黑暗森林', '消灭10只哥布林', '击败哥布林首领'],
    rewards: ['300金币', '铁剑', '200经验值'],
    difficulty: '普通',
  },
  {
    id: 'quest-003',
    title: '失踪的孩子',
    description: '帮助村民寻找失踪的孩子',
    type: 'side',
    objectives: ['与村民对话', '搜索洞穴', '救出孩子', '击败绑匪'],
    rewards: ['200金币', '治疗药水x5', '150经验值'],
    difficulty: '普通',
  },
];

const PRESET_ENEMIES: EnemyConfig[] = [
  { name: '哥布林', type: 'humanoid', count: 5, hp: 30, damage: 5, speed: 3, description: '弱小但狡猾的绿皮生物' },
  { name: '骷髅兵', type: 'undead', count: 3, hp: 50, damage: 8, speed: 2, description: '被黑魔法复活的骷髅战士' },
  { name: '史莱姆', type: 'creature', count: 8, hp: 20, damage: 3, speed: 1, description: '果冻状的软体生物' },
  { name: '狼人', type: 'beast', count: 2, hp: 80, damage: 15, speed: 5, description: '月圆之夜会变身的诅咒生物' },
];

export class AIGameDesignService {
  private documents: Map<string, DesignDocument> = new Map();
  private currentDocumentId: string | null = null;
  private iterationHistory: Map<string, DesignIteration[]> = new Map();

  constructor() {
    this.loadPresetDocuments();
  }

  private loadPresetDocuments(): void {
    const presetDoc: DesignDocument = {
      id: 'preset-rpg-doc',
      title: '幻域战记 - 设计文档',
      gameTitle: '幻域战记',
      genre: 'rpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [
        {
          id: 'section-overview',
          title: '游戏概述',
          content: '《幻域战记》是一款奇幻风格的回合制RPG游戏。玩家将扮演一位年轻的勇者，在魔法与剑的世界中展开冒险，结识伙伴，击败邪恶势力，最终拯救世界。',
          order: 1,
        },
        {
          id: 'section-gameplay',
          title: '核心玩法',
          content: '1. 回合制战斗系统\n2. 角色成长与技能树\n3. 装备收集与强化\n4. 多结局剧情分支\n5. 探索与解谜元素',
          order: 2,
        },
        {
          id: 'section-story',
          title: '故事背景',
          content: '千年之前，暗影魔王被七位英雄封印在深渊之中。然而，随着时间的流逝，封印的力量逐渐减弱。一天，天空中出现了不祥的血色月亮，预示着黑暗的回归。年轻的勇者艾伦，在故乡被毁之后，踏上了寻找伙伴、阻止暗影魔王复活的旅程。',
          order: 3,
        },
      ],
      revisionHistory: [
        {
          version: '1.0',
          date: new Date().toISOString(),
          author: 'AI Assistant',
          changes: ['初始版本创建', '添加游戏概述', '添加核心玩法', '添加故事背景'],
        },
      ],
    };

    this.documents.set(presetDoc.id, presetDoc);
  }

  generateGameConcept(description: string, genre: GameGenre): GameConcept {
    const concept = this.createConceptFromDescription(description, genre);
    globalEventBus.emit('ai-game-design:concept-generated', { concept, description, genre });
    return concept;
  }

  private createConceptFromDescription(description: string, genre: GameGenre): GameConcept {
    const conceptsByGenre: Record<GameGenre, Partial<GameConcept>> = {
      rpg: {
        title: this.extractTitle(description) || '幻域战记',
        tagline: '在魔法与剑的世界中，书写你的传奇',
        coreGameplay: ['回合制战斗', '角色成长', '装备收集', '剧情分支', '探索解谜'],
        uniqueSellingPoints: ['多结局系统', '伙伴关系系统', '深度剧情', '丰富的职业选择'],
        targetAudience: '16-35岁，喜欢角色扮演和剧情向游戏的玩家',
        estimatedPlaytime: '30-50小时（主线），80-100小时（全收集）',
        artStyle: '二次元奇幻风格，色彩鲜艳，角色设计精美',
        mood: '史诗感、冒险、友情、成长',
      },
      casual: {
        title: this.extractTitle(description) || '快乐消消乐',
        tagline: '轻松有趣，随时随地畅玩',
        coreGameplay: ['三消玩法', '关卡挑战', '道具收集', '成就系统'],
        uniqueSellingPoints: ['简单易上手', '碎片化时间', '可爱画风', '社交互动'],
        targetAudience: '全年龄段，休闲玩家，女性玩家为主',
        estimatedPlaytime: '每次5-15分钟',
        artStyle: 'Q版卡通风格，色彩明亮可爱',
        mood: '轻松、愉快、治愈',
      },
      strategy: {
        title: this.extractTitle(description) || '王国崛起',
        tagline: '运筹帷幄，决胜千里',
        coreGameplay: ['基地建设', '资源管理', '军队训练', '战术对战', '外交系统'],
        uniqueSellingPoints: ['实时战略', '多文明选择', '深度经济系统', '多人对战'],
        targetAudience: '18-40岁，喜欢策略和经营类游戏的玩家',
        estimatedPlaytime: '20-40小时（单人），无限（多人）',
        artStyle: '写实风格，细节丰富，场面宏大',
        mood: '紧张、策略、成就感',
      },
      action: {
        title: this.extractTitle(description) || '疾风战神',
        tagline: '快节奏战斗，爽快感十足',
        coreGameplay: ['即时战斗', '技能连击', 'Boss挑战', '装备升级', '关卡探索'],
        uniqueSellingPoints: ['流畅的战斗系统', '丰富的武器选择', '华丽的技能特效', '高难度挑战'],
        targetAudience: '16-30岁，喜欢动作游戏的玩家',
        estimatedPlaytime: '15-25小时（主线）',
        artStyle: '科幻/奇幻风格，动感十足，特效华丽',
        mood: '刺激、紧张、爽快',
      },
      puzzle: {
        title: this.extractTitle(description) || '迷境之塔',
        tagline: '开动脑筋，挑战极限',
        coreGameplay: ['关卡解谜', '机关操控', '收集要素', '剧情推进'],
        uniqueSellingPoints: ['创新解谜机制', '优美画风', '治愈剧情', '渐进式难度'],
        targetAudience: '全年龄段，喜欢益智游戏的玩家',
        estimatedPlaytime: '10-20小时',
        artStyle: '极简/唯美风格，设计感强',
        mood: '平静、思考、成就感',
      },
    };

    const base = conceptsByGenre[genre];
    const descriptionLower = description.toLowerCase();

    if (descriptionLower.includes('像素') || descriptionLower.includes('pixel')) {
      base.artStyle = '像素风格，复古怀旧';
    }
    if (descriptionLower.includes('赛博') || descriptionLower.includes('cyber')) {
      base.artStyle = '赛博朋克风格，霓虹灯光，未来感十足';
      base.mood = '科幻、神秘、紧张';
    }
    if (descriptionLower.includes('恐怖') || descriptionLower.includes('horror')) {
      base.mood = '恐怖、压抑、惊悚';
      base.artStyle = '黑暗写实风格，氛围恐怖';
    }

    return {
      title: base.title || '新游戏',
      genre,
      tagline: base.tagline || '',
      description: description,
      coreGameplay: base.coreGameplay || [],
      uniqueSellingPoints: base.uniqueSellingPoints || [],
      targetAudience: base.targetAudience || '',
      estimatedPlaytime: base.estimatedPlaytime || '',
      artStyle: base.artStyle || '',
      mood: base.mood || '',
    };
  }

  private extractTitle(description: string): string | undefined {
    const match = description.match(/《(.+?)》/);
    if (match) return match[1];
    const firstSentence = description.split(/[。！？.!?]/)[0];
    if (firstSentence.length < 20) return firstSentence;
    return undefined;
  }

  generateLevelDesign(levelNumber: number, difficulty: number, genre: GameGenre): LevelDesign {
    const level: LevelDesign = {
      levelNumber,
      name: `第${levelNumber}关 - ${this.getLevelName(levelNumber)}`,
      description: this.getLevelDescription(levelNumber, difficulty, genre),
      layout: this.getLevelLayout(levelNumber, genre),
      difficulty: Math.min(5, Math.max(1, difficulty)) as 1 | 2 | 3 | 4 | 5,
      enemies: this.generateEnemies(levelNumber, difficulty),
      objectives: this.generateObjectives(levelNumber, genre),
      rewards: this.generateRewards(levelNumber, difficulty),
      puzzles: this.generatePuzzles(levelNumber, genre),
      secrets: this.generateSecrets(levelNumber),
      boss: levelNumber % 5 === 0 ? this.generateBoss(levelNumber) : undefined,
    };

    globalEventBus.emit('ai-game-design:level-generated', { levelNumber, level });
    return level;
  }

  private getLevelName(levelNumber: number): string {
    const names = [
      '初始森林', '迷雾沼泽', '古老遗迹', '暗影洞穴', 'Boss之塔',
      '冰雪荒原', '火山熔岩', '沙漠绿洲', '雷霆峡谷', '魔王城堡',
    ];
    return names[(levelNumber - 1) % names.length];
  }

  private getLevelDescription(levelNumber: number, difficulty: number, genre: GameGenre): string {
    const templates = [
      '这是冒险的起点，适合新手熟悉操作。',
      '难度逐渐提升，需要更多的策略思考。',
      '中等难度的挑战，考验玩家的综合能力。',
      '高难度关卡，需要熟练掌握各种技巧。',
      'Boss关卡，一场惊心动魄的大战即将开始！',
    ];
    const index = Math.min(Math.floor(difficulty), templates.length - 1);
    return templates[index];
  }

  private getLevelLayout(levelNumber: number, genre: GameGenre): string {
    const layouts = [
      '线性关卡，一条主路通向终点',
      '分支路线，有多种探索路径',
      '开放式地图，自由探索',
      '迷宫式设计，需要寻找正确路线',
      '多层结构，上下穿梭',
    ];
    return layouts[levelNumber % layouts.length];
  }

  private generateEnemies(levelNumber: number, difficulty: number): EnemyConfig[] {
    const enemies: EnemyConfig[] = [];
    const baseEnemy = PRESET_ENEMIES[levelNumber % PRESET_ENEMIES.length];
    const multiplier = 1 + (levelNumber - 1) * 0.2;
    const countMultiplier = 1 + (difficulty - 1) * 0.3;

    enemies.push({
      ...baseEnemy,
      count: Math.floor(baseEnemy.count * countMultiplier),
      hp: Math.floor(baseEnemy.hp * multiplier),
      damage: Math.floor(baseEnemy.damage * multiplier),
    });

    if (levelNumber > 3) {
      const secondEnemy = PRESET_ENEMIES[(levelNumber + 1) % PRESET_ENEMIES.length];
      enemies.push({
        ...secondEnemy,
        count: Math.floor(secondEnemy.count * countMultiplier * 0.5),
        hp: Math.floor(secondEnemy.hp * multiplier),
        damage: Math.floor(secondEnemy.damage * multiplier),
      });
    }

    return enemies;
  }

  private generateObjectives(levelNumber: number, genre: GameGenre): string[] {
    const objectives = ['到达关卡终点', '消灭所有敌人'];

    if (levelNumber > 2) {
      objectives.push('收集3个宝物');
    }
    if (levelNumber > 4) {
      objectives.push('解开机关谜题');
    }
    if (levelNumber % 5 === 0) {
      objectives.push('击败Boss');
    }

    return objectives;
  }

  private generateRewards(levelNumber: number, difficulty: number): string[] {
    const gold = 50 + levelNumber * 30 + difficulty * 20;
    const exp = 100 + levelNumber * 50;
    const rewards = [`${gold} 金币`, `${exp} 经验值`];

    if (levelNumber % 3 === 0) {
      rewards.push('稀有装备 x1');
    }
    if (levelNumber % 5 === 0) {
      rewards.push('史诗装备 x1');
    }

    return rewards;
  }

  private generatePuzzles(levelNumber: number, genre: GameGenre): string[] {
    const puzzles: string[] = [];
    if (levelNumber > 2) {
      puzzles.push('推箱子谜题');
    }
    if (levelNumber > 4) {
      puzzles.push('开关机关');
    }
    if (levelNumber > 6) {
      puzzles.push('符文解谜');
    }
    return puzzles;
  }

  private generateSecrets(levelNumber: number): string[] {
    const secrets = ['隐藏宝箱'];
    if (levelNumber > 3) {
      secrets.push('隐藏通道');
    }
    if (levelNumber > 5) {
      secrets.push('彩蛋房间');
    }
    return secrets;
  }

  private generateBoss(levelNumber: number): BossConfig {
    const bossNames = ['哥布林王', '骷髅领主', '炎魔', '冰霜巨人', '暗影骑士'];
    const index = Math.floor(levelNumber / 5) % bossNames.length;
    const multiplier = 1 + levelNumber * 0.3;

    return {
      name: `${bossNames[index]} Lv.${levelNumber}`,
      hp: Math.floor(500 * multiplier),
      damage: Math.floor(20 * multiplier),
      phases: Math.min(3, 1 + Math.floor(levelNumber / 10)),
      abilities: ['普通攻击', '范围技能', '召唤小怪'],
      weakness: '头部',
      description: '这个关卡的守护者，拥有强大的力量和独特的攻击模式。',
    };
  }

  generateDifficultyCurve(totalLevels: number): DifficultyCurve {
    const curve: { level: number; difficulty: number }[] = [];
    const spikes: number[] = [];
    const valleys: number[] = [];

    for (let i = 1; i <= totalLevels; i++) {
      let difficulty = 1 + (i - 1) * (4 / (totalLevels - 1));

      if (i % 5 === 0) {
        difficulty += 0.5;
        spikes.push(i);
      }

      if (i % 5 === 1 && i > 1) {
        difficulty -= 0.3;
        valleys.push(i);
      }

      difficulty = Math.min(5, Math.max(1, difficulty));
      curve.push({ level: i, difficulty: Math.round(difficulty * 10) / 10 });
    }

    const result: DifficultyCurve = {
      levels: curve,
      description: '整体难度逐渐上升，每5关有一个难度峰值（Boss战），之后略有回落，符合经典的难度曲线设计。',
      spikes,
      valleys,
    };

    globalEventBus.emit('ai-game-design:difficulty-curve-generated', { totalLevels, curve: result });
    return result;
  }

  generateStory(concept: GameConcept, length: 'short' | 'medium' | 'long' = 'medium'): StoryContent {
    const mainPlot = this.generateMainPlot(concept, length);
    const characters = this.generateCharacters(concept);
    const dialogues = this.generateSampleDialogues(characters);
    const quests = this.generateQuests(concept);
    const endings = this.generateEndings(concept);

    const story: StoryContent = {
      mainPlot,
      characters,
      dialogues,
      quests,
      endings,
    };

    globalEventBus.emit('ai-game-design:story-generated', { concept, story });
    return story;
  }

  private generateMainPlot(concept: GameConcept, length: string): string[] {
    const basePlot = [
      '序章：主角平静的生活被打破，踏上冒险之旅',
      '第一章：结识第一个伙伴，了解世界的危机',
      '第二章：探索第一个地下城，获得重要线索',
      '第三章：揭示反派的阴谋，战斗升级',
      '第四章：伙伴关系加深，解锁新能力',
      '第五章：最终决战，迎接命运的挑战',
    ];

    if (length === 'short') {
      return [basePlot[0], basePlot[2], basePlot[5]];
    }
    if (length === 'long') {
      return [
        ...basePlot.slice(0, 3),
        '第二章半：支线冒险，深入探索世界观',
        ...basePlot.slice(3, 5),
        '第四章半：黑暗时期，主角陷入低谷',
        basePlot[5],
        '终章：结局与后日谈',
      ];
    }
    return basePlot;
  }

  private generateCharacters(concept: GameConcept): Character[] {
    return [...PRESET_CHARACTERS];
  }

  private generateSampleDialogues(characters: Character[]): DialogueLine[] {
    return [
      {
        id: 'dialogue-001',
        speaker: characters[0].name,
        text: '我一定要变强，然后保护大家！',
        emotion: '坚定',
        context: '主角在父母墓前发誓',
      },
      {
        id: 'dialogue-002',
        speaker: characters[1].name,
        text: '哼，本天才可是魔法学院的高材生呢！',
        emotion: '骄傲',
        context: '刚认识时的自我介绍',
      },
      {
        id: 'dialogue-003',
        speaker: characters[2].name,
        text: '愚蠢的人类，你们根本无法理解真正的力量！',
        emotion: '傲慢',
        context: '第一次遭遇反派',
      },
      {
        id: 'dialogue-004',
        speaker: characters[0].name,
        text: '不管你多强，我都不会放弃的！',
        emotion: '决心',
        context: '最终决战前的宣言',
      },
    ];
  }

  private generateQuests(concept: GameConcept): Quest[] {
    return [...PRESET_QUESTS];
  }

  private generateEndings(concept: GameConcept): Ending[] {
    return [
      {
        id: 'ending-good',
        name: '完美结局',
        description: '成功击败反派，世界恢复和平，主角和伙伴们继续新的冒险。',
        condition: '完成所有主线任务，所有伙伴存活',
        type: 'good',
      },
      {
        id: 'ending-normal',
        name: '普通结局',
        description: '击败了反派，但付出了沉重的代价，部分伙伴牺牲。',
        condition: '完成主线任务，但有伙伴牺牲',
        type: 'neutral',
      },
      {
        id: 'ending-bad',
        name: '黑暗结局',
        description: '反派获胜，世界陷入黑暗...',
        condition: '最终决战失败',
        type: 'bad',
      },
      {
        id: 'ending-hidden',
        name: '真结局',
        description: '揭示了更深层的真相，开启了新的篇章。',
        condition: '收集所有隐藏要素，完成所有支线任务',
        type: 'hidden',
      },
    ];
  }

  generateCharacterDesign(name: string, role: string, concept: GameConcept): CharacterStats {
    const classes = ['战士', '法师', '弓箭手', '盗贼', '牧师'];
    const className = classes[Math.floor(Math.random() * classes.length)];

    const character: CharacterStats = {
      name,
      class: className,
      baseStats: {
        health: 100 + Math.floor(Math.random() * 50),
        attack: 10 + Math.floor(Math.random() * 10),
        defense: 8 + Math.floor(Math.random() * 8),
        speed: 5 + Math.floor(Math.random() * 5),
        magic: 5 + Math.floor(Math.random() * 10),
      },
      growthRates: {
        health: 15 + Math.floor(Math.random() * 10),
        attack: 2 + Math.random() * 2,
        defense: 1.5 + Math.random() * 1.5,
        speed: 0.5 + Math.random() * 1,
        magic: 1 + Math.random() * 2,
      },
      skills: this.generateSkills(className),
    };

    globalEventBus.emit('ai-game-design:character-generated', { name, character });
    return character;
  }

  private generateSkills(className: string): Skill[] {
    const skillSets: Record<string, Skill[]> = {
      '战士': [
        { name: '重击', description: '造成150%攻击力伤害', type: 'active', cooldown: 3, damage: 150 },
        { name: '防御姿态', description: '减少50%受到的伤害，持续3回合', type: 'active', cooldown: 5, effect: 'defense_up' },
        { name: '战斗本能', description: '生命值低于30%时，攻击力提升20%', type: 'passive', cooldown: 0, effect: 'berserk' },
      ],
      '法师': [
        { name: '火球术', description: '造成200%魔法伤害', type: 'active', cooldown: 3, damage: 200 },
        { name: '治疗术', description: '恢复30%最大生命值', type: 'active', cooldown: 4, healing: 30 },
        { name: '魔力增幅', description: '魔法伤害提升15%', type: 'passive', cooldown: 0, effect: 'magic_up' },
      ],
      '弓箭手': [
        { name: '精准射击', description: '造成180%攻击力伤害，必定暴击', type: 'active', cooldown: 4, damage: 180 },
        { name: '闪避', description: '有30%几率闪避攻击', type: 'passive', cooldown: 0, effect: 'dodge' },
        { name: '多重箭', description: '同时攻击3个敌人', type: 'active', cooldown: 5, damage: 100 },
      ],
      '盗贼': [
        { name: '背刺', description: '从背后攻击造成250%伤害', type: 'active', cooldown: 4, damage: 250 },
        { name: '偷窃', description: '有几率从敌人身上偷取物品', type: 'active', cooldown: 3, effect: 'steal' },
        { name: '潜行', description: '进入隐身状态，下次攻击必定暴击', type: 'active', cooldown: 6, effect: 'stealth' },
      ],
      '牧师': [
        { name: '圣光术', description: '恢复50%最大生命值', type: 'active', cooldown: 5, healing: 50 },
        { name: '神圣护盾', description: '为队友施加护盾，吸收伤害', type: 'active', cooldown: 6, effect: 'shield' },
        { name: '祝福', description: '全体队友属性提升10%', type: 'passive', cooldown: 0, effect: 'buff_all' },
      ],
    };

    return skillSets[className] || skillSets['战士'];
  }

  generateEconomyBalance(levelCap: number): EconomyBalance {
    const experienceCurve: number[] = [];
    let exp = 100;
    for (let i = 1; i <= levelCap; i++) {
      experienceCurve.push(Math.floor(exp));
      exp *= 1.15;
    }

    const economy: EconomyBalance = {
      currency: '金币',
      startingGold: 500,
      goldPerLevel: 100,
      itemPriceRange: {
        common: [50, 200],
        rare: [300, 800],
        epic: [1000, 3000],
        legendary: [5000, 10000],
      },
      experienceCurve,
      levelUpRewards: ['属性提升', '技能点+1', '新技能解锁'],
    };

    globalEventBus.emit('ai-game-design:economy-generated', { levelCap, economy });
    return economy;
  }

  generateEquipment(rarity: 'common' | 'rare' | 'epic' | 'legendary', type: 'weapon' | 'armor' | 'accessory' | 'consumable'): EquipmentItem {
    const rarityMultiplier = { common: 1, rare: 2, epic: 4, legendary: 8 };
    const mult = rarityMultiplier[rarity];

    const weaponNames = ['铁剑', '精钢剑', '火焰剑', '圣剑'];
    const armorNames = ['皮甲', '锁子甲', '板甲', '龙鳞甲'];
    const accessoryNames = ['铜戒指', '银项链', '金护符', '神器'];
    const consumableNames = ['治疗药水', '魔力药水', '力量药水', '复活药水'];

    const nameMap: Record<string, string[]> = {
      weapon: weaponNames,
      armor: armorNames,
      accessory: accessoryNames,
      consumable: consumableNames,
    };

    const rarityIndex = { common: 0, rare: 1, epic: 2, legendary: 3 };
    const name = nameMap[type][rarityIndex[rarity]];

    const baseStats: Record<string, number> = {};
    if (type === 'weapon') {
      baseStats['攻击力'] = 10 * mult;
      baseStats['暴击率'] = 5 * mult;
    } else if (type === 'armor') {
      baseStats['防御力'] = 15 * mult;
      baseStats['生命值'] = 50 * mult;
    } else if (type === 'accessory') {
      baseStats['全属性'] = 5 * mult;
      baseStats['经验加成'] = 10 * mult;
    } else {
      baseStats['恢复量'] = 100 * mult;
    }

    const item: EquipmentItem = {
      name,
      type,
      rarity,
      stats: baseStats,
      description: `${rarity}品质的${type}`,
      value: (rarityIndex[rarity] + 1) * 100 * mult,
    };

    globalEventBus.emit('ai-game-design:equipment-generated', { item });
    return item;
  }

  createDesignDocument(title: string, gameTitle: string, genre: GameGenre): DesignDocument {
    const id = `doc-${Date.now()}`;
    const now = new Date().toISOString();

    const doc: DesignDocument = {
      id,
      title,
      gameTitle,
      genre,
      createdAt: now,
      updatedAt: now,
      sections: [
        { id: 'section-overview', title: '游戏概述', content: '', order: 1 },
        { id: 'section-gameplay', title: '核心玩法', content: '', order: 2 },
        { id: 'section-story', title: '故事设定', content: '', order: 3 },
        { id: 'section-characters', title: '角色设定', content: '', order: 4 },
        { id: 'section-levels', title: '关卡设计', content: '', order: 5 },
        { id: 'section-economy', title: '数值经济', content: '', order: 6 },
        { id: 'section-art', title: '美术风格', content: '', order: 7 },
        { id: 'section-sound', title: '音乐音效', content: '', order: 8 },
      ],
      revisionHistory: [
        {
          version: '1.0',
          date: now,
          author: 'AI Assistant',
          changes: ['创建设计文档'],
        },
      ],
    };

    this.documents.set(id, doc);
    this.iterationHistory.set(id, []);
    globalEventBus.emit('ai-game-design:document-created', { document: doc });
    return doc;
  }

  getDocument(id: string): DesignDocument | undefined {
    return this.documents.get(id);
  }

  getAllDocuments(): DesignDocument[] {
    return Array.from(this.documents.values());
  }

  updateDocumentSection(docId: string, sectionId: string, content: string): boolean {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    const section = doc.sections.find((s) => s.id === sectionId);
    if (!section) return false;

    section.content = content;
    doc.updatedAt = new Date().toISOString();

    globalEventBus.emit('ai-game-design:document-updated', { docId, sectionId });
    return true;
  }

  iterateDesign(docId: string, feedback: string): DesignIteration | undefined {
    const doc = this.documents.get(docId);
    if (!doc) return undefined;

    const history = this.iterationHistory.get(docId) || [];
    const iterationNum = history.length + 1;
    const prevVersion = doc.revisionHistory[doc.revisionHistory.length - 1]?.version || '1.0';
    const newVersion = `${parseInt(prevVersion) + iterationNum * 0.1}`;

    const iteration: DesignIteration = {
      iteration: iterationNum,
      feedback,
      changes: this.generateIterationChanges(feedback),
      previousVersion: prevVersion,
      currentVersion: newVersion,
    };

    history.push(iteration);
    this.iterationHistory.set(docId, history);

    doc.revisionHistory.push({
      version: newVersion,
      date: new Date().toISOString(),
      author: 'AI Assistant',
      changes: iteration.changes,
    });
    doc.updatedAt = new Date().toISOString();

    globalEventBus.emit('ai-game-design:design-iterated', { docId, iteration });
    return iteration;
  }

  private generateIterationChanges(feedback: string): string[] {
    const changes: string[] = [];
    const lower = feedback.toLowerCase();

    if (lower.includes('难度') || lower.includes('difficulty')) {
      changes.push('调整了游戏难度曲线');
    }
    if (lower.includes('故事') || lower.includes('剧情') || lower.includes('story')) {
      changes.push('优化了剧情节奏');
    }
    if (lower.includes('角色') || lower.includes('character')) {
      changes.push('丰富了角色设定');
    }
    if (lower.includes('战斗') || lower.includes('战斗系统') || lower.includes('combat')) {
      changes.push('改进了战斗系统');
    }
    if (lower.includes('平衡') || lower.includes('balance')) {
      changes.push('调整了数值平衡');
    }

    if (changes.length === 0) {
      changes.push('根据反馈进行了整体优化');
    }

    return changes;
  }

  generateDesignDocumentMarkdown(docId: string): string | undefined {
    const doc = this.documents.get(docId);
    if (!doc) return undefined;

    const lines: string[] = [];
    lines.push(`# ${doc.title}`);
    lines.push('');
    lines.push(`**游戏名称**: ${doc.gameTitle}`);
    lines.push(`**游戏类型**: ${this.genreToChinese(doc.genre)}`);
    lines.push(`**创建时间**: ${doc.createdAt}`);
    lines.push(`**最后更新**: ${doc.updatedAt}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    const sortedSections = [...doc.sections].sort((a, b) => a.order - b.order);
    for (const section of sortedSections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content || '*（待填写）*');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## 修订历史');
    lines.push('');
    for (const rev of doc.revisionHistory) {
      lines.push(`### v${rev.version} - ${rev.date}`);
      lines.push(`- 作者: ${rev.author}`);
      lines.push(`- 变更:`);
      for (const change of rev.changes) {
        lines.push(`  - ${change}`);
      }
      lines.push('');
    }

    const markdown = lines.join('\n');
    globalEventBus.emit('ai-game-design:document-exported', { docId, format: 'markdown' });
    return markdown;
  }

  private genreToChinese(genre: GameGenre): string {
    const map: Record<GameGenre, string> = {
      rpg: '角色扮演 (RPG)',
      casual: '休闲游戏',
      strategy: '策略游戏',
      action: '动作游戏',
      puzzle: '解谜游戏',
    };
    return map[genre];
  }

  setCurrentDocument(docId: string | null): void {
    this.currentDocumentId = docId;
    globalEventBus.emit('ai-game-design:current-document-changed', { docId });
  }

  getCurrentDocument(): DesignDocument | undefined {
    if (!this.currentDocumentId) return undefined;
    return this.documents.get(this.currentDocumentId);
  }

  getIterationHistory(docId: string): DesignIteration[] {
    return this.iterationHistory.get(docId) || [];
  }
}

export const aiGameDesignService = new AIGameDesignService();
