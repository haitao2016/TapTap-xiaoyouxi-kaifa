import { create } from 'zustand';
import { randomUUID } from 'node:crypto';
import type {
  ProjectMeta,
  DebugLogEntry,
  DebugSession,
  PerformanceMetrics,
  MonitorAlert,
  BuildTask,
  BuildResult,
  EditorTab,
  AppSettings,
  Platform,
  PluginInfo,
} from '@tapdev/types';
import {
  projectManager,
  debugService,
  monitorService,
  buildService,
  platformService,
  getNativeBridge,
  pluginManager,
} from '@tapdev/core';

interface AppState {
  platform: Platform;
  currentProject: ProjectMeta | null;
  settings: AppSettings;
  activeView: string;
  sidebarOpen: boolean;

  debugSession: DebugSession | null;
  debugLogs: DebugLogEntry[];

  metricsHistory: PerformanceMetrics[];
  monitorAlerts: MonitorAlert[];
  isMonitoring: boolean;

  buildTasks: BuildTask[];
  activeBuildTask: BuildTask | null;
  lastBuildResult: BuildResult | null;

  editorTabs: EditorTab[];
  activeTabId: string | null;

  plugins: PluginInfo[];

  setActiveView: (view: string) => void;
  toggleSidebar: () => void;
  openProject: (path: string) => Promise<void>;
  createProject: (name: string, path: string, engine: ProjectMeta['config']['engine']) => void;
  closeProject: () => void;

  startDebug: () => Promise<void>;
  stopDebug: () => void;
  clearDebugLogs: () => void;

  startMonitor: () => void;
  stopMonitor: () => void;
  resolveAlert: (id: string) => void;

  startBuild: (options?: {
    platforms?: string[];
    version?: string;
    compress?: boolean;
    wasmSplit?: boolean;
    optimizeAssets?: boolean;
    stripDebug?: boolean;
  }) => Promise<void>;
  cancelBuild: (taskId: string) => void;

