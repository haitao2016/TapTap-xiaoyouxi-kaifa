// 动画状态机编辑器
// 角色动画状态机可视化编辑

import { globalEventBus } from '../event-bus';

// 动画状态
export interface AnimationState {
  id: string;
  name: string;
  animationClip?: string;
  loop: boolean;
  speed: number;
  duration: number;
  position: { x: number; y: number };
  blendMode: 'override' | 'additive' | 'blend';
  events: { frame: number; name: string; parameters?: any }[];
}

// 动画过渡
export interface AnimationTransition {
  id: string;
  fromState: string;
  toState: string;
  condition: string; // 表达式
  priority: number;
  duration: number;
  hasExitTime: boolean;
  exitTime: number;
  interruptionSource: 'none' | 'source' | 'destination' | 'source-destination';
  canTransitionToSelf: boolean;
}

// 动画参数
export interface AnimationParameter {
  name: string;
  type: 'float' | 'int' | 'bool' | 'trigger';
  defaultValue: any;
}

// 动画层
export interface AnimationLayer {
  name: string;
  weight: number;
  blendingMode: 'override' | 'additive';
  mask?: string;
  stateMachine: {
    states: AnimationState[];
    transitions: AnimationTransition[];
  };
}

// 状态机
export interface AnimationStateMachine {
  id: string;
  name: string;
  parameters: AnimationParameter[];
  layers: AnimationLayer[];
  defaultLayer: string;
  anyStateTransitions: AnimationTransition[];
  entryTransitions: AnimationTransition[];
}

class AnimationStateMachineService {
  private stateMachines = new Map<string, AnimationStateMachine>();
  private activeStateMachine: string | null = null;
  private currentValues = new Map<string, any>();
  private listeners = new Set<(event: string, data: any) => void>();

  // 创建状态机
  createStateMachine(name: string): AnimationStateMachine {
    const sm: AnimationStateMachine = {
      id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      parameters: [],
      layers: [
        {
          name: 'Base Layer',
          weight: 1.0,
          blendingMode: 'override',
          stateMachine: { states: [], transitions: [] },
        },
      ],
      defaultLayer: 'Base Layer',
      anyStateTransitions: [],
      entryTransitions: [],
    };
    this.stateMachines.set(sm.id, sm);
    this.notify('state-machine:created', sm);
    return sm;
  }

  // 添加状态
  addState(
    stateMachineId: string,
    layerName: string,
    state: Omit<AnimationState, 'id'>
  ): AnimationState {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) throw new Error('状态机不存在');
    const layer = sm.layers.find((l) => l.name === layerName);
    if (!layer) throw new Error('图层不存在');

    const newState: AnimationState = {
      ...state,
      id: `state-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    layer.stateMachine.states.push(newState);
    this.notify('state:added', { stateMachineId, layerName, state: newState });
    return newState;
  }

  // 添加过渡
  addTransition(
    stateMachineId: string,
    layerName: string,
    transition: Omit<AnimationTransition, 'id'>
  ): AnimationTransition {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) throw new Error('状态机不存在');
    const layer = sm.layers.find((l) => l.name === layerName);
    if (!layer) throw new Error('图层不存在');

    const newTransition: AnimationTransition = {
      ...transition,
      id: `trans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    layer.stateMachine.transitions.push(newTransition);
    this.notify('transition:added', { stateMachineId, layerName, transition: newTransition });
    return newTransition;
  }

