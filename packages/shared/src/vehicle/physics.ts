import type { CarConfig, VehicleInput } from '../types.js';
import { clamp, moveTowards, wrapAngle } from '../math.js';
import type { Track } from '../world/track.js';
import { terrainHeightAt } from '../world/map.js';

export interface VehicleState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** world velocity */
  vx: number;
  vz: number;
  speed: number;
  steer: number;
  drift: boolean;
  offRoad: boolean;
  nitroActive: boolean;
  shieldActive: boolean;
  stunned: boolean;
  nitroTime: number;
  shieldTime: number;
  stunTime: number;
  stunStrength: number;
  stunPhase: number;
  /** seconds until an automatic respawn request may be sent */
  respawnCooldown: number;
  /** distance from road centre (cached for effects/HUD) */
  roadDist: number;
  /** arc length along the track (cached) */
  s: number;
}

export const RIDE_HEIGHT = 0.55;
export const OFFROAD_MARGIN = 1.6;

export function createVehicleState(spawn: { x: number; y: number; z: number; yaw: number }): VehicleState {
  return {
    x: spawn.x,
    y: spawn.y + RIDE_HEIGHT,
    z: spawn.z,
    yaw: spawn.yaw,
    vx: 0,
    vz: 0,
    speed: 0,
    steer: 0,
    drift: false,
    offRoad: false,
    nitroActive: false,
    shieldActive: false,
    stunned: false,
    nitroTime: 0,
    shieldTime: 0,
    stunTime: 0,
    stunStrength: 0,
    stunPhase: 0,
    respawnCooldown: 0,
    roadDist: 0,
    s: 0,
  };
}

export function cloneVehicleState(state: VehicleState): VehicleState {
  return { ...state };
}

export interface PhysicsEnvironment {
  track: Track;
  lake: { x: number; z: number; radius: number; waterY: number };
  roadWidth: number;
}

export function startNitro(state: VehicleState, durationSeconds: number): void {
  state.nitroTime = Math.max(state.nitroTime, durationSeconds);
  state.nitroActive = true;
}

export function startShield(state: VehicleState, durationSeconds: number): void {
  state.shieldTime = Math.max(state.shieldTime, durationSeconds);
  state.shieldActive = true;
}

export function applyStun(state: VehicleState, durationSeconds: number, strength: number, speedMultiplier: number): void {
  if (state.shieldActive) return;
  state.stunTime = Math.max(state.stunTime, durationSeconds);
  state.stunStrength = Math.max(state.stunStrength, strength);
  state.stunned = true;
  state.vx *= speedMultiplier;
  state.vz *= speedMultiplier;
  state.speed *= speedMultiplier;
}

function decompose(state: VehicleState, yaw: number): { forward: number; lateral: number; fx: number; fz: number; rx: number; rz: number } {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  return {
    fx,
    fz,
    rx,
    rz,
    forward: state.vx * fx + state.vz * fz,
    lateral: state.vx * rx + state.vz * rz,
  };
}

/**
 * Custom fixed-timestep arcade physics. Mutates `state`; the same function is
 * used for local prediction and authoritative server simulation.
 */
