import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { globalEventBus, EventBus } from '../packages/core/src/event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('emit', () => {
    it('should emit an event', () => {
      const listener = jest.fn();
      eventBus.on('test-event', listener);
      eventBus.emit('test-event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should emit to multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      eventBus.on('multi-event', listener1);
      eventBus.on('multi-event', listener2);
      eventBus.emit('multi-event');
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('on', () => {
    it('should register a listener', () => {
      const listener = jest.fn();
      eventBus.on('register-test', listener);
      eventBus.emit('register-test');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = eventBus.on('unsubscribe-test', listener);
      
      eventBus.emit('unsubscribe-test');
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      eventBus.emit('unsubscribe-test');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('off', () => {
    it('should remove a listener', () => {
      const listener = jest.fn();
      eventBus.on('off-test', listener);
      eventBus.off('off-test', listener);
      eventBus.emit('off-test');
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove all listeners for an event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      eventBus.on('off-all', listener1);
      eventBus.on('off-all', listener2);
      eventBus.off('off-all');
      eventBus.emit('off-all');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only call listener once', () => {
      const listener = jest.fn();
      eventBus.once('once-test', listener);
      
      eventBus.emit('once-test');
      eventBus.emit('once-test');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = eventBus.once('once-unsubscribe', listener);
      
      unsubscribe();
      eventBus.emit('once-unsubscribe');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return 0 for non-existent event', () => {
      expect(eventBus.listenerCount('non-existent')).toBe(0);
    });

    it('should return correct count', () => {
      eventBus.on('count-test', jest.fn());
      eventBus.on('count-test', jest.fn());
      eventBus.on('count-test', jest.fn());
      
      expect(eventBus.listenerCount('count-test')).toBe(3);
    });
  });

  describe('eventNames', () => {
    it('should return list of event names', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      
      const names = eventBus.eventNames();
      
      expect(names).toContain('event1');
      expect(names).toContain('event2');
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners', () => {
      const listener = jest.fn();
      eventBus.on('remove-all', listener);
      eventBus.removeAllListeners();
      eventBus.emit('remove-all');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('GlobalEventBus', () => {
  beforeEach(() => {
    globalEventBus.removeAllListeners();
  });

  describe('singleton behavior', () => {
    it('should be the same instance', () => {
      const bus1 = globalEventBus;
      const bus2 = globalEventBus;
      
      expect(bus1).toBe(bus2);
    });
  });

  describe('build events', () => {
    it('should handle build:start event', (done) => {
      globalEventBus.once('build:start', (data) => {
        expect(data.projectId).toBeDefined();
        done();
      });
      globalEventBus.emit('build:start', { projectId: 'test' });
    });

    it('should handle build:complete event', (done) => {
      globalEventBus.once('build:complete', (data) => {
        expect(data.success).toBeDefined();
        done();
      });
      globalEventBus.emit('build:complete', { success: true });
    });

    it('should handle build:error event', (done) => {
      globalEventBus.once('build:error', (data) => {
        expect(data.error).toBeDefined();
        done();
      });
      globalEventBus.emit('build:error', { error: 'Test error' });
    });
  });

  describe('debug events', () => {
    it('should handle debug:connected event', (done) => {
      globalEventBus.once('debug:connected', (data) => {
        expect(data.sessionId).toBeDefined();
        done();
      });
      globalEventBus.emit('debug:connected', { sessionId: 'session-123' });
    });

    it('should handle debug:disconnected event', (done) => {
      globalEventBus.once('debug:disconnected', (data) => {
        expect(data.sessionId).toBeDefined();
        done();
      });
      globalEventBus.emit('debug:disconnected', { sessionId: 'session-123' });
    });
  });

  describe('monitor events', () => {
    it('should handle monitor:alert event', (done) => {
      globalEventBus.once('monitor:alert', (data) => {
        expect(data.type).toBeDefined();
        expect(data.message).toBeDefined();
        done();
      });
      globalEventBus.emit('monitor:alert', { 
        type: 'warning', 
        message: 'High memory usage' 
      });
    });
  });
});
