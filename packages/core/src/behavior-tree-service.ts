import { globalEventBus } from './event-bus';

export type NodeStatus = 'success' | 'failure' | 'running';
export type NodeCategory = 'composite' | 'decorator' | 'condition' | 'action';

export interface BehaviorTreeNode {
  id: string;
  type: string;
  category: NodeCategory;
  name: string;
  description?: string;
  children: string[];
  properties: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface BlackboardEntry {
  key: string;
  value: unknown;
  type: 'number' | 'string' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface BehaviorTree {
  id: string;
  name: string;
  description?: string;
  rootNodeId: string | null;
  nodes: Map<string, BehaviorTreeNode>;
  blackboard: BlackboardEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorTreeRuntime {
  treeId: string;
  currentNodeId: string | null;
  status: NodeStatus;
  nodeStatuses: Map<string, NodeStatus>;
  blackboard: Map<string, unknown>;
  isRunning: boolean;
  stepCount: number;
}

export interface NodeTypeDefinition {
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  icon?: string;
  maxChildren: number;
  defaultProperties: Record<string, unknown>;
}

const NODE_TYPE_DEFINITIONS: NodeTypeDefinition[] = [
  {
    type: 'selector',
    category: 'composite',
    name: '选择器',
    description: '依次执行子节点，直到一个成功则返回成功，全部失败则返回失败',
    icon: 'git-branch',
    maxChildren: -1,
    defaultProperties: {},
  },
  {
    type: 'sequence',
    category: 'composite',
    name: '序列',
    description: '依次执行子节点，直到一个失败则返回失败，全部成功则返回成功',
    icon: 'list',
    maxChildren: -1,
    defaultProperties: {},
  },
  {
    type: 'parallel',
    category: 'composite',
    name: '并行',
    description: '同时执行所有子节点',
    icon: 'layers',
    maxChildren: -1,
    defaultProperties: { successPolicy: 'one', failurePolicy: 'one' },
  },
  {
    type: 'inverter',
    category: 'decorator',
    name: '取反',
    description: '反转子节点的返回结果',
    icon: 'rotate-ccw',
    maxChildren: 1,
    defaultProperties: {},
  },
  {
    type: 'repeater',
    category: 'decorator',
    name: '重复',
    description: '重复执行子节点指定次数',
    icon: 'repeat',
    maxChildren: 1,
    defaultProperties: { count: 3, repeatOnFailure: false },
  },
  {
    type: 'until_success',
    category: 'decorator',
    name: '直到成功',
    description: '重复执行直到子节点成功',
    icon: 'check-circle',
    maxChildren: 1,
    defaultProperties: { maxAttempts: 10 },
  },
  {
    type: 'delay',
    category: 'decorator',
    name: '延时',
    description: '延迟指定时间后执行子节点',
    icon: 'clock',
    maxChildren: 1,
    defaultProperties: { delay: 1000 },
  },
  {
    type: 'check_variable',
    category: 'condition',
    name: '检查变量',
    description: '检查黑板变量是否满足条件',
    icon: 'search',
    maxChildren: 0,
    defaultProperties: { key: '', operator: '===', value: true },
  },
  {
    type: 'distance_check',
    category: 'condition',
    name: '距离检测',
    description: '检测与目标的距离是否在范围内',
    icon: 'compass',
    maxChildren: 0,
    defaultProperties: { target: 'player', minDistance: 0, maxDistance: 10 },
  },
  {
    type: 'cooldown',
    category: 'condition',
    name: '冷却时间',
    description: '检查技能是否在冷却中',
    icon: 'timer',
    maxChildren: 0,
    defaultProperties: { cooldownKey: '', cooldownTime: 5000 },
  },
  {
    type: 'move',
    category: 'action',
    name: '移动',
    description: '移动到指定位置',
    icon: 'move',
    maxChildren: 0,
    defaultProperties: { target: 'player', speed: 5, stopDistance: 1 },
  },
  {
    type: 'attack',
    category: 'action',
    name: '攻击',
    description: '攻击目标',
    icon: 'sword',
    maxChildren: 0,
    defaultProperties: { damage: 10, range: 2, cooldown: 1000 },
  },
  {
    type: 'patrol',
    category: 'action',
    name: '巡逻',
    description: '在指定路径上巡逻',
    icon: 'footprints',
    maxChildren: 0,
    defaultProperties: { waypoints: [], speed: 3, loop: true },
  },
  {
    type: 'flee',
    category: 'action',
    name: '逃跑',
    description: '逃离目标',
    icon: 'running',
    maxChildren: 0,
    defaultProperties: { target: 'player', fleeDistance: 15, speed: 8 },
  },
  {
    type: 'play_animation',
    category: 'action',
    name: '播放动画',
    description: '播放指定动画',
    icon: 'film',
    maxChildren: 0,
    defaultProperties: { animationName: 'idle', loop: false },
  },
];

export interface BehaviorTreeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tree: Omit<BehaviorTree, 'createdAt' | 'updatedAt'>;
}

const PRESET_TEMPLATES: BehaviorTreeTemplate[] = [
  {
    id: 'template-enemy-ai',
    name: '基础敌人AI',
    description: '巡逻-发现-追击-攻击的经典敌人行为',
    category: 'Enemy',
    tree: {
      id: 'enemy-ai',
      name: '基础敌人AI',
      rootNodeId: 'root',
      nodes: new Map([
        [
          'root',
          {
            id: 'root',
            type: 'selector',
            category: 'composite',
            name: '根节点',
            children: ['attack', 'chase', 'patrol'],
            properties: {},
            position: { x: 300, y: 50 },
          },
        ],
        [
          'attack',
          {
            id: 'attack',
            type: 'sequence',
            category: 'composite',
            name: '攻击',
            children: ['attack-range-check', 'do-attack'],
            properties: {},
            position: { x: 100, y: 150 },
          },
        ],
        [
          'attack-range-check',
          {
            id: 'attack-range-check',
            type: 'distance_check',
            category: 'condition',
            name: '攻击范围检测',
            children: [],
            properties: { target: 'player', minDistance: 0, maxDistance: 2 },
            position: { x: 50, y: 250 },
          },
        ],
        [
          'do-attack',
          {
            id: 'do-attack',
            type: 'attack',
            category: 'action',
            name: '攻击',
            children: [],
            properties: { damage: 10, range: 2, cooldown: 1000 },
            position: { x: 150, y: 250 },
          },
        ],
        [
          'chase',
          {
            id: 'chase',
            type: 'sequence',
            category: 'composite',
            name: '追击',
            children: ['chase-range-check', 'do-chase'],
            properties: {},
            position: { x: 300, y: 150 },
          },
        ],
        [
          'chase-range-check',
          {
            id: 'chase-range-check',
            type: 'distance_check',
            category: 'condition',
            name: '发现范围检测',
            children: [],
            properties: { target: 'player', minDistance: 2, maxDistance: 10 },
            position: { x: 250, y: 250 },
          },
        ],
        [
          'do-chase',
          {
            id: 'do-chase',
            type: 'move',
            category: 'action',
            name: '移动追击',
            children: [],
            properties: { target: 'player', speed: 5, stopDistance: 2 },
            position: { x: 350, y: 250 },
          },
        ],
        [
          'patrol',
          {
            id: 'patrol',
            type: 'patrol',
            category: 'action',
            name: '巡逻',
            children: [],
            properties: { waypoints: [], speed: 3, loop: true },
            position: { x: 500, y: 150 },
          },
        ],
      ]),
      blackboard: [
        {
          key: 'playerPosition',
          value: { x: 0, y: 0, z: 0 },
          type: 'object',
          description: '玩家位置',
        },
        { key: 'health', value: 100, type: 'number', description: '生命值' },
      ],
    },
  },
  {
    id: 'template-boss-ai',
    name: 'Boss AI',
    description: '带阶段变化的Boss行为树',
    category: 'Enemy',
    tree: {
      id: 'boss-ai',
      name: 'Boss AI',
      rootNodeId: 'root',
      nodes: new Map([
        [
          'root',
          {
            id: 'root',
            type: 'selector',
            category: 'composite',
            name: '根节点',
            children: ['phase2', 'phase1'],
            properties: {},
            position: { x: 300, y: 50 },
          },
        ],
        [
          'phase1',
          {
            id: 'phase1',
            type: 'sequence',
            category: 'composite',
            name: '阶段一',
            children: ['phase1-check', 'phase1-behavior'],
            properties: {},
            position: { x: 150, y: 150 },
          },
        ],
        [
          'phase1-check',
          {
            id: 'phase1-check',
            type: 'check_variable',
            category: 'condition',
            name: '血量>50%',
            children: [],
            properties: { key: 'healthPercent', operator: '>', value: 50 },
            position: { x: 100, y: 250 },
          },
        ],
        [
          'phase1-behavior',
          {
            id: 'phase1-behavior',
            type: 'selector',
            category: 'composite',
            name: '阶段一行为',
            children: ['attack', 'move-to-player'],
            properties: {},
            position: { x: 200, y: 250 },
          },
        ],
        [
          'phase2',
          {
            id: 'phase2',
            type: 'sequence',
            category: 'composite',
            name: '阶段二',
            children: ['phase2-check', 'phase2-behavior'],
            properties: {},
            position: { x: 450, y: 150 },
          },
        ],
        [
          'phase2-check',
          {
            id: 'phase2-check',
            type: 'check_variable',
            category: 'condition',
            name: '血量<=50%',
            children: [],
            properties: { key: 'healthPercent', operator: '<=', value: 50 },
            position: { x: 400, y: 250 },
          },
        ],
        [
          'phase2-behavior',
          {
            id: 'phase2-behavior',
            type: 'parallel',
            category: 'composite',
            name: '狂暴模式',
            children: ['frenzy-attack', 'frenzy-speed'],
            properties: { successPolicy: 'all', failurePolicy: 'one' },
            position: { x: 500, y: 250 },
          },
        ],
        [
          'attack',
          {
            id: 'attack',
            type: 'attack',
            category: 'action',
            name: '普通攻击',
            children: [],
            properties: { damage: 15, range: 3, cooldown: 1500 },
            position: { x: 150, y: 350 },
          },
        ],
        [
          'move-to-player',
          {
            id: 'move-to-player',
            type: 'move',
            category: 'action',
            name: '追击玩家',
            children: [],
            properties: { target: 'player', speed: 4, stopDistance: 3 },
            position: { x: 250, y: 350 },
          },
        ],
        [
          'frenzy-attack',
          {
            id: 'frenzy-attack',
            type: 'repeater',
            category: 'decorator',
            name: '连续攻击',
            children: ['heavy-attack'],
            properties: { count: 3, repeatOnFailure: false },
            position: { x: 450, y: 350 },
          },
        ],
        [
          'heavy-attack',
          {
            id: 'heavy-attack',
            type: 'attack',
            category: 'action',
            name: '重击',
            children: [],
            properties: { damage: 30, range: 4, cooldown: 800 },
            position: { x: 450, y: 450 },
          },
        ],
        [
          'frenzy-speed',
          {
            id: 'frenzy-speed',
            type: 'move',
            category: 'action',
            name: '快速移动',
            children: [],
            properties: { target: 'player', speed: 8, stopDistance: 2 },
            position: { x: 550, y: 350 },
          },
        ],
      ]),
      blackboard: [
        { key: 'healthPercent', value: 100, type: 'number', description: '血量百分比' },
        { key: 'isEnraged', value: false, type: 'boolean', description: '是否狂暴' },
      ],
    },
  },
  {
    id: 'template-idle-wander',
    name: '闲逛AI',
    description: '简单的闲逛行为，适合中立生物',
    category: 'NPC',
    tree: {
      id: 'idle-wander',
      name: '闲逛AI',
      rootNodeId: 'root',
      nodes: new Map([
        [
          'root',
          {
            id: 'root',
            type: 'selector',
            category: 'composite',
            name: '根节点',
            children: ['flee-when-scared', 'wander'],
            properties: {},
            position: { x: 300, y: 50 },
          },
        ],
        [
          'flee-when-scared',
          {
            id: 'flee-when-scared',
            type: 'sequence',
            category: 'composite',
            name: '受惊逃跑',
            children: ['player-nearby', 'flee'],
            properties: {},
            position: { x: 150, y: 150 },
          },
        ],
        [
          'player-nearby',
          {
            id: 'player-nearby',
            type: 'distance_check',
            category: 'condition',
            name: '玩家靠近',
            children: [],
            properties: { target: 'player', minDistance: 0, maxDistance: 5 },
            position: { x: 100, y: 250 },
          },
        ],
        [
          'flee',
          {
            id: 'flee',
            type: 'flee',
            category: 'action',
            name: '逃跑',
            children: [],
            properties: { target: 'player', fleeDistance: 15, speed: 6 },
            position: { x: 200, y: 250 },
          },
        ],
        [
          'wander',
          {
            id: 'wander',
            type: 'sequence',
            category: 'composite',
            name: '闲逛',
            children: ['idle-delay', 'random-move'],
            properties: {},
            position: { x: 450, y: 150 },
          },
        ],
        [
          'idle-delay',
          {
            id: 'idle-delay',
            type: 'delay',
            category: 'decorator',
            name: '休息一会',
            children: ['play-idle'],
            properties: { delay: 2000 },
            position: { x: 400, y: 250 },
          },
        ],
        [
          'play-idle',
          {
            id: 'play-idle',
            type: 'play_animation',
            category: 'action',
            name: '待机动画',
            children: [],
            properties: { animationName: 'idle', loop: true },
            position: { x: 400, y: 350 },
          },
        ],
        [
          'random-move',
          {
            id: 'random-move',
            type: 'move',
            category: 'action',
            name: '随机移动',
            children: [],
            properties: { target: 'random', speed: 2, stopDistance: 0.5 },
            position: { x: 500, y: 250 },
          },
        ],
      ]),
      blackboard: [{ key: 'isScared', value: false, type: 'boolean', description: '是否受惊' }],
    },
  },
];

export class BehaviorTreeService {
  private trees: Map<string, BehaviorTree> = new Map();
  private runtimes: Map<string, BehaviorTreeRuntime> = new Map();
  private currentTreeId: string | null = null;
  private nodeIdCounter = 0;

  constructor() {
    this.loadPresetTrees();
  }

  private loadPresetTrees(): void {
    PRESET_TEMPLATES.forEach((template) => {
      const now = new Date().toISOString();
      const tree: BehaviorTree = {
        ...template.tree,
        id: template.id,
        name: template.name,
        description: template.description,
        createdAt: now,
        updatedAt: now,
      };
      this.trees.set(tree.id, tree);
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

  getTemplates(): BehaviorTreeTemplate[] {
    return PRESET_TEMPLATES;
  }

  getTemplate(id: string): BehaviorTreeTemplate | undefined {
    return PRESET_TEMPLATES.find((t) => t.id === id);
  }

  createTree(name: string, description?: string): BehaviorTree {
    const id = `bt-${Date.now()}`;
    const now = new Date().toISOString();
    const tree: BehaviorTree = {
      id,
      name,
      description,
      rootNodeId: null,
      nodes: new Map(),
      blackboard: [],
      createdAt: now,
      updatedAt: now,
    };
    this.trees.set(id, tree);
    globalEventBus.emit('behavior-tree:tree-created', { tree });
    return tree;
  }

  createTreeFromTemplate(templateId: string): BehaviorTree | undefined {
    const template = this.getTemplate(templateId);
    if (!template) return undefined;

    const newId = `bt-${Date.now()}`;
    const now = new Date().toISOString();
    const nodes = new Map<string, BehaviorTreeNode>();

    for (const [key, node] of template.tree.nodes) {
      nodes.set(key, { ...node });
    }

    const tree: BehaviorTree = {
      id: newId,
      name: `${template.name} (副本)`,
      description: template.description,
      rootNodeId: template.tree.rootNodeId,
      nodes,
      blackboard: [...template.tree.blackboard],
      createdAt: now,
      updatedAt: now,
    };

    this.trees.set(newId, tree);
    globalEventBus.emit('behavior-tree:tree-created', { tree });
    return tree;
  }

  getTree(id: string): BehaviorTree | undefined {
    return this.trees.get(id);
  }

  getAllTrees(): BehaviorTree[] {
    return Array.from(this.trees.values());
  }

  deleteTree(id: string): boolean {
    const tree = this.trees.get(id);
    if (!tree) return false;
    this.trees.delete(id);
    this.runtimes.delete(id);
    if (this.currentTreeId === id) {
      this.currentTreeId = null;
    }
    globalEventBus.emit('behavior-tree:tree-deleted', { treeId: id });
    return true;
  }

  updateTree(
    id: string,
    updates: Partial<Omit<BehaviorTree, 'id' | 'createdAt'>>
  ): BehaviorTree | undefined {
    const tree = this.trees.get(id);
    if (!tree) return undefined;
    const updated: BehaviorTree = {
      ...tree,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.trees.set(id, updated);
    globalEventBus.emit('behavior-tree:tree-updated', { tree: updated });
    return updated;
  }

  setCurrentTree(treeId: string | null): void {
    this.currentTreeId = treeId;
    globalEventBus.emit('behavior-tree:current-tree-changed', { treeId });
  }

  getCurrentTree(): BehaviorTree | undefined {
    if (!this.currentTreeId) return undefined;
    return this.trees.get(this.currentTreeId);
  }

  addNode(
    treeId: string,
    type: string,
    position: { x: number; y: number }
  ): BehaviorTreeNode | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    const definition = this.getNodeTypeDefinition(type);
    if (!definition) return undefined;

    this.nodeIdCounter++;
    const nodeId = `node-${this.nodeIdCounter}`;

    const node: BehaviorTreeNode = {
      id: nodeId,
      type: definition.type,
      category: definition.category,
      name: definition.name,
      description: definition.description,
      children: [],
      properties: { ...definition.defaultProperties },
      position,
    };

    tree.nodes.set(nodeId, node);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:node-added', { treeId, node });
    return node;
  }

  removeNode(treeId: string, nodeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const node = tree.nodes.get(nodeId);
    if (!node) return false;

    this.removeNodeRecursive(tree, nodeId);

    if (tree.rootNodeId === nodeId) {
      tree.rootNodeId = null;
    }

    for (const [, n] of tree.nodes) {
      n.children = n.children.filter((c) => c !== nodeId);
    }

    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:node-removed', { treeId, nodeId });
    return true;
  }

  private removeNodeRecursive(tree: BehaviorTree, nodeId: string): void {
    const node = tree.nodes.get(nodeId);
    if (!node) return;

    for (const childId of node.children) {
      this.removeNodeRecursive(tree, childId);
    }

    tree.nodes.delete(nodeId);
  }

  updateNode(
    treeId: string,
    nodeId: string,
    updates: Partial<BehaviorTreeNode>
  ): BehaviorTreeNode | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    const node = tree.nodes.get(nodeId);
    if (!node) return undefined;

    Object.assign(node, updates);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:node-updated', { treeId, node });
    return node;
  }

  moveNode(treeId: string, nodeId: string, position: { x: number; y: number }): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const node = tree.nodes.get(nodeId);
    if (!node) return false;

    node.position = position;
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:node-moved', { treeId, nodeId, position });
    return true;
  }

  setRootNode(treeId: string, nodeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    if (!tree.nodes.has(nodeId)) return false;

    tree.rootNodeId = nodeId;
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:root-changed', { treeId, rootNodeId: nodeId });
    return true;
  }

  addChild(treeId: string, parentId: string, childId: string, index?: number): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const parent = tree.nodes.get(parentId);
    const child = tree.nodes.get(childId);
    if (!parent || !child) return false;

    const definition = this.getNodeTypeDefinition(parent.type);
    if (!definition) return false;

    if (definition.maxChildren !== -1 && parent.children.length >= definition.maxChildren) {
      return false;
    }

    if (this.wouldCreateCycle(tree, parentId, childId)) {
      return false;
    }

    if (index !== undefined && index >= 0 && index <= parent.children.length) {
      parent.children.splice(index, 0, childId);
    } else {
      parent.children.push(childId);
    }

    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:child-added', { treeId, parentId, childId });
    return true;
  }

  private wouldCreateCycle(tree: BehaviorTree, parentId: string, childId: string): boolean {
    const visited = new Set<string>();
    const stack = [childId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === parentId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = tree.nodes.get(current);
      if (node) {
        stack.push(...node.children);
      }
    }

    return false;
  }

  removeChild(treeId: string, parentId: string, childId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const parent = tree.nodes.get(parentId);
    if (!parent) return false;

    const index = parent.children.indexOf(childId);
    if (index === -1) return false;

    parent.children.splice(index, 1);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:child-removed', { treeId, parentId, childId });
    return true;
  }

  addBlackboardEntry(
    treeId: string,
    entry: Omit<BlackboardEntry, 'key'> & { key: string }
  ): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const exists = tree.blackboard.find((e) => e.key === entry.key);
    if (exists) return false;

    tree.blackboard.push(entry);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:blackboard-added', { treeId, entry });
    return true;
  }

  updateBlackboardEntry(treeId: string, key: string, updates: Partial<BlackboardEntry>): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const entry = tree.blackboard.find((e) => e.key === key);
    if (!entry) return false;

    Object.assign(entry, updates);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:blackboard-updated', { treeId, key });
    return true;
  }

