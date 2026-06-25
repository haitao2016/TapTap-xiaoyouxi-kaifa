import { multiModelRouter } from '../multi-model-router';

export interface TutorLesson {
  id: string;
  title: string;
  category: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  description: string;
  objectives: string[];
  steps: LessonStep[];
}

export interface LessonStep {
  id: string;
  title: string;
  content: string;
  code?: string;
  expectedOutput?: string;
  hints?: string[];
}

export interface TutorSession {
  id: string;
  lessonId: string;
  currentStep: number;
  progress: number;
  startedAt: number;
  completedAt?: number;
  isCompleted: boolean;
}

export interface TutorResponse {
  type: 'explanation' | 'code' | 'hint' | 'feedback' | 'summary';
  content: string;
  code?: string;
  nextStep?: number;
  score?: number;
}

export class AITutorService {
  private lessons: Map<string, TutorLesson> = new Map();
  private sessions: Map<string, TutorSession> = new Map();

  constructor() {
    this.initDefaultLessons();
  }

  private initDefaultLessons(): void {
    this.lessons.set('ts-basics', {
      id: 'ts-basics',
      title: 'TypeScript 基础入门',
      category: 'beginner',
      duration: 30,
      description: '学习 TypeScript 的基本语法和类型系统',
      objectives: ['理解 TypeScript 类型系统', '掌握基本类型定义', '了解接口和泛型'],
      steps: [
        {
          id: 'step-1',
          title: '什么是 TypeScript',
          content: 'TypeScript 是 JavaScript 的超集，添加了静态类型检查。它可以帮助我们在开发阶段发现错误。',
        },
        {
          id: 'step-2',
          title: '基本类型',
          content: 'TypeScript 提供了多种基本类型：string、number、boolean、array、tuple、enum、any、void 等。',
          code: `// 基本类型示例
const name: string = 'Hello';
const age: number = 25;
const isActive: boolean = true;
const numbers: number[] = [1, 2, 3];`,
        },
        {
          id: 'step-3',
          title: '接口',
          content: '接口用于定义对象的结构，它可以被类实现或作为类型注解使用。',
          code: `interface Person {
  name: string;
  age: number;
  greet(): void;
}

const person: Person = {
  name: 'John',
  age: 30,
  greet() {
    console.log(\`Hello, \${this.name}\`);
  }
};`,
        },
        {
          id: 'step-4',
          title: '泛型',
          content: '泛型允许我们编写可重用的组件，同时保持类型安全。',
          code: `function identity<T>(arg: T): T {
  return arg;
}

const num = identity<number>(42);
const str = identity<string>('hello');`,
        },
      ],
    });

    this.lessons.set('react-hooks', {
      id: 'react-hooks',
      title: 'React Hooks 深入理解',
      category: 'intermediate',
      duration: 45,
      description: '深入学习 React Hooks 的原理和最佳实践',
      objectives: ['理解 useState 和 useEffect', '掌握自定义 Hooks', '了解 Hooks 规则'],
      steps: [
        {
          id: 'step-1',
          title: 'useState',
          content: 'useState 用于在函数组件中添加状态管理。',
          code: `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}`,
        },
        {
          id: 'step-2',
          title: 'useEffect',
          content: 'useEffect 用于处理副作用，如数据获取、订阅等。',
          code: `import { useEffect, useState } from 'react';

function DataLoader() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
    
    return () => {
      // 清理函数
    };
  }, []);
  
  return <div>{data?.message}</div>;
}`,
        },
        {
          id: 'step-3',
          title: '自定义 Hooks',
          content: '可以创建自定义 Hooks 来复用状态逻辑。',
          code: `function useLocalStorage(key: string, initialValue: string) {
  const [value, setValue] = useState(() => {
    return localStorage.getItem(key) || initialValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);
  
  return [value, setValue] as const;
}`,
        },
      ],
    });

    this.lessons.set('async-patterns', {
      id: 'async-patterns',
      title: '异步编程模式',
      category: 'advanced',
      duration: 60,
      description: '学习现代 JavaScript 异步编程的最佳实践',
      objectives: ['掌握 async/await', '理解 Promise 模式', '处理并发和错误'],
      steps: [
        {
          id: 'step-1',
          title: 'async/await',
          content: 'async/await 是处理异步操作的语法糖，让异步代码看起来像同步代码。',
          code: `async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
}`,
        },
        {
          id: 'step-2',
          title: '并发请求',
          content: '使用 Promise.all 同时发起多个请求，提高性能。',
          code: `async function fetchMultiple() {
  const [users, posts, comments] = await Promise.all([
    fetch('/api/users').then(r => r.json()),
    fetch('/api/posts').then(r => r.json()),
    fetch('/api/comments').then(r => r.json()),
  ]);
  return { users, posts, comments };
}`,
        },
        {
          id: 'step-3',
          title: '错误处理',
          content: '使用 try/catch 和 finally 进行错误处理和资源清理。',
          code: `async function safeOperation() {
  let resource;
  try {
    resource = await acquireResource();
    return await processResource(resource);
  } catch (error) {
    await logError(error);
    throw error;
  } finally {
    if (resource) {
      await releaseResource(resource);
    }
  }
}`,
        },
      ],
    });
  }

