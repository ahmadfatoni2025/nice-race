import type { MapDefinition, MapPickup, NearestTrackPoint, TrackDefinition } from '../types.js';
import { clamp, distance2D, lerp, smoothstep } from '../math.js';
import { MAP_ID } from '../constants.js';
import { Track } from './track.js';

/**
 * Alpine Valley control points: a 1.5 km scenic loop with gentle elevation,
 * a lake in the middle, a bridge section and a tunnel pass.
 */
export const ALPINE_TRACK: TrackDefinition = {
  subdivisions: 26,
  points: [
    [0, 0, -300],
    [110, 2, -280],
    [190, 6, -200],
    [225, 12, -90],
    [215, 20, 20],
    [180, 28, 120],
    [100, 33, 190],
    [0, 36, 215],
    [-100, 33, 195],
    [-175, 28, 140],
    [-215, 22, 50],
    [-225, 16, -50],
    [-200, 10, -150],
    [-140, 5, -235],
    [-60, 1, -285],
  ],
};

export const ALPINE_LAKE = { x: 0, z: 0, radius: 105, waterY: -3.5 };

export function createAlpineValleyMap(seed = 1337): MapDefinition {
  return {
    id: MAP_ID,
    seed,
    name: 'Alpine Valley',
    roadWidth: 14,
    track: ALPINE_TRACK,
    checkpointFractions: [0.25, 0.5, 0.75],
    pickupFractions: [0.055, 0.13, 0.205, 0.28, 0.355, 0.43, 0.505, 0.58, 0.655, 0.73, 0.805, 0.88, 0.945],
    lake: ALPINE_LAKE,
    startLineFraction: 0,
    environment: {
      fogColor: '#c9dfec',
      skyTop: '#3f8fce',
      skyHorizon: '#d6ecf7',
      sunColor: '#fff2cc',
      groundLow: '#3c6246',
      groundHigh: '#718b55',
      rockColor: '#8d8c84',
      treeColor: '#2c5a3a',
      treeColorAlt: '#3d6e44',
      snowColor: '#eef5fa',
    },
  };
}

export function createAlpineValleyTrack(): Track {
  return new Track(ALPINE_TRACK);
}

/**
 * Deterministic terrain height used by physics, collision and rendering.
 * The road corridor is flattened, then blends into rolling alpine hills.
 */
export function terrainHeightAt(
  track: Track,
  lake: { x: number; z: number; radius: number; waterY: number },
  x: number,
  z: number,
  nearest?: NearestTrackPoint,
): number {
  const n = nearest ?? track.nearest(x, z);

  const rolling =
    7.2 * Math.sin(x * 0.0085) * Math.cos(z * 0.0075) +
    3.8 * Math.sin((x + z) * 0.016) +
    2.1 * Math.sin(x * 0.031 + z * 0.019) +
    1.1 * Math.cos(z * 0.045 - x * 0.021);

  let base = 7 + rolling;

  const lakeDist = distance2D(x, z, lake.x, lake.z);
  const lakeDip = smoothstep(lake.radius + 55, lake.radius * 0.25, lakeDist) * 21;
  base -= lakeDip;

  // A broad mountain rim gives the valley its silhouette far from the road.
  const rim = smoothstep(320, 760, Math.max(Math.abs(x), Math.abs(z)));
  base += rim * (48 + 18 * Math.sin(x * 0.004) * Math.cos(z * 0.005));

  const roadBlend = smoothstep(9, 62, n.dist);
  const height = lerp(n.y - 0.28, base, roadBlend);

  // Never let the road corridor poke below the lake.
  if (n.dist < 12) return n.y - 0.28;
  return height;
}

export function buildMapPickups(map: MapDefinition, track: Track): MapPickup[] {
  return map.pickupFractions.map((fraction, index) => {
    const s = fraction * track.length;
    const p = track.pointAt(s);
    const rightX = p.tz;
    const rightZ = -p.tx;
    const lateral = (index % 2 === 0 ? 1 : -1) * Math.min(2.6, map.roadWidth * 0.2);
    const x = p.x + rightX * lateral;
    const z = p.z + rightZ * lateral;
    const n = track.nearest(x, z);
    return {
      id: index,
      s,
      lateral,
      x,
      y: Math.max(p.y, terrainHeightAt(track, map.lake, x, z, n)) + 0.9,
      z,
    };
  });
}

/** Distance from the road center line, used for off-road handling. */
export function roadDistance(track: Track, x: number, z: number): number {
  return track.nearest(x, z).dist;
}

/** Pickup respawn logic is deterministic and owned by the server. */
export function pickupWorldPosition(map: MapDefinition, track: Track, index: number): MapPickup {
  const fraction = map.pickupFractions[index % map.pickupFractions.length] ?? 0;
  const p = track.pointAt(fraction * track.length);
  const rightX = p.tz;
  const rightZ = -p.tx;
  const lateral = (index % 2 === 0 ? 1 : -1) * Math.min(2.6, map.roadWidth * 0.2);
  const x = p.x + rightX * lateral;
  const z = p.z + rightZ * lateral;
  return {
    id: index,
    s: fraction * track.length,
    lateral,
    x,
    y: p.y + 0.9,
    z,
  };
}

export function clampToMap(x: number, z: number): { x: number; z: number } {
  const limit = 900;
  return { x: clamp(x, -limit, limit), z: clamp(z, -limit, limit) };
}
