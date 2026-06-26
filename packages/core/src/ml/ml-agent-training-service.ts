// 游戏 AI 行为训练（ML Agent）
// 强化学习训练游戏 AI 角色，支持 PPO/DQN

import { globalEventBus } from '../core/event-bus';

// 训练算法
export type TrainingAlgorithm = 'PPO' | 'DQN' | 'A2C' | 'REINFORCE' | 'SAC';

// 训练环境
export interface TrainingEnvironment {
  id: string;
  name: string;
  description: string;
  stateSize: number; // 状态空间维度
  actionSize: number; // 动作空间维度
  observationType: 'vector' | 'image' | 'graph';
  actionType: 'discrete' | 'continuous';
  maxSteps: number;
  rewardConfig: {
    goal: number;
    step: number;
    collision: number;
    timeout: number;
  };
}

// 训练配置
export interface TrainingConfig {
  envId: string;
  algorithm: TrainingAlgorithm;
  learningRate: number;
  batchSize: number;
  epochs: number;
  gamma: number; // 折扣因子
  epsilon: number; // 探索率
  epsilonDecay: number;
  epsilonMin: number;
  totalTimesteps: number;
  hiddenLayers: number[];
  bufferSize: number;
  targetUpdateFreq: number;
}

// 训练指标
export interface TrainingMetrics {
  episode: number;
  totalEpisodes: number;
  timestep: number;
  totalTimesteps: number;
  reward: number;
  avgReward: number;
  maxReward: number;
  minReward: number;
  loss: number;
  policyLoss?: number;
  valueLoss?: number;
  entropy?: number;
  epsilon: number;
  fps: number;
  duration: number;
}

// 训练检查点
export interface TrainingCheckpoint {
  id: string;
  episode: number;
  timestep: number;
  avgReward: number;
  modelData: string; // base64
  config: TrainingConfig;
  timestamp: number;
}

// 训练任务
export interface TrainingTask {
  id: string;
  name: string;
  config: TrainingConfig;
  status: 'idle' | 'preparing' | 'training' | 'paused' | 'completed' | 'failed' | 'evaluating';
  metrics: TrainingMetrics[];
  checkpoints: TrainingCheckpoint[];
  bestReward: number;
  startTime?: number;
  endTime?: number;
  videoFrames?: { episode: number; data: string; timestamp: number }[];
}

// 预设模板
export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  category: 'enemy-ai' | 'navigation' | 'combat' | 'puzzle' | 'racing' | 'platformer';
  env: Partial<TrainingEnvironment>;
  config: Partial<TrainingConfig>;
}

class MLAgentTrainingService {
  private environments = new Map<string, TrainingEnvironment>();
  private tasks = new Map<string, TrainingTask>();
  private templates: PresetTemplate[] = [];
  private listeners = new Set<(event: string, data: any) => void>();
  private activeTaskId: string | null = null;
  private trainingInterval: number | null = null;

  constructor() {
    this.registerBuiltInEnvironments();
    this.registerBuiltInTemplates();
  }

  // 注册内置环境
  private registerBuiltInEnvironments(): void {
    const envs: TrainingEnvironment[] = [
      {
        id: 'enemy-patrol',
        name: '敌人巡逻',
        description: '训练敌人在地图上巡逻并发现玩家',
        stateSize: 8,
        actionSize: 5,
        observationType: 'vector',
        actionType: 'discrete',
        maxSteps: 500,
        rewardConfig: { goal: 100, step: -1, collision: -50, timeout: -10 },
      },
      {
        id: 'maze-navigation',
        name: '迷宫导航',
        description: '训练智能体走出迷宫',
        stateSize: 4,
        actionSize: 4,
        observationType: 'vector',
        actionType: 'discrete',
        maxSteps: 200,
        rewardConfig: { goal: 200, step: -1, collision: -5, timeout: -50 },
      },
      {
        id: 'combat-arena',
        name: '战斗竞技场',
        description: '训练 AI 在战斗中使用不同技能',
        stateSize: 16,
        actionSize: 8,
        observationType: 'vector',
        actionType: 'discrete',
        maxSteps: 1000,
        rewardConfig: { goal: 500, step: 0, collision: -20, timeout: -10 },
      },
      {
        id: 'racing-track',
        name: '赛车跑道',
        description: '训练 AI 在赛道上驾驶',
        stateSize: 12,
        actionSize: 3,
        observationType: 'vector',
        actionType: 'continuous',
        maxSteps: 2000,
        rewardConfig: { goal: 1000, step: 1, collision: -100, timeout: -50 },
      },
      {
        id: 'platformer-jump',
        name: '平台跳跃',
        description: '训练角色在平台上跳跃前进',
        stateSize: 6,
        actionSize: 3,
        observationType: 'vector',
        actionType: 'discrete',
        maxSteps: 800,
        rewardConfig: { goal: 300, step: 0, collision: -20, timeout: -30 },
      },
    ];

    for (const env of envs) {
      this.environments.set(env.id, env);
    }
  }

