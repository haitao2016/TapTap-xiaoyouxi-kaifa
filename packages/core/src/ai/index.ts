export { aiCompletionService, AICompletionService } from './ai-completion-service';
export type { AIProvider, AIConfig, CompletionContext, CompletionRequest, CompletionResult } from './ai-completion-service';

export { aiErrorDiagnosis, AIErrorDiagnosis } from './ai-error-diagnosis';
export type { ErrorContext, DiagnosisSuggestion, FixStep } from './ai-error-diagnosis';

export { aiCodeGenService, AICodeGenService } from './ai-codegen-service';
export type { CodeGenAction, CodeGenRequest, CodeDiff, CodeGenResult } from './ai-codegen-service';

export { aiAssistantService, AIAssistantService } from './ai-assistant-service';
export type { ChatMessage, ChatRole, ChatSession, Reference } from './ai-assistant-service';
