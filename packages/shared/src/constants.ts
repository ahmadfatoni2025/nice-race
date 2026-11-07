import type { GameMode } from './types.js';

export const PROTOCOL_VERSION = 1;

/** Networking / simulation cadence (see PRD 8.5). */
export const SERVER_TICK_HZ = 30;
export const SERVER_TICK_MS = 1000 / SERVER_TICK_HZ;
export const PHYSICS_HZ = 60;
export const PHYSICS_STEP = 1 / PHYSICS_HZ;
export const SNAPSHOT_HZ = 15;
export const SNAPSHOT_EVERY_N_TICKS = SERVER_TICK_HZ / SNAPSHOT_HZ;
export const INPUT_SEND_HZ = 30;
export const INTERPOLATION_DELAY_MS = 120;
export const HEARTBEAT_INTERVAL_MS = 5000;
export const HEARTBEAT_TIMEOUT_MS = 20000;

export const ROOM_ID_LENGTH = 5;
export const ROOM_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 1;
export const ROOM_EMPTY_TIMEOUT_MS = 60_000;
export const RECONNECT_GRACE_MS = 20_000;
export const MAX_DISPLAY_NAME = 16;
export const MIN_DISPLAY_NAME = 2;
export const MAX_PAYLOAD_BYTES = 8 * 1024;
export const MAX_MESSAGES_PER_SECOND = 160;
export const MAX_INPUTS_PER_SECOND = 60;

/** Race defaults. */
export const DEFAULT_LAPS = 2;
export const LAP_OPTIONS = [2, 3] as const;
export const RACE_TIMEOUT_MS = 8 * 60_000;
export const COUNTDOWN_MS = 3000;
export const CHECKPOINT_GATE_RADIUS = 19;
export const FINISH_GATE_RADIUS = 24;
export const RESPAWN_GRACE_MS = 1200;
export const MAX_OFFROAD_DISTANCE = 70;

/** Ability tuning (PRD section 9.1). */
export const ABILITY = {
  nitro: {
    durationMs: 2500,
    cooldownMs: 500,
    maxSpeedMultiplier: 1.36,
  },
  shield: {
    durationMs: 3000,
    cooldownMs: 500,
  },
  shockwave: {
    radius: 10,
    stunMs: 1000,
    speedMultiplier: 0.72,
    cooldownMs: 500,
  },
  mine: {
    armDelayMs: 1000,
    lifeMs: 8000,
    radius: 3,
    stunMs: 1000,
    speedMultiplier: 0.55,
    cooldownMs: 500,
  },
  pickup: {
    radius: 3.2,
    respawnMs: 6000,
  },
} as const;

export const ABILITY_TYPES = ['nitro', 'shield', 'shockwave', 'mine'] as const;

export const PLAYER_COLORS = [
  '#ff5d5d',
  '#ffb547',
  '#ffe66d',
  '#6ee7b7',
  '#5bd1ff',
  '#8b8bff',
  '#ff7ad9',
  '#e8edf2',
] as const;

export const MAP_ID = 'alpine-valley';

export const MODE_LABELS: Record<GameMode, string> = {
  'free-drive': 'Free Drive',
  'arcade-race': 'Arcade Race',
};

export const GAME_MODE_DEFAULT_LAPS: Record<GameMode, number> = {
  'free-drive': 0,
  'arcade-race': DEFAULT_LAPS,
};

export const GRAPHICS_PRESETS = ['low', 'medium', 'high'] as const;
export type GraphicsPreset = (typeof GRAPHICS_PRESETS)[number];

export const INPUT_SEQ_WINDOW = 4096;
