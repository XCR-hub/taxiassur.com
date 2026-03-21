interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline_request_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

class OfflineManager {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private syncInProgress = false;

  constructor() {
    this.loadQueue();
    this.setupListeners();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
    } catch (error) {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this.processQueue();
    });

    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('sync-queue');
      }).catch(() => {
        // Background Sync not supported
      });
    }
  }

  async addToQueue(
    url: string,
    method: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<string> {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: QueuedRequest = {
      id,
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(request);
    this.saveQueue();

    if (navigator.onLine) {
      this.processQueue();
    }

    return id;
  }

  async processQueue() {
    if (this.processing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.syncInProgress = true;

    const requestsToProcess = [...this.queue];

    for (const request of requestsToProcess) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers,
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        if (response.ok) {
          this.removeFromQueue(request.id);
        } else if (request.retries < MAX_RETRIES) {
          request.retries++;
          this.saveQueue();
        } else {
          this.removeFromQueue(request.id);
          console.error('Max retries reached for request:', request.id);
        }
      } catch (error) {
        if (request.retries < MAX_RETRIES) {
          request.retries++;
          this.saveQueue();
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        } else {
          this.removeFromQueue(request.id);
          console.error('Request failed after max retries:', request.id, error);
        }
      }
    }

    this.processing = false;
    this.syncInProgress = false;
  }

  private removeFromQueue(id: string) {
    this.queue = this.queue.filter((req) => req.id !== id);
    this.saveQueue();
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      isSyncing: this.syncInProgress,
      isOnline: navigator.onLine,
    };
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  getQueue() {
    return [...this.queue];
  }
}

export const offlineManager = new OfflineManager();

export function useOfflineQueue() {
  const enqueue = async (
    url: string,
    method: string,
    body?: unknown,
    headers?: Record<string, string>
  ) => {
    return offlineManager.addToQueue(url, method, body, headers);
  };

  const getStatus = () => offlineManager.getQueueStatus();
  const clearQueue = () => offlineManager.clearQueue();
  const getQueue = () => offlineManager.getQueue();

  return {
    enqueue,
    getStatus,
    clearQueue,
    getQueue,
  };
}
