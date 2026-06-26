// 语音与手势交互
// 语音命令控制、触屏手势操作、AI 语音助手

import { globalEventBus } from '../core/event-bus';

// 手势类型
export type GestureType =
  | 'tap'
  | 'double-tap'
  | 'long-press'
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'pinch-in'
  | 'pinch-out'
  | 'rotate'
  | 'two-finger-tap'
  | 'three-finger-swipe'
  | 'edge-swipe';

// 手势事件
export interface GestureEvent {
  type: GestureType;
  position: { x: number; y: number };
  delta?: { x: number; y: number };
  scale?: number;
  rotation?: number;
  duration: number;
  velocity?: number;
  target?: string;
  timestamp: number;
}

// 语音命令
export interface VoiceCommand {
  id: string;
  pattern: string | RegExp;
  action: string;
  description: string;
  parameters?: { name: string; required: boolean; type: 'string' | 'number' }[];
  examples: string[];
}

// 语音识别结果
export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  alternatives: { text: string; confidence: number }[];
  language: string;
  timestamp: number;
}

// AI 语音响应
export interface VoiceResponse {
  text: string;
  audioUrl?: string;
  duration: number;
  action?: { name: string; params?: any };
}

class VoiceGestureService {
  private voiceCommands: VoiceCommand[] = [];
  private gestureHandlers = new Map<GestureType, (e: GestureEvent) => void>();
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private listeners = new Set<(event: string, data: any) => void>();
  private voiceResponses: VoiceResponse[] = [];

