// Game Genre types
export type GameGenre = 'rpg' | 'casual' | 'strategy' | 'action' | 'puzzle';

// Game Design types
export interface GameConcept {
  title: string;
  genre: GameGenre;
  tagline: string;
  description: string;
  coreGameplay: string[];
  uniqueSellingPoints: string[];
  targetAudience: string;
  estimatedPlaytime: string;
  artStyle: string;
  mood: string;
}

export interface LevelDesign {
  levelNumber: number;
  name: string;
  description: string;
  layout: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  enemies: EnemyConfig[];
  objectives: string[];
  rewards: string[];
  puzzles: string[];
  secrets: string[];
  boss?: BossConfig;
}

export interface EnemyConfig {
  name: string;
  type: string;
  count: number;
  hp: number;
  damage: number;
  speed: number;
  description: string;
}

export interface BossConfig {
  name: string;
  hp: number;
  damage: number;
  phases: number;
  abilities: string[];
  weakness: string;
  description: string;
}

export interface DifficultyCurve {
  levels: { level: number; difficulty: number }[];
  description: string;
  spikes: number[];
  valleys: number[];
}

// Story types
export interface StoryContent {
  mainPlot: string[];
  characters: Character[];
  dialogues: DialogueLine[];
  quests: Quest[];
  endings: Ending[];
}

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'companion' | 'npc';
  description: string;
  personality: string[];
  background: string;
  motivations: string[];
  appearance: string;
  skills: string[];
}

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  emotion: string;
  context?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'main' | 'side' | 'daily';
  objectives: string[];
  rewards: string[];
  difficulty: string;
}

export interface Ending {
  id: string;
  name: string;
  description: string;
  condition: string;
  type: 'good' | 'bad' | 'neutral' | 'hidden';
}

// Character Stats types
export interface CharacterStats {
  name: string;
  class: string;
  baseStats: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
    magic: number;
  };
  growthRates: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
    magic: number;
  };
  skills: Skill[];
}

export interface Skill {
  name: string;
  description: string;
  type: 'active' | 'passive';
  cooldown: number;
  damage?: number;
  healing?: number;
  effect?: string;
}

// Economy types
export interface EconomyBalance {
  currency: string;
  startingGold: number;
  goldPerLevel: number;
  itemPriceRange: {
    common: [number, number];
    rare: [number, number];
    epic: [number, number];
    legendary: [number, number];
  };
  experienceCurve: number[];
  levelUpRewards: string[];
}

export interface EquipmentItem {
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stats: Record<string, number>;
  description: string;
  value: number;
}

// Document types
export interface DesignDocument {
  id: string;
  title: string;
  gameTitle: string;
  genre: GameGenre;
  createdAt: string;
  updatedAt: string;
  sections: DocumentSection[];
  revisionHistory: RevisionEntry[];
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface RevisionEntry {
  version: string;
  date: string;
  author: string;
  changes: string[];
}

export interface DesignIteration {
  iteration: number;
  feedback: string;
  changes: string[];
  previousVersion: string;
  currentVersion: string;
}

// Behavior Tree types
export type BehaviorNodeType = 'action' | 'condition' | 'decorator' | 'composite' | 'root';

export interface BehaviorTreeNode {
  id: string;
  type: BehaviorNodeType;
  name: string;
  description?: string;
  children?: BehaviorTreeNode[];
  properties?: Record<string, unknown>;
}

export interface BehaviorTree {
  id: string;
  name: string;
  root: BehaviorTreeNode;
  createdAt: number;
  updatedAt: number;
}

// Animation State Machine types
export interface AnimationState {
  id: string;
  name: string;
  type: 'single' | 'blend' | 'layered';
  animation?: string;
  blendDuration?: number;
  entries?: string[];
  exits?: string[];
}

export interface AnimationTransition {
  id: string;
  from: string;
  to: string;
  condition?: string;
  duration?: number;
}

export interface AnimationStateMachine {
  id: string;
  name: string;
  states: AnimationState[];
  transitions: AnimationTransition[];
  defaultState?: string;
  layerMask?: number;
}

// Tilemap types
export interface TilemapLayer {
  id: string;
  name: string;
  type: 'tile' | 'object' | 'collision';
  data: number[] | object[];
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
}

export interface TilemapTile {
  id: number;
  x: number;
  y: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  properties?: Record<string, unknown>;
}

export interface Tilemap {
  id: string;
  name: string;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: TilemapLayer[];
  tilesets: Tileset[];
}

export interface Tileset {
  id: string;
  name: string;
  firstGid: number;
  tileWidth: number;
  tileHeight: number;
  imageWidth: number;
  imageHeight: number;
  imagePath: string;
  tileCount: number;
  columns: number;
}

// Shader Editor types
export interface ShaderUniform {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'bool' | 'sampler2D';
  value: unknown;
  min?: number;
  max?: number;
}

export interface ShaderPass {
  id: string;
  name: string;
  code: string;
  uniforms: ShaderUniform[];
}

export interface Shader {
  id: string;
  name: string;
  type: 'fragment' | 'vertex' | 'compute';
  passes: ShaderPass[];
  createdAt: number;
  updatedAt: number;
}
