import { multiModelRouter } from '../multi-model-router';

export interface AIPlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: 'ai' | 'editor' | 'build' | 'theme' | 'utility';
  tags: string[];
  icon?: string;
  downloadUrl: string;
  installStatus: 'installed' | 'not-installed' | 'updating';
  installPath?: string;
  createdAt: number;
  updatedAt: number;
  downloads: number;
  stars: number;
  requires?: string[];
  permissions?: string[];
}

export interface PluginInstallation {
  pluginId: string;
  status: 'installing' | 'installed' | 'failed';
  progress: number;
  installedAt?: number;
  errorMessage?: string;
}

export interface WorkflowStep {
  id: string;
  type: 'prompt' | 'code' | 'api' | 'condition';
  name: string;
  config: Record<string, any>;
  nextStepId?: string;
}

export interface AIWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

export class PluginMarketplace {
  private plugins: Map<string, AIPlugin> = new Map();
  private installations: Map<string, PluginInstallation> = new Map();
  private workflows: Map<string, AIWorkflow> = new Map();

  constructor() {
    this.initDefaultPlugins();
    this.initDefaultWorkflows();
  }

  private initDefaultPlugins(): void {
    this.plugins.set('ai-code-review', {
      id: 'ai-code-review',
      name: 'AI 代码审查',
      description: '自动审查代码质量，发现潜在问题和安全漏洞',
      author: 'TapDev Team',
      version: '1.0.0',
      category: 'ai',
      tags: ['ai', 'code-review', 'security'],
      downloadUrl: '/plugins/ai-code-review-1.0.0.zip',
      installStatus: 'installed',
      installPath: '/plugins/ai-code-review',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      downloads: 1500,
      stars: 450,
      permissions: ['read-files', 'ai-access'],
    });

    this.plugins.set('ai-doc-gen', {
      id: 'ai-doc-gen',
      name: 'AI 文档生成',
      description: '自动生成 README、API 文档和代码注释',
      author: 'TapDev Team',
      version: '1.0.0',
      category: 'ai',
      tags: ['ai', 'documentation', 'readme'],
      downloadUrl: '/plugins/ai-doc-gen-1.0.0.zip',
      installStatus: 'installed',
      installPath: '/plugins/ai-doc-gen',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      downloads: 1200,
      stars: 380,
      permissions: ['read-files', 'write-files', 'ai-access'],
    });

    this.plugins.set('theme-ocean', {
      id: 'theme-ocean',
      name: 'Ocean Theme',
      description: '深海蓝色主题，护眼配色方案',
      author: 'Community',
      version: '2.1.0',
      category: 'theme',
      tags: ['theme', 'dark', 'ocean'],
      downloadUrl: '/plugins/theme-ocean-2.1.0.zip',
      installStatus: 'not-installed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      downloads: 800,
      stars: 200,
    });

    this.plugins.set('format-json', {
      id: 'format-json',
      name: 'JSON Formatter',
      description: '一键格式化和验证 JSON 文件',
      author: 'Community',
      version: '1.2.0',
      category: 'utility',
      tags: ['json', 'formatter', 'utility'],
      downloadUrl: '/plugins/format-json-1.2.0.zip',
      installStatus: 'not-installed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      downloads: 600,
      stars: 150,
      permissions: ['read-files', 'write-files'],
    });

    this.plugins.set('git-flow', {
      id: 'git-flow',
      name: 'Git Flow',
      description: '可视化 Git 工作流管理',
      author: 'TapDev Team',
      version: '1.0.0',
      category: 'editor',
      tags: ['git', 'version-control', 'workflow'],
      downloadUrl: '/plugins/git-flow-1.0.0.zip',
      installStatus: 'not-installed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      downloads: 400,
      stars: 120,
      permissions: ['git-access'],
    });

    this.plugins.set('jira-integration', {
      id: 'jira-integration',
      name: 'Jira 集成',
      description: '在 IDE 内查看和管理 Jira 任务',
      author: 'Community',
      version: '1.1.0',
      category: 'utility',
      tags: ['jira', 'project-management', 'integration'],
      downloadUrl: '/plugins/jira-integration-1.1.0.zip',
      installStatus: 'not-installed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      downloads: 300,
      stars: 80,
      permissions: ['network', 'auth'],
    });
  }

