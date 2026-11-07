import type { ErrorCode } from '@horizon/shared';
import { ABILITY, distance2D, getCarConfig, applyStun, startNitro, startShield } from '@horizon/shared';
import type { Room } from '../rooms/room.js';
import type { Player } from '../players/player.js';

export interface AbilityResult {
  ok: boolean;
  code?: ErrorCode;
  message?: string;
}

/**
 * Server-side ability activation and validation (PRD 9.2). Ownership, cooldown,
 * targets and effect success are decided here, never by the client.
 */
export function activateAbility(room: Room, player: Player, now: number): AbilityResult {
  if (room.phase !== 'playing') {
    return { ok: false, code: 'INVALID_STATE', message: 'Abilities are only usable while playing' };
  }
  if (!player.ability) {
    return { ok: false, code: 'INVALID_ABILITY', message: 'No ability held' };
  }
  if (now < player.abilityCooldownUntil) {
    return { ok: false, code: 'INVALID_ABILITY', message: 'Ability on cooldown' };
  }
  if (room.race && player.progress.finished) {
    return { ok: false, code: 'INVALID_STATE', message: 'Race already finished' };
  }

  const ability = player.ability;
  const car = getCarConfig(player.carId);
  const state = player.state;

  switch (ability) {
    case 'nitro': {
      startNitro(state, car.nitroDuration);
      room.emit('nitro', player, state, { ability });
      player.abilityCooldownUntil = now + ABILITY.nitro.cooldownMs;
      break;
    }
    case 'shield': {
      startShield(state, ABILITY.shield.durationMs / 1000);
      room.emit('shield', player, state, { ability });
      player.abilityCooldownUntil = now + ABILITY.shield.cooldownMs;
      break;
    }
    case 'shockwave': {
      room.emit('shockwave', player, state, { ability });
      for (const target of room.players.values()) {
        if (target.id === player.id || !target.isConnected) continue;
        if (room.race && target.progress.finished) continue;
        const distance = distance2D(state.x, state.z, target.state.x, target.state.z);
        if (distance > ABILITY.shockwave.radius) continue;
        if (target.state.shieldActive) {
          room.emit('blocked', player, target.state, { targetId: target.id, ability: 'shield' });
          continue;
        }
        applyStun(
          target.state,
          ABILITY.shockwave.stunMs / 1000,
          1,
          ABILITY.shockwave.speedMultiplier,
        );
        room.emit('shockwave', player, target.state, { targetId: target.id, ability });
      }
      player.abilityCooldownUntil = now + ABILITY.shockwave.cooldownMs;
      break;
    }
    case 'mine': {
      const dropDistance = 3.6;
      const x = state.x - Math.sin(state.yaw) * dropDistance;
      const z = state.z - Math.cos(state.yaw) * dropDistance;
      const y = state.y - 0.35;
      room.mines.push({
        id: room.nextMineId(),
        x,
        y,
        z,
        ownerId: player.id,
        armAt: now + ABILITY.mine.armDelayMs,
        expiresAt: now + ABILITY.mine.lifeMs,
      });
      room.emit('mine-drop', player, { x, y, z }, { ability });
      player.abilityCooldownUntil = now + ABILITY.mine.cooldownMs;
      break;
    }
    default:
      return { ok: false, code: 'INVALID_ABILITY', message: 'Unknown ability' };
  }

  player.ability = null;
  return { ok: true };
}
