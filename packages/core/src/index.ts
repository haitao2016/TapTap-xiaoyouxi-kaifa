export { EventBus, globalEventBus } from './event-bus';
export { ProjectManager, projectManager } from './project-manager';
export { DebugService, debugService, setNativeBridge, getNativeBridge } from './debug-service';
export type { StartDebugOptions, NativeBridge } from './debug-service';
export { DebugWebSocketClient, debugWebSocketClient } from './debug-client';
export { MonitorService, monitorService } from './monitor-service';
export { BuildService, buildService } from './build-service';
export { DocService, docService } from './doc-service';
export { PluginManager, pluginManager } from './plugin-manager';
export type {
  PluginPermission,
  PluginPermissions,
  PluginDependency,
  PluginLoadOptions,
} from './plugin-manager';
export { PlatformService, platformService } from './platform-service';
export { SnippetService, snippetService } from './snippet-service';
export { FormatService, formatService } from './format-service';
export { WatchService, watchService } from './watch-service';
export { CallStackService, callStackService } from './callstack-service';
export type { StackFrame, CallStack } from './callstack-service';
export { ThemeService, themeService } from './theme-service';
export type { Theme, ThemeType, ThemeColors } from './theme-service';
export { PluginMarketService, pluginMarketService } from './plugin-market-service';
export type {
  Plugin,
  PluginManifest,
  PluginInstallation,
  PluginSearchOptions,
  PluginVersion,
  PluginSearchResult,
  PluginCategory,
  InstallOptions,
  UpdateInfo,
} from './plugin-market-service';
export { PluginSandboxService, pluginSandboxService } from './plugin-sandbox-service';
export type { PluginSandboxOptions, PluginRuntime } from './plugin-sandbox-service';
export { PluginSandbox, pluginSandbox } from './plugin-sandbox';
export type {
  SandboxType,
  SandboxPermissions,
  SandboxOptions,
  SandboxMessage,
  SandboxRuntime,
  SandboxAPIMethod,
} from './plugin-sandbox';
export { TemplateService, templateService } from './template-service';
export type {
  ProjectTemplate,
  TemplateCategory,
  TemplateSearchOptions,
  TemplateSearchResult,
  VirtualFile,
  CreateProjectOptions,
  CreatedProject,
} from './template-service';
export { ResponsiveService, responsiveService } from './responsive-service';
export type { DeviceType, Breakpoints, ViewportInfo } from './responsive-service';
export { ShortcutService, shortcutService } from './shortcut-service';
export type { Shortcut, KeyboardEventData } from './shortcut-service';
export { CommandPaletteService, commandPaletteService } from './command-palette-service';
export type { Command, CommandMatch } from './command-palette-service';
export { AnimationService, animationService } from './animation-service';
export type { AnimationConfig, AnimationKeyframes } from './animation-service';
export { LazyLoadService, lazyLoadService } from './lazy-load-service';
export type { LazyLoadOptions, ModuleLoadResult } from './lazy-load-service';
export { VirtualListService, virtualListService } from './virtual-list-service';
export type { VirtualListOptions, VirtualListItem } from './virtual-list-service';
export { WebWorkerService, webWorkerService } from './web-worker-service';
export type { WorkerMessage, WorkerTask } from './web-worker-service';
export { OfficialPluginsService, officialPluginsService } from './official-plugins-service';
export type { OfficialPlugin } from './official-plugins-service';
export { CloudSyncService, cloudSyncService } from './cloud-sync-service';
export type { SyncConfig, SyncItem, SyncConflict } from './cloud-sync-service';
export { TeamService, teamService } from './team-service';
export type { TeamMember, Team, Permission, ProjectPermission } from './team-service';
export { TemplateMarketService, templateMarketService } from './template-market-service';
export type { TemplateRating, TemplateDownload } from './template-market-service';
export { PWAService, pwaService } from './pwa-service';
export type { PWAConfig, PWAIcon, InstallPromptEvent } from './pwa-service';
export { CLIService, cliService } from './cli-service';
export type { CLICommand, CLIArgument, CLIOption } from './cli-service';

// Phase 15 - 资产与生态
export { AssetStoreService, assetStoreService } from './asset-store-service';
export type {
  Asset,
  AssetCategory,
  AssetPriceType,
  AssetFile,
  AssetDependency,
  AssetVersion,
  AssetReview,
  AssetCategoryInfo,
  AssetSearchOptions,
  AssetSearchResult,
  AssetInstallation,
  InstallAssetOptions,
  AssetAuthor,
} from './asset-store-service';

export { ResourceShareService, resourceShareService } from './resource-share-service';
export type {
  Resource,
  ResourceCategory,
  ResourceStatus,
  ResourceFile,
  ResourceUploadData,
  ResourceReview,
  FavoriteCollection,
  DownloadRecord,
  PointsRecord,
  UserPoints,
  Report,
  ReportStatus,
  ReportType,
  ResourceSearchOptions,
  ResourceSearchResult,
} from './resource-share-service';

export { GameTemplatesService, gameTemplatesService } from './game-templates-service';
export type {
  GameTemplate,
  GameTemplateType,
  DifficultyLevel,
  TemplateFileNode,
  GameFeature,
  GameConfigParam,
  GameSkin,
  LevelInfo,
  CreateTemplateProjectOptions,
  CreatedTemplateProject,
  GameTemplateSearchOptions,
  GameTemplateSearchResult,
} from './game-templates-service';

