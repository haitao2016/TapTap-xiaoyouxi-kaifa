/**
 * Electron LLM 主进程服务
 * 使用 node-llama-cpp 运行本地 GGUF 模型
 */

import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

// 类型定义
interface LLMConfig {
  modelPath: string;
  contextWindow?: number;
  gpu?: boolean;
  batchSize?: number;
}

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

let LlamaModel: any = null;
let model: any = null;
let isInitialized = false;

/**
 * 动态加载 node-llama-cpp
 */
async function loadLlamaCpp(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    // 尝试导入 node-llama-cpp
    const module = await import('node-llama-cpp');
    LlamaModel = module.LlamaModel;
    isInitialized = true;
    console.log('[LLM] node-llama-cpp 加载成功');
    return true;
  } catch (error) {
    console.error('[LLM] node-llama-cpp 加载失败:', error);
    return false;
  }
}

/**
 * 注册 LLM IPC 处理程序
 */
export function registerLLMIpcHandlers(): void {
  // 初始化 LLM
  ipcMain.handle('llm:initialize', async () => {
    try {
      const loaded = await loadLlamaCpp();
      return { success: loaded };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 加载模型
  ipcMain.handle('llm:loadModel', async (_e, config: LLMConfig) => {
    try {
      if (!isInitialized) {
        await loadLlamaCpp();
      }

      if (!LlamaModel) {
        throw new Error('LLM 引擎未初始化');
      }

      // 检查模型文件是否存在
      if (!fs.existsSync(config.modelPath)) {
        throw new Error(`模型文件不存在: ${config.modelPath}`);
      }

      // 创建模型
      const modelConfig = {
        path: config.modelPath,
        contextWindow: config.contextWindow || 4096,
        gpu: config.gpu ?? true,
        batchSize: config.batchSize || 512,
      };

      model = new LlamaModel(modelConfig);

      console.log('[LLM] 模型加载成功:', config.modelPath);
      return { success: true };
    } catch (error) {
      console.error('[LLM] 模型加载失败:', error);
      return { success: false, error: String(error) };
    }
  });

  // 推理（完整返回）
  ipcMain.handle('llm:complete', async (_e, options: { prompt: string } & CompletionOptions) => {
    try {
      if (!model) {
        throw new Error('模型未加载');
      }

      const startTime = Date.now();

      // 创建会话
      const session = model.createCompletionSession();

      // 执行推理
      const result = await session.prompt(options.prompt, {
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 256,
        stopSequence: options.stop || [],
        onToken: (tokens: any) => {
          // 可以在这里实现流式回调
        },
      });

      const endTime = Date.now();

      return {
        text: result.text || '',
        done: true,
        timing: {
          promptEvalTime: 0,
          evalTime: endTime - startTime,
          totalTime: endTime - startTime,
        },
      };
    } catch (error) {
      console.error('[LLM] 推理失败:', error);
      return { text: '', done: false };
    }
  });

  // 流式推理
  ipcMain.handle('llm:completeStream', async (e, options: { prompt: string } & CompletionOptions) => {
    try {
      if (!model) {
        throw new Error('模型未加载');
      }

      // 创建会话
      const session = model.createCompletionSession();

      // 流式推理
      const stream = await session.prompt(options.prompt, {
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 256,
        stopSequence: options.stop || [],
        stream: true,
      });

      // 使用事件发送每个 token
      for await (const chunk of stream) {
        e.sender.send('llm:streamChunk', { token: chunk.token || chunk });
      }

      e.sender.send('llm:streamEnd', { done: true });

      return { success: true };
    } catch (error) {
      console.error('[LLM] 流式推理失败:', error);
      e.sender.send('llm:streamError', { error: String(error) });
      return { success: false };
    }
  });

  // 获取模型信息
  ipcMain.handle('llm:getModelInfo', async () => {
    if (!model) {
      return null;
    }

    try {
      return {
        contextLength: model.contextWindow || 4096,
        loaded: true,
      };
    } catch {
      return null;
    }
  });

  // 卸载模型
  ipcMain.handle('llm:unloadModel', async () => {
    try {
      model = null;
      console.log('[LLM] 模型已卸载');
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 检查 LLM 状态
  ipcMain.handle('llm:status', () => {
    return {
      initialized: isInitialized,
      modelLoaded: model !== null,
    };
  });
}

/**
 * 清理 LLM 资源
 */
export function cleanupLLM(): void {
  if (model) {
    model = null;
  }
}
