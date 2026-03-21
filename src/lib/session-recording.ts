interface RecordingEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

class SessionRecorder {
  private events: RecordingEvent[] = [];
  private isRecording = false;
  private sessionId: string = '';
  private flushInterval: NodeJS.Timeout | null = null;

  start(sessionId?: string) {
    if (this.isRecording) return;

    this.sessionId = sessionId || this.generateSessionId();
    this.isRecording = true;
    this.events = [];

    this.setupEventListeners();
    this.startAutoFlush();

    this.recordEvent('session_start', {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
  }

  stop() {
    if (!this.isRecording) return;

    this.recordEvent('session_end', {
      duration: this.getSessionDuration(),
    });

    this.flush();
    this.cleanup();
    this.isRecording = false;
  }

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventListeners() {
    document.addEventListener('click', this.handleClick);
    document.addEventListener('scroll', this.handleScroll);
    document.addEventListener('input', this.handleInput);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('popstate', this.handleNavigation);
  }

  private cleanup() {
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('input', this.handleInput);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('popstate', this.handleNavigation);

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    this.recordEvent('click', {
      x: e.clientX,
      y: e.clientY,
      element: this.getElementPath(target),
      text: target.textContent?.slice(0, 50),
    });
  };

  private handleScroll = () => {
    this.recordEvent('scroll', {
      x: window.scrollX,
      y: window.scrollY,
    });
  };

  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.recordEvent('input', {
      element: this.getElementPath(target),
      type: target.type,
      name: target.name,
    });
  };

  private handleResize = () => {
    this.recordEvent('resize', {
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  private handleNavigation = () => {
    this.recordEvent('navigation', {
      url: window.location.href,
    });
  };

  private getElementPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        selector += `.${Array.from(current.classList).join('.')}`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  private recordEvent(type: string, data: Record<string, unknown>) {
    this.events.push({
      type,
      timestamp: Date.now(),
      data,
    });

    if (this.events.length >= 50) {
      this.flush();
    }
  }

  private startAutoFlush() {
    this.flushInterval = setInterval(() => {
      if (this.events.length > 0) {
        this.flush();
      }
    }, 10000);
  }

  private async flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch('/api/session-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          events: eventsToSend,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send session recording:', error);
      this.events.unshift(...eventsToSend);
    }
  }

  private getSessionDuration(): number {
    if (this.events.length === 0) return 0;
    const firstEvent = this.events[0];
    const lastEvent = this.events[this.events.length - 1];
    return lastEvent.timestamp - firstEvent.timestamp;
  }
}

export const sessionRecorder = new SessionRecorder();

export function initializeSessionRecording(enabled: boolean = true) {
  if (enabled && typeof window !== 'undefined') {
    sessionRecorder.start();

    window.addEventListener('beforeunload', () => {
      sessionRecorder.stop();
    });
  }
}
