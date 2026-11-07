import { randomUUID } from 'node:crypto';
import type { AbilityType, ServerMessage, VehicleInput } from '@horizon/shared';
import {
  DEFAULT_CAR_ID,
  PLAYER_COLORS,
  createRaceProgress,
  createVehicleState,
  type RaceProgress,
  type VehicleState,
} from '@horizon/shared';
import type { Connection } from '../network/connection.js';

export const EMPTY_INPUT: VehicleInput = {
  seq: 0,
  throttle: 0,
  steering: 0,
  brake: false,
  drift: false,
  nitro: false,
};

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export class Player {
  readonly id = randomUUID();
  readonly token = randomUUID();
  readonly joinedAt = Date.now();
  displayName: string;
  carId = DEFAULT_CAR_ID;
  color: string;
  ready = false;
  connection: Connection | null = null;
  connected = true;
  disconnectedAt = 0;
  joinIndex: number;

  state: VehicleState;
  input: VehicleInput = { ...EMPTY_INPUT };
  lastInputSeq = 0;
  lastInputAt = 0;

  ability: AbilityType | null = null;
  abilityCooldownUntil = 0;
  lastRespawnAt = 0;

  progress: RaceProgress = createRaceProgress(0);
  finishRank = 0;
  stuckSince = 0;

  constructor(displayName: string, joinIndex: number, spawn: SpawnPoint, color?: string) {
    this.displayName = displayName;
    this.joinIndex = joinIndex;
    this.color = color ?? PLAYER_COLORS[joinIndex % PLAYER_COLORS.length]!;
    this.state = createVehicleState(spawn);
  }

  get isConnected(): boolean {
    return this.connected && this.connection !== null;
  }

  send(message: ServerMessage): void {
    this.connection?.send(message);
  }

  resetInput(): void {
    this.input = { ...EMPTY_INPUT, seq: this.input.seq };
    this.lastInputAt = 0;
  }
}
