import type { NearestTrackPoint, TrackDefinition, TrackSamplePoint } from '../types.js';
import { TAU, clamp } from '../math.js';

function catmullRom(
  p0x: number, p0y: number, p0z: number,
  p1x: number, p1y: number, p1z: number,
  p2x: number, p2y: number, p2z: number,
  p3x: number, p3y: number, p3z: number,
  t: number,
): { x: number; y: number; z: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  const curve = (a: number, b: number, c: number, d: number): number =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return {
    x: curve(p0x, p1x, p2x, p3x),
    y: curve(p0y, p1y, p2y, p3y),
    z: curve(p0z, p1z, p2z, p3z),
  };
}

/**
 * Closed, arc-length parameterized racing line with fast nearest-point lookup.
 * Pure data + math so it can be shared by client prediction and server sim.
 */
export class Track {
  readonly samples: TrackSamplePoint[] = [];
  readonly length: number;
  readonly definition: TrackDefinition;

  constructor(definition: TrackDefinition) {
    this.definition = definition;
    const points = definition.points;
    const n = points.length;
    const subdivisions = Math.max(4, definition.subdivisions);
    const raw: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n]!;
      const p1 = points[i]!;
      const p2 = points[(i + 1) % n]!;
      const p3 = points[(i + 2) % n]!;
      for (let j = 0; j < subdivisions; j++) {
        raw.push(catmullRom(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2], j / subdivisions));
      }
    }

    // Smooth tangents with central differences and compute arc length.
    let total = 0;
    const count = raw.length;
    for (let i = 0; i < count; i++) {
      const a = raw[(i - 1 + count) % count]!;
      const b = raw[(i + 1) % count]!;
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      const tLen = Math.hypot(tx, tz) || 1;
      const prev = raw[(i - 1 + count) % count]!;
      const cur = raw[i]!;
      if (i > 0) total += Math.hypot(cur.x - prev.x, cur.y - prev.y, cur.z - prev.z);
      this.samples.push({ x: cur.x, y: cur.y, z: cur.z, s: total, tx: tx / tLen, tz: tz / tLen });
    }
    // Close the loop distance.
    const first = raw[0]!;
    const last = raw[count - 1]!;
    total += Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z);
    this.length = total;
  }

  /** Get a point at arc length `s` (metres, wraps). */
  pointAt(s: number): { x: number; y: number; z: number; tx: number; tz: number } {
    const L = this.length;
    if (L <= 0) return { x: 0, y: 0, z: 0, tx: 0, tz: 1 };
    let dist = s % L;
    if (dist < 0) dist += L;
    const samples = this.samples;
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (samples[mid]!.s <= dist) lo = mid;
      else hi = mid - 1;
    }
    const a = samples[lo]!;
    const b = samples[(lo + 1) % samples.length]!;
    const segLen = (b.s > a.s ? b.s : b.s + L) - a.s || 1;
    const t = clamp((dist - a.s) / segLen, 0, 1);
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      tx: a.tx + (b.tx - a.tx) * t,
      tz: a.tz + (b.tz - a.tz) * t,
    };
  }

  /** Project a world position onto the center line. */
  nearest(x: number, z: number): NearestTrackPoint {
    const samples = this.samples;
    const n = samples.length;
    let bestDistSq = Number.POSITIVE_INFINITY;
    let bestS = 0;
    let bestX = 0;
    let bestY = 0;
    let bestZ = 0;
    let bestTx = 0;
    let bestTz = 1;

    for (let i = 0; i < n; i++) {
      const a = samples[i]!;
      const b = samples[(i + 1) % n]!;
      let bx = b.x;
      let bz = b.z;
      let by = b.y;
      let segS = b.s;
      let segLen = b.s - a.s;
      if (i === n - 1) {
        segLen = this.length - a.s;
        segS = this.length;
      }
      const dx = bx - a.x;
      const dz = bz - a.z;
      const lenSq = dx * dx + dz * dz;
      let t = 0;
      if (lenSq > 1e-9) {
        t = clamp(((x - a.x) * dx + (z - a.z) * dz) / lenSq, 0, 1);
      }
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const ex = x - px;
      const ez = z - pz;
      const distSq = ex * ex + ez * ez;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestX = px;
        bestZ = pz;
        bestY = a.y + (by - a.y) * t;
        bestS = a.s + (segLen > 0 ? t * segLen : 0);
        const tl = Math.hypot(dx, dz) || 1;
        bestTx = dx / tl;
        bestTz = dz / tl;
      }
    }

    return {
      s: bestS % this.length,
      dist: Math.sqrt(bestDistSq),
      x: bestX,
      y: bestY,
      z: bestZ,
      tx: bestTx,
      tz: bestTz,
    };
  }

  /** Signed shortest distance along the loop from `fromS` to `toS`. */
  deltaS(fromS: number, toS: number): number {
    const L = this.length;
    let delta = (toS - fromS) % L;
    if (delta > L / 2) delta -= L;
    if (delta < -L / 2) delta += L;
    return delta;
  }

  /** World-space start grid slots, ordered front to back. */
  gridSlots(count: number, roadWidth: number): { x: number; y: number; z: number; yaw: number }[] {
    const slots: { x: number; y: number; z: number; yaw: number }[] = [];
    const rows = Math.ceil(count / 2);
    for (let i = 0; i < count; i++) {
      const row = Math.min(rows - 1, Math.floor(i / 2));
      const side = i % 2 === 0 ? 1 : -1;
      const s = (0.012 + row * 0.0065) * this.length;
      const p = this.pointAt(s);
      const rightX = p.tz;
      const rightZ = -p.tx;
      const lateral = side * Math.min(3.5, roadWidth * 0.25);
      slots.push({
        x: p.x + rightX * lateral,
        y: p.y,
        z: p.z + rightZ * lateral,
        yaw: Math.atan2(p.tx, p.tz),
      });
    }
    return slots;
  }
}

/** Build a closed Catmull-Rom loop from control points. */
export function createTrack(definition: TrackDefinition): Track {
  return new Track(definition);
}

export function yawFromDirection(tx: number, tz: number): number {
  return Math.atan2(tx, tz);
}

/** Quaternion (x, y, z, w) for a yaw rotation around +Y. */
export function yawToQuaternion(yaw: number): [number, number, number, number] {
  return [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
}

export function normalizeS(s: number, length: number): number {
  if (length <= 0) return 0;
  let value = s % length;
  if (value < 0) value += length;
  return value;
}

export function fractionToS(fraction: number, length: number): number {
  return normalizeS(fraction * length, length);
}

export function sToFraction(s: number, length: number): number {
  return length > 0 ? normalizeS(s, length) / length : 0;
}

export const TAU_ANGLE = TAU;
