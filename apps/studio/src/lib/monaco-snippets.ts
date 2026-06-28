import type { Monaco } from '@monaco-editor/react';
import { snippetService } from '@tapdev/core';
import type { Snippet } from '@tapdev/types';

export function registerSnippets(monaco: Monaco) {
  const languages = ['javascript', 'typescript', 'json', 'csharp', 'css', 'html', 'markdown'];

  languages.forEach((lang) => {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const snippets = snippetService.getSnippetsByLanguage(lang);

        const suggestions = snippets.map((s) => ({
          label: s.prefix,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: s.description,
          detail: s.name,
          insertText: s.body.join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
          range: range,
        }));

        return { suggestions };
      },
    });
  });
}
