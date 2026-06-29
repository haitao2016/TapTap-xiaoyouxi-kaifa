import { useState } from 'react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Icon,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Slider,
} from '@tapdev/ui';
import { useAppStore } from '../store/app-store';

interface Shortcut {
  id: string;
  name: string;
  keys: string;
  category: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'save', name: '保存文件', keys: 'Ctrl+S', category: '文件' },
  { id: 'save-all', name: '保存所有文件', keys: 'Ctrl+Shift+S', category: '文件' },
  { id: 'new-file', name: '新建文件', keys: 'Ctrl+N', category: '文件' },
  { id: 'close-tab', name: '关闭标签页', keys: 'Ctrl+W', category: '文件' },
  { id: 'format', name: '格式化代码', keys: 'Shift+Alt+F', category: '编辑' },
  { id: 'find', name: '查找', keys: 'Ctrl+F', category: '编辑' },
  { id: 'replace', name: '替换', keys: 'Ctrl+H', category: '编辑' },
  { id: 'undo', name: '撤销', keys: 'Ctrl+Z', category: '编辑' },
  { id: 'redo', name: '重做', keys: 'Ctrl+Y', category: '编辑' },
  { id: 'comment', name: '切换注释', keys: 'Ctrl+/', category: '编辑' },
  { id: 'start-debug', name: '开始调试', keys: 'F5', category: '调试' },
  { id: 'stop-debug', name: '停止调试', keys: 'Shift+F5', category: '调试' },
  { id: 'step-over', name: '单步跳过', keys: 'F10', category: '调试' },
  { id: 'step-into', name: '单步进入', keys: 'F11', category: '调试' },
  { id: 'toggle-breakpoint', name: '切换断点', keys: 'F9', category: '调试' },
  { id: 'build', name: '开始构建', keys: 'Ctrl+B', category: '构建' },
  { id: 'clean-build', name: '清理构建', keys: 'Ctrl+Shift+B', category: '构建' },
  { id: 'command-palette', name: '命令面板', keys: 'Ctrl+Shift+P', category: '通用' },
  { id: 'quick-open', name: '快速打开', keys: 'Ctrl+P', category: '通用' },
  { id: 'toggle-sidebar', name: '切换侧边栏', keys: 'Ctrl+B', category: '视图' },
];

const THEME_PRESETS = [
  { id: 'dark', name: '深色', mode: 'dark', primary: '#f97316' },
  { id: 'light', name: '浅色', mode: 'light', primary: '#f97316' },
  { id: 'dracula', name: 'Dracula', mode: 'dark', primary: '#bd93f9' },
  { id: 'monokai', name: 'Monokai', mode: 'dark', primary: '#a6e22e' },
  { id: 'github-dark', name: 'GitHub Dark', mode: 'dark', primary: '#58a6ff' },
  { id: 'solarized', name: 'Solarized', mode: 'dark', primary: '#268bd2' },
];

