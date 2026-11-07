import { shouldLog } from '../config.js';
import type { LogLevel } from '../types.js';

export class Logger {
  constructor(private readonly level: LogLevel = 'info') {}

  private emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!shouldLog(level, this.level)) return;
    const time = new Date().toISOString();
    const suffix = data && Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
    const line = `[${time}] ${level.toUpperCase().padEnd(5)} ${message}${suffix}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.emit('error', message, data);
  }
  warn(message: string, data?: Record<string, unknown>): void {
    this.emit('warn', message, data);
  }
  info(message: string, data?: Record<string, unknown>): void {
    this.emit('info', message, data);
  }
  debug(message: string, data?: Record<string, unknown>): void {
    this.emit('debug', message, data);
  }
}
