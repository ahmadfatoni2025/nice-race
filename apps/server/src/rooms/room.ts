import type {
  GameMode,
  GridSlot,
  PlayerPublic,
  RaceResult,
  RoomConfig,
  RoomDTO,
  RoomPhase,
  ServerMessage,
  WorldEvent,
  WorldEventType,
} from '@horizon/shared';
import {
  COUNTDOWN_MS,
  DEFAULT_LAPS,
  MAP_ID,
  MAX_PLAYERS,
  RACE_TIMEOUT_MS,
  clamp,
  createAlpineValleyMap,
  createAlpineValleyTrack,
  createRaceProgress,
  createVehicleState,
  rankOrder,
  type MapDefinition,
  type MapPickup,
  type Track,
} from '@horizon/shared';
import { Player } from '../players/player.js';

export interface RaceState {
  id: string;
  phase: 'countdown' | 'racing' | 'finished';
  countdownEndsAt: number;
  startTime: number;
  laps: number;
  finishCounter: number;
  results: RaceResult[] | null;
  timeoutAt: number;
}

export interface PickupState {
  id: number;
  active: boolean;
  respawnAt: number;
}

export interface MineState {
  id: string;
  x: number;
  y: number;
  z: number;
  ownerId: string;
  armAt: number;
  expiresAt: number;
}

export interface RoomOptions {
  mode: GameMode;
  laps?: number;
  seed?: number;
}

let raceSequence = 0;

export class Room {
  readonly id: string;
  readonly createdAt = Date.now();
  readonly map: MapDefinition;
  readonly track: Track;
  readonly checkpointS: number[];
  readonly pickupPositions: MapPickup[];

  phase: RoomPhase = 'lobby';
  config: RoomConfig;
  hostId: string | null = null;
  players = new Map<string, Player>();
  joinCounter = 0;

  race: RaceState | null = null;
  grid: GridSlot[] = [];
  pickups: PickupState[] = [];
  mines: MineState[] = [];

  tickCount = 0;
  emptySince: number | null = null;
  updatedAt = Date.now();

  events: WorldEvent[] = [];
  private eventSeq = 0;
  private mineSeq = 0;

  constructor(id: string, options: RoomOptions) {
    this.id = id;
    this.map = createAlpineValleyMap(options.seed ?? 1337);
    this.track = createAlpineValleyTrack();
    this.checkpointS = this.map.checkpointFractions.map((fraction) => fraction * this.track.length);
    this.pickupPositions = this.map.pickupFractions.map((fraction, index) => {
      const s = fraction * this.track.length;
      const p = this.track.pointAt(s);
      const rightX = p.tz;
      const rightZ = -p.tx;
      const lateral = (index % 2 === 0 ? 1 : -1) * Math.min(2.6, this.map.roadWidth * 0.2);
      return {
        id: index,
        s,
        lateral,
        x: p.x + rightX * lateral,
        y: p.y + 0.9,
        z: p.z + rightZ * lateral,
      };
    });
    this.resetPickups();
    this.config = {
      mode: options.mode,
      maxPlayers: MAX_PLAYERS,
      mapId: MAP_ID,
      mapSeed: this.map.seed,
      laps: options.mode === 'arcade-race' ? clamp(Math.round(options.laps ?? DEFAULT_LAPS), 2, 3) : 0,
    };
  }

  get size(): number {
    return this.players.size;
  }

  get connectedCount(): number {
    let count = 0;
    for (const player of this.players.values()) if (player.isConnected) count++;
    return count;
  }

  get host(): Player | null {
    return this.hostId ? this.players.get(this.hostId) ?? null : null;
  }

  sortedPlayers(): Player[] {
    return [...this.players.values()].sort((a, b) => a.joinIndex - b.joinIndex);
  }

  addPlayer(displayName: string, color?: string, carId?: string): Player {
    const index = this.joinCounter++;
    const spawn = this.spawnForIndex(index);
    const player = new Player(displayName, index, spawn, color);
    if (carId) player.carId = carId;
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.emptySince = null;
    this.touch();
    return player;
  }

  removePlayer(playerId: string): Player | null {
    const player = this.players.get(playerId);
    if (!player) return null;
    this.players.delete(playerId);
    if (this.hostId === playerId) this.migrateHost();
    if (this.players.size === 0) this.emptySince = Date.now();
    this.touch();
    return player;
  }

  findPlayerByToken(token: string): Player | null {
    if (!token) return null;
    for (const player of this.players.values()) {
      if (player.token === token) return player;
    }
    return null;
  }

  spawnForIndex(index: number): { x: number; y: number; z: number; yaw: number } {
    const slots = this.track.gridSlots(MAX_PLAYERS, this.map.roadWidth);
    return slots[index % slots.length]!;
  }

  migrateHost(): void {
    const candidates = this.sortedPlayers().filter((player) => player.isConnected);
    if (candidates.length > 0) {
      this.hostId = candidates[0]!.id;
    } else {
      const fallback = this.sortedPlayers()[0];
      this.hostId = fallback ? fallback.id : null;
    }
    this.touch();
  }

  updateConfig(partial: { mode?: GameMode; laps?: number }): void {
    if (partial.mode) {
      this.config.mode = partial.mode;
      this.config.laps = partial.mode === 'arcade-race' ? clamp(Math.round(this.config.laps || DEFAULT_LAPS), 2, 3) : 0;
    }
    if (typeof partial.laps === 'number' && this.config.mode === 'arcade-race') {
      this.config.laps = clamp(Math.round(partial.laps), 2, 3);
    }
    this.touch();
  }