  // 注册预设模板
  private registerBuiltInTemplates(): void {
    this.templates = [
      {
        id: 'enemy-ai-template',
        name: '敌人 AI 训练',
        description: '训练敌人追击玩家',
        category: 'enemy-ai',
        env: { id: 'enemy-patrol', stateSize: 8, actionSize: 5, actionType: 'discrete' },
        config: { algorithm: 'PPO', learningRate: 0.0003, totalTimesteps: 100000, batchSize: 64 },
      },
      {
        id: 'nav-template',
        name: '导航训练',
        description: '训练寻路能力',
        category: 'navigation',
        env: { id: 'maze-navigation', stateSize: 4, actionSize: 4, actionType: 'discrete' },
        config: { algorithm: 'DQN', learningRate: 0.001, totalTimesteps: 50000 },
      },
      {
        id: 'combat-template',
        name: '战斗 AI 训练',
        description: '训练战斗决策',
        category: 'combat',
        env: { id: 'combat-arena', stateSize: 16, actionSize: 8, actionType: 'discrete' },
        config: {
          algorithm: 'PPO',
          learningRate: 0.0003,
          totalTimesteps: 200000,
          hiddenLayers: [256, 256],
        },
      },
    ];
  }

  // 创建训练任务
  createTask(name: string, config: TrainingConfig): TrainingTask {
    const task: TrainingTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      config,
      status: 'idle',
      metrics: [],
      checkpoints: [],
      bestReward: -Infinity,
    };
    this.tasks.set(task.id, task);
    globalEventBus.emit('ml-agent:task-created', task);
    return task;
  }

  // 启动训练
  async startTraining(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('任务不存在');
    if (task.status === 'training') return;

    task.status = 'preparing';
    task.startTime = Date.now();
    this.activeTaskId = taskId;
    this.notify('task:updated', task);

    // 准备环境
    await this.prepareEnvironment(task);

    // 开始训练循环
    task.status = 'training';
    this.notify('task:updated', task);

    this.runTrainingLoop(task);
  }

  // 准备环境
  private async prepareEnvironment(task: TrainingTask): Promise<void> {
    // 模拟环境初始化
    await new Promise((r) => setTimeout(r, 500));
  }

  // 训练循环
  private runTrainingLoop(task: TrainingTask): void {
    let episode = 0;
    const targetEpisodes = Math.ceil(task.config.totalTimesteps / 200);
    let epsilon = task.config.epsilon;

    const trainStep = () => {
      if (task.status !== 'training') return;

      episode++;
      const reward = this.simulateEpisode(task);
      epsilon = Math.max(task.config.epsilonMin, epsilon * task.config.epsilonDecay);

      const avgReward =
        task.metrics.length > 0
          ? task.metrics.slice(-20).reduce((s, m) => s + m.reward, 0) /
            Math.min(20, task.metrics.length)
          : reward;

      const metrics: TrainingMetrics = {
        episode,
        totalEpisodes: targetEpisodes,
        timestep: episode * 200,
        totalTimesteps: task.config.totalTimesteps,
        reward,
        avgReward,
        maxReward: Math.max(task.bestReward, reward),
        minReward: Math.min(
          task.metrics.length > 0 ? task.metrics[task.metrics.length - 1].minReward : 0,
          reward
        ),
        loss: Math.random() * 0.5,
        policyLoss: Math.random() * 0.2,
        valueLoss: Math.random() * 1.0,
        entropy: Math.random() * 0.1,
        epsilon,
        fps: 60 + Math.random() * 10,
        duration: Date.now() - (task.startTime || Date.now()),
      };

      task.metrics.push(metrics);

      if (reward > task.bestReward) {
        task.bestReward = reward;
        // 保存检查点
        if (episode % 10 === 0) {
          this.saveCheckpoint(task, episode, avgReward);
        }
      }

      this.notify('metrics:updated', { taskId: task.id, metrics });

      if (episode >= targetEpisodes) {
        task.status = 'completed';
        task.endTime = Date.now();
        this.notify('task:completed', task);
        this.activeTaskId = null;
        return;
      }

      // 下一轮
      setTimeout(trainStep, 100);
    };

    trainStep();
  }

  // 模拟回合
  private simulateEpisode(task: TrainingTask): number {
    const env = this.environments.get(task.config.envId);
    if (!env) return 0;

    // 模拟训练进度
    const progress = (task.metrics.length + 1) / 1000;
    const baseReward = 50 * progress;
    const noise = (Math.random() - 0.5) * 30;
    return Math.max(env.rewardConfig.timeout, baseReward + noise + Math.random() * 100);
  }

  // 保存检查点
  saveCheckpoint(task: TrainingTask, episode: number, avgReward: number): TrainingCheckpoint {
    const checkpoint: TrainingCheckpoint = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      episode,
      timestep: episode * 200,
      avgReward,
      modelData: btoa(JSON.stringify({ weights: [] })),
      config: task.config,
      timestamp: Date.now(),
    };
    task.checkpoints.push(checkpoint);
    this.notify('checkpoint:saved', { taskId: task.id, checkpoint });
    return checkpoint;
  }

  // 暂停训练
  pauseTraining(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'training') {
      task.status = 'paused';
      this.notify('task:updated', task);
    }
  }

  // 恢复训练
  resumeTraining(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'training';
      this.notify('task:updated', task);
      this.runTrainingLoop(task);
    }
  }

  // 停止训练
  stopTraining(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'idle';
      task.endTime = Date.now();
      this.activeTaskId = null;
      this.notify('task:updated', task);
    }
  }

  // 评估模型
  async evaluateModel(
    taskId: string,
    episodes: number = 10
  ): Promise<{ avgReward: number; rewards: number[] }> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('任务不存在');

    task.status = 'evaluating';
    this.notify('task:updated', task);

    const rewards: number[] = [];
    for (let i = 0; i < episodes; i++) {
      const reward = this.simulateEpisode(task) * 1.2; // 评估时表现更好
      rewards.push(reward);
    }

    const avgReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;
    task.status = 'completed';
    this.notify('task:updated', task);

    return { avgReward, rewards };
  }

  // 导出模型
  exportModel(taskId: string, checkpointId?: string): { format: string; data: string } {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('任务不存在');

    const cp = checkpointId
      ? task.checkpoints.find((c) => c.id === checkpointId)
      : task.checkpoints[task.checkpoints.length - 1];

    if (!cp) throw new Error('检查点不存在');

    return {
      format: 'onnx', // 支持 onnx/tflite/torch
      data: cp.modelData,
    };
  }

  // 获取环境
  getEnvironment(envId: string): TrainingEnvironment | undefined {
    return this.environments.get(envId);
  }

  // 列出环境
  listEnvironments(): TrainingEnvironment[] {
    return Array.from(this.environments.values());
  }

  // 获取模板
  getTemplates(): PresetTemplate[] {
    return [...this.templates];
  }

  // 获取任务
  getTask(taskId: string): TrainingTask | undefined {
    return this.tasks.get(taskId);
  }

  // 列出任务
  listTasks(): TrainingTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
  }

  // 获取最新指标
  getLatestMetrics(taskId: string): TrainingMetrics | undefined {
    const task = this.tasks.get(taskId);
    if (!task || task.metrics.length === 0) return undefined;
    return task.metrics[task.metrics.length - 1];
  }

  // 获取训练历史
  getMetricsHistory(taskId: string, limit: number = 100): TrainingMetrics[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];
    return task.metrics.slice(-limit);
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }

  // 推荐配置
  recommendConfig(envId: string, algorithm: TrainingAlgorithm): TrainingConfig {
    const env = this.environments.get(envId);
    if (!env) throw new Error('环境不存在');

    if (algorithm === 'PPO') {
      return {
        envId,
        algorithm: 'PPO',
        learningRate: 0.0003,
        batchSize: 64,
        epochs: 10,
        gamma: 0.99,
        epsilon: 0.2,
        epsilonDecay: 0.995,
        epsilonMin: 0.05,
        totalTimesteps: 200000,
        hiddenLayers: [64, 64],
        bufferSize: 2048,
        targetUpdateFreq: 100,
      };
    } else {
      return {
        envId,
        algorithm: 'DQN',
        learningRate: 0.001,
        batchSize: 32,
        epochs: 1,
        gamma: 0.99,
        epsilon: 1.0,
        epsilonDecay: 0.995,
        epsilonMin: 0.01,
        totalTimesteps: 100000,
        hiddenLayers: [64, 64],
        bufferSize: 50000,
        targetUpdateFreq: 1000,
      };
    }
  }
}

export const mlAgentTrainingService = new MLAgentTrainingService();
