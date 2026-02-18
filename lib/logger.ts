/**
 * Structured logging utility for production environments.
 * Replaces console.* with JSON-formatted logs suitable for log aggregation.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  env: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (isProduction ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatLog(entry: LogEntry): string {
  if (isDevelopment) {
    // Pretty-print in development
    const { timestamp, level, message, ...rest } = entry;
    const prefix = `[${timestamp}] ${level.toUpperCase().padEnd(5)} `;
    const restStr = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
    return `${prefix}${message}${restStr}`;
  }
  // JSON in production for log aggregation
  return JSON.stringify(entry);
}

function createLogEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'myshop-admin',
    env: process.env.NODE_ENV || 'development',
    ...meta,
  };
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  
  const entry = createLogEntry(level, message, meta);
  const formatted = formatLog(entry);
  
  // Use appropriate console method
  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  
  /** Log an API request */
  request: (method: string, path: string, meta?: Record<string, unknown>) => {
    log('info', `${method} ${path}`, { type: 'request', method, path, ...meta });
  },
  
  /** Log an API response */
  response: (method: string, path: string, status: number, duration: number, meta?: Record<string, unknown>) => {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    log(level, `${method} ${path} ${status}`, { 
      type: 'response', 
      method, 
      path, 
      status, 
      durationMs: duration,
      ...meta 
    });
  },
  
  /** Log an error with stack trace */
  exception: (error: Error, context?: string, meta?: Record<string, unknown>) => {
    log('error', `${context ? `${context}: ` : ''}${error.message}`, {
      type: 'exception',
      errorName: error.name,
      errorMessage: error.message,
      stack: isProduction ? undefined : error.stack,
      ...meta,
    });
  },
};

// Export default for convenience
export default logger;