// 代码库理解与索引系统
// 支持符号解析、依赖关系分析、代码语义检索

import { globalEventBus } from '../core/event-bus';

// 代码符号
export interface CodeSymbol {
  id: string;
  name: string;
  kind:
    | 'function'
    | 'class'
    | 'interface'
    | 'variable'
    | 'type'
    | 'enum'
    | 'module'
    | 'property'
    | 'method';
  filePath: string;
  startLine: number;
  endLine: number;
  signature?: string;
  documentation?: string;
  visibility: 'public' | 'private' | 'protected';
  isExported: boolean;
  isAsync: boolean;
  language: string;
  parent?: string;
  references: string[]; // 引用的其他符号 ID
}

// 文件索引
export interface FileIndex {
  path: string;
  hash: string;
  size: number;
  language: string;
  lastIndexed: number;
  symbols: CodeSymbol[];
  imports: { from: string; symbols: string[] }[];
  exports: string[];
  dependencies: string[];
}

// 搜索结果
export interface SearchResult {
  symbol: CodeSymbol;
  file: FileIndex;
  relevance: number;
  context: string;
  highlight: { line: number; text: string }[];
}

class CodeIndexService {
  private fileIndex = new Map<string, FileIndex>();
  private symbolsById = new Map<string, CodeSymbol>();
  private symbolsByName = new Map<string, Set<string>>();
  private symbolsByFile = new Map<string, Set<string>>();
  private indexListeners = new Set<(progress: number) => void>();
  private isIndexing = false;

