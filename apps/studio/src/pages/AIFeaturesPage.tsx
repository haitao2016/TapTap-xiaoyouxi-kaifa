import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Icon, Input, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@tapdev/ui';
import {
  aiReviewService,
  aiDocGeneratorService,
  aiTutorService,
  teamKnowledgeBase,
  localFineTuneService,
  pluginMarketplace,
} from '@tapdev/core';
import type { ReviewIssue, TutorLesson, TutorSession, AIPlugin, FineTuneTask } from '@tapdev/core';

type TabType = 'review' | 'docgen' | 'tutor' | 'team' | 'finetune' | 'plugins';

export function AIFeaturesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('review');

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabType);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto p-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="border-b border-border mb-4">
          <TabsList>
            <TabsTrigger value="review">
              <Icon name="git-pull-request" size={14} className="mr-2" />
              代码审查
            </TabsTrigger>
            <TabsTrigger value="docgen">
              <Icon name="file-text" size={14} className="mr-2" />
              文档生成
            </TabsTrigger>
            <TabsTrigger value="tutor">
              <Icon name="book" size={14} className="mr-2" />
              AI 导师
            </TabsTrigger>
            <TabsTrigger value="team">
              <Icon name="users" size={14} className="mr-2" />
              团队知识
            </TabsTrigger>
            <TabsTrigger value="finetune">
              <Icon name="cpu" size={14} className="mr-2" />
              模型微调
            </TabsTrigger>
            <TabsTrigger value="plugins">
              <Icon name="plug" size={14} className="mr-2" />
              插件市场
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="review" className="mt-0">
          <ReviewPanel />
        </TabsContent>

        <TabsContent value="docgen" className="mt-0">
          <DocGenPanel />
        </TabsContent>

        <TabsContent value="tutor" className="mt-0">
          <TutorPanel />
        </TabsContent>

        <TabsContent value="team" className="mt-0">
          <TeamPanel />
        </TabsContent>

        <TabsContent value="finetune" className="mt-0">
          <FineTunePanel />
        </TabsContent>

        <TabsContent value="plugins" className="mt-0">
          <PluginsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewPanel() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('typescript');

  const handleReview = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    try {
      const reviewResult = await aiReviewService.review({ code, language });
      setResult(reviewResult);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      security: '安全',
      performance: '性能',
      'code-style': '代码风格',
      'best-practice': '最佳实践',
      bug: 'Bug',
    };
    return labels[category] || category;
  };

  return (
    <div className="max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">代码审查</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary">语言</label>
              <select
                value={language}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value)}
                className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary">待审查代码</label>
            <textarea
              value={code}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCode(e.target.value)}
              placeholder="粘贴代码进行审查..."
              className="w-full h-48 mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none"
            />
          </div>

          <Button onClick={handleReview} disabled={isLoading || !code.trim()}>
            {isLoading ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
            {isLoading ? '审查中...' : '开始审查'}
          </Button>
        </CardContent>
      </Card>

      {result && !result.error && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">审查结果</CardTitle>
              <div className="flex items-center gap-2">
                <div className={`w-16 h-16 rounded-full ${
                  result.score >= 80 ? 'bg-green-500/20' :
                  result.score >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                } flex items-center justify-center`}>
                  <span className={`text-2xl font-bold ${
                    result.score >= 80 ? 'text-green-500' :
                    result.score >= 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {result.score}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="text-sm text-text-muted">总结</div>
                <div className="text-sm mt-1">{result.summary}</div>
              </div>

              {result.suggestions && result.suggestions.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">改进建议</div>
                  <div className="space-y-1">
                    {result.suggestions.map((s: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Icon name="check" size={14} className="text-tap-orange mt-0.5" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.issues && result.issues.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">发现问题 ({result.issues.length})</div>
                  <div className="space-y-2">
                    {result.issues.map((issue: ReviewIssue) => (
                      <div key={issue.id} className="p-3 bg-surface-2 rounded-lg border-l-4" style={{ borderLeftColor: getSeverityColor(issue.severity) }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                          <Badge variant="default">{getCategoryLabel(issue.category)}</Badge>
                        </div>
                        <div className="text-sm">{issue.message}</div>
                        <div className="text-xs text-text-muted mt-1">{issue.suggestion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {result?.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-500">
          {result.error}
        </div>
      )}
    </div>
  );
}

function DocGenPanel() {
  const [type, setType] = useState<'readme' | 'api' | 'changelog' | 'comment' | 'architecture'>('readme');
  const [code, setCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const genResult = await aiDocGeneratorService.generate({
        type,
        code,
        projectName,
      });
      setResult(genResult);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">文档生成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary">文档类型</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
              {[
                { value: 'readme', label: 'README', icon: 'file' },
                { value: 'api', label: 'API 文档', icon: 'api' },
                { value: 'changelog', label: 'CHANGELOG', icon: 'git-log' },
                { value: 'comment', label: '代码注释', icon: 'comment' },
                { value: 'architecture', label: '架构文档', icon: 'layout' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setType(item.value as any)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    type === item.value
                      ? 'border-tap-orange bg-tap-orange/5'
                      : 'border-border hover:border-tap-orange/30'
                  }`}
                >
                  <Icon name={item.icon as any} size={16} className="mb-1" />
                  <div className="text-sm font-medium">{item.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary">项目名称</label>
            <Input
              value={projectName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
              placeholder="输入项目名称"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary">代码内容</label>
            <textarea
              value={code}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCode(e.target.value)}
              placeholder="粘贴代码或描述项目..."
              className="w-full h-48 mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none"
            />
          </div>

          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
            {isLoading ? '生成中...' : '生成文档'}
          </Button>
        </CardContent>
      </Card>

      {result && !result.error && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">生成结果</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(result.content)}>
                <Icon name="copy" size={14} /> 复制
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-surface-2 rounded-lg p-4 overflow-auto text-sm font-mono whitespace-pre-wrap max-h-96">
              {result.content}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TutorPanel() {
  const [lessons, setLessons] = useState<TutorLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<TutorLesson | null>(null);
  const [session, setSession] = useState<TutorSession | null>(null);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLessons(aiTutorService.getLessons());
  }, []);

  const handleSelectLesson = (lesson: TutorLesson) => {
    setSelectedLesson(lesson);
    const newSession = aiTutorService.createSession(lesson.id);
    setSession(newSession);
    loadStep(newSession);
  };

  const loadStep = async (sess: TutorSession) => {
    try {
      const stepContent = await aiTutorService.getStepContent(sess.id);
      setCurrentStep(stepContent);
      setFeedback(null);
      setAnswer('');
    } catch {
      // 错误处理
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session || !answer.trim()) return;
    setIsLoading(true);
    try {
      const fb = await aiTutorService.submitAnswer(session.id, answer);
      setFeedback(fb);
      if (fb.nextStep !== undefined) {
        const updatedSession = aiTutorService.getSession(session.id);
        if (updatedSession) {
          setSession(updatedSession);
          setTimeout(() => loadStep(updatedSession), 500);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'beginner': return '入门';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      {!selectedLesson ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">选择课程</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson)}
                  className="p-4 rounded-lg border border-border hover:border-tap-orange/30 text-left transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(lesson.category)}>
                      {getCategoryLabel(lesson.category)}
                    </Badge>
                    <span className="text-xs text-text-muted">{lesson.duration}分钟</span>
                  </div>
                  <div className="font-medium">{lesson.title}</div>
                  <div className="text-xs text-text-muted mt-1">{lesson.description}</div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {lesson.objectives.slice(0, 3).map((obj, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 bg-surface-2 rounded">{obj}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{selectedLesson.title}</CardTitle>
                  <div className="text-xs text-text-muted mt-1">
                    步骤 {(session?.currentStep ?? 0) + 1} / {selectedLesson.steps.length}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-tap-orange transition-all"
                      style={{ width: `${session?.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-sm">{session?.progress || 0}%</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedLesson(null);
                    setSession(null);
                  }}>
                    <Icon name="arrow-left" size={14} /> 返回
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep && currentStep.type !== 'summary' && (
                <>
                  <div className="p-4 bg-surface-2 rounded-lg">
                    <div className="text-sm text-text-muted mb-2">步骤说明</div>
                    <div className="text-sm">{currentStep.content}</div>
                  </div>

                  {currentStep.code && (
                    <div className="p-4 bg-surface-2 rounded-lg">
                      <div className="text-sm text-text-muted mb-2">参考代码</div>
                      <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto">
                        {currentStep.code}
                      </pre>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-text-secondary">你的答案</label>
                    <textarea
                      value={answer}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)}
                      placeholder="输入你的答案或代码..."
                      className="w-full h-32 mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  <Button onClick={handleSubmitAnswer} disabled={isLoading || !answer.trim()}>
                    {isLoading ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
                    {isLoading ? '提交中...' : '提交答案'}
                  </Button>

                  {feedback && (
                    <div className={`p-4 rounded-lg border ${
                      feedback.score && feedback.score >= 80 ? 'bg-green-500/10 border-green-500/30' :
                      'bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={feedback.score && feedback.score >= 80 ? 'bg-green-500' : 'bg-yellow-500'}>
                          评分: {feedback.score || '-'}
                        </Badge>
                      </div>
                      <div className="text-sm">{feedback.content}</div>
                    </div>
                  )}
                </>
              )}

              {currentStep && currentStep.type === 'summary' && (
                <div className="text-center py-8">
                  <Icon name="trophy" size={48} className="mx-auto text-tap-orange mb-4" />
                  <div className="text-xl font-bold">恭喜完成课程！</div>
                  <div className="text-sm text-text-muted mt-2">{currentStep.content}</div>
                  <Button mt-4 onClick={() => {
                    setSelectedLesson(null);
                    setSession(null);
                  }}>
                    <Icon name="arrow-left" size={14} className="mr-2" /> 返回课程列表
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function TeamPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', tags: '' });

  useEffect(() => {
    refreshKnowledge();
  }, []);

  const refreshKnowledge = () => {
    setKnowledgeList(teamKnowledgeBase.getAllKnowledge());
  };

  const handleSearch = () => {
    const results = teamKnowledgeBase.searchKnowledge(searchQuery);
    setKnowledgeList(results.entries);
  };

  const handleAddEntry = () => {
    teamKnowledgeBase.addKnowledge({
      title: newEntry.title,
      content: newEntry.content,
      tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setNewEntry({ title: '', content: '', tags: '' });
    refreshKnowledge();
  };

  const standards = teamKnowledgeBase.getTeamStandards();

  return (
    <div className="max-w-4xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">知识库</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="搜索知识..."
                className="flex-1"
              />
              <Button size="sm" onClick={handleSearch}>
                <Icon name="search" size={14} />
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {knowledgeList.length === 0 ? (
                <div className="text-sm text-text-muted">暂无知识条目</div>
              ) : (
                knowledgeList.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedEntry?.id === entry.id ? 'border-tap-orange bg-tap-orange/5' : 'border-border hover:border-tap-orange/30'
                    }`}
                  >
                    <div className="font-medium text-sm">{entry.title}</div>
                    <div className="flex gap-1 mt-1">
                      {entry.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="default" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>

            {selectedEntry && (
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="font-medium text-sm">{selectedEntry.title}</div>
                <div className="text-xs text-text-muted mt-1">
                  创建于 {new Date(selectedEntry.createdAt).toLocaleDateString()}
                </div>
                <div className="text-sm mt-2 line-clamp-3">{selectedEntry.content}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">添加知识</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={newEntry.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({ ...newEntry, title: e.target.value })}
              placeholder="标题"
            />
            <textarea
              value={newEntry.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewEntry({ ...newEntry, content: e.target.value })}
              placeholder="内容..."
              className="w-full h-24 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none"
            />
            <Input
              value={newEntry.tags}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({ ...newEntry, tags: e.target.value })}
              placeholder="标签（逗号分隔）"
            />
            <Button onClick={handleAddEntry} disabled={!newEntry.title || !newEntry.content}>
              添加
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">团队规范</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {standards.map((standard) => (
              <div key={standard.id} className="p-3 bg-surface-2 rounded-lg">
                <div className="font-medium text-sm">{standard.name}</div>
                <div className="text-xs text-text-muted mt-1">{standard.language}</div>
                <div className="text-xs mt-2">
                  {standard.rules.slice(0, 3).map((rule: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-1">
                      <Icon name="check" size={12} className="text-tap-orange mt-0.5" />
                      <span>{rule.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FineTunePanel() {
  const [tasks, setTasks] = useState<FineTuneTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<FineTuneTask | null>(null);
  const [newTask, setNewTask] = useState({ name: '', modelId: 'ollama-general-7b', datasetName: '', epochs: 3 });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    refreshTasks();
  }, []);

  const refreshTasks = () => {
    setTasks(localFineTuneService.getAllTasks());
  };

  const handleCreateTask = async () => {
    setIsCreating(true);
    try {
      const dataset = await localFineTuneService.createDataset(newTask.datasetName, '', '/tmp/dataset.json');
      const task = await localFineTuneService.createFineTuneTask(
        newTask.name,
        newTask.modelId,
        dataset.id,
        'lora',
        { epochs: newTask.epochs }
      );
      setSelectedTask(task);
      setNewTask({ name: '', modelId: 'ollama-general-7b', datasetName: '', epochs: 3 });
      refreshTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartTask = async (taskId: string) => {
    await localFineTuneService.startFineTune(taskId);
    const interval = setInterval(() => {
      const updated = localFineTuneService.getTask(taskId);
      if (updated) {
        setSelectedTask(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(interval);
          refreshTasks();
        }
      }
    }, 500);
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">创建微调任务</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={newTask.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, name: e.target.value })}
              placeholder="任务名称"
            />
            <Input
              value={newTask.datasetName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, datasetName: e.target.value })}
              placeholder="数据集名称"
            />
            <select
              value={newTask.modelId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTask({ ...newTask, modelId: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
            >
              <option value="ollama-general-7b">Qwen2.5 7B</option>
              <option value="ollama-coder-14b">DeepSeek Coder 14B</option>
            </select>
            <Input
              type="number"
              value={newTask.epochs}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, epochs: parseInt(e.target.value) })}
              placeholder="训练轮数"
            />
            <Button onClick={handleCreateTask} disabled={isCreating || !newTask.name}>
              {isCreating ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
              {isCreating ? '创建中...' : '创建任务'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">任务列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-auto">
            {tasks.length === 0 ? (
              <div className="text-sm text-text-muted">暂无任务</div>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTask?.id === task.id ? 'border-tap-orange bg-tap-orange/5' : 'border-border hover:border-tap-orange/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{task.name}</span>
                    <Badge className={
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'running' ? 'bg-yellow-500' :
                      task.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                    }>
                      {task.status}
                    </Badge>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-tap-orange" style={{ width: `${task.progress}%` }} />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">任务详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTask ? (
              <>
                <div className="font-medium">{selectedTask.name}</div>
                <div className="text-sm text-text-muted">状态: {selectedTask.status}</div>
                <div className="text-sm text-text-muted">进度: {selectedTask.progress}%</div>
                {selectedTask.loss !== undefined && (
                  <div className="text-sm">损失: {selectedTask.loss.toFixed(4)}</div>
                )}
                {selectedTask.accuracy !== undefined && (
                  <div className="text-sm">准确率: {(selectedTask.accuracy * 100).toFixed(1)}%</div>
                )}
                {selectedTask.status === 'pending' && (
                  <Button onClick={() => handleStartTask(selectedTask.id)}>开始训练</Button>
                )}
                {selectedTask.status === 'completed' && (
                  <div className="text-sm text-green-500">训练完成！</div>
                )}
              </>
            ) : (
              <div className="text-sm text-text-muted">选择一个任务查看详情</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type PluginCategory = AIPlugin['category'] | 'all';

function PluginsPanel() {
  const [plugins, setPlugins] = useState<AIPlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PluginCategory>('all');

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = () => {
    let result = pluginMarketplace.getAllPlugins();
    if (activeCategory !== 'all') {
      result = pluginMarketplace.getPluginsByCategory(activeCategory as AIPlugin['category']);
    }
    if (searchQuery) {
      result = pluginMarketplace.searchPlugins(searchQuery);
    }
    setPlugins(result);
  };

  const handleInstall = async (pluginId: string) => {
    await pluginMarketplace.installPlugin(pluginId);
    loadPlugins();
  };

  const handleUninstall = async (pluginId: string) => {
    await pluginMarketplace.uninstallPlugin(pluginId);
    loadPlugins();
  };

  const categories: { value: PluginCategory; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'ai', label: 'AI' },
    { value: 'editor', label: '编辑器' },
    { value: 'build', label: '构建' },
    { value: 'theme', label: '主题' },
    { value: 'utility', label: '工具' },
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      ai: 'bg-purple-500',
      editor: 'bg-blue-500',
      build: 'bg-orange-500',
      theme: 'bg-pink-500',
      utility: 'bg-green-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Input
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="搜索插件..."
          className="flex-1 max-w-xs"
        />
        <Button onClick={loadPlugins}>
          <Icon name="search" size={14} className="mr-2" /> 搜索
        </Button>

        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => {
              setActiveCategory(cat.value);
              loadPlugins();
            }}
            className={`px-3 py-1.5 rounded-full text-sm transition-all ${
              activeCategory === cat.value
                ? 'bg-tap-orange text-white'
                : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map((plugin) => (
          <Card key={plugin.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{plugin.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getCategoryColor(plugin.category)}>{plugin.category}</Badge>
                    <span className="text-xs text-text-muted">v{plugin.version}</span>
                    <span className="text-xs text-text-muted">{plugin.author}</span>
                  </div>
                </div>
                <Badge className={(plugin as AIPlugin).installStatus === 'installed' ? 'bg-green-500' : 'bg-gray-500'}>
                  {(plugin as AIPlugin).installStatus === 'installed' ? '已安装' : '未安装'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-sm text-text-secondary mb-2">{plugin.description}</div>
              <div className="flex flex-wrap gap-1 mb-3">
                {plugin.tags.map((tag) => (
                  <Badge key={tag} variant="default" className="text-xs">{tag}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-text-muted">
                  <Icon name="download" size={12} className="inline mr-1" /> {plugin.downloads}
                  <Icon name="star" size={12} className="inline mr-1 ml-2" /> {plugin.stars}
                </div>
                <Button
                  size="sm"
                  variant={(plugin as AIPlugin).installStatus === 'installed' ? 'secondary' : 'primary'}
                  onClick={() => (plugin as AIPlugin).installStatus === 'installed' ? handleUninstall(plugin.id) : handleInstall(plugin.id)}
                >
                  {(plugin as AIPlugin).installStatus === 'installed' ? '卸载' : '安装'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plugins.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          <Icon name="search" size={32} className="mx-auto mb-2" />
          <div>没有找到匹配的插件</div>
        </div>
      )}
    </div>
  );
}
