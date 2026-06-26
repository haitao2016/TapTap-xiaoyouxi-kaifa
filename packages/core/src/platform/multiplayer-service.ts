/**
 * 多人联机服务
 * - 房间管理：创建房间、加入房间、离开房间、房间列表
 * - 房间属性：最大人数、房间密码、房间状态、房间设置
 * - 玩家管理：玩家列表、玩家状态、踢人、房主权限
 * - 匹配系统：快速匹配、按条件匹配、匹配队列
 * - 实时消息：房间内聊天、系统消息、自定义消息
 * - 数据同步：房间状态同步、玩家属性同步
 * - 排行榜配置：排行榜类型、分数提交、排行榜查询
 * - 成就配置：成就定义、成就解锁、成就进度
 * - 预设模板：常用多人游戏模式配置
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type RoomStatus = 'waiting' | 'playing' | 'full' | 'closed';
export type PlayerStatus = 'idle' | 'ready' | 'playing' | 'offline';
export type MatchStatus = 'queued' | 'matching' | 'matched' | 'cancelled';
export type MessageType = 'chat' | 'system' | 'custom';
export type LeaderboardType = 'score' | 'level' | 'power' | 'clear';
export type AchievementType = 'normal' | 'hidden' | 'stage' | 'limited';

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  status: PlayerStatus;
  isOwner: boolean;
  joinAt: number;
  properties: Record<string, unknown>;
}

export interface RoomSettings {
  maxPlayers: number;
  hasPassword: boolean;
  password?: string;
  allowSpectator: boolean;
  gameMode: string;
  map: string;
  rules: Record<string, unknown>;
  friendlyFire?: boolean;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  status: RoomStatus;
  players: Player[];
  settings: RoomSettings;
  createdAt: number;
  startedAt?: number;
  properties: Record<string, unknown>;
}

export interface RoomMessage {
  id: string;
  type: MessageType;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface MatchRequest {
  id: string;
  playerId: string;
  playerName: string;
  gameMode: string;
  region?: string;
  rank?: number;
  preferences: Record<string, unknown>;
  status: MatchStatus;
  queuedAt: number;
  matchedAt?: number;
}

export interface MatchResult {
  requestId: string;
  roomId: string;
  matched: boolean;
  players: Player[];
  waitTime: number;
}

export interface LeaderboardConfig {
  id: string;
  name: string;
  type: LeaderboardType;
  description: string;
  resetPeriod: 'daily' | 'weekly' | 'monthly' | 'never';
  order: 'asc' | 'desc';
  maxEntries: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
  level?: number;
  power?: number;
  updatedAt: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: AchievementType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  conditions: Record<string, unknown>;
  rewards: Record<string, unknown>;
  points: number;
  hidden?: boolean;
  limited?: {
    startAt: number;
    endAt: number;
  };
  stages?: {
    threshold: number;
    description: string;
  }[];
}

export interface UserAchievement {
  achievementId: string;
  progress: number;
  total: number;
  percentage: number;
  unlocked: boolean;
  unlockedAt?: number;
  currentStage?: number;
}

export interface GameModeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  settings: Partial<RoomSettings>;
  minPlayers: number;
  maxPlayers: number;
  icon: string;
}

const MOCK_ROOMS: Room[] = [
  {
    id: 'room-001',
    name: '新手练习房',
    ownerId: 'player-001',
    status: 'waiting',
    players: [
      {
        id: 'player-001',
        nickname: '游戏达人',
        avatar: '',
        status: 'ready',
        isOwner: true,
        joinAt: Date.now() - 300000,
        properties: { level: 15, rank: 'gold' },
      },
      {
        id: 'player-002',
        nickname: '萌新玩家',
        avatar: '',
        status: 'idle',
        isOwner: false,
        joinAt: Date.now() - 120000,
        properties: { level: 5, rank: 'bronze' },
      },
    ],
    settings: {
      maxPlayers: 4,
      hasPassword: false,
      allowSpectator: true,
      gameMode: 'classic',
      map: 'forest',
      rules: { turnTime: 60, friendlyFire: false },
    },
    createdAt: Date.now() - 600000,
    properties: { ranked: false },
  },
  {
    id: 'room-002',
    name: '排位赛房间',
    ownerId: 'player-003',
    status: 'playing',
    players: [
      {
        id: 'player-003',
        nickname: '王者归来',
        avatar: '',
        status: 'playing',
        isOwner: true,
        joinAt: Date.now() - 600000,
        properties: { level: 45, rank: 'diamond' },
      },
      {
        id: 'player-004',
        nickname: '不败神话',
        avatar: '',
        status: 'playing',
        isOwner: false,
        joinAt: Date.now() - 580000,
        properties: { level: 42, rank: 'diamond' },
      },
    ],
    settings: {
      maxPlayers: 2,
      hasPassword: false,
      allowSpectator: false,
      gameMode: 'ranked',
      map: 'arena',
      rules: { bestOf: 3, turnTime: 30 },
    },
    createdAt: Date.now() - 900000,
    startedAt: Date.now() - 300000,
    properties: { ranked: true, season: 12 },
  },
];

const MOCK_LEADERBOARDS: LeaderboardConfig[] = [
  {
    id: 'score',
    name: '总分数榜',
    type: 'score',
    description: '全服总分数排名',
    resetPeriod: 'never',
    order: 'desc',
    maxEntries: 1000,
  },
  {
    id: 'level',
    name: '等级榜',
    type: 'level',
    description: '玩家等级排名',
    resetPeriod: 'never',
    order: 'desc',
    maxEntries: 1000,
  },
  {
    id: 'power',
    name: '战力榜',
    type: 'power',
    description: '角色战力排名',
    resetPeriod: 'weekly',
    order: 'desc',
    maxEntries: 500,
  },
  {
    id: 'clear',
    name: '通关榜',
    type: 'clear',
    description: '最快通关记录',
    resetPeriod: 'monthly',
    order: 'asc',
    maxEntries: 100,
  },
  {
    id: 'weekly_score',
    name: '周分数榜',
    type: 'score',
    description: '本周分数排名',
    resetPeriod: 'weekly',
    order: 'desc',
    maxEntries: 500,
  },
];

const MOCK_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_win',
    name: '初出茅庐',
    description: '赢得第一场比赛',
    icon: '',
    type: 'normal',
    rarity: 'common',
    conditions: { wins: 1 },
    rewards: { coins: 100 },
    points: 10,
  },
  {
    id: 'win_10',
    name: '小试牛刀',
    description: '累计赢得10场比赛',
    icon: '',
    type: 'normal',
    rarity: 'common',
    conditions: { wins: 10 },
    rewards: { coins: 500 },
    points: 20,
  },
  {
    id: 'win_100',
    name: '百战百胜',
    description: '累计赢得100场比赛',
    icon: '',
    type: 'stage',
    rarity: 'rare',
    conditions: { wins: 100 },
    rewards: { coins: 2000, avatar: 'champion' },
    points: 50,
    stages: [
      { threshold: 10, description: '赢得10场' },
      { threshold: 50, description: '赢得50场' },
      { threshold: 100, description: '赢得100场' },
    ],
  },
  {
    id: 'streak_5',
    name: '连胜达人',
    description: '连续赢得5场比赛',
    icon: '',
    type: 'normal',
    rarity: 'rare',
    conditions: { streak: 5 },
    rewards: { coins: 300 },
    points: 30,
  },
  {
    id: 'legendary',
    name: '传奇玩家',
    description: '达到传奇段位',
    icon: '',
    type: 'hidden',
    rarity: 'legendary',
    conditions: { rank: 'legendary' },
    rewards: { coins: 10000, title: '传奇' },
    points: 200,
    hidden: true,
  },
  {
    id: 'season_champion',
    name: '赛季冠军',
    description: '获得赛季冠军',
    icon: '',
    type: 'limited',
    rarity: 'epic',
    conditions: { seasonRank: 1 },
    rewards: { coins: 5000, frame: 'golden' },
    points: 150,
    limited: { startAt: Date.now() - 86400000 * 30, endAt: Date.now() + 86400000 * 60 },
  },
];

const GAME_MODE_TEMPLATES: GameModeTemplate[] = [
  {
    id: 'classic',
    name: '经典模式',
    description: '传统对战玩法',
    category: '对战',
    settings: { gameMode: 'classic', rules: { turnTime: 60 } },
    minPlayers: 2,
    maxPlayers: 8,
    icon: '🎮',
  },
  {
    id: 'ranked',
    name: '排位赛',
    description: '积分排位对战',
    category: '竞技',
    settings: { gameMode: 'ranked', allowSpectator: false, rules: { bestOf: 3, turnTime: 30 } },
    minPlayers: 2,
    maxPlayers: 2,
    icon: '🏆',
  },
  {
    id: 'coop',
    name: '合作模式',
    description: '组队共同挑战',
    category: '合作',
    settings: { gameMode: 'coop', friendlyFire: false },
    minPlayers: 2,
    maxPlayers: 4,
    icon: '🤝',
  },
  {
    id: 'battle_royale',
    name: '大逃杀',
    description: '多人生存竞技',
    category: '竞技',
    settings: { gameMode: 'battle_royale', rules: { shrinkZone: true } },
    minPlayers: 10,
    maxPlayers: 100,
    icon: '🔫',
  },
  {
    id: 'team_deathmatch',
    name: '团队死斗',
    description: '两队对战积分',
    category: '对战',
    settings: { gameMode: 'team_deathmatch', rules: { scoreLimit: 50, timeLimit: 300 } },
    minPlayers: 4,
    maxPlayers: 16,
    icon: '⚔️',
  },
];

export class MultiplayerService {
  private rooms = new Map<string, Room>();
  private messages = new Map<string, RoomMessage[]>();
  private matchQueue = new Map<string, MatchRequest>();
  private leaderboards = new Map<string, LeaderboardConfig>();
  private leaderboardData = new Map<string, LeaderboardEntry[]>();
  private achievements = new Map<string, AchievementDefinition>();
  private userAchievements = new Map<string, UserAchievement[]>();
  private templates = new Map<string, GameModeTemplate>();

  constructor() {
    MOCK_ROOMS.forEach((room) => this.rooms.set(room.id, room));
    MOCK_LEADERBOARDS.forEach((lb) => this.leaderboards.set(lb.id, lb));
    MOCK_ACHIEVEMENTS.forEach((ach) => this.achievements.set(ach.id, ach));
    GAME_MODE_TEMPLATES.forEach((t) => this.templates.set(t.id, t));
  }

  async createRoom(options: {
    name: string;
    ownerId: string;
    ownerName: string;
    ownerAvatar?: string;
    settings: Partial<RoomSettings>;
    properties?: Record<string, unknown>;
  }): Promise<Room> {
    const roomId = `room-${randomUUID().slice(0, 8)}`;
    const defaultSettings: RoomSettings = {
      maxPlayers: 4,
      hasPassword: false,
      allowSpectator: false,
      gameMode: 'classic',
      map: 'default',
      rules: {},
    };

    const room: Room = {
      id: roomId,
      name: options.name,
      ownerId: options.ownerId,
      status: 'waiting',
      players: [
        {
          id: options.ownerId,
          nickname: options.ownerName,
          avatar: options.ownerAvatar ?? '',
          status: 'ready',
          isOwner: true,
          joinAt: Date.now(),
          properties: {},
        },
      ],
      settings: { ...defaultSettings, ...options.settings },
      createdAt: Date.now(),
      properties: options.properties ?? {},
    };

    this.rooms.set(roomId, room);
    this.messages.set(roomId, []);

    globalEventBus.emit({ type: 'multiplayer:roomCreated', payload: room });
    return room;
  }

  async joinRoom(options: {
    roomId: string;
    playerId: string;
    playerName: string;
    playerAvatar?: string;
    password?: string;
    properties?: Record<string, unknown>;
  }): Promise<{ success: boolean; room?: Room; error?: string }> {
    const room = this.rooms.get(options.roomId);
    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    if (room.status === 'closed') {
      return { success: false, error: '房间已关闭' };
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return { success: false, error: '房间已满' };
    }

    if (room.settings.hasPassword && room.settings.password !== options.password) {
      return { success: false, error: '密码错误' };
    }

    if (room.players.some((p) => p.id === options.playerId)) {
      return { success: false, error: '已经在房间中' };
    }

    const player: Player = {
      id: options.playerId,
      nickname: options.playerName,
      avatar: options.playerAvatar ?? '',
      status: 'idle',
      isOwner: false,
      joinAt: Date.now(),
      properties: options.properties ?? {},
    };

    room.players.push(player);

    if (room.players.length >= room.settings.maxPlayers) {
      room.status = 'full';
    }

    this.addSystemMessage(options.roomId, `${options.playerName} 加入了房间`);
    globalEventBus.emit({
      type: 'multiplayer:playerJoined',
      payload: { roomId: options.roomId, player },
    });

    return { success: true, room };
  }

  async leaveRoom(roomId: string, playerId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return false;

    const player = room.players[playerIndex];
    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.messages.delete(roomId);
    } else if (player.isOwner) {
      room.players[0].isOwner = true;
      room.ownerId = room.players[0].id;
    }

    if (room.status === 'full' && room.players.length < room.settings.maxPlayers) {
      room.status = 'waiting';
    }

    this.addSystemMessage(roomId, `${player.nickname} 离开了房间`);
    globalEventBus.emit({ type: 'multiplayer:playerLeft', payload: { roomId, playerId } });

    return true;
  }

  async listRooms(options?: {
    gameMode?: string;
    status?: RoomStatus;
    hasPassword?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ rooms: Room[]; total: number }> {
    let rooms = Array.from(this.rooms.values());

    if (options?.gameMode) {
      rooms = rooms.filter((r) => r.settings.gameMode === options.gameMode);
    }
    if (options?.status) {
      rooms = rooms.filter((r) => r.status === options.status);
    }
    if (options?.hasPassword !== undefined) {
      rooms = rooms.filter((r) => r.settings.hasPassword === options.hasPassword);
    }
    if (options?.search) {
      const keyword = options.search.toLowerCase();
      rooms = rooms.filter((r) => r.name.toLowerCase().includes(keyword));
    }

    const total = rooms.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    rooms = rooms.slice(start, start + pageSize);

    return { rooms, total };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  async updateRoomSettings(
    roomId: string,
    playerId: string,
    settings: Partial<RoomSettings>
  ): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.ownerId !== playerId) return false;

    room.settings = { ...room.settings, ...settings };
    globalEventBus.emit({ type: 'multiplayer:roomUpdated', payload: room });
    return true;
  }

  async kickPlayer(roomId: string, ownerId: string, playerId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.ownerId !== ownerId) return false;
    if (room.ownerId === playerId) return false;

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return false;

    const player = room.players[playerIndex];
    room.players.splice(playerIndex, 1);

    if (room.status === 'full' && room.players.length < room.settings.maxPlayers) {
      room.status = 'waiting';
    }

    this.addSystemMessage(roomId, `${player.nickname} 被房主踢出了房间`);
    globalEventBus.emit({ type: 'multiplayer:playerKicked', payload: { roomId, playerId } });

    return true;
  }

  async startGame(roomId: string, ownerId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.ownerId !== ownerId) return false;
    if (room.players.length < 2) return false;

    room.status = 'playing';
    room.startedAt = Date.now();
    room.players.forEach((p) => (p.status = 'playing'));

    this.addSystemMessage(roomId, '游戏开始！');
    globalEventBus.emit({ type: 'multiplayer:gameStarted', payload: room });

    return true;
  }

  async endGame(roomId: string, results?: Record<string, unknown>): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.status = 'waiting';
    room.startedAt = undefined;
    room.players.forEach((p) => (p.status = 'idle'));

    this.addSystemMessage(roomId, '游戏结束');
    globalEventBus.emit({ type: 'multiplayer:gameEnded', payload: { roomId, results } });

    return true;
  }

  async updatePlayerStatus(
    roomId: string,
    playerId: string,
    status: PlayerStatus
  ): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;

    player.status = status;
    globalEventBus.emit({
      type: 'multiplayer:playerStatusChanged',
      payload: { roomId, playerId, status },
    });

    return true;
  }

  async updatePlayerProperties(
    roomId: string,
    playerId: string,
    properties: Record<string, unknown>
  ): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;

    player.properties = { ...player.properties, ...properties };
    globalEventBus.emit({
      type: 'multiplayer:playerPropertiesChanged',
      payload: { roomId, playerId, properties },
    });

    return true;
  }

  async sendMessage(options: {
    roomId: string;
    senderId: string;
    senderName: string;
    content: string;
    type?: MessageType;
    data?: Record<string, unknown>;
  }): Promise<RoomMessage> {
    const message: RoomMessage = {
      id: `msg-${randomUUID().slice(0, 8)}`,
      type: options.type ?? 'chat',
      roomId: options.roomId,
      senderId: options.senderId,
      senderName: options.senderName,
      content: options.content,
      timestamp: Date.now(),
      data: options.data,
    };

    const roomMessages = this.messages.get(options.roomId) ?? [];
    roomMessages.push(message);
    this.messages.set(options.roomId, roomMessages);

    globalEventBus.emit({ type: 'multiplayer:message', payload: message });
    return message;
  }

  getMessages(roomId: string): RoomMessage[] {
    return this.messages.get(roomId) ?? [];
  }

  private addSystemMessage(roomId: string, content: string): void {
    const message: RoomMessage = {
      id: `msg-${randomUUID().slice(0, 8)}`,
      type: 'system',
      roomId,
      senderId: 'system',
      senderName: '系统消息',
      content,
      timestamp: Date.now(),
    };

    const roomMessages = this.messages.get(roomId) ?? [];
    roomMessages.push(message);
    this.messages.set(roomId, roomMessages);
  }

  async startMatchmaking(options: {
    playerId: string;
    playerName: string;
    gameMode: string;
    region?: string;
    rank?: number;
    preferences?: Record<string, unknown>;
  }): Promise<MatchRequest> {
    const request: MatchRequest = {
      id: `match-${randomUUID().slice(0, 8)}`,
      playerId: options.playerId,
      playerName: options.playerName,
      gameMode: options.gameMode,
      region: options.region,
      rank: options.rank,
      preferences: options.preferences ?? {},
      status: 'queued',
      queuedAt: Date.now(),
    };

    this.matchQueue.set(request.id, request);

    setTimeout(
      () => {
        this.simulateMatch(request.id);
      },
      2000 + Math.random() * 3000
    );

    globalEventBus.emit({ type: 'multiplayer:matchQueued', payload: request });
    return request;
  }

  private async simulateMatch(requestId: string): Promise<void> {
    const request = this.matchQueue.get(requestId);
    if (!request || request.status !== 'queued') return;

    request.status = 'matching';
    globalEventBus.emit({ type: 'multiplayer:matchStarted', payload: request });

    setTimeout(async () => {
      const req = this.matchQueue.get(requestId);
      if (!req || req.status !== 'matching') return;

      const room = await this.createRoom({
        name: `${req.gameMode} 匹配房`,
        ownerId: req.playerId,
        ownerName: req.playerName,
        settings: { gameMode: req.gameMode, maxPlayers: 4 },
      });

      const botNames = ['AI战士', '机器人A', '智能对手', '电脑玩家'];
      for (let i = 0; i < 2; i++) {
        await this.joinRoom({
          roomId: room.id,
          playerId: `bot-${i}`,
          playerName: botNames[i],
          properties: { isBot: true },
        });
      }

      req.status = 'matched';
      req.matchedAt = Date.now();

      const result: MatchResult = {
        requestId: req.id,
        roomId: room.id,
        matched: true,
        players: room.players,
        waitTime: Date.now() - req.queuedAt,
      };

      globalEventBus.emit({ type: 'multiplayer:matchFound', payload: result });
    }, 1500);
  }

  cancelMatchmaking(requestId: string): boolean {
    const request = this.matchQueue.get(requestId);
    if (!request) return false;

    request.status = 'cancelled';
    this.matchQueue.delete(requestId);

    globalEventBus.emit({ type: 'multiplayer:matchCancelled', payload: requestId });
    return true;
  }

  getMatchRequest(requestId: string): MatchRequest | undefined {
    return this.matchQueue.get(requestId);
  }

  listLeaderboards(): LeaderboardConfig[] {
    return Array.from(this.leaderboards.values());
  }

  async getLeaderboard(
    leaderboardId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    if (!this.leaderboardData.has(leaderboardId)) {
      this.generateMockLeaderboardData(leaderboardId);
    }

    let entries = this.leaderboardData.get(leaderboardId) ?? [];
    const total = entries.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    entries = entries.slice(start, start + pageSize);

    return { entries, total };
  }

  async submitScore(
    leaderboardId: string,
    playerId: string,
    playerName: string,
    score: number
  ): Promise<LeaderboardEntry | null> {
    const config = this.leaderboards.get(leaderboardId);
    if (!config) return null;

    if (!this.leaderboardData.has(leaderboardId)) {
      this.generateMockLeaderboardData(leaderboardId);
    }

    const entries = this.leaderboardData.get(leaderboardId) ?? [];
    let existing = entries.find((e) => e.playerId === playerId);

    if (existing) {
      if (config.order === 'desc' ? score > existing.score : score < existing.score) {
        existing.score = score;
        existing.updatedAt = Date.now();
      }
    } else {
      existing = {
        rank: 0,
        playerId,
        playerName,
        playerAvatar: '',
        score,
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
    globalEventBus.emit({
      type: 'multiplayer:scoreSubmitted',
      payload: { leaderboardId, entry: existing },
    });

    return existing;
  }

  async getPlayerRank(
    leaderboardId: string,
    playerId: string
  ): Promise<{ rank: number; score: number } | null> {
    if (!this.leaderboardData.has(leaderboardId)) {
      this.generateMockLeaderboardData(leaderboardId);
    }

    const entries = this.leaderboardData.get(leaderboardId) ?? [];
    const entry = entries.find((e) => e.playerId === playerId);
    return entry ? { rank: entry.rank, score: entry.score } : null;
  }

  private generateMockLeaderboardData(leaderboardId: string): void {
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
    ];

    for (let i = 0; i < 50; i++) {
      entries.push({
        rank: i + 1,
        playerId: `player-${i + 1}`,
        playerName: names[i % names.length] + (i > 9 ? i : ''),
        playerAvatar: '',
        score: 10000 - i * 150 - Math.floor(Math.random() * 100),
        level: 50 - Math.floor(i / 5),
        power: 50000 - i * 800,
        updatedAt: Date.now() - Math.random() * 86400000,
      });
    }

    this.leaderboardData.set(leaderboardId, entries);
  }

  listAchievements(): AchievementDefinition[] {
    return Array.from(this.achievements.values());
  }

  getAchievement(achievementId: string): AchievementDefinition | undefined {
    return this.achievements.get(achievementId);
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    if (!this.userAchievements.has(userId)) {
      const userAchs: UserAchievement[] = [];
      const achs = Array.from(this.achievements.values());

      achs.forEach((ach, index) => {
        const unlocked = index < 2;
        const progress = unlocked ? 100 : Math.floor(Math.random() * 60);
        userAchs.push({
          achievementId: ach.id,
          progress: Math.floor((ach.conditions.wins as number) * (progress / 100)) || progress,
          total: (ach.conditions.wins as number) || 100,
          percentage: progress,
          unlocked,
          unlockedAt: unlocked ? Date.now() - Math.random() * 86400000 * 30 : undefined,
          currentStage: ach.stages ? Math.floor((progress / 100) * ach.stages.length) : undefined,
        });
      });

      this.userAchievements.set(userId, userAchs);
    }

    return this.userAchievements.get(userId) ?? [];
  }

  async unlockAchievement(
    userId: string,
    achievementId: string
  ): Promise<{ success: boolean; achievement?: UserAchievement }> {
    const userAchs = await this.getUserAchievements(userId);
    const ach = userAchs.find((a) => a.achievementId === achievementId);

    if (!ach) {
      return { success: false };
    }

    if (ach.unlocked) {
      return { success: false, achievement: ach };
    }

    ach.unlocked = true;
    ach.unlockedAt = Date.now();
    ach.progress = ach.total;
    ach.percentage = 100;

    globalEventBus.emit({
      type: 'multiplayer:achievementUnlocked',
      payload: { userId, achievementId },
    });
    return { success: true, achievement: ach };
  }

  async updateAchievementProgress(
    userId: string,
    achievementId: string,
    progress: number
  ): Promise<UserAchievement | null> {
    const userAchs = await this.getUserAchievements(userId);
    const ach = userAchs.find((a) => a.achievementId === achievementId);

    if (!ach) return null;
    if (ach.unlocked) return ach;

    ach.progress = Math.min(progress, ach.total);
    ach.percentage = Math.floor((ach.progress / ach.total) * 100);

    if (ach.progress >= ach.total) {
      ach.unlocked = true;
      ach.unlockedAt = Date.now();
      globalEventBus.emit({
        type: 'multiplayer:achievementUnlocked',
        payload: { userId, achievementId },
      });
    }

    return ach;
  }

  listGameModeTemplates(): GameModeTemplate[] {
    return Array.from(this.templates.values());
  }

  getGameModeTemplate(templateId: string): GameModeTemplate | undefined {
    return this.templates.get(templateId);
  }

  listGameModeCategories(): string[] {
    const categories = new Set(Array.from(this.templates.values()).map((t: GameModeTemplate) => t.category));
    return Array.from(categories) as string[];
  }
}

export const multiplayerService = new MultiplayerService();