  // 索引项目
  async indexProject(
    files: { path: string; content: string }[],
    onProgress?: (p: number) => void
  ): Promise<void> {
    if (this.isIndexing) return;
    this.isIndexing = true;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await this.indexFile(file.path, file.content);
        const progress = (i + 1) / files.length;
        onProgress?.(progress);
        for (const l of this.indexListeners) l(progress);
      }
      this.buildDependencyGraph();
      globalEventBus.emit('code-index:completed', {
        fileCount: files.length,
        symbolCount: this.symbolsById.size,
      });
    } finally {
      this.isIndexing = false;
    }
  }

  // 索引单个文件
  async indexFile(path: string, content: string): Promise<void> {
    const language = this.detectLanguage(path);
    const symbols = this.extractSymbols(path, content, language);
    const imports = this.extractImports(content, language);
    const exports = this.extractExports(content, language);

    const fileIndex: FileIndex = {
      path,
      hash: await this.hashContent(content),
      size: content.length,
      language,
      lastIndexed: Date.now(),
      symbols,
      imports,
      exports,
      dependencies: imports.map((i) => i.from),
    };

    // 清理旧符号
    const oldSymbols = this.symbolsByFile.get(path);
    if (oldSymbols) {
      for (const symId of oldSymbols) {
        this.symbolsById.delete(symId);
        const sym = this.findSymbolById(symId);
        if (sym) {
          const set = this.symbolsByName.get(sym.name);
          set?.delete(symId);
        }
      }
    }

    this.fileIndex.set(path, fileIndex);
    const fileSymbolIds = new Set<string>();
    for (const sym of symbols) {
      this.symbolsById.set(sym.id, sym);
      if (!this.symbolsByName.has(sym.name)) {
        this.symbolsByName.set(sym.name, new Set());
      }
      this.symbolsByName.get(sym.name)!.add(sym.id);
      fileSymbolIds.add(sym.id);
    }
    this.symbolsByFile.set(path, fileSymbolIds);
  }

  // 提取符号
  private extractSymbols(path: string, content: string, language: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const lines = content.split('\n');

    if (language === 'typescript' || language === 'javascript') {
      this.extractTypeScriptSymbols(path, lines, symbols);
    } else if (language === 'tsx' || language === 'jsx') {
      this.extractTypeScriptSymbols(path, lines, symbols);
      this.extractReactComponentSymbols(path, lines, symbols);
    } else if (language === 'python') {
      this.extractPythonSymbols(path, lines, symbols);
    }

    return symbols;
  }

  // TS/JS 符号提取
  private extractTypeScriptSymbols(path: string, lines: string[], symbols: CodeSymbol[]): void {
    const fileId = this.getFileKey(path);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNo = i + 1;

      // 函数声明
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
      if (funcMatch) {
        const endLine = this.findBlockEnd(lines, i);
        symbols.push({
          id: `${fileId}:func:${funcMatch[1]}:${lineNo}`,
          name: funcMatch[1],
          kind: 'function',
          filePath: path,
          startLine: lineNo,
          endLine,
          signature: line.trim(),
          visibility: 'public',
          isExported: line.includes('export'),
          isAsync: line.includes('async'),
          language: 'typescript',
          references: [],
        });
        continue;
      }

      // 类声明
      const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
      if (classMatch) {
        const endLine = this.findBlockEnd(lines, i);
        symbols.push({
          id: `${fileId}:class:${classMatch[1]}:${lineNo}`,
          name: classMatch[1],
          kind: 'class',
          filePath: path,
          startLine: lineNo,
          endLine,
          signature: line.trim(),
          visibility: 'public',
          isExported: line.includes('export'),
          isAsync: false,
          language: 'typescript',
          references: [],
        });

        // 提取类方法
        this.extractClassMethods(path, lines, i, endLine, classMatch[1], symbols);
        continue;
      }

      // 接口/类型
      const ifaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/);
      if (ifaceMatch) {
        const endLine = this.findBlockEnd(lines, i);
        symbols.push({
          id: `${fileId}:interface:${ifaceMatch[1]}:${lineNo}`,
          name: ifaceMatch[1],
          kind: 'interface',
          filePath: path,
          startLine: lineNo,
          endLine,
          signature: line.trim(),
          visibility: 'public',
          isExported: line.includes('export'),
          isAsync: false,
          language: 'typescript',
          references: [],
        });
        continue;
      }

      const typeMatch = line.match(/(?:export\s+)?type\s+(\w+)\s*=/);
      if (typeMatch) {
        symbols.push({
          id: `${fileId}:type:${typeMatch[1]}:${lineNo}`,
          name: typeMatch[1],
          kind: 'type',
          filePath: path,
          startLine: lineNo,
          endLine: lineNo,
          signature: line.trim(),
          visibility: 'public',
          isExported: line.includes('export'),
          isAsync: false,
          language: 'typescript',
          references: [],
        });
      }

      // 变量声明
      const varMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[:=]/);
      if (varMatch && !line.includes('function')) {
        symbols.push({
          id: `${fileId}:var:${varMatch[1]}:${lineNo}`,
          name: varMatch[1],
          kind: 'variable',
          filePath: path,
          startLine: lineNo,
          endLine: lineNo,
          signature: line.trim(),
          visibility: 'public',
          isExported: line.includes('export'),
          isAsync: false,
          language: 'typescript',
          references: [],
        });
      }
    }
  }

  // 类方法提取
  private extractClassMethods(
    path: string,
    lines: string[],
    startLine: number,
    endLine: number,
    className: string,
    symbols: CodeSymbol[]
  ): void {
    const fileId = this.getFileKey(path);
    for (let i = startLine + 1; i < endLine; i++) {
      const line = lines[i];
      const methodMatch = line.match(
        /^\s*(public\s+|private\s+|protected\s+)?(static\s+)?(async\s+)?(\w+)\s*\(([^)]*)\)\s*[:{]/
      );
      if (methodMatch && methodMatch[4] !== 'constructor') {
        const visibility = (methodMatch[1]?.trim() as any) || 'public';
        const isStatic = !!methodMatch[2];
        const isAsync = !!methodMatch[3];
        const methodName = methodMatch[4];
        const methodEnd = this.findBlockEnd(lines, i);
        symbols.push({
          id: `${fileId}:method:${className}.${methodName}:${i + 1}`,
          name: `${className}.${methodName}`,
          kind: 'method',
          filePath: path,
          startLine: i + 1,
          endLine: methodEnd,
          signature: line.trim(),
          visibility,
          isExported: false,
          isAsync,
          language: 'typescript',
          parent: `${fileId}:class:${className}`,
          references: [],
        });
      }
    }
  }

  // React 组件提取
  private extractReactComponentSymbols(path: string, lines: string[], symbols: CodeSymbol[]): void {
    const fileId = this.getFileKey(path);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const compMatch = line.match(
        /(?:export\s+)?(?:const|function)\s+(\w+)\s*[:=]\s*(?:React\.)?(?:FC|FunctionComponent|memo|forwardRef)/
      );
      if (compMatch) {
        symbols.push({
          id: `${fileId}:component:${compMatch[1]}:${i + 1}`,
          name: compMatch[1],
          kind: 'class',
          filePath: path,
          startLine: i + 1,
          endLine: this.findBlockEnd(lines, i),
          signature: line.trim(),
          visibility: 'public',
          isExported: line.includes('export'),
          isAsync: false,
          language: 'tsx',
          references: [],
        });
      }
    }
  }

  // Python 符号提取
  private extractPythonSymbols(path: string, lines: string[], symbols: CodeSymbol[]): void {
    const fileId = this.getFileKey(path);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const funcMatch = line.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
      if (funcMatch) {
        const indent = line.search(/\S/);
        const endLine = this.findPythonBlockEnd(lines, i, indent);
        symbols.push({
          id: `${fileId}:func:${funcMatch[1]}:${i + 1}`,
          name: funcMatch[1],
          kind: 'function',
          filePath: path,
          startLine: i + 1,
          endLine,
          signature: line.trim(),
          visibility: line.startsWith('_') ? 'private' : 'public',
          isExported: !line.startsWith('_'),
          isAsync: line.includes('async def'),
          language: 'python',
          references: [],
        });
      }
      const classMatch = line.match(/^class\s+(\w+)/);
      if (classMatch) {
        const indent = line.search(/\S/);
        const endLine = this.findPythonBlockEnd(lines, i, indent);
        symbols.push({
          id: `${fileId}:class:${classMatch[1]}:${i + 1}`,
          name: classMatch[1],
          kind: 'class',
          filePath: path,
          startLine: i + 1,
          endLine,
          signature: line.trim(),
          visibility: 'public',
          isExported: true,
          isAsync: false,
          language: 'python',
          references: [],
        });
      }
    }
  }

  // 查找代码块结束
  private findBlockEnd(lines: string[], startLine: number): number {
    let braceCount = 0;
    let foundFirstBrace = false;
    for (let i = startLine; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') {
          braceCount++;
          foundFirstBrace = true;
        } else if (ch === '}') {
          braceCount--;
          if (foundFirstBrace && braceCount === 0) return i + 1;
        }
      }
    }
    return lines.length;
  }

  // Python 块结束
  private findPythonBlockEnd(lines: string[], startLine: number, baseIndent: number): number {
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '' || line.trim().startsWith('#')) continue;
      const indent = line.search(/\S/);
      if (indent <= baseIndent) return i;
    }
    return lines.length;
  }

  // 提取 imports
  private extractImports(content: string, language: string): { from: string; symbols: string[] }[] {
    const imports: { from: string; symbols: string[] }[] = [];
    const importRegex = /import\s+(?:\{([^}]+)\}\s+from\s+)?(?:(\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content))) {
      const symbols = match[1]
        ? match[1].split(',').map((s) => s.trim())
        : match[2]
          ? [match[2]]
          : [];
      imports.push({ from: match[3], symbols });
    }
    return imports;
  }

  // 提取 exports
  private extractExports(content: string, language: string): string[] {
    const exports: string[] = [];
    const exportRegex =
      /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content))) {
      exports.push(match[1]);
    }
    return exports;
  }

  // 构建依赖图
  private buildDependencyGraph(): void {
    for (const file of this.fileIndex.values()) {
      for (const imp of file.imports) {
        for (const symName of imp.symbols) {
          const symIds = this.symbolsByName.get(symName);
          if (symIds) {
            for (const symId of symIds) {
              const sym = this.symbolsById.get(symId);
              if (sym) sym.references.push(file.path);
            }
          }
        }
      }
    }
  }

  // 搜索符号
  searchSymbols(
    query: string,
    options?: { kind?: CodeSymbol['kind']; limit?: number }
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const limit = options?.limit || 20;
    const lowerQuery = query.toLowerCase();

    // 精确名称匹配
    const exactMatches = this.symbolsByName.get(query) || new Set();
    for (const id of exactMatches) {
      const sym = this.symbolsById.get(id);
      if (sym && (!options?.kind || sym.kind === options.kind)) {
        const file = this.fileIndex.get(sym.filePath);
        if (file) {
          results.push({
            symbol: sym,
            file,
            relevance: 100,
            context: sym.signature || sym.name,
            highlight: [],
          });
        }
      }
    }

    // 模糊匹配
    if (results.length < limit) {
      for (const [name, ids] of this.symbolsByName) {
        if (name.toLowerCase().includes(lowerQuery)) {
          for (const id of ids) {
            const sym = this.symbolsById.get(id);
            if (
              sym &&
              !results.find((r) => r.symbol.id === sym.id) &&
              (!options?.kind || sym.kind === options.kind)
            ) {
              const file = this.fileIndex.get(sym.filePath);
              if (file) {
                results.push({
                  symbol: sym,
                  file,
                  relevance: name.toLowerCase() === lowerQuery ? 80 : 50,
                  context: sym.signature || sym.name,
                  highlight: [],
                });
              }
            }
          }
        }
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  // 查找符号定义
  findDefinition(name: string): CodeSymbol[] {
    const ids = this.symbolsByName.get(name);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.symbolsById.get(id)!)
      .filter(Boolean);
  }

  // 查找引用
  findReferences(symbolId: string): { file: string; line: number; text: string }[] {
    const sym = this.symbolsById.get(symbolId);
    if (!sym) return [];

    const refs: { file: string; line: number; text: string }[] = [];
    for (const file of this.fileIndex.values()) {
      const lines = file.path === sym.filePath ? [] : [];
      // 简单扫描：实际应读取文件内容
      refs.push(...lines.map((l) => ({ file: file.path, line: 0, text: l })));
    }
    return refs;
  }

  // 获取文件索引
  getFileIndex(path: string): FileIndex | undefined {
    return this.fileIndex.get(path);
  }

  // 列出所有文件
  listFiles(filter?: { language?: string }): FileIndex[] {
    const files = Array.from(this.fileIndex.values());
    if (filter?.language) return files.filter((f) => f.language === filter.language);
    return files;
  }

  // 统计
  getStats(): { files: number; symbols: number; languages: Record<string, number> } {
    const languages: Record<string, number> = {};
    for (const file of this.fileIndex.values()) {
      languages[file.language] = (languages[file.language] || 0) + 1;
    }
    return {
      files: this.fileIndex.size,
      symbols: this.symbolsById.size,
      languages,
    };
  }

  // 检测语言
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      glsl: 'glsl',
      shader: 'shader',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      md: 'markdown',
    };
    return map[ext] || 'plaintext';
  }

  // 内容哈希
  private async hashContent(content: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buffer = new TextEncoder().encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16);
    }
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  private findSymbolById(id: string): CodeSymbol | undefined {
    return this.symbolsById.get(id);
  }

  private getFileKey(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, '_');
  }

  // 订阅索引进度
  subscribeIndex(listener: (progress: number) => void): () => void {
    this.indexListeners.add(listener);
    return () => {
      this.indexListeners.delete(listener);
    };
  }

  // 清空索引
  clear(): void {
    this.fileIndex.clear();
    this.symbolsById.clear();
    this.symbolsByName.clear();
    this.symbolsByFile.clear();
  }
}

export const codeIndexService = new CodeIndexService();
