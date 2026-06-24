import { globalEventBus } from './event-bus';

export interface Command {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  keywords: string[];
  shortcut?: string;
  action: () => void;
  context?: string;
}

export interface CommandMatch {
  command: Command;
  score: number;
  matches: string[];
}

export class CommandPaletteService {
  private commands = new Map<string, Command>();
  private isOpen = false;

  constructor() {
    this.registerDefaultCommands();
  }

  registerCommand(command: Command): void {
    this.commands.set(command.id, command);
  }

  unregisterCommand(id: string): void {
    this.commands.delete(id);
  }

  updateCommand(id: string, updates: Partial<Command>): void {
    const command = this.commands.get(id);
    if (command) {
      Object.assign(command, updates);
    }
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): Command[] {
    return Array.from(this.commands.values()).filter(c => c.category === category);
  }

  getCategories(): string[] {
    const categories = new Set(this.commands.values().map(c => c.category));
    return Array.from(categories).sort();
  }

  searchCommands(query: string): CommandMatch[] {
    if (!query.trim()) {
      return this.commands.values().map(cmd => ({
        command: cmd,
        score: 0,
        matches: [],
      }));
    }

    const lowerQuery = query.toLowerCase();
    const tokens = lowerQuery.split(/\s+/).filter(t => t.length > 0);

    const matches: CommandMatch[] = [];

    this.commands.forEach(command => {
      const searchText = [
        command.name.toLowerCase(),
        command.description.toLowerCase(),
        ...command.keywords.map(k => k.toLowerCase()),
      ].join(' ');

      let score = 0;
      const foundMatches: string[] = [];

      tokens.forEach(token => {
        if (command.name.toLowerCase().includes(token)) {
          score += 3;
          foundMatches.push(command.name);
        }
        if (command.description.toLowerCase().includes(token)) {
          score += 2;
          foundMatches.push(command.description);
        }
        if (command.keywords.some(k => k.toLowerCase().includes(token))) {
          score += 1;
          foundMatches.push(command.keywords.join(', '));
        }
      });

      if (score > 0) {
        matches.push({
          command,
          score,
          matches: [...new Set(foundMatches)],
        });
      }
    });

    return matches.sort((a, b) => b.score - a.score);
  }

  executeCommand(id: string): void {
    const command = this.commands.get(id);
    if (command) {
      try {
        command.action();
        globalEventBus.emit({ type: 'command:executed', payload: { id: command.id } });
      } catch (error) {
        console.error(`命令执行失败 ${id}:`, error);
      }
    }
  }

  open(): void {
    this.isOpen = true;
    globalEventBus.emit({ type: 'command:open' });
  }

