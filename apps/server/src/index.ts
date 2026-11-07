import http from 'node:http';
import { WebSocketServer } from 'ws';
import { PROTOCOL_VERSION } from '@horizon/shared';
import { loadConfig } from './config.js';
import { Logger } from './core/logger.js';
import { Metrics } from './core/metrics.js';
import { Connection } from './network/connection.js';
import { Room } from './rooms/room.js';
import { simulateRoom } from './simulation/simulator.js';
import { buildSnapshot } from './simulation/snapshot.js';
import { activateAbility } from './abilities/abilities.js';
import { sanitizeDisplayName, sanitizeRoomId, uniqueDisplayName } from './validation/sanitize.js';
import type { ClientMessage } from '@horizon/shared';

const config = loadConfig();
const logger = new Logger(config.logLevel);
const metrics = new Metrics();

const rooms = new Map<string, Room>();
const connections = new Map<string, Connection>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(id) ? generateRoomId() : id;
}

const server = http.createServer((req, res) => {
  // Simple CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        version: PROTOCOL_VERSION,
        rooms: rooms.size,
        connections: connections.size,
        metrics: metrics.snapshot(),
      }),
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Project Horizon Game Server');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const conn = new Connection(ws, logger);
  connections.set(conn.id, conn);
  metrics.inc('connections_total');

  conn.onMessage = (c, msg) => handleMessage(c, msg);

  conn.onClose = (c) => {
    connections.delete(c.id);
    handleDisconnect(c);
  };
});

function handleDisconnect(conn: Connection) {
  if (!conn.roomId || !conn.playerId) return;
  const room = rooms.get(conn.roomId);
  if (!room) return;

  const player = room.players.get(conn.playerId);
  if (player && player.connection === conn) {
    player.connected = false;
    player.disconnectedAt = Date.now();
    player.connection = null;
    player.resetInput();

    logger.info(`Player disconnected: ${player.displayName} (${player.id}) from room ${room.id}`);
    room.broadcast({
      v: PROTOCOL_VERSION,
      t: 'player:left',
      playerId: player.id,
      displayName: player.displayName,
    });

    if (room.hostId === player.id) {
      room.migrateHost();
      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'room:updated',
        room: room.toDTO(),
      });
    }

    if (room.connectedCount === 0) {
      room.emptySince = Date.now();
    }
  }
}

