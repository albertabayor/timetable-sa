/**
 * Logging utility for the timetable scheduler
 * Supports console and file output with configurable log levels
 */

import * as fs from "fs";
import * as path from "path";
import { LoggingConfig, LogLevel, LogOutput } from "../types/index.js";

export class Logger {
  private config: Required<LoggingConfig>;
  private fileStream?: fs.WriteStream;
  private logLevelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4,
  };

  constructor(config?: LoggingConfig) {
    // Default configuration
    this.config = {
      enabled: config?.enabled ?? true,
      level: config?.level ?? "info",
      output: config?.output ?? "console",
      filePath: config?.filePath ?? "./timetable-scheduler.log",
      includeTimestamp: config?.includeTimestamp ?? true,
      includeLevel: config?.includeLevel ?? true,
    };

    // Initialize file stream if needed
    if (
      this.config.enabled &&
      (this.config.output === "file" || this.config.output === "both")
    ) {
      this.initializeFileStream();
    }
  }

  private initializeFileStream(): void {
    try {
      const dir = path.dirname(this.config.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.fileStream = fs.createWriteStream(this.config.filePath, {
        flags: "a",
      });

      this.fileStream.on("error", (err) => {
        console.error(`Logger: Failed to write to file: ${err.message}`);
      });
    } catch (error) {
      console.error(`Logger: Failed to initialize file stream:`, error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled || this.config.level === "none") {
      return false;
    }

    const currentPriority = this.logLevelPriority[level];
    const configPriority = this.logLevelPriority[this.config.level];

    return currentPriority !== undefined && configPriority !== undefined && currentPriority >= configPriority;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.config.includeLevel) {
      parts.push(`[${level.toUpperCase()}]`);
    }

    parts.push(message);

    let formatted = parts.join(" ");

    if (data !== undefined) {
      if (typeof data === "object") {
        formatted += "\n" + JSON.stringify(data, null, 2);
      } else {
        formatted += ` ${data}`;
      }
    }

    return formatted;
  }

  private write(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, data);

    // Console output
    if (
      this.config.output === "console" ||
      this.config.output === "both"
    ) {
      switch (level) {
        case "error":
          console.error(formatted);
          break;
        case "warn":
          console.warn(formatted);
          break;
        case "info":
          console.info(formatted);
          break;
        case "debug":
          console.debug(formatted);
          break;
      }
    }

    // File output
    if (
      (this.config.output === "file" || this.config.output === "both") &&
      this.fileStream
    ) {
      this.fileStream.write(formatted + "\n");
    }
  }

  debug(message: string, data?: any): void {
    this.write("debug", message, data);
  }

  info(message: string, data?: any): void {
    this.write("info", message, data);
  }

  warn(message: string, data?: any): void {
    this.write("warn", message, data);
  }

  error(message: string, data?: any): void {
    this.write("error", message, data);
  }

  /**
   * Log algorithm progress
   */
  logProgress(data: {
    iteration: number;
    temperature: number;
    currentFitness: number;
    bestFitness: number;
    hardViolations: number;
    phase?: number;
  }): void {
    this.debug("Algorithm progress", data);
  }

  /**
   * Log constraint violation
   */
  logViolation(data: {
    constraintType: string;
    severity: "hard" | "soft";
    classId: string;
    reason: string;
  }): void {
    this.debug("Constraint violation", data);
  }

  /**
   * Log phase transition
   */
  logPhaseChange(phase: number, description: string): void {
    this.info(`=== PHASE ${phase}: ${description} ===`);
  }

  /**
   * Log operator statistics
   */
  logOperatorStats(data: {
    operator: string;
    attempts: number;
    improvements: number;
    successRate: number;
  }): void {
    this.info("Operator statistics", data);
  }

  /**
   * Close the file stream
   */
  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
    }
  }
}

/**
 * Create a default logger instance
 */
export function createLogger(config?: LoggingConfig): Logger {
  return new Logger(config);
}
