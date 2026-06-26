/**
 * 成就与排行榜服务
 * - 成就管理：成就列表、成就详情、创建/编辑成就
 * - 成就属性：名称、描述、图标、稀有度、达成条件、奖励
 * - 成就类型：普通成就、隐藏成就、阶段性成就、限时成就
 * - 成就进度：用户进度、百分比、解锁时间
 * - 排行榜配置：排行榜列表、排行榜类型、分数更新规则
 * - 排行榜类型：分数榜、等级榜、战力榜、通关榜、周榜/月榜
 * - 分数管理：提交分数、分数校验、排行榜查询
 * - 排行榜数据：排名、玩家信息、分数、更新时间
 * - 奖励配置：排名奖励、成就奖励
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from '../utils/crypto-utils';

export type AchievementType = 'normal' | 'hidden' | 'stage' | 'limited';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type LeaderboardType = 'score' | 'level' | 'power' | 'clear' | 'weekly' | 'monthly';
export type LeaderboardOrder = 'asc' | 'desc';
export type LeaderboardResetPeriod = 'daily' | 'weekly' | 'monthly' | 'never';
export type RewardType = 'coins' | 'diamonds' | 'item' | 'title' | 'avatar' | 'frame' | 'exp';

export interface AchievementCondition {
  type: string;
  target: number;
  unit?: string;
  description?: string;
}

export interface AchievementReward {
  type: RewardType;
  amount?: number;
  itemId?: string;
  itemName?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: AchievementType;
  rarity: AchievementRarity;
  points: number;
  conditions: AchievementCondition[];
  rewards: AchievementReward[];
  hidden?: boolean;
  limited?: {
    startAt: number;
    endAt: number;
  };
  stages?: {
    threshold: number;
    description: string;
    rewards?: AchievementReward[];
  }[];
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserAchievementProgress {
  achievementId: string;
  progress: number;
  total: number;
  percentage: number;
  unlocked: boolean;
  unlockedAt?: number;
  currentStage?: number;
  lastUpdated: number;
}

export interface LeaderboardConfig {
  id: string;
  name: string;
  description: string;
  type: LeaderboardType;
  order: LeaderboardOrder;
  resetPeriod: LeaderboardResetPeriod;
  maxEntries: number;
  scoreField: string;
  scoreValidation?: {
    min?: number;
    max?: number;
    integerOnly?: boolean;
  };
  category: string;
  isActive: boolean;
  sortOrder: number;
  icon: string;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  playerLevel?: number;
  score: number;
  extraData?: Record<string, unknown>;
  updatedAt: number;
}

export interface LeaderboardReward {
  leaderboardId: string;
  rankRange: [number, number];
  rewards: AchievementReward[];
}

export interface PlayerRankInfo {
  rank: number;
  score: number;
  previousRank?: number;
  rankChange?: number;
}

const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-001',
    name: '初出茅庐',
    description: '完成新手教程',
    icon: '🏆',
    type: 'normal',
    rarity: 'common',
    points: 10,
    conditions: [{ type: 'tutorial_complete', target: 1, description: '完成新手教程' }],
    rewards: [
      { type: 'coins', amount: 100 },
      { type: 'exp', amount: 50 },
    ],
    category: '新手',
    sortOrder: 1,
    isActive: true,
    createdAt: Date.now() - 90 * 86400000,
    updatedAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'ach-002',
    name: '首战告捷',
    description: '赢得第一场战斗',
    icon: '⚔️',
    type: 'normal',
    rarity: 'common',
    points: 15,
    conditions: [{ type: 'battle_wins', target: 1, description: '赢得1场战斗' }],
    rewards: [{ type: 'coins', amount: 200 }],
    category: '战斗',
    sortOrder: 2,
    isActive: true,
    createdAt: Date.now() - 90 * 86400000,
    updatedAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'ach-003',
    name: '百战不殆',
    description: '累计赢得100场战斗',
    icon: '💪',
    type: 'stage',
    rarity: 'rare',
    points: 50,
    conditions: [{ type: 'battle_wins', target: 100, unit: '场', description: '赢得100场战斗' }],
    rewards: [
      { type: 'coins', amount: 1000 },
      { type: 'title', itemName: '百战老兵' },
    ],
    stages: [
      { threshold: 10, description: '赢得10场', rewards: [{ type: 'coins', amount: 100 }] },
      { threshold: 50, description: '赢得50场', rewards: [{ type: 'coins', amount: 500 }] },
      {
        threshold: 100,
        description: '赢得100场',
        rewards: [
          { type: 'coins', amount: 1000 },
          { type: 'title', itemName: '百战老兵' },
        ],
      },
    ],
    category: '战斗',
    sortOrder: 3,
    isActive: true,
    createdAt: Date.now() - 90 * 86400000,
    updatedAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'ach-004',
    name: '富甲一方',
    description: '累计获得10000金币',
    icon: '💰',
    type: 'normal',
    rarity: 'uncommon',
    points: 25,
    conditions: [
      { type: 'total_coins', target: 10000, unit: '金币', description: '累计获得10000金币' },
    ],
    rewards: [{ type: 'diamonds', amount: 50 }],
    category: '收集',
    sortOrder: 4,
    isActive: true,
    createdAt: Date.now() - 90 * 86400000,
    updatedAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'ach-005',
    name: '传奇之路',
    description: '达到最高等级',
    icon: '👑',
    type: 'hidden',
    rarity: 'legendary',
    points: 200,
    conditions: [{ type: 'max_level', target: 100, unit: '级', description: '达到100级' }],
    rewards: [
      { type: 'avatar', itemId: 'legendary_avatar', itemName: '传奇头像' },
      { type: 'frame', itemId: 'golden_frame', itemName: '金色边框' },
    ],
    hidden: true,
    category: '成长',
    sortOrder: 5,
    isActive: true,
    createdAt: Date.now() - 90 * 86400000,
    updatedAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'ach-006',
    name: '赛季王者',
    description: 'S1赛季排行榜第一',
    icon: '🏅',
    type: 'limited',
    rarity: 'epic',
    points: 150,
    conditions: [{ type: 'season_rank', target: 1, description: '赛季排名第一' }],
    rewards: [
      { type: 'title', itemName: 'S1王者' },
      { type: 'diamonds', amount: 500 },
    ],
    limited: {
      startAt: Date.now() - 30 * 86400000,
      endAt: Date.now() + 60 * 86400000,
    },
    category: '赛季',
    sortOrder: 6,
    isActive: true,
    createdAt: Date.now() - 45 * 86400000,
    updatedAt: Date.now() - 15 * 86400000,
  },
  {
    id: 'ach-007',
    name: '收集达人',
    description: '收集所有角色',
    icon: '🎭',
    type: 'normal',
    rarity: 'rare',
    points: 80,
    conditions: [
      { type: 'collect_characters', target: 20, unit: '个', description: '收集20个角色' },
    ],
    rewards: [
      { type: 'diamonds', amount: 200 },
      { type: 'item', itemId: 'rare_ticket', itemName: '稀有抽卡券' },
    ],
    category: '收集',
    sortOrder: 7,
    isActive: true,
    createdAt: Date.now() - 60 * 86400000,
    updatedAt: Date.now() - 20 * 86400000,
  },
  {
    id: 'ach-008',
    name: '社交达人',
    description: '添加50个好友',
    icon: '🤝',
    type: 'normal',
    rarity: 'uncommon',
    points: 30,
    conditions: [{ type: 'friends', target: 50, unit: '个', description: '添加50个好友' }],
    rewards: [{ type: 'coins', amount: 500 }],
    category: '社交',
    sortOrder: 8,
    isActive: true,
    createdAt: Date.now() - 60 * 86400000,
    updatedAt: Date.now() - 20 * 86400000,
  },
];

const MOCK_LEADERBOARDS: LeaderboardConfig[] = [
  {
    id: 'lb-score',
    name: '总分数榜',
    description: '全服玩家总分数排名',
    type: 'score',
    order: 'desc',
    resetPeriod: 'never',
    maxEntries: 1000,
    scoreField: 'totalScore',
    scoreValidation: { min: 0, integerOnly: true },
    category: '核心',
    isActive: true,
    sortOrder: 1,
    icon: '📊',
    createdAt: Date.now() - 180 * 86400000,
    updatedAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'lb-level',
    name: '等级榜',
    description: '玩家等级排名',
    type: 'level',
    order: 'desc',
    resetPeriod: 'never',
    maxEntries: 1000,
    scoreField: 'level',
    scoreValidation: { min: 1, max: 100, integerOnly: true },
    category: '成长',
    isActive: true,
    sortOrder: 2,
    icon: '⭐',
    createdAt: Date.now() - 180 * 86400000,
    updatedAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'lb-power',
    name: '战力榜',
    description: '角色战力排名',
    type: 'power',
    order: 'desc',
    resetPeriod: 'weekly',
    maxEntries: 500,
    scoreField: 'power',
    scoreValidation: { min: 0 },
    category: '战斗',
    isActive: true,
    sortOrder: 3,
    icon: '💪',
    createdAt: Date.now() - 90 * 86400000,
    updatedAt: Date.now() - 15 * 86400000,
  },
  {
    id: 'lb-clear',
    name: '通关榜',
    description: '最快通关记录',
    type: 'clear',
    order: 'asc',
    resetPeriod: 'monthly',
    maxEntries: 100,
    scoreField: 'clearTime',
    scoreValidation: { min: 0 },
    category: '挑战',
    isActive: true,
    sortOrder: 4,
    icon: '⏱️',
    createdAt: Date.now() - 60 * 86400000,
    updatedAt: Date.now() - 10 * 86400000,
  },
  {
    id: 'lb-weekly',
    name: '周积分榜',
    description: '本周积分排名',
    type: 'weekly',
    order: 'desc',
    resetPeriod: 'weekly',
    maxEntries: 500,
    scoreField: 'weeklyScore',
    scoreValidation: { min: 0, integerOnly: true },
    category: '赛季',
    isActive: true,
    sortOrder: 5,
    icon: '📅',
    createdAt: Date.now() - 30 * 86400000,
    updatedAt: Date.now() - 5 * 86400000,
  },
  {
    id: 'lb-monthly',
    name: '月积分榜',
    description: '本月积分排名',
    type: 'monthly',
    order: 'desc',
    resetPeriod: 'monthly',
    maxEntries: 500,
    scoreField: 'monthlyScore',
    scoreValidation: { min: 0, integerOnly: true },
    category: '赛季',
    isActive: true,
    sortOrder: 6,
    icon: '🗓️',
    createdAt: Date.now() - 60 * 86400000,
    updatedAt: Date.now() - 5 * 86400000,
  },
];

const ACHIEVEMENT_CATEGORIES = ['新手', '战斗', '收集', '成长', '社交', '赛季'];
const LEADERBOARD_CATEGORIES = ['核心', '成长', '战斗', '挑战', '赛季'];

export class AchievementLeaderboardService {
  private achievements = new Map<string, Achievement>();
  private userProgress = new Map<string, Map<string, UserAchievementProgress>>();
  private leaderboards = new Map<string, LeaderboardConfig>();
  private leaderboardData = new Map<string, LeaderboardEntry[]>();
  private leaderboardRewards = new Map<string, LeaderboardReward[]>();

  constructor() {
    MOCK_ACHIEVEMENTS.forEach((a) => this.achievements.set(a.id, a));
    MOCK_LEADERBOARDS.forEach((l) => this.leaderboards.set(l.id, l));
  }

  async listAchievements(options?: {
    category?: string;
    type?: AchievementType;
    rarity?: AchievementRarity;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ achievements: Achievement[]; total: number }> {
    let achievements = Array.from(this.achievements.values());

    if (options?.category) {
      achievements = achievements.filter((a) => a.category === options.category);
    }
    if (options?.type) {
      achievements = achievements.filter((a) => a.type === options.type);
    }
    if (options?.rarity) {
      achievements = achievements.filter((a) => a.rarity === options.rarity);
    }
    if (options?.isActive !== undefined) {
      achievements = achievements.filter((a) => a.isActive === options.isActive);
    }

    achievements.sort((a, b) => a.sortOrder - b.sortOrder);

    const total = achievements.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    achievements = achievements.slice(start, start + pageSize);

    return { achievements, total };
  }

  getAchievement(achievementId: string): Achievement | undefined {
    return this.achievements.get(achievementId);
  }

  async createAchievement(
    options: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Achievement> {
    const achievement: Achievement = {
      ...options,
      id: `ach-${randomUUID().slice(0, 8)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.achievements.set(achievement.id, achievement);
    globalEventBus.emit({ type: 'achievement:created', payload: achievement });
    return achievement;
  }

  async updateAchievement(
    achievementId: string,
    updates: Partial<Achievement>
  ): Promise<Achievement | null> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return null;

    Object.assign(achievement, updates, { updatedAt: Date.now() });
    globalEventBus.emit({ type: 'achievement:updated', payload: achievement });
    return achievement;
  }

  async deleteAchievement(achievementId: string): Promise<boolean> {
    const deleted = this.achievements.delete(achievementId);
    if (deleted) {
      globalEventBus.emit({ type: 'achievement:deleted', payload: achievementId });
    }
    return deleted;
  }

  async getUserAchievements(userId: string): Promise<UserAchievementProgress[]> {
    if (!this.userProgress.has(userId)) {
      this.generateMockUserProgress(userId);
    }
    return Array.from(this.userProgress.get(userId)!.values());
  }

  async getUserAchievement(
    userId: string,
    achievementId: string
  ): Promise<UserAchievementProgress | null> {
    if (!this.userProgress.has(userId)) {
      this.generateMockUserProgress(userId);
    }
    return this.userProgress.get(userId)?.get(achievementId) ?? null;
  }

  private generateMockUserProgress(userId: string): void {
    const userAchs = new Map<string, UserAchievementProgress>();
    const achs = Array.from(this.achievements.values());

    achs.forEach((ach, index) => {
      const unlocked = index < 3;
      const progressRatio = unlocked ? 1 : Math.random() * 0.7;
      const total = ach.conditions[0]?.target ?? 100;
      const progress = Math.floor(total * progressRatio);

      userAchs.set(ach.id, {
        achievementId: ach.id,
        progress,
        total,
        percentage: Math.floor((progress / total) * 100),
        unlocked,
        unlockedAt: unlocked ? Date.now() - Math.random() * 30 * 86400000 : undefined,
        currentStage: ach.stages
          ? ach.stages.filter((s) => progress >= s.threshold).length
          : undefined,
        lastUpdated: Date.now() - Math.random() * 7 * 86400000,
      });
    });

    this.userProgress.set(userId, userAchs);
  }

  async updateAchievementProgress(
    userId: string,
    achievementId: string,
    progress: number
  ): Promise<UserAchievementProgress | null> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return null;

    if (!this.userProgress.has(userId)) {
      this.generateMockUserProgress(userId);
    }

    const userAchs = this.userProgress.get(userId)!;
    let userAch = userAchs.get(achievementId);

    if (!userAch) {
      userAch = {
        achievementId,
        progress: 0,
        total: achievement.conditions[0]?.target ?? 100,
        percentage: 0,
        unlocked: false,
        lastUpdated: Date.now(),
      };
      userAchs.set(achievementId, userAch);
    }

    userAch.progress = Math.min(progress, userAch.total);
    userAch.percentage = Math.floor((userAch.progress / userAch.total) * 100);
    userAch.lastUpdated = Date.now();

    if (achievement.stages) {
      userAch.currentStage = achievement.stages.filter(
        (s) => userAch!.progress >= s.threshold
      ).length;
    }

    if (!userAch.unlocked && userAch.progress >= userAch.total) {
      userAch.unlocked = true;
      userAch.unlockedAt = Date.now();
      globalEventBus.emit({
        type: 'achievement:unlocked',
        payload: { userId, achievementId, achievement },
      });
    }

    globalEventBus.emit({
      type: 'achievement:progressUpdated',
      payload: { userId, achievementId, progress: userAch },
    });

    return userAch;
  }

  async unlockAchievement(
    userId: string,
    achievementId: string
  ): Promise<{ success: boolean; achievement?: UserAchievementProgress }> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return { success: false };

    if (!this.userProgress.has(userId)) {
      this.generateMockUserProgress(userId);
    }

    const userAchs = this.userProgress.get(userId)!;
    let userAch = userAchs.get(achievementId);

    if (!userAch) {
      userAch = {
        achievementId,
        progress: 0,
        total: achievement.conditions[0]?.target ?? 100,
        percentage: 0,
        unlocked: false,
        lastUpdated: Date.now(),
      };
      userAchs.set(achievementId, userAch);
    }

    if (userAch.unlocked) {
      return { success: false, achievement: userAch };
    }

    userAch.progress = userAch.total;
    userAch.percentage = 100;
    userAch.unlocked = true;
    userAch.unlockedAt = Date.now();
    userAch.lastUpdated = Date.now();

    if (achievement.stages) {
      userAch.currentStage = achievement.stages.length;
    }

    globalEventBus.emit({
      type: 'achievement:unlocked',
      payload: { userId, achievementId, achievement },
    });

    return { success: true, achievement: userAch };
  }

  getAchievementCategories(): string[] {
    return ACHIEVEMENT_CATEGORIES;
  }

  getAchievementRarityColor(rarity: AchievementRarity): string {
    const colors: Record<AchievementRarity, string> = {
      common: '#9CA3AF',
      uncommon: '#22C55E',
      rare: '#3B82F6',
      epic: '#A855F7',
      legendary: '#F59E0B',
    };
    return colors[rarity];
  }

  async listLeaderboards(options?: {
    category?: string;
    type?: LeaderboardType;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ leaderboards: LeaderboardConfig[]; total: number }> {
    let leaderboards = Array.from(this.leaderboards.values());

    if (options?.category) {
      leaderboards = leaderboards.filter((l) => l.category === options.category);
    }
    if (options?.type) {
      leaderboards = leaderboards.filter((l) => l.type === options.type);
    }
    if (options?.isActive !== undefined) {
      leaderboards = leaderboards.filter((l) => l.isActive === options.isActive);
    }

    leaderboards.sort((a, b) => a.sortOrder - b.sortOrder);

    const total = leaderboards.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    leaderboards = leaderboards.slice(start, start + pageSize);

    return { leaderboards, total };
  }

  getLeaderboardConfig(leaderboardId: string): LeaderboardConfig | undefined {
    return this.leaderboards.get(leaderboardId);
  }

  async createLeaderboard(
    options: Omit<LeaderboardConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaderboardConfig> {
    const leaderboard: LeaderboardConfig = {
      ...options,
      id: `lb-${randomUUID().slice(0, 8)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.leaderboards.set(leaderboard.id, leaderboard);
    globalEventBus.emit({ type: 'leaderboard:created', payload: leaderboard });
    return leaderboard;
  }

  async updateLeaderboard(
    leaderboardId: string,
    updates: Partial<LeaderboardConfig>
  ): Promise<LeaderboardConfig | null> {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    Object.assign(leaderboard, updates, { updatedAt: Date.now() });
    globalEventBus.emit({ type: 'leaderboard:updated', payload: leaderboard });
    return leaderboard;
  }

  async deleteLeaderboard(leaderboardId: string): Promise<boolean> {
    const deleted = this.leaderboards.delete(leaderboardId);
    if (deleted) {
      this.leaderboardData.delete(leaderboardId);
      this.leaderboardRewards.delete(leaderboardId);
      globalEventBus.emit({ type: 'leaderboard:deleted', payload: leaderboardId });
    }
    return deleted;
  }

  async getLeaderboard(
    leaderboardId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<{ entries: LeaderboardEntry[]; total: number } | null> {
    const config = this.leaderboards.get(leaderboardId);
    if (!config) return null;

    if (!this.leaderboardData.has(leaderboardId)) {
      this.generateMockLeaderboardData(leaderboardId, config);
    }

    let entries = this.leaderboardData.get(leaderboardId) ?? [];
    const total = entries.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    entries = entries.slice(start, start + pageSize);

    return { entries, total };
  }

  private generateMockLeaderboardData(leaderboardId: string, config: LeaderboardConfig): void {
    const entries: LeaderboardEntry[] = [];
    const names = [
      '战神归来',
      '不败神话',
      '风云再起',
      '游戏达人',
      '王者之姿',
      '闪电侠',
      '星辰大海',
      '月下独酌',
      '风清扬',
      '独孤求败',
      '剑指天涯',
      '梦回唐朝',
      '乱世英雄',
      '一代宗师',
      '武林盟主',
    ];

    const count = Math.min(100, config.maxEntries);
    for (let i = 0; i < count; i++) {
      const baseScore = config.order === 'desc' ? 10000 - i * 150 : 60 + i * 5;

      entries.push({
        rank: i + 1,
        playerId: `player-${i + 1}`,
        playerName: names[i % names.length] + (i > 14 ? i : ''),
        playerAvatar: '',
        playerLevel: Math.max(1, 100 - Math.floor(i / 2)),
        score: Math.floor(baseScore - Math.random() * 50),
        updatedAt: Date.now() - Math.random() * 86400000,
      });
    }

    entries.sort((a, b) => (config.order === 'desc' ? b.score - a.score : a.score - b.score));
    entries.forEach((e, i) => (e.rank = i + 1));

    this.leaderboardData.set(leaderboardId, entries);
  }

  async submitScore(
    leaderboardId: string,
    playerId: string,
    playerName: string,
    score: number,
    playerAvatar?: string,
    extraData?: Record<string, unknown>
  ): Promise<PlayerRankInfo | null> {
    const config = this.leaderboards.get(leaderboardId);
    if (!config) return null;

    if (!this.validateScore(config, score)) {
      return null;
    }

    if (!this.leaderboardData.has(leaderboardId)) {
      this.generateMockLeaderboardData(leaderboardId, config);
    }

    const entries = this.leaderboardData.get(leaderboardId) ?? [];
    let existing = entries.find((e) => e.playerId === playerId);

    const previousRank = existing?.rank;

    if (existing) {
      const isBetter = config.order === 'desc' ? score > existing.score : score < existing.score;

      if (isBetter) {
        existing.score = score;
        existing.extraData = extraData ?? existing.extraData;
        existing.updatedAt = Date.now();
      }
    } else {
      existing = {
        rank: 0,
        playerId,
        playerName,
        playerAvatar: playerAvatar ?? '',
        score,
        extraData,
        updatedAt: Date.now(),
      };
      entries.push(existing);
    }

    entries.sort((a, b) => (config.order === 'desc' ? b.score - a.score : a.score - b.score));
    entries.forEach((e, i) => (e.rank = i + 1));

    if (entries.length > config.maxEntries) {
      entries.length = config.maxEntries;
    }

    this.leaderboardData.set(leaderboardId, entries);

    const currentEntry = entries.find((e) => e.playerId === playerId);
    if (!currentEntry) return null;

    const rankInfo: PlayerRankInfo = {
      rank: currentEntry.rank,
      score: currentEntry.score,
      previousRank,
      rankChange: previousRank ? previousRank - currentEntry.rank : undefined,
    };

    globalEventBus.emit({
      type: 'leaderboard:scoreSubmitted',
      payload: { leaderboardId, playerId, rankInfo },
    });

    return rankInfo;
  }

  private validateScore(config: LeaderboardConfig, score: number): boolean {
    const validation = config.scoreValidation;
    if (!validation) return true;

    if (validation.min !== undefined && score < validation.min) return false;
    if (validation.max !== undefined && score > validation.max) return false;
    if (validation.integerOnly && !Number.isInteger(score)) return false;

    return true;
  }

  async getPlayerRank(leaderboardId: string, playerId: string): Promise<PlayerRankInfo | null> {
    if (!this.leaderboardData.has(leaderboardId)) {
      const config = this.leaderboards.get(leaderboardId);
      if (!config) return null;
      this.generateMockLeaderboardData(leaderboardId, config);
    }

    const entries = this.leaderboardData.get(leaderboardId) ?? [];
    const entry = entries.find((e) => e.playerId === playerId);

    return entry ? { rank: entry.rank, score: entry.score } : null;
  }

  async getTopN(leaderboardId: string, n: number): Promise<LeaderboardEntry[]> {
    const result = await this.getLeaderboard(leaderboardId, { page: 1, pageSize: n });
    return result?.entries ?? [];
  }

  async getLeaderboardRewards(leaderboardId: string): Promise<LeaderboardReward[]> {
    if (!this.leaderboardRewards.has(leaderboardId)) {
      const rewards: LeaderboardReward[] = [
        {
          leaderboardId,
          rankRange: [1, 1],
          rewards: [
            { type: 'diamonds', amount: 1000 },
            { type: 'title', itemName: '排行榜冠军' },
          ],
        },
        {
          leaderboardId,
          rankRange: [2, 3],
          rewards: [
            { type: 'diamonds', amount: 500 },
            { type: 'title', itemName: '排行榜季军' },
          ],
        },
        { leaderboardId, rankRange: [4, 10], rewards: [{ type: 'diamonds', amount: 200 }] },
        { leaderboardId, rankRange: [11, 50], rewards: [{ type: 'coins', amount: 1000 }] },
        { leaderboardId, rankRange: [51, 100], rewards: [{ type: 'coins', amount: 500 }] },
      ];
      this.leaderboardRewards.set(leaderboardId, rewards);
    }
    return this.leaderboardRewards.get(leaderboardId) ?? [];
  }

  async setLeaderboardRewards(
    leaderboardId: string,
    rewards: LeaderboardReward[]
  ): Promise<boolean> {
    const config = this.leaderboards.get(leaderboardId);
    if (!config) return false;

    this.leaderboardRewards.set(leaderboardId, rewards);
    globalEventBus.emit({
      type: 'leaderboard:rewardsUpdated',
      payload: { leaderboardId, rewards },
    });
    return true;
  }

  getLeaderboardCategories(): string[] {
    return LEADERBOARD_CATEGORIES;
  }

  async resetLeaderboard(leaderboardId: string): Promise<boolean> {
    const config = this.leaderboards.get(leaderboardId);
    if (!config) return false;

    this.leaderboardData.set(leaderboardId, []);
    globalEventBus.emit({ type: 'leaderboard:reset', payload: leaderboardId });
    return true;
  }

  async getAchievementStats(userId: string): Promise<{
    total: number;
    unlocked: number;
    percentage: number;
    totalPoints: number;
    earnedPoints: number;
  }> {
    const userAchs = await this.getUserAchievements(userId);
    const allAchs = Array.from(this.achievements.values());
    const unlocked = userAchs.filter((a) => a.unlocked).length;
    const totalPoints = allAchs.reduce((sum, a) => sum + a.points, 0);
    const earnedPoints = userAchs
      .filter((a) => a.unlocked)
      .reduce((sum, a) => {
        const ach = this.achievements.get(a.achievementId);
        return sum + (ach?.points ?? 0);
      }, 0);

    return {
      total: allAchs.length,
      unlocked,
      percentage: allAchs.length > 0 ? Math.floor((unlocked / allAchs.length) * 100) : 0,
      totalPoints,
      earnedPoints,
    };
  }
}

export const achievementLeaderboardService = new AchievementLeaderboardService();
