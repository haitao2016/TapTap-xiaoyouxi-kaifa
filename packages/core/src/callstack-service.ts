import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

export interface StackFrame {
  id: string;
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
  args?: Record<string, unknown>;
  locals?: Record<string, unknown>;
}

export interface CallStack {
  frames: StackFrame[];
  currentFrameIndex: number;
}

export class CallStackService {
  private stack: CallStack = {
    frames: [],
    currentFrameIndex: -1,
  };

  getStack(): CallStack {
    return { ...this.stack };
  }

  getFrames(): StackFrame[] {
    return [...this.stack.frames];
  }

  getCurrentFrame(): StackFrame | undefined {
    if (this.stack.currentFrameIndex >= 0 && this.stack.currentFrameIndex < this.stack.frames.length) {
      return this.stack.frames[this.stack.currentFrameIndex];
    }
    return undefined;
  }

  setStack(frames: StackFrame[]): void {
    this.stack.frames = frames.map((frame, index) => ({
      ...frame,
      id: frame.id || `frame-${index}-${randomUUID().slice(0, 8)}`,
    }));
    this.stack.currentFrameIndex = 0;
    globalEventBus.emit({ type: 'callstack:update', payload: this.stack });
  }

  pushFrame(frame: Omit<StackFrame, 'id'>): void {
    const newFrame: StackFrame = {
      ...frame,
      id: `frame-${this.stack.frames.length}-${randomUUID().slice(0, 8)}`,
    };
    this.stack.frames.push(newFrame);
    this.stack.currentFrameIndex = this.stack.frames.length - 1;
    globalEventBus.emit({ type: 'callstack:push', payload: newFrame });
  }

  popFrame(): StackFrame | undefined {
    const popped = this.stack.frames.pop();
    if (this.stack.currentFrameIndex >= this.stack.frames.length) {
      this.stack.currentFrameIndex = Math.max(0, this.stack.frames.length - 1);
    }
    if (popped) {
      globalEventBus.emit({ type: 'callstack:pop', payload: popped });
    }
    return popped;
  }

  setCurrentFrame(index: number): void {
    if (index >= 0 && index < this.stack.frames.length) {
      this.stack.currentFrameIndex = index;
      const frame = this.stack.frames[index];
      globalEventBus.emit({ 
        type: 'callstack:select', 
        payload: { index, frame } 
      });
    }
  }

  stepUp(): void {
    if (this.stack.currentFrameIndex > 0) {
      this.setCurrentFrame(this.stack.currentFrameIndex - 1);
    }
  }

  stepDown(): void {
    if (this.stack.currentFrameIndex < this.stack.frames.length - 1) {
      this.setCurrentFrame(this.stack.currentFrameIndex + 1);
    }
  }

  clear(): void {
    this.stack = {
      frames: [],
      currentFrameIndex: -1,
    };
    globalEventBus.emit({ type: 'callstack:clear', payload: {} });
  }

  updateFrameLocals(frameId: string, locals: Record<string, unknown>): void {
    const frame = this.stack.frames.find(f => f.id === frameId);
    if (frame) {
      frame.locals = locals;
      globalEventBus.emit({ type: 'callstack:frameUpdate', payload: frame });
    }
  }

  hasFrames(): boolean {
    return this.stack.frames.length > 0;
  }

  getFrameCount(): number {
    return this.stack.frames.length;
  }

  getCurrentFrameIndex(): number {
    return this.stack.currentFrameIndex;
  }
}

export const callStackService = new CallStackService();