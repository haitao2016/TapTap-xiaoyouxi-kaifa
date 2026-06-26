/**
 * Transformers.js WebAssembly 后端支持
 * 用于不支持 WebGPU 的浏览器环境
 */

import type {
  GGUFModelInfo,
  ModelLoadOptions,
  ModelLoadProgress,
  InferenceRequest,
  InferenceResult,
} from '@tapdev/types';

export class TransformersBackend {
  private pipeline: any = null;
  private modelInfo: GGUFModelInfo | null = null;

  /**
   * 检查 WASM/WASM SIMD 支持
   */
  async checkWASMSupport(): Promise<{
    supported: boolean;
    wasmSimd: boolean;
    threads: number;
  }> {
    try {
      // 动态导入检测
      const env = await import('@huggingface/transformers');

      return {
        supported: true,
        wasmSimd:
          typeof WebAssembly !== 'undefined' &&
          'SIMD' in (WebAssembly as any) &&
          typeof (WebAssembly as any).SIMD !== 'undefined',
        threads: navigator.hardwareConcurrency || 4,
      };
    } catch {
      return {
        supported: false,
        wasmSimd: false,
        threads: 1,
      };
    }
  }

  /**
   * 加载模型 (Transformers.js)
   */
  async loadModel(modelInfo: GGUFModelInfo, options?: ModelLoadOptions): Promise<boolean> {
    try {
      const { pipeline, env } = await import('@huggingface/transformers');

      // 配置 WASM 后端
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;
      }

      options?.onProgress?.({
        stage: 'loading',
        progress: 0,
        loaded: 0,
        total: modelInfo.size,
        message: '正在加载 Transformers.js...',
      });

      // 创建文本生成 pipeline
      this.pipeline = await pipeline('text-generation', modelInfo.modelUrl, {
        device: 'wasm', // 使用 WebAssembly 后端
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            const progressPercent = progress.progress || 0;
            options?.onProgress?.({
              stage: 'loading',
              progress: progressPercent,
              loaded: Math.floor(modelInfo.size * (progressPercent / 100)),
              total: modelInfo.size,
              message: `正在加载: ${progress.file || '模型'}`,
            });
          }
        },
      });

      this.modelInfo = modelInfo;
      return true;
    } catch (error) {
      options?.onError?.(error instanceof Error ? error : new Error('Transformers.js 加载失败'));
      return false;
    }
  }

  /**
   * 执行推理
   */
  async inference(request: InferenceRequest): Promise<InferenceResult> {
    if (!this.pipeline) {
      throw new Error('模型未加载');
    }

    try {
      const output = await this.pipeline(request.prompt, {
        max_new_tokens: request.maxTokens ?? 256,
        temperature: request.temperature ?? 0.7,
        do_sample: true,
        return_full_text: false,
      });

      const text = Array.isArray(output) ? output[0]?.generated_text : output?.generated_text || '';

      return {
        text: typeof text === 'string' ? text : JSON.stringify(text),
        finishReason: 'stop',
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
    if (!this.pipeline) {
      throw new Error('模型未加载');
    }

    // Transformers.js 支持流式输出
    const output = await this.pipeline(request.prompt, {
      max_new_tokens: request.maxTokens ?? 256,
      temperature: request.temperature ?? 0.7,
      do_sample: true,
      stream: true,
    });

    for await (const chunk of output) {
      yield chunk?.generated_text || '';
    }
  }

  /**
   * 释放资源
   */
  async unload(): Promise<void> {
    if (this.pipeline) {
      // Transformers.js pipeline 没有显式释放方法
      this.pipeline = null;
      this.modelInfo = null;
    }
  }

  /**
   * 获取已加载模型信息
   */
  getModelInfo(): GGUFModelInfo | null {
    return this.modelInfo;
  }
}

// 单例
export const transformersBackend = new TransformersBackend();
