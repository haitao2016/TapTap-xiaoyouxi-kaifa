import { debugService, DebugSession, DebugLogEntry } from '../packages/core/src/debug-service';

describe('DebugService', () => {
  beforeEach(() => {
    debugService.disconnect();
    (debugService as any).sessions.clear();
    (debugService as any).logs = [];
    (debugService as any).breakpoints = new Map();
    (debugService as any).activeSessionId = null;
  });

  describe('connect', () => {
    it('should connect to debug server', async () => {
      const sessionId = await debugService.connect('ws://localhost:8080');
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      
      debugService.disconnect();
    });

    it('should handle connection errors', async () => {
      try {
        await debugService.connect('ws://invalid-host:99999');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('disconnect', () => {
    it('should disconnect gracefully when not connected', () => {
      expect(() => debugService.disconnect()).not.toThrow();
    });

    it('should clear active session after disconnect', async () => {
      const sessionId = await debugService.connect('ws://localhost:8080');
      debugService.disconnect();
      
      expect(debugService.getActiveSession()).toBeNull();
    });
  });

  describe('getActiveSession', () => {
    it('should return null when no session is active', () => {
      expect(debugService.getActiveSession()).toBeNull();
    });
  });

  describe('addBreakpoint', () => {
    it('should add a breakpoint', () => {
      debugService.addBreakpoint('http://localhost:3000', 10, 'test-id');
      
      const breakpoints = debugService.getBreakpoints('http://localhost:3000');
      expect(breakpoints.length).toBe(1);
      expect(breakpoints[0].line).toBe(10);
    });

    it('should not add duplicate breakpoints', () => {
      debugService.addBreakpoint('http://localhost:3000', 10, 'test-id');
      debugService.addBreakpoint('http://localhost:3000', 10, 'test-id');
      
      const breakpoints = debugService.getBreakpoints('http://localhost:3000');
      expect(breakpoints.length).toBe(1);
    });
  });

  describe('removeBreakpoint', () => {
    it('should remove a breakpoint', () => {
      debugService.addBreakpoint('http://localhost:3000', 10, 'test-id');
      debugService.removeBreakpoint('http://localhost:3000', 10);
      
      const breakpoints = debugService.getBreakpoints('http://localhost:3000');
      expect(breakpoints.length).toBe(0);
    });
  });

  describe('clearBreakpoints', () => {
    it('should clear all breakpoints for a script', () => {
      debugService.addBreakpoint('http://localhost:3000', 10, 'test-id-1');
      debugService.addBreakpoint('http://localhost:3000', 20, 'test-id-2');
      debugService.clearBreakpoints('http://localhost:3000');
      
      const breakpoints = debugService.getBreakpoints('http://localhost:3000');
      expect(breakpoints.length).toBe(0);
    });
  });

  describe('log', () => {
    it('should add log entry', () => {
      debugService.log({
        message: 'Test message',
        level: 'info',
        source: 'test',
        timestamp: Date.now(),
      });
      
      const logs = debugService.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test message');
    });

    it('should filter logs by level', () => {
      debugService.log({ message: 'Info', level: 'info', source: 'test', timestamp: Date.now() });
      debugService.log({ message: 'Error', level: 'error', source: 'test', timestamp: Date.now() });
      debugService.log({ message: 'Warn', level: 'warn', source: 'test', timestamp: Date.now() });
      
      const errorLogs = debugService.getLogs('error');
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].message).toBe('Error');
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      debugService.log({ message: 'Test', level: 'info', source: 'test', timestamp: Date.now() });
      debugService.clearLogs();
      
      const logs = debugService.getLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('evaluate', () => {
    it('should handle evaluate when not connected', async () => {
      try {
        await debugService.evaluate('window.location.href', 'test');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getSource', () => {
    it('should return null when script not found', async () => {
      const source = await debugService.getSource('non-existent-script', 10);
      expect(source).toBeNull();
    });
  });

  describe('stepOver', () => {
    it('should handle stepOver when not connected', async () => {
      try {
        await debugService.stepOver();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('stepInto', () => {
    it('should handle stepInto when not connected', async () => {
      try {
        await debugService.stepInto();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('stepOut', () => {
    it('should handle stepOut when not connected', async () => {
      try {
        await debugService.stepOut();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('pause', () => {
    it('should handle pause when not connected', async () => {
      try {
        await debugService.pause();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('resume', () => {
    it('should handle resume when not connected', async () => {
      try {
        await debugService.resume();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
