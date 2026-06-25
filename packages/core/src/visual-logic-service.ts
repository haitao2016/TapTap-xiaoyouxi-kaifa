import { globalEventBus } from './event-bus';

export type PortType = 'any' | 'number' | 'string' | 'boolean' | 'array' | 'object' | 'function' | 'event' | 'flow';
export type NodeCategory = 'event' | 'condition' | 'action' | 'variable' | 'loop' | 'debug';
export type VariableType = 'number' | 'string' | 'boolean' | 'array' | 'object';
export type VariableScope = 'global' | 'local';

export interface Port {
  id: string;
  name: string;
  type: PortType;
  direction: 'input' | 'output';
  description?: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface LogicNode {
  id: string;
  type: string;
  category: NodeCategory;
  name: string;
  description?: string;
  inputs: Port[];
  outputs: Port[];
  position: NodePosition;
  properties: Record<string, unknown>;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  scope: VariableScope;
  defaultValue: unknown;
  description?: string;
}

export interface LogicGraph {
  id: string;
  name: string;
  description?: string;
  nodes: LogicNode[];
  connections: Connection[];
  variables: Variable[];
  createdAt: string;
  updatedAt: string;
}

export interface LogicValidationWarning {
  type: 'dead_loop' | 'unconnected_port' | 'type_mismatch' | 'unused_node' | 'missing_start';
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  portId?: string;
}

export interface CodeGenerationOptions {
  language: 'javascript' | 'typescript';
  includeComments: boolean;
  functionName?: string;
}

export interface NodeTypeDefinition {
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  icon?: string;
  inputs: Omit<Port, 'id'>[];
  outputs: Omit<Port, 'id'>[];
  defaultProperties: Record<string, unknown>;
}

const NODE_TYPE_DEFINITIONS: NodeTypeDefinition[] = [
  {
    type: 'start',
    category: 'event',
    name: '开始',
    description: '逻辑执行的起点',
    icon: 'play',
    inputs: [],
    outputs: [{ name: '输出', type: 'flow', direction: 'output' }],
    defaultProperties: {},
  },
  {
    type: 'click',
    category: 'event',
    name: '点击事件',
    description: '当用户点击时触发',
    icon: 'mouse-pointer',
    inputs: [],
    outputs: [
      { name: '输出', type: 'flow', direction: 'output' },
      { name: '目标', type: 'object', direction: 'output' },
    ],
    defaultProperties: { target: '' },
  },
  {
    type: 'timer',
    category: 'event',
    name: '定时器',
    description: '按指定间隔重复触发',
    icon: 'clock',
    inputs: [{ name: '启动', type: 'flow', direction: 'input' }],
    outputs: [
      { name: '触发', type: 'flow', direction: 'output' },
      { name: '停止', type: 'flow', direction: 'output' },
    ],
    defaultProperties: { interval: 1000, repeat: true },
  },
  {
    type: 'collision',
    category: 'event',
    name: '碰撞事件',
    description: '当两个物体碰撞时触发',
    icon: 'zap',
    inputs: [],
    outputs: [
      { name: '输出', type: 'flow', direction: 'output' },
      { name: '物体A', type: 'object', direction: 'output' },
      { name: '物体B', type: 'object', direction: 'output' },
    ],
    defaultProperties: { layerA: '', layerB: '' },
  },
  {
    type: 'message',
    category: 'event',
    name: '消息事件',
    description: '接收指定消息时触发',
    icon: 'message-square',
    inputs: [],
    outputs: [
      { name: '输出', type: 'flow', direction: 'output' },
      { name: '数据', type: 'any', direction: 'output' },
    ],
    defaultProperties: { messageName: '' },
  },
  {
    type: 'if_else',
    category: 'condition',
    name: '如果/否则',
    description: '条件判断节点',
    icon: 'git-branch',
    inputs: [
      { name: '输入', type: 'flow', direction: 'input' },
      { name: '条件', type: 'boolean', direction: 'input' },
    ],
    outputs: [
      { name: '真', type: 'flow', direction: 'output' },
      { name: '假', type: 'flow', direction: 'output' },
    ],
    defaultProperties: {},
  },
  {
    type: 'compare',
    category: 'condition',
    name: '比较',
    description: '比较两个值的大小',
    icon: 'equal',
    inputs: [
      { name: 'A', type: 'any', direction: 'input' },
      { name: 'B', type: 'any', direction: 'input' },
    ],
    outputs: [{ name: '结果', type: 'boolean', direction: 'output' }],
    defaultProperties: { operator: '===' },
  },
  {
    type: 'boolean_op',
    category: 'condition',
    name: '布尔运算',
    description: '逻辑与、或、非运算',
    icon: 'toggle-right',
    inputs: [
      { name: 'A', type: 'boolean', direction: 'input' },
      { name: 'B', type: 'boolean', direction: 'input' },
    ],
    outputs: [{ name: '结果', type: 'boolean', direction: 'output' }],
    defaultProperties: { operator: '&&' },
  },
  {
    type: 'null_check',
    category: 'condition',
    name: '空值检查',
    description: '检查值是否为 null 或 undefined',
    icon: 'help-circle',
    inputs: [{ name: '值', type: 'any', direction: 'input' }],
    outputs: [{ name: '为空', type: 'boolean', direction: 'output' }],
    defaultProperties: {},
  },
  {
    type: 'set_variable',
    category: 'action',
    name: '设置变量',
    description: '给变量赋值',
    icon: 'edit',
    inputs: [
      { name: '输入', type: 'flow', direction: 'input' },
      { name: '值', type: 'any', direction: 'input' },
    ],
    outputs: [{ name: '输出', type: 'flow', direction: 'output' }],
    defaultProperties: { variableName: '' },
  },
  {
    type: 'call_function',
    category: 'action',
    name: '调用函数',
    description: '调用指定的函数',
    icon: 'function-square',
    inputs: [
      { name: '输入', type: 'flow', direction: 'input' },
      { name: '参数', type: 'any', direction: 'input' },
    ],
    outputs: [
      { name: '输出', type: 'flow', direction: 'output' },
      { name: '返回值', type: 'any', direction: 'output' },
    ],
    defaultProperties: { functionName: '' },
  },
  {
    type: 'play_animation',
    category: 'action',
    name: '播放动画',
    description: '播放指定的动画',
    icon: 'film',
    inputs: [{ name: '输入', type: 'flow', direction: 'input' }],
    outputs: [{ name: '输出', type: 'flow', direction: 'output' }],
    defaultProperties: { animationName: '', loop: false },
  },
  {
    type: 'show_hide',
    category: 'action',
    name: '显示/隐藏',
    description: '显示或隐藏目标对象',
    icon: 'eye',
    inputs: [{ name: '输入', type: 'flow', direction: 'input' }],
    outputs: [{ name: '输出', type: 'flow', direction: 'output' }],
    defaultProperties: { target: '', visible: true },
  },
  {
    type: 'scene_jump',
    category: 'action',
    name: '场景跳转',
    description: '跳转到指定场景',
    icon: 'arrow-right',
    inputs: [{ name: '输入', type: 'flow', direction: 'input' }],
    outputs: [],
    defaultProperties: { sceneName: '' },
  },
  {
    type: 'get_variable',
    category: 'variable',
    name: '获取变量',
    description: '读取变量的值',
    icon: 'database',
    inputs: [],
    outputs: [{ name: '值', type: 'any', direction: 'output' }],
    defaultProperties: { variableName: '' },
  },
  {
    type: 'number_value',
    category: 'variable',
    name: '数字值',
    description: '常量数字',
    icon: 'hash',
    inputs: [],
    outputs: [{ name: '值', type: 'number', direction: 'output' }],
    defaultProperties: { value: 0 },
  },
  {
    type: 'string_value',
    category: 'variable',
    name: '字符串值',
    description: '常量字符串',
    icon: 'type',
    inputs: [],
    outputs: [{ name: '值', type: 'string', direction: 'output' }],
    defaultProperties: { value: '' },
  },
  {
    type: 'boolean_value',
    category: 'variable',
    name: '布尔值',
    description: '常量布尔值',
    icon: 'check-circle',
    inputs: [],
    outputs: [{ name: '值', type: 'boolean', direction: 'output' }],
    defaultProperties: { value: true },
  },
  {
    type: 'array_value',
    category: 'variable',
    name: '数组值',
    description: '创建数组',
    icon: 'list',
    inputs: [],
    outputs: [{ name: '值', type: 'array', direction: 'output' }],
    defaultProperties: { value: [] },
  },
  {
    type: 'object_value',
    category: 'variable',
    name: '对象值',
    description: '创建对象',
    icon: 'box',
    inputs: [],
    outputs: [{ name: '值', type: 'object', direction: 'output' }],
    defaultProperties: { value: {} },
  },
  {
    type: 'for_loop',
    category: 'loop',
    name: 'For 循环',
    description: '按次数循环执行',
    icon: 'repeat',
    inputs: [
      { name: '输入', type: 'flow', direction: 'input' },
      { name: '次数', type: 'number', direction: 'input' },
    ],
    outputs: [
      { name: '循环体', type: 'flow', direction: 'output' },
      { name: '索引', type: 'number', direction: 'output' },
      { name: '完成', type: 'flow', direction: 'output' },
    ],
    defaultProperties: {},
  },
  {
    type: 'while_loop',
    category: 'loop',
    name: 'While 循环',
    description: '条件为真时循环',
    icon: 'refresh-cw',
    inputs: [
      { name: '输入', type: 'flow', direction: 'input' },
      { name: '条件', type: 'boolean', direction: 'input' },
    ],
    outputs: [
      { name: '循环体', type: 'flow', direction: 'output' },
      { name: '完成', type: 'flow', direction: 'output' },
    ],
    defaultProperties: {},
  },
  {
    type: 'for_each',
    category: 'loop',
    name: 'ForEach',
    description: '遍历数组每个元素',
    icon: 'list-ordered',
    inputs: [
      { name: '输入', type: 'flow', direction: 'input' },
      { name: '数组', type: 'array', direction: 'input' },
    ],
    outputs: [
      { name: '循环体', type: 'flow', direction: 'output' },
      { name: '元素', type: 'any', direction: 'output' },
      { name: '索引', type: 'number', direction: 'output' },
      { name: '完成', type: 'flow', direction: 'output' },
    ],
    defaultProperties: {},
  },
  {
    type: 'log',
    category: 'debug',
    name: '日志输出',
    description: '输出日志信息',
    icon: 'terminal',
    inputs: [
      { name: '输入', type: 'flow', direction: 'input' },
      { name: '消息', type: 'any', direction: 'input' },
    ],
    outputs: [{ name: '输出', type: 'flow', direction: 'output' }],
    defaultProperties: { level: 'info' },
  },
  {
    type: 'breakpoint',
    category: 'debug',
    name: '断点',
    description: '调试断点',
    icon: 'pause-circle',
    inputs: [{ name: '输入', type: 'flow', direction: 'input' }],
    outputs: [{ name: '输出', type: 'flow', direction: 'output' }],
    defaultProperties: { enabled: true },
  },
];

export class VisualLogicService {
  private graphs: Map<string, LogicGraph> = new Map();
  private currentGraphId: string | null = null;
  private nodeIdCounter = 0;
  private connectionIdCounter = 0;
  private variableIdCounter = 0;

