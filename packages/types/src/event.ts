/** 通用应用事件 payload 类型 */
export interface AppEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  timestamp?: number;
  source?: string;
}

/** 事件总线订阅者 */
export type AppEventHandler<TPayload = unknown> = (event: AppEvent<TPayload>) => void;