function handleMessage(conn: Connection, msg: ClientMessage) {
  switch (msg.t) {
    case 'ping': {
      conn.send({
        v: PROTOCOL_VERSION,
        t: 'pong',
        clientTime: msg.clientTime,
        serverTime: Date.now(),
      });
      break;
    }

    case 'room:create': {
      const name = sanitizeDisplayName(msg.name);
      if (!name) {
        conn.sendError('INVALID_NAME', 'Invalid display name');
        return;
      }

      const roomId = generateRoomId();
      const room = new Room(roomId, {
        mode: msg.mode ?? 'arcade-race',
        laps: msg.laps ?? 2,
      });

      const player = room.addPlayer(name, msg.color, msg.carId);
      player.connection = conn;
      conn.playerId = player.id;
      conn.roomId = room.id;
      conn.token = player.token;

      rooms.set(roomId, room);
      logger.info(`Room created: ${roomId} by ${name} (${player.id})`);

      conn.send({
        v: PROTOCOL_VERSION,
        t: 'room:created',
        roomId: room.id,
        playerId: player.id,
        token: player.token,
        room: room.toDTO(),
      });
      break;
    }

    case 'room:join': {
      const roomId = sanitizeRoomId(msg.roomId);
      if (!roomId) {
        conn.sendError('INVALID_ROOM_ID', 'Invalid Room ID format');
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        conn.sendError('ROOM_NOT_FOUND', 'Room not found');
        return;
      }

      // Check reconnect token first
      if (msg.token) {
        const existingPlayer = room.findPlayerByToken(msg.token);
        if (existingPlayer) {
          existingPlayer.connection = conn;
          existingPlayer.connected = true;
          existingPlayer.disconnectedAt = 0;
          conn.playerId = existingPlayer.id;
          conn.roomId = room.id;
          conn.token = existingPlayer.token;

          logger.info(`Player reconnected: ${existingPlayer.displayName} (${existingPlayer.id}) to room ${room.id}`);

          conn.send({
            v: PROTOCOL_VERSION,
            t: 'room:joined',
            playerId: existingPlayer.id,
            token: existingPlayer.token,
            room: room.toDTO(),
            resumed: true,
          });

          room.broadcast({
            v: PROTOCOL_VERSION,
            t: 'player:reconnected',
            playerId: existingPlayer.id,
            displayName: existingPlayer.displayName,
          });
          room.broadcast({
            v: PROTOCOL_VERSION,
            t: 'room:updated',
            room: room.toDTO(),
          });
          return;
        }
      }

      // New join validation
      if (room.players.size >= room.config.maxPlayers) {
        conn.sendError('ROOM_FULL', 'Room is full (max 8 players)');
        return;
      }

      if (room.phase !== 'lobby') {
        conn.sendError('GAME_ALREADY_STARTED', 'Game is already in progress');
        return;
      }

      const rawName = sanitizeDisplayName(msg.name);
      if (!rawName) {
        conn.sendError('INVALID_NAME', 'Invalid display name');
        return;
      }

      const existingNames = [...room.players.values()].map((p) => p.displayName);
      const name = uniqueDisplayName(rawName, existingNames);

      const player = room.addPlayer(name, msg.color, msg.carId);
      player.connection = conn;
      conn.playerId = player.id;
      conn.roomId = room.id;
      conn.token = player.token;

      logger.info(`Player joined: ${name} (${player.id}) to room ${room.id}`);

      conn.send({
        v: PROTOCOL_VERSION,
        t: 'room:joined',
        playerId: player.id,
        token: player.token,
        room: room.toDTO(),
        resumed: false,
      });

      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'room:updated',
        room: room.toDTO(),
      });
      break;
    }

    case 'room:leave': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room) return;

      const removed = room.removePlayer(conn.playerId);
      conn.roomId = null;
      conn.playerId = null;
      conn.token = null;

      if (removed) {
        logger.info(`Player left: ${removed.displayName} from room ${room.id}`);
        room.broadcast({
          v: PROTOCOL_VERSION,
          t: 'player:left',
          playerId: removed.id,
          displayName: removed.displayName,
        });
        room.broadcast({
          v: PROTOCOL_VERSION,
          t: 'room:updated',
          room: room.toDTO(),
        });
      }
      break;
    }

    case 'room:config': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room) return;

      if (room.hostId !== conn.playerId) {
        conn.sendError('NOT_HOST', 'Only host can change configuration');
        return;
      }
      if (room.phase !== 'lobby') {
        conn.sendError('INVALID_STATE', 'Configuration can only be updated in lobby');
        return;
      }

      room.updateConfig({ mode: msg.mode, laps: msg.laps });
      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'room:updated',
        room: room.toDTO(),
      });
      break;
    }

    case 'player:update': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room) return;
      const player = room.players.get(conn.playerId);
      if (!player) return;

      if (typeof msg.ready === 'boolean' && player.id !== room.hostId) {
        player.ready = msg.ready;
      }
      if (msg.carId) player.carId = msg.carId;
      if (msg.color) player.color = msg.color;
      if (msg.name) {
        const cleanName = sanitizeDisplayName(msg.name);
        if (cleanName) player.displayName = cleanName;
      }

      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'room:updated',
        room: room.toDTO(),
      });
      break;
    }

    case 'game:start': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room) return;

      if (room.hostId !== conn.playerId) {
        conn.sendError('NOT_HOST', 'Only host can start the game');
        return;
      }

      if (room.phase !== 'lobby') {
        conn.sendError('INVALID_STATE', 'Game already started');
        return;
      }

      // Check non-host ready
      if (!room.allNonHostReady()) {
        conn.sendError('NOT_READY', 'All players must be ready before starting');
        return;
      }

      const now = Date.now();
      room.startCountdown(now);

      const grid = room.grid;
      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'game:starting',
        countdownMs: 3500,
        startAt: room.race?.countdownEndsAt ?? (now + 3500),
        config: room.config,
        map: { id: room.map.id, seed: room.map.seed },
        grid,
      });

      logger.info(`Game starting in room ${room.id} mode ${room.config.mode}`);
      break;
    }

    case 'game:rematch': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room) return;

      if (room.hostId !== conn.playerId) {
        conn.sendError('NOT_HOST', 'Only host can trigger rematch');
        return;
      }

      const now = Date.now();
      room.startCountdown(now);
      const grid = room.grid;

      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'game:starting',
        countdownMs: 3500,
        startAt: room.race?.countdownEndsAt ?? (now + 3500),
        config: room.config,
        map: { id: room.map.id, seed: room.map.seed },
        grid,
      });
      break;
    }

    case 'game:lobby': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room) return;

      if (room.hostId !== conn.playerId) {
        conn.sendError('NOT_HOST', 'Only host can return to lobby');
        return;
      }

      room.resetToLobby();
      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'room:updated',
        room: room.toDTO(),
      });
      break;
    }

    case 'vehicle:input': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room || room.phase !== 'playing') return;

      const player = room.players.get(conn.playerId);
      if (!player) return;

      if (msg.seq > player.lastInputSeq) {
        player.lastInputSeq = msg.seq;
        player.input = {
          seq: msg.seq,
          throttle: msg.throttle,
          steering: msg.steering,
          brake: msg.brake,
          drift: msg.drift,
          nitro: msg.nitro,
        };
        player.lastInputAt = Date.now();
      }
      break;
    }

    case 'ability:use': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room) return;

      const player = room.players.get(conn.playerId);
      if (!player) return;

      const res = activateAbility(room, player, Date.now());
      if (!res.ok && res.code && res.message) {
        conn.sendError(res.code, res.message);
      }
      break;
    }

    case 'player:respawn': {
      if (!conn.roomId || !conn.playerId) return;
      const room = rooms.get(conn.roomId);
      if (!room || room.phase !== 'playing') return;

      const player = room.players.get(conn.playerId);
      if (!player) return;

      const now = Date.now();
      if (now - player.lastRespawnAt < 3000) return;
      player.lastRespawnAt = now;

      // Find safe point along road
      const s = player.progress.s;
      const point = room.track.pointAt(s);
      const yaw = Math.atan2(point.tx, point.tz);

      player.state.x = point.x;
      player.state.y = point.y + 0.6;
      player.state.z = point.z;
      player.state.yaw = yaw;
      player.state.vx = 0;
      player.state.vz = 0;
      player.state.speed = 0;
      player.state.steer = 0;
      player.state.drift = false;
      player.state.offRoad = false;

      room.emit('respawn', player, { x: point.x, y: point.y, z: point.z });
      break;
    }
  }
}

