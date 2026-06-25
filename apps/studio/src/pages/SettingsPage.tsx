import { useState, useEffect } from 'react';
import { Input, Button } from '@tapdev/ui';
import { useAppStore } from '../store/app-store';
import { projectManager, i18n } from '@tapdev/core';
import type { Locale } from '@tapdev/core';
import { UpdateChecker } from '../components/UpdateChecker';

export function SettingsPage() {
  const { settings } = useAppStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [currentLocale, setCurrentLocale] = useState<Locale>(i18n.getCurrent());

  useEffect(() => {
    const unsubscribe = i18n.onChange((locale) => {
      setCurrentLocale(locale);
    });
    return unsubscribe;
  }, []);

  const handleSave = () => {
    projectManager.updateSettings(localSettings);
  };

  const handleLocaleChange = (locale: Locale) => {
    i18n.setLocale(locale);
    setCurrentLocale(locale);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">{i18n.t('settings.title') || '设置'}</h2>
        <p className="text-sm text-text-secondary">应用偏好与开发环境配置</p>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="text-sm font-semibold">编辑器</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="字体大小"
            type="number"
            value={localSettings.editorFontSize}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, editorFontSize: Number(e.target.value) })
            }
          />
          <Input
            label="Tab 宽度"
            type="number"
            value={localSettings.editorTabSize}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, editorTabSize: Number(e.target.value) })
            }
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="text-sm font-semibold">调试</h3>
        <Input
          label="调试服务器端口"
          type="number"
          value={localSettings.debugServerPort}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, debugServerPort: Number(e.target.value) })
          }
        />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="text-sm font-semibold">构建</h3>
        <Input
          label="默认输出路径"
          value={localSettings.buildOutputPath}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, buildOutputPath: e.target.value })
          }
        />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="text-sm font-semibold">外观</h3>
        <div className="flex gap-2">
          {(['dark', 'light', 'system'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => setLocalSettings({ ...localSettings, theme })}
              className={`rounded-lg px-4 py-2 text-sm ${
                localSettings.theme === theme
                  ? 'bg-tap-orange text-white'
                  : 'bg-surface-2 text-text-secondary'
              }`}
            >
              {theme === 'dark' ? '深色' : theme === 'light' ? '浅色' : '跟随系统'}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="text-sm font-semibold">{i18n.t('settings.language') || '语言'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {i18n.getAvailable().map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={`rounded-lg px-4 py-3 text-sm text-left transition-colors ${
                currentLocale === locale
                  ? 'bg-tap-orange text-white'
                  : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
              }`}
            >
              <div className="font-medium">{i18n.getLabel(locale)}</div>
              <div className="text-xs opacity-75">{locale}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          当前语言: {i18n.getLabel(currentLocale)} ({currentLocale})
        </p>
      </section>

      <UpdateChecker />

      <Button onClick={handleSave}>保存设置</Button>
    </div>
  );
}
