import type { Snippet, SnippetCategory, SnippetContext, SnippetInsertResult } from '@tapdev/types';

class SnippetService {
  private snippets: Map<string, Snippet> = new Map();
  private categories: Map<string, SnippetCategory> = new Map();
  private userSnippets: Snippet[] = [];

  constructor() {
    this.loadBuiltinSnippets();
  }

  private loadBuiltinSnippets(): void {
    const builtinCategories: SnippetCategory[] = [
      {
        id: 'javascript',
        name: 'JavaScript',
        icon: 'code',
        snippets: [
          {
            id: 'js-console-log',
            name: 'console.log',
            description: '输出日志',
            category: 'javascript',
            prefix: 'log',
            body: ['console.log(${1:message});'],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-console-error',
            name: 'console.error',
            description: '输出错误',
            category: 'javascript',
            prefix: 'error',
            body: ['console.error(${1:error});'],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-console-warning',
            name: 'console.warn',
            description: '输出警告',
            category: 'javascript',
            prefix: 'warn',
            body: ['console.warn(${1:message});'],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-function',
            name: '函数定义',
            description: '创建函数',
            category: 'javascript',
            prefix: 'func',
            body: [
              'function ${1:functionName}(${2:params}) {',
              '  ${3:// code}',
              '}'
            ],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-arrow-function',
            name: '箭头函数',
            description: '创建箭头函数',
            category: 'javascript',
            prefix: 'arrow',
            body: [
              'const ${1:functionName} = (${2:params}) => {',
              '  ${3:// code}',
              '};'
            ],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-async-function',
            name: '异步函数',
            description: '创建异步函数',
            category: 'javascript',
            prefix: 'async',
            body: [
              'async function ${1:functionName}(${2:params}) {',
              '  ${3:// code}',
              '}'
            ],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-if',
            name: 'if 语句',
            description: '条件判断',
            category: 'javascript',
            prefix: 'if',
            body: [
              'if (${1:condition}) {',
              '  ${2:// code}',
              '}'
            ],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-if-else',
            name: 'if-else 语句',
            description: '条件判断带else',
            category: 'javascript',
            prefix: 'ife',
            body: [
              'if (${1:condition}) {',
              '  ${2:// code}',
              '} else {',
              '  ${3:// code}',
              '}'
            ],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-for-loop',
            name: 'for 循环',
            description: 'for循环',
            category: 'javascript',
            prefix: 'for',
            body: [
              'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {',
              '  ${3:// code}',
              '}'
            ],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-for-each',
            name: 'forEach',
            description: '数组遍历',
            category: 'javascript',
            prefix: 'forEach',
            body: ['${1:array}.forEach((${2:item}) => {', '  ${3:// code}', '});'],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-try-catch',
            name: 'try-catch',
            description: '异常处理',
            category: 'javascript',
            prefix: 'try',
            body: [
              'try {',
              '  ${1:// code}',
              '} catch (${2:error}) {',
              '  ${3:// handle error}',
              '}'
            ],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-import',
            name: 'import',
            description: '导入模块',
            category: 'javascript',
            prefix: 'import',
            body: ["import ${1:module} from '${2:path}';"],
            scope: 'javascript,typescript'
          },
          {
            id: 'js-export',
            name: 'export',
            description: '导出模块',
            category: 'javascript',
            prefix: 'export',
            body: ['export ${1:default} ${2:value};'],
            scope: 'javascript,typescript'
          }
        ]
      },
      {
        id: 'typescript',
        name: 'TypeScript',
        icon: 'file-code',
        snippets: [
          {
            id: 'ts-interface',
            name: '接口定义',
            description: '创建接口',
            category: 'typescript',
            prefix: 'interface',
            body: [
              'interface ${1:InterfaceName} {',
              '  ${2:// properties}',
              '}'
            ],
            scope: 'typescript'
          },
          {
            id: 'ts-type',
            name: '类型定义',
            description: '创建类型别名',
            category: 'typescript',
            prefix: 'type',
            body: ['type ${1:TypeName} = ${2:type};'],
            scope: 'typescript'
          },
          {
            id: 'ts-class',
            name: '类定义',
            description: '创建类',
            category: 'typescript',
            prefix: 'class',
            body: [
              'class ${1:ClassName} {',
              '  ${2:// properties}',
              '',
              '  constructor(${3:params}) {',
              '    ${4:// init}',
              '  }',
              '}'
            ],
            scope: 'typescript'
          },
          {
            id: 'ts-enum',
            name: '枚举定义',
            description: '创建枚举',
            category: 'typescript',
            prefix: 'enum',
            body: [
              'enum ${1:EnumName} {',
              '  ${2:Value} = ${3:0},',
              '}'
            ],
            scope: 'typescript'
          },
          {
            id: 'ts-generic',
            name: '泛型函数',
            description: '创建泛型函数',
            category: 'typescript',
            prefix: 'generic',
            body: [
              'function ${1:functionName}<${2:T}>(${3:param}: ${2:T}): ${2:T} {',
              '  ${4:// code}',
              '}'
            ],
            scope: 'typescript'
          }
        ]
      },
      {
        id: 'react',
        name: 'React',
        icon: 'atom',
        snippets: [
          {
            id: 'react-component',
            name: '函数组件',
            description: '创建React函数组件',
            category: 'react',
            prefix: 'rc',
            body: [
              'import React from \'react\';',
              '',
              'interface ${1:ComponentName}Props {',
              '  ${2:// props}',
              '}',
              '',
              'export function ${1:ComponentName}(props: ${1:ComponentName}Props) {',
              '  return (',
              '    <div>',
              '      ${3:// content}',
              '    </div>',
              '  );',
              '}'
            ],
            scope: 'typescriptreact,jsx,tsx'
          },
          {
            id: 'react-usestate',
            name: 'useState',
            description: '状态钩子',
            category: 'react',
            prefix: 'usestate',
            body: ['const [${1:state}, set${1/(.*)/${1:/capitalize}/}State] = React.useState(${2:initialValue});'],
            scope: 'typescriptreact,jsx,tsx'
          },
          {
            id: 'react-useeffect',
            name: 'useEffect',
            description: '副作用钩子',
            category: 'react',
            prefix: 'useeffect',
            body: [
              'React.useEffect(() => {',
              '  ${1:// effect}',
              '',
              '  return () => {',
              '    ${2:// cleanup}',
              '  };',
              '}, [${3:dependencies}]);'
            ],
            scope: 'typescriptreact,jsx,tsx'
          },
          {
            id: 'react-usecallback',
            name: 'useCallback',
            description: '回调钩子',
            category: 'react',
            prefix: 'usecallback',
            body: ['const ${1:callback} = React.useCallback((${2:params}) => {', '  ${3:// code}', '}, [${4:dependencies}]);'],
            scope: 'typescriptreact,jsx,tsx'
          },
          {
            id: 'react-usememo',
            name: 'useMemo',
            description: '记忆钩子',
            category: 'react',
            prefix: 'usememo',
            body: ['const ${1:value} = React.useMemo(() => {', '  ${2:// computation}', '}, [${3:dependencies}]);'],
            scope: 'typescriptreact,jsx,tsx'
          }
        ]
      },
      {
        id: 'tapdev',
        name: 'TapDev',
        icon: 'gamepad-2',
        snippets: [
          {
            id: 'tapdev-import',
            name: '导入TapDev模块',
            description: '导入TapDev核心模块',
            category: 'tapdev',
            prefix: 'tapdev',
            body: ["import { ${1:service} } from '@tapdev/core';"]
          },
          {
            id: 'tapdev-debug',
            name: '调试日志',
            description: '输出调试日志',
            category: 'tapdev',
            prefix: 'taplog',
            body: ['debugService.log({ message: ${1:message}, level: \'${2:info}\' });']
          },
          {
            id: 'tapdev-event',
            name: '事件监听',
            description: '监听全局事件',
            category: 'tapdev',
            prefix: 'taplisten',
            body: ['globalEventBus.on(\'${1:event}\', (${2:data}) => {', '  ${3:// handler}', '});']
          },
          {
            id: 'tapdev-monitor',
            name: '监控指标',
            description: '记录监控指标',
            category: 'tapdev',
            prefix: 'tapmonitor',
            body: ['monitorService.recordNetworkRequest({', '  url: \'${1:url}\',', '  method: \'${2:GET}\',', '  status: ${3:200},', '  duration: ${4:100},', '  size: ${5:1024},', '  type: \'${6:fetch}\',', '});']
          }
        ]
      }
    ];

    for (const category of builtinCategories) {
      this.categories.set(category.id, category);
      for (const snippet of category.snippets) {
        this.snippets.set(snippet.id, snippet);
      }
    }
  }

