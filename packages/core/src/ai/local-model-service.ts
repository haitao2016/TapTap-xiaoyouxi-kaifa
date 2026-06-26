/**
 * Local GGUF Model Service - 统一接口
 * 支持 WebLLM (WebGPU)、Transformers.js (WASM)、Ollama API
 */

import { globalEventBus } from '../event-bus';
import type {
  GGUFModelInfo,
  GGUFProvider,
  LocalModelConfig,
  ModelLoadOptions,
  ModelLoadProgress,
  InferenceRequest,
  InferenceResult,
  ModelStatus,
  RecommendedModel,
} from '@tapdev/types';

declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(): Promise<any>;
    };
  }

  var GPU: any;
}

export const LOCAL_MODEL_EVENTS = {
  MODEL_STATUS_CHANGED: 'localModel:statusChanged',
  LOAD_PROGRESS: 'localModel:loadProgress',
  INFERENCE_COMPLETE: 'localModel:inferenceComplete',
  ERROR: 'localModel:error',
} as const;

// 推荐模型列表
const RECOMMENDED_MODELS: RecommendedModel[] = [
  // 代码补全模型
  {
    id: 'qwen2.5-coder-7b-q4',
    name: 'Qwen2.5-Coder-7B (Q4)',
    provider: 'webllm',
    modelUrl:
      'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    description: '阿里巴巴开源的强大代码模型，支持代码补全、生成、解释',
    size: '~4.4GB',
    quantization: 'Q4_K_M',
    minVRAM: '6GB',
    recommendedFor: ['代码补全', '代码生成', '代码解释'],
  },
  {
    id: 'codellama-13b-q4',
    name: 'CodeLlama-13B (Q4)',
    provider: 'webllm',
    modelUrl:
      'https://huggingface.co/TheBloke/CodeLlama-13B-Instruct-GGUF/resolve/main/codellama-13b-instruct.Q4_K_M.gguf',
    description: 'Meta 开源的代码专用模型，擅长代码补全和修复',
    size: '~7.5GB',
    quantization: 'Q4_K_M',
    minVRAM: '8GB',
    recommendedFor: ['代码补全', '代码修复', '代码解释'],
  },
  {
    id: 'deepseek-coder-6.7b-q4',
    name: 'DeepSeek-Coder-6.7B (Q4)',
    provider: 'webllm',
    modelUrl:
      'https://huggingface.co/DeepSeek/DeepSeek-Coder-V2-Lite-Instruct-GGUF/resolve/main/deepseek-coder-6.7b-instruct-q4_k_m.gguf',
    description: '深度求索开源的代码模型，性能优异',
    size: '~4.1GB',
    quantization: 'Q4_K_M',
    minVRAM: '6GB',
    recommendedFor: ['代码补全', '函数生成', '代码优化'],
  },
  // 通用对话模型
  {
    id: 'qwen2.5-7b-q4',
    name: 'Qwen2.5-7B (Q4)',
    provider: 'webllm',
    modelUrl:
      'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf',
    description: '通用对话模型，支持问答、创作、分析',
    size: '~4.4GB',
    quantization: 'Q4_K_M',
    minVRAM: '6GB',
    recommendedFor: ['对话', '问答', '内容创作'],
  },
  {
    id: 'phi-3-mini-q4',
    name: 'Phi-3-Mini (Q4)',
    provider: 'webllm',
    modelUrl:
      'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-GGUF/resolve/main/phi-3-mini-4k-instruct-q4_k_m.gguf',
    description: '微软 Phi-3 小型模型，体积小但能力强劲',
    size: '~2.7GB',
    quantization: 'Q4_K_M',
    minVRAM: '4GB',
    recommendedFor: ['轻量级任务', '快速响应', '边缘部署'],
  },
];

class LocalModelService {
  private models: Map<string, GGUFModelInfo> = new Map();
  private currentModel: GGUFModelInfo | null = null;
  private webllmEngine: any = null;
  private isLoading = false;

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * 初始化默认模型列表
   */
  private initializeDefaultModels(): void {
    RECOMMENDED_MODELS.forEach((model) => {
      this.models.set(model.id, {
        id: model.id,
        name: model.name,
        provider: model.provider,
        source: 'huggingface',
        modelUrl: model.modelUrl,
        size: this.parseSizeToBytes(model.size),
        quantization: model.quantization,
        contextLength: 8192,
        capabilities: {
          completion: true,
          chat: true,
          streaming: true,
          tools: false,
          vision: false,
        },
        recommendedFor: model.recommendedFor,
        status: 'idle',
      });
    });
  }

