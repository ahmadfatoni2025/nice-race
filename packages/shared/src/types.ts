/** Cross-platform protocol and gameplay data types (PRD section 18). */

export type GameMode = 'free-drive' | 'arcade-race';
export type RoomPhase = 'lobby' | 'countdown' | 'playing' | 'results';
export type RacePhase = 'countdown' | 'racing' | 'finished';
export type AbilityType = 'nitro' | 'shield' | 'shockwave' | 'mine';

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NOT_HOST'
  | 'INVALID_PAYLOAD'
  | 'GAME_ALREADY_STARTED'
  | 'INVALID_ABILITY'
  | 'RATE_LIMITED'
  | 'SESSION_EXPIRED'
  | 'NOT_IN_ROOM'
  | 'INVALID_ROOM_ID'
  | 'INVALID_NAME'
  | 'NAME_TAKEN'
  | 'NOT_READY'
  | 'INVALID_STATE'
  | 'PROTOCOL_MISMATCH'
  | 'SERVER_FULL';

export interface PlayerPublic {
  id: string;
  displayName: string;
  carId: string;
  color: string;
  ready: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface RoomConfig {
  mode: GameMode;
  maxPlayers: number;
  mapId: string;
  mapSeed: number;
  laps: number;
}

export interface RoomDTO {
  id: string;
  phase: RoomPhase;
  config: RoomConfig;
  hostId: string | null;
  players: PlayerPublic[];
  createdAt: number;
}

export interface VehicleInput {
  seq: number;
  throttle: number;
  steering: number;
  brake: boolean;
  drift: boolean;
  nitro: boolean;
}

export interface PlayerSnapshot {
  id: string;
  seq: number;
  /** position [x, y, z] */
  p: [number, number, number];
  /** rotation quaternion [x, y, z, w] */
  q: [number, number, number, number];
  /** velocity [x, y, z] */
  vel: [number, number, number];
  speed: number;
  drift: boolean;
  nitro: boolean;
  shield: boolean;
  stunned: boolean;
  ability: AbilityType | null;
  connected: boolean;
}

export interface PickupSnapshot {
  id: number;
  active: boolean;
}

export interface MineSnapshot {
  id: string;
  p: [number, number, number];
  armAt: number;
  expiresAt: number;
  ownerId: string;
}

export interface RacePlayerSnapshot {
  id: string;
  lap: number;
  checkpoint: number;
  lapsDone: number;
  s: number;
  progress: number;
  rank: number;
  finished: boolean;
  finishTimeMs: number;
  lapTimeMs: number;
  bestLapMs: number;
}

export interface RaceSnapshot {
  phase: RacePhase;
  countdownEndsAt: number;
  startTime: number;
  now: number;
  timeMs: number;
  laps: number;
  players: RacePlayerSnapshot[];
}

export interface WorldSnapshot {
  tick: number;
  serverTime: number;
  players: PlayerSnapshot[];
  pickups: PickupSnapshot[];
  mines: MineSnapshot[];
  race: RaceSnapshot | null;
}

export interface GridSlot {
  playerId: string;
  p: [number, number, number];
  yaw: number;
}

export type WorldEventType =
  | 'nitro'
  | 'shield'
  | 'shockwave'
  | 'mine-drop'
  | 'mine-hit'
  | 'pickup'
  | 'checkpoint'
  | 'lap'
  | 'finish'
  | 'respawn'
  | 'blocked'
  | 'countdown-go';

export interface WorldEvent {
  id: number;
  type: WorldEventType;
  playerId: string;
  targetId?: string;
  p: [number, number, number];
  serverTime: number;
  ability?: AbilityType;
}

export interface RaceResult {
  playerId: string;
  displayName: string;
  carId: string;
  color: string;
  rank: number;
  finished: boolean;
  finishTimeMs: number;
  bestLapMs: number;
  lapsDone: number;
  totalLaps: number;
}

/* ------------------------------------------------------------------ */
/* Client -> Server messages                                          */
/* ------------------------------------------------------------------ */

export interface ClientMessageBase {
  v: number;
  t: string;
}

export type ClientMessage =
  | {
      v: number;
      t: 'room:create';
      name: string;
      mode?: GameMode;
      laps?: number;
      carId?: string;
      color?: string;
    }
  | {
      v: number;
      t: 'room:join';
      roomId: string;
      name: string;
      token?: string;
      carId?: string;
      color?: string;
    }
  | { v: number; t: 'room:leave' }
  | { v: number; t: 'room:config'; mode?: GameMode; laps?: number }
  | {
      v: number;
      t: 'player:update';
      ready?: boolean;
      carId?: string;
      color?: string;
      name?: string;
    }
  | { v: number; t: 'game:start' }
  | { v: number; t: 'game:rematch' }
  | { v: number; t: 'game:lobby' }
  | {
      v: number;
      t: 'vehicle:input';
      seq: number;
      throttle: number;
      steering: number;
      brake: boolean;
      drift: boolean;
      nitro: boolean;
    }
  | { v: number; t: 'ability:use'; seq: number }
  | { v: number; t: 'player:respawn' }
  | { v: number; t: 'ping'; clientTime: number };

/* ------------------------------------------------------------------ */
/* Server -> Client messages                                          */
/* ------------------------------------------------------------------ */

export type ServerMessage =
  | {
      v: number;
      t: 'room:created';
      roomId: string;
      playerId: string;
      token: string;
      room: RoomDTO;
    }
  | {
      v: number;
      t: 'room:joined';
      playerId: string;
      token: string;
      room: RoomDTO;
      resumed: boolean;
    }
  | { v: number; t: 'room:updated'; room: RoomDTO }
  | { v: number; t: 'room:error'; code: ErrorCode; message: string }
  | {
      v: number;
      t: 'game:starting';
      countdownMs: number;
      startAt: number;
      config: RoomConfig;
      map: { id: string; seed: number };
      grid: GridSlot[];
    }
  | {
      v: number;
      t: 'game:started';
      serverTime: number;
      config: RoomConfig;
      map: { id: string; seed: number };
      grid: GridSlot[];
    }
  | { v: number; t: 'world:snapshot'; snapshot: WorldSnapshot }
  | { v: number; t: 'world:event'; event: WorldEvent }
  | {
      v: number;
      t: 'race:results';
      raceId: string;
      laps: number;
      results: RaceResult[];
    }
  | { v: number; t: 'player:left'; playerId: string; displayName: string }
  | { v: number; t: 'player:reconnected'; playerId: string; displayName: string }
  | { v: number; t: 'pong'; clientTime: number; serverTime: number }
  | { v: number; t: 'session:expired' }
  | { v: number; t: 'server:notice'; code: string; message: string };

export interface CarConfig {
  id: string;
  name: string;
  tagline: string;
  maxSpeed: number;
  acceleration: number;
  reverseSpeed: number;
  brakeForce: number;
  steeringResponse: number;
  grip: number;
  driftGrip: number;
  driftFactor: number;
  nitroForce: number;
  nitroDuration: number;
  turnRate: number;
  nitroMaxMultiplier: number;
  /** cosmetic */
  accent: string;
}

export interface MapPickup {
  id: number;
  s: number;
  lateral: number;
  x: number;
  y: number;
  z: number;
}

export interface MapDefinition {
  id: string;
  seed: number;
  name: string;
  roadWidth: number;
  track: TrackDefinition;
  checkpointFractions: number[];
  pickupFractions: number[];
  lake: { x: number; z: number; radius: number; waterY: number };
  startLineFraction: number;
  environment: {
    fogColor: string;
    skyTop: string;
    skyHorizon: string;
    sunColor: string;
    groundLow: string;
    groundHigh: string;
    rockColor: string;
    treeColor: string;
    treeColorAlt: string;
    snowColor: string;
  };
}

export interface TrackDefinition {
  /** Closed loop control points [x, y, z]. */
  points: [number, number, number][];
  /** Samples per control segment used for rendering/physics lookups. */
  subdivisions: number;
}

export interface TrackSamplePoint {
  x: number;
  y: number;
  z: number;
  s: number;
  tx: number;
  tz: number;
}

export interface NearestTrackPoint {
  s: number;
  dist: number;
  x: number;
  y: number;
  z: number;
  tx: number;
  tz: number;
}
