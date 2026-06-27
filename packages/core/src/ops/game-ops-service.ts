// 游戏运营一站式工作台
// 发布、数据分析、用户反馈、A/B 测试、活动、客服工单、版本管理

import { globalEventBus } from '../event-bus';

// 游戏
export interface ManagedGame {
  id: string;
  name: string;
  icon: string;
  platforms: string[];
  versions: GameVersion[];
  metrics: GameMetrics;
  status: 'live' | 'beta' | 'paused' | 'deprecated';
  createdAt: number;
}

// 游戏版本
export interface GameVersion {
  id: string;
  version: string;
  buildNumber: number;
  changelog: string;
  releaseDate: number;
  status: 'in-review' | 'approved' | 'rejected' | 'live' | 'rolled-back';
  rolloutPercentage: number;
  platforms: { [platform: string]: { status: string; url?: string } };
  crashRate: number;
}

// 游戏指标
export interface GameMetrics {
  dau: number; // 日活
  mau: number; // 月活
  retention: { d1: number; d7: number; d30: number };
  arpu: number; // 人均收入
  arppu: number; // 付费用户人均收入
  conversionRate: number; // 付费转化
  avgSessionTime: number; // 平均时长（秒）
  crashRate: number;
  rating: number;
  totalDownloads: number;
  trend: { date: number; dau: number; revenue: number }[];
}

// 玩家反馈
export interface PlayerFeedback {
  id: string;
  gameId: string;
  playerId: string;
  type: 'bug' | 'suggestion' | 'question' | 'praise' | 'complaint';
  title: string;
  content: string;
  rating?: number;
  status: 'new' | 'in-progress' | 'resolved' | 'closed' | 'spam';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  assignedTo?: string;
  replies: { author: string; content: string; isOfficial: boolean; timestamp: number }[];
  createdAt: number;
  updatedAt: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

// 客服工单
export interface SupportTicket {
  id: string;
  gameId: string;
  playerId: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  messages: { author: string; content: string; timestamp: number; attachments?: string[] }[];
  relatedFeedbackId?: string;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
}

// 运营活动
export interface Campaign {
  id: string;
  gameId: string;
  name: string;
  type: 'discount' | 'event' | 'gift' | 'tournament' | 'announcement';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  startTime: number;
  endTime: number;
  // 配置
  config: {
    discountPercentage?: number;
    eventDescription?: string;
    gifts?: { itemId: string; quantity: number }[];
    targetAudience?: 'all' | 'new-players' | 'returning' | 'vip' | 'custom';
    targetCriteria?: Record<string, any>;
  };
  // 效果
  metrics: {
    participants: number;
    revenue: number;
    retention: number;
  };
  createdAt: number;
  createdBy: string;
}

// 自动化规则
export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    event: string;
    conditions: { field: string; op: string; value: any }[];
  };
  actions: {
    type: 'send-notification' | 'create-ticket' | 'update-status' | 'trigger-event' | 'send-gift';
    params: any;
  }[];
  enabled: boolean;
  createdAt: number;
}

class GameOpsService {
  private games = new Map<string, ManagedGame>();
  private feedback = new Map<string, PlayerFeedback>();
  private tickets = new Map<string, SupportTicket>();
  private campaigns = new Map<string, Campaign>();
  private automations: AutomationRule[] = [];
  private listeners = new Set<(event: string, data: any) => void>();
  private currentUser = 'ops-1';

  // 添加游戏
  addGame(game: Omit<ManagedGame, 'id' | 'metrics' | 'createdAt' | 'versions'>): ManagedGame {
    const newGame: ManagedGame = {
      ...game,
      id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      versions: [],
      metrics: this.initMetrics(),
      createdAt: Date.now(),
    };
    this.games.set(newGame.id, newGame);
    return newGame;
  }

  private initMetrics(): GameMetrics {
    return {
      dau: 0,
      mau: 0,
      retention: { d1: 0, d7: 0, d30: 0 },
      arpu: 0,
      arppu: 0,
      conversionRate: 0,
      avgSessionTime: 0,
      crashRate: 0,
      rating: 0,
      totalDownloads: 0,
      trend: [],
    };
  }