  /**
   * 解析大小字符串到字节
   */
  private parseSizeToBytes(size: string): number {
    const match = size.match(/([\d.]+)(GB|MB)/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    return unit === 'GB' ? value * 1024 * 1024 * 1024 : value * 1024 * 1024;
  }

  /**
   * 获取所有可用模型
   */
  getModels(): GGUFModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取推荐模型
   */
  getRecommendedModels(): RecommendedModel[] {
    return RECOMMENDED_MODELS;
  }

  /**
   * 获取当前加载的模型
   */
  getCurrentModel(): GGUFModelInfo | null {
    return this.currentModel;
  }

  /**
   * 检查 WebGPU 是否可用
   */
  async checkWebGPUAvailability(): Promise<{
    available: boolean;
    tier: 'perfect' | 'good' | 'fallback' | 'unsupported';
    adapter?: string;
  }> {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      return { available: false, tier: 'unsupported' };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { available: false, tier: 'unsupported' };
      }

      const info = await adapter.requestAdapterInfo();
      const supportsChrome = typeof GPU !== 'undefined' && 'requestAdapterInfo' in GPU;

      // 评估 GPU 能力
      let tier: 'perfect' | 'good' | 'fallback' | 'unsupported' = 'good';

      // NVIDIA GPU 通常性能最好
      if (info.vendor.includes('NVIDIA')) {
        tier = 'perfect';
      } else if (info.vendor.includes('AMD') || info.vendor.includes('Intel')) {
        tier = 'good';
      } else {
        tier = 'fallback';
      }

      return { available: true, tier, adapter: info.description };
    } catch {
      return { available: false, tier: 'unsupported' };
    }
  }

  /**
   * 加载模型 (使用 WebLLM)
   */
  async loadModel(modelId: string, options?: ModelLoadOptions): Promise<boolean> {
    if (this.isLoading) {
      throw new Error('模型正在加载中，请稍候');
    }

    const modelInfo = this.models.get(modelId);
    if (!modelInfo) {
      throw new Error(`未找到模型: ${modelId}`);
    }

    this.isLoading = true;
    this.updateModelStatus(modelId, 'downloading');

    try {
      // 动态导入 WebLLM
      const { MLCEngine } = await import('@mlc-ai/web-llm');

      options?.onProgress?.({
        stage: 'downloading',
        progress: 0,
        loaded: 0,
        total: modelInfo.size,
        message: '正在初始化 WebLLM...',
      });

      // 创建引擎
      const engine = new MLCEngine();
      engine.setInitProgressCallback((progress: any) => {
        const status = progress.stage === 'ready' ? 'ready' : 'downloading';
        this.updateModelStatus(modelId, status);
        options?.onProgress?.({
          stage: status as any,
          progress: progress.progress || 0,
          loaded: Math.floor(modelInfo.size * ((progress.progress || 0) / 100)),
          total: modelInfo.size,
          message: progress.text || '',
        });

        globalEventBus.emit({
          type: LOCAL_MODEL_EVENTS.LOAD_PROGRESS,
          payload: { modelId, progress },
        });
      });

      this.webllmEngine = engine;

      // 加载模型
      await engine.reload(modelInfo.modelUrl);

      this.currentModel = modelInfo;
      this.updateModelStatus(modelId, 'ready');

      globalEventBus.emit({
        type: LOCAL_MODEL_EVENTS.MODEL_STATUS_CHANGED,
        payload: { modelId, status: 'ready' },
      });

      options?.onComplete?.(this.webllmEngine);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载失败';
      this.updateModelStatus(modelId, 'error', errorMessage);
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 卸载当前模型
   */
  async unloadModel(): Promise<void> {
    if (this.currentModel) {
      const modelId = this.currentModel.id;
      this.updateModelStatus(modelId, 'unloading');

      if (this.webllmEngine) {
        // WebLLM 没有直接的 unload 方法，可以通过重新创建引擎来释放
        this.webllmEngine = null;
      }

      this.currentModel = null;
      this.updateModelStatus(modelId, 'idle');

      globalEventBus.emit({
        type: LOCAL_MODEL_EVENTS.MODEL_STATUS_CHANGED,
        payload: { modelId, status: 'idle' },
      });
    }
  }

  /**
   * 执行推理
   */
  async inference(request: InferenceRequest): Promise<InferenceResult> {
    if (!this.webllmEngine) {
      throw new Error('模型未加载');
    }

    try {
      const response = await this.webllmEngine.completions.create({
        model: this.currentModel?.modelUrl || '',
        prompt: request.prompt,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 256,
        stream: false,
      });

      return {
        text: response.choices?.[0]?.text || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: response.choices?.[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      return {
        text: '',
        finishReason: 'error',
      };
    }
  }

  /**
   * 流式推理
   */
  async *streamInference(request: InferenceRequest): AsyncGenerator<string> {
    if (!this.webllmEngine) {
      throw new Error('模型未加载');
    }

    const stream = await this.webllmEngine.completions.create({
      model: this.currentModel?.modelUrl || '',
      prompt: request.prompt,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 256,
      stream: true,
    });

    for await (const chunk of stream as any) {
      yield chunk.choices?.[0]?.text || '';
    }
  }

  /**
   * 加载本地 GGUF 文件
   */
  async loadLocalFile(file: File): Promise<GGUFModelInfo> {
    const modelId = `local-${Date.now()}`;
    const modelInfo: GGUFModelInfo = {
      id: modelId,
      name: file.name.replace('.gguf', ''),
      provider: 'webllm',
      source: 'local',
      modelUrl: URL.createObjectURL(file),
      size: file.size,
      quantization: 'unknown',
      contextLength: 4096,
      capabilities: {
        completion: true,
        chat: true,
        streaming: true,
        tools: false,
        vision: false,
      },
      recommendedFor: ['本地文件'],
      status: 'idle',
    };

    this.models.set(modelId, modelInfo);
    return modelInfo;
  }

  /**
   * 更新模型状态
   */
  private updateModelStatus(modelId: string, status: ModelStatus, error?: string): void {
    const model = this.models.get(modelId);
    if (model) {
      model.status = status;
      if (error) {
        model.error = error;
      }
    }
  }

  /**
   * 检查模型是否已加载
   */
  isModelLoaded(): boolean {
    return this.currentModel !== null && this.currentModel.status === 'ready';
  }

  /**
   * 获取模型加载进度
   */
  getLoadProgress(modelId: string): ModelLoadProgress | null {
    const model = this.models.get(modelId);
    if (!model || !model.progress) return null;

    return {
      stage: model.status === 'ready' ? 'ready' : 'downloading',
      progress: model.progress,
      loaded: Math.floor(model.size * (model.progress / 100)),
      total: model.size,
    };
  }
}

// 单例导出
export const localModelService = new LocalModelService();
