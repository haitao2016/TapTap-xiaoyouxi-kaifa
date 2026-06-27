import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { behaviorTreeService } from '../packages/core/src/behavior-tree-service';
import { animationStateMachineService } from '../packages/core/src/game-dev/animation-state-machine-service';
import { tileMapEditorService } from '../packages/core/src/game-dev/tilemap-editor-service';
import { shaderEditorService } from '../packages/core/src/graphics/shader-editor-service';

describe('Phase 3: Game Dev Tools', () => {
  describe('BehaviorTreeService', () => {
    let testTreeId: string;

    beforeEach(() => {
      const tree = behaviorTreeService.createTree('Test Tree', 'A test behavior tree');
      testTreeId = tree.id;
    });

    it('should create a behavior tree', () => {
      const tree = behaviorTreeService.getTree(testTreeId);
      expect(tree).toBeDefined();
      expect(tree?.name).toBe('Test Tree');
      expect(tree?.nodes.size).toBe(0);
      expect(tree?.rootNodeId).toBeNull();
    });

    it('should have preset templates', () => {
      const templates = behaviorTreeService.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should create tree from template', () => {
      const templates = behaviorTreeService.getTemplates();
      if (templates.length > 0) {
        const tree = behaviorTreeService.createTreeFromTemplate(templates[0].id);
        expect(tree).toBeDefined();
        expect(tree?.nodes.size).toBeGreaterThan(0);
      }
    });

    it('should return undefined for non-existent template', () => {
      const tree = behaviorTreeService.createTreeFromTemplate('nonexistent-template');
      expect(tree).toBeUndefined();
    });

    it('should list all trees', () => {
      const allTrees = behaviorTreeService.getAllTrees();
      expect(allTrees.length).toBeGreaterThanOrEqual(1);
      expect(allTrees.some((t) => t.id === testTreeId)).toBe(true);
    });

    it('should delete a tree', () => {
      const result = behaviorTreeService.deleteTree(testTreeId);
      expect(result).toBe(true);
      expect(behaviorTreeService.getTree(testTreeId)).toBeUndefined();
    });

    it('should return false when deleting non-existent tree', () => {
      const result = behaviorTreeService.deleteTree('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should update tree name and description', () => {
      behaviorTreeService.updateTree(testTreeId, {
        name: 'Updated Tree',
        description: 'Updated description',
      });
      const tree = behaviorTreeService.getTree(testTreeId);
      expect(tree?.name).toBe('Updated Tree');
      expect(tree?.description).toBe('Updated description');
    });

    it('should set current tree', () => {
      behaviorTreeService.setCurrentTree(testTreeId);
      const current = behaviorTreeService.getCurrentTree();
      expect(current?.id).toBe(testTreeId);
    });

    it('should add a node to tree', () => {
      const node = behaviorTreeService.addNode(testTreeId, 'selector', {
        x: 100,
        y: 200,
      });
      expect(node).toBeDefined();
      expect(node?.type).toBe('selector');
      expect(node?.position.x).toBe(100);
      expect(node?.position.y).toBe(200);
      const tree = behaviorTreeService.getTree(testTreeId);
      expect(tree?.nodes.size).toBe(1);
    });

    it('should remove a node from tree', () => {
      const node = behaviorTreeService.addNode(testTreeId, 'sequence', { x: 0, y: 0 });
      if (node) {
        const result = behaviorTreeService.removeNode(testTreeId, node.id);
        expect(result).toBe(true);
        const tree = behaviorTreeService.getTree(testTreeId);
        expect(tree?.nodes.size).toBe(0);
      }
    });

    it('should update node properties', () => {
      const node = behaviorTreeService.addNode(testTreeId, 'repeater', { x: 0, y: 0 });
      if (node) {
        behaviorTreeService.updateNode(testTreeId, node.id, {
          name: 'My Repeater',
          properties: { count: 5 },
        });
        const tree = behaviorTreeService.getTree(testTreeId);
        const updated = tree?.nodes.get(node.id);
        expect(updated?.name).toBe('My Repeater');
        expect(updated?.properties.count).toBe(5);
      }
    });

    it('should move node position', () => {
      const node = behaviorTreeService.addNode(testTreeId, 'selector', { x: 0, y: 0 });
      if (node) {
        behaviorTreeService.moveNode(testTreeId, node.id, { x: 150, y: 250 });
        const tree = behaviorTreeService.getTree(testTreeId);
        const moved = tree?.nodes.get(node.id);
        expect(moved?.position.x).toBe(150);
        expect(moved?.position.y).toBe(250);
      }
    });

    it('should set root node', () => {
      const node = behaviorTreeService.addNode(testTreeId, 'selector', { x: 0, y: 0 });
      if (node) {
        const result = behaviorTreeService.setRootNode(testTreeId, node.id);
        expect(result).toBe(true);
        const tree = behaviorTreeService.getTree(testTreeId);
        expect(tree?.rootNodeId).toBe(node.id);
      }
    });

    it('should add child to parent node', () => {
      const parent = behaviorTreeService.addNode(testTreeId, 'sequence', { x: 0, y: 0 });
      const child = behaviorTreeService.addNode(testTreeId, 'move', { x: 100, y: 0 });
      if (parent && child) {
        const result = behaviorTreeService.addChild(testTreeId, parent.id, child.id);
        expect(result).toBe(true);
        const tree = behaviorTreeService.getTree(testTreeId);
        const parentNode = tree?.nodes.get(parent.id);
        expect(parentNode?.children).toContain(child.id);
      }
    });

    it('should detect cycles when adding child', () => {
      const parent = behaviorTreeService.addNode(testTreeId, 'selector', { x: 0, y: 0 });
      const child = behaviorTreeService.addNode(testTreeId, 'sequence', { x: 100, y: 0 });
      if (parent && child) {
        behaviorTreeService.addChild(testTreeId, parent.id, child.id);
        const result = behaviorTreeService.addChild(testTreeId, child.id, parent.id);
        expect(result).toBe(false);
      }
    });

    it('should remove child from parent', () => {
      const parent = behaviorTreeService.addNode(testTreeId, 'sequence', { x: 0, y: 0 });
      const child = behaviorTreeService.addNode(testTreeId, 'attack', { x: 100, y: 0 });
      if (parent && child) {
        behaviorTreeService.addChild(testTreeId, parent.id, child.id);
        const result = behaviorTreeService.removeChild(testTreeId, parent.id, child.id);
        expect(result).toBe(true);
        const tree = behaviorTreeService.getTree(testTreeId);
        const parentNode = tree?.nodes.get(parent.id);
        expect(parentNode?.children).not.toContain(child.id);
      }
    });

    it('should add blackboard entry', () => {
      behaviorTreeService.addBlackboardEntry(testTreeId, {
        key: 'health',
        value: 100,
        type: 'number',
        description: 'Character health',
      });
      const blackboard = behaviorTreeService.getBlackboard(testTreeId);
      expect(blackboard.some((e) => e.key === 'health')).toBe(true);
    });

    it('should update blackboard entry', () => {
      behaviorTreeService.addBlackboardEntry(testTreeId, {
        key: 'speed',
        value: 5,
        type: 'number',
      });
      behaviorTreeService.updateBlackboardEntry(testTreeId, 'speed', { value: 10 });
      const blackboard = behaviorTreeService.getBlackboard(testTreeId);
      const entry = blackboard.find((e) => e.key === 'speed');
      expect(entry?.value).toBe(10);
    });

    it('should remove blackboard entry', () => {
      behaviorTreeService.addBlackboardEntry(testTreeId, {
        key: 'temp',
        value: true,
        type: 'boolean',
      });
      const result = behaviorTreeService.removeBlackboardEntry(testTreeId, 'temp');
      expect(result).toBe(true);
      const blackboard = behaviorTreeService.getBlackboard(testTreeId);
      expect(blackboard.some((e) => e.key === 'temp')).toBe(false);
    });

    it('should get node type definitions', () => {
      const defs = behaviorTreeService.getNodeTypeDefinitions();
      expect(defs.length).toBeGreaterThan(0);
      expect(defs[0].type).toBeTruthy();
      expect(defs[0].category).toBeTruthy();
    });

    it('should get node types by category', () => {
      const composites = behaviorTreeService.getNodeTypesByCategory('composite');
      const decorators = behaviorTreeService.getNodeTypesByCategory('decorator');
      const conditions = behaviorTreeService.getNodeTypesByCategory('condition');
      const actions = behaviorTreeService.getNodeTypesByCategory('action');
      expect(composites.length).toBeGreaterThan(0);
      expect(decorators.length).toBeGreaterThan(0);
      expect(conditions.length).toBeGreaterThan(0);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should start and stop a tree', () => {
      const node = behaviorTreeService.addNode(testTreeId, 'selector', { x: 0, y: 0 });
      if (node) {
        behaviorTreeService.setRootNode(testTreeId, node.id);
        const started = behaviorTreeService.startTree(testTreeId);
        expect(started).toBe(true);
        const runtime = behaviorTreeService.getRuntime(testTreeId);
        expect(runtime?.isRunning).toBe(true);
        const stopped = behaviorTreeService.stopTree(testTreeId);
        expect(stopped).toBe(true);
      }
    });

    it('should set and get blackboard values at runtime', () => {
      behaviorTreeService.addBlackboardEntry(testTreeId, {
        key: 'target',
        value: 'player',
        type: 'string',
      });
      const node = behaviorTreeService.addNode(testTreeId, 'selector', { x: 0, y: 0 });
      if (node) {
        behaviorTreeService.setRootNode(testTreeId, node.id);
        behaviorTreeService.startTree(testTreeId);
        behaviorTreeService.setBlackboardValue(testTreeId, 'target', 'enemy');
        const val = behaviorTreeService.getBlackboardValue(testTreeId, 'target');
        expect(val).toBe('enemy');
      }
    });

    it('should serialize and deserialize tree', () => {
      behaviorTreeService.addNode(testTreeId, 'selector', { x: 10, y: 20 });
      const json = behaviorTreeService.serializeTree(testTreeId);
      expect(json).toBeDefined();
      if (json) {
        const deserialized = behaviorTreeService.deserializeTree(json);
        expect(deserialized).toBeDefined();
        expect(deserialized?.nodes.size).toBe(1);
      }
    });

    it('should validate a tree', () => {
      const node = behaviorTreeService.addNode(testTreeId, 'selector', { x: 0, y: 0 });
      if (node) {
        behaviorTreeService.setRootNode(testTreeId, node.id);
        const validation = behaviorTreeService.validateTree(testTreeId);
        expect(Array.isArray(validation)).toBe(true);
      }
    });
  });

  describe('AnimationStateMachineService', () => {
    let smId: string;

    beforeEach(() => {
      const sm = animationStateMachineService.createStateMachine('PlayerSM');
      smId = sm.id;
    });

    it('should create a state machine', () => {
      const sm = animationStateMachineService.getStateMachine(smId);
      expect(sm).toBeDefined();
      expect(sm?.name).toBe('PlayerSM');
      expect(sm?.layers.length).toBe(1);
    });

    it('should list all state machines', () => {
      const list = animationStateMachineService.listStateMachines();
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.some((s) => s.id === smId)).toBe(true);
    });

    it('should add a state', () => {
      const state = animationStateMachineService.addState(smId, 'Base Layer', {
        name: 'Idle',
        animationClip: 'idle.anim',
        loop: true,
        speed: 1,
        duration: 1,
        position: { x: 0, y: 0 },
        blendMode: 'override',
        events: [],
      });
      expect(state).toBeDefined();
      expect(state.name).toBe('Idle');
    });

    it('should add a transition', () => {
      const idle = animationStateMachineService.addState(smId, 'Base Layer', {
        name: 'Idle',
        loop: true,
        speed: 1,
        duration: 1,
        position: { x: 0, y: 0 },
        blendMode: 'override',
        events: [],
      });
      const walk = animationStateMachineService.addState(smId, 'Base Layer', {
        name: 'Walk',
        loop: true,
        speed: 1,
        duration: 1,
        position: { x: 100, y: 0 },
        blendMode: 'override',
        events: [],
      });
      const transition = animationStateMachineService.addTransition(smId, 'Base Layer', {
        fromState: idle.id,
        toState: walk.id,
        condition: 'speed > 0',
        priority: 1,
        duration: 0.3,
        hasExitTime: false,
        exitTime: 0,
        interruptionSource: 'none',
        canTransitionToSelf: false,
      });
      expect(transition).toBeDefined();
      expect(transition.fromState).toBe(idle.id);
    });

    it('should add a parameter', () => {
      animationStateMachineService.addParameter(smId, {
        name: 'speed',
        type: 'float',
        defaultValue: 0,
      });
      const sm = animationStateMachineService.getStateMachine(smId);
      expect(sm?.parameters.some((p) => p.name === 'speed')).toBe(true);
    });

    it('should set and get parameter values', () => {
      animationStateMachineService.addParameter(smId, {
        name: 'isJumping',
        type: 'bool',
        defaultValue: false,
      });
      animationStateMachineService.setParameter(smId, 'isJumping', true);
      const val = animationStateMachineService.getParameter(smId, 'isJumping');
      expect(val).toBe(true);
    });

    it('should evaluate condition expressions', () => {
      animationStateMachineService.addParameter(smId, {
        name: 'speed',
        type: 'float',
        defaultValue: 5,
      });
      const result = animationStateMachineService.evaluateCondition('speed > 3', smId);
      expect(result).toBe(true);
      const result2 = animationStateMachineService.evaluateCondition('speed < 3', smId);
      expect(result2).toBe(false);
      const result3 = animationStateMachineService.evaluateCondition('speed == 5', smId);
      expect(result3).toBe(true);
      const result4 = animationStateMachineService.evaluateCondition('speed >= 5', smId);
      expect(result4).toBe(true);
    });

    it('should add any state transition', () => {
      const state = animationStateMachineService.addState(smId, 'Base Layer', {
        name: 'Hurt',
        loop: false,
        speed: 1,
        duration: 0.5,
        position: { x: 200, y: 0 },
        blendMode: 'override',
        events: [],
      });
      const transition = animationStateMachineService.addAnyStateTransition(smId, 'Base Layer', {
        fromState: '',
        toState: state.id,
        condition: 'hurt == true',
        priority: 0,
        duration: 0.1,
        hasExitTime: false,
        exitTime: 0,
        interruptionSource: 'none',
        canTransitionToSelf: false,
      });
      expect(transition).toBeDefined();
    });

    it('should add entry transition', () => {
      const state = animationStateMachineService.addState(smId, 'Base Layer', {
        name: 'Start',
        loop: true,
        speed: 1,
        duration: 1,
        position: { x: 0, y: 0 },
        blendMode: 'override',
        events: [],
      });
      const transition = animationStateMachineService.addEntryTransition(smId, 'Base Layer', state.id);
      expect(transition).toBeDefined();
    });

    it('should remove a state', () => {
      const state = animationStateMachineService.addState(smId, 'Base Layer', {
        name: 'Temp',
        loop: true,
        speed: 1,
        duration: 1,
        position: { x: 0, y: 0 },
        blendMode: 'override',
        events: [],
      });
      animationStateMachineService.removeState(smId, 'Base Layer', state.id);
      const sm = animationStateMachineService.getStateMachine(smId);
      const layer = sm?.layers.find((l) => l.name === 'Base Layer');
      expect(layer?.stateMachine.states.some((s) => s.id === state.id)).toBe(false);
    });

    it('should add a layer', () => {
      animationStateMachineService.addLayer(smId, {
        name: 'Upper Body',
        weight: 0.5,
        blendingMode: 'additive',
      });
      const sm = animationStateMachineService.getStateMachine(smId);
      expect(sm?.layers.length).toBe(2);
    });

    it('should compile to TypeScript code', () => {
      const code = animationStateMachineService.compile(smId, 'typescript');
      expect(code.length).toBeGreaterThan(0);
      expect(typeof code).toBe('string');
    });

    it('should subscribe to changes', () => {
      const listener = jest.fn();
      const unsubscribe = animationStateMachineService.subscribe(listener);
      animationStateMachineService.addState(smId, 'Base Layer', {
        name: 'Test',
        loop: true,
        speed: 1,
        duration: 1,
        position: { x: 0, y: 0 },
        blendMode: 'override',
        events: [],
      });
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('TileMapEditorService', () => {
    it('should have the service instance', () => {
      expect(tileMapEditorService).toBeDefined();
    });

    it('should create a tile map', () => {
      const map = tileMapEditorService.createMap({
        name: 'Level1',
        width: 20,
        height: 15,
        tileWidth: 32,
        tileHeight: 32,
      });
      expect(map).toBeDefined();
      expect(map.name).toBe('Level1');
      expect(map.tileWidth).toBe(32);
      expect(map.tileHeight).toBe(32);
      expect(map.width).toBe(20);
      expect(map.height).toBe(15);
    });

    it('should get a tile map by id', () => {
      const created = tileMapEditorService.createMap({
        name: 'TestMap',
        width: 10,
        height: 10,
        tileWidth: 16,
        tileHeight: 16,
      });
      const map = tileMapEditorService.getMap(created.id);
      expect(map).toBeDefined();
      expect(map?.id).toBe(created.id);
    });

    it('should return undefined for non-existent map', () => {
      const map = tileMapEditorService.getMap('nonexistent');
      expect(map).toBeUndefined();
    });

    it('should list all tile maps', () => {
      const before = tileMapEditorService.listMaps().length;
      tileMapEditorService.createMap({
        name: 'NewMap',
        width: 5,
        height: 5,
        tileWidth: 32,
        tileHeight: 32,
      });
      const after = tileMapEditorService.listMaps().length;
      expect(after).toBe(before + 1);
    });

    it('should add a tile layer', () => {
      const map = tileMapEditorService.createMap({
        name: 'LayerTest',
        width: 10,
        height: 10,
        tileWidth: 32,
        tileHeight: 32,
      });
      const layer = tileMapEditorService.addLayer(map.id, 'Ground');
      expect(layer).toBeDefined();
      expect(layer.name).toBe('Ground');
    });

    it('should place tiles on a layer', () => {
      const map = tileMapEditorService.createMap({
        name: 'PaintTest',
        width: 10,
        height: 10,
        tileWidth: 32,
        tileHeight: 32,
      });
      const layer = tileMapEditorService.addLayer(map.id, 'Layer1');
      tileMapEditorService.placeTile(map.id, layer.id, 0, 0, 1);
      tileMapEditorService.placeTile(map.id, layer.id, 1, 1, 2);
      const updatedMap = tileMapEditorService.getMap(map.id);
      const updatedLayer = updatedMap?.layers.find((l: any) => l.id === layer.id) as any;
      expect(updatedLayer.tiles[0][0]).toBe(1);
    });

    it('should erase tiles from a layer', () => {
      const map = tileMapEditorService.createMap({
        name: 'EraseTest',
        width: 10,
        height: 10,
        tileWidth: 32,
        tileHeight: 32,
      });
      const layer = tileMapEditorService.addLayer(map.id, 'Layer1');
      tileMapEditorService.placeTile(map.id, layer.id, 0, 0, 5);
      tileMapEditorService.placeTile(map.id, layer.id, 0, 0, null);
      const updatedMap = tileMapEditorService.getMap(map.id);
      const updatedLayer = updatedMap?.layers.find((l: any) => l.id === layer.id) as any;
      expect(updatedLayer.tiles[0][0]).toBeNull();
    });

    it('should fill an area with tiles', () => {
      const map = tileMapEditorService.createMap({
        name: 'FillTest',
        width: 5,
        height: 5,
        tileWidth: 32,
        tileHeight: 32,
      });
      const layer = tileMapEditorService.addLayer(map.id, 'Layer1');
      tileMapEditorService.fillArea(map.id, layer.id, 2, 2, 3);
      const updatedMap = tileMapEditorService.getMap(map.id);
      const updatedLayer = updatedMap?.layers.find((l: any) => l.id === layer.id) as any;
      expect(updatedLayer.tiles[2][2]).toBe(3);
    });

    it('should add a tileset', () => {
      const map = tileMapEditorService.createMap({
        name: 'TilesetTest',
        width: 10,
        height: 10,
        tileWidth: 32,
        tileHeight: 32,
      });
      const tileset = tileMapEditorService.addTileset(map.id, {
        name: 'Terrain',
        imageUrl: 'terrain.png',
        tileWidth: 32,
        tileHeight: 32,
        columns: 8,
        tileCount: 64,
      });
      expect(tileset).toBeDefined();
      expect(tileset.name).toBe('Terrain');
    });

    it('should undo and redo actions', () => {
      const map = tileMapEditorService.createMap({
        name: 'UndoTest',
        width: 5,
        height: 5,
        tileWidth: 32,
        tileHeight: 32,
      });
      const layer = tileMapEditorService.addLayer(map.id, 'Layer1');
      tileMapEditorService.placeTile(map.id, layer.id, 0, 0, 1);
      const undoResult = tileMapEditorService.undo(map.id);
      expect(undoResult).toBe(true);
      const redoResult = tileMapEditorService.redo(map.id);
      expect(redoResult).toBe(true);
    });

    it('should add an object to object layer', () => {
      const map = tileMapEditorService.createMap({
        name: 'ObjectTest',
        width: 10,
        height: 10,
        tileWidth: 32,
        tileHeight: 32,
      });
      const objLayer = tileMapEditorService.addObjectLayer(map.id, 'Objects');
      const obj = tileMapEditorService.addObject(map.id, objLayer.id, {
        name: 'SpawnPoint',
        type: 'point',
        x: 100,
        y: 100,
        width: 0,
        height: 0,
      });
      expect(obj).toBeDefined();
      expect(obj.name).toBe('SpawnPoint');
    });

    it('should generate navigation mesh', () => {
      const map = tileMapEditorService.createMap({
        name: 'NavTest',
        width: 10,
        height: 10,
        tileWidth: 32,
        tileHeight: 32,
      });
      const layer = tileMapEditorService.addLayer(map.id, 'Collision');
      const navMesh = tileMapEditorService.generateNavMesh(map.id, layer.id);
      expect(navMesh).toBeDefined();
    });

    it('should export map to JSON', () => {
      const map = tileMapEditorService.createMap({
        name: 'ExportTest',
        width: 5,
        height: 5,
        tileWidth: 32,
        tileHeight: 32,
      });
      const json = tileMapEditorService.exportToJSON(map.id);
      expect(typeof json).toBe('string');
      expect(json.length).toBeGreaterThan(0);
    });

    it('should export map to TMX', () => {
      const map = tileMapEditorService.createMap({
        name: 'TMXTest',
        width: 5,
        height: 5,
        tileWidth: 32,
        tileHeight: 32,
      });
      const tmx = tileMapEditorService.exportToTMX(map.id);
      expect(typeof tmx).toBe('string');
      expect(tmx.length).toBeGreaterThan(0);
    });

    it('should subscribe to changes', () => {
      const listener = jest.fn();
      const unsubscribe = tileMapEditorService.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('ShaderEditorService', () => {
    it('should have the service instance', () => {
      expect(shaderEditorService).toBeDefined();
    });

    it('should list shader templates', () => {
      const templates = shaderEditorService.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].id).toBeTruthy();
      expect(templates[0].name).toBeTruthy();
    });

    it('should get templates by category', () => {
      const unlitTemplates = shaderEditorService.getTemplates('unlit');
      expect(Array.isArray(unlitTemplates)).toBe(true);
    });

    it('should add a node', () => {
      const node = shaderEditorService.addNode({
        type: 'float',
        position: { x: 100, y: 100 },
      });
      expect(node).toBeDefined();
      expect(node.id).toBeTruthy();
    });

    it('should remove a node', () => {
      const node = shaderEditorService.addNode({
        type: 'color',
        position: { x: 0, y: 0 },
      });
      const before = shaderEditorService.listNodes().length;
      shaderEditorService.removeNode(node.id);
      const after = shaderEditorService.listNodes().length;
      expect(after).toBe(before - 1);
    });

    it('should update a node', () => {
      const node = shaderEditorService.addNode({
        type: 'float',
        position: { x: 0, y: 0 },
      });
      shaderEditorService.updateNode(node.id, { position: { x: 50, y: 60 } });
      const nodes = shaderEditorService.listNodes();
      const updated = nodes.find((n: any) => n.id === node.id);
      expect(updated?.position.x).toBe(50);
      expect(updated?.position.y).toBe(60);
    });

    it('should list all nodes', () => {
      const initial = shaderEditorService.listNodes().length;
      shaderEditorService.addNode({ type: 'float', position: { x: 0, y: 0 } });
      shaderEditorService.addNode({ type: 'color', position: { x: 100, y: 0 } });
      const nodes = shaderEditorService.listNodes();
      expect(nodes.length).toBe(initial + 2);
    });

    it('should get node categories', () => {
      const categories = shaderEditorService.getNodeCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0].category).toBeTruthy();
      expect(Array.isArray(categories[0].nodes)).toBe(true);
    });

    it('should connect two nodes', () => {
      const node1 = shaderEditorService.addNode({
        type: 'float',
        position: { x: 0, y: 0 },
      });
      const node2 = shaderEditorService.addNode({
        type: 'multiply',
        position: { x: 200, y: 0 },
      });
      const connection = shaderEditorService.addConnection({
        fromNode: node1.id,
        fromPort: 'output',
        toNode: node2.id,
        toPort: 'a',
      });
      expect(connection).toBeDefined();
      expect(connection.id).toBeTruthy();
    });

    it('should remove a connection', () => {
      const node1 = shaderEditorService.addNode({
        type: 'float',
        position: { x: 0, y: 0 },
      });
      const node2 = shaderEditorService.addNode({
        type: 'multiply',
        position: { x: 200, y: 0 },
      });
      const conn = shaderEditorService.addConnection({
        fromNode: node1.id,
        fromPort: 'output',
        toNode: node2.id,
        toPort: 'a',
      });
      const before = shaderEditorService.getConnections().length;
      shaderEditorService.removeConnection(conn.id);
      const after = shaderEditorService.getConnections().length;
      expect(after).toBe(before - 1);
    });

    it('should get all connections', () => {
      const conns = shaderEditorService.getConnections();
      expect(Array.isArray(conns)).toBe(true);
    });

    it('should compile to GLSL', () => {
      const result = shaderEditorService.compileToGLSL('glsl');
      expect(result).toBeDefined();
      expect(typeof result.vertex).toBe('string');
      expect(typeof result.fragment).toBe('string');
    });

    it('should apply a template', () => {
      const templates = shaderEditorService.getTemplates();
      if (templates.length > 0) {
        const result = shaderEditorService.applyTemplate(templates[0].id);
        expect(result).not.toBeNull();
      }
    });

    it('should subscribe to changes', () => {
      const listener = jest.fn();
      const unsubscribe = shaderEditorService.subscribe(listener);
      shaderEditorService.addNode({ type: 'float', position: { x: 0, y: 0 } });
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
