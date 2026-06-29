import { globalEventBus } from './event-bus';
import { randomUUID } from './utils/crypto-utils';

export type ContributionType =
  | 'code'
  | 'plugin'
  | 'template'
  | 'asset'
  | 'documentation'
  | 'community-help'
  | 'bug-report'
  | 'feature-suggestion';

export type PointsReason =
  | 'contribution_code'
  | 'contribution_plugin'
  | 'contribution_template'
  | 'contribution_asset'
  | 'contribution_documentation'
  | 'contribution_community'
  | 'bug_report'
  | 'feature_suggestion'
  | 'daily_signin'
  | 'first_publish'
  | 'featured_bonus'
  | 'download_bonus'
  | 'like_bonus'
  | 'annual_award'
  | 'quarter_award'
  | 'activity_reward'
  | 'spend_download'
  | 'spend_other';

export interface DeveloperPointsRecord {
  id: string;
  userId: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: PointsReason;
  description: string;
  relatedId?: string;
  relatedType?: string;
  createdAt: number;
}

export interface DeveloperLevel {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  color: string;
  benefits: string[];
}

export interface DeveloperProfile {
  userId: string;
  userName: string;
  avatar?: string;
  bio?: string;
  level: number;
  totalPoints: number;
  earnedPoints: number;
  spentPoints: number;
  contributionCount: number;
  pluginCount: number;
  templateCount: number;
  assetCount: number;
  totalDownloads: number;
  totalLikes: number;
  totalFavorites: number;
  isVerified: boolean;
  isCertifiedDeveloper: boolean;
  certifiedAt?: number;
  joinDate: number;
  lastActiveAt: number;
  rank?: number;
  badges: DeveloperBadge[];
}

export interface DeveloperBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'achievement' | 'contribution' | 'event' | 'special';
  earnedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Contribution {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: ContributionType;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded: number;
  relatedId?: string;
  relatedUrl?: string;
  reviewNote?: string;
  reviewedAt?: number;
  reviewerId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FeaturedItem {
  id: string;
  type: 'plugin' | 'template' | 'asset';
  itemId: string;
  itemName: string;
  itemDescription: string;
  itemAuthor: string;
  itemAuthorId: string;
  itemIcon?: string;
  featuredReason: string;
  featuredBy: string;
  featuredAt: number;
  bonusPoints: number;
}

export interface DeveloperCertification {
  userId: string;
  userName: string;
  status: 'not-applied' | 'pending' | 'approved' | 'rejected';
  applicationDate?: number;
  approvalDate?: number;
  rejectionReason?: string;
  certificateNumber?: string;
  benefits: string[];
}

export interface IncentiveProgram {
  id: string;
  name: string;
  description: string;
  type: 'quarterly' | 'annual' | 'special';
  startDate: number;
  endDate: number;
  prizePool: number;
  rules: string[];
  rewards: IncentiveReward[];
  status: 'upcoming' | 'ongoing' | 'ended';
}

export interface IncentiveReward {
  rank: number;
  name: string;
  points: number;
  bonus: string;
  icon: string;
}

export interface RankEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  value: number;
  rank: number;
  level: number;
  change?: 'up' | 'down' | 'same';
}

export type RankType = 'contribution' | 'downloads' | 'plugins' | 'templates';

export interface Activity {
  id: string;
  title: string;
  description: string;
  type: 'offline' | 'online' | 'salon' | 'hackathon';
  location?: string;
  startTime: number;
  endTime: number;
  maxParticipants?: number;
  participantCount: number;
  status: 'upcoming' | 'ongoing' | 'ended';
  image?: string;
  pointsReward: number;
  registrationDeadline?: number;
}

export interface LeaderboardPeriod {
  period: 'daily' | 'weekly' | 'monthly' | 'all';
  startDate: number;
  endDate: number;
}

export class DeveloperIncentivesService {
  private currentUserId = 'user-001';
  private profiles = new Map<string, DeveloperProfile>();
  private pointsRecords = new Map<string, DeveloperPointsRecord[]>();
  private contributions = new Map<string, Contribution[]>();
  private featuredItems: FeaturedItem[] = [];
  private certification = new Map<string, DeveloperCertification>();
  private incentivePrograms: IncentiveProgram[] = [];
  private activities: Activity[] = [];
  private badges: DeveloperBadge[] = [];
  private levels: DeveloperLevel[] = [];

  constructor() {
    this.loadLevels();
    this.loadMockProfiles();
    this.loadMockPointsRecords();
    this.loadMockContributions();
    this.loadMockFeaturedItems();
    this.loadMockCertifications();
    this.loadMockIncentivePrograms();
    this.loadMockActivities();
    this.loadMockBadges();
  }

  getMyProfile(): DeveloperProfile {
    let profile = this.profiles.get(this.currentUserId);
    if (!profile) {
      profile = this.createDefaultProfile();
      this.profiles.set(this.currentUserId, profile);
    }
    return { ...profile, rank: this.getMyRank() };
  }