  private initDefaultWorkflows(): void {
    this.workflows.set('bug-fix', {
      id: 'bug-fix',
      name: 'Bug 修复工作流',
      description: '自动诊断错误并生成修复方案',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [
        {
          id: 'step-1',
          type: 'prompt',
          name: '收集错误信息',
          config: {
            prompt: '请描述你遇到的错误',
          },
        },
        {
          id: 'step-2',
          type: 'api',
          name: 'AI 诊断',
          config: {
            taskType: 'error-diagnosis',
          },
          nextStepId: 'step-3',
        },
        {
          id: 'step-3',
          type: 'prompt',
          name: '生成修复代码',
          config: {
            prompt: '根据诊断结果生成修复代码',
          },
        },
      ],
    });

    this.workflows.set('feature-dev', {
      id: 'feature-dev',
      name: '功能开发工作流',
      description: '从需求到代码的完整开发流程',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [
        {
          id: 'step-1',
          type: 'prompt',
          name: '需求描述',
          config: {
            prompt: '请描述你需要开发的功能',
          },
        },
        {
          id: 'step-2',
          type: 'api',
          name: '生成代码',
          config: {
            taskType: 'code-generation',
          },
          nextStepId: 'step-3',
        },
        {
          id: 'step-3',
          type: 'api',
          name: '代码审查',
          config: {
            taskType: 'review',
          },
          nextStepId: 'step-4',
        },
        {
          id: 'step-4',
          type: 'api',
          name: '生成测试',
          config: {
            taskType: 'code-test',
          },
        },
      ],
    });
  }

  getAllPlugins(): AIPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string): AIPlugin | undefined {
    return this.plugins.get(id);
  }

  searchPlugins(query: string): AIPlugin[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.plugins.values()).filter(plugin =>
      plugin.name.toLowerCase().includes(lowerQuery) ||
      plugin.description.toLowerCase().includes(lowerQuery) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      plugin.author.toLowerCase().includes(lowerQuery)
    );
  }

  getPluginsByCategory(category: AIPlugin['category']): AIPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.category === category);
  }

  async installPlugin(pluginId: string): Promise<PluginInstallation> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('插件不存在');
    }

    const installation: PluginInstallation = {
      pluginId,
      status: 'installing',
      progress: 0,
    };
    this.installations.set(pluginId, installation);

    await this.simulateInstallation(pluginId);

    plugin.installStatus = 'installed';
    plugin.installPath = `/plugins/${pluginId}`;
    this.plugins.set(pluginId, plugin);

    return installation;
  }

  private async simulateInstallation(pluginId: string): Promise<void> {
    const installation = this.installations.get(pluginId);
    if (!installation) return;

    const steps = [20, 50, 80, 100];
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 500));
      installation.progress = step;
      this.installations.set(pluginId, installation);
    }

    installation.status = 'installed';
    installation.installedAt = Date.now();
    this.installations.set(pluginId, installation);
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.installStatus = 'not-installed';
      plugin.installPath = undefined;
      this.plugins.set(pluginId, plugin);
    }
    this.installations.delete(pluginId);
  }

  getInstallationStatus(pluginId: string): PluginInstallation | undefined {
    return this.installations.get(pluginId);
  }

  getAllWorkflows(): AIWorkflow[] {
    return Array.from(this.workflows.values());
  }

  getWorkflow(id: string): AIWorkflow | undefined {
    return this.workflows.get(id);
  }

  createWorkflow(name: string, description: string, steps: WorkflowStep[]): AIWorkflow {
    const workflow: AIWorkflow = {
      id: `workflow-${Date.now()}`,
      name,
      description,
      steps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  updateWorkflow(id: string, updates: Partial<AIWorkflow>): AIWorkflow | undefined {
    const workflow = this.workflows.get(id);
    if (workflow) {
      const updated = { ...workflow, ...updates, updatedAt: Date.now() };
      this.workflows.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  async executeWorkflow(workflowId: string, inputs: Record<string, any>): Promise<Record<string, any>> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('工作流不存在');
    }

    const results: Record<string, any> = {};
    let currentStepId: string | undefined = workflow.steps[0]?.id;

    while (currentStepId) {
      const step = workflow.steps.find(s => s.id === currentStepId);
      if (!step) break;

      const result = await this.executeStep(step, inputs, results);
      results[step.id] = result;

      currentStepId = step.nextStepId;
    }

    return results;
  }

  private async executeStep(step: WorkflowStep, inputs: Record<string, any>, previousResults: Record<string, any>): Promise<any> {
    switch (step.type) {
      case 'prompt':
        return step.config.prompt;

      case 'api': {
        const systemPrompt = `请执行以下 AI 任务：
任务类型: ${step.config.taskType}
输入数据: ${JSON.stringify({ ...inputs, ...previousResults })}
`;
        const result = await multiModelRouter.execute(step.config.taskType as any, '', {
          systemPrompt,
          temperature: 0.3,
          maxTokens: 2048,
        });
        return result.content;
      }

      case 'code':
        try {
          return eval(step.config.code);
        } catch {
          return '代码执行失败';
        }

      case 'condition':
        return step.config.condition ? 'true' : 'false';

      default:
        return null;
    }
  }
}

export const pluginMarketplace = new PluginMarketplace();
