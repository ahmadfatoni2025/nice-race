import type {
  ClientMessage,
  ServerMessage,
  WorldSnapshot,
  WorldEvent,
  RoomDTO,
  GridSlot,
  RoomConfig,
  RaceResult,
  ErrorCode,
} from '@horizon/shared';
import { PROTOCOL_VERSION } from '@horizon/shared';

export type NetworkEventMap = {
  connected: () => void;
  disconnected: () => void;
  roomCreated: (data: { roomId: string; playerId: string; token: string; room: RoomDTO }) => void;
  roomJoined: (data: { playerId: string; token: string; room: RoomDTO; resumed: boolean }) => void;
  roomUpdated: (room: RoomDTO) => void;
  roomError: (data: { code: ErrorCode; message: string }) => void;
  gameStarting: (data: { countdownMs: number; startAt: number; config: RoomConfig; grid: GridSlot[] }) => void;
  gameStarted: (data: { serverTime: number; config: RoomConfig; grid: GridSlot[] }) => void;
  snapshot: (snap: WorldSnapshot) => void;
  worldEvent: (evt: WorldEvent) => void;
  raceResults: (results: RaceResult[]) => void;
  playerLeft: (data: { playerId: string; displayName: string }) => void;
  rttUpdate: (rttMs: number) => void;
};

type Listener<T extends keyof NetworkEventMap> = NetworkEventMap[T];

export class NetworkClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: { [K in keyof NetworkEventMap]?: Function[] } = {};
  public playerId: string | null = null;
  public token: string | null = null;
  public rtt = 0;
  private pingInterval: number | null = null;
  private isConnecting = false;

  constructor(serverUrl?: string) {
    if (serverUrl) {
      this.url = serverUrl;
    } else {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      // In dev with vite running at :5173, backend is at :3000
      const host = window.location.hostname || 'localhost';
      this.url = `${wsProtocol}//${host}:3000/ws`;
    }
  }

  public on<K extends keyof NetworkEventMap>(event: K, fn: Listener<K>) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(fn);
  }

  public off<K extends keyof NetworkEventMap>(event: K, fn: Listener<K>) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter((cb) => cb !== fn);
  }

  private emit<K extends keyof NetworkEventMap>(event: K, ...args: Parameters<NetworkEventMap[K]>) {
    const handlers = this.listeners[event];
    if (handlers) {
      handlers.forEach((h) => (h as any)(...args));
    }
  }

  public connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.isConnecting) return Promise.resolve();
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(this.url);
        this.ws = socket;

        socket.onopen = () => {
          this.isConnecting = false;
          this.emit('connected');
          this.startHeartbeat();
          resolve();
        };

        socket.onmessage = (event) => {
          this.handleRawMessage(event.data);
        };

        socket.onclose = () => {
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected');
        };

        socket.onerror = (err) => {
          this.isConnecting = false;
          console.error('[NetworkClient] WebSocket error', err);
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }

  public send(msg: ClientMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (e) {
      console.warn('[NetworkClient] send failed', e);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          v: PROTOCOL_VERSION,
          t: 'ping',
          clientTime: Date.now(),
        });
      }
    }, 4000);
  }

  private stopHeartbeat() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleRawMessage(raw: any) {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (!msg || msg.v !== PROTOCOL_VERSION) return;

    switch (msg.t) {
      case 'pong': {
        const now = Date.now();
        this.rtt = Math.max(0, now - msg.clientTime);
        this.emit('rttUpdate', this.rtt);
        break;
      }
      case 'room:created': {
        this.playerId = msg.playerId;
        this.token = msg.token;
        this.emit('roomCreated', msg);
        break;
      }
      case 'room:joined': {
        this.playerId = msg.playerId;
        this.token = msg.token;
        this.emit('roomJoined', msg);
        break;
      }
      case 'room:updated': {
        this.emit('roomUpdated', msg.room);
        break;
      }
      case 'room:error': {
        this.emit('roomError', { code: msg.code, message: msg.message });
        break;
      }
      case 'game:starting': {
        this.emit('gameStarting', msg);
        break;
      }
      case 'game:started': {
        this.emit('gameStarted', msg);
        break;
      }
      case 'world:snapshot': {
        this.emit('snapshot', msg.snapshot);
        break;
      }
      case 'world:event': {
        this.emit('worldEvent', msg.event);
        break;
      }
      case 'race:results': {
        this.emit('raceResults', msg.results);
        break;
      }
      case 'player:left': {
        this.emit('playerLeft', msg);
        break;
      }
    }
  }
}

