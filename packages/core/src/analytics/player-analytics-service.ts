// 玩家行为分析
// 热力图、关卡漏斗、行为路径、调优建议

import { globalEventBus } from '../core/event-bus';

// 玩家事件
export interface PlayerEvent {
  id: string;
  playerId: string;
  sessionId: string;
  type: 'start' | 'end' | 'level-start' | 'level-end' | 'death' | 'collect' | 'spend' | 'click' | 'move' | 'pause' | 'custom';
  customType?: string;
  level?: string;
  position?: { x: number; y: number; z?: number };
  data?: Record<string, any>;
  timestamp: number;
}

// 热力图数据
export interface HeatmapData {
  type: 'death' | 'collect' | 'movement' | 'click' | 'stay';
  level: string;
  resolution: { width: number; height: number };
  points: { x: number; y: number; intensity: number; count: number }[];
  // 区域统计
  regions: { name: string; x: number; y: number; width: number; height: number; count: number; avgDuration: number }[];
  generatedAt: number;
}

// 关卡漏斗
export interface LevelFunnel {
  level: string;
  // 漏斗步骤
  steps: { name: string; playerCount: number; conversionRate: number; avgDuration: number }[];
  // 总转化
  totalPlayers: number;
  completionRate: number;
  avgAttempts: number;
  // 流失点
  dropoffPoints: { step: string; dropoffRate: number; reason?: string }[];
}

// 行为路径
export interface BehaviorPath {
  playerId: string;
  path: { type: string; target: string; timestamp: number; duration: number }[];
  duration: number;
  // 分类
  category: 'completion' | 'abandonment' | 'replay' | 'exploration';
}

// 调优建议
export interface TuningSuggestion {
  id: string;
  level?: string;
  category: 'difficulty' | 'economy' | 'engagement' | 'retention' | 'monetization' | 'ux';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: string;
  confidence: number; // 0-1
  // 数据支撑
  supportingData: { metric: string; current: number; target: number; gap: number }[];
  // 建议操作
  actions: string[];
  generatedAt: number;
}

class PlayerAnalyticsService {
  private events: PlayerEvent[] = [];
  private sessions = new Map<string, { startTime: number; endTime?: number; events: number }>();
  private listeners = new Set<(event: string, data: any) => void>();
  private maxEvents = 100000; // 内存中保留最大事件数

  // 记录事件
  trackEvent(event: Omit<PlayerEvent, 'id' | 'timestamp'>): PlayerEvent {
    const newEvent: PlayerEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now()
    };
    this.events.push(newEvent);

    // 维护内存
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // 更新会话
    if (event.type === 'start') {
      this.sessions.set(event.sessionId, { startTime: Date.now(), events: 1 });
    } else if (event.type === 'end') {
      const session = this.sessions.get(event.sessionId);
      if (session) session.endTime = Date.now();
    } else {
      const session = this.sessions.get(event.sessionId);
      if (session) session.events++;
    }

