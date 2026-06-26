/**
 * Local GGUF Model Support Types
 * 支持 WebLLM (WebGPU)、Transformers.js (WASM)、node-llama (Electron)
 */

// 模型运行时类型
export type ModelRuntime = 'webgpu' | 'wasm' | 'native';
export type ModelSource = 'huggingface' | 'local' | 'mlc';

// 模型状态
export type ModelStatus = 'idle' | 'downloading' | 'downloaded' | 'loading' | 'ready' | 'error' | 'unloading';

// 模型提供商
export type GGUFProvider = 'webllm' | 'transformers' | 'nollama';

// 模型能力
export interface ModelCapabilities {
  completion: boolean;
  chat: boolean;
  streaming: boolean;
  tools: boolean;
  vision: boolean;
}

// 模型信息
export interface GGUFModelInfo {
  id: string;
  name: string;
  provider: GGUFProvider;
  source: ModelSource;
  modelUrl: string;
  size: number; // bytes
  quantization: string; // Q4_K_M, Q5_K_S, etc.
  contextLength: number;
  capabilities: ModelCapabilities;
  recommendedFor: string[];
  status: ModelStatus;
  progress?: number; // 0-100
  error?: string;
}

// WebLLM 特定配置
export interface WebLLMConfig {
  appConfig?: any;
  gpuSettings?: {
    debugLabel?: string;
    injectDebugUtils?: boolean;
  };
}

// Transformers.js 特定配置
export interface TransformersConfig {
  progressCallback?: (progress: any) => void;
  wasmSettings?: {
    numThreads?: number;
  };
}

// node-llama 特定配置 (Electron)
export interface NodeLlamaConfig {
  contextWindowSize?: number;
  gpu?: boolean;
  batchSize?: number;
}

// 统一配置
export interface LocalModelConfig {
  provider: GGUFProvider;
  modelId: string;
  modelUrl: string;
  quantization?: string;
  runtimeConfig?: WebLLMConfig | TransformersConfig | NodeLlamaConfig;
  maxContext?: number;
  temperature?: number;
  maxTokens?: number;
}

// 模型加载选项
export interface ModelLoadOptions {
  onProgress?: (progress: ModelLoadProgress) => void;
  onComplete?: (model: any) => void;
  onError?: (error: Error) => void;
  abortSignal?: AbortSignal;
}

// 加载进度
export interface ModelLoadProgress {
  stage: 'downloading' | 'verifying' | 'loading' | 'ready';
  progress: number; // 0-100
  loaded: number; // bytes
  total: number; // bytes
  message?: string;
}

// 推理请求
export interface InferenceRequest {
  prompt: string;
  modelId: string;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  options?: Record<string, any>;
}

// 推理结果
export interface InferenceResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}

// 推荐的 GGUF 模型列表
export interface RecommendedModel {
  id: string;
  name: string;
  provider: GGUFProvider;
  modelUrl: string;
  description: string;
  size: string;
  quantization: string;
  minVRAM?: string; // 最低显存要求
  recommendedFor: string[];
}
