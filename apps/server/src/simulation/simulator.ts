import type { PhysicsEnvironment } from '@horizon/shared';
import {
  ABILITY,
  ABILITY_TYPES,
  MAX_OFFROAD_DISTANCE,
  PHYSICS_STEP,
  applyStun,
  distance2D,
  getCarConfig,
  mulberry32,
  pickOne,
  respawnVehicle,
  resolveVehicleCollisions,
  stepVehicle,
  updateRaceProgress,
} from '@horizon/shared';
import { Room } from '../rooms/room.js';
import type { Player } from '../players/player.js';

const IDLE_INPUT = {
  throttle: 0,
  steering: 0,
  brake: false,
  drift: false,
  nitro: false,
};

export interface SimulateResult {
  raceFinished: boolean;
}

/**
 * Advance one authoritative server tick (2 fixed physics steps at 1/60s).
 * The client runs the exact same physics for prediction; the server is the
 * source of truth for race progress, pickups and abilities.
 */
export function simulateRoom(room: Room, now: number): SimulateResult {
  if (room.phase !== 'playing') return { raceFinished: false };

  const carEnv: PhysicsEnvironment = {
    track: room.track,
    lake: room.map.lake,
    roadWidth: room.map.roadWidth,
  };

  const connected: Player[] = [];
  for (const player of room.players.values()) {
    if (player.isConnected) connected.push(player);
  }

  // --- fixed-step physics -------------------------------------------
  for (let step = 0; step < 2; step++) {
    for (const player of connected) {
      const stale = player.lastInputAt === 0 || now - player.lastInputAt > 1500;
      const input = stale ? { ...player.input, ...IDLE_INPUT } : player.input;
      stepVehicle(player.state, input, getCarConfig(player.carId), carEnv, PHYSICS_STEP);
    }
    resolveVehicleCollisions(connected.map((player) => ({ id: player.id, state: player.state })));
  }

  // --- out-of-bounds / stuck recovery --------------------------------
  for (const player of connected) {
    const state = player.state;
    const outOfBounds = state.roadDist > MAX_OFFROAD_DISTANCE || state.y < -25;
    let stuck = false;
    if (state.offRoad && state.speed < 1.5) {
      if (player.stuckSince === 0) player.stuckSince = now;
      stuck = now - player.stuckSince > 6000;
    } else {
      player.stuckSince = 0;
    }
    if ((outOfBounds || stuck) && state.respawnCooldown <= 0) {
      respawnVehicle(state, carEnv);
      player.lastRespawnAt = now;
      room.emit('respawn', player, state);
    }
  }

  const isRace = room.config.mode === 'arcade-race' && room.race?.phase === 'racing';

  // --- checkpoints, laps and finish ----------------------------------
  if (isRace && room.race) {
    for (const player of connected) {
      if (player.progress.finished) continue;
      const events = updateRaceProgress(
        player.progress,
        { x: player.state.x, z: player.state.z },
        player.state.s,
        now,
        room.track,
        room.checkpointS,
        room.race.laps,
      );
      if (events.checkpoint !== undefined) {
        room.emit('checkpoint', player, player.state);
      }
      if (events.lap !== undefined) {
        room.emit('lap', player, player.state);
      }
      if (events.finished) {
        player.finishRank = ++room.race.finishCounter;
        player.progress.finishOrder = player.finishRank;
        room.emit('finish', player, player.state);
      }
    }
  }

  // --- power-up pickups ----------------------------------------------
  for (const pickup of room.pickups) {
    if (!pickup.active) {
      if (now >= pickup.respawnAt) pickup.active = true;
      continue;
    }
    const position = room.pickupPositions[pickup.id];
    if (!position) continue;
    for (const player of connected) {
      if (player.ability !== null) continue;
      if (isRace && player.progress.finished) continue;
      if (Math.abs(player.state.y - position.y) > 7) continue;
      if (distance2D(player.state.x, player.state.z, position.x, position.z) > ABILITY.pickup.radius) continue;

      const rng = mulberry32(
        (room.map.seed ^ ((pickup.id + 1) * 2654435761) ^ (player.joinIndex * 40503) ^ Math.floor(now / 50)) >>> 0,
      );
      const ability = pickOne(rng, ABILITY_TYPES);
      player.ability = ability;
      player.abilityCooldownUntil = 0;
      pickup.active = false;
      pickup.respawnAt = now + ABILITY.pickup.respawnMs;
      room.emit('pickup', player, position, { ability });
      break;
    }
  }

  // --- mines -----------------------------------------------------------
  if (room.mines.length > 0) {
    const remaining: typeof room.mines = [];
    for (const mine of room.mines) {
      if (now >= mine.expiresAt) continue;
      if (now < mine.armAt) {
        remaining.push(mine);
        continue;
      }
      let hit: Player | null = null;
      for (const player of connected) {
        if (isRace && player.progress.finished) continue;
        if (Math.abs(player.state.y - mine.y) > 5) continue;
        if (distance2D(player.state.x, player.state.z, mine.x, mine.z) <= ABILITY.mine.radius) {
          hit = player;
          break;
        }
      }
      if (!hit) {
        remaining.push(mine);
        continue;
      }
      if (hit.state.shieldActive) {
        room.emit('blocked', hit, { x: mine.x, y: mine.y, z: mine.z }, { targetId: hit.id, ability: 'shield' });
      } else {
        applyStun(hit.state, ABILITY.mine.stunMs / 1000, 1, ABILITY.mine.speedMultiplier);
        room.emit('mine-hit', hit, { x: mine.x, y: mine.y, z: mine.z }, { ability: 'mine' });
      }
      // mine is consumed either way
    }
    room.mines = remaining;
  }

  // --- race completion ------------------------------------------------
  if (isRace && room.race) {
    if (room.everyoneFinished() || now >= room.race.timeoutAt) {
      room.finishRace(now);
      return { raceFinished: true };
    }
  }

  return { raceFinished: false };
}
