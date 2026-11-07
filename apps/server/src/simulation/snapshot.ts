import type {
  MineSnapshot,
  PickupSnapshot,
  PlayerSnapshot,
  RacePlayerSnapshot,
  RaceSnapshot,
  WorldSnapshot,
} from '@horizon/shared';
import { assignRanks, yawToQuaternion } from '@horizon/shared';
import type { Room } from '../rooms/room.js';

export function buildSnapshot(room: Room, tick: number, now: number): WorldSnapshot {
  const players: PlayerSnapshot[] = room.sortedPlayers().map((player) => {
    const state = player.state;
    const q = yawToQuaternion(state.yaw);
    return {
      id: player.id,
      seq: player.lastInputSeq,
      p: [round(state.x), round(state.y), round(state.z)],
      q: [round(q[0], 4), round(q[1], 4), round(q[2], 4), round(q[3], 4)],
      vel: [round(state.vx, 2), 0, round(state.vz, 2)],
      speed: round(state.speed, 2),
      drift: state.drift,
      nitro: state.nitroActive,
      shield: state.shieldActive,
      stunned: state.stunned,
      ability: player.ability,
      connected: player.connected,
    };
  });

  const pickups: PickupSnapshot[] = room.pickups.map((pickup) => ({
    id: pickup.id,
    active: pickup.active,
  }));

  const mines: MineSnapshot[] = room.mines.map((mine) => ({
    id: mine.id,
    p: [round(mine.x), round(mine.y), round(mine.z)],
    armAt: mine.armAt,
    expiresAt: mine.expiresAt,
    ownerId: mine.ownerId,
  }));

  let race: RaceSnapshot | null = null;
  if (room.race && room.config.mode === 'arcade-race') {
    const rankable = room.sortedPlayers().map((player) => ({ id: player.id, progress: player.progress }));
    const ranks = assignRanks(rankable);

    const racePlayers: RacePlayerSnapshot[] = room
      .sortedPlayers()
      .map((player) => {
        const progress = player.progress;
        const lapTimeMs = progress.finished ? progress.lastLapMs : Math.max(0, now - progress.lapStartTime);
        return {
          id: player.id,
          lap: Math.min(progress.lap, room.race?.laps ?? progress.lap),
          checkpoint: progress.checkpoint,
          lapsDone: progress.lapsDone,
          s: round(progress.s, 1),
          progress: round(progress.progress, 1),
          rank: ranks.get(player.id) ?? 1,
          finished: progress.finished,
          finishTimeMs: Math.round(progress.finishTimeMs),
          lapTimeMs: Math.round(lapTimeMs),
          bestLapMs: Math.round(progress.bestLapMs),
        };
      })
      .sort((a, b) => a.rank - b.rank);

    race = {
      phase: room.race.phase,
      countdownEndsAt: room.race.countdownEndsAt,
      startTime: room.race.startTime,
      now,
      timeMs: room.race.startTime > 0 ? Math.round(now - room.race.startTime) : 0,
      laps: room.race.laps,
      players: racePlayers,
    };
  }

  return {
    tick,
    serverTime: now,
    players,
    pickups,
    mines,
    race,
  };
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
