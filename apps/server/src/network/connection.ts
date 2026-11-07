import { randomUUID } from 'node:crypto';
import type { RawData, WebSocket } from 'ws';
import { z } from 'zod';
import type { ClientMessage, ErrorCode, ServerMessage } from '@horizon/shared';
import {
  MAX_MESSAGES_PER_SECOND,
  MAX_INPUTS_PER_SECOND,
  PROTOCOL_VERSION,
  clientMessageSchema,
} from '@horizon/shared';
import { RateLimiter } from '../security/rateLimit.js';
import type { Logger } from '../core/logger.js';

export class Connection {
  readonly id = randomUUID();
  readonly createdAt = Date.now();
  ws: WebSocket;
  playerId: string | null = null;
  roomId: string | null = null;
  token: string | null = null;
  isAlive = true;
  lastSeen = Date.now();
  closed = false;

  private readonly messageLimiter = new RateLimiter(MAX_MESSAGES_PER_SECOND);
  readonly inputLimiter = new RateLimiter(MAX_INPUTS_PER_SECOND);
  private lastRateLimitNotice = 0;

  onMessage: ((connection: Connection, message: ClientMessage) => void) | null = null;
  onClose: ((connection: Connection) => void) | null = null;

  constructor(
    ws: WebSocket,
    private readonly logger: Logger,
  ) {
    this.ws = ws;
    ws.on('message', (data: RawData) => this.handleRaw(data));
    ws.on('pong', () => {
      this.isAlive = true;
    });
    ws.on('close', () => {
      this.closed = true;
      this.onClose?.(this);
    });
    ws.on('error', (error) => {
      this.logger.debug('websocket error', { id: this.id, error: String(error) });
    });
  }

  private handleRaw(raw: RawData): void {
    this.lastSeen = Date.now();
    const now = Date.now();
    if (!this.messageLimiter.allow(now)) {
      if (now - this.lastRateLimitNotice > 1000) {
        this.lastRateLimitNotice = now;
        this.sendError('RATE_LIMITED', 'Too many messages');
      }
      return;
    }

    let text: string;
    try {
      text = typeof raw === 'string' ? raw : raw.toString('utf8');
    } catch {
      this.sendError('INVALID_PAYLOAD', 'Unreadable message');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.sendError('INVALID_PAYLOAD', 'Malformed JSON');
      return;
    }

    if (parsed && typeof parsed === 'object' && 'v' in parsed && (parsed as { v: unknown }).v !== PROTOCOL_VERSION) {
      this.sendError('PROTOCOL_MISMATCH', 'Protocol version mismatch');
      return;
    }

    const result = clientMessageSchema.safeParse(parsed);
    if (!result.success) {
      this.sendError('INVALID_PAYLOAD', summarizeZodError(result.error));
      return;
    }

    try {
      this.onMessage?.(this, result.data as ClientMessage);
    } catch (error) {
      this.logger.error('message handler failed', { id: this.id, error: String(error) });
      this.sendError('INVALID_PAYLOAD', 'Message could not be processed');
    }
  }

  send(message: ServerMessage): void {
    if (this.closed || this.ws.readyState !== 1) return;
    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      this.logger.debug('send failed', { id: this.id, error: String(error) });
    }
  }

  sendError(code: ErrorCode, message: string): void {
    this.send({ v: 1, t: 'room:error', code, message });
  }

  close(code = 1000, reason = 'closed'): void {
    this.closed = true;
    try {
      this.ws.close(code, reason);
    } catch {
      /* ignore */
    }
  }
}

function summarizeZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Invalid payload';
  return `Invalid payload: ${first.path.join('.') || 'root'} ${first.message}`.slice(0, 160);
}
