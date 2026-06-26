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

export { codeReviewService } from './code-review-service';
export type {
  IssueSeverity,
  ReviewIssue,
  ReviewReport,
  RefactorSuggestion,
} from './code-review-service';
