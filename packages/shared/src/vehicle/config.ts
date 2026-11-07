import type { CarConfig } from '../types.js';

/**
 * Vehicle parameter sets. All values are stored here (never hard-coded in
 * components) so client and server use identical tuning (PRD 6.2).
 */
export const CAR_LIST: readonly CarConfig[] = [
  {
    id: 'comet',
    name: 'Comet GT',
    tagline: 'Balanced all-rounder',
    maxSpeed: 46,
    acceleration: 16.5,
    reverseSpeed: 10,
    brakeForce: 32,
    steeringResponse: 7.5,
    grip: 5.4,
    driftGrip: 0.9,
    driftFactor: 0.55,
    nitroForce: 24,
    nitroDuration: 2.5,
    turnRate: 1.72,
    nitroMaxMultiplier: 1.36,
    accent: '#ffb547',
  },
  {
    id: 'lynx',
    name: 'Lynx S',
    tagline: 'Light and nimble drifter',
    maxSpeed: 42,
    acceleration: 19,
    reverseSpeed: 11,
    brakeForce: 30,
    steeringResponse: 9,
    grip: 5.0,
    driftGrip: 0.65,
    driftFactor: 0.72,
    nitroForce: 22,
    nitroDuration: 2.5,
    turnRate: 2.0,
    nitroMaxMultiplier: 1.32,
    accent: '#6ee7b7',
  },
  {
    id: 'bison',
    name: 'Bison V8',
    tagline: 'Heavy top-speed bruiser',
    maxSpeed: 51,
    acceleration: 14,
    reverseSpeed: 9,
    brakeForce: 34,
    steeringResponse: 6.2,
    grip: 5.8,
    driftGrip: 1.1,
    driftFactor: 0.45,
    nitroForce: 27,
    nitroDuration: 2.5,
    turnRate: 1.55,
    nitroMaxMultiplier: 1.4,
    accent: '#ff5d5d',
  },
] as const;

export const DEFAULT_CAR_ID = 'comet';

export function getCarConfig(carId: string): CarConfig {
  return CAR_LIST.find((car) => car.id === carId) ?? (CAR_LIST[0] as CarConfig);
}

export function isValidCarId(carId: string): boolean {
  return CAR_LIST.some((car) => car.id === carId);
}