  // 添加参数
  addParameter(stateMachineId: string, parameter: AnimationParameter): void {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) throw new Error('状态机不存在');
    sm.parameters.push(parameter);
    this.currentValues.set(`${stateMachineId}.${parameter.name}`, parameter.defaultValue);
    this.notify('parameter:added', { stateMachineId, parameter });
  }

  // 设置参数值
  setParameter(stateMachineId: string, name: string, value: any): void {
    this.currentValues.set(`${stateMachineId}.${name}`, value);
    this.notify('parameter:changed', { stateMachineId, name, value });
  }

  // 获取参数值
  getParameter(stateMachineId: string, name: string): any {
    return this.currentValues.get(`${stateMachineId}.${name}`);
  }

  // 评估条件
  evaluateCondition(condition: string, stateMachineId: string): boolean {
    // 简单条件评估器，支持 "paramName > value" 等
    const conditions = condition.split('&&').map((c) => c.trim());
    return conditions.every((c) => this.evaluateSingle(c, stateMachineId));
  }

  private evaluateSingle(condition: string, stateMachineId: string): boolean {
    // 解析操作符
    const ops = ['>=', '<=', '==', '!=', '>', '<'];
    for (const op of ops) {
      if (condition.includes(op)) {
        const [left, ...rest] = condition.split(op);
        const right = rest.join(op);
        const leftVal = this.getParameter(stateMachineId, left.trim());
        const rightVal = this.parseValue(right.trim());
        switch (op) {
          case '>=':
            return leftVal >= rightVal;
          case '<=':
            return leftVal <= rightVal;
          case '==':
            return leftVal === rightVal;
          case '!=':
            return leftVal !== rightVal;
          case '>':
            return leftVal > rightVal;
          case '<':
            return leftVal < rightVal;
        }
      }
    }
    // Trigger 类型
    const value = this.getParameter(stateMachineId, condition);
    return value === true;
  }

  private parseValue(s: string): any {
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (!isNaN(Number(s))) return Number(s);
    if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    return s;
  }

  // 添加 Any State 过渡
  addAnyStateTransition(
    stateMachineId: string,
    transition: Omit<AnimationTransition, 'id' | 'fromState'>
  ): AnimationTransition {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) throw new Error('状态机不存在');
    const newTrans: AnimationTransition = {
      ...transition,
      id: `anytrans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromState: 'AnyState',
    };
    sm.anyStateTransitions.push(newTrans);
    return newTrans;
  }

  // 添加 Entry 过渡
  addEntryTransition(stateMachineId: string, toState: string): AnimationTransition {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) throw new Error('状态机不存在');
    const newTrans: AnimationTransition = {
      id: `entrytrans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromState: 'Entry',
      toState,
      condition: '',
      priority: 0,
      duration: 0,
      hasExitTime: false,
      exitTime: 0,
      interruptionSource: 'none',
      canTransitionToSelf: false,
    };
    sm.entryTransitions.push(newTrans);
    return newTrans;
  }

  // 删除状态
  removeState(stateMachineId: string, layerName: string, stateId: string): void {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) return;
    const layer = sm.layers.find((l) => l.name === layerName);
    if (!layer) return;
    layer.stateMachine.states = layer.stateMachine.states.filter((s) => s.id !== stateId);
    layer.stateMachine.transitions = layer.stateMachine.transitions.filter(
      (t) => t.fromState !== stateId && t.toState !== stateId
    );
    this.notify('state:removed', { stateMachineId, layerName, stateId });
  }

  // 删除过渡
  removeTransition(stateMachineId: string, layerName: string, transitionId: string): void {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) return;
    const layer = sm.layers.find((l) => l.name === layerName);
    if (!layer) return;
    layer.stateMachine.transitions = layer.stateMachine.transitions.filter(
      (t) => t.id !== transitionId
    );
    this.notify('transition:removed', { stateMachineId, layerName, transitionId });
  }

  // 添加层
  addLayer(stateMachineId: string, layer: Omit<AnimationLayer, 'stateMachine'>): void {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) throw new Error('状态机不存在');
    sm.layers.push({ ...layer, stateMachine: { states: [], transitions: [] } });
  }

  // 编译为代码
  compile(
    stateMachineId: string,
    language: 'typescript' | 'csharp' | 'gdscript' = 'typescript'
  ): string {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) return '';

    if (language === 'typescript') {
      return this.compileTypeScript(sm);
    }
    return '';
  }

  // 编译为 TypeScript
  private compileTypeScript(sm: AnimationStateMachine): string {
    const lines: string[] = [];
    lines.push(`// Auto-generated animation state machine: ${sm.name}`);
    lines.push(`export class ${this.toPascalCase(sm.name)}Controller {`);
    lines.push(`  private currentState: string = '';`);
    lines.push(`  private parameters: Map<string, any> = new Map();`);
    lines.push('');
    lines.push(`  constructor() {`);
    for (const param of sm.parameters) {
      lines.push(
        `    this.parameters.set('${param.name}', ${JSON.stringify(param.defaultValue)});`
      );
    }
    lines.push(`  }`);
    lines.push('');
    lines.push(`  setParameter(name: string, value: any) {`);
    lines.push(`    this.parameters.set(name, value);`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  update(dt: number): string {`);
    lines.push(`    // Check transitions`);
    lines.push(`    let nextState = this.currentState;`);
    lines.push(`    for (const layer of this.layers) {`);
    lines.push(`      for (const trans of layer.transitions) {`);
    lines.push(
      `        if (trans.fromState === this.currentState && this.checkCondition(trans.condition)) {`
    );
    lines.push(`          nextState = trans.toState;`);
    lines.push(`          break;`);
    lines.push(`        }`);
    lines.push(`      }`);
    lines.push(`    }`);
    lines.push(`    this.currentState = nextState;`);
    lines.push(`    return this.currentState;`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  private checkCondition(condition: string): boolean {`);
    lines.push(`    return this.evaluateCondition(condition);`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  private evaluateCondition(condition: string): boolean {`);
    lines.push(`    const conditions = condition.split('&&').map(c => c.trim());`);
    lines.push(`    return conditions.every(c => {`);
    lines.push(`      const ops = ['>=', '<=', '==', '!=', '>', '<'];`);
    lines.push(`      for (const op of ops) {`);
    lines.push(`        if (c.includes(op)) {`);
    lines.push(`          const [left, right] = c.split(op).map(s => s.trim());`);
    lines.push(`          const lv = this.parameters.get(left);`);
    lines.push(`          const rv = isNaN(Number(right)) ? right : Number(right);`);
    lines.push(`          switch (op) {`);
    lines.push(`            case '>=': return lv >= rv;`);
    lines.push(`            case '<=': return lv <= rv;`);
    lines.push(`            case '==': return lv === rv;`);
    lines.push(`            case '!=': return lv !== rv;`);
    lines.push(`            case '>': return lv > rv;`);
    lines.push(`            case '<': return lv < rv;`);
    lines.push(`          }`);
    lines.push(`        }`);
    lines.push(`      }`);
    lines.push(`      return this.parameters.get(c) === true;`);
    lines.push(`    });`);
    lines.push(`  }`);
    lines.push(`}`);

    return lines.join('\n');
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[\s_-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  // 获取状态机
  getStateMachine(id: string): AnimationStateMachine | undefined {
    return this.stateMachines.get(id);
  }

  // 列出状态机
  listStateMachines(): AnimationStateMachine[] {
    return Array.from(this.stateMachines.values());
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const animationStateMachineService = new AnimationStateMachineService();
