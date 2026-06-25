import { globalEventBus } from './event-bus';

export type DialogueNodeType = 'start' | 'dialogue' | 'choice' | 'condition' | 'end';
export type DialogueConditionType = 'variable' | 'flag' | 'random';
export type ChoiceEffectType = 'set_variable' | 'set_flag' | 'add_item' | 'remove_item';

export interface DialogueCharacter {
  id: string;
  name: string;
  displayName: string;
  avatar?: string;
  color: string;
  description?: string;
  expressions: string[];
  defaultExpression: string;
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextNodeId: string | null;
  condition?: DialogueCondition;
  effects?: ChoiceEffect[];
  isHidden?: boolean;
}

export interface DialogueCondition {
  type: DialogueConditionType;
  key: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: unknown;
}

export interface ChoiceEffect {
  type: ChoiceEffectType;
  key: string;
  value: unknown;
}

export interface DialogueVariable {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
  defaultValue: unknown;
  description?: string;
}

export interface DialogueNode {
  id: string;
  type: DialogueNodeType;
  position: { x: number; y: number };
  characterId?: string;
  expression?: string;
  text?: string;
  choices?: DialogueChoice[];
  condition?: DialogueCondition;
  nextNodeId?: string | null;
  trueNextNodeId?: string | null;
  falseNextNodeId?: string | null;
  isEnding?: boolean;
  endingType?: 'good' | 'bad' | 'neutral';
}

export interface DialogueTree {
  id: string;
  name: string;
  description?: string;
  startNodeId: string | null;
  nodes: Map<string, DialogueNode>;
  characters: DialogueCharacter[];
  variables: DialogueVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface DialogueRuntime {
  treeId: string;
  currentNodeId: string | null;
  history: string[];
  variables: Map<string, unknown>;
  flags: Set<string>;
  isFinished: boolean;
  endingType?: 'good' | 'bad' | 'neutral';
}

export interface DialoguePreviewState {
  currentNode: DialogueNode | null;
  character: DialogueCharacter | null;
  text: string;
  choices: DialogueChoice[];
  canContinue: boolean;
}

const PRESET_CHARACTERS: DialogueCharacter[] = [
  {
    id: 'char-hero',
    name: 'hero',
    displayName: '艾伦',
    color: '#3B82F6',
    description: '游戏的主角，勇敢的年轻战士',
    expressions: ['normal', 'happy', 'sad', 'angry', 'surprised', 'determined'],
    defaultExpression: 'normal',
  },
  {
    id: 'char-mage',
    name: 'mage',
    displayName: '莉娜',
    color: '#8B5CF6',
    description: '魔法学院的天才少女',
    expressions: ['normal', 'happy', 'proud', 'shy', 'thinking', 'surprised'],
    defaultExpression: 'normal',
  },
  {
    id: 'char-villain',
    name: 'villain',
    displayName: '暗影魔王',
    color: '#EF4444',
    description: '千年之前被封印的黑暗君主',
    expressions: ['normal', 'angry', 'smug', 'laughing', 'serious'],
    defaultExpression: 'normal',
  },
  {
    id: 'char-npc',
    name: 'elder',
    displayName: '村长',
    color: '#F59E0B',
    description: '村庄的老村长，和蔼可亲',
    expressions: ['normal', 'happy', 'sad', 'worried', 'wise'],
    defaultExpression: 'normal',
  },
];

const PRESET_VARIABLES: DialogueVariable[] = [
  { id: 'var-affection-lina', name: '莉娜好感度', type: 'number', defaultValue: 0, description: '与莉娜的好感度' },
  { id: 'var-quest-progress', name: '任务进度', type: 'number', defaultValue: 0, description: '当前任务的进度' },
  { id: 'var-has-sword', name: '获得神剑', type: 'boolean', defaultValue: false, description: '是否获得了传说之剑' },
  { id: 'var-player-name', name: '玩家名字', type: 'string', defaultValue: '', description: '玩家输入的名字' },
];

export class DialogueEditorService {
  private trees: Map<string, DialogueTree> = new Map();
  private currentTreeId: string | null = null;
  private nodeIdCounter = 0;
  private choiceIdCounter = 0;
  private variableIdCounter = 0;
  private runtime: DialogueRuntime | null = null;

