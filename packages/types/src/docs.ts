/** 文档条目 */
export interface DocEntry {
  id: string;
  title: string;
  category: string;
  url?: string;
  content?: string;
  tags: string[];
  updatedAt?: string;
}

/** 文档分类 */
export interface DocCategory {
  id: string;
  name: string;
  icon?: string;
  entries: DocEntry[];
}
