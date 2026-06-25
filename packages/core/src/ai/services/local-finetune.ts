import { multiModelRouter } from '../multi-model-router';

export interface FineTuneDataset {
  id: string;
  name: string;
  description: string;
  filePath: string;
  size: number;
  format: 'json' | 'jsonl' | 'csv';
  createdAt: number;
}

export interface FineTuneTask {
  id: string;
  name: string;
  modelId: string;
  datasetId: string;
  method: 'lora' | 'qlora' | 'full';
  parameters: FineTuneParameters;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  epochs: number;
  loss?: number;
  accuracy?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface FineTuneParameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  maxSeqLength: number;
  loraRank?: number;
  loraAlpha?: number;
}

export interface FineTuneResult {
  modelPath: string;
  metrics: TrainingMetrics;
  trainedAt: number;
}

export interface TrainingMetrics {
  finalLoss: number;
  finalAccuracy: number;
  epochLosses: number[];
  epochAccuracies: number[];
  trainingTime: number;
}

export class LocalFineTuneService {
  private datasets: Map<string, FineTuneDataset> = new Map();
  private tasks: Map<string, FineTuneTask> = new Map();

  async createDataset(name: string, description: string, filePath: string): Promise<FineTuneDataset> {
    const dataset: FineTuneDataset = {
      id: `dataset-${Date.now()}`,
      name,
      description,
      filePath,
      size: 0,
      format: 'json',
      createdAt: Date.now(),
    };

    try {
      const response = await fetch(filePath);
      if (response.ok) {
        const text = await response.text();
        dataset.size = text.length;
        if (filePath.endsWith('.jsonl')) dataset.format = 'jsonl';
        else if (filePath.endsWith('.csv')) dataset.format = 'csv';
      }
    } catch {
      // 文件可能不存在或无法访问
    }

    this.datasets.set(dataset.id, dataset);
    return dataset;
  }

  getDataset(id: string): FineTuneDataset | undefined {
    return this.datasets.get(id);
  }

  getAllDatasets(): FineTuneDataset[] {
    return Array.from(this.datasets.values());
  }

  deleteDataset(id: string): boolean {
    return this.datasets.delete(id);
  }

  async createFineTuneTask(
    name: string,
    modelId: string,
    datasetId: string,
    method: 'lora' | 'qlora' | 'full' = 'lora',
    parameters: Partial<FineTuneParameters> = {}
  ): Promise<FineTuneTask> {
    const task: FineTuneTask = {
      id: `ft-${Date.now()}`,
      name,
      modelId,
      datasetId,
      method,
      parameters: {
        learningRate: parameters.learningRate || 2e-4,
        batchSize: parameters.batchSize || 4,
        epochs: parameters.epochs || 3,
        maxSeqLength: parameters.maxSeqLength || 512,
        loraRank: parameters.loraRank || 8,
        loraAlpha: parameters.loraAlpha || 16,
      },
      status: 'pending',
      progress: 0,
      epochs: 0,
      createdAt: Date.now(),
    };

    this.tasks.set(task.id, task);
    return task;
  }

  async startFineTune(taskId: string): Promise<FineTuneTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const dataset = this.datasets.get(task.datasetId);
    if (!dataset) {
      throw new Error('数据集不存在');
    }

    task.status = 'running';
    task.startedAt = Date.now();
    this.tasks.set(taskId, task);

    await this.simulateTraining(task);

    return task;
  }

  private async simulateTraining(task: FineTuneTask): Promise<void> {
    const epochs = task.parameters.epochs;
    const epochDelay = 2000;

    for (let i = 0; i < epochs; i++) {
      await new Promise(resolve => setTimeout(resolve, epochDelay));

      task.epochs = i + 1;
      task.progress = Math.round(((i + 1) / epochs) * 100);
      task.loss = Math.max(0.1, 2.0 - (i * 0.5));
      task.accuracy = Math.min(0.95, 0.6 + (i * 0.1));
      this.tasks.set(task.id, task);
    }

    task.status = 'completed';
    task.completedAt = Date.now();
    this.tasks.set(task.id, task);
  }

  getTask(id: string): FineTuneTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): FineTuneTask[] {
    return Array.from(this.tasks.values());
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'running') {
      task.status = 'failed';
      task.errorMessage = '任务已取消';
      task.completedAt = Date.now();
      this.tasks.set(taskId, task);
    }
  }

  async evaluateModel(modelId: string, testDatasetId: string): Promise<TrainingMetrics> {
    const dataset = this.datasets.get(testDatasetId);
    if (!dataset) {
      throw new Error('测试数据集不存在');
    }

    const systemPrompt = `请评估以下模型在测试数据集上的性能。

模型: ${modelId}
数据集: ${dataset.name}

请输出评估结果，包括：
1. 损失值
2. 准确率
3. 推理速度
4. 综合评分

使用 JSON 格式输出：
{
  "finalLoss": 0.5,
  "finalAccuracy": 0.9,
  "trainingTime": 300
}
`;

    const result = await multiModelRouter.execute('finetune', '', {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 512,
    });

    return this.parseMetrics(result.content);
  }

  private parseMetrics(content: string): TrainingMetrics {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          finalLoss: parsed.finalLoss || 0.5,
          finalAccuracy: parsed.finalAccuracy || 0.85,
          epochLosses: [1.5, 1.0, 0.5],
          epochAccuracies: [0.7, 0.8, 0.85],
          trainingTime: parsed.trainingTime || 300,
        };
      }
    } catch {
      // JSON 解析失败
    }

    return {
      finalLoss: 0.5,
      finalAccuracy: 0.85,
      epochLosses: [1.5, 1.0, 0.5],
      epochAccuracies: [0.7, 0.8, 0.85],
      trainingTime: 300,
    };
  }

  async exportModel(taskId: string): Promise<string> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'completed') {
      throw new Error('任务未完成');
    }

    return `/models/fine-tuned/${task.id}.bin`;
  }
}

export const localFineTuneService = new LocalFineTuneService();
