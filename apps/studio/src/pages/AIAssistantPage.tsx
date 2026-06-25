import { useState, useEffect, useRef } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Icon, Input, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@tapdev/ui';
import { aiAssistantService, aiCompletionService, aiCodeGenService, aiErrorDiagnosis, multiModelRouter } from '@tapdev/core';
import type { ChatSession, ChatMessage, Reference, AIConfig } from '@tapdev/core';
import type { ModelInstance, TaskType } from '@tapdev/core';
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

  useEffect(() => {
    refreshModels();
    discoverOllama();
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

  const handleTestMultiModel = async () => {
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
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

  const taskTypes: { value: TaskType; label: string }[] = [
    { value: 'code-completion', label: '代码补全' },
    { value: 'code-generation', label: '代码生成' },
    { value: 'code-refactor', label: '代码重构' },
    { value: 'code-test', label: '生成测试' },
    { value: 'error-diagnosis', label: '错误诊断' },
    { value: 'chat', label: '对话问答' },
    { value: 'review', label: '代码审查' },
  ];

  const routingRule = multiModelRouter.getRoutingRule(selectedTask);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Ollama 实例状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="server" size={16} />
            Ollama 实例
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

      {/* 模型列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="layers" size={16} />
            模型管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  model.enabled
                    ? 'border-tap-orange/30 bg-tap-orange/5'
                    : 'border-border bg-surface-2 opacity-60'
                }`}
              >
                <button
                  onClick={() => toggleModel(model.id)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    model.enabled ? 'bg-tap-orange' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      model.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>

                <div className="flex-1">
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs text-text-muted">
                    {model.model} • {model.provider === 'ollama' ? '本地模型' : '云端模型'}
                  </div>
                </div>

                <Badge variant={model.provider === 'ollama' ? 'success' : 'default'}>
                  {model.priority}
                </Badge>

                <div className="flex gap-1">
                  {model.capabilities.slice(0, 3).map((cap) => (
                    <Badge key={cap} variant="default" className="text-xs">
                      {taskTypes.find(t => t.value === cap)?.label || cap}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 路由规则 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="git-branch" size={16} />
            路由规则
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="info">
                    {routingRule.mode === 'single' ? '单模型' :
                     routingRule.mode === 'parallel' ? '并行' : '级联'}
                  </Badge>
                  <span className="text-sm text-text-secondary">
                    候选模型: {routingRule.modelIds.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {routingRule.modelIds.map((modelId) => {
                    const model = multiModelRouter.getModel(modelId);
                    return model ? (
                      <div
                        key={modelId}
                        className="flex items-center gap-2 p-2 bg-surface-2 rounded text-sm"
                      >
                        <Icon name="box" size={14} />
                        <span className="font-medium">{model.name}</span>
                        <span className="text-text-muted text-xs">{model.model}</span>
                        <div className="flex-1" />
                        <Badge variant="default" className="text-xs">
                          优先级 {model.priority}
                        </Badge>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 测试区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="play" size={16} />
            测试多模型协同
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              测试提示词（将使用 {taskTypes.find(t => t.value === selectedTask)?.label} 任务的路由规则）
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
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Badge variant="success">
                      {testResult.responses.length} 个模型参与
                    </Badge>
                    <span>聚合策略: {testResult.strategy}</span>
                    <span>总耗时: {testResult.totalLatency}ms</span>
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
                        <div className="flex items-center gap-2 mb-2">
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
    </div>
  );
}
