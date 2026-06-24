import { useState } from 'react';
import { Icon } from '@tapdev/ui';
import { docService } from '@tapdev/core';
import type { DocEntry } from '@tapdev/types';

export function DocsPage() {
  const categories = docService.getCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DocEntry | null>(
    categories[0]?.entries[0] ?? null
  );
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '');

  const searchResults = searchQuery ? docService.search(searchQuery) : [];
  const currentCategory = categories.find((c) => c.id === activeCategory);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 overflow-auto border-r border-border bg-surface-1">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Icon
              name="search"
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="搜索文档..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 py-1.5 pl-8 pr-3 text-xs focus:border-tap-orange focus:outline-none"
            />
          </div>
        </div>

        {searchQuery ? (
          <div className="p-2">
            <div className="mb-2 px-2 text-xs text-text-muted">
              搜索结果 ({searchResults.length})
            </div>
            {searchResults.map((entry) => (
              <DocNavItem
                key={entry.id}
                entry={entry}
                active={selectedEntry?.id === entry.id}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 border-b border-border p-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-md px-2 py-1 text-xs ${
                    activeCategory === cat.id
                      ? 'bg-tap-orange/10 text-tap-orange'
                      : 'text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="p-2">
              {currentCategory?.entries.map((entry) => (
                <DocNavItem
                  key={entry.id}
                  entry={entry}
                  active={selectedEntry?.id === entry.id}
                  onClick={() => setSelectedEntry(entry)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedEntry ? (
          <article>
            <h1 className="text-xl font-bold">{selectedEntry.title}</h1>
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedEntry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
            {selectedEntry.url && (
              <a
                href={selectedEntry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-tap-orange hover:underline"
              >
                查看官方文档 →
              </a>
            )}
            {selectedEntry.content && (
              <div className="prose prose-invert mt-6 max-w-none">
                <MarkdownContent content={selectedEntry.content} />
              </div>
            )}
          </article>
        ) : (
          <p className="text-text-muted">选择文档条目查看内容</p>
        )}
      </div>
    </div>
  );
}

function DocNavItem({
  entry,
  active,
  onClick,
}: {
  entry: DocEntry;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
        active ? 'bg-tap-orange/10 text-tap-orange' : 'text-text-secondary hover:bg-surface-2'
      }`}
    >
      {entry.title}
    </button>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-sm leading-relaxed text-text-secondary">
      {lines.map((line, i) => {
        if (line.startsWith('# '))
          return (
            <h1 key={i} className="text-lg font-bold text-text-primary">
              {line.slice(2)}
            </h1>
          );
        if (line.startsWith('## '))
          return (
            <h2 key={i} className="mt-4 text-base font-semibold text-text-primary">
              {line.slice(3)}
            </h2>
          );
        if (line.startsWith('```'))
          return null;
        if (line.startsWith('- '))
          return (
            <li key={i} className="ml-4 list-disc">
              {line.slice(2)}
            </li>
          );
        if (line.match(/^\d+\./))
          return (
            <li key={i} className="ml-4 list-decimal">
              {line.replace(/^\d+\.\s*/, '')}
            </li>
          );
        if (line.trim() === '') return <br key={i} />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
