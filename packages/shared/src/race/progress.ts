import { CHECKPOINT_GATE_RADIUS, FINISH_GATE_RADIUS } from '../constants.js';
import { distance2D } from '../math.js';
import type { Track } from '../world/track.js';

export interface RaceProgress {
  /** 1-based current lap */
  lap: number;
  lapsDone: number;
  /** number of checkpoints passed on the current lap */
  checkpoint: number;
  /** current arc length (server updated) */
  s: number;
  /** monotonic ranking metric (metres) */
  progress: number;
  finished: boolean;
  finishTimeMs: number;
  finishOrder: number;
  lapStartTime: number;
  bestLapMs: number;
  lastLapMs: number;
  lapTimes: number[];
}

export interface ProgressEvent {
  checkpoint?: number;
  lap?: number;
  finished?: boolean;
}

export function createRaceProgress(startTime: number): RaceProgress {
  return {
    lap: 1,
    lapsDone: 0,
    checkpoint: 0,
    s: 0,
    progress: 0,
    finished: false,
    finishTimeMs: 0,
    finishOrder: 0,
    lapStartTime: startTime,
    bestLapMs: 0,
    lastLapMs: 0,
    lapTimes: [],
  };
}

/**
 * Validate checkpoint / lap progress. Only the next checkpoint counts, and the
 * finish line only counts once every checkpoint of the lap is complete.
 */
export function updateRaceProgress(
  progress: RaceProgress,
  position: { x: number; z: number },
  s: number,
  now: number,
  track: Track,
  checkpointS: number[],
  totalLaps: number,
): ProgressEvent {
  if (progress.finished) return {};
  progress.s = s;
  progress.progress = progress.lapsDone * track.length + s;

  const events: ProgressEvent = {};

  if (progress.checkpoint < checkpointS.length) {
    const cpS = checkpointS[progress.checkpoint]!;
    const cp = track.pointAt(cpS);
    if (distance2D(position.x, position.z, cp.x, cp.z) <= CHECKPOINT_GATE_RADIUS) {
      progress.checkpoint++;
      events.checkpoint = progress.checkpoint;
      return events;
    }
  }

  if (progress.checkpoint >= checkpointS.length) {
    const finish = track.pointAt(0);
    if (distance2D(position.x, position.z, finish.x, finish.z) <= FINISH_GATE_RADIUS) {
      const lapTime = Math.max(0, now - progress.lapStartTime);
      progress.lastLapMs = lapTime;
      progress.lapTimes.push(lapTime);
      if (progress.bestLapMs === 0 || lapTime < progress.bestLapMs) progress.bestLapMs = lapTime;
      progress.lapsDone++;
      progress.checkpoint = 0;
      progress.lapStartTime = now;

      if (progress.lapsDone >= totalLaps) {
        progress.finished = true;
        // Total race time = sum of validated lap times.
        progress.finishTimeMs = progress.lapTimes.reduce((sum, value) => sum + value, 0);
        events.finished = true;
      } else {
        progress.lap = progress.lapsDone + 1;
        events.lap = progress.lap;
      }
    }
  }

  return events;
}

export interface RankableProgress {
  id: string;
  progress: RaceProgress;
}

/** Rank finished players by time, then everyone else by course progress. */
export function rankOrder<T extends RankableProgress>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    const ap = a.progress;
    const bp = b.progress;
    if (ap.finished && bp.finished) {
      if (ap.finishTimeMs !== bp.finishTimeMs) return ap.finishTimeMs - bp.finishTimeMs;
      return ap.finishOrder - bp.finishOrder;
    }
    if (ap.finished) return -1;
    if (bp.finished) return 1;
    return bp.progress - ap.progress;
  });
}

export function assignRanks<T extends RankableProgress>(players: T[]): Map<string, number> {
  const sorted = rankOrder(players);
  const ranks = new Map<string, number>();
  sorted.forEach((entry, index) => ranks.set(entry.id, index + 1));
  return ranks;
}

/** Estimated lap distance remaining for HUD/ranking display. */
export function courseProgress(progress: RaceProgress, trackLength: number): number {
  return progress.lapsDone * trackLength + progress.s;
}
