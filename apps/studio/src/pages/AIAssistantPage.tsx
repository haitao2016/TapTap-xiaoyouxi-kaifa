import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Icon,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from '@tapdev/ui';
import { aiAssistantService, aiCodeGenService, codeReviewService } from '@tapdev/core';
import type { ChatMessage, ChatSession } from '@tapdev/core';
import type { CodeGenAction, CodeGenResult, CodeLanguage } from '@tapdev/core';
import type { ReviewReport, ReviewIssue } from '@tapdev/core';

export function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tap-orange/10 flex items-center justify-center">
            <Icon name="sparkles" size={20} className="text-tap-orange" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">AI 助手</h2>
            <p className="text-xs text-text-muted">智能代码生成、对话问答、代码审查</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-2 border-b border-border">
          <TabsList>
            <TabsTrigger value="chat">💬 对话</TabsTrigger>
            <TabsTrigger value="codegen">⚡ 代码生成</TabsTrigger>
            <TabsTrigger value="review">🔍 代码审查</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full pt-0">
            <ChatPanel />
          </TabsContent>
          <TabsContent value="codegen" className="h-full pt-0">
            <CodeGenPanel />
          </TabsContent>
          <TabsContent value="review" className="h-full pt-0">
            <CodeReviewPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function ChatPanel() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = () => {
    const all = aiAssistantService.listSessions();
    setSessions(all);
    if (all.length > 0 && !activeSessionId) {
      setActiveSessionId(all[0].id);
      setMessages(all[0].messages);
    }
  };

  const createSession = () => {
    const session = aiAssistantService.createSession('新对话');
    aiAssistantService.switchSession(session.id);
    setSessions([session, ...sessions]);
    setActiveSessionId(session.id);
    setMessages([]);
  };

  const selectSession = (id: string) => {
    setActiveSessionId(id);
    aiAssistantService.switchSession(id);
    const active = aiAssistantService.getActiveSession();
    if (active && active.id === id) {
      setMessages(active.messages);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const active = aiAssistantService.getActiveSession();
    if (!active) {
      createSession();
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMsg,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await aiAssistantService.sendMessage(userMsg);
      const current = aiAssistantService.getActiveSession();
      if (current) {
        setMessages([...current.messages]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `抱歉，发生了错误：${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = aiAssistantService.getQuickActions();

  return (
    <div className="h-full flex">
      <div className="w-56 border-r border-border bg-surface-0 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button onClick={createSession} className="w-full" size="sm">
            <Icon name="plus" size={14} />
            新建对话
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center text-xs text-text-muted py-8">暂无对话</div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSessionId === s.id
                    ? 'bg-tap-orange/10 text-tap-orange'
                    : 'text-text-secondary hover:bg-surface-2'
                }`}
              >
                <div className="truncate font-medium">{s.title}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {new Date(s.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-tap-orange/10 flex items-center justify-center mb-4">
                <Icon name="sparkles" size={28} className="text-tap-orange" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">有什么可以帮你的？</h3>
              <p className="text-sm text-text-muted mb-6 max-w-md">
                我可以帮你写代码、解释逻辑、优化性能、排查 Bug，或者回答任何开发问题
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {quickActions.slice(0, 6).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setInput(action.prompt)}
                    className="text-left p-3 rounded-xl border border-border bg-surface-0 hover:bg-surface-2 transition-colors"
                  >
                    <div className="text-sm font-medium text-text-primary">{action.title}</div>
                    <div className="text-xs text-text-muted mt-1">{action.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border bg-surface-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
              }
              placeholder="输入你的问题..."
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Icon name="loading" size={16} className="animate-spin" />
              ) : (
                <Icon name="send" size={16} />
              )}
              发送
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? 'bg-tap-orange/20' : 'bg-surface-2'
        }`}
      >
        <Icon
          name={isUser ? 'user' : 'sparkles'}
          size={16}
          className={isUser ? 'text-tap-orange' : 'text-text-secondary'}
        />
      </div>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
          isUser ? 'bg-tap-orange text-white' : 'bg-surface-2 text-text-primary'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div className={`text-xs mt-2 ${isUser ? 'text-white/60' : 'text-text-muted'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function CodeGenPanel() {
  const [action, setAction] = useState<CodeGenAction>('generate');
  const [language, setLanguage] = useState<CodeLanguage>('typescript');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<CodeGenResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const actions: { value: CodeGenAction; label: string; icon: string }[] = [
    { value: 'generate', label: '生成', icon: 'code' },
    { value: 'refactor', label: '重构', icon: 'refresh' },
    { value: 'optimize', label: '优化', icon: 'zap' },
    { value: 'fix-bug', label: '修 Bug', icon: 'bug' },
    { value: 'test', label: '测试', icon: 'check' },
    { value: 'document', label: '文档', icon: 'book' },
  ];

  const languages: CodeLanguage[] = [
    'typescript',
    'javascript',
    'csharp',
    'lua',
    'python',
    'html',
    'css',
  ];

  const generate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const genResult = await aiCodeGenService.generateCode({
        id: `req-${Date.now()}`,
        action,
        prompt,
        language,
      });
      setResult(genResult);
    } catch (err) {
      console.error('Code generation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const templates = aiCodeGenService.getTemplates();

  return (
    <div className="h-full flex">
      <div className="w-72 border-r border-border bg-surface-0 flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary mb-3">操作类型</h3>
          <div className="grid grid-cols-3 gap-2">
            {actions.map((a) => (
              <button
                key={a.value}
                onClick={() => setAction(a.value)}
                className={`p-2 rounded-lg text-center transition-colors ${
                  action === a.value
                    ? 'bg-tap-orange/10 text-tap-orange'
                    : 'bg-surface-1 text-text-secondary hover:bg-surface-2'
                }`}
              >
                <Icon name={a.icon} size={16} className="mx-auto mb-1" />
                <div className="text-xs">{a.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary mb-3">编程语言</h3>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
            className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm text-text-primary"
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-text-primary mb-3">代码模板</h3>
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setPrompt(t.description)}
                className="w-full text-left p-3 rounded-lg bg-surface-1 hover:bg-surface-2 transition-colors border border-border"
              >
                <div className="text-sm font-medium text-text-primary">{t.name}</div>
                <div className="text-xs text-text-muted mt-1">{t.description}</div>
                <div className="flex gap-1 mt-2">
                  <Badge variant="default">{t.category}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的代码..."
            className="w-full h-32 px-4 py-3 rounded-xl bg-surface-1 border border-border text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-tap-orange/50"
          />
          <div className="flex justify-end mt-3">
            <Button onClick={generate} disabled={isLoading || !prompt.trim()}>
              {isLoading ? (
                <Icon name="loading" size={16} className="animate-spin" />
              ) : (
                <Icon name="sparkles" size={16} />
              )}
              {isLoading ? '生成中...' : '生成代码'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {result ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>生成结果</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm">
                      <Icon name="copy" size={14} />
                      复制
                    </Button>
                    <Button size="sm">
                      <Icon name="download" size={14} />
                      插入
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-surface-2 rounded-lg p-4 text-xs overflow-x-auto text-text-primary font-mono leading-relaxed">
                  <code>{result.code}</code>
                </pre>
                {result.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm font-medium text-text-primary mb-2">💡 说明</div>
                    <p className="text-sm text-text-secondary">{result.explanation}</p>
                  </div>
                )}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-text-primary">建议</div>
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="p-3 bg-surface-2 rounded-lg">
                        <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                          <Badge variant={s.severity === 'warning' ? 'warning' : 'info'}>
                            {s.severity}
                          </Badge>
                          {s.title}
                        </div>
                        <p className="text-sm text-text-secondary mt-1">{s.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center text-text-muted">
              <div className="text-center">
                <Icon name="code" size={48} className="mx-auto mb-4 opacity-30" />
                <p>输入描述并点击生成，查看结果</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeReviewPanel() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [result, setResult] = useState<ReviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const review = async () => {
    if (!code.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const reviewResult = codeReviewService.reviewFile('review.ts', code);
      setResult(reviewResult);
    } catch (err) {
      console.error('Code review failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleCode = `// 示例代码 - 点击审查查看效果
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}

function processUserData(user) {
  if (user != null) {
    if (user.name != null) {
      return user.name.toUpperCase();
    }
  }
  return null;
}`;

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary">待审查代码</h3>
            <div className="flex gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-2 py-1 rounded bg-surface-1 border border-border text-xs"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="csharp">C#</option>
                <option value="lua">Lua</option>
              </select>
              <Button variant="secondary" size="sm" onClick={() => setCode(sampleCode)}>
                示例代码
              </Button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="粘贴待审查的代码..."
            className="flex-1 w-full p-4 rounded-xl bg-surface-1 border border-border font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-tap-orange/50"
          />
          <div className="flex justify-end mt-3">
            <Button onClick={review} disabled={isLoading || !code.trim()}>
              {isLoading ? (
                <Icon name="loading" size={16} className="animate-spin" />
              ) : (
                <Icon name="search" size={16} />
              )}
              {isLoading ? '审查中...' : '开始审查'}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-text-primary mb-2">审查结果</h3>
          <div className="flex-1 overflow-y-auto">
            {result ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>总评分</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-tap-orange">
                        {result.summary?.score ?? 85}
                      </div>
                      <div>
                        <div className="text-sm text-text-primary">代码质量</div>
                        <div className="text-xs text-text-muted">满分 100</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      <div className="text-center p-2 bg-surface-2 rounded-lg">
                        <div className="text-lg font-semibold text-text-primary">
                          {result.summary?.total ?? 0}
                        </div>
                        <div className="text-xs text-text-muted">总问题</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-lg font-semibold text-red-500">
                          {result.summary?.errors ?? 0}
                        </div>
                        <div className="text-xs text-text-muted">错误</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-lg font-semibold text-yellow-600">
                          {result.summary?.warnings ?? 0}
                        </div>
                        <div className="text-xs text-text-muted">警告</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-lg font-semibold text-blue-500">
                          {result.summary?.info ?? 0}
                        </div>
                        <div className="text-xs text-text-muted">建议</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {result.issues && result.issues.length > 0 ? (
                  result.issues.map((issue: ReviewIssue) => (
                    <Card key={issue.id}>
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              issue.severity === 'error'
                                ? 'bg-red-100 text-red-600'
                                : issue.severity === 'warning'
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            <Icon
                              name={
                                issue.severity === 'error'
                                  ? 'alert-circle'
                                  : issue.severity === 'warning'
                                    ? 'alert-triangle'
                                    : 'info'
                              }
                              size={16}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text-primary">
                                {issue.ruleName}
                              </span>
                              <Badge variant="default">{issue.category}</Badge>
                            </div>
                            <p className="text-sm text-text-secondary mt-1">{issue.message}</p>
                            {issue.codeSnippet && (
                              <pre className="mt-2 p-2 bg-surface-2 rounded text-xs font-mono overflow-x-auto">
                                <code>{issue.codeSnippet}</code>
                              </pre>
                            )}
                            {issue.suggestion && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                                <span className="font-medium text-green-600">💡 建议：</span>
                                {issue.suggestion}
                              </div>
                            )}
                            {issue.startLine && (
                              <div className="text-xs text-text-muted mt-2">
                                第 {issue.startLine} - {issue.endLine} 行
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent>
                      <div className="text-center py-8">
                        <Icon
                          name="check-circle"
                          size={48}
                          className="mx-auto mb-3 text-green-500"
                        />
                        <div className="text-sm font-medium text-text-primary">代码质量良好</div>
                        <div className="text-xs text-text-muted mt-1">未发现明显问题</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {result.metrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle>代码指标</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-surface-2 rounded-lg">
                          <div className="text-xs text-text-muted">代码行数</div>
                          <div className="text-lg font-semibold text-text-primary">
                            {result.metrics.linesOfCode}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-2 rounded-lg">
                          <div className="text-xs text-text-muted">圈复杂度</div>
                          <div className="text-lg font-semibold text-text-primary">
                            {result.metrics.cyclomaticComplexity}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-2 rounded-lg">
                          <div className="text-xs text-text-muted">可维护性指数</div>
                          <div className="text-lg font-semibold text-text-primary">
                            {result.metrics.maintainabilityIndex}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-2 rounded-lg">
                          <div className="text-xs text-text-muted">重复行数</div>
                          <div className="text-lg font-semibold text-text-primary">
                            {result.metrics.duplicateLines}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted">
                <div className="text-center">
                  <Icon name="search" size={48} className="mx-auto mb-4 opacity-30" />
                  <p>粘贴代码并点击审查</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
