import { globalEventBus } from './event-bus';

export interface Shortcut {
  id: string;
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
  category: string;
  action: () => void;
  enabled: boolean;
}

export interface KeyboardEventData {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  event: KeyboardEvent;
}

export class ShortcutService {
  private shortcuts = new Map<string, Shortcut>();
  private registeredKeys = new Map<string, string>();

  constructor() {
    this.registerDefaultShortcuts();
    this.setupGlobalListener();
  }

  registerShortcut(shortcut: Omit<Shortcut, 'enabled'>): void {
    const key = this.getKeyString(shortcut.key, shortcut.modifiers);
    if (this.registeredKeys.has(key)) {
      console.warn(`快捷键已存在: ${key}`);
      return;
    }

    const fullShortcut: Shortcut = {
      ...shortcut,
      enabled: true,
    };

    this.shortcuts.set(shortcut.id, fullShortcut);
    this.registeredKeys.set(key, shortcut.id);
  }

  unregisterShortcut(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      const key = this.getKeyString(shortcut.key, shortcut.modifiers);
      this.registeredKeys.delete(key);
      this.shortcuts.delete(id);
    }
  }

  updateShortcut(id: string, updates: Partial<Omit<Shortcut, 'id' | 'enabled'>>): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      const oldKey = this.getKeyString(shortcut.key, shortcut.modifiers);
      this.registeredKeys.delete(oldKey);

      Object.assign(shortcut, updates);

      const newKey = this.getKeyString(shortcut.key, shortcut.modifiers);
      this.registeredKeys.set(newKey, id);
    }
  }

  toggleShortcut(id: string, enabled: boolean): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = enabled;
    }
  }

  getShortcutsByCategory(category: string): Shortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  getAllShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutById(id: string): Shortcut | undefined {
    return this.shortcuts.get(id);
  }

  triggerShortcut(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut && shortcut.enabled) {
      try {
        shortcut.action();
        globalEventBus.emit({ type: 'shortcut:triggered', payload: { id: shortcut.id } });
      } catch (error) {
        console.error(`快捷键执行失败 ${id}:`, error);
      }
    }
  }

  private getKeyString(key: string, modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]): string {
    const sortedModifiers = (modifiers || []).sort();
    return [...sortedModifiers, key.toLowerCase()].join('+');
  }

  private setupGlobalListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (event) => {
        const modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[] = [];
        if (event.ctrlKey) modifiers.push('ctrl');
        if (event.shiftKey) modifiers.push('shift');
        if (event.altKey) modifiers.push('alt');
        if (event.metaKey) modifiers.push('meta');

        const key = this.getKeyString(event.key, modifiers);
        const shortcutId = this.registeredKeys.get(key);

        if (shortcutId) {
          const shortcut = this.shortcuts.get(shortcutId);
          if (shortcut && shortcut.enabled) {
            event.preventDefault();
            this.triggerShortcut(shortcutId);
          }
        }
      });
    }
  }

  private registerDefaultShortcuts(): void {
    this.registerShortcut({
      id: 'file-new',
      key: 'n',
      modifiers: ['ctrl'],
      description: '新建文件',
      category: '文件',
      action: () => globalEventBus.emit({ type: 'shortcut:file-new' }),
    });

    this.registerShortcut({
      id: 'file-open',
      key: 'o',
      modifiers: ['ctrl'],
      description: '打开文件',
      category: '文件',
      action: () => globalEventBus.emit({ type: 'shortcut:file-open' }),
    });

    this.registerShortcut({
      id: 'file-save',
      key: 's',
      modifiers: ['ctrl'],
      description: '保存文件',
      category: '文件',
      action: () => globalEventBus.emit({ type: 'shortcut:file-save' }),
    });

    this.registerShortcut({
      id: 'file-save-all',
      key: 's',
      modifiers: ['ctrl', 'shift'],
      description: '保存全部',
      category: '文件',
      action: () => globalEventBus.emit({ type: 'shortcut:file-save-all' }),
    });

    this.registerShortcut({
      id: 'edit-undo',
      key: 'z',
      modifiers: ['ctrl'],
      description: '撤销',
      category: '编辑',
      action: () => globalEventBus.emit({ type: 'shortcut:edit-undo' }),
    });

    this.registerShortcut({
      id: 'edit-redo',
      key: 'z',
      modifiers: ['ctrl', 'shift'],
      description: '重做',
      category: '编辑',
      action: () => globalEventBus.emit({ type: 'shortcut:edit-redo' }),
    });

    this.registerShortcut({
      id: 'edit-cut',
      key: 'x',
      modifiers: ['ctrl'],
      description: '剪切',
      category: '编辑',
      action: () => globalEventBus.emit({ type: 'shortcut:edit-cut' }),
    });

    this.registerShortcut({
      id: 'edit-copy',
      key: 'c',
      modifiers: ['ctrl'],
      description: '复制',
      category: '编辑',
      action: () => globalEventBus.emit({ type: 'shortcut:edit-copy' }),
    });

    this.registerShortcut({
      id: 'edit-paste',
      key: 'v',
      modifiers: ['ctrl'],
      description: '粘贴',
      category: '编辑',
      action: () => globalEventBus.emit({ type: 'shortcut:edit-paste' }),
    });

    this.registerShortcut({
      id: 'edit-select-all',
      key: 'a',
      modifiers: ['ctrl'],
      description: '全选',
      category: '编辑',
      action: () => globalEventBus.emit({ type: 'shortcut:edit-select-all' }),
    });

    this.registerShortcut({
      id: 'view-toggle-sidebar',
      key: 'b',
      modifiers: ['ctrl'],
      description: '切换侧边栏',
      category: '视图',
      action: () => globalEventBus.emit({ type: 'shortcut:view-toggle-sidebar' }),
    });

    this.registerShortcut({
      id: 'view-toggle-panel',
      key: '`',
      modifiers: ['ctrl'],
      description: '切换面板',
      category: '视图',
      action: () => globalEventBus.emit({ type: 'shortcut:view-toggle-panel' }),
    });

    this.registerShortcut({
      id: 'debug-start',
      key: 'f5',
      description: '开始调试',
      category: '调试',
      action: () => globalEventBus.emit({ type: 'shortcut:debug-start' }),
    });

    this.registerShortcut({
      id: 'debug-pause',
      key: 'f6',
      description: '暂停调试',
      category: '调试',
      action: () => globalEventBus.emit({ type: 'shortcut:debug-pause' }),
    });

    this.registerShortcut({
      id: 'debug-stop',
      key: 'f7',
      description: '停止调试',
      category: '调试',
      action: () => globalEventBus.emit({ type: 'shortcut:debug-stop' }),
    });

    this.registerShortcut({
      id: 'debug-step-over',
      key: 'f10',
      description: '单步跳过',
      category: '调试',
      action: () => globalEventBus.emit({ type: 'shortcut:debug-step-over' }),
    });

    this.registerShortcut({
      id: 'debug-step-into',
      key: 'f11',
      description: '单步进入',
      category: '调试',
      action: () => globalEventBus.emit({ type: 'shortcut:debug-step-into' }),
    });

    this.registerShortcut({
      id: 'command-palette',
      key: 'p',
      modifiers: ['ctrl', 'shift'],
      description: '命令面板',
      category: '命令',
      action: () => globalEventBus.emit({ type: 'shortcut:command-palette' }),
    });

    this.registerShortcut({
      id: 'build',
      key: 'b',
      modifiers: ['ctrl', 'shift'],
      description: '构建项目',
      category: '构建',
      action: () => globalEventBus.emit({ type: 'shortcut:build' }),
    });
  }
}

export const shortcutService = new ShortcutService();