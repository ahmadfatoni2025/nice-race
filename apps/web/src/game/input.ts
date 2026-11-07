import type { VehicleInput } from '@horizon/shared';

export class InputManager {
  private keys = new Set<string>();
  private seq = 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser default scrolling on arrow keys and spacebar
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  public getInput(): VehicleInput {
    let throttle = 0;
    let steering = 0;

    const isUp = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const isDown = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const isLeft = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const isRight = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const isSpace = this.keys.has('Space');
    const isShift = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    // W / ArrowUp = Forward Throttle (+1.0)
    if (isUp && !isDown) {
      throttle = 1.0;
    }

    // Steering: A/ArrowLeft = Turn Left (-1), D/ArrowRight = Turn Right (+1)
    if (isLeft && !isRight) {
      steering = -1.0;
    } else if (isRight && !isLeft) {
      steering = 1.0;
    }

    // S / ArrowDown = Brake / Reverse
    const brake = isDown || isSpace;
    const drift = isSpace && Math.abs(steering) > 0.1;
    const nitro = isShift;

    this.seq++;

    return {
      seq: this.seq,
      throttle,
      steering,
      brake,
      drift,
      nitro,
    };
  }

  public isAbilityPressed(): boolean {
    return this.keys.has('KeyE');
  }

  public isRespawnPressed(): boolean {
    return this.keys.has('KeyR');
  }
}
