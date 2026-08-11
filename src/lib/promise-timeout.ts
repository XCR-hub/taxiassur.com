export class RequestTimeoutError extends Error {
  constructor(message = 'Le service met trop de temps à répondre. Veuillez réessayer.') {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

export function withTimeout<T>(request: PromiseLike<T>, timeoutMs = 15_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new RequestTimeoutError()), timeoutMs);

    Promise.resolve(request).then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