  constructor() {
    this.registerDefaultCommands();
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  // 注册默认命令
  private registerDefaultCommands(): void {
    this.voiceCommands = [
      {
        id: 'run-game',
        pattern: /(运行|启动|run|start)\s*(游戏|项目|game|project)?/i,
        action: 'editor:run',
        description: '运行当前游戏',
        examples: ['运行游戏', '启动', 'run game', 'start project'],
      },
      {
        id: 'stop-game',
        pattern: /(停止|stop|pause|暂停)/i,
        action: 'editor:stop',
        description: '停止游戏',
        examples: ['停止', '暂停', 'stop', 'pause'],
      },
      {
        id: 'save-file',
        pattern: /(保存|save)/i,
        action: 'file:save',
        description: '保存文件',
        examples: ['保存', 'save'],
      },
      {
        id: 'open-file',
        pattern: /(打开|open)\s+(.+)/i,
        action: 'file:open',
        description: '打开文件',
        parameters: [{ name: 'filename', required: true, type: 'string' }],
        examples: ['打开 main.ts', 'open index.html'],
      },
      {
        id: 'find-symbol',
        pattern: /(查找|find|搜索|search)\s+(.+)/i,
        action: 'search:symbol',
        description: '查找符号',
        parameters: [{ name: 'query', required: true, type: 'string' }],
        examples: ['查找 UserService', 'find class'],
      },
      {
        id: 'goto-line',
        pattern: /(跳转到|goto|到)\s*第?\s*(\d+)\s*行?/i,
        action: 'editor:goto-line',
        description: '跳转到指定行',
        parameters: [{ name: 'line', required: true, type: 'number' }],
        examples: ['跳转到 100 行', 'goto 50'],
      },
      {
        id: 'new-file',
        pattern: /(新建|创建|new|create)\s*(文件|file)/i,
        action: 'file:new',
        description: '新建文件',
        examples: ['新建文件', '创建文件', 'new file'],
      },
      {
        id: 'format-code',
        pattern: /(格式化|format)\s*(代码|code)?/i,
        action: 'editor:format',
        description: '格式化代码',
        examples: ['格式化', 'format'],
      },
      {
        id: 'toggle-terminal',
        pattern: /(打开|关闭|打开\/关闭|toggle)\s*(终端|terminal|控制台|console)/i,
        action: 'ui:toggle-terminal',
        description: '切换终端显示',
        examples: ['打开终端', 'toggle terminal'],
      },
      {
        id: 'build-project',
        pattern: /(构建|编译|build|compile)/i,
        action: 'project:build',
        description: '构建项目',
        examples: ['构建', '编译', 'build'],
      },
    ];
  }

  // 初始化语音识别
  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'zh-CN';

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          const isFinal = result.isFinal;

          const recognitionResult: SpeechRecognitionResult = {
            text: transcript,
            confidence,
            isFinal,
            alternatives: Array.from(result).map((alt: any) => ({
              text: alt.transcript,
              confidence: alt.confidence,
            })),
            language: this.recognition.lang,
            timestamp: Date.now(),
          };

          this.notify('speech:result', recognitionResult);

          if (isFinal) {
            this.processVoiceCommand(transcript);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        this.notify('speech:error', event.error);
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          this.recognition.start(); // 持续监听
        }
      };
    }
  }

  // 初始化语音合成
  private initSpeechSynthesis(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis;
    }
  }

  // 开始监听
  startListening(): boolean {
    if (!this.recognition) {
      this.notify('speech:error', '浏览器不支持语音识别');
      return false;
    }
    if (this.isListening) return true;
    try {
      this.recognition.start();
      this.isListening = true;
      this.notify('speech:listening-started', null);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 停止监听
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.notify('speech:listening-stopped', null);
    }
  }

  // 处理语音命令
  private processVoiceCommand(text: string): VoiceResponse | null {
    for (const cmd of this.voiceCommands) {
      const match =
        typeof cmd.pattern === 'string' ? text.includes(cmd.pattern) : text.match(cmd.pattern);

      if (match) {
        const params: any = {};
        if (cmd.parameters && typeof cmd.pattern !== 'string') {
          for (let i = 0; i < cmd.parameters.length; i++) {
            const paramName = cmd.parameters[i].name;
            const value = match[i + 1];
            if (value) {
              params[paramName] = cmd.parameters[i].type === 'number' ? parseInt(value) : value;
            }
          }
        }

        const response: VoiceResponse = {
          text: `已执行: ${cmd.description}`,
          duration: 1.5,
          action: { name: cmd.action, params },
        };

        this.voiceResponses.push(response);
        this.speak(response.text);
        this.notify('command:executed', { command: cmd, response, params });
        globalEventBus.emit(`voice:${cmd.action}`, params);
        return response;
      }
    }

    // 尝试作为 AI 对话
    this.handleAIDialogue(text);
    return null;
  }

  // AI 对话处理
  private async handleAIDialogue(text: string): Promise<void> {
    const response: VoiceResponse = {
      text: `你说的是 "${text}"，这是一个普通对话。我可以帮你完成代码生成、文件操作等任务，请尝试用命令形式。`,
      duration: 3,
      action: { name: 'ai:dialogue', params: { text } },
    };
    this.voiceResponses.push(response);
    this.speak(response.text);
    this.notify('ai:dialogue', response);
  }

  // 语音合成
  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.synthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;
    utterance.lang = 'zh-CN';
    this.synthesis.speak(utterance);
  }

  // 取消语音
  cancelSpeaking(): void {
    this.synthesis?.cancel();
  }

  // 注册手势处理器
  registerGestureHandler(type: GestureType, handler: (e: GestureEvent) => void): void {
    this.gestureHandlers.set(type, handler);
  }

  // 处理手势事件
  handleGesture(event: GestureEvent): void {
    const handler = this.gestureHandlers.get(event.type);
    if (handler) {
      handler(event);
      this.notify('gesture:handled', event);
    } else {
      // 默认行为
      this.defaultGestureHandler(event);
    }
  }

  // 默认手势处理
  private defaultGestureHandler(event: GestureEvent): void {
    switch (event.type) {
      case 'swipe-left':
        globalEventBus.emit('editor:navigate-back', null);
        break;
      case 'swipe-right':
        globalEventBus.emit('editor:navigate-forward', null);
        break;
      case 'swipe-up':
        globalEventBus.emit('editor:toggle-command-palette', null);
        break;
      case 'swipe-down':
        globalEventBus.emit('editor:toggle-panel', null);
        break;
      case 'pinch-in':
        globalEventBus.emit('editor:zoom-out', null);
        break;
      case 'pinch-out':
        globalEventBus.emit('editor:zoom-in', null);
        break;
      case 'long-press':
        globalEventBus.emit('editor:show-context-menu', event.position);
        break;
    }
    this.notify('gesture:default', event);
  }

  // 设置识别语言
  setLanguage(lang: string): void {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  // 添加自定义命令
  addCommand(command: Omit<VoiceCommand, 'id'>): VoiceCommand {
    const newCmd: VoiceCommand = {
      ...command,
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.voiceCommands.push(newCmd);
    return newCmd;
  }

  // 列出命令
  listCommands(): VoiceCommand[] {
    return [...this.voiceCommands];
  }

  // 获取语音历史
  getVoiceHistory(): VoiceResponse[] {
    return [...this.voiceResponses];
  }

  // 是否正在监听
  isListeningNow(): boolean {
    return this.isListening;
  }

  // 检查浏览器支持
  isSupported(): { recognition: boolean; synthesis: boolean } {
    return {
      recognition: !!this.recognition,
      synthesis: !!this.synthesis,
    };
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

export const voiceGestureService = new VoiceGestureService();