// 30 Hz simulation loop
const SIM_TICK_RATE = 30;
const SIM_INTERVAL = 1000 / SIM_TICK_RATE;
// 15 Hz snapshot broadcast (every 2 simulation ticks)
let snapshotCounter = 0;

setInterval(() => {
  const now = Date.now();
  snapshotCounter++;
  const shouldBroadcast = snapshotCounter % 2 === 0;

  for (const [roomId, room] of rooms.entries()) {
    // Check countdown completion
    if (room.phase === 'countdown' && room.race && now >= room.race.countdownEndsAt) {
      room.phase = 'playing';
      room.race.phase = 'racing';
      room.race.startTime = now;
      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'game:started',
        serverTime: now,
        config: room.config,
        map: { id: room.map.id, seed: room.map.seed },
        grid: room.grid,
      });
      room.emit('countdown-go', room.sortedPlayers()[0] ?? ({} as any), { x: 0, y: 0, z: 0 });
    }

    // Simulate physics & world
    if (room.phase === 'playing') {
      room.tickCount++;
      const result = simulateRoom(room, now);

      if (result.raceFinished && room.race && room.race.results) {
        room.phase = 'results';
        room.broadcast({
          v: PROTOCOL_VERSION,
          t: 'race:results',
          raceId: room.race.id,
          laps: room.race.laps,
          results: room.race.results,
        });
      }
    }

    // Flush any pending world events
    room.flushEvents();

    // Broadcast snapshots
    if (shouldBroadcast && (room.phase === 'playing' || room.phase === 'countdown')) {
      const snap = buildSnapshot(room, room.tickCount, now);
      room.broadcast({
        v: PROTOCOL_VERSION,
        t: 'world:snapshot',
        snapshot: snap,
      });
    }

    // Empty room timeout (60s)
    if (room.emptySince && now - room.emptySince > 60_000) {
      logger.info(`Closing empty room ${roomId}`);
      rooms.delete(roomId);
    }
  }
}, SIM_INTERVAL);

server.listen(config.port, config.host, () => {
  logger.info(`Project Horizon Server listening on http://${config.host}:${config.port}`);
  logger.info(`WebSocket endpoint available at ws://${config.host}:${config.port}${config.wsPath}`);
});

