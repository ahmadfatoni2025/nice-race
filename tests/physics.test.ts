import { describe, it, expect } from 'vitest';
import {
  createVehicleState,
  stepVehicle,
  getCarConfig,
  DEFAULT_CAR_ID,
  createAlpineValleyTrack,
  createAlpineValleyMap,
  PhysicsEnvironment,
} from '@horizon/shared';

describe('Vehicle Physics', () => {
  it('accelerates vehicle forward on positive throttle', () => {
    const track = createAlpineValleyTrack();
    const map = createAlpineValleyMap();
    const env: PhysicsEnvironment = {
      track,
      lake: map.lake,
      roadWidth: map.roadWidth,
    };

    const state = createVehicleState({ x: 0, y: 0, z: -300, yaw: 0 });
    const car = getCarConfig(DEFAULT_CAR_ID);
    const input = { seq: 1, throttle: 1, steering: 0, brake: false, drift: false, nitro: false };

    for (let i = 0; i < 60; i++) {
      stepVehicle(state, input, car, env, 1 / 60);
    }

    expect(state.speed).toBeGreaterThan(5);
  });
});