  openFile: (path: string, content?: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;

  setPlugins: (plugins: PluginInfo[]) => void;
  togglePlugin: (pluginId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  platform: platformService.detectPlatform(),
  currentProject: null,
  settings: projectManager.getSettings(),
  activeView: 'dashboard',
  sidebarOpen: true,

  debugSession: null,
  debugLogs: [],

  metricsHistory: [],
  monitorAlerts: [],
  isMonitoring: false,

  buildTasks: [],
  activeBuildTask: null,
  lastBuildResult: null,

  editorTabs: [],
  activeTabId: null,

  plugins: [],

  setActiveView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  openProject: async (path) => {
    const project = await projectManager.openProject(path);
    set({ currentProject: project, activeView: 'editor' });
  },

  createProject: (name, path, engine) => {
    const project = projectManager.createProject({ name, path, engine });
    set({ currentProject: project, activeView: 'editor' });
  },

  closeProject: () => {
    projectManager.closeProject();
    set({ currentProject: null, editorTabs: [], activeTabId: null });
  },

  startDebug: async () => {
    const project = get().currentProject;
    if (!project) return;

    const bridge = getNativeBridge();
    if (bridge?.isAvailable()) {
      const info = await bridge.startDebugServer({
        projectId: project.config.id,
        port: get().settings.debugServerPort,
        projectPath: project.path,
        staticDir: project.config.buildPath,
      });
      debugService.syncNativeSession({
        sessionId: info.sessionId,
        projectId: project.config.id,
        url: info.url,
        wsUrl: info.wsUrl,
        qrCodeDataUrl: info.qrCodeDataUrl,
        port: info.port,
      });
    } else {
      await debugService.startDebugServer(project.config.id, get().settings.debugServerPort);
    }

    set({
      debugSession: debugService.getSession(),
      debugLogs: debugService.getLogs(),
      activeView: 'debug',
    });
  },

  stopDebug: async () => {
    const bridge = getNativeBridge();
    if (bridge?.isAvailable()) {
      await bridge.stopDebugServer();
    }
    debugService.stopDebugServer();
    set({ debugSession: null });
  },

  clearDebugLogs: () => {
    debugService.clearLogs();
    set({ debugLogs: [] });
  },

  startMonitor: () => {
    monitorService.startMonitoring();
    set({ isMonitoring: true, activeView: 'monitor' });
    const interval = setInterval(() => {
      if (!monitorService.isMonitoringActive()) {
        clearInterval(interval);
        return;
      }
      set({
        metricsHistory: monitorService.getMetricsHistory(),
        monitorAlerts: monitorService.getAlerts(),
      });
    }, 1000);
  },

  stopMonitor: () => {
    monitorService.stopMonitoring();
    set({ isMonitoring: false });
  },

  resolveAlert: (id) => {
    monitorService.resolveAlert(id);
    set({ monitorAlerts: monitorService.getAlerts() });
  },

  startBuild: async (options?: {
    platforms?: string[];
    version?: string;
    compress?: boolean;
    wasmSplit?: boolean;
    optimizeAssets?: boolean;
    stripDebug?: boolean;
  }) => {
    const project = get().currentProject;
    if (!project) return;
    const task = await buildService.startBuild({
      projectId: project.config.id,
      projectPath: project.path,
      outputPath: project.config.buildPath,
      compress: options?.compress ?? true,
      wasmSplit: options?.wasmSplit ?? true,
      development: false,
      targetPlatform: (options?.platforms?.map((p) => p as any) ?? ['pc', 'mobile', 'tablet']),
      version: options?.version ?? '1.0.0',
      cdnUrl: project.config.cdnUrl,
      appId: project.config.appId,
      optimizeAssets: options?.optimizeAssets,
      stripDebugInfo: options?.stripDebug,
    });
    set({ activeBuildTask: task, buildTasks: buildService.getAllTasks(), activeView: 'build' });

    const poll = setInterval(() => {
      const current = buildService.getActiveTask();
      const tasks = buildService.getAllTasks();
      if (!current) {
        clearInterval(poll);
        const last = tasks[0];
        set({
          activeBuildTask: null,
          buildTasks: tasks,
          lastBuildResult: last?.result ?? null,
        });
        return;
      }
      set({ activeBuildTask: current, buildTasks: tasks });
    }, 500);
  },

  cancelBuild: (taskId) => {
    buildService.cancelBuild(taskId);
    set({ buildTasks: buildService.getAllTasks(), activeBuildTask: null });
  },

  openFile: (path, content = '') => {
    const ext = path.split('.').pop() ?? '';
    const langMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      json: 'json',
      cs: 'csharp',
      css: 'css',
      html: 'html',
      md: 'markdown',
    };

    const existing = get().editorTabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    const tab: EditorTab = {
      id: randomUUID(),
      path,
      name: path.split(/[/\\]/).pop() ?? path,
      content: content || getDefaultContent(path),
      language: langMap[ext] ?? 'plaintext',
      modified: false,
    };

    set((s) => ({
      editorTabs: [...s.editorTabs, tab],
      activeTabId: tab.id,
    }));
  },

  closeTab: (tabId) => {
    set((s) => {
      const tabs = s.editorTabs.filter((t) => t.id !== tabId);
      const activeTabId =
        s.activeTabId === tabId ? tabs.at(-1)?.id ?? null : s.activeTabId;
      return { editorTabs: tabs, activeTabId };
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTabContent: (tabId, content) => {
    set((s) => ({
      editorTabs: s.editorTabs.map((t) =>
        t.id === tabId ? { ...t, content, modified: true } : t
      ),
    }));
  },

  updateSettings: (newSettings) => {
    set((s) => ({
      settings: { ...s.settings, ...newSettings },
    }));
  },

  setPlugins: (plugins) => set({ plugins }),

  togglePlugin: async (pluginId) => {
    const plugin = get().plugins.find((p) => p.meta.id === pluginId);
    if (!plugin) return;

    if (plugin.activated) {
      await pluginManager.deactivatePlugin(pluginId);
    } else {
      await pluginManager.activatePlugin(pluginId);
    }

    set({ plugins: pluginManager.getAllPluginInfo() });
  },
}));

function getDefaultContent(path: string): string {
  if (path.endsWith('tapdev.config.json')) {
    return JSON.stringify(
      {
        name: 'My TapTap Game',
        engine: 'unity',
        appId: '',
        cdnUrl: 'https://cdn.example.com',
        build: { compress: true, wasmSplit: true },
      },
      null,
      2
    );
  }
  if (path.endsWith('.cs')) {
    return `using UnityEngine;

public class GameManager : MonoBehaviour
{
    void Start()
    {
        Debug.Log("TapTap Mini Game Started!");
    }
}`;
  }
  return '';
}