export function stepVehicle(
  state: VehicleState,
  input: VehicleInput,
  car: CarConfig,
  env: PhysicsEnvironment,
  dt: number,
  options: { frozen?: boolean; allowNitro?: boolean } = {},
): void {
  if (options.frozen) {
    state.speed = 0;
    state.vx = 0;
    state.vz = 0;
    return;
  }

  const allowNitro = options.allowNitro !== false;

  // --- effect timers -------------------------------------------------
  state.nitroTime = Math.max(0, state.nitroTime - dt);
  state.shieldTime = Math.max(0, state.shieldTime - dt);
  state.stunTime = Math.max(0, state.stunTime - dt);
  state.respawnCooldown = Math.max(0, state.respawnCooldown - dt);
  state.nitroActive = allowNitro && state.nitroTime > 0;
  state.shieldActive = state.shieldTime > 0;
  state.stunned = state.stunTime > 0;
  if (!state.stunned) state.stunStrength = 0;

  const throttle = clamp(input.throttle, 0, 1);
  const steerTarget = clamp(input.steering, -1, 1);

  // --- steering ------------------------------------------------------
  const steerRate = car.steeringResponse * (state.stunned ? 0.45 : 1);
  state.steer = moveTowards(state.steer, steerTarget, steerRate * dt);

  // --- speed along heading before rotation ---------------------------
  const pre = decompose(state, state.yaw);
  const absSpeed = Math.abs(pre.forward);
  const speedRatio = clamp(absSpeed / Math.max(1, car.maxSpeed), 0, 1);
  const roadLimit = env.roadWidth / 2 + OFFROAD_MARGIN;
  state.offRoad = state.roadDist > roadLimit;
  const surfaceGrip = state.offRoad ? 0.72 : 1;

  // --- drift state ---------------------------------------------------
  const wantsDrift = input.drift && absSpeed > 8.5 && Math.abs(state.steer) > 0.22;
  state.drift = wantsDrift || (state.drift && absSpeed > 5 && input.drift);

  const direction = pre.forward >= -0.25 ? 1 : -1;
  const authority = clamp(absSpeed / 6.5, 0, 1) * (1 - 0.17 * speedRatio);
  let turnRate = state.steer * car.turnRate * authority * direction;
  if (state.drift) turnRate *= 1.5;
  if (state.stunned) turnRate *= 0.35;
  state.yaw = wrapAngle(state.yaw + turnRate * dt);

  if (state.stunned) {
    state.stunPhase += dt * 17;
    state.yaw = wrapAngle(state.yaw + Math.sin(state.stunPhase) * 0.55 * dt * state.stunStrength);
  }

  // --- longitudinal forces ------------------------------------------
  const boostMultiplier = state.nitroActive ? car.nitroMaxMultiplier : 1;
  const maxForward = car.maxSpeed * boostMultiplier * (state.offRoad ? 0.58 : 1);
  let forward = pre.forward;

  if (input.brake) {
    if (forward > 0.7) {
      forward -= car.brakeForce * dt;
    } else {
      forward -= car.acceleration * 0.62 * dt;
      if (forward < -car.reverseSpeed) forward = -car.reverseSpeed;
    }
  } else if (throttle > 0.01) {
    if (forward < maxForward) {
      const taper = 1 - 0.5 * clamp(forward / maxForward, 0, 1);
      forward += car.acceleration * throttle * taper * dt;
    }
  }

  if (state.nitroActive) {
    if (forward < maxForward) forward += car.nitroForce * dt;
  }

  // Rolling resistance + off-road drag.
  const drag = state.offRoad ? 1.55 : 0.16;
  forward -= forward * drag * dt;
  if (state.drift) forward -= forward * 0.1 * dt;
  if (state.stunned) forward -= forward * 1.35 * dt;

  // Hard caps (nitro is limited by max speed, never unbounded).
  if (forward > maxForward) forward = maxForward;
  if (forward < -car.reverseSpeed) forward = -car.reverseSpeed;
  if (!state.nitroActive && forward > car.maxSpeed * (state.offRoad ? 0.58 : 1)) {
    forward = car.maxSpeed * (state.offRoad ? 0.58 : 1);
  }

  // --- lateral grip / drift slide ------------------------------------
  let lateral = pre.lateral;
  const grip = (state.drift ? car.driftGrip : car.grip) * surfaceGrip;
  lateral *= Math.exp(-grip * dt);

  if (state.drift) {
    // rear steps out opposite the steering direction
    lateral -= state.steer * absSpeed * car.driftFactor * 2.1 * dt;
    const maxSlide = car.maxSpeed * 0.55;
    lateral = clamp(lateral, -maxSlide, maxSlide);
  }
  if (state.offRoad) lateral *= Math.exp(-1.5 * dt);

  // --- integrate -----------------------------------------------------
  const fx = Math.sin(state.yaw);
  const fz = Math.cos(state.yaw);
  const rx = Math.cos(state.yaw);
  const rz = -Math.sin(state.yaw);
  state.vx = fx * forward + rx * lateral;
  state.vz = fz * forward + rz * lateral;
  state.speed = Math.hypot(state.vx, state.vz);

  state.x += state.vx * dt;
  state.z += state.vz * dt;

  // Keep the vehicle inside the playable area even in pathological cases.
  const limit = 900;
  if (state.x > limit) { state.x = limit; state.vx = 0; }
  if (state.x < -limit) { state.x = -limit; state.vx = 0; }
  if (state.z > limit) { state.z = limit; state.vz = 0; }
  if (state.z < -limit) { state.z = -limit; state.vz = 0; }

  // --- ground + road queries -----------------------------------------
  const nearest = env.track.nearest(state.x, state.z);
  state.s = nearest.s;
  state.roadDist = nearest.dist;
  state.offRoad = nearest.dist > roadLimit;

  const ground = terrainHeightAt(env.track, env.lake, state.x, state.z, nearest);
  const targetY = ground + RIDE_HEIGHT;
  // Follow terrain smoothly to avoid harsh vertical pops.
  state.y += (targetY - state.y) * Math.min(1, dt * 16);
}

/** Place a vehicle back on the nearest road centre (PRD 6.5). */
export function respawnVehicle(state: VehicleState, env: PhysicsEnvironment): void {
  const nearest = env.track.nearest(state.x, state.z);
  const p = env.track.pointAt(nearest.s);
  state.x = p.x;
  state.z = p.z;
  state.y = p.y + RIDE_HEIGHT;
  state.yaw = Math.atan2(p.tx, p.tz);
  state.vx = 0;
  state.vz = 0;
  state.speed = 0;
  state.steer = 0;
  state.drift = false;
  state.stunned = false;
  state.stunTime = 0;
  state.stunStrength = 0;
  state.nitroTime = 0;
  state.nitroActive = false;
  state.respawnCooldown = 1.5;
  state.offRoad = false;
  state.roadDist = 0;
  state.s = nearest.s;
}

/** Simple, forgiving vehicle-vs-vehicle separation (server authoritative). */
export function resolveVehicleCollisions(
  entries: { id: string; state: VehicleState }[],
  radius = 2.8,
): void {
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i]!;
    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j]!;
      const dx = b.state.x - a.state.x;
      const dz = b.state.z - a.state.z;
      const distSq = dx * dx + dz * dz;
      const minDist = radius * 2;
      if (distSq >= minDist * minDist || distSq < 1e-6) continue;
      const dist = Math.sqrt(distSq);
      const overlap = (minDist - dist) * 0.5;
      const nx = dx / dist;
      const nz = dz / dist;
      a.state.x -= nx * overlap;
      a.state.z -= nz * overlap;
      b.state.x += nx * overlap;
      b.state.z += nz * overlap;

      // Exchange a small amount of momentum instead of hard stops.
      const rel = (b.state.vx - a.state.vx) * nx + (b.state.vz - a.state.vz) * nz;
      if (rel < 0) {
        const impulse = rel * 0.35;
        a.state.vx += nx * impulse;
        a.state.vz += nz * impulse;
        b.state.vx -= nx * impulse;
        b.state.vz -= nz * impulse;
        a.state.speed = Math.hypot(a.state.vx, a.state.vz);
        b.state.speed = Math.hypot(b.state.vx, b.state.vz);
      }
    }
  }
}