  constructor() {
    this.loadPresetGraphs();
  }

  private loadPresetGraphs(): void {
    const presets: LogicGraph[] = [
      {
        id: 'preset-click-counter',
        name: '点击计数器',
        description: '每次点击增加计数',
        nodes: [
          {
            id: 'node-1',
            type: 'click',
            category: 'event',
            name: '点击事件',
            inputs: [],
            outputs: [
              { id: 'port-1', name: '输出', type: 'flow', direction: 'output' },
              { id: 'port-2', name: '目标', type: 'object', direction: 'output' },
            ],
            position: { x: 50, y: 100 },
            properties: { target: '' },
          },
          {
            id: 'node-2',
            type: 'get_variable',
            category: 'variable',
            name: '获取计数',
            inputs: [],
            outputs: [{ id: 'port-3', name: '值', type: 'any', direction: 'output' }],
            position: { x: 250, y: 50 },
            properties: { variableName: 'count' },
          },
          {
            id: 'node-3',
            type: 'number_value',
            category: 'variable',
            name: '增量',
            inputs: [],
            outputs: [{ id: 'port-4', name: '值', type: 'number', direction: 'output' }],
            position: { x: 250, y: 200 },
            properties: { value: 1 },
          },
          {
            id: 'node-4',
            type: 'compare',
            category: 'condition',
            name: '加法',
            inputs: [
              { id: 'port-5', name: 'A', type: 'any', direction: 'input' },
              { id: 'port-6', name: 'B', type: 'any', direction: 'input' },
            ],
            outputs: [{ id: 'port-7', name: '结果', type: 'boolean', direction: 'output' }],
            position: { x: 450, y: 100 },
            properties: { operator: '+' },
          },
          {
            id: 'node-5',
            type: 'set_variable',
            category: 'action',
            name: '更新计数',
            inputs: [
              { id: 'port-8', name: '输入', type: 'flow', direction: 'input' },
              { id: 'port-9', name: '值', type: 'any', direction: 'input' },
            ],
            outputs: [{ id: 'port-10', name: '输出', type: 'flow', direction: 'output' }],
            position: { x: 650, y: 100 },
            properties: { variableName: 'count' },
          },
        ],
        connections: [
          { id: 'conn-1', fromNodeId: 'node-1', fromPortId: 'port-1', toNodeId: 'node-5', toPortId: 'port-8' },
          { id: 'conn-2', fromNodeId: 'node-2', fromPortId: 'port-3', toNodeId: 'node-4', toPortId: 'port-5' },
          { id: 'conn-3', fromNodeId: 'node-3', fromPortId: 'port-4', toNodeId: 'node-4', toPortId: 'port-6' },
          { id: 'conn-4', fromNodeId: 'node-4', fromPortId: 'port-7', toNodeId: 'node-5', toPortId: 'port-9' },
        ],
        variables: [
          {
            id: 'var-1',
            name: 'count',
            type: 'number',
            scope: 'global',
            defaultValue: 0,
            description: '点击计数',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'preset-timer-log',
        name: '定时器日志',
        description: '每秒输出一条日志',
        nodes: [
          {
            id: 'node-1',
            type: 'start',
            category: 'event',
            name: '开始',
            inputs: [],
            outputs: [{ id: 'port-1', name: '输出', type: 'flow', direction: 'output' }],
            position: { x: 50, y: 100 },
            properties: {},
          },
          {
            id: 'node-2',
            type: 'timer',
            category: 'event',
            name: '定时器',
            inputs: [{ id: 'port-2', name: '启动', type: 'flow', direction: 'input' }],
            outputs: [
              { id: 'port-3', name: '触发', type: 'flow', direction: 'output' },
              { id: 'port-4', name: '停止', type: 'flow', direction: 'output' },
            ],
            position: { x: 250, y: 100 },
            properties: { interval: 1000, repeat: true },
          },
          {
            id: 'node-3',
            type: 'string_value',
            category: 'variable',
            name: '消息',
            inputs: [],
            outputs: [{ id: 'port-5', name: '值', type: 'string', direction: 'output' }],
            position: { x: 250, y: 250 },
            properties: { value: '定时器触发！' },
          },
          {
            id: 'node-4',
            type: 'log',
            category: 'debug',
            name: '日志输出',
            inputs: [
              { id: 'port-6', name: '输入', type: 'flow', direction: 'input' },
              { id: 'port-7', name: '消息', type: 'any', direction: 'input' },
            ],
            outputs: [{ id: 'port-8', name: '输出', type: 'flow', direction: 'output' }],
            position: { x: 500, y: 100 },
            properties: { level: 'info' },
          },
        ],
        connections: [
          { id: 'conn-1', fromNodeId: 'node-1', fromPortId: 'port-1', toNodeId: 'node-2', toPortId: 'port-2' },
          { id: 'conn-2', fromNodeId: 'node-2', fromPortId: 'port-3', toNodeId: 'node-4', toPortId: 'port-6' },
          { id: 'conn-3', fromNodeId: 'node-3', fromPortId: 'port-5', toNodeId: 'node-4', toPortId: 'port-7' },
        ],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    presets.forEach((preset) => {
      this.graphs.set(preset.id, preset);
    });
  }

  getNodeTypeDefinitions(): NodeTypeDefinition[] {
    return NODE_TYPE_DEFINITIONS;
  }

  getNodeTypeDefinition(type: string): NodeTypeDefinition | undefined {
    return NODE_TYPE_DEFINITIONS.find((def) => def.type === type);
  }

  getNodeTypesByCategory(category: NodeCategory): NodeTypeDefinition[] {
    return NODE_TYPE_DEFINITIONS.filter((def) => def.category === category);
  }

  createGraph(name: string, description?: string): LogicGraph {
    const id = `graph-${Date.now()}`;
    const now = new Date().toISOString();
    const graph: LogicGraph = {
      id,
      name,
      description,
      nodes: [],
      connections: [],
      variables: [],
      createdAt: now,
      updatedAt: now,
    };
    this.graphs.set(id, graph);
    globalEventBus.emit('visual-logic:graph-created', { graph });
    return graph;
  }

  getGraph(id: string): LogicGraph | undefined {
    return this.graphs.get(id);
  }

  getAllGraphs(): LogicGraph[] {
    return Array.from(this.graphs.values());
  }

  deleteGraph(id: string): boolean {
    const graph = this.graphs.get(id);
    if (!graph) return false;
    this.graphs.delete(id);
    if (this.currentGraphId === id) {
      this.currentGraphId = null;
    }
    globalEventBus.emit('visual-logic:graph-deleted', { graphId: id });
    return true;
  }

  updateGraph(id: string, updates: Partial<Omit<LogicGraph, 'id' | 'createdAt'>>): LogicGraph | undefined {
    const graph = this.graphs.get(id);
    if (!graph) return undefined;
    const updated: LogicGraph = {
      ...graph,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.graphs.set(id, updated);
    globalEventBus.emit('visual-logic:graph-updated', { graph: updated });
    return updated;
  }

  setCurrentGraph(graphId: string | null): void {
    this.currentGraphId = graphId;
    globalEventBus.emit('visual-logic:current-graph-changed', { graphId });
  }

  getCurrentGraph(): LogicGraph | undefined {
    if (!this.currentGraphId) return undefined;
    return this.graphs.get(this.currentGraphId);
  }

  addNode(graphId: string, type: string, position: NodePosition): LogicNode | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const definition = this.getNodeTypeDefinition(type);
    if (!definition) return undefined;

    this.nodeIdCounter++;
    const nodeId = `node-${this.nodeIdCounter}`;

    const inputs: Port[] = definition.inputs.map((p, i) => ({
      ...p,
      id: `${nodeId}-in-${i}`,
    }));

    const outputs: Port[] = definition.outputs.map((p, i) => ({
      ...p,
      id: `${nodeId}-out-${i}`,
    }));

    const node: LogicNode = {
      id: nodeId,
      type: definition.type,
      category: definition.category,
      name: definition.name,
      description: definition.description,
      inputs,
      outputs,
      position,
      properties: { ...definition.defaultProperties },
    };

    graph.nodes.push(node);
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:node-added', { graphId, node });
    return node;
  }

  removeNode(graphId: string, nodeId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;

    const nodeIndex = graph.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) return false;

    graph.nodes.splice(nodeIndex, 1);
    graph.connections = graph.connections.filter(
      (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
    );
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:node-removed', { graphId, nodeId });
    return true;
  }

  updateNode(graphId: string, nodeId: string, updates: Partial<LogicNode>): LogicNode | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return undefined;

    Object.assign(node, updates);
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:node-updated', { graphId, node });
    return node;
  }

  moveNode(graphId: string, nodeId: string, position: NodePosition): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;

    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    node.position = position;
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:node-moved', { graphId, nodeId, position });
    return true;
  }

  addConnection(
    graphId: string,
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ): Connection | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const fromNode = graph.nodes.find((n) => n.id === fromNodeId);
    const toNode = graph.nodes.find((n) => n.id === toNodeId);
    if (!fromNode || !toNode) return undefined;

    const fromPort = fromNode.outputs.find((p) => p.id === fromPortId);
    const toPort = toNode.inputs.find((p) => p.id === toPortId);
    if (!fromPort || !toPort) return undefined;

    if (!this.checkTypeCompatibility(fromPort.type, toPort.type)) {
      globalEventBus.emit('visual-logic:connection-error', {
        reason: 'type_mismatch',
        fromType: fromPort.type,
        toType: toPort.type,
      });
      return undefined;
    }

    const existingConnection = graph.connections.find(
      (c) => c.toNodeId === toNodeId && c.toPortId === toPortId
    );
    if (existingConnection) {
      this.removeConnection(graphId, existingConnection.id);
    }

    this.connectionIdCounter++;
    const connection: Connection = {
      id: `conn-${this.connectionIdCounter}`,
      fromNodeId,
      fromPortId,
      toNodeId,
      toPortId,
    };

    graph.connections.push(connection);
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:connection-added', { graphId, connection });
    return connection;
  }

  removeConnection(graphId: string, connectionId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;

    const index = graph.connections.findIndex((c) => c.id === connectionId);
    if (index === -1) return false;

    graph.connections.splice(index, 1);
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:connection-removed', { graphId, connectionId });
    return true;
  }

  private checkTypeCompatibility(fromType: PortType, toType: PortType): boolean {
    if (fromType === 'any' || toType === 'any') return true;
    if (fromType === toType) return true;
    if (fromType === 'number' && toType === 'string') return true;
    return false;
  }

  addVariable(graphId: string, variable: Omit<Variable, 'id'>): Variable | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    this.variableIdCounter++;
    const newVar: Variable = {
      ...variable,
      id: `var-${this.variableIdCounter}`,
    };

    graph.variables.push(newVar);
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:variable-added', { graphId, variable: newVar });
    return newVar;
  }