  getCategories(): SnippetCategory[] {
    return Array.from(this.categories.values());
  }

  getCategory(id: string): SnippetCategory | undefined {
    return this.categories.get(id);
  }

  getSnippets(): Snippet[] {
    return [...this.snippets.values(), ...this.userSnippets];
  }

  getSnippet(id: string): Snippet | undefined {
    return this.snippets.get(id) || this.userSnippets.find(s => s.id === id);
  }

  searchSnippets(query: string): Snippet[] {
    const lowerQuery = query.toLowerCase();
    return this.getSnippets().filter(snippet =>
      snippet.name.toLowerCase().includes(lowerQuery) ||
      snippet.description.toLowerCase().includes(lowerQuery) ||
      snippet.prefix.toLowerCase().includes(lowerQuery) ||
      snippet.category.toLowerCase().includes(lowerQuery)
    );
  }

  addUserSnippet(snippet: Snippet): void {
    const exists = this.userSnippets.find(s => s.id === snippet.id);
    if (exists) {
      const index = this.userSnippets.indexOf(exists);
      this.userSnippets[index] = snippet;
    } else {
      this.userSnippets.push(snippet);
    }
  }

  removeUserSnippet(id: string): boolean {
    const index = this.userSnippets.findIndex(s => s.id === id);
    if (index !== -1) {
      this.userSnippets.splice(index, 1);
      return true;
    }
    return false;
  }

