/**
 * Local Model Manager React Component
 * 模型管理 UI 组件
 */

import React, { useState, useEffect } from 'react';
import { localModelService, LOCAL_MODEL_EVENTS } from '@tapdev/core';
import type { GGUFModelInfo, RecommendedModel, ModelLoadProgress } from '@tapdev/types';

interface LocalModelManagerProps {
  onModelLoaded?: (model: GGUFModelInfo) => void;
}

export const LocalModelManager: React.FC<LocalModelManagerProps> = ({ onModelLoaded }) => {
  const [models, setModels] = useState<GGUFModelInfo[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<RecommendedModel[]>([]);
  const [currentModel, setCurrentModel] = useState<GGUFModelInfo | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<ModelLoadProgress | null>(null);
  const [webgpuStatus, setWebgpuStatus] = useState<{ available: boolean; tier: string } | null>(
    null
  );
  const [showLocalUpload, setShowLocalUpload] = useState(false);

  useEffect(() => {
    // 加载模型列表
    setModels(localModelService.getModels());
    setRecommendedModels(localModelService.getRecommendedModels());
    setCurrentModel(localModelService.getCurrentModel());

    // 检查 WebGPU 状态
    localModelService
      .checkWebGPUAvailability()
      .then((status: { available: boolean; tier: string }) => {
        setWebgpuStatus(status);
      });

    // 监听事件
    const handleProgress = (payload: any) => {
      setLoadingProgress(payload.progress);
    };

    const handleStatusChange = (payload: any) => {
      setModels(localModelService.getModels());
      setCurrentModel(localModelService.getCurrentModel());
      if (payload.status === 'ready') {
        onModelLoaded?.(localModelService.getCurrentModel()!);
      }
    };

    // 临时监听机制
    const checkProgress = setInterval(() => {
      if (currentModel && currentModel.status !== 'ready') {
        const progress = localModelService.getLoadProgress(currentModel.id);
        if (progress) {
          setLoadingProgress(progress);
        }
      }
    }, 500);

    return () => {
      clearInterval(checkProgress);
    };
  }, [onModelLoaded]);

  const handleLoadModel = async (modelId: string) => {
    try {
      await localModelService.loadModel(modelId, {
        onProgress: (progress: ModelLoadProgress) => {
          setLoadingProgress(progress);
        },
        onComplete: () => {
          setCurrentModel(localModelService.getCurrentModel());
          setLoadingProgress(null);
        },
        onError: (error: Error) => {
          console.error('模型加载失败:', error);
          setLoadingProgress(null);
        },
      });
    } catch (error) {
      console.error('加载失败:', error);
    }
  };

  const handleUnloadModel = async () => {
    await localModelService.unloadModel();
    setCurrentModel(null);
    setLoadingProgress(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gguf')) {
      alert('请选择 .gguf 文件');
      return;
    }

    const modelInfo = await localModelService.loadLocalFile(file);
    setModels(localModelService.getModels());
    setShowLocalUpload(false);

    // 自动加载本地文件
    handleLoadModel(modelInfo.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-green-500';
      case 'loading':
      case 'downloading':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="local-model-manager p-4">
      {/* WebGPU 状态 */}
      <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm">运行环境:</span>
          {webgpuStatus ? (
            <span
              className={`text-sm font-medium ${
                webgpuStatus.available ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {webgpuStatus.available
                ? `WebGPU ${webgpuStatus.tier === 'perfect' ? '最佳' : '良好'}`
                : 'WebGPU 不可用 (将使用 Transformers.js)'}
            </span>
          ) : (
            <span className="text-sm text-gray-500">检测中...</span>
          )}
        </div>
      </div>

      {/* 当前模型 */}
      {currentModel && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-green-700 dark:text-green-400">
                当前模型: {currentModel.name}
              </div>
              <div className={`text-sm ${getStatusColor(currentModel.status)}`}>
                状态: {currentModel.status}
              </div>
            </div>
            <button
              onClick={handleUnloadModel}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              卸载
            </button>
          </div>
        </div>
      )}

      {/* 加载进度 */}
      {loadingProgress && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm mb-2">{loadingProgress.message || '加载中...'}</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${loadingProgress.progress}%` }}
            />
          </div>
          <div className="text-xs mt-1 text-gray-500">
            {loadingProgress.loaded > 0 &&
              `${(loadingProgress.loaded / 1024 / 1024).toFixed(1)}MB / ${(loadingProgress.total / 1024 / 1024).toFixed(1)}MB`}
          </div>
        </div>
      )}

      {/* 推荐模型 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">推荐模型</h3>
        <div className="space-y-2">
          {recommendedModels.map((model) => (
            <div
              key={model.id}
              className={`p-3 border rounded-lg ${
                currentModel?.id === model.id
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{model.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{model.description}</div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>大小: {model.size}</span>
                    <span>量化: {model.quantization}</span>
                    {model.minVRAM && <span>显存: ≥{model.minVRAM}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleLoadModel(model.id)}
                  disabled={!!currentModel}
                  className={`px-3 py-1 text-sm rounded ${
                    currentModel?.id === model.id
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300'
                  }`}
                >
                  {currentModel?.id === model.id ? '已加载' : '加载'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 本地文件上传 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium">本地文件</h3>
          <label className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
            上传 .gguf 文件
            <input type="file" accept=".gguf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
