export interface WorkerMessage<T = any> {
  id: string;
  type: string;
  payload?: T;
  error?: string;
}

export interface WorkerTask {
  id: string;
  worker: Worker;
  callbacks: Map<string, (result: any) => void>;
}

export class WebWorkerService {
  private workers = new Map<string, WorkerTask>();
  private taskIdCounter = 0;

  createWorker(scriptUrl: string, name?: string): string {
    const workerId = name || `worker-${Date.now()}`;

    if (this.workers.has(workerId)) {
      throw new Error(`Worker already exists: ${workerId}`);
    }

    const worker = new Worker(scriptUrl);
    const task: WorkerTask = {
      id: workerId,
      worker,
      callbacks: new Map(),
    };

    worker.onmessage = (event) => {
      const message: WorkerMessage = event.data;
      const callback = task.callbacks.get(message.id);
      if (callback) {
        task.callbacks.delete(message.id);
        if (message.error) {
          callback({ success: false, error: message.error });
        } else {
          callback({ success: true, result: message.payload });
        }
      }
    };

    worker.onerror = (error) => {
      task.callbacks.forEach((callback) => {
        callback({ success: false, error: error.message });
      });
      task.callbacks.clear();
    };

    this.workers.set(workerId, task);
    return workerId;
  }

  async execute<T = any>(workerId: string, action: string, payload?: any): Promise<T> {
    const task = this.workers.get(workerId);
    if (!task) {
      throw new Error(`Worker not found: ${workerId}`);
    }

    const messageId = `task-${this.taskIdCounter++}`;

    return new Promise((resolve, reject) => {
      task.callbacks.set(messageId, (result) => {
        if (result.success) {
          resolve(result.result as T);
        } else {
          reject(new Error(result.error));
        }
      });

      const message: WorkerMessage = {
        id: messageId,
        type: action,
        payload,
      };

      task.worker.postMessage(message);
    });
  }

  terminateWorker(workerId: string): void {
    const task = this.workers.get(workerId);
    if (task) {
      task.worker.terminate();
      task.callbacks.forEach((callback) => {
        callback({ success: false, error: 'Worker terminated' });
      });
      this.workers.delete(workerId);
    }
  }

  getWorkerStatus(workerId: string): 'running' | 'terminated' | 'not_found' {
    if (!this.workers.has(workerId)) {
      return 'not_found';
    }
    return 'running';
  }

  getAllWorkers(): string[] {
    return Array.from(this.workers.keys());
  }

  async runTask<T = any>(scriptUrl: string, action: string, payload?: any): Promise<T> {
    const workerId = this.createWorker(scriptUrl);
    try {
      return await this.execute<T>(workerId, action, payload);
    } finally {
      this.terminateWorker(workerId);
    }
  }

  broadcast(message: WorkerMessage): void {
    this.workers.forEach((task) => {
      task.worker.postMessage(message);
    });
  }

  terminateAll(): void {
    this.workers.forEach((task, id) => {
      this.terminateWorker(id);
    });
  }
}

export const webWorkerService = new WebWorkerService();
