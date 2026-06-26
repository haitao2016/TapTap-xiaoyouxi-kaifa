import { globalEventBus } from './event-bus';

export type DataFieldType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'reference';

export interface DataField {
  id: string;
  name: string;
  type: DataFieldType;
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  pattern?: string;
  referenceTable?: string;
  description?: string;
}

export interface DataRow {
  id: string;
  [key: string]: unknown;
}

export interface DataTable {
  id: string;
  name: string;
  description?: string;
  fields: DataField[];
  rows: DataRow[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface DataTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: DataField[];
  sampleRows?: DataRow[];
}

export interface ValidationError {
  field: string;
  rowId?: string;
  message: string;
  type: 'type' | 'required' | 'range' | 'unique' | 'pattern';
}

export interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  rowId?: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DataDiff {
  tableId: string;
  changes: DiffChange[];
  addedRows: number;
  removedRows: number;
  modifiedRows: number;
}

export interface SearchOptions {
  query?: string;
  field?: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  rows: DataRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportOptions {
  format: 'csv' | 'excel' | 'json';
  hasHeader?: boolean;
  encoding?: string;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeHeaders?: boolean;
  fieldDelimiter?: string;
}

export class DataEditorService {
  private tables = new Map<string, DataTable>();
  private templates: DataTemplate[] = [];
  private history = new Map<string, DataTable[]>();
  private maxHistorySize = 50;

  constructor() {
    this.loadTemplates();
    this.loadMockData();
  }

  getTables(): DataTable[] {
    return Array.from(this.tables.values());
  }

  getTable(tableId: string): DataTable | undefined {
    return this.tables.get(tableId);
  }

  getTableByName(name: string): DataTable | undefined {
    return Array.from(this.tables.values()).find((t) => t.name === name);
  }

  createTable(name: string, fields: DataField[] = [], description?: string): DataTable {
    const existing = this.getTableByName(name);
    if (existing) {
      throw new Error(`数据表已存在: ${name}`);
    }

    const table: DataTable = {
      id: this.generateId(),
      name,
      description,
      fields,
      rows: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    this.tables.set(table.id, table);
    this.history.set(table.id, []);

    globalEventBus.emit({
      type: 'dataEditor:tableCreated',
      payload: table,
    });

    return table;
  }

  deleteTable(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    this.tables.delete(tableId);
    this.history.delete(tableId);

    globalEventBus.emit({
      type: 'dataEditor:tableDeleted',
      payload: { tableId },
    });
  }

  renameTable(tableId: string, newName: string): DataTable {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const existing = this.getTableByName(newName);
    if (existing && existing.id !== tableId) {
      throw new Error(`数据表名已存在: ${newName}`);
    }

    this.saveHistory(tableId);
    table.name = newName;
    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:tableRenamed',
      payload: { tableId, newName },
    });

    return table;
  }

  getFields(tableId: string): DataField[] {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }
    return table.fields;
  }

  addField(tableId: string, field: Omit<DataField, 'id'>): DataField {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    if (table.fields.some((f) => f.name === field.name)) {
      throw new Error(`字段已存在: ${field.name}`);
    }

    const newField: DataField = {
      ...field,
      id: this.generateId(),
    };

    this.saveHistory(tableId);
    table.fields.push(newField);
    table.updatedAt = Date.now();
    table.version++;

    if (field.defaultValue !== undefined) {
      table.rows.forEach((row) => {
        if (row[field.name] === undefined) {
          row[field.name] = field.defaultValue;
        }
      });
    }

    globalEventBus.emit({
      type: 'dataEditor:fieldAdded',
      payload: { tableId, field: newField },
    });

    return newField;
  }

