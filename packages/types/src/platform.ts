// Platform Service types

import type { Platform } from './project';

/** 平台能力检测 */
export interface PlatformCapabilities {
  platform: Platform;
  hasFileSystem: boolean;
  hasNativeMenu: boolean;
  hasNotifications: boolean;
  hasDevTools: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio?: number;
  language?: string;
  isElectron?: boolean;
  isStandalone?: boolean;
}

// TapTap Auth types
export interface TapTapAccount {
  id: string;
  nickname: string;
  avatar: string;
  email?: string;
  openId: string;
  unionId?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string[];
  loginAt: number;
}

export interface TapTapLoginResult {
  success: boolean;
  account?: TapTapAccount;
  error?: string;
}

export interface OAuthSession {
  state: string;
  codeVerifier?: string;
  createdAt: number;
}

// Publish types
export interface PublishConfig {
  targetStore: 'taptap' | 'googleplay' | 'appstore' | 'standalone';
  gameId: string;
  version: string;
  buildPath: string;
  channel?: string;
  alpha?: boolean;
  beta?: boolean;
}

export interface PublishResult {
  success: boolean;
  buildId?: string;
  artifactUrl?: string;
  error?: string;
}

export interface BuildInfo {
  id: string;
  gameId: string;
  version: string;
  status: 'pending' | 'building' | 'success' | 'failed';
  progress: number;
  createdAt: number;
  completedAt?: number;
  artifactUrl?: string;
  error?: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Leaderboard {
  id: string;
  name: string;
  gameId: string;
  order: 'asc' | 'desc';
  updateStrategy: 'always' | 'higher' | 'lower';
  resetSchedule?: string;
  entries: LeaderboardEntry[];
}

export interface LeaderboardQuery {
  leaderboardId: string;
  offset?: number;
  limit?: number;
  timeframe?: 'all' | 'daily' | 'weekly' | 'monthly';
}

// Achievement types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  rarity: number;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export interface AchievementUnlock {
  achievementId: string;
  playerId: string;
  unlockedAt: number;
  notify: boolean;
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  playerId?: string;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  dateRange: { start: number; end: number };
  metrics: Record<string, number>;
  dimensions: Record<string, string[]>;
  generatedAt: number;
}

export interface RetentionCohort {
  date: string;
  cohortSize: number;
  retentionByDay: Record<number, number>;
}

// Multiplayer types
export interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  players: MultiplayerPlayer[];
  state: 'waiting' | 'starting' | 'playing' | 'finished';
  createdAt: number;
  config?: Record<string, unknown>;
}

export interface MultiplayerPlayer {
  id: string;
  name: string;
  avatar?: string;
  isReady: boolean;
  isHost: boolean;
  latency?: number;
}

// AB Test types
export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABVariant[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: number;
  endDate?: number;
  targetUserPercent: number;
}

export interface ABVariant {
  id: string;
  name: string;
  description?: string;
  weight: number;
  config: Record<string, unknown>;
}

export interface ABTestAssignment {
  testId: string;
  variantId: string;
  variantConfig: Record<string, unknown>;
}

// Community types
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  gameId?: string;
  type: 'discussion' | 'feedback' | 'announcement' | '攻略';
  tags?: string[];
  likes: number;
  comments: number;
  createdAt: number;
  updatedAt: number;
}

export interface CommunityComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  parentId?: string;
  likes: number;
  createdAt: number;
}

// SDK Manager types
export interface SDKConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'analytics' | 'ads' | 'auth' | 'push' | 'crash' | 'other';
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface SDKVersion {
  version: string;
  releaseDate: number;
  changelog: string;
  compatibility: string[];
  deprecated: boolean;
}