  insertSnippet(snippet: Snippet, context: SnippetContext): SnippetInsertResult {
    try {
      const body = snippet.body.join('\n');
      const text = this.replaceVariables(body, context);
      
      return {
        success: true,
        snippet,
        insertedText: text
      };
    } catch (error) {
      return {
        success: false
      };
    }
  }

  private replaceVariables(text: string, context: SnippetContext): string {
    let result = text;
    
    result = result.replace(/\${1:([^}]*)}/g, (_, defaultValue) => defaultValue);
    result = result.replace(/\${2:([^}]*)}/g, (_, defaultValue) => defaultValue);
    result = result.replace(/\${3:([^}]*)}/g, (_, defaultValue) => defaultValue);
    result = result.replace(/\${4:([^}]*)}/g, (_, defaultValue) => defaultValue);
    result = result.replace(/\${5:([^}]*)}/g, (_, defaultValue) => defaultValue);
    
    result = result.replace(/\${TM_FILENAME}/g, context.fileName);
    result = result.replace(/\${TM_LINE_NUMBER}/g, String(context.lineNumber));
    result = result.replace(/\${TM_SELECTED_TEXT}/g, context.selectedText);
    
    return result;
  }

  getSnippetsByLanguage(language: string): Snippet[] {
    return this.getSnippets().filter(snippet => {
      if (!snippet.scope) return true;
      const scopes = snippet.scope.split(',');
      return scopes.some(scope => language.includes(scope.trim()));
    });
  }

  getSnippetsByCategory(categoryId: string): Snippet[] {
    const category = this.categories.get(categoryId);
    if (category) {
      return [...category.snippets, ...this.userSnippets.filter(s => s.category === categoryId)];
    }
    return this.userSnippets.filter(s => s.category === categoryId);
  }
}

export const snippetService = new SnippetService();
export { SnippetService };