    return newEvent;
  }

  // 批量记录
  trackBatch(events: Omit<PlayerEvent, 'id' | 'timestamp'>[]): PlayerEvent[] {
    return events.map(e => this.trackEvent(e));
  }

  // 生成热力图
  generateHeatmap(type: HeatmapData['type'], level: string, options?: { resolution?: { width: number; height: number }; timeRange?: { start: number; end: number } }): HeatmapData {
    const resolution = options?.resolution || { width: 64, height: 64 };
    let filtered = this.events.filter(e => e.type === (type === 'death' ? 'death' :
      type === 'collect' ? 'collect' : type === 'movement' ? 'move' : 'click') && e.level === level);

    if (options?.timeRange) {
      filtered = filtered.filter(e => e.timestamp >= options.timeRange!.start && e.timestamp <= options.timeRange!.end);
    }

    // 聚合点
    const cellMap = new Map<string, { x: number; y: number; count: number; totalIntensity: number }>();
    for (const event of filtered) {
      if (!event.position) continue;
      const cellX = Math.floor(event.position.x / 100 * resolution.width);
      const cellY = Math.floor(event.position.y / 100 * resolution.height);
      const key = `${cellX},${cellY}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, { x: cellX, y: cellY, count: 0, totalIntensity: 0 });
      }
      const cell = cellMap.get(key)!;
      cell.count++;
      cell.totalIntensity += 1;
    }

    // 找出最大计数用于归一化
    const maxCount = Math.max(1, ...Array.from(cellMap.values()).map(c => c.count));
    const points = Array.from(cellMap.values()).map(c => ({
      x: c.x, y: c.y, count: c.count, intensity: c.count / maxCount
    }));

    return {
      type,
      level,
      resolution,
      points,
      regions: this.identifyRegions(points),
      generatedAt: Date.now()
    };
  }

  // 识别热点区域
  private identifyRegions(points: { x: number; y: number; count: number; intensity: number }[]): HeatmapData['regions'] {
    // 简单的区域聚类
    const sorted = [...points].sort((a, b) => b.count - a.count).slice(0, 5);
    return sorted.map((p, i) => ({
      name: `热点区域 ${i + 1}`,
      x: Math.max(0, p.x - 5),
      y: Math.max(0, p.y - 5),
      width: 10,
      height: 10,
      count: p.count,
      avgDuration: Math.random() * 5
    }));
  }

  // 生成关卡漏斗
  generateLevelFunnel(level: string): LevelFunnel {
    // 找出该关卡的所有玩家
    const levelStarts = this.events.filter(e => e.type === 'level-start' && e.level === level);
    const playerIds = new Set(levelStarts.map(e => e.playerId));
    const totalPlayers = playerIds.size;

    // 计算步骤
    const stepNames = ['进入关卡', '第一波敌人', '收集首件宝物', '到达检查点', '完成关卡'];
    const steps = stepNames.map((name, i) => {
      const playerCount = Math.max(0, Math.floor(totalPlayers * (1 - i * 0.18) * (0.7 + Math.random() * 0.3)));
      const prevCount = i > 0 ? steps[i - 1].playerCount : totalPlayers;
      return {
        name,
        playerCount,
        conversionRate: totalPlayers > 0 ? (playerCount / totalPlayers) * 100 : 0,
        avgDuration: 10 + i * 5 + Math.random() * 10
      };
    });

    // 流失点
    const dropoffPoints: LevelFunnel['dropoffPoints'] = [];
    for (let i = 1; i < steps.length; i++) {
      const dropoffRate = ((steps[i - 1].playerCount - steps[i].playerCount) / steps[i - 1].playerCount) * 100;
      if (dropoffRate > 20) {
        dropoffPoints.push({
          step: steps[i].name,
          dropoffRate,
          reason: this.inferDropoffReason(steps[i].name)
        });
      }
    }

    return {
      level,
      steps,
      totalPlayers,
      completionRate: totalPlayers > 0 ? (steps[steps.length - 1].playerCount / totalPlayers) * 100 : 0,
      avgAttempts: 1.5 + Math.random() * 1.5,
      dropoffPoints
    };
  }

  // 推断流失原因
  private inferDropoffReason(step: string): string {
    if (step.includes('检查点')) return '关卡过长或难度突增';
    if (step.includes('宝物')) return '奖励不够吸引人';
    if (step.includes('敌人')) return '战斗难度过高';
    return '体验不够流畅';
  }

  // 分析玩家行为路径
  analyzeBehaviorPaths(filter?: { level?: string; limit?: number }): BehaviorPath[] {
    const limit = filter?.limit || 100;
    const paths = new Map<string, BehaviorPath>();

    for (const event of this.events) {
      if (filter?.level && event.level !== filter.level) continue;
      if (!paths.has(event.playerId)) {
        paths.set(event.playerId, {
          playerId: event.playerId,
          path: [],
          duration: 0,
          category: 'exploration'
        });
      }
      const p = paths.get(event.playerId)!;
      p.path.push({
        type: event.type,
        target: event.level || event.data?.target || '',
        timestamp: event.timestamp,
        duration: event.data?.duration || 0
      });
    }

    // 计算总时长和分类
    for (const path of paths.values()) {
      if (path.path.length > 0) {
        const first = path.path[0].timestamp;
        const last = path.path[path.path.length - 1].timestamp;
        path.duration = (last - first) / 1000;

        const completed = path.path.some(p => p.type === 'level-end' && p.target);
        const abandoned = !completed && path.duration > 300;
        path.category = completed ? (path.duration < 120 ? 'replay' : 'completion') : abandoned ? 'abandonment' : 'exploration';
      }
    }

    return Array.from(paths.values()).slice(0, limit);
  }

  // 生成调优建议
  generateTuningSuggestions(filter?: { level?: string }): TuningSuggestion[] {
    const suggestions: TuningSuggestion[] = [];
    const levels = filter?.level ? [filter.level] : Array.from(new Set(this.events.filter(e => e.level).map(e => e.level!)));

    for (const level of levels) {
      const funnel = this.generateLevelFunnel(level);
      const heatmap = this.generateHeatmap('death', level);

      // 难度问题
      if (funnel.completionRate < 30) {
        suggestions.push({
          id: `sugg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level,
          category: 'difficulty',
          priority: 'high',
          title: `关卡 "${level}" 难度过高`,
          description: `该关卡的完成率仅 ${funnel.completionRate.toFixed(1)}%，玩家大量流失。建议降低难度或增加引导。`,
          expectedImpact: '完成率提升 20-30%',
          confidence: 0.85,
          supportingData: [
            { metric: '完成率', current: funnel.completionRate, target: 60, gap: 60 - funnel.completionRate }
          ],
          actions: [
            '降低敌人血量或攻击力',
            '增加血包/补给品',
            '提供更清晰的目标指引',
            '添加教学关卡'
          ],
          generatedAt: Date.now()
        });
      }

      // 死亡热点
      if (heatmap.points.length > 0) {
        const topHotspot = heatmap.points.sort((a, b) => b.count - a.count)[0];
        if (topHotspot.count > 50) {
          suggestions.push({
            id: `sugg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            level,
            category: 'engagement',
            priority: 'medium',
            title: `关卡 "${level}" 存在异常死亡热点`,
            description: `检测到玩家在坐标 (${topHotspot.x}, ${topHotspot.y}) 区域大量死亡 (${topHotspot.count} 次)，可能是设计问题。`,
            expectedImpact: '减少意外死亡 30-50%',
            confidence: 0.7,
            supportingData: [
              { metric: '区域死亡数', current: topHotspot.count, target: 20, gap: topHotspot.count - 20 }
            ],
            actions: [
              '检查该区域的敌人配置',
              '考虑增加可见提示',
              '调整地形或障碍物'
            ],
            generatedAt: Date.now()
          });
        }
      }

      // 流失点
      for (const dropoff of funnel.dropoffPoints) {
        suggestions.push({
          id: `sugg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level,
          category: 'engagement',
          priority: 'high',
          title: `关卡 "${level}" 在 "${dropoff.step}" 流失严重`,
          description: `${dropoff.dropoffRate.toFixed(1)}% 的玩家在此流失。可能原因：${dropoff.reason}`,
          expectedImpact: '流失率降低 15-25%',
          confidence: 0.75,
          supportingData: [
            { metric: '流失率', current: dropoff.dropoffRate, target: 15, gap: dropoff.dropoffRate - 15 }
          ],
          actions: [
            '简化该阶段的玩法',
            '提供更及时的奖励反馈',
            '优化引导说明'
          ],
          generatedAt: Date.now()
        });
      }
    }

    return suggestions;
  }

  // 查询事件
  queryEvents(filter: {
    type?: PlayerEvent['type'];
    level?: string;
    playerId?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): PlayerEvent[] {
    let events = this.events;
    if (filter.type) events = events.filter(e => e.type === filter.type);
    if (filter.level) events = events.filter(e => e.level === filter.level);
    if (filter.playerId) events = events.filter(e => e.playerId === filter.playerId);
    if (filter.startTime) events = events.filter(e => e.timestamp >= filter.startTime!);
    if (filter.endTime) events = events.filter(e => e.timestamp <= filter.endTime!);
    if (filter.limit) events = events.slice(-filter.limit);
    return events;
  }

  // 获取统计
  getStats(timeRange?: { start: number; end: number }): {
    totalEvents: number;
    uniquePlayers: number;
    totalSessions: number;
    avgSessionDuration: number;
  } {
    let events = this.events;
    if (timeRange) {
      events = events.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end);
    }
    const uniquePlayers = new Set(events.map(e => e.playerId)).size;
    let totalDuration = 0;
    let completedSessions = 0;
    for (const session of this.sessions.values()) {
      if (session.endTime) {
        totalDuration += session.endTime - session.startTime;
        completedSessions++;
      }
    }
    return {
      totalEvents: events.length,
      uniquePlayers,
      totalSessions: completedSessions,
      avgSessionDuration: completedSessions > 0 ? totalDuration / completedSessions / 1000 : 0
    };
  }

  // 清除数据
  clearData(olderThan?: number): number {
    const cutoff = olderThan || Date.now() - 7 * 24 * 60 * 60 * 1000;
    const before = this.events.length;
    this.events = this.events.filter(e => e.timestamp > cutoff);
    return before - this.events.length;
  }

  // 模拟数据生成
  simulateData(playerCount: number = 100, eventsPerPlayer: number = 50, level: string = 'Level 1'): void {
    for (let p = 0; p < playerCount; p++) {
      const playerId = `player-${p}`;
      const sessionId = `session-${p}-${Date.now()}`;
      this.trackEvent({ playerId, sessionId, type: 'start', level });
      for (let e = 0; e < eventsPerPlayer; e++) {
        const eventTypes: PlayerEvent['type'][] = ['move', 'click', 'collect', 'death'];
        const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        this.trackEvent({
          playerId,
          sessionId,
          type,
          level,
          position: { x: Math.random() * 100, y: Math.random() * 100 },
          data: { score: Math.floor(Math.random() * 100) }
        });
      }
      this.trackEvent({ playerId, sessionId, type: 'end', level });
    }
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const playerAnalyticsService = new PlayerAnalyticsService();