  constructor() {
    this.loadPresetTrees();
  }

  private loadPresetTrees(): void {
    const nodes = new Map<string, DialogueNode>();

    nodes.set('node-start', {
      id: 'node-start',
      type: 'start',
      position: { x: 300, y: 50 },
      nextNodeId: 'node-intro',
    });

    nodes.set('node-intro', {
      id: 'node-intro',
      type: 'dialogue',
      position: { x: 300, y: 150 },
      characterId: 'char-npc',
      expression: 'normal',
      text: '年轻的勇者啊，你终于来了。我们的村庄正面临着巨大的危机...',
      nextNodeId: 'node-choice-1',
    });

    nodes.set('node-choice-1', {
      id: 'node-choice-1',
      type: 'choice',
      position: { x: 300, y: 280 },
      choices: [
        {
          id: 'choice-1',
          text: '请告诉我发生了什么事？',
          nextNodeId: 'node-explain',
        },
        {
          id: 'choice-2',
          text: '我没空，先走了。',
          nextNodeId: 'node-leave',
        },
      ],
    });

    nodes.set('node-explain', {
      id: 'node-explain',
      type: 'dialogue',
      position: { x: 100, y: 400 },
      characterId: 'char-npc',
      expression: 'sad',
      text: '在黑暗森林的深处，封印正在逐渐减弱。暗影魔王即将苏醒...只有传说中的勇者才能阻止他。',
      nextNodeId: 'node-accept',
    });

    nodes.set('node-accept', {
      id: 'node-accept',
      type: 'choice',
      position: { x: 100, y: 530 },
      choices: [
        {
          id: 'choice-3',
          text: '我接受这个使命！',
          nextNodeId: 'node-good-ending',
          effects: [{ type: 'set_variable', key: 'var-quest-progress', value: 1 }],
        },
        {
          id: 'choice-4',
          text: '让我再考虑考虑...',
          nextNodeId: 'node-intro',
        },
      ],
    });

    nodes.set('node-leave', {
      id: 'node-leave',
      type: 'dialogue',
      position: { x: 500, y: 400 },
      characterId: 'char-npc',
      expression: 'worried',
      text: '唉...希望你能改变主意。村庄的命运就掌握在你手中了...',
      nextNodeId: 'node-bad-ending',
    });

    nodes.set('node-good-ending', {
      id: 'node-good-ending',
      type: 'end',
      position: { x: 100, y: 660 },
      isEnding: true,
      endingType: 'good',
      text: '勇者踏上了冒险的旅程，第一章结束。',
    });

    nodes.set('node-bad-ending', {
      id: 'node-bad-ending',
      type: 'end',
      position: { x: 500, y: 530 },
      isEnding: true,
      endingType: 'bad',
      text: '勇者离开了村庄，暗影魔王最终复活，世界陷入黑暗...',
    });

    const presetTree: DialogueTree = {
      id: 'preset-intro',
      name: '序章 - 命运的开始',
      description: '游戏开场的对话，介绍背景故事和第一个选择',
      startNodeId: 'node-start',
      nodes,
      characters: [...PRESET_CHARACTERS],
      variables: [...PRESET_VARIABLES],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.trees.set(presetTree.id, presetTree);
  }

  createTree(name: string, description?: string): DialogueTree {
    const id = `dialogue-${Date.now()}`;
    const now = new Date().toISOString();

    const tree: DialogueTree = {
      id,
      name,
      description,
      startNodeId: null,
      nodes: new Map(),
      characters: [],
      variables: [],
      createdAt: now,
      updatedAt: now,
    };

    this.trees.set(id, tree);
    globalEventBus.emit('dialogue-editor:tree-created', { tree });
    return tree;
  }

  getTree(id: string): DialogueTree | undefined {
    return this.trees.get(id);
  }

  getAllTrees(): DialogueTree[] {
    return Array.from(this.trees.values());
  }

  deleteTree(id: string): boolean {
    const tree = this.trees.get(id);
    if (!tree) return false;
    this.trees.delete(id);
    if (this.currentTreeId === id) {
      this.currentTreeId = null;
    }
    globalEventBus.emit('dialogue-editor:tree-deleted', { treeId: id });
    return true;
  }

  updateTree(id: string, updates: Partial<Omit<DialogueTree, 'id' | 'createdAt'>>): DialogueTree | undefined {
    const tree = this.trees.get(id);
    if (!tree) return undefined;
    const updated: DialogueTree = {
      ...tree,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.trees.set(id, updated);
    globalEventBus.emit('dialogue-editor:tree-updated', { tree: updated });
    return updated;
  }

  setCurrentTree(treeId: string | null): void {
    this.currentTreeId = treeId;
    globalEventBus.emit('dialogue-editor:current-tree-changed', { treeId });
  }

  getCurrentTree(): DialogueTree | undefined {
    if (!this.currentTreeId) return undefined;
    return this.trees.get(this.currentTreeId);
  }

  addNode(treeId: string, type: DialogueNodeType, position: { x: number; y: number }): DialogueNode | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    this.nodeIdCounter++;
    const nodeId = `node-${this.nodeIdCounter}`;

    const node: DialogueNode = {
      id: nodeId,
      type,
      position,
      nextNodeId: null,
    };

    if (type === 'choice') {
      node.choices = [];
    }

    tree.nodes.set(nodeId, node);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:node-added', { treeId, node });
    return node;
  }

  removeNode(treeId: string, nodeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const node = tree.nodes.get(nodeId);
    if (!node) return false;

    tree.nodes.delete(nodeId);

    for (const [, n] of tree.nodes) {
      if (n.nextNodeId === nodeId) {
        n.nextNodeId = null;
      }
      if (n.trueNextNodeId === nodeId) {
        n.trueNextNodeId = null;
      }
      if (n.falseNextNodeId === nodeId) {
        n.falseNextNodeId = null;
      }
      if (n.choices) {
        for (const choice of n.choices) {
          if (choice.nextNodeId === nodeId) {
            choice.nextNodeId = null;
          }
        }
      }
    }

    if (tree.startNodeId === nodeId) {
      tree.startNodeId = null;
    }

    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:node-removed', { treeId, nodeId });
    return true;
  }

  updateNode(treeId: string, nodeId: string, updates: Partial<DialogueNode>): DialogueNode | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    const node = tree.nodes.get(nodeId);
    if (!node) return undefined;

    Object.assign(node, updates);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:node-updated', { treeId, node });
    return node;
  }