  getProfile(userId: string): DeveloperProfile | undefined {
    const profile = this.profiles.get(userId);
    if (profile) {
      return { ...profile, rank: this.getUserRank(userId) };
    }
    return undefined;
  }

  getMyPoints(): number {
    return this.getMyProfile().totalPoints;
  }

  getMyLevel(): DeveloperLevel {
    const points = this.getMyProfile().totalPoints;
    return this.getLevelByPoints(points);
  }

  getLevelByPoints(points: number): DeveloperLevel {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (points >= this.levels[i].minPoints) {
        return this.levels[i];
      }
    }
    return this.levels[0];
  }

  getAllLevels(): DeveloperLevel[] {
    return this.levels;
  }

  getPointsHistory(
    page = 1,
    pageSize = 20
  ): { records: DeveloperPointsRecord[]; total: number; totalPages: number } {
    const records = this.pointsRecords.get(this.currentUserId) || [];
    const total = records.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    return {
      records: records.slice(start, start + pageSize),
      total,
      totalPages,
    };
  }

  getMyContributions(status?: string): Contribution[] {
    let contributions = this.contributions.get(this.currentUserId) || [];
    if (status) {
      contributions = contributions.filter((c) => c.status === status);
    }
    return contributions.sort((a, b) => b.createdAt - a.createdAt);
  }

  async submitContribution(
    type: ContributionType,
    title: string,
    description: string,
    relatedUrl?: string
  ): Promise<Contribution> {
    const contribution: Contribution = {
      id: randomUUID(),
      userId: this.currentUserId,
      userName: this.getMyProfile().userName,
      userAvatar: this.getMyProfile().avatar,
      type,
      title,
      description,
      status: 'pending',
      pointsAwarded: 0,
      relatedUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const userContributions = this.contributions.get(this.currentUserId) || [];
    userContributions.unshift(contribution);
    this.contributions.set(this.currentUserId, userContributions);

    globalEventBus.emit({
      type: 'incentive:contribution-submitted',
      payload: { contribution },
    });

    return contribution;
  }

  getFeaturedItems(type?: 'plugin' | 'template' | 'asset'): FeaturedItem[] {
    let items = [...this.featuredItems];
    if (type) {
      items = items.filter((i) => i.type === type);
    }
    return items.sort((a, b) => b.featuredAt - a.featuredAt);
  }

  getCertification(): DeveloperCertification {
    let cert = this.certification.get(this.currentUserId);
    if (!cert) {
      cert = {
        userId: this.currentUserId,
        userName: this.getMyProfile().userName,
        status: 'not-applied',
        benefits: this.getCertificationBenefits(),
      };
    }
    return cert;
  }

  async applyForCertification(): Promise<boolean> {
    const profile = this.getMyProfile();
    const cert = this.getCertification();

    if (cert.status !== 'not-applied') {
      throw new Error('已经提交过申请了');
    }

    if (profile.contributionCount < 3) {
      throw new Error('至少需要3个贡献才能申请认证');
    }

    const newCert: DeveloperCertification = {
      ...cert,
      status: 'pending',
      applicationDate: Date.now(),
    };

    this.certification.set(this.currentUserId, newCert);

    globalEventBus.emit({
      type: 'incentive:certification-applied',
      payload: { userId: this.currentUserId },
    });

    return true;
  }

  getCertificationRequirements(): {
    minContributions: number;
    minDownloads: number;
    minRating: number;
    requirements: string[];
  } {
    return {
      minContributions: 3,
      minDownloads: 1000,
      minRating: 4.0,
      requirements: [
        '至少发布3个公开资源（插件/模板/资产）',
        '累计下载量达到1000次以上',
        '平均评分达到4.0分以上',
        '遵守社区规范，无违规记录',
        '愿意持续维护和更新作品',
      ],
    };
  }

  private getCertificationBenefits(): string[] {
    return [
      '专属认证标识和徽章',
      '资源优先推荐曝光',
      '收益分成比例提升',
      '专属客服支持',
      '优先参与官方活动',
      '定制化技术支持',
      '年度颁奖典礼邀请',
    ];
  }

  getIncentivePrograms(status?: 'upcoming' | 'ongoing' | 'ended'): IncentiveProgram[] {
    let programs = [...this.incentivePrograms];
    if (status) {
      programs = programs.filter((p) => p.status === status);
    }
    return programs.sort((a, b) => b.startDate - a.startDate);
  }

  getIncentiveProgram(programId: string): IncentiveProgram | undefined {
    return this.incentivePrograms.find((p) => p.id === programId);
  }

  getActivities(status?: 'upcoming' | 'ongoing' | 'ended'): Activity[] {
    let activities = [...this.activities];
    if (status) {
      activities = activities.filter((a) => a.status === status);
    }
    return activities.sort((a, b) => a.startTime - b.startTime);
  }

  getActivity(activityId: string): Activity | undefined {
    return this.activities.find((a) => a.id === activityId);
  }

  async registerActivity(activityId: string): Promise<boolean> {
    const activity = this.activities.find((a) => a.id === activityId);
    if (!activity) {
      throw new Error('活动不存在');
    }
    if (activity.status !== 'upcoming') {
      throw new Error('活动已开始或已结束');
    }
    if (activity.maxParticipants && activity.participantCount >= activity.maxParticipants) {
      throw new Error('活动名额已满');
    }

    activity.participantCount++;

    globalEventBus.emit({
      type: 'incentive:activity-registered',
      payload: { activityId, activity },
    });

    return true;
  }

  getLeaderboard(type: RankType, period: LeaderboardPeriod['period'] = 'all'): RankEntry[] {
    const profiles = [...this.profiles.values()];

    let sorted: DeveloperProfile[];
    switch (type) {
      case 'contribution':
        sorted = profiles.sort((a, b) => b.earnedPoints - a.earnedPoints);
        break;
      case 'downloads':
        sorted = profiles.sort((a, b) => b.totalDownloads - a.totalDownloads);
        break;
      case 'plugins':
        sorted = profiles.sort((a, b) => b.pluginCount - a.pluginCount);
        break;
      case 'templates':
        sorted = profiles.sort((a, b) => b.templateCount - a.templateCount);
        break;
      default:
        sorted = profiles.sort((a, b) => b.earnedPoints - a.earnedPoints);
    }

    return sorted.map((profile, index) => ({
      userId: profile.userId,
      userName: profile.userName,
      userAvatar: profile.avatar,
      value:
        type === 'contribution'
          ? profile.earnedPoints
          : type === 'downloads'
            ? profile.totalDownloads
            : type === 'plugins'
              ? profile.pluginCount
              : profile.templateCount,
      rank: index + 1,
      level: profile.level,
      change: index < 3 ? 'up' : index < 10 ? 'same' : 'down',
    }));
  }

  getMyRank(type: RankType = 'contribution'): number {
    const leaderboard = this.getLeaderboard(type);
    const myEntry = leaderboard.find((e) => e.userId === this.currentUserId);
    return myEntry?.rank || 0;
  }

  private getUserRank(userId: string, type: RankType = 'contribution'): number {
    const leaderboard = this.getLeaderboard(type);
    const entry = leaderboard.find((e) => e.userId === userId);
    return entry?.rank || 0;
  }

  getMyBadges(): DeveloperBadge[] {
    return this.badges.filter((b) => b.earnedAt > 0);
  }

  getContributionStats(): {
    total: number;
    byType: Record<ContributionType, number>;
    byStatus: Record<string, number>;
  } {
    const contributions = this.getMyContributions();
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    contributions.forEach((c) => {
      byType[c.type] = (byType[c.type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });

    return {
      total: contributions.length,
      byType: byType as Record<ContributionType, number>,
      byStatus,
    };
  }

  private addPoints(
    userId: string,
    amount: number,
    reason: PointsReason,
    description: string,
    relatedId?: string
  ): void {
    const record: DeveloperPointsRecord = {
      id: randomUUID(),
      userId,
      type: 'earn',
      amount,
      reason,
      description,
      relatedId,
      createdAt: Date.now(),
    };

    const records = this.pointsRecords.get(userId) || [];
    records.unshift(record);
    this.pointsRecords.set(userId, records);

    const profile = this.profiles.get(userId);
    if (profile) {
      profile.totalPoints += amount;
      profile.earnedPoints += amount;
      profile.level = this.getLevelByPoints(profile.totalPoints).level;
    }
  }

  private createDefaultProfile(): DeveloperProfile {
    return {
      userId: this.currentUserId,
      userName: '开发者小明',
      avatar: 'avatar-default.png',
      bio: '热爱游戏开发，正在学习TapDev中',
      level: 4,
      totalPoints: 2680,
      earnedPoints: 2750,
      spentPoints: 70,
      contributionCount: 8,
      pluginCount: 2,
      templateCount: 1,
      assetCount: 3,
      totalDownloads: 3450,
      totalLikes: 567,
      totalFavorites: 234,
      isVerified: true,
      isCertifiedDeveloper: false,
      joinDate: Date.now() - 180 * 24 * 60 * 60 * 1000,
      lastActiveAt: Date.now(),
      badges: [],
    };
  }

  private loadLevels(): void {
    this.levels = [
      {
        level: 1,
        name: '新手开发者',
        minPoints: 0,
        maxPoints: 99,
        icon: 'seedling',
        color: '#9E9E9E',
        benefits: ['基础功能使用', '社区发帖权限'],
      },
      {
        level: 2,
        name: '初级开发者',
        minPoints: 100,
        maxPoints: 299,
        icon: 'sprout',
        color: '#66BB6A',
        benefits: ['资源上传权限', '每日签到奖励'],
      },
      {
        level: 3,
        name: '中级开发者',
        minPoints: 300,
        maxPoints: 699,
        icon: 'leaf',
        color: '#4CAF50',
        benefits: ['上传数量提升', '收藏夹扩容'],
      },
      {
        level: 4,
        name: '高级开发者',
        minPoints: 700,
        maxPoints: 1499,
        icon: 'tree',
        color: '#8BC34A',
        benefits: ['收益分成提升', '优先审核权'],
      },
      {
        level: 5,
        name: '资深开发者',
        minPoints: 1500,
        maxPoints: 2999,
        icon: 'trophy',
        color: '#FFC107',
        benefits: ['专属徽章', '官方推荐位'],
      },
      {
        level: 6,
        name: '精英开发者',
        minPoints: 3000,
        maxPoints: 5999,
        icon: 'award',
        color: '#FF9800',
        benefits: ['定制推广资源', '活动优先邀请'],
      },
      {
        level: 7,
        name: '专家开发者',
        minPoints: 6000,
        maxPoints: 11999,
        icon: 'crown',
        color: '#FF5722',
        benefits: ['一对一技术支持', '内测资格'],
      },
      {
        level: 8,
        name: '大师开发者',
        minPoints: 12000,
        maxPoints: 24999,
        icon: 'star',
        color: '#E91E63',
        benefits: ['大师认证标识', '分成比例最高'],
      },
      {
        level: 9,
        name: '传奇开发者',
        minPoints: 25000,
        maxPoints: 49999,
        icon: 'flame',
        color: '#9C27B0',
        benefits: ['传奇殿堂展示', '独家合作机会'],
      },
      {
        level: 10,
        name: '创世开发者',
        minPoints: 50000,
        maxPoints: 999999,
        icon: 'zap',
        color: '#3F51B5',
        benefits: ['永久会员资格', '顾问委员会席位'],
      },
    ];
  }

  private loadMockProfiles(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const mockProfiles: DeveloperProfile[] = [
      {
        userId: 'user-001',
        userName: '开发者小明',
        avatar: 'avatar-001.png',
        bio: '热爱游戏开发，正在学习TapDev中。独立游戏爱好者，专注于休闲益智类游戏。',
        level: 4,
        totalPoints: 2680,
        earnedPoints: 2750,
        spentPoints: 70,
        contributionCount: 8,
        pluginCount: 2,
        templateCount: 1,
        assetCount: 3,
        totalDownloads: 3450,
        totalLikes: 567,
        totalFavorites: 234,
        isVerified: true,
        isCertifiedDeveloper: false,
        joinDate: now - 180 * day,
        lastActiveAt: now - 1 * 60 * 60 * 1000,
        badges: [],
      },
      {
        userId: 'dev-001',
        userName: 'GameCraft',
        avatar: 'avatar-dev1.png',
        bio: '专注于游戏核心玩法组件开发，让游戏开发更简单。10年游戏开发经验。',
        level: 7,
        totalPoints: 8560,
        earnedPoints: 8920,
        spentPoints: 360,
        contributionCount: 25,
        pluginCount: 8,
        templateCount: 4,
        assetCount: 6,
        totalDownloads: 45680,
        totalLikes: 3450,
        totalFavorites: 2100,
        isVerified: true,
        isCertifiedDeveloper: true,
        certifiedAt: now - 60 * day,
        joinDate: now - 365 * day,
        lastActiveAt: now - 2 * 60 * 60 * 1000,
        badges: [],
      },
      {
        userId: 'dev-002',
        userName: 'PixelArt Studio',
        avatar: 'avatar-dev2.png',
        bio: '专业像素艺术工作室，创作精美的像素风格游戏资源。',
        level: 6,
        totalPoints: 4890,
        earnedPoints: 5120,
        spentPoints: 230,
        contributionCount: 15,
        pluginCount: 0,
        templateCount: 2,
        assetCount: 12,
        totalDownloads: 28900,
        totalLikes: 2340,
        totalFavorites: 1560,
        isVerified: true,
        isCertifiedDeveloper: true,
        certifiedAt: now - 90 * day,
        joinDate: now - 300 * day,
        lastActiveAt: now - 5 * 60 * 60 * 1000,
        badges: [],
      },
      {
        userId: 'dev-003',
        userName: 'SoundMasters',
        avatar: 'avatar-dev3.png',
        bio: '专业游戏音效制作团队，提供高品质音频资源。',
        level: 5,
        totalPoints: 2340,
        earnedPoints: 2450,
        spentPoints: 110,
        contributionCount: 10,
        pluginCount: 0,
        templateCount: 0,
        assetCount: 8,
        totalDownloads: 22580,
        totalLikes: 1890,
        totalFavorites: 1200,
        isVerified: true,
        isCertifiedDeveloper: false,
        joinDate: now - 250 * day,
        lastActiveAt: now - 12 * 60 * 60 * 1000,
        badges: [],
      },
      {
        userId: 'dev-004',
        userName: 'FXLab',
        avatar: 'avatar-dev4.png',
        bio: '游戏特效专家，专注于粒子系统和视觉效果开发。',
        level: 6,
        totalPoints: 5670,
        earnedPoints: 5890,
        spentPoints: 220,
        contributionCount: 12,
        pluginCount: 5,
        templateCount: 1,
        assetCount: 4,
        totalDownloads: 31250,
        totalLikes: 2560,
        totalFavorites: 1780,
        isVerified: true,
        isCertifiedDeveloper: true,
        certifiedAt: now - 45 * day,
        joinDate: now - 220 * day,
        lastActiveAt: now - 3 * 60 * 60 * 1000,
        badges: [],
      },
      {
        userId: 'dev-005',
        userName: 'UI Masters',
        avatar: 'avatar-dev5.png',
        bio: '游戏UI设计和开发团队，追求极致的用户体验。',
        level: 5,
        totalPoints: 1890,
        earnedPoints: 1980,
        spentPoints: 90,
        contributionCount: 8,
        pluginCount: 2,
        templateCount: 0,
        assetCount: 5,
        totalDownloads: 14980,
        totalLikes: 1230,
        totalFavorites: 890,
        isVerified: true,
        isCertifiedDeveloper: false,
        joinDate: now - 140 * day,
        lastActiveAt: now - 6 * 60 * 60 * 1000,
        badges: [],
      },
      {
        userId: 'dev-006',
        userName: '独立游戏人老王',
        avatar: 'avatar-dev6.png',
        bio: '一个人做游戏的独立开发者，擅长Roguelike和RPG类型。',
        level: 7,
        totalPoints: 7230,
        earnedPoints: 7680,
        spentPoints: 450,
        contributionCount: 20,
        pluginCount: 6,
        templateCount: 5,
        assetCount: 3,
        totalDownloads: 38900,
        totalLikes: 3120,
        totalFavorites: 1950,
        isVerified: true,
        isCertifiedDeveloper: true,
        certifiedAt: now - 100 * day,
        joinDate: now - 400 * day,
        lastActiveAt: now - 1 * 60 * 60 * 1000,
        badges: [],
      },
      {
        userId: 'dev-007',
        userName: 'CardGame Pro',
        avatar: 'avatar-dev7.png',
        bio: '卡牌游戏专家，深耕卡牌游戏领域多年。',
        level: 5,
        totalPoints: 2450,
        earnedPoints: 2580,
        spentPoints: 130,
        contributionCount: 10,
        pluginCount: 3,
        templateCount: 3,
        assetCount: 0,
        totalDownloads: 11460,
        totalLikes: 980,
        totalFavorites: 670,
        isVerified: true,
        isCertifiedDeveloper: false,
        joinDate: now - 180 * day,
        lastActiveAt: now - 8 * 60 * 60 * 1000,
        badges: [],
      },
    ];

    mockProfiles.forEach((p) => {
      this.profiles.set(p.userId, p);
    });
  }

  private loadMockPointsRecords(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const records: DeveloperPointsRecord[] = [
      {
        id: 'pt-001',
        userId: this.currentUserId,
        type: 'earn',
        amount: 200,
        reason: 'first_publish',
        description: '首次发布资源奖励',
        relatedId: 'plugin-001',
        createdAt: now - 150 * day,
      },
      {
        id: 'pt-002',
        userId: this.currentUserId,
        type: 'earn',
        amount: 500,
        reason: 'contribution_plugin',
        description: '发布插件：战斗伤害数字插件',
        relatedId: 'plugin-001',
        createdAt: now - 120 * day,
      },
      {
        id: 'pt-003',
        userId: this.currentUserId,
        type: 'earn',
        amount: 800,
        reason: 'contribution_template',
        description: '发布模板：像素平台游戏模板',
        relatedId: 'template-001',
        createdAt: now - 100 * day,
      },
      {
        id: 'pt-004',
        userId: this.currentUserId,
        type: 'earn',
        amount: 100,
        reason: 'featured_bonus',
        description: '精选推荐奖励：战斗伤害数字插件',
        relatedId: 'plugin-001',
        createdAt: now - 90 * day,
      },
      {
        id: 'pt-005',
        userId: this.currentUserId,
        type: 'earn',
        amount: 300,
        reason: 'contribution_asset',
        description: '上传资产：像素怪物素材包',
        relatedId: 'asset-001',
        createdAt: now - 80 * day,
      },
      {
        id: 'pt-006',
        userId: this.currentUserId,
        type: 'spend',
        amount: 50,
        reason: 'spend_download',
        description: '下载资源：手游UI界面设计稿',
        relatedId: 'res-006',
        createdAt: now - 60 * day,
      },
      {
        id: 'pt-007',
        userId: this.currentUserId,
        type: 'earn',
        amount: 50,
        reason: 'download_bonus',
        description: '下载量突破1000奖励',
        createdAt: now - 50 * day,
      },
      {
        id: 'pt-008',
        userId: this.currentUserId,
        type: 'earn',
        amount: 200,
        reason: 'contribution_asset',
        description: '上传资产：UI音效包',
        relatedId: 'asset-002',
        createdAt: now - 40 * day,
      },
      {
        id: 'pt-009',
        userId: this.currentUserId,
        type: 'earn',
        amount: 100,
        reason: 'like_bonus',
        description: '获赞突破100奖励',
        createdAt: now - 30 * day,
      },
      {
        id: 'pt-010',
        userId: this.currentUserId,
        type: 'earn',
        amount: 200,
        reason: 'contribution_asset',
        description: '上传资产：自制关卡编辑器脚本',
        relatedId: 'res-001',
        createdAt: now - 20 * day,
      },
      {
        id: 'pt-011',
        userId: this.currentUserId,
        type: 'spend',
        amount: 20,
        reason: 'spend_download',
        description: '下载资源：战斗伤害数字插件',
        relatedId: 'res-005',
        createdAt: now - 15 * day,
      },
      {
        id: 'pt-012',
        userId: this.currentUserId,
        type: 'earn',
        amount: 300,
        reason: 'contribution_plugin',
        description: '发布插件：成就系统插件',
        relatedId: 'plugin-002',
        createdAt: now - 10 * day,
      },
    ];

    this.pointsRecords.set(this.currentUserId, records);
  }

  private loadMockContributions(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const contributions: Contribution[] = [
      {
        id: 'contrib-001',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'plugin',
        title: '战斗伤害数字插件',
        description: '一个轻量级的伤害数字显示插件，支持暴击、治疗、闪避等多种效果。',
        status: 'approved',
        pointsAwarded: 500,
        relatedId: 'plugin-001',
        createdAt: now - 120 * day,
        updatedAt: now - 119 * day,
      },
      {
        id: 'contrib-002',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'template',
        title: '像素平台游戏模板',
        description: '完整的2D平台跳跃游戏模板，包含角色控制和关卡系统。',
        status: 'approved',
        pointsAwarded: 800,
        relatedId: 'template-001',
        createdAt: now - 100 * day,
        updatedAt: now - 98 * day,
      },
      {
        id: 'contrib-003',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'asset',
        title: '像素怪物素材包',
        description: '自己画的一组像素风格怪物素材，共8只怪物。',
        status: 'approved',
        pointsAwarded: 300,
        relatedId: 'asset-001',
        createdAt: now - 80 * day,
        updatedAt: now - 79 * day,
      },
      {
        id: 'contrib-004',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'documentation',
        title: '新手入门教程',
        description: '写给新手的入门教程，从安装到第一个游戏。',
        status: 'approved',
        pointsAwarded: 150,
        createdAt: now - 70 * day,
        updatedAt: now - 68 * day,
      },
      {
        id: 'contrib-005',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'asset',
        title: 'UI音效包',
        description: '自制的一组UI交互音效。',
        status: 'approved',
        pointsAwarded: 200,
        relatedId: 'asset-002',
        createdAt: now - 40 * day,
        updatedAt: now - 39 * day,
      },
      {
        id: 'contrib-006',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'bug-report',
        title: '发现编辑器崩溃BUG',
        description: '在特定操作下编辑器会崩溃，已附上复现步骤。',
        status: 'approved',
        pointsAwarded: 50,
        createdAt: now - 25 * day,
        updatedAt: now - 24 * day,
      },
      {
        id: 'contrib-007',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'code',
        title: '关卡编辑器脚本',
        description: '自制的关卡编辑器脚本，分享给大家。',
        status: 'approved',
        pointsAwarded: 200,
        relatedId: 'res-001',
        createdAt: now - 20 * day,
        updatedAt: now - 19 * day,
      },
      {
        id: 'contrib-008',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'plugin',
        title: '成就系统插件',
        description: '游戏成就和统计系统插件。',
        status: 'approved',
        pointsAwarded: 300,
        relatedId: 'plugin-002',
        createdAt: now - 10 * day,
        updatedAt: now - 9 * day,
      },
      {
        id: 'contrib-009',
        userId: this.currentUserId,
        userName: '开发者小明',
        type: 'feature-suggestion',
        title: '建议增加多人协作功能',
        description: '希望能增加实时多人协作编辑功能，方便团队开发。',
        status: 'pending',
        pointsAwarded: 0,
        createdAt: now - 5 * day,
        updatedAt: now - 5 * day,
      },
    ];

    this.contributions.set(this.currentUserId, contributions);
  }

  private loadMockFeaturedItems(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.featuredItems = [
      {
        id: 'feat-001',
        type: 'plugin',
        itemId: 'tapdev-ai-assistant',
        itemName: 'AI 编程助手',
        itemDescription: '智能 AI 助手，提供代码补全、代码生成、重构建议',
        itemAuthor: 'TapDev Team',
        itemAuthorId: 'tapdev',
        itemIcon: 'sparkles',
        featuredReason: '功能强大，用户好评如潮',
        featuredBy: '官方推荐',
        featuredAt: now - 2 * day,
        bonusPoints: 200,
      },
      {
        id: 'feat-002',
        type: 'template',
        itemId: 'template-roguelike',
        itemName: 'Roguelike游戏模板',
        itemDescription: '完整的Roguelike动作游戏模板',
        itemAuthor: 'TapDev官方',
        itemAuthorId: 'tapdev-official',
        itemIcon: 'sword',
        featuredReason: '本周编辑推荐',
        featuredBy: '编辑精选',
        featuredAt: now - 5 * day,
        bonusPoints: 300,
      },
      {
        id: 'feat-003',
        type: 'asset',
        itemId: 'asset-006',
        itemName: '粒子特效系统',
        itemDescription: '功能强大的粒子特效系统',
        itemAuthor: 'FXLab',
        itemAuthorId: 'dev-004',
        itemIcon: 'sparkles',
        featuredReason: '效果炫酷，性能优异',
        featuredBy: '社区推荐',
        featuredAt: now - 8 * day,
        bonusPoints: 150,
      },
    ];
  }

  private loadMockCertifications(): void {
    this.certification.set('dev-001', {
      userId: 'dev-001',
      userName: 'GameCraft',
      status: 'approved',
      applicationDate: Date.now() - 70 * 24 * 60 * 60 * 1000,
      approvalDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
      certificateNumber: 'CERT-2024-0001',
      benefits: this.getCertificationBenefits(),
    });

    this.certification.set('dev-002', {
      userId: 'dev-002',
      userName: 'PixelArt Studio',
      status: 'approved',
      applicationDate: Date.now() - 100 * 24 * 60 * 60 * 1000,
      approvalDate: Date.now() - 90 * 24 * 60 * 60 * 1000,
      certificateNumber: 'CERT-2024-0002',
      benefits: this.getCertificationBenefits(),
    });

    this.certification.set('dev-004', {
      userId: 'dev-004',
      userName: 'FXLab',
      status: 'approved',
      applicationDate: Date.now() - 55 * 24 * 60 * 60 * 1000,
      approvalDate: Date.now() - 45 * 24 * 60 * 60 * 1000,
      certificateNumber: 'CERT-2024-0003',
      benefits: this.getCertificationBenefits(),
    });

    this.certification.set('dev-006', {
      userId: 'dev-006',
      userName: '独立游戏人老王',
      status: 'approved',
      applicationDate: Date.now() - 110 * 24 * 60 * 60 * 1000,
      approvalDate: Date.now() - 100 * 24 * 60 * 60 * 1000,
      certificateNumber: 'CERT-2024-0004',
      benefits: this.getCertificationBenefits(),
    });
  }

  private loadMockIncentivePrograms(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.incentivePrograms = [
      {
        id: 'program-q2-2024',
        name: '2024 Q2 开发者激励计划',
        description: '第二季度开发者激励计划，丰厚奖励等你来拿！',
        type: 'quarterly',
        startDate: now - 30 * day,
        endDate: now + 60 * day,
        prizePool: 100000,
        rules: [
          '活动期间发布的新资源参与排名',
          '按下载量、评分、收藏数综合计算',
          '禁止作弊，一经发现取消资格',
          '官方保留最终解释权',
        ],
        rewards: [
          { rank: 1, name: '一等奖', points: 5000, bonus: '专属推广资源包', icon: 'trophy' },
          { rank: 2, name: '二等奖', points: 3000, bonus: '首页推荐位', icon: 'award' },
          { rank: 3, name: '三等奖', points: 2000, bonus: '分类推荐位', icon: 'star' },
          { rank: 4, name: '优秀奖', points: 1000, bonus: '积分奖励', icon: 'medal' },
          { rank: 5, name: '参与奖', points: 500, bonus: '积分奖励', icon: 'thumbs-up' },
        ],
        status: 'ongoing',
      },
      {
        id: 'game-jam-2024',
        name: '2024 游戏创作大赛',
        description: '48小时游戏创作挑战，展示你的创意和实力！',
        type: 'special',
        startDate: now + 15 * day,
        endDate: now + 25 * day,
        prizePool: 50000,
        rules: [
          '48小时内完成游戏开发',
          '主题活动开始时公布',
          '必须使用TapDev引擎开发',
          '团队人数不超过3人',
        ],
        rewards: [
          { rank: 1, name: '金奖', points: 8000, bonus: '专访报道+独家合作机会', icon: 'crown' },
          { rank: 2, name: '银奖', points: 5000, bonus: '首页推荐+专访', icon: 'trophy' },
          { rank: 3, name: '铜奖', points: 3000, bonus: '分类推荐', icon: 'award' },
          { rank: 4, name: '最佳创意奖', points: 2000, bonus: '创意徽章', icon: 'lightbulb' },
          { rank: 5, name: '最受欢迎奖', points: 2000, bonus: '人气徽章', icon: 'heart' },
        ],
        status: 'upcoming',
      },
      {
        id: 'program-q1-2024',
        name: '2024 Q1 开发者激励计划',
        description: '第一季度开发者激励计划已圆满结束！',
        type: 'quarterly',
        startDate: now - 120 * day,
        endDate: now - 30 * day,
        prizePool: 80000,
        rules: ['活动期间发布的新资源参与排名', '按下载量、评分、收藏数综合计算'],
        rewards: [
          { rank: 1, name: '一等奖', points: 5000, bonus: '专属推广资源包', icon: 'trophy' },
          { rank: 2, name: '二等奖', points: 3000, bonus: '首页推荐位', icon: 'award' },
          { rank: 3, name: '三等奖', points: 2000, bonus: '分类推荐位', icon: 'star' },
        ],
        status: 'ended',
      },
      {
        id: 'annual-2023',
        name: '2023 年度开发者大奖',
        description: '年度最具影响力开发者评选',
        type: 'annual',
        startDate: now - 150 * day,
        endDate: now - 120 * day,
        prizePool: 200000,
        rules: ['全年贡献综合排名', '社区投票+官方评审'],
        rewards: [
          { rank: 1, name: '年度开发者', points: 20000, bonus: '永久会员+奖杯', icon: 'crown' },
          { rank: 2, name: '卓越贡献奖', points: 10000, bonus: '年度徽章', icon: 'trophy' },
          { rank: 3, name: '优秀开发者', points: 5000, bonus: '年度徽章', icon: 'award' },
        ],
        status: 'ended',
      },
    ];
  }

  private loadMockActivities(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.activities = [
      {
        id: 'activity-001',
        title: 'TapDev 线下开发者沙龙 · 上海站',
        description: '和志同道合的开发者面对面交流，分享开发经验，探讨游戏开发的未来。',
        type: 'offline',
        location: '上海市浦东新区张江高科技园区',
        startTime: now + 20 * day,
        endTime: now + 20 * day + 4 * 60 * 60 * 1000,
        maxParticipants: 50,
        participantCount: 32,
        status: 'upcoming',
        image: 'salon-shanghai.jpg',
        pointsReward: 100,
        registrationDeadline: now + 18 * day,
      },
      {
        id: 'activity-002',
        title: 'AI 辅助游戏开发线上分享会',
        description: '探讨AI在游戏开发中的应用，包括AI生成代码、AI美术、AI测试等话题。',
        type: 'online',
        startTime: now + 10 * day,
        endTime: now + 10 * day + 2 * 60 * 60 * 1000,
        maxParticipants: 500,
        participantCount: 256,
        status: 'upcoming',
        image: 'ai-share.jpg',
        pointsReward: 50,
      },
      {
        id: 'activity-003',
        title: '2024 游戏创作大赛',
        description: '48小时极限开发挑战，用创意和技术征服评委！',
        type: 'hackathon',
        location: '线上+北京/上海/深圳线下会场',
        startTime: now + 15 * day,
        endTime: now + 25 * day,
        maxParticipants: 1000,
        participantCount: 678,
        status: 'upcoming',
        image: 'game-jam-2024.jpg',
        pointsReward: 300,
        registrationDeadline: now + 12 * day,
      },
      {
        id: 'activity-004',
        title: 'TapDev 开发者沙龙 · 北京站',
        description: '北京站沙龙圆满结束，感谢大家的参与！',
        type: 'salon',
        location: '北京市海淀区中关村',
        startTime: now - 15 * day,
        endTime: now - 15 * day + 4 * 60 * 60 * 1000,
        participantCount: 45,
        status: 'ended',
        image: 'salon-beijing.jpg',
        pointsReward: 100,
      },
      {
        id: 'activity-005',
        title: '新手入门线上培训',
        description: '针对新手开发者的系统培训课程，从零基础到做出第一个游戏。',
        type: 'online',
        startTime: now - 30 * day,
        endTime: now - 25 * day,
        participantCount: 1200,
        status: 'ended',
        image: 'beginner-training.jpg',
        pointsReward: 200,
      },
    ];
  }

  private loadMockBadges(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.badges = [
      {
        id: 'badge-first-publish',
        name: '初次发布',
        description: '第一次发布资源',
        icon: 'rocket',
        category: 'achievement',
        earnedAt: now - 120 * day,
        rarity: 'common',
      },
      {
        id: 'badge-download-1k',
        name: '千次下载',
        description: '资源累计下载量达到1000',
        icon: 'download',
        category: 'achievement',
        earnedAt: now - 50 * day,
        rarity: 'rare',
      },
      {
        id: 'badge-featured',
        name: '精选推荐',
        description: '获得官方精选推荐',
        icon: 'star',
        category: 'achievement',
        earnedAt: now - 90 * day,
        rarity: 'rare',
      },
      {
        id: 'badge-level-5',
        name: '资深开发者',
        description: '达到5级开发者等级',
        icon: 'trophy',
        category: 'achievement',
        earnedAt: now - 30 * day,
        rarity: 'epic',
      },
      {
        id: 'badge-contributor',
        name: '社区贡献者',
        description: '为社区做出突出贡献',
        icon: 'heart',
        category: 'contribution',
        earnedAt: now - 60 * day,
        rarity: 'rare',
      },
      {
        id: 'badge-game-jam',
        name: 'Game Jam 参与者',
        description: '参加2023年游戏创作大赛',
        icon: 'zap',
        category: 'event',
        earnedAt: now - 100 * day,
        rarity: 'common',
      },
    ];
  }
}

export const developerIncentivesService = new DeveloperIncentivesService();