  close(): void {
    this.isOpen = false;
    globalEventBus.emit({ type: 'command:close' });
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  isOpenState(): boolean {
    return this.isOpen;
  }

  private registerDefaultCommands(): void {
    this.registerCommand({
      id: 'file.new',
      name: '新建文件',
      description: '创建一个新文件',
      category: '文件',
      keywords: ['new', 'file', 'create'],
      shortcut: 'Ctrl+N',
      action: () => globalEventBus.emit({ type: 'file:new' }),
    });

    this.registerCommand({
      id: 'file.open',
      name: '打开文件',
      description: '打开一个现有文件',
      category: '文件',
      keywords: ['open', 'file', 'load'],
      shortcut: 'Ctrl+O',
      action: () => globalEventBus.emit({ type: 'file:open' }),
    });

    this.registerCommand({
      id: 'file.save',
      name: '保存文件',
      description: '保存当前文件',
      category: '文件',
      keywords: ['save', 'file'],
      shortcut: 'Ctrl+S',
      action: () => globalEventBus.emit({ type: 'file:save' }),
    });

    this.registerCommand({
      id: 'file.save-all',
      name: '保存全部',
      description: '保存所有打开的文件',
      category: '文件',
      keywords: ['save', 'all', 'files'],
      shortcut: 'Ctrl+Shift+S',
      action: () => globalEventBus.emit({ type: 'file:save-all' }),
    });

    this.registerCommand({
      id: 'file.close',
      name: '关闭文件',
      description: '关闭当前文件',
      category: '文件',
      keywords: ['close', 'file', 'tab'],
      action: () => globalEventBus.emit({ type: 'file:close' }),
    });

    this.registerCommand({
      id: 'edit.undo',
      name: '撤销',
      description: '撤销上一次操作',
      category: '编辑',
      keywords: ['undo', 'cancel'],
      shortcut: 'Ctrl+Z',
      action: () => globalEventBus.emit({ type: 'edit:undo' }),
    });

    this.registerCommand({
      id: 'edit.redo',
      name: '重做',
      description: '重做上一次撤销的操作',
      category: '编辑',
      keywords: ['redo', 'repeat'],
      shortcut: 'Ctrl+Shift+Z',
      action: () => globalEventBus.emit({ type: 'edit:redo' }),
    });

    this.registerCommand({
      id: 'edit.cut',
      name: '剪切',
      description: '剪切选中内容',
      category: '编辑',
      keywords: ['cut', 'delete'],
      shortcut: 'Ctrl+X',
      action: () => globalEventBus.emit({ type: 'edit:cut' }),
    });

    this.registerCommand({
      id: 'edit.copy',
      name: '复制',
      description: '复制选中内容',
      category: '编辑',
      keywords: ['copy', 'duplicate'],
      shortcut: 'Ctrl+C',
      action: () => globalEventBus.emit({ type: 'edit:copy' }),
    });

    this.registerCommand({
      id: 'edit.paste',
      name: '粘贴',
      description: '粘贴剪贴板内容',
      category: '编辑',
      keywords: ['paste', 'insert'],
      shortcut: 'Ctrl+V',
      action: () => globalEventBus.emit({ type: 'edit:paste' }),
    });

    this.registerCommand({
      id: 'edit.select-all',
      name: '全选',
      description: '选中所有内容',
      category: '编辑',
      keywords: ['select', 'all'],
      shortcut: 'Ctrl+A',
      action: () => globalEventBus.emit({ type: 'edit:select-all' }),
    });

    this.registerCommand({
      id: 'view.toggle-sidebar',
      name: '切换侧边栏',
      description: '显示或隐藏侧边栏',
      category: '视图',
      keywords: ['sidebar', 'panel', 'toggle'],
      shortcut: 'Ctrl+B',
      action: () => globalEventBus.emit({ type: 'view:toggle-sidebar' }),
    });

    this.registerCommand({
      id: 'view.toggle-panel',
      name: '切换面板',
      description: '显示或隐藏底部面板',
      category: '视图',
      keywords: ['panel', 'toggle', 'bottom'],
      shortcut: 'Ctrl+`',
      action: () => globalEventBus.emit({ type: 'view:toggle-panel' }),
    });

    this.registerCommand({
      id: 'view.zoom-in',
      name: '放大',
      description: '放大编辑器内容',
      category: '视图',
      keywords: ['zoom', 'in', 'larger'],
      shortcut: 'Ctrl++',
      action: () => globalEventBus.emit({ type: 'view:zoom-in' }),
    });

    this.registerCommand({
      id: 'view.zoom-out',
      name: '缩小',
      description: '缩小编辑器内容',
      category: '视图',
      keywords: ['zoom', 'out', 'smaller'],
      shortcut: 'Ctrl+-',
      action: () => globalEventBus.emit({ type: 'view:zoom-out' }),
    });

    this.registerCommand({
      id: 'view.reset-zoom',
      name: '重置缩放',
      description: '重置编辑器缩放为默认值',
      category: '视图',
      keywords: ['zoom', 'reset', 'default'],
      shortcut: 'Ctrl+0',
      action: () => globalEventBus.emit({ type: 'view:reset-zoom' }),
    });

    this.registerCommand({
      id: 'debug.start',
      name: '开始调试',
      description: '启动调试会话',
      category: '调试',
      keywords: ['debug', 'start', 'run'],
      shortcut: 'F5',
      action: () => globalEventBus.emit({ type: 'debug:start' }),
    });

    this.registerCommand({
      id: 'debug.pause',
      name: '暂停调试',
      description: '暂停当前调试会话',
      category: '调试',
      keywords: ['debug', 'pause', 'break'],
      shortcut: 'F6',
      action: () => globalEventBus.emit({ type: 'debug:pause' }),
    });

    this.registerCommand({
      id: 'debug.stop',
      name: '停止调试',
      description: '停止当前调试会话',
      category: '调试',
      keywords: ['debug', 'stop', 'end'],
      shortcut: 'F7',
      action: () => globalEventBus.emit({ type: 'debug:stop' }),
    });

    this.registerCommand({
      id: 'debug.step-over',
      name: '单步跳过',
      description: '执行下一行代码',
      category: '调试',
      keywords: ['debug', 'step', 'next'],
      shortcut: 'F10',
      action: () => globalEventBus.emit({ type: 'debug:step-over' }),
    });

    this.registerCommand({
      id: 'debug.step-into',
      name: '单步进入',
      description: '进入函数调用',
      category: '调试',
      keywords: ['debug', 'step', 'into'],
      shortcut: 'F11',
      action: () => globalEventBus.emit({ type: 'debug:step-into' }),
    });

    this.registerCommand({
      id: 'build.run',
      name: '构建项目',
      description: '构建当前项目',
      category: '构建',
      keywords: ['build', 'compile', 'run'],
      shortcut: 'Ctrl+Shift+B',
      action: () => globalEventBus.emit({ type: 'build:run' }),
    });

    this.registerCommand({
      id: 'theme.toggle',
      name: '切换主题',
      description: '在深色/浅色主题之间切换',
      category: '设置',
      keywords: ['theme', 'dark', 'light', 'toggle'],
      action: () => globalEventBus.emit({ type: 'theme:toggle' }),
    });

    this.registerCommand({
      id: 'help.show',
      name: '显示帮助',
      description: '打开帮助文档',
      category: '帮助',
      keywords: ['help', 'documentation', 'guide'],
      action: () => globalEventBus.emit({ type: 'help:show' }),
    });
  }
}

export const commandPaletteService = new CommandPaletteService();