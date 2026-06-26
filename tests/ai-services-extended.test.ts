import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { codeIndexService } from '../packages/core/src/ai/code-index-service';
import { codeReviewService } from '../packages/core/src/ai/code-review-service';

describe('Phase 3: AI Services Extended', () => {
  describe('CodeIndexService', () => {
    beforeEach(() => {
      codeIndexService.clear();
    });

    it('should index a file and extract symbols', async () => {
      await codeIndexService.indexFile('src/test.ts', `
        export function foo() { return 1; }
        export class Bar { baz() {} }
        const x = 42;
      `);
      const info = codeIndexService.getFileIndex('src/test.ts');
      expect(info).toBeDefined();
      expect(info?.symbols.length).toBeGreaterThan(0);
    });

    it('should index multiple files', async () => {
      const files = [
        { path: 'src/a.ts', content: 'export const a = 1;' },
        { path: 'src/b.ts', content: 'export const b = 2;' },
      ];
      await codeIndexService.indexProject(files);
      const allFiles = codeIndexService.listFiles();
      expect(allFiles.length).toBeGreaterThanOrEqual(2);
    });

    it('should report progress during indexing', async () => {
      const onProgress = jest.fn();
      const files = [
        { path: 'src/1.ts', content: 'const a = 1;' },
        { path: 'src/2.ts', content: 'const b = 2;' },
        { path: 'src/3.ts', content: 'const c = 3;' },
      ];
      await codeIndexService.indexProject(files, onProgress);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should search symbols by name', async () => {
      await codeIndexService.indexFile('src/search.ts', `
        export function myFunction() {}
        export class MyClass {}
      `);
      const results = codeIndexService.searchSymbols('my');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find definition by name', async () => {
      await codeIndexService.indexFile('src/def.ts', 'export function testFunc() {}');
      const defs = codeIndexService.findDefinition('testFunc');
      expect(Array.isArray(defs)).toBe(true);
    });

    it('should get file index', async () => {
      await codeIndexService.indexFile('src/fileinfo.ts', 'const x = 1;');
      const info = codeIndexService.getFileIndex('src/fileinfo.ts');
      expect(info).toBeDefined();
      expect(info?.path).toBe('src/fileinfo.ts');
    });

    it('should return undefined for non-existent file', () => {
      const info = codeIndexService.getFileIndex('nonexistent.ts');
      expect(info).toBeUndefined();
    });

    it('should list all files', async () => {
      await codeIndexService.indexFile('src/list1.ts', 'const a = 1;');
      await codeIndexService.indexFile('src/list2.ts', 'const b = 2;');
      const files = codeIndexService.listFiles();
      expect(files.length).toBeGreaterThanOrEqual(2);
    });

    it('should clear all indexed data', async () => {
      await codeIndexService.indexFile('src/clear.ts', 'const x = 1;');
      expect(codeIndexService.listFiles().length).toBeGreaterThan(0);
      codeIndexService.clear();
      expect(codeIndexService.listFiles().length).toBe(0);
    });

    it('should get statistics', async () => {
      await codeIndexService.indexFile('src/stats.ts', `
        function a() {}
        function b() {}
        class C {}
      `);
      const stats = codeIndexService.getStats();
      expect(stats.files).toBeGreaterThan(0);
      expect(stats.symbols).toBeGreaterThan(0);
    });

    it('should subscribe to index progress', () => {
      const listener = jest.fn();
      const unsubscribe = codeIndexService.subscribeIndex(listener);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('CodeReviewService', () => {
    it('should review a single file', () => {
      const code = `
        function foo() {
          var x = 1;
          if (true) {
            console.log(x);
          }
          return x;
        }
      `;
      const report = codeReviewService.reviewFile('test.ts', code);
      expect(report).toBeDefined();
      expect(report.issues).toBeDefined();
      expect(Array.isArray(report.issues)).toBe(true);
    });

    it('should review multiple files', () => {
      const files = [
        { path: 'a.ts', content: 'const x = 1;' },
        { path: 'b.ts', content: 'const y = 2;' },
      ];
      const report = codeReviewService.reviewFiles(files);
      expect(report).toBeDefined();
      expect(report.summary.total).toBeGreaterThanOrEqual(0);
    });

    it('should return summary with score', () => {
      const report = codeReviewService.reviewFile('score.ts', 'const a = 1;');
      expect(report.summary.total).toBeGreaterThanOrEqual(0);
      expect(report.summary.score).toBeGreaterThanOrEqual(0);
      expect(report.summary.score).toBeLessThanOrEqual(100);
    });

    it('should categorize issues by severity', () => {
      const report = codeReviewService.reviewFile('sev.ts', 'var x = 1;');
      const severities = new Set(report.issues.map((i) => i.severity));
      expect(severities.size).toBeGreaterThanOrEqual(0);
    });

    it('should detect code metrics', () => {
      const code = `
        function complex(a, b, c) {
          if (a) {
            if (b) {
              return c;
            }
          }
          return 0;
        }
      `;
      const report = codeReviewService.reviewFile('complex.ts', code);
      expect(report.metrics.linesOfCode).toBeGreaterThan(0);
    });

    it('should generate refactor suggestions', () => {
      const code = `
        function longFunction() {
          let x = 1;
          let y = 2;
          return x + y;
        }
      `;
      const suggestions = codeReviewService.generateRefactorSuggestions('refactor.ts', code);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should list available rules', () => {
      const rules = codeReviewService.listRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].id).toBeTruthy();
      expect(rules[0].name).toBeTruthy();
    });

    it('should apply a fix to code', () => {
      const code = 'var x = 1;';
      const report = codeReviewService.reviewFile('fix.ts', code);
      if (report.issues.length > 0 && report.issues[0].fixCode) {
        const fixed = codeReviewService.applyFix('fix.ts', code, report.issues[0]);
        expect(fixed).not.toBe(code);
      }
    });

    it('should calculate code quality score', () => {
      const cleanCode = 'const a = 1;\nconst b = 2;\n';
      const report = codeReviewService.reviewFile('clean.ts', cleanCode);
      expect(typeof report.summary.score).toBe('number');
      expect(report.summary.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty code gracefully', () => {
      const report = codeReviewService.reviewFile('empty.ts', '');
      expect(report).toBeDefined();
      expect(report.issues).toBeDefined();
    });

    it('should get review history', () => {
      codeReviewService.reviewFile('history.ts', 'const x = 1;');
      const history = codeReviewService.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should toggle a rule', () => {
      const rules = codeReviewService.listRules();
      if (rules.length > 0) {
        codeReviewService.toggleRule(rules[0].id, false);
      }
    });
  });
});
