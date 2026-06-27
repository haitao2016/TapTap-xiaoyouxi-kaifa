export { aiCompletionService, AICompletionService } from './ai-completion-service';
export type {
  AIProvider,
  CompletionTrigger,
  AIConfig,
  CompletionContext,
  CompletionRequest,
  CompletionItem,
  CompletionResult,
  LocalCompletionRule,
  SnippetCompletion,
} from './ai-completion-service';

export { localModelService, LOCAL_MODEL_EVENTS } from './local-model-service';
export { transformersBackend } from './transformers-backend';
export { electronLLMBackend } from './electron-llm-backend';

export { aiErrorDiagnosis, AIErrorDiagnosis } from './ai-error-diagnosis';
export type {
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  DiagnosisSuggestion,
  FixStep,
  FixPatch,
  ErrorReference,
  ErrorRule,
} from './ai-error-diagnosis';

export { aiCodeGenService, AICodeGenService } from './ai-codegen-service';
export type {
  CodeGenAction,
  CodeLanguage,
  CodeGenTemplate,
  CodeGenRequest,
  CodeLineDiff,
  CodeGenResult,
  CodeGenSuggestion,
} from './ai-codegen-service';

export { aiAssistantService, AIAssistantService } from './ai-assistant-service';
export type {
  ChatRole,
  ReferenceType,
  ChatStatus,
  Reference,
  ChatMessage,
  ToolCall,
  ChatSession,
  QuickAction,
  AIAssistantConfig,
} from './ai-assistant-service';

export {
  getRaindropClient,
  isRaindropEnabled,
  trackAIEvent,
  trackAIStreamStart,
  trackAIStreamComplete,
  trackAIReview,
  trackAIDocGen,
  trackAITutor,
  trackAIModelSwitch,
  flushRaindrop,
} from './raindrop-integration';
export type { RaindropConfig, AIInstrumentationOptions } from './raindrop-integration';
export { codeReviewService } from './code-review-service';
export type {
  IssueSeverity,
  ReviewIssue,
  ReviewReport,
  RefactorSuggestion,
} from './code-review-service';
