/**
 * Raindrop AI Observability Integration
 * 
 * This module provides AI call instrumentation for Raindrop monitoring platform.
 * It tracks AI model interactions, performance metrics, and user interactions.
 */

import Raindrop from 'raindrop-ai';

const RAINDROP_WRITE_KEY = process.env.RAINDROP_WRITE_KEY;

let raindropClient: Raindrop | null = null;

export interface RaindropConfig {
  writeKey?: string;
  serviceName?: string;
  environment?: string;
}

export interface AIInstrumentationOptions {
  model?: string;
  provider?: string;
  userId?: string;
  sessionId?: string;
  operationName?: string;
}

export function getRaindropClient(): Raindrop | null {
  if (!raindropClient && RAINDROP_WRITE_KEY) {
    try {
      raindropClient = new Raindrop({
        writeKey: RAINDROP_WRITE_KEY,
      });
    } catch (error) {
      console.error('[Raindrop] Failed to initialize:', error);
    }
  }
  return raindropClient;
}

export function isRaindropEnabled(): boolean {
  return !!RAINDROP_WRITE_KEY && !!getRaindropClient();
}

export async function trackAIEvent(
  eventName: string,
  data: {
    model?: string;
    provider?: string;
    input?: string;
    output?: string;
    latency?: number;
    error?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const client = getRaindropClient();
  if (!client) return;

  try {
    await client.track({
      event: eventName,
      properties: {
        ...data,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('[Raindrop] Track error:', error);
  }
}

export async function trackAIStreamStart(options: AIInstrumentationOptions): Promise<string | null> {
  const client = getRaindropClient();
  if (!client) return null;

  try {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await client.track({
      event: 'ai_stream_start',
      properties: {
        eventId,
        model: options.model,
        provider: options.provider,
        operationName: options.operationName,
        sessionId: options.sessionId,
        timestamp: Date.now(),
      },
    });

    return eventId;
  } catch (error) {
    console.error('[Raindrop] Track stream start error:', error);
    return null;
  }
}

export async function trackAIStreamComplete(
  eventId: string,
  options: AIInstrumentationOptions,
  data: {
    output?: string;
    latency?: number;
    tokenUsage?: number;
    error?: string;
  }
): Promise<void> {
  const client = getRaindropClient();
  if (!client) return;

  try {
    await client.track({
      event: 'ai_stream_complete',
      properties: {
        eventId,
        model: options.model,
        provider: options.provider,
        operationName: options.operationName,
        sessionId: options.sessionId,
        output: data.output?.substring(0, 500),
        latency: data.latency,
        tokenUsage: data.tokenUsage,
        error: data.error,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('[Raindrop] Track stream complete error:', error);
  }
}

export async function trackAIReview(
  data: {
    score?: number;
    issuesCount?: number;
    language?: string;
    duration?: number;
    error?: string;
  }
): Promise<void> {
  await trackAIEvent('ai_code_review', {
    input: 'code',
    output: `score: ${data.score}, issues: ${data.issuesCount}`,
    latency: data.duration,
    error: data.error,
    metadata: {
      language: data.language,
      issuesCount: data.issuesCount,
      score: data.score,
    },
  });
}

export async function trackAIDocGen(
  data: {
    docType?: string;
    projectName?: string;
    duration?: number;
    error?: string;
  }
): Promise<void> {
  await trackAIEvent('ai_doc_generation', {
    input: data.docType,
    output: data.projectName,
    latency: data.duration,
    error: data.error,
    metadata: {
      docType: data.docType,
      projectName: data.projectName,
    },
  });
}

export async function trackAITutor(
  data: {
    lessonId?: string;
    step?: number;
    score?: number;
    duration?: number;
    error?: string;
  }
): Promise<void> {
  await trackAIEvent('ai_tutor', {
    input: `lesson: ${data.lessonId}, step: ${data.step}`,
    output: `score: ${data.score}`,
    latency: data.duration,
    error: data.error,
    metadata: {
      lessonId: data.lessonId,
      step: data.step,
      score: data.score,
    },
  });
}

export async function trackAIModelSwitch(
  data: {
    fromModel?: string;
    toModel?: string;
    reason?: string;
  }
): Promise<void> {
  await trackAIEvent('ai_model_switch', {
    input: data.fromModel,
    output: data.toModel,
    metadata: {
      reason: data.reason,
    },
  });
}

export async function flushRaindrop(): Promise<void> {
  const client = getRaindropClient();
  if (client && typeof client.flush === 'function') {
    await client.flush();
  }
}
