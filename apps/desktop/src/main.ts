import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import {
  startNativeDebugServer,
  stopNativeDebugServer,
  detectUnityInstallations,
  validateUnityProject,
  startUnityBuild,
  cancelUnityBuild,
} from './native-service';
import { initAutoUpdater, checkForUpdatesOnStartup } from './auto-updater';
import type { BuildConfig } from '@tapdev/types';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'TapDev Studio',
    backgroundColor: '#0d0d0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../studio-dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    initAutoUpdater(mainWindow!);
    checkForUpdatesOnStartup();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-project'),
        },
        {
          label: '打开项目',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openDirectory'],
              title: '选择 TapTap 小游戏项目目录',
            });
            if (!result.canceled && result.filePaths[0]) {
              mainWindow?.webContents.send('menu:open-project', result.filePaths[0]);
            }
          },
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save'),
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
      ],
    },
    {
      label: '开发',
      submenu: [
        {
          label: '启动调试',
          accelerator: 'F5',
          click: () => mainWindow?.webContents.send('menu:start-debug'),
        },
        {
          label: '开始构建',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('menu:start-build'),
        },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: 'TapTap 开发者文档',
          click: () =>
            shell.openExternal(
              'https://developer.taptap.cn/minigameapidoc/quick-start/document-guide/'
            ),
        },
        {
          label: '关于 TapDev Studio',
          click: () => mainWindow?.webContents.send('menu:about'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:openFile', async (_e, filters?: Electron.FileFilter[]) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters,
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('app:getPlatform', () => process.platform);
  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle(
    'native:startDebugServer',
    async (_e, opts: { projectId: string; port: number; projectPath?: string; staticDir?: string }) =>
      startNativeDebugServer(opts)
  );

  ipcMain.handle('native:stopDebugServer', async () => stopNativeDebugServer());

  ipcMain.handle('native:detectUnity', () => detectUnityInstallations());

  ipcMain.handle('native:validateProject', (_e, projectPath: string) =>
    validateUnityProject(projectPath)
  );

  ipcMain.handle('native:startBuild', (_e, config: BuildConfig) => startUnityBuild(config));

  ipcMain.handle('native:cancelBuild', (_e, taskId: string) => {
    cancelUnityBuild(taskId);
  });
}

app.whenReady().then(() => {
  createMenu();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopNativeDebugServer().finally(() => {
    if (process.platform !== 'darwin') app.quit();
  });
});

app.on('before-quit', () => {
  stopNativeDebugServer();
});