  removeBlackboardEntry(treeId: string, key: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const index = tree.blackboard.findIndex((e) => e.key === key);
    if (index === -1) return false;

    tree.blackboard.splice(index, 1);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('behavior-tree:blackboard-removed', { treeId, key });
    return true;
  }

  getBlackboard(treeId: string): BlackboardEntry[] {
    const tree = this.trees.get(treeId);
    if (!tree) return [];
    return tree.blackboard;
  }

  startTree(treeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree || !tree.rootNodeId) return false;

    const blackboard = new Map<string, unknown>();
    for (const entry of tree.blackboard) {
      blackboard.set(entry.key, entry.value);
    }

    const runtime: BehaviorTreeRuntime = {
      treeId,
      currentNodeId: tree.rootNodeId,
      status: 'running',
      nodeStatuses: new Map(),
      blackboard,
      isRunning: true,
      stepCount: 0,
    };

    this.runtimes.set(treeId, runtime);
    globalEventBus.emit('behavior-tree:tree-started', { treeId });
    return true;
  }

  stopTree(treeId: string): boolean {
    const runtime = this.runtimes.get(treeId);
    if (!runtime) return false;

    runtime.isRunning = false;
    runtime.status = 'failure';
    globalEventBus.emit('behavior-tree:tree-stopped', { treeId });
    return true;
  }

  stepTree(treeId: string): NodeStatus | undefined {
    const runtime = this.runtimes.get(treeId);
    const tree = this.trees.get(treeId);
    if (!runtime || !tree || !runtime.isRunning) return undefined;

    runtime.stepCount++;

    if (tree.rootNodeId) {
      runtime.status = this.executeNode(tree, runtime, tree.rootNodeId);
    }

    globalEventBus.emit('behavior-tree:tree-stepped', {
      treeId,
      status: runtime.status,
      stepCount: runtime.stepCount,
    });

    return runtime.status;
  }

  private executeNode(
    tree: BehaviorTree,
    runtime: BehaviorTreeRuntime,
    nodeId: string
  ): NodeStatus {
    const node = tree.nodes.get(nodeId);
    if (!node) return 'failure';

    runtime.currentNodeId = nodeId;
    let status: NodeStatus;

    switch (node.category) {
      case 'composite':
        status = this.executeComposite(tree, runtime, node);
        break;
      case 'decorator':
        status = this.executeDecorator(tree, runtime, node);
        break;
      case 'condition':
        status = this.executeCondition(tree, runtime, node);
        break;
      case 'action':
        status = this.executeAction(tree, runtime, node);
        break;
      default:
        status = 'failure';
    }

    runtime.nodeStatuses.set(nodeId, status);
    return status;
  }

  private executeComposite(
    tree: BehaviorTree,
    runtime: BehaviorTreeRuntime,
    node: BehaviorTreeNode
  ): NodeStatus {
    switch (node.type) {
      case 'selector':
        for (const childId of node.children) {
          const status = this.executeNode(tree, runtime, childId);
          if (status === 'success') return 'success';
          if (status === 'running') return 'running';
        }
        return 'failure';

      case 'sequence':
        for (const childId of node.children) {
          const status = this.executeNode(tree, runtime, childId);
          if (status === 'failure') return 'failure';
          if (status === 'running') return 'running';
        }
        return 'success';

      case 'parallel':
        const { successPolicy, failurePolicy } = node.properties;
        let successCount = 0;
        let failureCount = 0;
        let runningCount = 0;

        for (const childId of node.children) {
          const status = this.executeNode(tree, runtime, childId);
          if (status === 'success') successCount++;
          else if (status === 'failure') failureCount++;
          else runningCount++;
        }

        if (failurePolicy === 'one' && failureCount > 0) return 'failure';
        if (successPolicy === 'one' && successCount > 0) return 'success';
        if (runningCount > 0) return 'running';
        return successCount > 0 ? 'success' : 'failure';

      default:
        return 'failure';
    }
  }

  private executeDecorator(
    tree: BehaviorTree,
    runtime: BehaviorTreeRuntime,
    node: BehaviorTreeNode
  ): NodeStatus {
    const childId = node.children[0];
    if (!childId) return 'failure';

    switch (node.type) {
      case 'inverter':
        const status = this.executeNode(tree, runtime, childId);
        if (status === 'running') return 'running';
        return status === 'success' ? 'failure' : 'success';

      case 'repeater':
        const count = node.properties.count as number;
        let repeatSuccess = true;
        for (let i = 0; i < count; i++) {
          const s = this.executeNode(tree, runtime, childId);
          if (s === 'running') return 'running';
          if (s === 'failure' && !node.properties.repeatOnFailure) {
            repeatSuccess = false;
            break;
          }
        }
        return repeatSuccess ? 'success' : 'failure';

      case 'until_success':
        const maxAttempts = node.properties.maxAttempts as number;
        for (let i = 0; i < maxAttempts; i++) {
          const s = this.executeNode(tree, runtime, childId);
          if (s === 'running') return 'running';
          if (s === 'success') return 'success';
        }
        return 'failure';

      case 'delay':
        return this.executeNode(tree, runtime, childId);

      default:
        return 'failure';
    }
  }

  private executeCondition(
    _tree: BehaviorTree,
    runtime: BehaviorTreeRuntime,
    node: BehaviorTreeNode
  ): NodeStatus {
    switch (node.type) {
      case 'check_variable':
        const { key, operator, value } = node.properties;
        const actual = runtime.blackboard.get(key as string);
        let result = false;

        switch (operator) {
          case '===':
            result = actual === value;
            break;
          case '!==':
            result = actual !== value;
            break;
          case '>':
            result = (actual as number) > (value as number);
            break;
          case '<':
            result = (actual as number) < (value as number);
            break;
          case '>=':
            result = (actual as number) >= (value as number);
            break;
          case '<=':
            result = (actual as number) <= (value as number);
            break;
        }

        return result ? 'success' : 'failure';

      case 'distance_check':
      case 'cooldown':
        return 'success';

      default:
        return 'failure';
    }
  }

  private executeAction(
    _tree: BehaviorTree,
    _runtime: BehaviorTreeRuntime,
    _node: BehaviorTreeNode
  ): NodeStatus {
    return 'success';
  }

  getRuntime(treeId: string): BehaviorTreeRuntime | undefined {
    return this.runtimes.get(treeId);
  }

  getNodeStatus(treeId: string, nodeId: string): NodeStatus | undefined {
    const runtime = this.runtimes.get(treeId);
    if (!runtime) return undefined;
    return runtime.nodeStatuses.get(nodeId);
  }

  setBlackboardValue(treeId: string, key: string, value: unknown): boolean {
    const runtime = this.runtimes.get(treeId);
    if (!runtime) return false;
    runtime.blackboard.set(key, value);
    globalEventBus.emit('behavior-tree:blackboard-value-changed', { treeId, key, value });
    return true;
  }

  getBlackboardValue(treeId: string, key: string): unknown {
    const runtime = this.runtimes.get(treeId);
    if (!runtime) return undefined;
    return runtime.blackboard.get(key);
  }

  serializeTree(treeId: string): string | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    const plainTree = {
      ...tree,
      nodes: Object.fromEntries(tree.nodes),
    };

    return JSON.stringify(plainTree, null, 2);
  }

  deserializeTree(json: string): BehaviorTree | undefined {
    try {
      const data = JSON.parse(json);
      const nodes = new Map<string, BehaviorTreeNode>(Object.entries(data.nodes));

      const tree: BehaviorTree = {
        ...data,
        nodes,
      };

      this.trees.set(tree.id, tree);
      globalEventBus.emit('behavior-tree:tree-created', { tree });
      return tree;
    } catch (error) {
      globalEventBus.emit('behavior-tree:deserialize-error', { error });
      return undefined;
    }
  }

  validateTree(
    treeId: string
  ): { type: string; severity: 'error' | 'warning'; message: string; nodeId?: string }[] {
    const tree = this.trees.get(treeId);
    if (!tree) return [];

    const warnings: {
      type: string;
      severity: 'error' | 'warning';
      message: string;
      nodeId?: string;
    }[] = [];

    if (!tree.rootNodeId) {
      warnings.push({
        type: 'missing_root',
        severity: 'error',
        message: '行为树缺少根节点',
      });
    }

    for (const [nodeId, node] of tree.nodes) {
      const definition = this.getNodeTypeDefinition(node.type);
      if (!definition) {
        warnings.push({
          type: 'unknown_type',
          severity: 'error',
          message: `未知的节点类型: ${node.type}`,
          nodeId,
        });
        continue;
      }

      if (definition.maxChildren === 0 && node.children.length > 0) {
        warnings.push({
          type: 'unexpected_children',
          severity: 'warning',
          message: `节点 "${node.name}" 不应有子节点`,
          nodeId,
        });
      }

      if (
        definition.maxChildren === 1 &&
        node.children.length === 0 &&
        definition.category === 'decorator'
      ) {
        warnings.push({
          type: 'missing_child',
          severity: 'warning',
          message: `装饰节点 "${node.name}" 需要一个子节点`,
          nodeId,
        });
      }
    }

    return warnings;
  }
}

export const behaviorTreeService = new BehaviorTreeService();
