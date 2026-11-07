import type { LogLevel } from './types.js';

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  clientOrigins: string[];
  logLevel: LogLevel;
  wsPath: string;
}

const LOG_LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const origins = (env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '0.0.0.0',
    nodeEnv: env.NODE_ENV ?? 'development',
    clientOrigins: origins,
    logLevel: (env.LOG_LEVEL as LogLevel) ?? 'info',
    wsPath: env.WS_PATH ?? '/ws',
  };
}

export function isLogLevel(value: string): value is LogLevel {
  return value in LOG_LEVELS;
}

export function shouldLog(level: LogLevel, configured: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[configured];
}
