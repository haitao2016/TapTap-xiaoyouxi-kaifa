/**
 * AI Settings Panel - AI 设置面板
 * 包含本地模型配置选项
 */

import React, { useState } from 'react';
import { LocalModelManager } from './LocalModelManager';

export type AIProviderType = 'openai' | 'claude' | 'ollama' | 'local' | 'mock';

interface AISettingsPanelProps {
  currentProvider: AIProviderType;
  onProviderChange: (provider: AIProviderType) => void;
  onSave: (settings: AISettings) => void;
}

export interface AISettings {
  provider: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  localModelId?: string;
}

export const AISettingsPanel: React.FC<AISettingsPanelProps> = ({
  currentProvider,
  onProviderChange,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'provider' | 'local'>('provider');
  const [settings, setSettings] = useState<AISettings>({
    provider: currentProvider,
    temperature: 0.7,
    maxTokens: 2048,
    model: '',
  });

  const handleProviderSelect = (provider: AIProviderType) => {
    setSettings((prev) => ({ ...prev, provider }));
    onProviderChange(provider);

    if (provider !== 'local') {
      setActiveTab('provider');
    } else {
      setActiveTab('local');
    }
  };

  const renderProviderSettings = () => {
    switch (settings.provider) {
      case 'openai':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                value={settings.apiKey || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Base URL (可选)</label>
              <input
                type="text"
                value={settings.baseUrl || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">模型</label>
              <select
                value={settings.model}
                onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">选择模型...</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>
        );

      case 'claude':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                value={settings.apiKey || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">模型</label>
              <select
                value={settings.model}
                onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">选择模型...</option>
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              </select>
            </div>
          </div>
        );

      case 'ollama':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ollama 地址</label>
              <input
                type="text"
                value={settings.baseUrl || 'http://localhost:11434'}
                onChange={(e) => setSettings((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">模型</label>
              <select
                value={settings.model}
                onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">选择模型...</option>
                <option value="qwen2.5-coder:7b">Qwen2.5-Coder 7B</option>
                <option value="deepseek-coder:6.7b">DeepSeek-Coder 6.7B</option>
                <option value="codellama:13b">CodeLlama 13B</option>
              </select>
            </div>
          </div>
        );

      case 'local':
        return (
          <div className="py-4">
            <LocalModelManager />
          </div>
        );

      default:
        return (
          <div className="text-gray-500 text-sm">
            Mock 模式使用内置模拟数据，无需配置。
          </div>
        );
    }
  };

  return (
    <div className="ai-settings-panel">
      {/* Provider Tabs */}
      <div className="flex border-b mb-4">
        {[
          { key: 'openai', label: 'OpenAI' },
          { key: 'claude', label: 'Claude' },
          { key: 'ollama', label: 'Ollama' },
          { key: 'local', label: '本地 GGUF' },
          { key: 'mock', label: 'Mock' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleProviderSelect(tab.key as AIProviderType)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              settings.provider === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      {renderProviderSettings()}

      {/* Common Settings */}
      <div className="mt-6 pt-4 border-t space-y-4">
        <h4 className="font-medium">通用设置</h4>
        <div>
          <label className="block text-sm font-medium mb-1">
            Temperature: {settings.temperature.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>精确</span>
            <span>平衡</span>
            <span>创意</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            最大 Token 数: {settings.maxTokens}
          </label>
          <input
            type="range"
            min="256"
            max="8192"
            step="256"
            value={settings.maxTokens}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) }))
            }
            className="w-full"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 pt-4 border-t">
        <button
          onClick={() => onSave(settings)}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          保存设置
        </button>
      </div>
    </div>
  );
};