  updateField(tableId: string, fieldId: string, updates: Partial<DataField>): DataField {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const field = table.fields.find((f) => f.id === fieldId);
    if (!field) {
      throw new Error(`字段不存在: ${fieldId}`);
    }

    this.saveHistory(tableId);
    Object.assign(field, updates);
    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:fieldUpdated',
      payload: { tableId, fieldId, updates },
    });

    return field;
  }

  deleteField(tableId: string, fieldId: string): void {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const fieldIndex = table.fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex === -1) {
      throw new Error(`字段不存在: ${fieldId}`);
    }

    const field = table.fields[fieldIndex];

    this.saveHistory(tableId);
    table.fields.splice(fieldIndex, 1);
    table.rows.forEach((row) => {
      delete row[field.name];
    });
    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:fieldDeleted',
      payload: { tableId, fieldId, fieldName: field.name },
    });
  }

  getRows(tableId: string, options?: SearchOptions): SearchResult {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    let result = [...table.rows];

    if (options?.query) {
      const query = options.query.toLowerCase();
      result = result.filter((row) =>
        table.fields.some((field) => {
          const value = row[field.name];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    if (options?.filters) {
      Object.entries(options.filters).forEach(([fieldName, filterValue]) => {
        if (filterValue !== undefined && filterValue !== null) {
          result = result.filter((row) => row[fieldName] === filterValue);
        }
      });
    }

    if (options?.sortBy) {
      const sortField = options.sortBy;
      const sortOrder = options.sortOrder || 'asc';
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    const total = result.length;
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const totalPages = Math.ceil(total / pageSize);

    return {
      rows: result.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  getRow(tableId: string, rowId: string): DataRow | undefined {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }
    return table.rows.find((r) => r.id === rowId);
  }

  addRow(tableId: string, data: Record<string, unknown> = {}): DataRow {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const row: DataRow = {
      id: this.generateId(),
    };

    table.fields.forEach((field) => {
      if (data[field.name] !== undefined) {
        row[field.name] = data[field.name];
      } else if (field.defaultValue !== undefined) {
        row[field.name] = field.defaultValue;
      } else {
        row[field.name] = this.getDefaultValue(field.type);
      }
    });

    const errors = this.validateRow(table, row);
    if (errors.length > 0) {
      const errorMessages = errors.map((e) => e.message).join(', ');
      throw new Error(`数据校验失败: ${errorMessages}`);
    }

    this.saveHistory(tableId);
    table.rows.push(row);
    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:rowAdded',
      payload: { tableId, row },
    });

    return row;
  }

  updateRow(tableId: string, rowId: string, data: Record<string, unknown>): DataRow {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const row = table.rows.find((r) => r.id === rowId);
    if (!row) {
      throw new Error(`数据行不存在: ${rowId}`);
    }

    const updatedRow = { ...row, ...data, id: rowId };
    const errors = this.validateRow(table, updatedRow);
    if (errors.length > 0) {
      const errorMessages = errors.map((e) => e.message).join(', ');
      throw new Error(`数据校验失败: ${errorMessages}`);
    }

    this.saveHistory(tableId);
    Object.assign(row, data);
    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:rowUpdated',
      payload: { tableId, rowId, data },
    });

    return row;
  }

  deleteRow(tableId: string, rowId: string): void {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const rowIndex = table.rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) {
      throw new Error(`数据行不存在: ${rowId}`);
    }

    this.saveHistory(tableId);
    table.rows.splice(rowIndex, 1);
    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:rowDeleted',
      payload: { tableId, rowId },
    });
  }

  batchAddRows(tableId: string, dataList: Record<string, unknown>[]): DataRow[] {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const newRows: DataRow[] = [];
    dataList.forEach((data) => {
      const row: DataRow = { id: this.generateId() };
      table.fields.forEach((field) => {
        if (data[field.name] !== undefined) {
          row[field.name] = data[field.name];
        } else if (field.defaultValue !== undefined) {
          row[field.name] = field.defaultValue;
        } else {
          row[field.name] = this.getDefaultValue(field.type);
        }
      });

      const errors = this.validateRow(table, row);
      if (errors.length > 0) {
        throw new Error(`数据校验失败: ${errors.map((e) => e.message).join(', ')}`);
      }
      newRows.push(row);
    });

    this.saveHistory(tableId);
    table.rows.push(...newRows);
    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:rowsBatchAdded',
      payload: { tableId, count: newRows.length },
    });

    return newRows;
  }

  batchUpdateRows(
    tableId: string,
    updates: { rowId: string; data: Record<string, unknown> }[]
  ): DataRow[] {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    this.saveHistory(tableId);
    const updatedRows: DataRow[] = [];

    updates.forEach(({ rowId, data }) => {
      const row = table.rows.find((r) => r.id === rowId);
      if (row) {
        Object.assign(row, data);
        updatedRows.push(row);
      }
    });

    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:rowsBatchUpdated',
      payload: { tableId, count: updatedRows.length },
    });

    return updatedRows;
  }

  batchDeleteRows(tableId: string, rowIds: string[]): number {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    this.saveHistory(tableId);
    const idSet = new Set(rowIds);
    const beforeCount = table.rows.length;
    table.rows = table.rows.filter((r) => !idSet.has(r.id));
    const deletedCount = beforeCount - table.rows.length;

    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:rowsBatchDeleted',
      payload: { tableId, count: deletedCount },
    });

    return deletedCount;
  }

  validateTable(tableId: string): ValidationError[] {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const errors: ValidationError[] = [];
    table.rows.forEach((row) => {
      errors.push(...this.validateRow(table, row));
    });

    return errors;
  }

  validateRow(table: DataTable, row: DataRow): ValidationError[] {
    const errors: ValidationError[] = [];

    table.fields.forEach((field) => {
      const value = row[field.name];

      if (field.required && (value === null || value === undefined || value === '')) {
        errors.push({
          field: field.name,
          rowId: row.id,
          message: `字段 ${field.name} 为必填项`,
          type: 'required',
        });
        return;
      }

      if (value !== null && value !== undefined && value !== '') {
        if (!this.checkType(value, field.type)) {
          errors.push({
            field: field.name,
            rowId: row.id,
            message: `字段 ${field.name} 类型不匹配，期望 ${field.type}`,
            type: 'type',
          });
        }

        if (field.type === 'number' && typeof value === 'number') {
          if (field.min !== undefined && value < field.min) {
            errors.push({
              field: field.name,
              rowId: row.id,
              message: `字段 ${field.name} 不能小于 ${field.min}`,
              type: 'range',
            });
          }
          if (field.max !== undefined && value > field.max) {
            errors.push({
              field: field.name,
              rowId: row.id,
              message: `字段 ${field.name} 不能大于 ${field.max}`,
              type: 'range',
            });
          }
        }

        if (field.pattern && typeof value === 'string') {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value)) {
            errors.push({
              field: field.name,
              rowId: row.id,
              message: `字段 ${field.name} 格式不正确`,
              type: 'pattern',
            });
          }
        }
      }

      if (field.unique) {
        const duplicateCount = table.rows.filter(
          (r) => r.id !== row.id && r[field.name] === value
        ).length;
        if (duplicateCount > 0) {
          errors.push({
            field: field.name,
            rowId: row.id,
            message: `字段 ${field.name} 值 ${value} 已存在`,
            type: 'unique',
          });
        }
      }
    });

    return errors;
  }

  compareVersions(tableId: string, versionA: number, versionB: number): DataDiff {
    const history = this.history.get(tableId) || [];
    const tableA = history.find((t) => t.version === versionA);
    const tableB = history.find((t) => t.version === versionB) || this.tables.get(tableId);

    if (!tableB) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    if (!tableA && !tableB) {
      throw new Error('无法找到指定版本的数据');
    }

    const changes: DiffChange[] = [];
    let addedRows = 0;
    let removedRows = 0;
    let modifiedRows = 0;

    const rowsA = tableA?.rows || [];
    const rowsB = tableB.rows;

    const rowMapA = new Map(rowsA.map((r) => [r.id, r]));
    const rowMapB = new Map(rowsB.map((r) => [r.id, r]));

    rowMapB.forEach((rowB, id) => {
      const rowA = rowMapA.get(id);
      if (!rowA) {
        changes.push({ type: 'added', rowId: id, newValue: rowB });
        addedRows++;
      } else {
        let hasChange = false;
        const allKeys = new Set([...Object.keys(rowA), ...Object.keys(rowB)]);
        allKeys.forEach((key) => {
          if (rowA[key] !== rowB[key]) {
            changes.push({
              type: 'modified',
              rowId: id,
              field: key,
              oldValue: rowA[key],
              newValue: rowB[key],
            });
            hasChange = true;
          }
        });
        if (hasChange) modifiedRows++;
      }
    });

    rowMapA.forEach((rowA, id) => {
      if (!rowMapB.has(id)) {
        changes.push({ type: 'removed', rowId: id, oldValue: rowA });
        removedRows++;
      }
    });

    return {
      tableId,
      changes,
      addedRows,
      removedRows,
      modifiedRows,
    };
  }

  getHistory(tableId: string): DataTable[] {
    return this.history.get(tableId) || [];
  }

  undo(tableId: string): DataTable | null {
    const history = this.history.get(tableId);
    if (!history || history.length === 0) {
      return null;
    }

    const previousVersion = history.pop()!;
    this.tables.set(tableId, previousVersion);

    globalEventBus.emit({
      type: 'dataEditor:undo',
      payload: { tableId, version: previousVersion.version },
    });

    return previousVersion;
  }

  getTemplates(): DataTemplate[] {
    return this.templates;
  }

  getTemplateById(templateId: string): DataTemplate | undefined {
    return this.templates.find((t) => t.id === templateId);
  }

  getTemplatesByCategory(category: string): DataTemplate[] {
    return this.templates.filter((t) => t.category === category);
  }

  createTableFromTemplate(templateId: string, tableName: string): DataTable {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }

    const table = this.createTable(tableName, template.fields, template.description);

    if (template.sampleRows && template.sampleRows.length > 0) {
      template.sampleRows.forEach((sampleRow) => {
        const { id, ...data } = sampleRow;
        this.addRow(table.id, data as Record<string, unknown>);
      });
    }

    return table;
  }

  searchTables(query: string): DataTable[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tables.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        (t.description && t.description.toLowerCase().includes(lowerQuery))
    );
  }

  importData(tableId: string, content: string, options: ImportOptions): number {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    let importedRows: Record<string, unknown>[] = [];

    if (options.format === 'csv') {
      importedRows = this.parseCSV(content, options.hasHeader !== false);
    } else if (options.format === 'json') {
      importedRows = JSON.parse(content);
    } else if (options.format === 'excel') {
      throw new Error('Excel 导入需要额外的依赖库');
    }

    if (importedRows.length === 0) {
      return 0;
    }

    this.batchAddRows(tableId, importedRows);
    return importedRows.length;
  }

  exportData(tableId: string, options: ExportOptions): string {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    if (options.format === 'csv') {
      return this.exportCSV(table, options);
    } else if (options.format === 'json') {
      return JSON.stringify(table.rows, null, 2);
    } else if (options.format === 'excel') {
      throw new Error('Excel 导出需要额外的依赖库');
    }

    throw new Error(`不支持的导出格式: ${options.format}`);
  }

  duplicateTable(tableId: string, newName: string): DataTable {
    const sourceTable = this.tables.get(tableId);
    if (!sourceTable) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    const newTable = this.createTable(newName, [...sourceTable.fields], sourceTable.description);

    sourceTable.rows.forEach((row) => {
      const { id, ...data } = row;
      this.addRow(newTable.id, data);
    });

    return newTable;
  }

  clearTable(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }

    this.saveHistory(tableId);
    table.rows = [];
    table.updatedAt = Date.now();
    table.version++;

    globalEventBus.emit({
      type: 'dataEditor:tableCleared',
      payload: { tableId },
    });
  }

  getRowCount(tableId: string): number {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`数据表不存在: ${tableId}`);
    }
    return table.rows.length;
  }

  private parseCSV(content: string, hasHeader: boolean): Record<string, unknown>[] {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return [];

    const result: Record<string, unknown>[] = [];
    let headers: string[] = [];

    if (hasHeader) {
      headers = this.parseCSVLine(lines[0]);
      lines.shift();
    } else {
      const firstLine = this.parseCSVLine(lines[0]);
      headers = firstLine.map((_, i) => `field_${i}`);
    }

    lines.forEach((line) => {
      const values = this.parseCSVLine(line);
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index] ?? '';
        row[header] = this.parseValue(value);
      });
      result.push(row);
    });

    return result;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private parseValue(value: string): unknown {
    const trimmed = value.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === '') return '';
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') return num;
    return trimmed;
  }

  private exportCSV(table: DataTable, options: ExportOptions): string {
    const delimiter = options.fieldDelimiter || ',';
    const fieldNames = table.fields.map((f) => f.name);
    let result = '';

    if (options.includeHeaders !== false) {
      result += fieldNames.map((n) => this.escapeCSV(n, delimiter)).join(delimiter) + '\n';
    }

    table.rows.forEach((row) => {
      const values = fieldNames.map((name) => {
        const value = row[name];
        return this.escapeCSV(
          value !== undefined && value !== null ? String(value) : '',
          delimiter
        );
      });
      result += values.join(delimiter) + '\n';
    });

    return result;
  }

  private escapeCSV(value: string, delimiter: string): string {
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  private checkType(value: unknown, type: DataFieldType): boolean {
    switch (type) {
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'string':
        return typeof value === 'string';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'reference':
        return typeof value === 'string';
      default:
        return true;
    }
  }

  private getDefaultValue(type: DataFieldType): unknown {
    switch (type) {
      case 'number':
        return 0;
      case 'string':
        return '';
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      case 'reference':
        return '';
      default:
        return null;
    }
  }

  private saveHistory(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) return;

    const history = this.history.get(tableId) || [];
    const snapshot = JSON.parse(JSON.stringify(table));
    history.push(snapshot);

    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.history.set(tableId, history);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private loadTemplates(): void {
    this.templates = [
      {
        id: 'template-item',
        name: '道具表',
        description: '游戏道具配置模板，包含道具基础属性、稀有度、类型等',
        category: 'item',
        fields: [
          {
            id: 'f1',
            name: 'itemId',
            type: 'number',
            required: true,
            unique: true,
            description: '道具ID',
          },
          { id: 'f2', name: 'itemName', type: 'string', required: true, description: '道具名称' },
          { id: 'f3', name: 'itemType', type: 'string', required: true, description: '道具类型' },
          {
            id: 'f4',
            name: 'rarity',
            type: 'number',
            required: true,
            min: 1,
            max: 5,
            description: '稀有度(1-5)',
          },
          { id: 'f5', name: 'description', type: 'string', description: '道具描述' },
          {
            id: 'f6',
            name: 'stackable',
            type: 'boolean',
            defaultValue: true,
            description: '是否可堆叠',
          },
          { id: 'f7', name: 'price', type: 'number', min: 0, defaultValue: 0, description: '价格' },
          { id: 'f8', name: 'icon', type: 'string', description: '图标路径' },
        ],
        sampleRows: [
          {
            id: '1',
            itemId: 1001,
            itemName: '生命药水',
            itemType: 'potion',
            rarity: 2,
            description: '恢复100点生命值',
            stackable: true,
            price: 50,
            icon: 'icons/potion_red.png',
          },
          {
            id: '2',
            itemId: 1002,
            itemName: '魔力药水',
            itemType: 'potion',
            rarity: 2,
            description: '恢复50点魔力值',
            stackable: true,
            price: 80,
            icon: 'icons/potion_blue.png',
          },
          {
            id: '3',
            itemId: 2001,
            itemName: '铁剑',
            itemType: 'weapon',
            rarity: 3,
            description: '一把普通的铁剑',
            stackable: false,
            price: 200,
            icon: 'icons/sword_iron.png',
          },
        ],
      },
      {
        id: 'template-level',
        name: '关卡表',
        description: '游戏关卡配置模板，包含关卡信息、难度、奖励等',
        category: 'level',
        fields: [
          {
            id: 'f1',
            name: 'levelId',
            type: 'number',
            required: true,
            unique: true,
            description: '关卡ID',
          },
          { id: 'f2', name: 'levelName', type: 'string', required: true, description: '关卡名称' },
          { id: 'f3', name: 'chapter', type: 'number', required: true, description: '章节' },
          {
            id: 'f4',
            name: 'difficulty',
            type: 'number',
            required: true,
            min: 1,
            max: 10,
            description: '难度(1-10)',
          },
          { id: 'f5', name: 'description', type: 'string', description: '关卡描述' },
          {
            id: 'f6',
            name: 'unlockLevel',
            type: 'number',
            defaultValue: 1,
            description: '解锁等级',
          },
          {
            id: 'f7',
            name: 'starRewards',
            type: 'array',
            defaultValue: [0, 0, 0],
            description: '三星奖励',
          },
          {
            id: 'f8',
            name: 'bossId',
            type: 'reference',
            referenceTable: 'enemies',
            description: 'Boss ID',
          },
        ],
        sampleRows: [
          {
            id: '1',
            levelId: 101,
            levelName: '新手村',
            chapter: 1,
            difficulty: 1,
            description: '冒险开始的地方',
            unlockLevel: 1,
            starRewards: [100, 200, 300],
            bossId: '',
          },
          {
            id: '2',
            levelId: 102,
            levelName: '森林深处',
            chapter: 1,
            difficulty: 2,
            description: '小心森林里的野兽',
            unlockLevel: 2,
            starRewards: [150, 250, 400],
            bossId: 'boss_wolf',
          },
          {
            id: '3',
            levelId: 201,
            levelName: '地下城入口',
            chapter: 2,
            difficulty: 4,
            description: '黑暗的地下城',
            unlockLevel: 10,
            starRewards: [300, 500, 800],
            bossId: 'boss_goblin',
          },
        ],
      },
      {
        id: 'template-character',
        name: '角色表',
        description: '游戏角色配置模板，包含角色基础属性、技能等',
        category: 'character',
        fields: [
          {
            id: 'f1',
            name: 'charId',
            type: 'number',
            required: true,
            unique: true,
            description: '角色ID',
          },
          { id: 'f2', name: 'charName', type: 'string', required: true, description: '角色名称' },
          { id: 'f3', name: 'charClass', type: 'string', required: true, description: '职业' },
          {
            id: 'f4',
            name: 'rarity',
            type: 'number',
            required: true,
            min: 1,
            max: 6,
            description: '稀有度(1-6)',
          },
          {
            id: 'f5',
            name: 'baseHp',
            type: 'number',
            required: true,
            min: 1,
            description: '基础生命值',
          },
          {
            id: 'f6',
            name: 'baseAtk',
            type: 'number',
            required: true,
            min: 0,
            description: '基础攻击力',
          },
          {
            id: 'f7',
            name: 'baseDef',
            type: 'number',
            required: true,
            min: 0,
            description: '基础防御力',
          },
          {
            id: 'f8',
            name: 'baseSpeed',
            type: 'number',
            required: true,
            min: 0,
            description: '基础速度',
          },
          { id: 'f9', name: 'skills', type: 'array', description: '技能列表' },
          { id: 'f10', name: 'description', type: 'string', description: '角色描述' },
        ],
        sampleRows: [
          {
            id: '1',
            charId: 1001,
            charName: '剑士',
            charClass: 'warrior',
            rarity: 3,
            baseHp: 1000,
            baseAtk: 120,
            baseDef: 80,
            baseSpeed: 90,
            skills: ['skill_slash', 'skill_charge'],
            description: '近战物理攻击角色',
          },
          {
            id: '2',
            charId: 1002,
            charName: '法师',
            charClass: 'mage',
            rarity: 3,
            baseHp: 700,
            baseAtk: 180,
            baseDef: 40,
            baseSpeed: 80,
            skills: ['skill_fireball', 'skill_ice'],
            description: '远程魔法攻击角色',
          },
          {
            id: '3',
            charId: 1003,
            charName: '牧师',
            charClass: 'priest',
            rarity: 4,
            baseHp: 800,
            baseAtk: 80,
            baseDef: 60,
            baseSpeed: 70,
            skills: ['skill_heal', 'skill_buff'],
            description: '辅助治疗角色',
          },
        ],
      },
      {
        id: 'template-skill',
        name: '技能表',
        description: '游戏技能配置模板，包含技能效果、冷却、伤害等',
        category: 'skill',
        fields: [
          {
            id: 'f1',
            name: 'skillId',
            type: 'string',
            required: true,
            unique: true,
            description: '技能ID',
          },
          { id: 'f2', name: 'skillName', type: 'string', required: true, description: '技能名称' },
          { id: 'f3', name: 'skillType', type: 'string', required: true, description: '技能类型' },
          {
            id: 'f4',
            name: 'damage',
            type: 'number',
            min: 0,
            defaultValue: 0,
            description: '伤害值',
          },
          {
            id: 'f5',
            name: 'cooldown',
            type: 'number',
            min: 0,
            defaultValue: 0,
            description: '冷却时间(秒)',
          },
          {
            id: 'f6',
            name: 'cost',
            type: 'number',
            min: 0,
            defaultValue: 0,
            description: '消耗魔力',
          },
          { id: 'f7', name: 'range', type: 'number', min: 0, description: '技能范围' },
          { id: 'f8', name: 'description', type: 'string', description: '技能描述' },
        ],
        sampleRows: [
          {
            id: '1',
            skillId: 'skill_slash',
            skillName: '斩击',
            skillType: 'attack',
            damage: 100,
            cooldown: 2,
            cost: 0,
            range: 1,
            description: '普通攻击',
          },
          {
            id: '2',
            skillId: 'skill_fireball',
            skillName: '火球术',
            skillType: 'magic',
            damage: 200,
            cooldown: 5,
            cost: 30,
            range: 5,
            description: '发射一颗火球',
          },
          {
            id: '3',
            skillId: 'skill_heal',
            skillName: '治疗术',
            skillType: 'support',
            damage: 150,
            cooldown: 8,
            cost: 40,
            range: 4,
            description: '恢复生命值',
          },
        ],
      },
    ];
  }

  private loadMockData(): void {
    const itemTable = this.createTableFromTemplate('template-item', 'items');
    const levelTable = this.createTableFromTemplate('template-level', 'levels');
    const charTable = this.createTableFromTemplate('template-character', 'characters');
    const skillTable = this.createTableFromTemplate('template-skill', 'skills');
  }
}

export const dataEditorService = new DataEditorService();