export {
  DeveloperIncentivesService,
  developerIncentivesService,
} from './developer-incentives-service';
export type {
  ContributionType,
  PointsReason,
  DeveloperPointsRecord,
  DeveloperLevel,
  DeveloperProfile,
  DeveloperBadge,
  Contribution,
  FeaturedItem,
  DeveloperCertification,
  IncentiveProgram,
  IncentiveReward,
  RankEntry,
  RankType,
  Activity,
  LeaderboardPeriod,
} from './developer-incentives-service';

// Phase 13: 低代码与 AI 创意工具
export { VisualLogicService, visualLogicService } from './visual-logic-service';
export type {
  PortType,
  NodeCategory,
  VariableType,
  VariableScope,
  Port,
  NodePosition,
  LogicNode,
  Connection,
  Variable,
  LogicGraph,
  LogicValidationWarning,
  CodeGenerationOptions,
  NodeTypeDefinition,
} from './visual-logic-service';

export { BehaviorTreeService, behaviorTreeService } from './behavior-tree-service';
export type {
  NodeStatus,
  NodeCategory as BTNodeCategory,
  BehaviorTreeNode,
  BlackboardEntry,
  BehaviorTree,
  BehaviorTreeRuntime,
  NodeTypeDefinition as BTNodeTypeDefinition,
  BehaviorTreeTemplate,
} from './behavior-tree-service';

export { AIGameDesignService, aiGameDesignService } from './ai-game-design-service';
export type {
  GameGenre,
  GameConcept,
  LevelDesign,
  EnemyConfig,
  BossConfig,
  DifficultyCurve,
  StoryContent,
  Character as GameCharacter,
  DialogueLine,
  Quest,
  Ending,
  CharacterStats,
  Skill,
  EconomyBalance,
  EquipmentItem,
  DesignDocument,
  DocumentSection,
  RevisionEntry,
  DesignIteration,
} from './ai-game-design-service';

export { DialogueEditorService, dialogueEditorService } from './dialogue-editor-service';
export type {
  DialogueNodeType,
  DialogueConditionType,
  ChoiceEffectType,
  DialogueCharacter,
  DialogueChoice,
  DialogueCondition,
  ChoiceEffect,
  DialogueVariable,
  DialogueNode,
  DialogueTree,
  DialogueRuntime,
  DialoguePreviewState,
} from './dialogue-editor-service';

// Phase 11 - 资源与调试增强
export { AssetManagerService, assetManagerService } from './asset-manager-service';
export type {
  AssetType,
  ImageFormat,
  AudioFormat,
  FontFormat,
  VideoFormat,
  AssetMetadata,
  AssetItem,
  AssetFilter,
  CompressionOptions,
  CompressionResult,
  ConversionResult,
  SpritesheetFrame,
  SpritesheetData,
} from './asset-manager-service';

export { DeviceDebugService, deviceDebugService } from './device-debug-service';
export type {
  DevicePlatform,
  DeviceStatus,
  DeviceInfo,
  DeviceLogFilter,
  DeviceScreenshot,
  QRCodeConnection,
  HotPushOptions,
  HotPushResult,
} from './device-debug-service';

export { ProfilerService, profilerService } from './profiler-service';
export type {
  ProfilerType,
  AlertSeverity,
  CPUProfileFrame,
  CPUProfile,
  FlameGraphNode,
  MemorySnapshot,
  MemoryObject,
  MemoryLeakCandidate,
  FrameTimeSample,
  FPSAnalysis,
  FrameTimeDistribution,
  NetworkRequest,
  WaterfallPhase,
  NetworkAnalysis,
  GPUProfile,
  RenderPass,
  AlertRule,
  ProfilingSession,
} from './profiler-service';

export { HotReloadService, hotReloadService } from './hot-reload-service';
export type {
  ConnectionStatus,
  HotReloadClient,
  FileChange,
  PatchInfo,
  UpdateProgress,
  HotReloadConfig,
  HeartbeatInfo,
} from './hot-reload-service';

// v0.3.0+ 新增模块
export * from './engines';
export * from './ai';
export * from './collab';
export * from './platform';
export * from './perf';

// Phase 12 - 游戏开发工具
export { DataEditorService, dataEditorService } from './data-editor-service';
export type {
  DataFieldType,
  DataField,
  DataRow,
  DataTable,
  DataTemplate,
  ValidationError,
  DiffChange,
  DataDiff,
  SearchOptions,
  SearchResult,
  ImportOptions,
  ExportOptions,
} from './data-editor-service';

export { SceneEditorService, sceneEditorService } from './scene-editor-service';
export type {
  SceneObjectType,
  Vector2,
  Vector3,
  Color,
  SceneComponent,
  SceneObject,
  SceneLayer,
  Scene,
  GridSettings,
  SelectionSet,
  AlignOptions,
  SceneExportOptions,
} from './scene-editor-service';

export { SpriteAtlasService, spriteAtlasService } from './sprite-atlas-service';
export type {
  SpriteRect,
  SpriteFrame,
  SpriteMeta,
  SpriteAtlasData,
  SpriteItem,
  AtlasPackingOptions,
  AtlasInfo,
  ExportFormat,
  ExportOptions as AtlasExportOptions,
  AtlasCompressionOptions,
} from './sprite-atlas-service';

export { ParticleEditorService, particleEditorService } from './particle-editor-service';
export type {
  EmitterMode,
  ParticleBlendMode,
  ColorKey,
  ValueKey,
  ColorGradient,
  ValueCurve,
  EmitterConfig,
  ParticleLifeConfig,
  ParticleSizeConfig,
  ParticleColorConfig,
  ParticleRotationConfig,
  ParticleShapeConfig,
  ParticleSystemData,
  ParticlePreset,
  ParticleInstance,
} from './particle-editor-service';

// 官方插件
export * from './plugins';