  getLessons(): TutorLesson[] {
    return Array.from(this.lessons.values());
  }

  getLesson(lessonId: string): TutorLesson | undefined {
    return this.lessons.get(lessonId);
  }

  createSession(lessonId: string): TutorSession {
    const session: TutorSession = {
      id: `session-${Date.now()}`,
      lessonId,
      currentStep: 0,
      progress: 0,
      startedAt: Date.now(),
      isCompleted: false,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): TutorSession | undefined {
    return this.sessions.get(sessionId);
  }

  async getStepContent(sessionId: string): Promise<TutorResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const lesson = this.lessons.get(session.lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const step = lesson.steps[session.currentStep];
    if (!step) {
      return {
        type: 'summary',
        content: '恭喜你完成了所有课程！',
      };
    }

    return {
      type: 'explanation',
      content: step.content,
      code: step.code,
      nextStep: session.currentStep + 1,
    };
  }

  async submitAnswer(sessionId: string, answer: string): Promise<TutorResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const lesson = this.lessons.get(session.lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const step = lesson.steps[session.currentStep];
    if (!step) {
      return { type: 'summary', content: '课程已完成' };
    }

    const systemPrompt = `你是一位耐心的编程导师。请评估学生的答案，并给出反馈。

当前课程: ${lesson.title}
当前步骤: ${step.title}
步骤内容: ${step.content}
${step.code ? `参考代码:
\`\`\`typescript
${step.code}
\`\`\`` : ''}

学生答案:
${answer}

请给出详细的反馈，包括：
1. 答案是否正确
2. 需要改进的地方
3. 评分（0-100）
4. 下一步建议

请使用 JSON 格式输出：
{
  "score": 0-100,
  "feedback": "反馈内容",
  "correct": true|false,
  "suggestion": "改进建议"
}
`;

    const result = await multiModelRouter.execute('tutor', answer, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });

    const feedback = this.parseFeedback(result.content);

    if (feedback.correct || feedback.score >= 80) {
      session.currentStep++;
      session.progress = Math.round((session.currentStep / lesson.steps.length) * 100);
      if (session.currentStep >= lesson.steps.length) {
        session.isCompleted = true;
        session.completedAt = Date.now();
      }
      this.sessions.set(sessionId, session);
    }

    return {
      type: 'feedback',
      content: feedback.feedback,
      score: feedback.score,
      nextStep: feedback.correct ? session.currentStep : undefined,
    };
  }

  private parseFeedback(content: string): { score: number; feedback: string; correct: boolean; suggestion: string } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // JSON 解析失败
    }

    const scoreMatch = content.match(/score[^\d]*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 70;

    return {
      score,
      feedback: content.substring(0, 500),
      correct: score >= 80,
      suggestion: '',
    };
  }

  getProgress(sessionId: string): TutorSession | undefined {
    return this.sessions.get(sessionId);
  }

  getLearningStats(): { totalSessions: number; completedSessions: number; avgScore: number } {
    const allSessions = Array.from(this.sessions.values());
    const completed = allSessions.filter(s => s.isCompleted);
    
    return {
      totalSessions: allSessions.length,
      completedSessions: completed.length,
      avgScore: 0,
    };
  }
}

export const aiTutorService = new AITutorService();
