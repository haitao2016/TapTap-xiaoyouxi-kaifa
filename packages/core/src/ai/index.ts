export { aiCompletionService, AICompletionService } from './ai-completion-service';
export type { AIProvider, AIConfig, CompletionContext, CompletionRequest, CompletionResult } from './ai-completion-service';

export { aiErrorDiagnosis, AIErrorDiagnosis } from './ai-error-diagnosis';
export type { ErrorContext, DiagnosisSuggestion, FixStep } from './ai-error-diagnosis';

export { aiCodeGenService, AICodeGenService } from './ai-codegen-service';
export type { CodeGenAction, CodeGenRequest, CodeDiff, CodeGenResult } from './ai-codegen-service';

export { aiAssistantService, AIAssistantService } from './ai-assistant-service';
export type { ChatMessage, ChatRole, ChatSession, Reference } from './ai-assistant-service';

export { AIProviderBase } from './ai-provider-base';
export type { AICallOptions } from './ai-provider-base';

export { MultiModelRouter, multiModelRouter } from './multi-model-router';
export type {
  TaskType,
  ModelInstance,
  RoutingRule,
  ModelResponse,
  AggregatedResult,
  OllamaInstance,
  HybridMode,
  HybridCallStatus,
} from './multi-model-router';

export { aiReviewService, AIReviewService } from './services/ai-review-service';
export type { ReviewIssue, ReviewResult, ReviewRequest } from './services/ai-review-service';

export { aiDocGeneratorService, AIDocGeneratorService } from './services/ai-doc-generator';
export type { DocGenerationRequest, DocGenerationResult } from './services/ai-doc-generator';

export { aiTutorService, AITutorService } from './services/ai-tutor-service';
export type { TutorLesson, TutorSession, TutorResponse } from './services/ai-tutor-service';

export { teamKnowledgeBase, TeamKnowledgeBase } from './services/team-knowledge-base';
export type { KnowledgeEntry, SharedSession, TeamCodeStandard, KnowledgeSearchResult } from './services/team-knowledge-base';

export { localFineTuneService, LocalFineTuneService } from './services/local-finetune';
export type { FineTuneDataset, FineTuneTask, FineTuneParameters, FineTuneResult } from './services/local-finetune';

export { pluginMarketplace, PluginMarketplace } from './services/plugin-marketplace';
export type { AIPlugin, PluginInstallation, AIWorkflow, WorkflowStep } from './services/plugin-marketplace';