  // 提交反馈
  submitFeedback(
    feedback: Omit<
      PlayerFeedback,
      'id' | 'status' | 'replies' | 'createdAt' | 'updatedAt' | 'sentiment'
    >
  ): PlayerFeedback {
    const newFeedback: PlayerFeedback = {
      ...feedback,
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'new',
      replies: [],
      sentiment: this.analyzeSentiment(feedback.content),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.feedback.set(newFeedback.id, newFeedback);
    this.notify('feedback:submitted', newFeedback);
    this.checkAutomations('feedback:new', newFeedback);
    return newFeedback;
  }

  // 回复反馈
  replyFeedback(feedbackId: string, content: string, isOfficial: boolean = true): void {
    const fb = this.feedback.get(feedbackId);
    if (!fb) return;
    fb.replies.push({
      author: this.currentUser,
      content,
      isOfficial,
      timestamp: Date.now(),
    });
    fb.status = 'in-progress';
    fb.updatedAt = Date.now();
    this.notify('feedback:replied', { feedbackId, reply: fb.replies[fb.replies.length - 1] });
  }

  // 创建工单
  createTicket(
    ticket: Omit<SupportTicket, 'id' | 'status' | 'messages' | 'createdAt' | 'updatedAt'>
  ): SupportTicket {
    const newTicket: SupportTicket = {
      ...ticket,
      id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'open',
      messages: [
        {
          author: ticket.playerId,
          content: ticket.subject,
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.tickets.set(newTicket.id, newTicket);
    this.notify('ticket:created', newTicket);
    return newTicket;
  }

  // 回复工单
  replyTicket(ticketId: string, content: string, isAgent: boolean = true): void {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return;
    ticket.messages.push({
      author: isAgent ? this.currentUser : ticket.playerId,
      content,
      timestamp: Date.now(),
    });
    ticket.updatedAt = Date.now();
    if (isAgent) ticket.status = 'pending';
  }

  // 解决工单
  resolveTicket(ticketId: string): void {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return;
    ticket.status = 'resolved';
    ticket.closedAt = Date.now();
    this.notify('ticket:resolved', ticket);
  }

  // 创建活动
  createCampaign(campaign: Omit<Campaign, 'id' | 'status' | 'metrics' | 'createdAt'>): Campaign {
    const newCampaign: Campaign = {
      ...campaign,
      id: `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'draft',
      metrics: { participants: 0, revenue: 0, retention: 0 },
      createdAt: Date.now(),
    };
    this.campaigns.set(newCampaign.id, newCampaign);
    return newCampaign;
  }

  // 启动活动
  startCampaign(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;
    campaign.status = campaign.startTime <= Date.now() ? 'active' : 'scheduled';
    this.notify('campaign:started', campaign);
  }

  // 添加自动化规则
  addAutomationRule(rule: Omit<AutomationRule, 'id' | 'createdAt'>): AutomationRule {
    const newRule: AutomationRule = {
      ...rule,
      id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    this.automations.push(newRule);
    return newRule;
  }

  // 检查自动化
  private checkAutomations(event: string, data: any): void {
    for (const rule of this.automations) {
      if (!rule.enabled || rule.trigger.event !== event) continue;
      const allMatch = rule.trigger.conditions.every((c) => {
        const value = data[c.field];
        switch (c.op) {
          case '==':
            return value === c.value;
          case '!=':
            return value !== c.value;
          case '>':
            return value > c.value;
          case '<':
            return value < c.value;
          case '>=':
            return value >= c.value;
          case '<=':
            return value <= c.value;
          case 'contains':
            return String(value).includes(c.value);
        }
        return false;
      });
      if (allMatch) {
        this.executeActions(rule.actions, data);
      }
    }
  }

  private executeActions(actions: AutomationRule['actions'], data: any): void {
    for (const action of actions) {
      this.notify(`action:${action.type}`, { params: action.params, data });
    }
  }

  // 情感分析
  private analyzeSentiment(text: string): PlayerFeedback['sentiment'] {
    const positive = ['好', '棒', '喜欢', '赞', '好游戏', 'good', 'great', 'love', 'amazing'];
    const negative = [
      '差',
      '垃圾',
      'bug',
      '闪退',
      '卡顿',
      'bad',
      'terrible',
      'awful',
      'crash',
      'broken',
    ];

    const textLower = text.toLowerCase();
    const posCount = positive.filter((p) => textLower.includes(p)).length;
    const negCount = negative.filter((n) => textLower.includes(n)).length;

    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }

  // 列出反馈
  listFeedback(filter?: {
    gameId?: string;
    status?: PlayerFeedback['status'];
    type?: PlayerFeedback['type'];
    sentiment?: PlayerFeedback['sentiment'];
  }): PlayerFeedback[] {
    let fbs = Array.from(this.feedback.values());
    if (filter?.gameId) fbs = fbs.filter((f) => f.gameId === filter.gameId);
    if (filter?.status) fbs = fbs.filter((f) => f.status === filter.status);
    if (filter?.type) fbs = fbs.filter((f) => f.type === filter.type);
    if (filter?.sentiment) fbs = fbs.filter((f) => f.sentiment === filter.sentiment);
    return fbs.sort((a, b) => b.createdAt - a.createdAt);
  }

  // 列出工单
  listTickets(filter?: { gameId?: string; status?: SupportTicket['status'] }): SupportTicket[] {
    let tks = Array.from(this.tickets.values());
    if (filter?.gameId) tks = tks.filter((t) => t.gameId === filter.gameId);
    if (filter?.status) tks = tks.filter((t) => t.status === filter.status);
    return tks.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // 列出活动
  listCampaigns(filter?: { gameId?: string; status?: Campaign['status'] }): Campaign[] {
    let cps = Array.from(this.campaigns.values());
    if (filter?.gameId) cps = cps.filter((c) => c.gameId === filter.gameId);
    if (filter?.status) cps = cps.filter((c) => c.status === filter.status);
    return cps;
  }

  // 列出游戏
  listGames(): ManagedGame[] {
    return Array.from(this.games.values());
  }

  // 获取游戏
  getGame(id: string): ManagedGame | undefined {
    return this.games.get(id);
  }

  // 发布版本
  publishVersion(gameId: string, version: GameVersion): void {
    const game = this.games.get(gameId);
    if (!game) return;
    game.versions.push(version);
    this.notify('version:published', { gameId, version });
  }

  // 灰度发布
  rolloutVersion(gameId: string, versionId: string, percentage: number): void {
    const game = this.games.get(gameId);
    if (!game) return;
    const version = game.versions.find((v) => v.id === versionId);
    if (!version) return;
    version.rolloutPercentage = percentage;
    this.notify('version:rollout', { gameId, versionId, percentage });
  }

  // 紧急回滚
  rollbackVersion(gameId: string, versionId: string, reason: string): void {
    const game = this.games.get(gameId);
    if (!game) return;
    const version = game.versions.find((v) => v.id === versionId);
    if (!version) return;
    version.status = 'rolled-back';
    this.logAudit(gameId, 'version_rollback', { versionId, reason });
  }

  // 审计日志
  private logAudit(gameId: string, action: string, details: any): void {
    globalEventBus.emit('ops:audit', { gameId, action, details, timestamp: Date.now() });
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const gameOpsService = new GameOpsService();
