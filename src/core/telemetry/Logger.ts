import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';
export type LogOutput = 'console' | 'file' | 'both';

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  output: LogOutput;
  filePath: string;
}

function sanitizeLogData(data: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 4) return '[TruncatedDepth]';
  if (data === null || data === undefined) return data;

  const dataType = typeof data;
  if (typeof data === 'string') {
    return data.length > 500 ? `${data.slice(0, 500)}...[truncated]` : data;
  }

  if (dataType === 'number' || dataType === 'boolean') return data;
  if (dataType === 'bigint') return `${data.toString()}n`;
  if (dataType === 'function') return '[Function]';
  if (dataType === 'symbol') return '[Symbol]';

  if (Array.isArray(data)) {
    return data.slice(0, 100).map((item) => sanitizeLogData(item, depth + 1, seen));
  }

  if (dataType === 'object') {
    const obj = data as Record<string, unknown>;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    const redacted: Record<string, unknown> = {};
    const sensitiveKeyPattern = /(password|secret|token|apikey|api_key|authorization|cookie|session|credential|privatekey|private_key)/i;
    const keys = Object.keys(obj).slice(0, 100);

    for (const key of keys) {
      if (sensitiveKeyPattern.test(key)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = sanitizeLogData(obj[key], depth + 1, seen);
      }
    }

    seen.delete(obj);
    return redacted;
  }

  return '[UnsupportedType]';
}

export class Logger {
  constructor(private readonly config: LoggerConfig) {}

  private ensureLogDirectoryExists(filePath: string): void {
    const directory = dirname(filePath);
    if (!directory || directory === '.') return;
    mkdirSync(directory, { recursive: true });
  }

  log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.config.enabled) return;

    const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];
    const currentLevelIndex = logLevels.indexOf(this.config.level);
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex < currentLevelIndex) return;

    const timestamp = new Date().toISOString();
    let serializedData = '';

    if (data !== undefined) {
      try {
        serializedData = ` ${JSON.stringify(sanitizeLogData(data))}`;
      } catch {
        serializedData = ' [UnserializableData]';
      }
    }

    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${serializedData}`;

    if (this.config.output === 'console' || this.config.output === 'both') {
      console.log(logMessage);
    }

    if (this.config.output === 'file' || this.config.output === 'both') {
      this.ensureLogDirectoryExists(this.config.filePath);
      appendFileSync(this.config.filePath, `${logMessage}\n`, 'utf8');
    }
  }
}