export function SettingsPage() {
  const { settings, updateSettings, currentProject } = useAppStore();
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const shortcutCategories = [...new Set(shortcuts.map((s) => s.category))];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">设置</h2>
          <p className="text-sm text-text-secondary">自定义 TapDev Studio 的外观和行为</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <Badge variant="success" className="animate-pulse">
              <Icon name="check" size={12} />
              已保存
            </Badge>
          )}
          <Button onClick={handleSave}>
            <Icon name="save" size={14} />
            保存设置
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="hidden md:block w-52 shrink-0 border-r border-border bg-surface-1 p-2">
          <nav className="space-y-1">
            {[
              { id: 'general', name: '通用设置', icon: 'settings' },
              { id: 'theme', name: '主题外观', icon: 'palette' },
              { id: 'editor', name: '编辑器', icon: 'file-text' },
              { id: 'shortcuts', name: '快捷键', icon: 'keyboard' },
              { id: 'build', name: '构建设置', icon: 'build' },
              { id: 'debug', name: '调试设置', icon: 'bug' },
              { id: 'about', name: '关于', icon: 'info' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeTab === item.id
                    ? 'bg-tap-orange/10 text-tap-orange'
                    : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                }`}
              >
                <Icon name={item.icon} size={16} />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-2xl p-6 space-y-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">通用设置</h3>

                <Card>
                  <CardHeader>
                    <CardTitle>语言</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm text-text-muted">界面语言</label>
                        <Select
                          value={settings.language || 'zh-CN'}
                          onValueChange={(v: string) =>
                            updateSettings({ language: v as 'zh-CN' | 'en-US' })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="zh-CN">简体中文</SelectItem>
                            <SelectItem value="en-US">English</SelectItem>
                            <SelectItem value="ja-JP">日本語</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>启动与退出</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">启动时恢复上次项目</div>
                        <div className="text-sm text-text-muted">
                          启动时自动打开上次关闭时的项目
                        </div>
                      </div>
                      <Switch
                        checked={settings.restoreLastProject ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ restoreLastProject: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">自动检查更新</div>
                        <div className="text-sm text-text-muted">启动时自动检查新版本</div>
                      </div>
                      <Switch
                        checked={settings.autoCheckUpdates ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ autoCheckUpdates: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">发送使用统计</div>
                        <div className="text-sm text-text-muted">帮助我们改进产品（匿名）</div>
                      </div>
                      <Switch
                        checked={settings.sendTelemetry ?? false}
                        onCheckedChange={(v: boolean) => updateSettings({ sendTelemetry: v })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>文件管理</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">自动保存</div>
                        <div className="text-sm text-text-muted">编辑时自动保存文件</div>
                      </div>
                      <Switch
                        checked={settings.autoSave ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ autoSave: v })}
                      />
                    </div>
                    {settings.autoSave && (
                      <div>
                        <label className="mb-2 block text-sm text-text-muted">
                          自动保存间隔（秒）
                        </label>
                        <Slider
                          value={[settings.autoSaveInterval || 30]}
                          onValueChange={([v]: number[]) => updateSettings({ autoSaveInterval: v })}
                          min={5}
                          max={300}
                          step={5}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">主题外观</h3>

                <Card>
                  <CardHeader>
                    <CardTitle>主题预设</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {THEME_PRESETS.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() =>
                            updateSettings({
                              theme: theme.mode as 'dark' | 'light',
                              accentColor: theme.primary,
                            })
                          }
                          className={`rounded-lg border-2 p-3 transition-all ${
                            settings.theme === theme.mode && settings.accentColor === theme.primary
                              ? 'border-tap-orange'
                              : 'border-border hover:border-border-dark'
                          }`}
                        >
                          <div
                            className="h-16 rounded-md mb-2"
                            style={{
                              backgroundColor: theme.mode === 'dark' ? '#1a1a1f' : '#ffffff',
                              border: `1px solid ${theme.mode === 'dark' ? '#2a2a30' : '#e5e5e5'}`,
                            }}
                          >
                            <div
                              className="h-2 rounded-t-md"
                              style={{ backgroundColor: theme.primary }}
                            />
                          </div>
                          <div className="text-sm font-medium">{theme.name}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>外观设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-text-muted">主题模式</label>
                      <Select
                        value={settings.theme || 'dark'}
                        onValueChange={(v: string) =>
                          updateSettings({ theme: v as 'dark' | 'light' | 'system' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">深色模式</SelectItem>
                          <SelectItem value="light">浅色模式</SelectItem>
                          <SelectItem value="system">跟随系统</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-text-muted">主色调</label>
                      <div className="flex gap-2">
                        {['#f97316', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'].map(
                          (color) => (
                            <button
                              key={color}
                              onClick={() => updateSettings({ accentColor: color })}
                              className={`h-8 w-8 rounded-full border-2 transition-all ${
                                settings.accentColor === color
                                  ? 'border-white scale-110'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">紧凑模式</div>
                        <div className="text-sm text-text-muted">
                          减少 UI 元素间距，显示更多内容
                        </div>
                      </div>
                      <Switch
                        checked={settings.compactMode ?? false}
                        onCheckedChange={(v: boolean) => updateSettings({ compactMode: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">动画效果</div>
                        <div className="text-sm text-text-muted">启用界面过渡动画</div>
                      </div>
                      <Switch
                        checked={settings.animationsEnabled ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ animationsEnabled: v })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>字体设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-text-muted">UI 字体大小</label>
                      <Slider
                        value={[settings.uiFontSize || 14]}
                        onValueChange={([v]: number[]) => updateSettings({ uiFontSize: v })}
                        min={12}
                        max={20}
                        step={1}
                      />
                      <div className="mt-1 text-xs text-text-muted text-right">
                        {settings.uiFontSize || 14}px
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">编辑器设置</h3>

                <Card>
                  <CardHeader>
                    <CardTitle>基础设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-text-muted">字体大小</label>
                      <Slider
                        value={[settings.editorFontSize || 14]}
                        onValueChange={([v]: number[]) => updateSettings({ editorFontSize: v })}
                        min={10}
                        max={24}
                        step={1}
                      />
                      <div className="mt-1 text-xs text-text-muted text-right">
                        {settings.editorFontSize || 14}px
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-text-muted">制表符大小</label>
                      <Select
                        value={String(settings.editorTabSize || 4)}
                        onValueChange={(v: string) =>
                          updateSettings({ editorTabSize: parseInt(v) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 空格</SelectItem>
                          <SelectItem value="4">4 空格</SelectItem>
                          <SelectItem value="8">8 空格</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">使用空格代替 Tab</div>
                        <div className="text-sm text-text-muted">按 Tab 键时插入空格</div>
                      </div>
                      <Switch
                        checked={settings.editorUseSpaces ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ editorUseSpaces: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">显示行号</div>
                        <div className="text-sm text-text-muted">在编辑器左侧显示行号</div>
                      </div>
                      <Switch
                        checked={settings.editorLineNumbers ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ editorLineNumbers: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">显示迷你地图</div>
                        <div className="text-sm text-text-muted">在编辑器右侧显示代码缩略图</div>
                      </div>
                      <Switch
                        checked={settings.editorMinimap ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ editorMinimap: v })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>代码格式化</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">保存时自动格式化</div>
                        <div className="text-sm text-text-muted">保存文件时自动格式化代码</div>
                      </div>
                      <Switch
                        checked={settings.formatOnSave ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ formatOnSave: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">粘贴时格式化</div>
                        <div className="text-sm text-text-muted">粘贴代码时自动格式化</div>
                      </div>
                      <Switch
                        checked={settings.formatOnPaste ?? false}
                        onCheckedChange={(v: boolean) => updateSettings({ formatOnPaste: v })}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-text-muted">单行长度</label>
                      <Slider
                        value={[settings.editorLineWidth || 100]}
                        onValueChange={([v]: number[]) => updateSettings({ editorLineWidth: v })}
                        min={60}
                        max={200}
                        step={10}
                      />
                      <div className="mt-1 text-xs text-text-muted text-right">
                        {settings.editorLineWidth || 100} 字符
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">快捷键</h3>
                  <Button size="sm" variant="outline">
                    <Icon name="refresh-ccw" size={14} />
                    恢复默认
                  </Button>
                </div>

                <div className="relative">
                  <Icon
                    name="search"
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input placeholder="搜索快捷键..." className="pl-10" />
                </div>

                {shortcutCategories.map((category) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle>{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {shortcuts
                          .filter((s) => s.category === category)
                          .map((shortcut) => (
                            <div
                              key={shortcut.id}
                              className="flex items-center justify-between px-4 py-3 hover:bg-surface-2"
                            >
                              <span className="text-sm">{shortcut.name}</span>
                              <div className="flex items-center gap-2">
                                {editingShortcut === shortcut.id ? (
                                  <Input
                                    value={shortcut.keys}
                                    className="w-40 text-center font-mono text-sm"
                                    autoFocus
                                    onBlur={() => setEditingShortcut(null)}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                      if (e.key === 'Enter') {
                                        setEditingShortcut(null);
                                      }
                                    }}
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingShortcut(shortcut.id)}
                                    className="rounded-md bg-surface-2 px-3 py-1 font-mono text-xs hover:bg-surface-3 transition-colors"
                                  >
                                    {shortcut.keys}
                                  </button>
                                )}
                                <Button size="sm" variant="ghost">
                                  <Icon name="edit-3" size={14} />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'build' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">构建设置</h3>

                <Card>
                  <CardHeader>
                    <CardTitle>Unity 设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-text-muted">Unity 路径</label>
                      <div className="flex gap-2">
                        <Input value={settings.unityPath || ''} placeholder="自动检测" readOnly />
                        <Button variant="outline">
                          <Icon name="folder" size={14} />
                          浏览
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        留空则自动检测系统中的 Unity 安装
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>默认构建选项</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">压缩打包</div>
                        <div className="text-sm text-text-muted">构建完成后自动打包为 game.zip</div>
                      </div>
                      <Switch
                        checked={settings.defaultCompress ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ defaultCompress: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">WASM 分包</div>
                        <div className="text-sm text-text-muted">WebGL 构建时启用 WASM 分包</div>
                      </div>
                      <Switch
                        checked={settings.defaultWasmSplit ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ defaultWasmSplit: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">构建完成后通知</div>
                        <div className="text-sm text-text-muted">构建完成时发送系统通知</div>
                      </div>
                      <Switch
                        checked={settings.buildNotification ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ buildNotification: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">保留构建历史</div>
                        <div className="text-sm text-text-muted">最多保留的构建记录数量</div>
                      </div>
                      <Select
                        value={String(settings.maxBuildHistory || 20)}
                        onValueChange={(v: string) =>
                          updateSettings({ maxBuildHistory: parseInt(v) })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 个</SelectItem>
                          <SelectItem value="20">20 个</SelectItem>
                          <SelectItem value="50">50 个</SelectItem>
                          <SelectItem value="100">100 个</SelectItem>
                          <SelectItem value="0">全部保留</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>输出设置</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="mb-2 block text-sm text-text-muted">默认输出路径</label>
                      <div className="flex gap-2">
                        <Input
                          value={settings.defaultBuildPath || ''}
                          placeholder="项目目录/Builds"
                          readOnly
                        />
                        <Button variant="outline">
                          <Icon name="folder" size={14} />
                          浏览
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">调试设置</h3>

                <Card>
                  <CardHeader>
                    <CardTitle>常规设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">启动时自动断点</div>
                        <div className="text-sm text-text-muted">调试启动时在第一行代码暂停</div>
                      </div>
                      <Switch
                        checked={settings.debugBreakOnStart ?? false}
                        onCheckedChange={(v: boolean) => updateSettings({ debugBreakOnStart: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">异常时中断</div>
                        <div className="text-sm text-text-muted">遇到未捕获异常时自动暂停</div>
                      </div>
                      <Switch
                        checked={settings.debugBreakOnException ?? true}
                        onCheckedChange={(v: boolean) =>
                          updateSettings({ debugBreakOnException: v })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">显示内联变量值</div>
                        <div className="text-sm text-text-muted">在代码中显示变量的当前值</div>
                      </div>
                      <Switch
                        checked={settings.debugInlineValues ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ debugInlineValues: v })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>日志设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-text-muted">最大日志行数</label>
                      <Slider
                        value={[settings.maxLogLines || 1000]}
                        onValueChange={([v]: number[]) => updateSettings({ maxLogLines: v })}
                        min={100}
                        max={10000}
                        step={100}
                      />
                      <div className="mt-1 text-xs text-text-muted text-right">
                        {settings.maxLogLines || 1000} 行
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">日志时间戳</div>
                        <div className="text-sm text-text-muted">在日志中显示时间戳</div>
                      </div>
                      <Switch
                        checked={settings.logTimestamps ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ logTimestamps: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">自动滚动</div>
                        <div className="text-sm text-text-muted">新日志产生时自动滚动到底部</div>
                      </div>
                      <Switch
                        checked={settings.autoScrollLog ?? true}
                        onCheckedChange={(v: boolean) => updateSettings({ autoScrollLog: v })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">关于</h3>

                <Card>
                  <CardContent className="text-center py-8">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-tap-orange to-orange-500">
                      <Icon name="zap" size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">TapDev Studio</h2>
                    <p className="mt-1 text-text-muted">v1.0.0-beta.1</p>
                    <div className="mt-6 flex items-center justify-center gap-2">
                      <Badge variant="success">最新版本</Badge>
                      <Button size="sm" variant="outline">
                        <Icon name="download" size={14} />
                        检查更新
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>系统信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">应用版本</span>
                      <span className="font-mono">1.0.0-beta.1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Electron 版本</span>
                      <span className="font-mono">28.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Node.js 版本</span>
                      <span className="font-mono">18.19.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Chrome 版本</span>
                      <span className="font-mono">120.0.0</span>
                    </div>
                    {currentProject && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">当前项目</span>
                        <span className="truncate ml-4">{currentProject.name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>链接</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <a
                      href="#"
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-surface-2 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Icon name="globe" size={18} className="text-tap-orange" />
                        官方网站
                      </span>
                      <Icon name="external-link" size={14} className="text-text-muted" />
                    </a>
                    <a
                      href="#"
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-surface-2 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Icon name="book-open" size={18} className="text-tap-orange" />
                        文档中心
                      </span>
                      <Icon name="external-link" size={14} className="text-text-muted" />
                    </a>
                    <a
                      href="#"
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-surface-2 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Icon name="github" size={18} className="text-tap-orange" />
                        GitHub
                      </span>
                      <Icon name="external-link" size={14} className="text-text-muted" />
                    </a>
                    <a
                      href="#"
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-surface-2 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Icon name="message-circle" size={18} className="text-tap-orange" />
                        反馈问题
                      </span>
                      <Icon name="external-link" size={14} className="text-text-muted" />
                    </a>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>许可证</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-text-muted">MIT License © 2024 TapDev Team</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
