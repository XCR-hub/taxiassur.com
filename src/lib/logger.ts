type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface Logger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

const noop = () => {};

const createConditionalLogger = (level: LogLevel): ((...args: any[]) => void) => {
  if (level === 'error') {
    return console.error.bind(console);
  }

  if (level === 'warn' && isProduction) {
    return console.warn.bind(console);
  }

  if (isDevelopment) {
    return console[level].bind(console);
  }

  return noop;
};

export const logger: Logger = {
  log: createConditionalLogger('log'),
  warn: createConditionalLogger('warn'),
  error: createConditionalLogger('error'),
  info: createConditionalLogger('info'),
  debug: createConditionalLogger('debug'),
};

export default logger;
