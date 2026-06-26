/**
 * Node-Llama Electron 主进程后端
 * 在 Electron 主进程中运行本地 GGUF 模型
 */

export interface ElectronLLMConfig {
  modelPath: string;
  contextWindow?: number;
  gpu?: boolean;
  batchSize?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface ElectronLLMResponse {
  text: string;
  done: boolean;
  timing?: {
    promptEvalTime: number;
    evalTime: number;
    totalTime: number;
  };
}

class ElectronLLMBackend {
  private llamaCpp: any = null;
  private model: any = null;
  private isLoaded = false;

  /**
   * 检查是否在 Electron 环境中
   */
  isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).electron !== 'undefined';
  }

  /**
   * 初始化 llama.cpp 绑定
   */
  async initialize(): Promise<boolean> {
    if (!this.isElectronEnvironment()) {
      console.warn('ElectronLLMBackend: 不在 Electron 环境中');
      return false;
    }

    try {
      const electron = (window as any).electron;

      // 通过 IPC 调用主进程加载 llama.cpp
      await electron.invoke('llm:initialize');
      return true;
    } catch (error) {
      console.error('ElectronLLMBackend 初始化失败:', error);
      return false;
    }
  }

  /**
   * 加载模型
   */
  async loadModel(config: ElectronLLMConfig): Promise<boolean> {
    if (!this.isElectronEnvironment()) {
      throw new Error('Electron 环境不可用');
    }

    try {
      const electron = (window as any).electron;

      // 发送加载模型请求到主进程
      const result = await electron.invoke('llm:loadModel', {
        modelPath: config.modelPath,
        contextWindow: config.contextWindow || 4096,
        gpu: config.gpu ?? true,
        batchSize: config.batchSize || 512,
      });

      if (result.success) {
        this.isLoaded = true;
        return true;
      } else {
        throw new Error(result.error || '模型加载失败');
      }
    } catch (error) {
      console.error('加载模型失败:', error);
      return false;
    }
  }

  /**
   * 执行推理
   */
  async inference(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
    }
  ): Promise<ElectronLLMResponse> {
    if (!this.isLoaded || !this.isElectronEnvironment()) {
      throw new Error('模型未加载');
    }

    try {
      const electron = (window as any).electron;

      const result = await electron.invoke('llm:complete', {
        prompt,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 256,
        stop: options?.stop || [],
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 流式推理
   */
  async *streamInference(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
    }
  ): AsyncGenerator<string> {
    if (!this.isLoaded || !this.isElectronEnvironment()) {
      throw new Error('模型未加载');
    }

    const electron = (window as any).electron;

    // 使用 Electron 的流式 API
    const stream = await electron.invoke('llm:completeStream', {
      prompt,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 256,
      stop: options?.stop || [],
    });

    // 遍历流式响应
    for await (const chunk of stream) {
      yield chunk.token || '';
    }
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(): Promise<any> {
    if (!this.isLoaded || !this.isElectronEnvironment()) {
      return null;
    }

    try {
      const electron = (window as any).electron;
      return await electron.invoke('llm:getModelInfo');
    } catch {
      return null;
    }
  }

  /**
   * 卸载模型
   */
  async unloadModel(): Promise<void> {
    if (!this.isElectronEnvironment()) return;

    try {
      const electron = (window as any).electron;
      await electron.invoke('llm:unloadModel');
      this.isLoaded = false;
    } catch (error) {
      console.error('卸载模型失败:', error);
    }
  }

  /**
   * 检查模型是否已加载
   */
  isModelLoaded(): boolean {
    return this.isLoaded;
  }
}

// 单例
export const electronLLMBackend = new ElectronLLMBackend();
