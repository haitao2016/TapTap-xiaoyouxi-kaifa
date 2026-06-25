import { useState, useEffect, useRef } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Icon, Input, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@tapdev/ui';
import { aiAssistantService, aiCompletionService, aiCodeGenService, aiErrorDiagnosis, multiModelRouter } from '@tapdev/core';
import type { ChatSession, ChatMessage, Reference, AIConfig } from '@tapdev/core';
import type { ModelInstance, TaskType, HybridMode } from '@tapdev/core';
import { useAppStore } from '../store/app-store';

export function AIAssistantPage() {
  const { currentProject } = useAppStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [aiConfig, setAiConfig] = useState<AIConfig>(aiCompletionService.getConfig());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshSessions();
  }, []);

  useEffect(() => {
    if (currentProject) {
      const proj = currentProject as any;
      const files = proj.files?.map((f: any) => ({
        path: f.path,
        content: f.content || '',
      })) || [];
      if (files.length > 0) {
        aiAssistantService.indexProjectFiles(files);
      }
    }
  }, [currentProject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const refreshSessions = () => {
    const list = aiAssistantService.listSessions();
    setSessions(list);
    setActiveSession(aiAssistantService.getActiveSession());
  };

  const handleNewSession = () => {
    aiAssistantService.createSession('新对话');
    refreshSessions();
  };

  const handleSwitchSession = (id: string) => {
    aiAssistantService.switchSession(id);
    refreshSessions();
  };

  const handleDeleteSession = (id: string) => {
    aiAssistantService.deleteSession(id);
    refreshSessions();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await aiAssistantService.sendMessage(inputValue.trim());
      setInputValue('');
      refreshSessions();
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConfigSave = () => {
    aiCompletionService.configure(aiConfig);
    setAiConfig(aiCompletionService.getConfig());
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* 侧边栏 - 会话列表 */}
      <div className="w-64 shrink-0 border-r border-border bg-surface-1 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button className="w-full" onClick={handleNewSession}>
            <Icon name="plus" size={14} /> 新对话
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                activeSession?.id === session.id
                  ? 'bg-tap-orange/10 text-tap-orange'
                  : 'hover:bg-surface-2 text-text-secondary'
              }`}
              onClick={() => handleSwitchSession(session.id)}
            >
              <Icon name="message" size={16} className="shrink-0" />
              <span className="flex-1 truncate text-sm">{session.title}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(session.id);
                }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border px-4">
            <TabsList className="mt-2">
              <TabsTrigger value="chat">AI 对话</TabsTrigger>
              <TabsTrigger value="codegen">代码生成</TabsTrigger>
              <TabsTrigger value="diagnose">错误诊断</TabsTrigger>
              <TabsTrigger value="models">多模型</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="mt-0 flex-1 flex flex-col">
            {/* 消息列表 */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {activeSession?.messages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} formatTime={formatTime} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-text-muted text-sm">
                  <Icon name="loading" size={16} className="animate-spin" />
                  AI 正在思考...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入问题，使用 @ 引用文件..."
                    className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:border-tap-orange/50"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
                    {isLoading ? (
                      <Icon name="loading" size={14} className="animate-spin" />
                    ) : (
                      <Icon name="send" size={14} />
                    )}
                    发送
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-text-muted">
                提示：使用 @文件名 引用项目中的文件，例如 @src/main.ts
              </div>
            </div>
          </TabsContent>

          <TabsContent value="codegen" className="mt-0 p-4">
            <CodeGenPanel />
          </TabsContent>

          <TabsContent value="diagnose" className="mt-0 p-4">
            <ErrorDiagnosisPanel />
          </TabsContent>

          <TabsContent value="models" className="mt-0 p-4">
            <MultiModelConfigPanel />
          </TabsContent>

          <TabsContent value="settings" className="mt-0 p-4">
            <div className="max-w-xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI 提供商配置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-text-secondary">提供商</label>
                    <select
                      value={aiConfig.provider}
                      onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value as any })}
                      className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm focus:outline-none focus:border-tap-orange/50"
                    >
                      <option value="mock">Mock (模拟)</option>
                      <option value="openai">OpenAI</option>
                      <option value="claude">Claude</option>
                      <option value="ollama">Ollama (本地)</option>
                    </select>
                  </div>

                  {aiConfig.provider !== 'mock' && (
                    <>
                      <div>
                        <label className="text-sm text-text-secondary">API Key</label>
                        <Input
                          type="password"
                          value={aiConfig.apiKey || ''}
                          onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                          placeholder="sk-..."
                        />
                      </div>
                      <div>
                        <label className="text-sm text-text-secondary">模型</label>
                        <select
                          value={aiConfig.model || ''}
                          onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                          className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm focus:outline-none focus:border-tap-orange/50"
                        >
                          {aiCompletionService.listModels(aiConfig.provider as any).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-sm text-text-secondary">温度: {aiConfig.temperature}</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={aiConfig.temperature}
                      onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <Button onClick={handleConfigSave}>保存配置</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">当前状态</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">提供商</span>
                    <Badge variant="default">{aiConfig.provider}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">模型</span>
                    <span>{aiConfig.model || '默认'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">会话数量</span>
                    <span>{sessions.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ChatMessageBubble({ message, formatTime }: { message: ChatMessage; formatTime: (t: number) => string }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-surface-2 text-text-muted text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isUser ? 'bg-tap-orange text-white' : 'bg-surface-2 text-text-secondary'
      }`}>
        <Icon name={isUser ? 'user' : 'bot'} size={16} />
      </div>
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-lg px-4 py-2 text-sm ${
          isUser
            ? 'bg-tap-orange text-white rounded-tr-none'
            : 'bg-surface-1 border border-border rounded-tl-none'
        }`}>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
        {message.references && message.references.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.references.map((ref, idx) => (
              <Badge key={idx} variant="default" className="text-xs">
                <Icon name="file" size={10} className="mr-1" />
                {ref.label}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-1 text-xs text-text-muted">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
}

function CodeGenPanel() {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [action, setAction] = useState<'generate' | 'refactor' | 'comment' | 'test' | 'document'>('generate');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const res = await aiCodeGenService.generate({
        id: `gen-${Date.now()}`,
        action,
        prompt,
        language,
      });
      setResult(res.code);
    } catch (error) {
      console.error('代码生成失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">代码生成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-text-secondary">操作类型</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
                className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm focus:outline-none focus:border-tap-orange/50"
              >
                <option value="generate">生成代码</option>
                <option value="refactor">重构代码</option>
                <option value="comment">添加注释</option>
                <option value="test">生成测试</option>
                <option value="document">生成文档</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-text-secondary">语言</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm focus:outline-none focus:border-tap-orange/50"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="csharp">C#</option>
                <option value="python">Python</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary">描述</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要生成的代码功能..."
              className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:border-tap-orange/50"
            />
          </div>

          <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}>
            {isLoading ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
            {isLoading ? '生成中...' : '生成代码'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">生成结果</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(result)}>
                <Icon name="copy" size={14} /> 复制
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-surface-2 rounded-lg p-4 overflow-auto text-sm font-mono">
              <code>{result}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ErrorDiagnosisPanel() {
  const [errorMessage, setErrorMessage] = useState('');
  const [filePath, setFilePath] = useState('');
  const [lineNumber, setLineNumber] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    setHistory(aiErrorDiagnosis.getHistory());
  }, []);

  const handleDiagnose = async () => {
    if (!errorMessage.trim()) return;
    setIsLoading(true);
    try {
      const res = await aiErrorDiagnosis.diagnose({
        message: errorMessage,
        filePath: filePath || undefined,
        line: lineNumber ? parseInt(lineNumber, 10) : undefined,
      });
      setResult(res);
      setHistory(aiErrorDiagnosis.getHistory());
    } catch (error) {
      console.error('诊断失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">错误诊断</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary">文件路径</label>
              <Input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="src/main.ts"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary">行号</label>
              <Input
                type="number"
                value={lineNumber}
                onChange={(e) => setLineNumber(e.target.value)}
                placeholder="42"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary">错误信息</label>
            <textarea
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="粘贴错误信息..."
              className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:border-tap-orange/50"
            />
          </div>

          <Button onClick={handleDiagnose} disabled={isLoading || !errorMessage.trim()}>
            {isLoading ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
            {isLoading ? '诊断中...' : '开始诊断'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">诊断结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">{result.category}</Badge>
              <span className="text-sm text-text-secondary">严重程度: {result.severity || 'medium'}</span>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">建议修复方案:</h4>
              <div className="space-y-2">
                {result.fixes?.map((fix: any, idx: number) => (
                  <div key={idx} className="bg-surface-2 rounded-lg p-3">
                    <div className="font-medium text-sm">{fix.title}</div>
                    {fix.description && <p className="text-xs text-text-muted mt-1">{fix.description}</p>}
                    {fix.steps && fix.steps.length > 0 && (
                      <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
                        {fix.steps.map((step: string, i: number) => (
                          <li key={i} className="text-text-secondary">{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">历史记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{item.category}</Badge>
                    <span className="text-sm truncate max-w-md">{item.message}</span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {new Date(item.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** 多模型配置面板 */
function MultiModelConfigPanel() {
  const [models, setModels] = useState<ModelInstance[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskType>('code-completion');
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [discoveredInstances, setDiscoveredInstances] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'local' | 'cloud' | 'rules' | 'hybrid' | 'test'>('local');
  const [editingModel, setEditingModel] = useState<ModelInstance | null>(null);
  const [apiKeyConfig, setApiKeyConfig] = useState<Record<string, string>>({});
  const [hybridMode, setHybridMode] = useState<HybridMode>('local-first');
  const [callStatus, setCallStatus] = useState<any>(null);

  useEffect(() => {
    refreshModels();
    discoverOllama();
    setHybridMode(multiModelRouter.getHybridMode());
    // 定期更新调用状态
    const interval = setInterval(() => {
      const status = multiModelRouter.getCallStatus();
      setCallStatus(status);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const refreshModels = () => {
    setModels(multiModelRouter.listEnabledModels());
  };

  const discoverOllama = async () => {
    const instances = await multiModelRouter.discoverOllamaInstances();
    setDiscoveredInstances(instances);
  };

  const toggleModel = (modelId: string) => {
    const model = multiModelRouter.getModel(modelId);
    if (model) {
      multiModelRouter.updateModel(modelId, { enabled: !model.enabled });
      refreshModels();
    }
  };

  const updateModelConfig = (modelId: string, updates: Partial<ModelInstance>) => {
    multiModelRouter.updateModel(modelId, updates);
    refreshModels();
  };

  const handleTestMultiModel = async () => {
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      multiModelRouter.setHybridMode(hybridMode);
      const result = await multiModelRouter.execute(selectedTask, testPrompt);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleHybridModeChange = (mode: HybridMode) => {
    setHybridMode(mode);
    multiModelRouter.setHybridMode(mode);
  };

  const taskTypes: { value: TaskType; label: string }[] = [
    { value: 'code-completion', label: '代码补全' },
    { value: 'code-generation', label: '代码生成' },
    { value: 'code-refactor', label: '代码重构' },
    { value: 'code-test', label: '生成测试' },
    { value: 'error-diagnosis', label: '错误诊断' },
    { value: 'chat', label: '对话问答' },
    { value: 'review', label: '代码审查' },
    { value: 'translation', label: '翻译' },
    { value: 'summary', label: '总结摘要' },
  ];

  const routingRule = multiModelRouter.getRoutingRule(selectedTask);

  const localModels = models.filter(m => m.provider === 'ollama');
  const cloudModels = models.filter(m => m.provider !== 'ollama');

  const providerLabels: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Anthropic',
    ollama: 'Ollama',
    qwen: '通义千问',
    deepseek: 'DeepSeek',
    doubao: '豆包',
    zhipu: '智谱AI',
    moonshot: '月之暗面',
    gemini: 'Google Gemini',
    mock: '模拟',
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* 标签页切换 */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: 'local', label: '本地模型', icon: 'cpu' },
          { key: 'cloud', label: '云端模型', icon: 'cloud' },
          { key: 'rules', label: '路由规则', icon: 'git-branch' },
          { key: 'hybrid', label: '混合协同', icon: 'layers' },
          { key: 'test', label: '协同测试', icon: 'play' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'text-tap-orange border-tap-orange'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            <Icon name={tab.icon as any} size={14} className="inline mr-1" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 本地模型 */}
      {activeTab === 'local' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="server" size={16} />
                Ollama 实例状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              {discoveredInstances.length === 0 ? (
                <div className="text-sm text-text-muted">
                  未检测到 Ollama 实例。请确保已在本地运行 Ollama。
                </div>
              ) : (
                <div className="space-y-2">
                  {discoveredInstances.map((instance, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
                      <Badge variant="success">已连接</Badge>
                      <span className="text-sm font-mono">{instance.baseUrl}</span>
                      <div className="flex-1" />
                      <span className="text-xs text-text-muted">
                        {instance.installedModels.length} 个模型
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="cpu" size={16} />
                本地模型 ({localModels.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {localModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    taskTypes={taskTypes}
                    onToggle={() => toggleModel(model.id)}
                    onEdit={() => setEditingModel(model)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 云端模型 */}
      {activeTab === 'cloud' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="cloud" size={16} />
                云端模型 ({cloudModels.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cloudModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    taskTypes={taskTypes}
                    providerLabels={providerLabels}
                    onToggle={() => toggleModel(model.id)}
                    onEdit={() => setEditingModel(model)}
                    apiKey={apiKeyConfig[model.id] || ''}
                    onApiKeyChange={(key) => {
                      setApiKeyConfig(prev => ({ ...prev, [model.id]: key }));
                      updateModelConfig(model.id, { apiKey: key });
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 路由规则 */}
      {activeTab === 'rules' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Icon name="git-branch" size={16} />
              路由规则配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-2 block">任务类型</label>
                <select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value as TaskType)}
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
                >
                  {taskTypes.map((task) => (
                    <option key={task.value} value={task.value}>
                      {task.label}
                    </option>
                  ))}
                </select>
              </div>

              {routingRule && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">
                      {routingRule.mode === 'single' ? '单模型' :
                       routingRule.mode === 'parallel' ? '并行协同' : '级联容错'}
                    </Badge>
                    <span className="text-sm text-text-secondary">
                      候选模型: {routingRule.modelIds.length} 个
                    </span>
                    {routingRule.parallelLimit && (
                      <Badge variant="default">并行上限: {routingRule.parallelLimit}</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {routingRule.modelIds.map((modelId, idx) => {
                      const model = multiModelRouter.getModel(modelId);
                      return model ? (
                        <div
                          key={modelId}
                          className="flex items-center gap-2 p-3 bg-surface-2 rounded-lg"
                        >
                          <Badge variant="default">#{idx + 1}</Badge>
                          <Icon name="box" size={14} />
                          <span className="font-medium">{model.name}</span>
                          <span className="text-text-muted text-xs">
                            {providerLabels[model.provider] || model.provider}
                          </span>
                          <div className="flex-1" />
                          <Badge variant={model.enabled ? 'success' : 'error'}>
                            {model.enabled ? '已启用' : '未启用'}
                          </Badge>
                          <Badge variant="info" className="text-xs">
                            优先级 {model.priority}
                          </Badge>
                        </div>
                      ) : null;
                    })}
                  </div>

                  <div className="p-3 bg-tap-orange/5 border border-tap-orange/20 rounded-lg text-sm text-text-secondary">
                    <div className="font-medium text-tap-orange mb-1">路由策略说明</div>
                    {routingRule.mode === 'single' && (
                      <p>使用优先级最高的可用模型处理请求，速度最快。</p>
                    )}
                    {routingRule.mode === 'parallel' && (
                      <p>同时调用多个模型，自动选择质量最高的结果。响应质量更好，但耗时和成本更高。</p>
                    )}
                    {routingRule.mode === 'cascade' && (
                      <p>按优先级依次尝试模型，第一个成功即返回。提供最高的可用性和容错能力。</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 混合协同 */}
      {activeTab === 'hybrid' && (
        <div className="space-y-6">
          {/* 混合协同模式选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="layers" size={16} />
                混合协同模式
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { mode: 'local-first' as HybridMode, label: '本地优先', desc: '优先使用本地模型，本地不可用时切换云端', icon: 'cpu' },
                  { mode: 'cloud-first' as HybridMode, label: '云端优先', desc: '优先使用云端模型，云端不可用时切换本地', icon: 'cloud' },
                  { mode: 'parallel' as HybridMode, label: '并行协同', desc: '本地+云端同时调用，选择最优结果', icon: 'git-merge' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => handleHybridModeChange(item.mode)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      hybridMode === item.mode
                        ? 'border-tap-orange bg-tap-orange/5'
                        : 'border-border hover:border-tap-orange/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name={item.icon as any} size={16} className={hybridMode === item.mode ? 'text-tap-orange' : ''} />
                      <span className="font-medium">{item.label}</span>
                      {hybridMode === item.mode && (
                        <Badge variant="success" className="ml-auto text-xs">已启用</Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {[
                  { mode: 'local-only' as HybridMode, label: '仅本地模型', desc: '完全离线，保护隐私', icon: 'lock' },
                  { mode: 'cloud-only' as HybridMode, label: '仅云端模型', desc: '使用最强云端模型', icon: 'server' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => handleHybridModeChange(item.mode)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      hybridMode === item.mode
                        ? 'border-tap-orange bg-tap-orange/5'
                        : 'border-border hover:border-tap-orange/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name={item.icon as any} size={16} className={hybridMode === item.mode ? 'text-tap-orange' : ''} />
                      <span className="font-medium">{item.label}</span>
                      {hybridMode === item.mode && (
                        <Badge variant="success" className="ml-auto text-xs">已启用</Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 模型统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-tap-orange/10 flex items-center justify-center">
                    <Icon name="cpu" size={20} className="text-tap-orange" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{localModels.length}</div>
                    <div className="text-xs text-text-muted">本地模型</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Icon name="cloud" size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{cloudModels.length}</div>
                    <div className="text-xs text-text-muted">云端模型</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Icon name="check-circle" size={20} className="text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{models.filter(m => m.enabled).length}</div>
                    <div className="text-xs text-text-muted">已启用模型</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 调用状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="activity" size={16} />
                当前调用状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              {callStatus?.isCalling ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="loading" size={14} className="animate-spin text-tap-orange" />
                    <span>正在调用 {callStatus.taskType} 任务...</span>
                    <Badge variant="info" className="ml-auto">{callStatus.mode}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {callStatus.localStatus && (
                      <div className="p-3 bg-surface-2 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default">本地</Badge>
                          <span className="text-xs text-text-muted">{callStatus.localStatus.modelId}</span>
                        </div>
                        <div className="text-xs text-text-secondary">
                          耗时: {callStatus.localStatus.latency ? `${callStatus.localStatus.latency}ms` : '进行中...'}
                        </div>
                        {callStatus.localStatus.content && (
                          <div className="mt-2 text-xs text-text-muted truncate">
                            {callStatus.localStatus.content.substring(0, 100)}...
                          </div>
                        )}
                        {callStatus.localStatus.error && (
                          <div className="mt-2 text-xs text-red-500">{callStatus.localStatus.error}</div>
                        )}
                      </div>
                    )}
                    {callStatus.cloudStatus && (
                      <div className="p-3 bg-surface-2 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="info">云端</Badge>
                          <span className="text-xs text-text-muted">{callStatus.cloudStatus.modelId}</span>
                        </div>
                        <div className="text-xs text-text-secondary">
                          耗时: {callStatus.cloudStatus.latency ? `${callStatus.cloudStatus.latency}ms` : '进行中...'}
                        </div>
                        {callStatus.cloudStatus.content && (
                          <div className="mt-2 text-xs text-text-muted truncate">
                            {callStatus.cloudStatus.content.substring(0, 100)}...
                          </div>
                        )}
                        {callStatus.cloudStatus.error && (
                          <div className="mt-2 text-xs text-red-500">{callStatus.cloudStatus.error}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-text-muted flex items-center gap-2">
                  <Icon name="inbox" size={14} />
                  暂无进行中的调用
                </div>
              )}

              {callStatus?.selectedModel && !callStatus?.isCalling && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon name="check-circle" size={14} className="text-green-500" />
                    <span className="text-sm">已选择模型: </span>
                    <Badge variant="success">{callStatus.selectedModel}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 混合协同说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="info" size={16} />
                混合协同说明
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-secondary">
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="font-medium text-text-primary mb-1">本地优先 (local-first)</div>
                <p>适用于网络不稳定或需要保护隐私的场景。本地模型响应快、零延迟，但能力相对较弱。</p>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="font-medium text-text-primary mb-1">云端优先 (cloud-first)</div>
                <p>适用于追求最佳效果的场景。云端模型能力强，但依赖网络连接。</p>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="font-medium text-text-primary mb-1">并行协同 (parallel)</div>
                <p>同时调用本地和云端模型，根据响应质量自动选择最优结果。兼顾速度和质量，但成本加倍。</p>
              </div>
              <div className="p-3 bg-tap-orange/5 border border-tap-orange/20 rounded-lg">
                <div className="flex items-center gap-2 text-tap-orange font-medium mb-1">
                  <Icon name="lightbulb" size={14} />
                  最佳实践
                </div>
                <p>日常代码补全使用"本地优先"，复杂问题自动切换云端。离线开发时自动降级为纯本地模式。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 协同测试 */}
      {activeTab === 'test' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Icon name="play" size={16} />
              多模型协同测试
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-2 block">
                任务类型
              </label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value as TaskType)}
                className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
              >
                {taskTypes.map((task) => (
                  <option key={task.value} value={task.value}>
                    {task.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-2 block">
                测试提示词
              </label>
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="输入测试内容..."
                className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none h-24"
              />
            </div>

            <Button onClick={handleTestMultiModel} disabled={isTesting || !testPrompt.trim()}>
              {isTesting ? (
                <>
                  <Icon name="loading" size={14} className="animate-spin" />
                  执行中...
                </>
              ) : (
                <>
                  <Icon name="play" size={14} />
                  执行测试
                </>
              )}
            </Button>

            {testResult && (
              <div className="space-y-3">
                {testResult.error ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="text-sm text-red-500">执行失败</div>
                    <div className="text-xs text-text-muted mt-1">{testResult.error}</div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="success">
                        {testResult.responses.length} 个模型参与
                      </Badge>
                      <Badge variant="info">
                        策略: {testResult.strategy === 'best' ? '最优选择' :
                               testResult.strategy === 'cascade' ? '级联容错' : '合并'}
                      </Badge>
                      <Badge variant="default">
                        总耗时: {testResult.totalLatency}ms
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {testResult.responses.map((response: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            response.error
                              ? 'bg-red-500/5 border-red-500/30'
                              : 'bg-surface-2 border-border'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="default">
                              {multiModelRouter.getModel(response.modelId)?.name || response.modelId}
                            </Badge>
                            <span className="text-xs text-text-muted">
                              {response.latency}ms
                            </span>
                            {response.score !== undefined && (
                              <Badge variant="info">
                                评分 {Math.round(response.score * 100)}%
                              </Badge>
                            )}
                            {response.error && (
                              <Badge variant="error">失败</Badge>
                            )}
                          </div>
                          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono max-h-32 overflow-auto">
                            {response.content || response.error}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 编辑模型弹窗 */}
      {editingModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-1 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">模型配置 - {editingModel.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">显示名称</label>
                <input
                  type="text"
                  value={editingModel.name}
                  onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">模型标识</label>
                <input
                  type="text"
                  value={editingModel.model}
                  onChange={(e) => setEditingModel({ ...editingModel, model: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm font-mono"
                />
              </div>
              {editingModel.provider !== 'ollama' && (
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">API Key</label>
                  <input
                    type="password"
                    value={editingModel.apiKey || ''}
                    onChange={(e) => setEditingModel({ ...editingModel, apiKey: e.target.value })}
                    placeholder="输入 API Key"
                    className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="text-sm text-text-secondary mb-1 block">基础地址</label>
                <input
                  type="text"
                  value={editingModel.baseUrl || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, baseUrl: e.target.value })}
                  placeholder="留空使用默认地址"
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">优先级 (0-100)</label>
                <input
                  type="number"
                  value={editingModel.priority}
                  onChange={(e) => setEditingModel({ ...editingModel, priority: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">上下文窗口</label>
                <input
                  type="number"
                  value={editingModel.contextWindow || 4096}
                  onChange={(e) => setEditingModel({ ...editingModel, contextWindow: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <Button variant="secondary" onClick={() => setEditingModel(null)}>
                取消
              </Button>
              <Button onClick={() => {
                updateModelConfig(editingModel.id, editingModel);
                setEditingModel(null);
              }}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelCard({
  model,
  taskTypes,
  providerLabels = {},
  onToggle,
  onEdit,
  apiKey,
  onApiKeyChange,
}: {
  model: ModelInstance;
  taskTypes: { value: string; label: string }[];
  providerLabels?: Record<string, string>;
  onToggle: () => void;
  onEdit: () => void;
  apiKey?: string;
  onApiKeyChange?: (key: string) => void;
}) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        model.enabled
          ? 'border-tap-orange/30 bg-tap-orange/5'
          : 'border-border bg-surface-2 opacity-70'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 mt-1 ${
            model.enabled ? 'bg-tap-orange' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              model.enabled ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{model.name}</span>
            <Badge variant="default" className="text-xs">
              {providerLabels[model.provider] || model.provider}
            </Badge>
            <Badge variant="info" className="text-xs">
              {model.priority}
            </Badge>
          </div>
          <div className="text-xs text-text-muted mt-1 font-mono">
            {model.model}
          </div>
          {model.strengths && model.strengths.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {model.strengths.map((s, idx) => (
                <span key={idx} className="text-xs px-2 py-0.5 bg-surface-2 rounded text-text-secondary">
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1 mt-2 flex-wrap">
            {model.capabilities.slice(0, 4).map((cap) => (
              <Badge key={cap} variant="default" className="text-xs">
                {taskTypes.find(t => t.value === cap)?.label || cap}
              </Badge>
            ))}
            {model.capabilities.length > 4 && (
              <Badge variant="default" className="text-xs">
                +{model.capabilities.length - 4}
              </Badge>
            )}
          </div>

          {onApiKeyChange !== undefined && model.provider !== 'ollama' && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder={`输入 ${providerLabels[model.provider] || model.provider} API Key`}
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-xs pr-8"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <Icon name={showApiKey ? 'eye-off' : 'eye'} size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onEdit}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded"
        >
          <Icon name="settings" size={16} />
        </button>
      </div>
    </div>
  );
}

