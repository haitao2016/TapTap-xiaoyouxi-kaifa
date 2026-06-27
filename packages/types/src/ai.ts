// AI Provider types
export type AIProvider = 'openai' | 'claude' | 'ollama' | 'mock' | 'local';
export type CompletionTrigger = 'auto' | 'manual' | 'on-type';
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';
export type ReferenceType =
  | 'file'
  | 'function'
  | 'class'
  | 'symbol'
  | 'error'
  | 'snippet'
  | 'selection';
export type ChatStatus = 'idle' | 'thinking' | 'streaming' | 'error';
export type CodeLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'lua'
  | 'other';
export type ErrorSeverity = 'error' | 'warning' | 'info';
export type ErrorCategory = 'syntax' | 'runtime' | 'logic' | 'performance' | 'security' | 'type';

// AI Config
export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  autoTrigger?: boolean;
  triggerDelay?: number;
  maxContextLines?: number;
  enabledLanguages?: string[];
}

// Completion types
export interface CompletionContext {
  filePath: string;
  language: string;
  prefix: string;
  suffix: string;
  cursor: { line: number; column: number };
  projectTypes?: string[];
  selectedText?: string;
  imports?: string[];
  symbols?: string[];
}

export interface CompletionRequest {
  id: string;
  context: CompletionContext;
  multiline: boolean;
  trigger: CompletionTrigger;
}

export interface CompletionItem {
  id: string;
  text: string;
  displayText?: string;
  description?: string;
  type?: 'function' | 'variable' | 'class' | 'keyword' | 'snippet' | 'property' | 'method';
  confidence: number;
  detail?: string;
}

export interface CompletionResult {
  id: string;
  items: CompletionItem[];
  confidence: number;
  model: string;
  provider: AIProvider;
  latency: number;
  cached?: boolean;
}

export interface LocalCompletionRule {
  id: string;
  language: string;
  pattern: RegExp;
  generate: (match: RegExpMatchArray, context: CompletionContext) => CompletionItem[];
  priority: number;
}

export interface SnippetCompletion {
  id: string;
  label: string;
  description?: string;
  body: string;
  scope: string;
  prefix: string;
}

// Chat types
export interface Reference {
  id: string;
  type: ReferenceType;
  path: string;
  line?: number;
  endLine?: number;
  label: string;
  content?: string;
  language?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  references?: Reference[];
  timestamp: number;
  status?: ChatStatus;
  thinking?: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  prompt?: string;
  icon?: string;
  shortcut?: string;
}

export interface AIAssistantConfig {
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  contextWindow?: number;
  streaming?: boolean;
}

// Code Generation types
export interface CodeGenAction {
  type: 'create' | 'edit' | 'delete' | 'refactor';
  path: string;
  description: string;
  diff?: CodeDiff;
}

export interface CodeGenTemplate {
  id: string;
  name: string;
  description: string;
  language: CodeLanguage;
  code: string;
  variables?: Record<string, string>;
}

export interface CodeGenRequest {
  prompt: string;
  language: CodeLanguage;
  context?: {
    files?: string[];
    symbols?: string[];
    projectType?: string;
  };
  template?: CodeGenTemplate;
  stream?: boolean;
}

export interface CodeDiff {
  oldText: string;
  newText: string;
  startLine: number;
  endLine: number;
}

export interface CodeGenResult {
  success: boolean;
  actions: CodeGenAction[];
  message?: string;
  confidence?: number;
}

export interface CodeGenSuggestion {
  id: string;
  type: 'create' | 'edit' | 'refactor';
  filePath: string;
  description: string;
  code: string;
  confidence: number;
  reasoning?: string;
}

// Error Diagnosis types
export interface ErrorContext {
  filePath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  code: string;
  language: string;
  projectType?: string;
  stack?: string;
  framework?: string;
}

export interface DiagnosisSuggestion {
  type: 'fix' | 'ignore' | 'learn';
  title: string;
  description: string;
  fixes?: FixStep[];
  confidence: number;
  documentation?: string[];
}

export interface FixStep {
  order: number;
  description: string;
  code?: string;
  file?: string;
  line?: number;
}

export interface FixPatch {
  file: string;
  startLine: number;
  endLine: number;
  newCode: string;
  oldCode: string;
}

export interface ErrorReference {
  error: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  documentation: string[];
  similarErrors: string[];
}

export interface ErrorRule {
  pattern: RegExp;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  documentation: string[];
  fixSuggestion?: string;
}

// Agent types
export interface AgentTask {
  id: string;
  type: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority?: number;
  createdAt: number;
  updatedAt: number;
  result?: unknown;
  error?: string;
}

export interface AgentThought {
  thought: string;
  action: string;
  observation: string;
  reflection?: string;
}

export interface AgentPlan {
  steps: AgentThought[];
  currentStep: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}
