export interface Snippet {
  id: string;
  name: string;
  description: string;
  category: string;
  prefix: string;
  body: string[];
  scope?: string;
  variables?: Record<string, string>;
  insertText?: string;
}

export interface SnippetCategory {
  id: string;
  name: string;
  icon?: string;
  snippets: Snippet[];
}

export interface SnippetContext {
  lineNumber: number;
  column: number;
  selectedText: string;
  fileName: string;
  language: string;
}

export interface SnippetInsertResult {
  success: boolean;
  snippet?: Snippet;
  insertedText?: string;
}
