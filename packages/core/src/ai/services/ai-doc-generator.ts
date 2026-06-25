import { multiModelRouter } from '../multi-model-router';

export interface DocGenerationRequest {
  type: 'readme' | 'api' | 'changelog' | 'comment' | 'architecture';
  code?: string;
  projectName?: string;
  projectDescription?: string;
  files?: { path: string; content: string }[];
  language?: string;
  version?: string;
}

export interface DocGenerationResult {
  type: DocGenerationRequest['type'];
  content: string;
  generatedAt: number;
  filesGenerated: string[];
}

export class AIDocGeneratorService {
  private generatedDocs: Map<string, DocGenerationResult[]> = new Map();

  async generate(request: DocGenerationRequest): Promise<DocGenerationResult> {
    const { type, code, projectName, projectDescription, files, language = 'typescript', version } = request;

    let prompt = '';
    let systemPrompt = '';

    switch (type) {
      case 'readme':
        systemPrompt = '你是专业的技术文档编写专家。请根据项目信息生成结构清晰、内容完整的 README.md 文件。';
        prompt = this.buildReadmePrompt(projectName, projectDescription, files, language);
        break;
      case 'api':
        systemPrompt = '你是 API 文档专家。请根据代码提取 API 接口信息，生成完整的 API 文档。';
        prompt = this.buildApiPrompt(code, files);
        break;
      case 'changelog':
        systemPrompt = '你是版本记录专家。请根据代码变更生成规范的 CHANGELOG.md。';
        prompt = this.buildChangelogPrompt(files, version);
        break;
      case 'comment':
        systemPrompt = '你是代码注释专家。请为代码添加清晰、规范的注释，包括函数说明、参数说明和返回值说明。';
        prompt = this.buildCommentPrompt(code, language);
        break;
      case 'architecture':
        systemPrompt = '你是架构文档专家。请分析项目结构和代码，生成架构设计文档。';
        prompt = this.buildArchitecturePrompt(projectName, projectDescription, files);
        break;
      default:
        throw new Error(`不支持的文档类型: ${type}`);
    }

    const result = await multiModelRouter.execute('doc-generate', prompt, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 8192,
    });

    const docResult: DocGenerationResult = {
      type,
      content: result.content,
      generatedAt: Date.now(),
      filesGenerated: this.extractFileNames(result.content),
    };

    const key = type + (projectName || '');
    const history = this.generatedDocs.get(key) || [];
    history.unshift(docResult);
    this.generatedDocs.set(key, history.slice(0, 5));

    return docResult;
  }

  private buildReadmePrompt(projectName?: string, description?: string, files?: { path: string; content: string }[], language?: string): string {
    return `项目名称: ${projectName || '未命名项目'}
项目描述: ${description || ''}
技术栈: ${language || 'TypeScript'}

${files && files.length > 0 ? `项目文件结构:
${files.map(f => `- ${f.path}`).join('\n')}

部分代码预览:
${files.slice(0, 3).map(f => `\`\`\`${f.path.split('.').pop()}
${f.content.substring(0, 500)}
\`\`\``).join('\n\n')}` : ''}

请生成完整的 README.md，包含以下部分：
1. 项目介绍
2. 功能特性
3. 技术栈
4. 安装步骤
5. 使用方法
6. API 文档（简要）
7. 开发指南
8. 贡献指南
9. 许可证
`;
  }

  private buildApiPrompt(code?: string, files?: { path: string; content: string }[]): string {
    const allContent = code || files?.map(f => f.content).join('\n\n') || '';
    return `请分析以下代码，提取所有 API 接口和函数定义，生成完整的 API 文档。

代码内容:
\`\`\`typescript
${allContent.substring(0, 5000)}
\`\`\`

请按以下格式输出：
- 接口名称
- 功能描述
- 参数列表（名称、类型、说明）
- 返回值（类型、说明）
- 使用示例
`;
  }

  private buildChangelogPrompt(files?: { path: string; content: string }[], version?: string): string {
    return `请根据项目代码生成 CHANGELOG.md。

版本号: ${version || '1.0.0'}
${files && files.length > 0 ? `项目文件:
${files.map(f => `- ${f.path}`).join('\n')}` : ''}

请按以下格式输出：
## [版本号] - 日期

### Added
- 新增功能

### Changed
- 变更内容

### Fixed
- 修复问题

### Removed
- 移除内容
`;
  }

  private buildCommentPrompt(code?: string, language?: string): string {
    return `请为以下代码添加规范的注释。

语言: ${language || 'TypeScript'}

代码:
\`\`\`${language}
${code || ''}
\`\`\`

注释要求：
1. 为每个函数添加 JSDoc 风格注释
2. 说明函数功能、参数和返回值
3. 为复杂逻辑添加行内注释
4. 保持代码可读性
`;
  }

  private buildArchitecturePrompt(projectName?: string, description?: string, files?: { path: string; content: string }[]): string {
    return `请分析以下项目，生成架构设计文档。

项目名称: ${projectName || '未命名项目'}
项目描述: ${description || ''}

${files && files.length > 0 ? `项目文件结构:
${files.map(f => `- ${f.path}`).join('\n')}` : ''}

请输出以下内容：
1. 整体架构图（文字描述）
2. 模块划分
3. 核心组件说明
4. 数据流
5. 依赖关系
6. 技术选型理由
`;
  }

  private extractFileNames(content: string): string[] {
    const names: string[] = [];
    const patterns = [
      /```(\w+)/g,
      /`([^`]+)\.(md|ts|js|json|yaml|yml)`/g,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        names.push(match[1]);
      }
    }
    return [...new Set(names)];
  }

  getGeneratedDocs(type?: string): DocGenerationResult[] {
    if (type) {
      return Array.from(this.generatedDocs.values())
        .flat()
        .filter(d => d.type === type);
    }
    return Array.from(this.generatedDocs.values()).flat();
  }

  clearGeneratedDocs(): void {
    this.generatedDocs.clear();
  }
}

export const aiDocGeneratorService = new AIDocGeneratorService();
