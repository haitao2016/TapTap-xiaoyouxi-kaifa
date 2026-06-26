export { tapTapAuthService, TapTapAuthService } from './taptap-auth-service';
export type {
  TapTapAccount,
  TapTapLoginResult,
  OAuthSession,
  CachedProfile,
} from './taptap-auth-service';

export { publishService, PublishService } from './publish-service';
export type {
  PublishTask,
  PublishConfig,
  PublishStage,
  VersionRecord,
  UploadProgress,
} from './publish-service';

export { analyticsService, AnalyticsService } from './analytics-service';
export type {
  AnalyticsQuery,
  AnalyticsResult,
  DataPoint,
  MetricType,
  DimensionType,
  ChartData,
  RealtimeMetric,
} from './analytics-service';

export { sdkManagerService, SDKManagerService } from './sdk-manager-service';
export type {
  SDKRelease,
  SDKInstalled,
  SDKAnnouncement,
  SDKDownloadProgress,
  DependencyCheckResult,
  CompatReport,
} from './sdk-manager-service';

export { tapDBService, TapDBService } from './tapdb-service';
export type {
  TapDBMetricType,
  TapDBDimension,
  AnalysisType,
  TapDBQuery,
  TapDBFilter,
  TapDBDataPoint,
  TapDBResult,
  TapDBChartData,
  TapDBEvent,
  TapDBFunnelStep,
  TapDBFunnelResult,
  TapDBSegment,
  TapDBRealtimeData,
  TapDBExportTask,
} from './tapdb-service';

export { multiplayerService, MultiplayerService } from './multiplayer-service';
export type {
  RoomStatus,
  PlayerStatus,
  MatchStatus,
  MessageType,
  LeaderboardType,
  AchievementType,
  Player,
  RoomSettings,
  Room,
  RoomMessage,
  MatchRequest,
  MatchResult,
  LeaderboardConfig,
  LeaderboardEntry,
  AchievementDefinition,
  UserAchievement,
  GameModeTemplate,
} from './multiplayer-service';

export { abTestService, ABTestService } from './ab-test-service';
export type {
  ExperimentStatus,
  VariableType,
  ExperimentMetricType,
  MetricRole,
  ConfidenceLevel,
  ExperimentConclusion,
  ExperimentVariant,
  ExperimentVariable,
  ExperimentMetric,
  MetricData,
  VariantResult,
  ExperimentResult,
  Experiment,
  MutexGroup,
  BucketResult,
} from './ab-test-service';

export { communityService, CommunityService } from './community-service';
export type {
  CommentSort,
  CommentStatus,
  AnnouncementType,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackPriority,
  Comment,
  Announcement,
  Feedback,
  FAQ,
  CommunityStats,
} from './community-service';

export {
  achievementLeaderboardService,
  AchievementLeaderboardService,
} from './achievement-leaderboard-service';
export type {
  AchievementRarity,
  LeaderboardOrder,
  LeaderboardResetPeriod,
  RewardType,
  AchievementCondition,
  AchievementReward,
  Achievement,
  UserAchievementProgress,
  LeaderboardConfig as ALLeaderboardConfig,
  LeaderboardEntry as ALLeaderboardEntry,
  LeaderboardReward,
  PlayerRankInfo,
} from './achievement-leaderboard-service';
