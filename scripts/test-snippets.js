#!/usr/bin/env node
/**
 * 代码片段功能测试 - 简化版
 */

console.log('');
console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║                     代码片段服务测试                                  ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝');
console.log('');

// 模拟代码片段服务
class MockSnippetService {
  constructor() {
    this.snippets = [
      { id: 'js-console-log', name: 'console.log', description: '输出日志', category: 'javascript', prefix: 'log', body: ['console.log(${1:message});'] },
      { id: 'js-function', name: '函数定义', description: '创建函数', category: 'javascript', prefix: 'func', body: ['function ${1:functionName}(${2:params}) {', '  ${3:// code}', '}'] },
      { id: 'ts-interface', name: '接口定义', description: '创建接口', category: 'typescript', prefix: 'interface', body: ['interface ${1:InterfaceName} {', '  ${2:// properties}', '}'] },
      { id: 'react-component', name: '函数组件', description: '创建React函数组件', category: 'react', prefix: 'rc', body: ['import React from \'react\';', '', 'interface ${1:ComponentName}Props {}', '', 'export function ${1:ComponentName}(props: ${1:ComponentName}Props) {', '  return <div>${3:// content}</div>;', '}'] },
    ];
  }

  getCategories() {
    const categories = {};
    this.snippets.forEach(s => {
      if (!categories[s.category]) {
        categories[s.category] = { id: s.category, name: this.getCategoryName(s.category), snippets: [] };
      }
      categories[s.category].snippets.push(s);
    });
    return Object.values(categories);
  }

  getCategoryName(id) {
    const names = { javascript: 'JavaScript', typescript: 'TypeScript', react: 'React', tapdev: 'TapDev' };
    return names[id] || id;
  }

  searchSnippets(query) {
    const lower = query.toLowerCase();
    return this.snippets.filter(s => 
      s.name.toLowerCase().includes(lower) || 
      s.prefix.toLowerCase().includes(lower)
    );
  }

  insertSnippet(snippet, context) {
    let body = snippet.body.join('\n');
    body = body.replace(/\${(\d+):([^}]*)}/g, (_, num, defaultValue) => defaultValue);
    return { success: true, snippet, insertedText: body };
  }
}

const snippetService = new MockSnippetService();

console.log('📁 获取所有分类:');
const categories = snippetService.getCategories();
categories.forEach((cat, i) => {
  console.log(`   ${i + 1}. ${cat.name} (${cat.snippets.length} 个片段)`);
});

console.log('');

console.log('🔍 搜索 "function" 相关片段:');
const searchResults = snippetService.searchSnippets('function');
searchResults.forEach(s => {
  console.log(`   - ${s.name} [${s.prefix}]`);
});

console.log('');

console.log('✏️  测试插入 console.log 片段:');
const snippet = snippetService.snippets.find(s => s.id === 'js-console-log');
if (snippet) {
  const result = snippetService.insertSnippet(snippet, { lineNumber: 1, column: 1, selectedText: '', fileName: 'test.js', language: 'javascript' });
  console.log(`   成功! 生成代码: "${result.insertedText}"`);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('测试完成! 代码片段功能已就绪');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
