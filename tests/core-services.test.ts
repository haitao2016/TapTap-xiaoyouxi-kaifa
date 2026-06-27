import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { CommandPaletteService } from '../packages/core/src/command-palette-service';
import { ShortcutService } from '../packages/core/src/shortcut-service';
import { FormatService } from '../packages/core/src/format-service';
import { ThemeService } from '../packages/core/src/theme-service';

describe('Phase 3: Core Services', () => {
  describe('CommandPaletteService', () => {
    let service: CommandPaletteService;

    beforeEach(() => {
      service = new CommandPaletteService();
    });

    it('should register a command', () => {
      const cmd = {
        id: 'test.cmd',
        name: 'Test Command',
        description: 'A test command',
        category: 'Test',
        keywords: ['test', 'demo'],
        action: jest.fn(),
      };
      service.registerCommand(cmd);
      const all = service.getAllCommands();
      expect(all.some((c) => c.id === 'test.cmd')).toBe(true);
    });

    it('should unregister a command', () => {
      const cmd = {
        id: 'test.remove',
        name: 'Remove Me',
        description: 'to be removed',
        category: 'Test',
        keywords: [],
        action: jest.fn(),
      };
      service.registerCommand(cmd);
      expect(service.getAllCommands().some((c) => c.id === 'test.remove')).toBe(true);
      service.unregisterCommand('test.remove');
      expect(service.getAllCommands().some((c) => c.id === 'test.remove')).toBe(false);
    });

    it('should update a command', () => {
      const cmd = {
        id: 'test.update',
        name: 'Old Name',
        description: 'old desc',
        category: 'Test',
        keywords: [],
        action: jest.fn(),
      };
      service.registerCommand(cmd);
      service.updateCommand('test.update', { name: 'New Name' });
      const updated = service.getAllCommands().find((c) => c.id === 'test.update');
      expect(updated?.name).toBe('New Name');
    });

    it('should return commands by category', () => {
      service.registerCommand({
        id: 'cat.a',
        name: 'Cmd A',
        description: 'desc a',
        category: 'CatA',
        keywords: [],
        action: jest.fn(),
      });
      service.registerCommand({
        id: 'cat.b',
        name: 'Cmd B',
        description: 'desc b',
        category: 'CatB',
        keywords: [],
        action: jest.fn(),
      });
      const catA = service.getCommandsByCategory('CatA');
      expect(catA.length).toBe(1);
      expect(catA[0].id).toBe('cat.a');
    });

    it('should list categories sorted alphabetically', () => {
      service.registerCommand({
        id: 'cat-unique-1',
        name: 'Cmd 1',
        description: 'desc 1',
        category: 'ZebraUnique',
        keywords: [],
        action: jest.fn(),
      });
      service.registerCommand({
        id: 'cat-unique-2',
        name: 'Cmd 2',
        description: 'desc 2',
        category: 'AppleUnique',
        keywords: [],
        action: jest.fn(),
      });
      const cats = service.getCategories();
      const appleIdx = cats.indexOf('AppleUnique');
      const zebraIdx = cats.indexOf('ZebraUnique');
      expect(appleIdx).toBeGreaterThan(-1);
      expect(zebraIdx).toBeGreaterThan(-1);
      expect(appleIdx).toBeLessThan(zebraIdx);
    });

    it('should search commands and score by relevance', () => {
      const results = service.searchCommands('新建文件');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].command.name).toContain('新建');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should return all commands with empty query', () => {
      const all = service.getAllCommands();
      const results = service.searchCommands('');
      expect(results.length).toBe(all.length);
    });

    it('should execute a command action', () => {
      const action = jest.fn();
      service.registerCommand({
        id: 'exec.test',
        name: 'Exec Test',
        description: 'test execution',
        category: 'Test',
        keywords: [],
        action,
      });
      const cmd = service.getAllCommands().find((c) => c.id === 'exec.test');
      cmd?.action();
      expect(action).toHaveBeenCalledTimes(1);
    });
  });

  describe('ShortcutService', () => {
    let service: ShortcutService;

    beforeEach(() => {
      service = new ShortcutService();
    });

    it('should register a shortcut', () => {
      const action = jest.fn();
      service.registerShortcut({
        id: 'test-shortcut-unique-1',
        key: 'F12',
        modifiers: ['ctrl', 'shift'],
        description: 'Test Shortcut',
        category: 'Test',
        action,
      });
      const sc = service.getShortcutById('test-shortcut-unique-1');
      expect(sc).toBeDefined();
      expect(sc?.id).toBe('test-shortcut-unique-1');
    });

    it('should enable shortcuts by default', () => {
      service.registerShortcut({
        id: 'test-shortcut-enabled',
        key: 'F11',
        modifiers: ['ctrl'],
        description: 'Enabled Test',
        category: 'Test',
        action: jest.fn(),
      });
      const sc = service.getShortcutById('test-shortcut-enabled');
      expect(sc?.enabled).toBe(true);
    });

    it('should unregister a shortcut', () => {
      service.registerShortcut({
        id: 'test-shortcut-remove',
        key: 'F10',
        modifiers: ['alt'],
        description: 'Remove Test',
        category: 'Test',
        action: jest.fn(),
      });
      expect(service.getShortcutById('test-shortcut-remove')).toBeDefined();
      service.unregisterShortcut('test-shortcut-remove');
      expect(service.getShortcutById('test-shortcut-remove')).toBeUndefined();
    });

    it('should toggle shortcut enabled state', () => {
      service.registerShortcut({
        id: 'test-shortcut-toggle',
        key: 'F9',
        modifiers: ['shift'],
        description: 'Toggle Test',
        category: 'Test',
        action: jest.fn(),
      });
      service.toggleShortcut('test-shortcut-toggle', false);
      expect(service.getShortcutById('test-shortcut-toggle')?.enabled).toBe(false);
      service.toggleShortcut('test-shortcut-toggle', true);
      expect(service.getShortcutById('test-shortcut-toggle')?.enabled).toBe(true);
    });

    it('should return shortcuts by category', () => {
      service.registerShortcut({
        id: 'sc-catone-1',
        key: 'F8',
        description: 'cat1 shortcut',
        category: 'CatOneUnique',
        action: jest.fn(),
      });
      const catOne = service.getShortcutsByCategory('CatOneUnique');
      expect(catOne.length).toBe(1);
    });

    it('should trigger shortcut action', () => {
      const action = jest.fn();
      service.registerShortcut({
        id: 'test-shortcut-trigger',
        key: 'F7',
        modifiers: ['meta'],
        description: 'Trigger Test',
        category: 'Test',
        action,
      });
      service.triggerShortcut('test-shortcut-trigger');
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should not trigger disabled shortcut', () => {
      const action = jest.fn();
      service.registerShortcut({
        id: 'test-shortcut-disabled',
        key: 'F6',
        modifiers: ['alt', 'shift'],
        description: 'Disabled Test',
        category: 'Test',
        action,
      });
      service.toggleShortcut('test-shortcut-disabled', false);
      service.triggerShortcut('test-shortcut-disabled');
      expect(action).not.toHaveBeenCalled();
    });

    it('should warn on duplicate key binding', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      service.registerShortcut({
        id: 'dup-shortcut-1',
        key: 'F5',
        modifiers: ['ctrl'],
        description: 'dup 1',
        category: 'Test',
        action: jest.fn(),
      });
      service.registerShortcut({
        id: 'dup-shortcut-2',
        key: 'F5',
        modifiers: ['ctrl'],
        description: 'dup 2',
        category: 'Test',
        action: jest.fn(),
      });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('FormatService', () => {
    let service: FormatService;

    beforeEach(() => {
      service = new FormatService();
    });

    it('should format JavaScript code', () => {
      const result = service.format('function foo(  ){return 1;}', 'javascript');
      expect(result.success).toBe(true);
      expect(result.code.length).toBeGreaterThan(0);
    });

    it('should format TypeScript code', () => {
      const result = service.format('const x:number=1;', 'typescript');
      expect(result.success).toBe(true);
    });

    it('should format JSON', () => {
      const result = service.format('{"a":1,"b":2}', 'json');
      expect(result.success).toBe(true);
      expect(result.code).toContain('\n');
    });

    it('should format HTML', () => {
      const result = service.format('<div><span>hello</span></div>', 'html');
      expect(result.success).toBe(true);
    });

    it('should format CSS', () => {
      const result = service.format('.foo{color:red;margin:0}', 'css');
      expect(result.success).toBe(true);
    });

    it('should format Markdown', () => {
      const result = service.format('# Hello\n\nWorld', 'markdown');
      expect(result.success).toBe(true);
    });

    it('should return error for unsupported language with fallback', () => {
      const result = service.format('some code', 'unknown-lang');
      expect(result.success).toBe(true);
    });

    it('should respect config options', () => {
      const result = service.format('const x = 1;', 'typescript', {
        tabSize: 4,
        printWidth: 80,
        semi: true,
      });
      expect(result.success).toBe(true);
    });

    it('should lint code', () => {
      const result = service.lint('const x = 1;', 'typescript');
      expect(result.success).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should get supported languages', () => {
      const langs = service.getSupportedLanguages();
      expect(langs.length).toBeGreaterThan(0);
      expect(langs).toContain('javascript');
      expect(langs).toContain('typescript');
    });
  });

  describe('ThemeService', () => {
    let service: ThemeService;

    beforeEach(() => {
      service = new ThemeService();
    });

    it('should have a default theme', () => {
      const theme = service.getTheme();
      expect(theme).toBeDefined();
      expect(theme.id).toBeTruthy();
    });

    it('should list available themes', () => {
      const themes = service.getAvailableThemes();
      expect(themes.length).toBeGreaterThanOrEqual(2);
    });

    it('should switch to dark theme', () => {
      service.setTheme('dark');
      expect(service.getTheme().type).toBe('dark');
      expect(service.getThemeType()).toBe('dark');
    });

    it('should switch to light theme', () => {
      service.setTheme('dark');
      service.setTheme('light');
      expect(service.getTheme().type).toBe('light');
    });

    it('should get theme colors', () => {
      const theme = service.getTheme();
      expect(theme.colors.primary).toBeTruthy();
      expect(theme.colors.background).toBeTruthy();
      expect(theme.colors.textPrimary).toBeTruthy();
    });

    it('should detect dark mode', () => {
      service.setTheme('dark');
      expect(service.isDarkMode()).toBe(true);
      service.setTheme('light');
      expect(service.isDarkMode()).toBe(false);
    });

    it('should support system theme', () => {
      service.setTheme('system');
      expect(service.getThemeType()).toBe('system');
    });

    it('should set and use custom theme', () => {
      const customTheme = service.generateThemeFromColors('My Theme', '#FF5733');
      expect(customTheme.type).toBe('custom');
      expect(customTheme.name).toBe('My Theme');
      service.setCustomTheme(customTheme);
      expect(service.getTheme().id).toBe(customTheme.id);
    });

    it('should list custom themes', () => {
      const customTheme = service.generateThemeFromColors('Custom1', '#123456');
      service.setCustomTheme(customTheme);
      const customThemes = service.getCustomThemes();
      expect(customThemes.length).toBeGreaterThan(0);
    });

    it('should delete custom theme', () => {
      const customTheme = service.generateThemeFromColors('ToDelete', '#ABCDEF');
      service.setCustomTheme(customTheme);
      expect(service.getCustomThemes().length).toBeGreaterThan(0);
      service.deleteCustomTheme(customTheme.id);
      expect(service.getCustomThemes().some((t) => t.id === customTheme.id)).toBe(false);
    });

    it('should generate theme from primary color', () => {
      const theme = service.generateThemeFromColors('Test Theme', '#5B5FFF');
      expect(theme.id).toContain('custom-');
      expect(theme.colors.primary).toBeTruthy();
    });
  });
});
