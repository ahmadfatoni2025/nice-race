import { describe, it, expect, beforeEach } from 'vitest';
import { Room } from '../apps/server/src/rooms/room.js';
import { activateAbility } from '../apps/server/src/abilities/abilities.js';
import { simulateRoom } from '../apps/server/src/simulation/simulator.js';

describe('Server Room & Multiplayer Logic', () => {
  let room: Room;

  beforeEach(() => {
    room = new Room('TEST1', { mode: 'arcade-race', laps: 2 });
  });

  it('creates room with valid defaults and handles players', () => {
    expect(room.id).toBe('TEST1');
    expect(room.phase).toBe('lobby');

    const host = room.addPlayer('Driver1');
    expect(room.hostId).toBe(host.id);
    expect(room.players.size).toBe(1);

    const guest = room.addPlayer('Driver2');
    expect(room.players.size).toBe(2);
    expect(guest.ready).toBe(false);

    guest.ready = true;
    expect(room.allNonHostReady()).toBe(true);
  });

  it('handles countdown and race transition', () => {
    const host = room.addPlayer('Host');
    const guest = room.addPlayer('Guest');
    guest.ready = true;

    const now = Date.now();
    room.startCountdown(now);
    expect(room.phase).toBe('countdown');
    expect(room.race).not.toBeNull();
  });

  it('validates abilities and cooldowns', () => {
    const player = room.addPlayer('Racer');
    room.phase = 'playing';
    player.ability = 'nitro';

    const now = Date.now();
    const result = activateAbility(room, player, now);
    expect(result.ok).toBe(true);
    expect(player.state.nitroActive).toBe(true);

    // Second activation without ability should fail
    const secondResult = activateAbility(room, player, now);
    expect(secondResult.ok).toBe(false);
  });
});

