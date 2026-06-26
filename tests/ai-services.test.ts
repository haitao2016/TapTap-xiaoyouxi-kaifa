import {
  aiCompletionService,
  aiErrorDiagnosis,
  aiCodeGenService,
  aiAssistantService,
} from '../packages/core/src/ai';

describe('Phase 7: AI Services', () => {
  describe('AICompletionService', () => {
    it('should provide default config', () => {
      const config = aiCompletionService.getConfig();
      expect(config.provider).toBe('mock');
      expect(config.temperature).toBeGreaterThanOrEqual(0);
    });

    it('should list models for each provider', () => {
      expect(aiCompletionService.listModels('openai').length).toBeGreaterThan(0);
      expect(aiCompletionService.listModels('claude').length).toBeGreaterThan(0);
      expect(aiCompletionService.listModels('ollama').length).toBeGreaterThan(0);
    });

    it('should configure provider', () => {
      aiCompletionService.configure({ provider: 'openai', apiKey: 'test-key', model: 'gpt-4' });
      const config = aiCompletionService.getConfig();
      expect(config.provider).toBe('openai');
      expect(config.apiKey).toBe('test-key');
      aiCompletionService.configure({ provider: 'mock' });
    });

    it('should complete with mock provider', async () => {
      aiCompletionService.configure({ provider: 'mock' });
      const result = await aiCompletionService.complete({
        id: 'c1',
        multiline: false,
        context: {
          filePath: 'test.ts',
          language: 'typescript',
          prefix: 'console.',
          suffix: '',
          cursor: { line: 0, column: 8 },
        },
      });
      expect(result.text).toBeTruthy();
    });
  });

  describe('AIErrorDiagnosis', () => {
    it('should classify network errors', async () => {
      const result = await aiErrorDiagnosis.diagnose({
        message: 'Network request failed: timeout',
        filePath: 'app.ts',
        line: 10,
      });
      expect(result.category).toBe('network');
      expect(result.fixes.length).toBeGreaterThan(0);
    });

    it('should classify sdk errors', async () => {
      const result = await aiErrorDiagnosis.diagnose({
        message: 'TapTap SDK not initialized',
      });
      expect(result.category).toBe('sdk');
    });

    it('should classify syntax errors', async () => {
      const result = await aiErrorDiagnosis.diagnose({
        message: 'Unexpected token in expression',
      });
      expect(result.category).toBe('syntax');
    });

    it('should track diagnosis history', async () => {
      const before = aiErrorDiagnosis.getHistory().length;
      await aiErrorDiagnosis.diagnose({ message: 'Some error' });
      const after = aiErrorDiagnosis.getHistory().length;
      expect(after).toBe(before + 1);
    });
  });

  describe('AICodeGenService', () => {
    it('should generate code from description', async () => {
      const result = await aiCodeGenService.generateCode({
        id: 'g1',
        action: 'generate',
        prompt: 'Create a function that returns hello world',
        language: 'typescript',
      });
      expect(result.code.length).toBeGreaterThan(0);
      expect(result.action).toBe('generate');
    });

    it('should generate test code', async () => {
      const result = await aiCodeGenService.generateCode({
        id: 'g2',
        action: 'test',
        prompt: '',
        fileContent: 'function add(a, b) { return a + b; }',
        language: 'typescript',
        filePath: 'math.ts',
      });
      expect(result.code).toContain('describe');
    });

    it('should produce diffs for refactor', async () => {
      const result = await aiCodeGenService.generateCode({
        id: 'g3',
        action: 'refactor',
        prompt: 'Use arrow functions',
        fileContent: 'function foo() { return 1; }',
        language: 'typescript',
        filePath: 'a.ts',
        selection: { start: 0, end: 25 },
      });
      expect(result.diffs.length).toBeGreaterThan(0);
    });
  });

  describe('AIAssistantService', () => {
    it('should have an initial active session', () => {
      const session = aiAssistantService.getActiveSession();
      expect(session).not.toBeNull();
    });

    it('should create a new session', () => {
      const session = aiAssistantService.createSession('Test');
      expect(session.title).toBe('Test');
      expect(aiAssistantService.getActiveSession()?.id).toBe(session.id);
    });

    it('should list sessions', () => {
      const list = aiAssistantService.listSessions();
      expect(list.length).toBeGreaterThan(0);
    });

    it('should index project files for @-references', () => {
      aiAssistantService.indexProjectFiles([
        { path: 'src/foo.ts', content: 'export function bar() {}' },
      ]);
      // 索引成功
    });

    it('should parse @ references', () => {
      aiAssistantService.indexProjectFiles([{ path: 'src/util.ts', content: 'export const x = 1;' }]);
      const { clean, refs } = aiAssistantService.parseReferences('how to use @src/util.ts?');
      expect(refs.length).toBe(1);
      expect(refs[0]!.path).toBe('src/util.ts');
    });
  });
});
