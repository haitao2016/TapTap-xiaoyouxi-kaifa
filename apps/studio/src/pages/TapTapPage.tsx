import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Icon, Input, Tabs, TabsList, TabsTrigger, TabsContent, Badge, Progress } from '@tapdev/ui';
import { tapTapAuthService, publishService, analyticsService, sdkManagerService } from '@tapdev/core';
import type { TapTapAccount, PublishTask, AnalyticsResult, MetricType, SDKRelease, Announcement } from '@tapdev/core';
import { useAppStore } from '../store/app-store';

export function TapTapPage() {
  const { currentProject } = useAppStore();
  const [activeTab, setActiveTab] = useState('account');
  const [account, setAccount] = useState<TapTapAccount | null>(null);
  const [accounts, setAccounts] = useState<TapTapAccount[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [publishTasks, setPublishTasks] = useState<PublishTask[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResult | null>(null);
  const [sdkReleases, setSdkReleases] = useState<SDKRelease[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [publishVersion, setPublishVersion] = useState('1.0.0');
  const [publishChangelog, setPublishChangelog] = useState('');
  const [grayRelease, setGrayRelease] = useState(false);
  const [grayPercent, setGrayPercent] = useState(10);

  useEffect(() => {
    tapTapAuthService.enableMockMode(true);
    refreshAccount();
    loadSDKInfo();
    loadAnalytics();
  }, []);

  const refreshAccount = () => {
    setAccount(tapTapAuthService.getActiveAccount());
    setAccounts(tapTapAuthService.listAccounts());
  };

  const loadSDKInfo = async () => {
    try {
      const releases = await sdkManagerService.listAvailableVersions('@tapdev/minigame-sdk');
      setSdkReleases(releases);
      const anns = await sdkManagerService.fetchAnnouncements();
      setAnnouncements(anns);
    } catch (e) {
      console.error('加载 SDK 信息失败:', e);
    }
  };

  const loadAnalytics = async () => {
    try {
      const result = await analyticsService.query({
        appId: currentProject?.config.appId || 'demo',
        startDate: '2026-06-01',
        endDate: '2026-06-25',
        metrics: ['dau', 'new_users', 'retention_d1', 'revenue', 'crash_rate'],
        granularity: 'day',
      });
      setAnalyticsData(result);
    } catch (e) {
      console.error('加载数据分析失败:', e);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await tapTapAuthService.exchangeCode('mock-code');
      if (result.success) {
        refreshAccount();
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = (accountId: string) => {
    tapTapAuthService.logout(accountId);
    refreshAccount();
  };

  const handleSwitchAccount = (id: string) => {
    tapTapAuthService.switchAccount(id);
    refreshAccount();
  };

  const handlePublish = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const task = await publishService.publish({
        appId: currentProject.config.appId || 'demo-app',
        version: publishVersion,
        changelog: publishChangelog,
        buildPath: currentProject.config.buildPath,
        grayRelease,
        grayPercent,
      });
      setPublishTasks([task, ...publishTasks]);

      const interval = setInterval(() => {
        const current = publishService.getTask(task.id);
        if (current) {
          setPublishTasks((prev) =>
            prev.map((t) => (t.id === task.id ? current : t))
          );
          if (current.stage === 'completed' || current.stage === 'failed') {
            clearInterval(interval);
          }
        }
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageText = (stage: string) => {
    const map: Record<string, string> = {
      preparing: '准备中',
      packaging: '打包中',
      signing: '签名中',
      uploading: '上传中',
      verifying: '验证中',
      submitting: '提交审核',
      completed: '完成',
      failed: '失败',
    };
    return map[stage] || stage;
  };

  const getMetricLabel = (metric: MetricType) => analyticsService.getMetricLabel(metric);

  const formatNumber = (value?: number) => {
    if (value === undefined || value === null) return '-';
    if (value >= 10000) return (value / 10000).toFixed(1) + '万';
    return value.toLocaleString();
  };

  const getCategoryBadge = (category: string) => {
    const map: Record<string, { variant: string; text: string }> = {
      breaking: { variant: 'error', text: '重大变更' },
      feature: { variant: 'success', text: '新功能' },
      deprecation: { variant: 'warning', text: '弃用' },
      general: { variant: 'default', text: '公告' },
    };
    const info = map[category] || map.general;
    return <Badge variant={info.variant as any}>{info.text}</Badge>;
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border px-4">
          <TabsList className="mt-2">
            <TabsTrigger value="account">账号</TabsTrigger>
            <TabsTrigger value="publish">发布</TabsTrigger>
            <TabsTrigger value="analytics">数据分析</TabsTrigger>
            <TabsTrigger value="sdk">SDK 管理</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="account" className="mt-0">
          <div className="p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {account ? (
                <Card>
                  <CardHeader>
                    <CardTitle>当前账号</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-tap-orange/20 flex items-center justify-center text-tap-orange text-2xl font-bold">
                        {account.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{account.nickname}</div>
                        <div className="text-sm text-text-muted">{account.email || '未设置邮箱'}</div>
                        <div className="flex gap-2 mt-1">
                          {account.scope.map((s) => (
                            <Badge key={s} variant="default">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-text-muted">OpenID</span>
                        <div className="font-mono text-xs">{account.openId}</div>
                      </div>
                      <div>
                        <span className="text-text-muted">登录时间</span>
                        <div>{formatDate(account.loginAt)}</div>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => handleLogout(account.id)}>
                      退出登录
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Icon name="user" size={48} className="mx-auto mb-4 text-text-muted" />
                    <p className="text-text-secondary mb-4">尚未登录 TapTap 开发者账号</p>
                    <Button onClick={handleLogin} disabled={isLoggingIn}>
                      {isLoggingIn ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
                      使用 TapTap 账号登录
                    </Button>
                  </CardContent>
                </Card>
              )}

              {accounts.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">多账号管理</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {accounts.map((acc) => (
                        <div
                          key={acc.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            acc.id === account?.id ? 'bg-tap-orange/10 border border-tap-orange/30' : 'hover:bg-surface-2'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-tap-orange/20 flex items-center justify-center text-tap-orange text-sm font-medium">
                              {acc.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{acc.nickname}</div>
                              <div className="text-xs text-text-muted">{acc.openId}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {acc.id !== account?.id && (
                              <Button size="sm" variant="ghost" onClick={() => handleSwitchAccount(acc.id)}>
                                切换
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleLogout(acc.id)}>
                              移除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="publish" className="mt-0">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">一键发布</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-text-secondary">版本号</label>
                      <Input
                        value={publishVersion}
                        onChange={(e) => setPublishVersion(e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary">App ID</label>
                      <Input
                        value={currentProject?.config.appId || ''}
                        disabled
                        placeholder="未配置"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary">更新日志</label>
                    <textarea
                      value={publishChangelog}
                      onChange={(e) => setPublishChangelog(e.target.value)}
                      placeholder="描述本次更新的内容..."
                      className="w-full mt-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:border-tap-orange/50"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grayRelease}
                        onChange={(e) => setGrayRelease(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">灰度发布</span>
                    </label>
                    {grayRelease && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-muted">灰度比例</span>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={grayPercent}
                          onChange={(e) => setGrayPercent(parseInt(e.target.value))}
                          className="w-32"
                        />
                        <span className="text-sm">{grayPercent}%</span>
                      </div>
                    )}
                  </div>
                  <Button onClick={handlePublish} disabled={isLoading || !account}>
                    {isLoading ? <Icon name="loading" size={14} className="animate-spin mr-2" /> : null}
                    {account ? '发布到 TapTap' : '请先登录'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">发布流程</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {['preparing', 'packaging', 'signing', 'uploading', 'verifying', 'submitting', 'completed'].map((stage, idx) => (
                      <div key={stage} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                            idx <= 6 ? 'bg-tap-orange text-white' : 'bg-surface-2 text-text-muted'
                          }`}>
                            {idx + 1}
                          </div>
                          <span className="text-xs mt-1 text-text-muted">{getStageText(stage)}</span>
                        </div>
                        {idx < 6 && <div className="w-8 h-0.5 bg-surface-2" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {publishTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">发布历史</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {publishTasks.map((task) => (
                        <div key={task.id} className="bg-surface-2 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={task.stage === 'completed' ? 'success' : task.stage === 'failed' ? 'error' : 'default'}>
                                {getStageText(task.stage)}
                              </Badge>
                              <span className="text-sm font-medium">v{task.version}</span>
                            </div>
                            <span className="text-xs text-text-muted">{formatDate(task.startedAt)}</span>
                          </div>
                          <Progress value={task.progress} className="h-1" />
                          {task.error && (
                            <p className="text-xs text-red-500 mt-2">{task.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-5 gap-4">
                {(['dau', 'new_users', 'retention_d1', 'revenue', 'crash_rate'] as MetricType[]).map((metric) => (
                  <Card key={metric}>
                    <CardContent className="p-4">
                      <div className="text-xs text-text-muted mb-1">{getMetricLabel(metric)}</div>
                      <div className="text-xl font-bold">
                        {formatNumber(analyticsData?.totals?.[metric])}
                      </div>
                      {analyticsData?.changes?.[metric] !== undefined && (
                        <div className={`text-xs mt-1 ${
                          analyticsData.changes[metric]! >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analyticsData.changes[metric]! >= 0 ? '↑' : '↓'} {Math.abs(analyticsData.changes[metric]!).toFixed(1)}%
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">数据趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-around gap-1">
                    {analyticsData?.series?.slice(-14).map((point, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-tap-orange/60 rounded-t"
                          style={{ height: `${Math.min(100, (point.values.dau || 0) / 10000 * 100)}%` }}
                        />
                        <span className="text-xs text-text-muted mt-1">
                          {point.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">核心指标</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {(['dau', 'mau', 'new_users', 'session_duration'] as MetricType[]).map((metric) => (
                        <div key={metric} className="flex items-center justify-between">
                          <span className="text-sm text-text-secondary">{getMetricLabel(metric)}</span>
                          <span className="text-sm font-medium">{formatNumber(analyticsData?.totals?.[metric])}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {(['retention_d1', 'retention_d7', 'arppu', 'crash_rate'] as MetricType[]).map((metric) => (
                        <div key={metric} className="flex items-center justify-between">
                          <span className="text-sm text-text-secondary">{getMetricLabel(metric)}</span>
                          <span className="text-sm font-medium">
                            {metric.includes('retention') || metric === 'crash_rate'
                              ? `${(analyticsData?.totals?.[metric] || 0).toFixed(1)}%`
                              : formatNumber(analyticsData?.totals?.[metric])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sdk" className="mt-0">
          <div className="p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">SDK 版本</CardTitle>
                    <Button size="sm" variant="ghost" onClick={loadSDKInfo}>
                      <Icon name="refresh" size={14} /> 检查更新
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sdkReleases.length > 0 ? (
                      sdkReleases.map((release) => (
                        <div key={release.version} className="bg-surface-2 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{release.packageName}</span>
                              <Badge variant={release.breaking ? 'error' : 'default'}>
                                v{release.version}
                              </Badge>
                              {release.breaking && <Badge variant="error">Breaking</Badge>}
                            </div>
                            <Button size="sm">升级</Button>
                          </div>
                          <p className="text-xs text-text-muted mb-2">
                            发布日期: {release.releaseDate}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{release.changelog}</p>
                          {release.compatNotes.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs text-text-muted mb-1">兼容性提示:</p>
                              <ul className="text-xs text-text-secondary space-y-1">
                                {release.compatNotes.map((note, idx) => (
                                  <li key={idx}>• {note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-text-muted py-8">
                        暂无 SDK 版本信息
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {announcements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">官方公告</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {announcements.map((ann) => (
                        <div key={ann.id} className="border border-border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getCategoryBadge(ann.category)}
                              <span className="font-medium text-sm">{ann.title}</span>
                            </div>
                            <span className="text-xs text-text-muted">
                              {formatDate(ann.publishedAt)}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary">{ann.content}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