  moveNode(treeId: string, nodeId: string, position: { x: number; y: number }): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const node = tree.nodes.get(nodeId);
    if (!node) return false;

    node.position = position;
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:node-moved', { treeId, nodeId, position });
    return true;
  }

  setStartNode(treeId: string, nodeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const node = tree.nodes.get(nodeId);
    if (!node || node.type !== 'start') return false;

    tree.startNodeId = nodeId;
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:start-node-changed', { treeId, nodeId });
    return true;
  }

  addChoice(treeId: string, nodeId: string, text: string): DialogueChoice | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    const node = tree.nodes.get(nodeId);
    if (!node || node.type !== 'choice') return undefined;

    if (!node.choices) {
      node.choices = [];
    }

    this.choiceIdCounter++;
    const choice: DialogueChoice = {
      id: `choice-${this.choiceIdCounter}`,
      text,
      nextNodeId: null,
    };

    node.choices.push(choice);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:choice-added', { treeId, nodeId, choice });
    return choice;
  }

  removeChoice(treeId: string, nodeId: string, choiceId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const node = tree.nodes.get(nodeId);
    if (!node || !node.choices) return false;

    const index = node.choices.findIndex((c) => c.id === choiceId);
    if (index === -1) return false;

    node.choices.splice(index, 1);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:choice-removed', { treeId, nodeId, choiceId });
    return true;
  }

  updateChoice(treeId: string, nodeId: string, choiceId: string, updates: Partial<DialogueChoice>): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const node = tree.nodes.get(nodeId);
    if (!node || !node.choices) return false;

    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) return false;

    Object.assign(choice, updates);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:choice-updated', { treeId, nodeId, choiceId });
    return true;
  }

  addCharacter(treeId: string, character: Omit<DialogueCharacter, 'id'>): DialogueCharacter | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    const id = `char-${Date.now()}`;
    const newChar: DialogueCharacter = {
      ...character,
      id,
    };

    tree.characters.push(newChar);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:character-added', { treeId, character: newChar });
    return newChar;
  }

  removeCharacter(treeId: string, characterId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const index = tree.characters.findIndex((c) => c.id === characterId);
    if (index === -1) return false;

    tree.characters.splice(index, 1);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:character-removed', { treeId, characterId });
    return true;
  }

  updateCharacter(treeId: string, characterId: string, updates: Partial<DialogueCharacter>): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const character = tree.characters.find((c) => c.id === characterId);
    if (!character) return false;

    Object.assign(character, updates);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:character-updated', { treeId, characterId });
    return true;
  }

  getCharacters(treeId: string): DialogueCharacter[] {
    const tree = this.trees.get(treeId);
    if (!tree) return [];
    return tree.characters;
  }

  addVariable(treeId: string, variable: Omit<DialogueVariable, 'id'>): DialogueVariable | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    this.variableIdCounter++;
    const newVar: DialogueVariable = {
      ...variable,
      id: `var-${this.variableIdCounter}`,
    };

    tree.variables.push(newVar);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:variable-added', { treeId, variable: newVar });
    return newVar;
  }

  removeVariable(treeId: string, variableId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const index = tree.variables.findIndex((v) => v.id === variableId);
    if (index === -1) return false;

    tree.variables.splice(index, 1);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:variable-removed', { treeId, variableId });
    return true;
  }

  updateVariable(treeId: string, variableId: string, updates: Partial<DialogueVariable>): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;

    const variable = tree.variables.find((v) => v.id === variableId);
    if (!variable) return false;

    Object.assign(variable, updates);
    tree.updatedAt = new Date().toISOString();
    globalEventBus.emit('dialogue-editor:variable-updated', { treeId, variableId });
    return true;
  }

  getVariables(treeId: string): DialogueVariable[] {
    const tree = this.trees.get(treeId);
    if (!tree) return [];
    return tree.variables;
  }

  startPreview(treeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree || !tree.startNodeId) return false;

    const variables = new Map<string, unknown>();
    for (const v of tree.variables) {
      variables.set(v.name, v.defaultValue);
    }

    this.runtime = {
      treeId,
      currentNodeId: tree.startNodeId,
      history: [tree.startNodeId],
      variables,
      flags: new Set(),
      isFinished: false,
    };

    globalEventBus.emit('dialogue-editor:preview-started', { treeId });
    return true;
  }

  stopPreview(): void {
    this.runtime = null;
    globalEventBus.emit('dialogue-editor:preview-stopped', {});
  }

  getPreviewState(): DialoguePreviewState | null {
    if (!this.runtime) return null;

    const tree = this.trees.get(this.runtime.treeId);
    if (!tree) return null;

    const node = this.runtime.currentNodeId
      ? tree.nodes.get(this.runtime.currentNodeId)
      : null;
    if (!node) return null;

    const character = node.characterId
      ? tree.characters.find((c) => c.id === node.characterId) || null
      : null;

    const choices = this.getAvailableChoices(node);
    const canContinue = this.canContinue(node);

    return {
      currentNode: node,
      character,
      text: node.text || '',
      choices,
      canContinue,
    };
  }

  private getAvailableChoices(node: DialogueNode): DialogueChoice[] {
    if (!node.choices || !this.runtime) return [];
    return node.choices.filter((choice) => {
      if (choice.isHidden) return false;
      if (choice.condition) {
        return this.checkCondition(choice.condition);
      }
      return true;
    });
  }

  private checkCondition(condition: DialogueCondition): boolean {
    if (!this.runtime) return false;

    const { type, key, operator, value } = condition;

    if (type === 'variable') {
      const actual = this.runtime.variables.get(key);
      switch (operator) {
        case '==':
          return actual == value;
        case '!=':
          return actual != value;
        case '>':
          return (actual as number) > (value as number);
        case '<':
          return (actual as number) < (value as number);
        case '>=':
          return (actual as number) >= (value as number);
        case '<=':
          return (actual as number) <= (value as number);
        default:
          return actual === value;
      }
    }

    if (type === 'flag') {
      return this.runtime.flags.has(key) === (value as boolean);
    }

    if (type === 'random') {
      return Math.random() < (value as number);
    }

    return false;
  }

  private canContinue(node: DialogueNode): boolean {
    if (node.type === 'end') return false;
    if (node.type === 'choice') return false;
    if (node.type === 'condition') return false;
    return node.nextNodeId !== null && node.nextNodeId !== undefined;
  }

  advanceDialogue(): boolean {
    if (!this.runtime) return false;

    const tree = this.trees.get(this.runtime.treeId);
    if (!tree) return false;

    const currentNode = this.runtime.currentNodeId
      ? tree.nodes.get(this.runtime.currentNodeId)
      : null;
    if (!currentNode) return false;

    let nextNodeId: string | null | undefined = null;

    if (currentNode.type === 'condition' && currentNode.condition) {
      const result = this.checkCondition(currentNode.condition);
      nextNodeId = result ? currentNode.trueNextNodeId : currentNode.falseNextNodeId;
    } else {
      nextNodeId = currentNode.nextNodeId;
    }

    if (!nextNodeId) return false;

    const nextNode = tree.nodes.get(nextNodeId);
    if (!nextNode) return false;

    this.runtime.currentNodeId = nextNodeId;
    this.runtime.history.push(nextNodeId);

    if (nextNode.type === 'end') {
      this.runtime.isFinished = true;
      this.runtime.endingType = nextNode.endingType;
    }

    globalEventBus.emit('dialogue-editor:dialogue-advanced', { nextNodeId });
    return true;
  }

  selectChoice(choiceId: string): boolean {
    if (!this.runtime) return false;

    const tree = this.trees.get(this.runtime.treeId);
    if (!tree) return false;

    const currentNode = this.runtime.currentNodeId
      ? tree.nodes.get(this.runtime.currentNodeId)
      : null;
    if (!currentNode || currentNode.type !== 'choice' || !currentNode.choices) return false;

    const choice = currentNode.choices.find((c) => c.id === choiceId);
    if (!choice) return false;

    if (choice.effects) {
      for (const effect of choice.effects) {
        this.applyEffect(effect);
      }
    }

    if (!choice.nextNodeId) return false;

    const nextNode = tree.nodes.get(choice.nextNodeId);
    if (!nextNode) return false;

    this.runtime.currentNodeId = choice.nextNodeId;
    this.runtime.history.push(choice.nextNodeId);

    if (nextNode.type === 'end') {
      this.runtime.isFinished = true;
      this.runtime.endingType = nextNode.endingType;
    }

    globalEventBus.emit('dialogue-editor:choice-selected', { choiceId, nextNodeId: choice.nextNodeId });
    return true;
  }

  private applyEffect(effect: ChoiceEffect): void {
    if (!this.runtime) return;

    switch (effect.type) {
      case 'set_variable':
        this.runtime.variables.set(effect.key, effect.value);
        break;
      case 'set_flag':
        if (effect.value) {
          this.runtime.flags.add(effect.key);
        } else {
          this.runtime.flags.delete(effect.key);
        }
        break;
    }
  }

  getRuntime(): DialogueRuntime | null {
    return this.runtime;
  }

  getVariableValue(name: string): unknown {
    if (!this.runtime) return undefined;
    return this.runtime.variables.get(name);
  }

  setVariableValue(name: string, value: unknown): boolean {
    if (!this.runtime) return false;
    this.runtime.variables.set(name, value);
    globalEventBus.emit('dialogue-editor:variable-changed', { name, value });
    return true;
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

  deserializeTree(json: string): DialogueTree | undefined {
    try {
      const data = JSON.parse(json);
      const nodes = new Map<string, DialogueNode>(Object.entries(data.nodes));

      const tree: DialogueTree = {
        ...data,
        nodes,
      };

      this.trees.set(tree.id, tree);
      globalEventBus.emit('dialogue-editor:tree-created', { tree });
      return tree;
    } catch (error) {
      globalEventBus.emit('dialogue-editor:deserialize-error', { error });
      return undefined;
    }
  }

  exportToJSON(treeId: string): Record<string, unknown> | undefined {
    const tree = this.trees.get(treeId);
    if (!tree) return undefined;

    const nodes: Record<string, unknown>[] = [];
    for (const [, node] of tree.nodes) {
      nodes.push({ ...node });
    }

    return {
      version: '1.0',
      type: 'dialogue-tree',
      name: tree.name,
      description: tree.description,
      startNodeId: tree.startNodeId,
      characters: tree.characters,
      variables: tree.variables,
      nodes,
    };
  }

  validateTree(treeId: string): { type: string; severity: 'error' | 'warning'; message: string; nodeId?: string }[] {
    const tree = this.trees.get(treeId);
    if (!tree) return [];

    const warnings: { type: string; severity: 'error' | 'warning'; message: string; nodeId?: string }[] = [];

    if (!tree.startNodeId) {
      warnings.push({
        type: 'missing_start',
        severity: 'error',
        message: '对话树缺少开始节点',
      });
    }

    const startNodes: string[] = [];
    const endNodes: string[] = [];

    for (const [nodeId, node] of tree.nodes) {
      if (node.type === 'start') {
        startNodes.push(nodeId);
      }
      if (node.type === 'end') {
        endNodes.push(nodeId);
      }

      if (node.type === 'dialogue' && !node.text) {
        warnings.push({
          type: 'empty_text',
          severity: 'warning',
          message: `对话节点 "${node.id}" 没有文本内容`,
          nodeId,
        });
      }

      if (node.type === 'choice' && (!node.choices || node.choices.length === 0)) {
        warnings.push({
          type: 'no_choices',
          severity: 'warning',
          message: `选择节点 "${node.id}" 没有选项`,
          nodeId,
        });
      }

      if (node.type === 'dialogue' && !node.nextNodeId) {
        warnings.push({
          type: 'no_next',
          severity: 'warning',
          message: `对话节点 "${node.id}" 没有下一个节点`,
          nodeId,
        });
      }
    }

    if (startNodes.length === 0) {
      warnings.push({
        type: 'no_start_node',
        severity: 'error',
        message: '没有找到开始节点类型的节点',
      });
    }

    if (endNodes.length === 0) {
      warnings.push({
        type: 'no_end_node',
        severity: 'warning',
        message: '没有结束节点，对话可能无法正常结束',
      });
    }

    return warnings;
  }

  getDialogueStats(treeId: string): {
    totalNodes: number;
    dialogueNodes: number;
    choiceNodes: number;
    conditionNodes: number;
    endNodes: number;
    characters: number;
    variables: number;
    endings: { good: number; bad: number; neutral: number };
  } | null {
    const tree = this.trees.get(treeId);
    if (!tree) return null;

    let dialogueNodes = 0;
    let choiceNodes = 0;
    let conditionNodes = 0;
    let endNodes = 0;
    const endings = { good: 0, bad: 0, neutral: 0 };

    for (const [, node] of tree.nodes) {
      switch (node.type) {
        case 'dialogue':
          dialogueNodes++;
          break;
        case 'choice':
          choiceNodes++;
          break;
        case 'condition':
          conditionNodes++;
          break;
        case 'end':
          endNodes++;
          if (node.endingType) {
            endings[node.endingType]++;
          } else {
            endings.neutral++;
          }
          break;
      }
    }

    return {
      totalNodes: tree.nodes.size,
      dialogueNodes,
      choiceNodes,
      conditionNodes,
      endNodes,
      characters: tree.characters.length,
      variables: tree.variables.length,
      endings,
    };
  }
}

export const dialogueEditorService = new DialogueEditorService();
