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

/**
 * Sanitizes arbitrary data before writing it to logs.
 *
 * This keeps log output safer and more stable by truncating oversized values,
 * redacting sensitive fields, and preventing circular recursion.
 *
 * Rules:
 * - `null` and `undefined` are returned as-is
 * - strings longer than 500 characters are truncated
 * - numbers and booleans are returned as-is
 * - bigint values are converted to strings with an `n` suffix
 * - functions become `"[Function]"`
 * - symbols become `"[Symbol]"`
 * - arrays are limited to the first 100 items and sanitized recursively
 * - objects are limited to the first 100 keys and sanitized recursively
 * - sensitive keys such as `password`, `token`, `authorization`, and `cookie`
 *   are replaced with `"[REDACTED]"`
 * - circular references become `"[Circular]"`
 * - nested values deeper than level 4 become `"[TruncatedDepth]"`
 *
 * @param data The unknown value to sanitize for safe logging.
 * @param depth The current recursion depth. Used internally to limit nesting.
 * @param seen A WeakSet used internally to detect circular object references.
 * @returns A sanitized version of the input that is safe to serialize into logs.
 *
 * @example
 * Input:
 * ```ts
 * sanitizeLogData({
 *   username: 'andi',
 *   password: 'secret123',
 *   token: 'abc123',
 * });
 * ```
 * Output:
 * ```ts
 * {
 *   username: 'andi',
 *   password: '[REDACTED]',
 *   token: '[REDACTED]',
 * }
 * ```
 *
 * @example
 * Input:
 * ```ts
 * const obj: any = { name: 'Budi' };
 * obj.self = obj;
 *
 * sanitizeLogData(obj);
 * ```
 * Output:
 * ```ts
 * {
 *   name: 'Budi',
 *   self: '[Circular]',
 * }
 * ```
 *
 * @example
 * Input:
 * ```ts
 * sanitizeLogData({
 *   level1: {
 *     level2: {
 *       level3: {
 *         level4: {
 *           level5: {
 *             message: 'too deep',
 *           },
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 * Output:
 * ```ts
 * {
 *   level1: {
 *     level2: {
 *       level3: {
 *         level4: {
 *           level5: '[TruncatedDepth]',
 *         },
 *       },
 *     },
 *   },
 * }
 * ```
 */
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

  /**
   * Writes a log entry when the logger is enabled and the message level passes
   * the configured minimum level filter.
   *
   * The log entry format is:
   * `[timestamp] [LEVEL] message {serializedData}`
   *
   * Filtering rule:
   * - if `this.config.enabled` is `false`, nothing is written
   * - if the incoming `level` is below `this.config.level`, the message is skipped
   * - if `data` is provided, it is sanitized with `sanitizeLogData(...)` before serialization
   * - the output target depends on `this.config.output`: `console`, `file`, or `both`
   *
   * Log level order:
   *
   * | Level   | Index | Meaning |
   * | ------- | ----- | ------- |
   * | `debug` | `0`   | Most verbose logging |
   * | `info`  | `1`   | General application events |
   * | `warn`  | `2`   | Recoverable issues or warnings |
   * | `error` | `3`   | Failures and error conditions |
   * | `none`  | `4`   | Disables all logging |
   *
   * Filter examples:
   *
   * | Config level | Incoming `debug` | Incoming `info` | Incoming `warn` | Incoming `error` |
   * | ------------ | ---------------- | --------------- | --------------- | ---------------- |
   * | `debug`      | written          | written         | written         | written          |
   * | `info`       | skipped          | written         | written         | written          |
   * | `warn`       | skipped          | skipped         | written         | written          |
   * | `error`      | skipped          | skipped         | skipped         | written          |
   * | `none`       | skipped          | skipped         | skipped         | skipped          |
   *
   * @param level The severity of the log message being written.
   * @param message The main log message text.
   * @param data Optional structured payload to append to the log after sanitization.
   * @returns Nothing. The method writes to the configured output target as a side effect.
   *
   * @example
   * Input:
   * ```ts
   * const logger = new Logger({
   *   enabled: true,
   *   level: 'warn',
   *   output: 'console',
   *   filePath: 'logs/app.log',
   * });
   *
   * logger.log('info', 'User signed in');
   * ```
   * Output:
   * ```ts
   * // No output, because `info` is below the configured `warn` level.
   * ```
   *
   * @example
   * Input:
   * ```ts
   * const logger = new Logger({
   *   enabled: true,
   *   level: 'info',
   *   output: 'console',
   *   filePath: 'logs/app.log',
   * });
   *
   * logger.log('error', 'Payment failed', {
   *   orderId: 42,
   *   token: 'secret-token',
   * });
   * ```
   * Output:
   * ```ts
   * [2026-05-27T10:00:00.000Z] [ERROR] Payment failed {"orderId":42,"token":"[REDACTED]"}
   * ```
   */
  log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.config.enabled) return;

    const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];

    // Example: if `this.config.level` is `warn`, the result is 2.
    const currentLevelIndex = logLevels.indexOf(this.config.level);
    
    // Example: if `level` is `info`, the result is 1.
    const messageLevelIndex = logLevels.indexOf(level);

    // Skip messages below the configured minimum log level.
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
