import type { DebugSession } from '@tapdev/types';
import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

export interface WatchVariable {
  id: string;
  name: string;
  expression: string;
  value: unknown;
  type?: string;
  isError?: boolean;
  errorMessage?: string;
  enabled: boolean;
}

export interface WatchUpdate {
  id: string;
  value: unknown;
  type?: string;
  isError?: boolean;
  errorMessage?: string;
}

export class WatchService {
  private session: DebugSession | null = null;
  private variables = new Map<string, WatchVariable>();
  private evaluationContext: Record<string, unknown> = {};

  setSession(session: DebugSession | null): void {
    this.session = session;
  }

  getVariables(): WatchVariable[] {
    return Array.from(this.variables.values());
  }

  addVariable(name: string, expression: string): WatchVariable {
    const variable: WatchVariable = {
      id: randomUUID(),
      name,
      expression,
      value: undefined,
      enabled: true,
    };
    
    this.variables.set(variable.id, variable);
    this.evaluateVariable(variable);
    
    globalEventBus.emit({ type: 'watch:add', payload: variable });
    return variable;
  }

  removeVariable(id: string): void {
    this.variables.delete(id);
    globalEventBus.emit({ type: 'watch:remove', payload: { id } });
  }

  updateVariable(id: string, updates: Partial<Pick<WatchVariable, 'name' | 'expression' | 'enabled'>>): void {
    const variable = this.variables.get(id);
    if (variable) {
      if (updates.name !== undefined) variable.name = updates.name;
      if (updates.expression !== undefined) {
        variable.expression = updates.expression;
        variable.value = undefined;
        variable.isError = false;
        variable.errorMessage = undefined;
      }
      if (updates.enabled !== undefined) variable.enabled = updates.enabled;
      
      if (variable.enabled && updates.expression !== undefined) {
        this.evaluateVariable(variable);
      }
      
      globalEventBus.emit({ type: 'watch:update', payload: variable });
    }
  }

  toggleVariable(id: string): void {
    const variable = this.variables.get(id);
    if (variable) {
      variable.enabled = !variable.enabled;
      if (variable.enabled) {
        this.evaluateVariable(variable);
      }
      globalEventBus.emit({ type: 'watch:toggle', payload: variable });
    }
  }

  clearVariables(): void {
    this.variables.clear();
    globalEventBus.emit({ type: 'watch:clear', payload: {} });
  }

  updateContext(context: Record<string, unknown>): void {
    this.evaluationContext = { ...this.evaluationContext, ...context };
    this.evaluateAllVariables();
  }

  clearContext(): void {
    this.evaluationContext = {};
    this.variables.forEach(v => {
      if (v.enabled) {
        v.value = undefined;
        v.type = undefined;
        v.isError = false;
        v.errorMessage = undefined;
      }
    });
    globalEventBus.emit({ type: 'watch:contextCleared', payload: {} });
  }

  private evaluateVariable(variable: WatchVariable): void {
    if (!variable.enabled) return;

    try {
      const result = this.evaluateExpression(variable.expression);
      variable.value = result.value;
      variable.type = result.type;
      variable.isError = false;
      variable.errorMessage = undefined;
    } catch (error) {
      variable.value = undefined;
      variable.type = undefined;
      variable.isError = true;
      variable.errorMessage = error instanceof Error ? error.message : '评估失败';
    }

    globalEventBus.emit({ 
      type: 'watch:update', 
      payload: {
        id: variable.id,
        value: variable.value,
        type: variable.type,
        isError: variable.isError,
        errorMessage: variable.errorMessage,
      } 
    });
  }

  private evaluateAllVariables(): void {
    this.variables.forEach(variable => {
      if (variable.enabled) {
        this.evaluateVariable(variable);
      }
    });
  }

  private evaluateExpression(expression: string): { value: unknown; type?: string } {
    const keys = Object.keys(this.evaluationContext);
    const values = Object.values(this.evaluationContext);

    try {
      const fn = new Function(...keys, `return ${expression}`);
      const result = fn(...values);
      
      return {
        value: result,
        type: typeof result,
      };
    } catch (error) {
      throw error;
    }
  }

  validateExpression(expression: string): { valid: boolean; error?: string } {
    if (!expression || expression.trim() === '') {
      return { valid: true };
    }

    try {
      new Function(expression);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '无效的表达式',
      };
    }
  }

  getExpressionSuggestions(): string[] {
    return Object.keys(this.evaluationContext);
  }
}

export const watchService = new WatchService();