  allNonHostReady(): boolean {
    for (const player of this.players.values()) {
      if (player.id === this.hostId) continue;
      if (!player.connected) continue;
      if (!player.ready) return false;
    }
    return true;
  }

  resetPickups(): void {
    this.pickups = this.map.pickupFractions.map((_, index) => ({
      id: index,
      active: true,
      respawnAt: 0,
    }));
  }

  buildGrid(): GridSlot[] {
    const players = this.sortedPlayers();
    const slots = this.track.gridSlots(players.length, this.map.roadWidth);
    this.grid = players.map((player, index) => {
      const slot = slots[index]!;
      return {
        playerId: player.id,
        p: [slot.x, slot.y, slot.z],
        yaw: slot.yaw,
      };
    });
    return this.grid;
  }

  resetPlayersToGrid(now: number): void {
    this.buildGrid();
    for (const player of this.players.values()) {
      const slot = this.grid.find((entry) => entry.playerId === player.id);
      player.state = slot
        ? createVehicleState({ x: slot.p[0], y: slot.p[1], z: slot.p[2], yaw: slot.yaw })
        : createVehicleState(this.spawnForIndex(player.joinIndex));
      player.input = { ...player.input, throttle: 0, steering: 0, brake: false, drift: false, nitro: false };
      player.lastInputAt = 0;
      player.ability = null;
      player.abilityCooldownUntil = 0;
      player.lastRespawnAt = 0;
      player.progress = createRaceProgress(now);
      player.finishRank = 0;
    }
  }

  startCountdown(now: number, mode?: GameMode): void {
    this.config.mode = mode ?? this.config.mode;
    this.phase = 'countdown';
    this.race = {
      id: `race-${++raceSequence}`,
      phase: 'countdown',
      countdownEndsAt: now + COUNTDOWN_MS,
      startTime: 0,
      laps: this.config.mode === 'arcade-race' ? this.config.laps : 0,
      finishCounter: 0,
      results: null,
      timeoutAt: 0,
    };
    this.resetPlayersToGrid(now);
    this.resetPickups();
    this.mines = [];
    this.events = [];
    this.touch();
  }

  beginRace(now: number): void {
    if (!this.race) return;
    this.phase = 'playing';
    this.race.phase = 'racing';
    this.race.startTime = now;
    this.race.timeoutAt = now + RACE_TIMEOUT_MS;
    for (const player of this.players.values()) {
      player.progress = createRaceProgress(now);
      player.finishRank = 0;
    }
    this.touch();
  }

  finishRace(now: number): void {
    if (!this.race) return;
    this.phase = 'results';
    this.race.phase = 'finished';

    const entries = this.sortedPlayers().map((player) => ({
      id: player.id,
      progress: player.progress,
    }));
    const ranked = rankOrder(entries);
    const results: RaceResult[] = ranked.map((entry, index) => {
      const player = this.players.get(entry.id)!;
      return {
        playerId: player.id,
        displayName: player.displayName,
        carId: player.carId,
        color: player.color,
        rank: index + 1,
        finished: player.progress.finished,
        finishTimeMs: player.progress.finishTimeMs,
        bestLapMs: player.progress.bestLapMs,
        lapsDone: player.progress.lapsDone,
        totalLaps: this.race?.laps ?? 0,
      };
    });
    this.race.results = results;
    this.touch();
  }

  resetToLobby(): void {
    this.phase = 'lobby';
    this.race = null;
    this.resetPickups();
    this.mines = [];
    this.events = [];
    const now = Date.now();
    this.resetPlayersToGrid(now);
    for (const player of this.players.values()) {
      player.ready = player.id === this.hostId;
    }
    this.touch();
  }

  everyoneFinished(): boolean {
    let connected = 0;
    for (const player of this.players.values()) {
      if (!player.isConnected) continue;
      connected++;
      if (!player.progress.finished) return false;
    }
    return connected > 0;
  }

  publicPlayers(): PlayerPublic[] {
    return this.sortedPlayers().map((player) => ({
      id: player.id,
      displayName: player.displayName,
      carId: player.carId,
      color: player.color,
      ready: player.ready,
      isHost: player.id === this.hostId,
      connected: player.connected,
    }));
  }

  toDTO(): RoomDTO {
    return {
      id: this.id,
      phase: this.phase,
      config: { ...this.config },
      hostId: this.hostId,
      players: this.publicPlayers(),
      createdAt: this.createdAt,
    };
  }

  broadcast(message: ServerMessage): void {
    for (const player of this.players.values()) {
      player.send(message);
    }
  }

  emit(
    type: WorldEventType,
    player: Player,
    position: { x: number; y: number; z: number },
    extra: { targetId?: string; ability?: WorldEvent['ability'] } = {},
  ): void {
    if (this.events.length >= 64) this.events.shift();
    this.events.push({
      id: ++this.eventSeq,
      type,
      playerId: player.id,
      targetId: extra.targetId,
      ability: extra.ability,
      p: [position.x, position.y, position.z],
      serverTime: Date.now(),
    });
  }

  flushEvents(): void {
    if (this.events.length === 0) return;
    const events = this.events;
    this.events = [];
    for (const event of events) {
      this.broadcast({ v: 1, t: 'world:event', event });
    }
  }

  nextMineId(): string {
    this.mineSeq++;
    return `${this.id}-mine-${this.mineSeq}`;
  }

  touch(): void {
    this.updatedAt = Date.now();
  }
}