  removeVariable(graphId: string, variableId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;

    const index = graph.variables.findIndex((v) => v.id === variableId);
    if (index === -1) return false;

    graph.variables.splice(index, 1);
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:variable-removed', { graphId, variableId });
    return true;
  }

  updateVariable(
    graphId: string,
    variableId: string,
    updates: Partial<Omit<Variable, 'id'>>
  ): Variable | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const variable = graph.variables.find((v) => v.id === variableId);
    if (!variable) return undefined;

    Object.assign(variable, updates);
    graph.updatedAt = new Date().toISOString();
    globalEventBus.emit('visual-logic:variable-updated', { graphId, variable });
    return variable;
  }

  getVariables(graphId: string, scope?: VariableScope): Variable[] {
    const graph = this.graphs.get(graphId);
    if (!graph) return [];
    if (!scope) return graph.variables;
    return graph.variables.filter((v) => v.scope === scope);
  }

  validateGraph(graphId: string): LogicValidationWarning[] {
    const graph = this.graphs.get(graphId);
    if (!graph) return [];

    const warnings: LogicValidationWarning[] = [];
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

    const hasStartNode = graph.nodes.some((n) => n.type === 'start');
    if (!hasStartNode && graph.nodes.length > 0) {
      warnings.push({
        type: 'missing_start',
        severity: 'warning',
        message: '缺少开始节点，逻辑可能无法执行',
      });
    }

    for (const node of graph.nodes) {
      for (const input of node.inputs) {
        const hasConnection = graph.connections.some(
          (c) => c.toNodeId === node.id && c.toPortId === input.id
        );
        if (!hasConnection && input.type !== 'flow') {
          const isUsed = graph.connections.some(
            (c) => c.fromNodeId === node.id || c.toNodeId === node.id
          );
          if (isUsed) {
            warnings.push({
              type: 'unconnected_port',
              severity: 'warning',
              message: `节点 "${node.name}" 的输入端口 "${input.name}" 未连接`,
              nodeId: node.id,
              portId: input.id,
            });
          }
        }
      }
    }

    for (const connection of graph.connections) {
      const fromNode = nodeMap.get(connection.fromNodeId);
      const toNode = nodeMap.get(connection.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromPort = fromNode.outputs.find((p) => p.id === connection.fromPortId);
      const toPort = toNode.inputs.find((p) => p.id === connection.toPortId);
      if (!fromPort || !toPort) continue;

      if (!this.checkTypeCompatibility(fromPort.type, toPort.type)) {
        warnings.push({
          type: 'type_mismatch',
          severity: 'error',
          message: `类型不匹配: ${fromPort.type} -> ${toPort.type}`,
          nodeId: connection.toNodeId,
          portId: connection.toPortId,
        });
      }
    }

    if (this.detectDeadLoop(graph)) {
      warnings.push({
        type: 'dead_loop',
        severity: 'error',
        message: '检测到可能的死循环',
      });
    }

    for (const node of graph.nodes) {
      const hasInput = graph.connections.some((c) => c.toNodeId === node.id);
      const hasOutput = graph.connections.some((c) => c.fromNodeId === node.id);
      if (!hasInput && !hasOutput && graph.nodes.length > 1) {
        warnings.push({
          type: 'unused_node',
          severity: 'info',
          message: `节点 "${node.name}" 未被使用`,
          nodeId: node.id,
        });
      }
    }

    return warnings;
  }

  private detectDeadLoop(graph: LogicGraph): boolean {
    const adjacencyList = new Map<string, string[]>();
    for (const node of graph.nodes) {
      adjacencyList.set(node.id, []);
    }
    for (const conn of graph.connections) {
      const neighbors = adjacencyList.get(conn.fromNodeId);
      if (neighbors) {
        neighbors.push(conn.toNodeId);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  generateCode(graphId: string, options: CodeGenerationOptions = { language: 'javascript', includeComments: true }): string {
    const graph = this.graphs.get(graphId);
    if (!graph) return '';

    const { language, includeComments, functionName } = options;
    const lines: string[] = [];
    const isTS = language === 'typescript';

    if (includeComments) {
      lines.push('// ===========================================');
      lines.push(`// Visual Logic Generated Code: ${graph.name}`);
      lines.push(`// Generated at: ${new Date().toISOString()}`);
      lines.push('// ===========================================');
      lines.push('');
    }

    if (graph.variables.length > 0) {
      if (includeComments) {
        lines.push('// Variables');
      }
      for (const variable of graph.variables) {
        const typeAnnotation = isTS ? `: ${this.mapVariableType(variable.type)}` : '';
        const defaultValue = this.formatValue(variable.defaultValue, variable.type);
        if (variable.scope === 'global') {
          lines.push(`let ${variable.name}${typeAnnotation} = ${defaultValue};`);
        }
      }
      lines.push('');
    }

    const funcName = functionName || 'executeLogic';
    if (isTS) {
      lines.push(`function ${funcName}(): void {`);
    } else {
      lines.push(`function ${funcName}() {`);
    }

    const startNode = graph.nodes.find((n) => n.type === 'start');
    if (startNode) {
      this.generateNodeCode(startNode, graph, lines, 1, includeComments);
    } else {
      lines.push('  // Warning: No start node found');
    }

    lines.push('}');
    lines.push('');
    lines.push(`${funcName}();`);

    return lines.join('\n');
  }

  private mapVariableType(type: VariableType): string {
    switch (type) {
      case 'number': return 'number';
      case 'string': return 'string';
      case 'boolean': return 'boolean';
      case 'array': return 'any[]';
      case 'object': return 'Record<string, any>';
      default: return 'any';
    }
  }

  private formatValue(value: unknown, type: VariableType): string {
    if (value === null || value === undefined) {
      return type === 'string' ? "''" : type === 'boolean' ? 'false' : type === 'number' ? '0' : 'null';
    }
    if (type === 'string') return `'${value}'`;
    if (type === 'object' || type === 'array') return JSON.stringify(value);
    return String(value);
  }

  private generateNodeCode(
    node: LogicNode,
    graph: LogicGraph,
    lines: string[],
    indent: number,
    includeComments: boolean
  ): void {
    const pad = '  '.repeat(indent);

    if (includeComments) {
      lines.push(`${pad}// [${node.category}] ${node.name}`);
    }

    switch (node.type) {
      case 'start':
      case 'click':
      case 'timer':
      case 'collision':
      case 'message':
        this.generateFlowOutputCode(node, graph, lines, indent, includeComments);
        break;

      case 'if_else':
        lines.push(`${pad}if (/* condition */) {`);
        this.generateFlowOutputCodeByIndex(node, graph, lines, indent + 1, 0, includeComments);
        lines.push(`${pad}} else {`);
        this.generateFlowOutputCodeByIndex(node, graph, lines, indent + 1, 1, includeComments);
        lines.push(`${pad}}`);
        break;

      case 'set_variable':
        const varName = node.properties.variableName || 'unknown';
        lines.push(`${pad}${varName} = /* value */;`);
        this.generateFlowOutputCode(node, graph, lines, indent, includeComments);
        break;

      case 'call_function':
        const funcName = node.properties.functionName || 'unknown';
        lines.push(`${pad}const result = ${funcName}(/* params */);`);
        this.generateFlowOutputCode(node, graph, lines, indent, includeComments);
        break;

      case 'play_animation':
        const animName = node.properties.animationName || 'unknown';
        lines.push(`${pad}// Play animation: ${animName}`);
        this.generateFlowOutputCode(node, graph, lines, indent, includeComments);
        break;

      case 'show_hide':
        const target = node.properties.target || 'target';
        const visible = node.properties.visible ? 'show' : 'hide';
        lines.push(`${pad}// ${visible} ${target}`);
        this.generateFlowOutputCode(node, graph, lines, indent, includeComments);
        break;

      case 'scene_jump':
        const sceneName = node.properties.sceneName || 'unknown';
        lines.push(`${pad}// Jump to scene: ${sceneName}`);
        break;

      case 'for_loop':
        lines.push(`${pad}for (let i = 0; i < /* count */; i++) {`);
        this.generateFlowOutputCodeByIndex(node, graph, lines, indent + 1, 0, includeComments);
        lines.push(`${pad}}`);
        this.generateFlowOutputCodeByIndex(node, graph, lines, indent, 2, includeComments);
        break;

      case 'while_loop':
        lines.push(`${pad}while (/* condition */) {`);
        this.generateFlowOutputCodeByIndex(node, graph, lines, indent + 1, 0, includeComments);
        lines.push(`${pad}}`);
        this.generateFlowOutputCodeByIndex(node, graph, lines, indent, 1, includeComments);
        break;

      case 'for_each':
        lines.push(`${pad}[/* array */].forEach((item, index) => {`);
        this.generateFlowOutputCodeByIndex(node, graph, lines, indent + 1, 0, includeComments);
        lines.push(`${pad}});`);
        this.generateFlowOutputCodeByIndex(node, graph, lines, indent, 3, includeComments);
        break;

      case 'log':
        const level = node.properties.level || 'info';
        lines.push(`${pad}console.${level}(/* message */);`);
        this.generateFlowOutputCode(node, graph, lines, indent, includeComments);
        break;

      case 'breakpoint':
        lines.push(`${pad}debugger;`);
        this.generateFlowOutputCode(node, graph, lines, indent, includeComments);
        break;

      case 'get_variable':
      case 'number_value':
      case 'string_value':
      case 'boolean_value':
      case 'array_value':
      case 'object_value':
      case 'compare':
      case 'boolean_op':
      case 'null_check':
        break;

      default:
        this.generateFlowOutputCode(node, graph, lines, indent, includeComments);
        break;
    }
  }

  private generateFlowOutputCode(
    node: LogicNode,
    graph: LogicGraph,
    lines: string[],
    indent: number,
    includeComments: boolean
  ): void {
    const flowOutputs = node.outputs.filter((p) => p.type === 'flow');
    if (flowOutputs.length > 0) {
      this.generateFlowOutputCodeByIndex(node, graph, lines, indent, 0, includeComments);
    }
  }

  private generateFlowOutputCodeByIndex(
    node: LogicNode,
    graph: LogicGraph,
    lines: string[],
    indent: number,
    outputIndex: number,
    includeComments: boolean
  ): void {
    const flowOutputs = node.outputs.filter((p) => p.type === 'flow');
    if (outputIndex >= flowOutputs.length) return;

    const output = flowOutputs[outputIndex];
    const connections = graph.connections.filter(
      (c) => c.fromNodeId === node.id && c.fromPortId === output.id
    );

    for (const conn of connections) {
      const nextNode = graph.nodes.find((n) => n.id === conn.toNodeId);
      if (nextNode) {
        this.generateNodeCode(nextNode, graph, lines, indent, includeComments);
      }
    }
  }

  serializeGraph(graphId: string): string | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;
    return JSON.stringify(graph, null, 2);
  }

  deserializeGraph(json: string): LogicGraph | undefined {
    try {
      const graph = JSON.parse(json) as LogicGraph;
      if (!graph.id || !graph.nodes || !graph.connections) {
        throw new Error('Invalid graph format');
      }
      this.graphs.set(graph.id, graph);
      globalEventBus.emit('visual-logic:graph-created', { graph });
      return graph;
    } catch (error) {
      globalEventBus.emit('visual-logic:deserialize-error', { error });
      return undefined;
    }
  }

  exportGraph(graphId: string): Record<string, unknown> | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;
    return {
      version: '1.0',
      type: 'visual-logic-graph',
      graph,
    };
  }
}

export const visualLogicService = new VisualLogicService();
