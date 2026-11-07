import * as pc from 'playcanvas';
import {
  createVehicleState,
  stepVehicle,
  getCarConfig,
  yawToQuaternion,
  type VehicleState,
  type VehicleInput,
  type PlayerSnapshot,
  type WorldSnapshot,
  type PhysicsEnvironment,
  type RaceResult,
  PHYSICS_STEP,
} from '@horizon/shared';
import { WorldManager } from './world.js';
import { VehicleVisual } from './vehicleVisual.js';
import { ChaseCamera } from './camera.js';
import { EntityManager } from './entities.js';
import { InputManager } from './input.js';
import { NetworkClient } from '../network/client.js';
import { sounds } from '../audio/sounds.js';

export interface GameCallbacks {
  onSpeedUpdate: (speedKmh: number) => void;
  onRaceUpdate: (race: any, localRank: number) => void;
  onAbilityUpdate: (ability: string | null) => void;
  onRaceFinished: (results: RaceResult[]) => void;
  onFpsUpdate: (fps: number, drawCalls: number) => void;
}

export class GameManager {
  private app: pc.Application;
  private network: NetworkClient;
  private input: InputManager;
  private world: WorldManager;
  private camera: ChaseCamera;
  private entities: EntityManager;
  private callbacks: GameCallbacks;

  private localState: VehicleState | null = null;
  private localVisual: VehicleVisual | null = null;
  private remoteVisuals = new Map<string, VehicleVisual>();
  private env: PhysicsEnvironment;

  private lastSnapshotTime = 0;
  private fpsCounter = 0;
  private fpsTimer = 0;
  private currentAbility: string | null = null;
  private isRacing = false;
  private isCountdown = false;

  constructor(canvas: HTMLCanvasElement, network: NetworkClient, callbacks: GameCallbacks) {
    this.network = network;
    this.callbacks = callbacks;
    this.input = new InputManager();

    // Create PlayCanvas Application with WebGL2 (PRD 12.5)
    this.app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      keyboard: new pc.Keyboard(window),
      graphicsDeviceOptions: {
        antialias: true,
        alpha: false,
        preferWebGl2: true,
        powerPreference: 'high-performance',
      },
    });

    this.app.start();
    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);

    window.addEventListener('resize', () => {
      this.app.resizeCanvas();
    });

    this.world = new WorldManager(this.app);
    this.world.buildScenicWorld();

    this.camera = new ChaseCamera(this.app);
    this.entities = new EntityManager(this.app);
    this.entities.initPickups(this.world.pickupPositions);

    this.env = {
      track: this.world.track,
      lake: this.world.map.lake,
      roadWidth: this.world.map.roadWidth,
    };

    // Initialize local vehicle at starting grid line immediately so player can drive/inspect
    const startSlot = this.world.track.gridSlots(1, this.world.map.roadWidth)[0]!;
    this.initLocalVehicle(startSlot);

    this.setupNetworkEvents();
    this.startMainLoop();
  }

  private setupNetworkEvents() {
    this.network.on('gameStarting', (data) => {
      this.isRacing = true;
      this.isCountdown = true;
      sounds.resume();
      sounds.playCountdownBeep(false);

      // Find local spawn in grid
      const localSlot = data.grid.find((s) => s.playerId === this.network.playerId);
      const spawn = localSlot
        ? { x: localSlot.p[0], y: localSlot.p[1], z: localSlot.p[2], yaw: localSlot.yaw }
        : this.world.track.gridSlots(1, this.world.map.roadWidth)[0]!;

      this.initLocalVehicle(spawn);
    });

    this.network.on('gameStarted', () => {
      this.isCountdown = false;
      sounds.playCountdownBeep(true);
    });

    this.network.on('snapshot', (snap) => {
      this.handleSnapshot(snap);
    });

    this.network.on('worldEvent', (evt) => {
      this.handleWorldEvent(evt);
    });

    this.network.on('raceResults', (results) => {
      this.isRacing = false;
      this.isCountdown = false;
      sounds.playFinish();
      this.callbacks.onRaceFinished(results);
    });
  }

  public initLocalVehicle(spawn: { x: number; y: number; z: number; yaw: number }, color = '#e63946') {
    if (this.localVisual) {
      this.localVisual.destroy();
    }
    this.localState = createVehicleState(spawn);
    this.localVisual = new VehicleVisual(this.app, 'LocalCar', color);
    const q = yawToQuaternion(spawn.yaw);
    this.localVisual.setTransform([spawn.x, spawn.y, spawn.z], q);
    this.camera.setTarget(this.localVisual.root);
  }

  private handleSnapshot(snap: WorldSnapshot) {
    this.lastSnapshotTime = Date.now();
    this.entities.updatePickups(snap.pickups, PHYSICS_STEP);
    this.entities.updateMines(snap.mines, PHYSICS_STEP);

    let localRank = 1;
    if (snap.race) {
      const myRaceData = snap.race.players.find((p) => p.id === this.network.playerId);
      if (myRaceData) {
        localRank = myRaceData.rank;
      }
      this.callbacks.onRaceUpdate(snap.race, localRank);
    }

    const currentRemoteIds = new Set<string>();

    snap.players.forEach((p) => {
      if (p.id === this.network.playerId) {
        // Authoritative reconciliation for local player
        if (this.localState) {
          this.currentAbility = p.ability;
          this.callbacks.onAbilityUpdate(p.ability);

          // Subtle reconciliation to prevent jarring snapping
          const distErr = Math.hypot(p.p[0] - this.localState.x, p.p[2] - this.localState.z);
          if (distErr > 3.0) {
            this.localState.x += (p.p[0] - this.localState.x) * 0.2;
            this.localState.y += (p.p[1] - this.localState.y) * 0.2;
            this.localState.z += (p.p[2] - this.localState.z) * 0.2;
          }
        }
      } else {
        currentRemoteIds.add(p.id);
        let remote = this.remoteVisuals.get(p.id);
        if (!remote) {
          remote = new VehicleVisual(this.app, `Remote_${p.id}`, '#457b9d');
          this.remoteVisuals.set(p.id, remote);
        }
        // Remote interpolation
        remote.setTransform(p.p, p.q);
        remote.updateEffects(p.shield, p.nitro);
      }
    });

    // Remove disconnected remote visual cars
    for (const [id, visual] of this.remoteVisuals.entries()) {
      if (!currentRemoteIds.has(id)) {
        visual.destroy();
        this.remoteVisuals.delete(id);
      }
    }
  }

  private handleWorldEvent(evt: any) {
    switch (evt.type) {
      case 'nitro':
        sounds.playNitro();
        break;
      case 'shield':
        sounds.playShield();
        break;
      case 'shockwave':
        sounds.playShockwave();
        break;
      case 'mine-drop':
        sounds.playMineDrop();
        break;
      case 'mine-hit':
        sounds.playMineHit();
        break;
      case 'pickup':
        if (evt.playerId === this.network.playerId) {
          sounds.playPickup();
        }
        break;
      case 'checkpoint':
        if (evt.playerId === this.network.playerId) {
          sounds.playCheckpoint();
        }
        break;
      case 'lap':
        if (evt.playerId === this.network.playerId) {
          sounds.playLap();
        }
        break;
    }
  }

  private startMainLoop() {
    this.app.on('update', (dt: number) => {
      // Clamp dt to avoid physics explodes on tab blur/freeze
      const safeDt = Math.min(dt, 0.05);

      // FPS metrics (PRD 21.2)
      this.fpsCounter++;
      this.fpsTimer += safeDt;
      if (this.fpsTimer >= 1.0) {
        const fps = Math.round(this.fpsCounter / this.fpsTimer);
        const drawCalls = (this.app.graphicsDevice as any)._drawCallsPerFrame || 50;
        this.callbacks.onFpsUpdate(fps, drawCalls);
        this.fpsCounter = 0;
        this.fpsTimer = 0;
      }

      if (this.localState && this.localVisual) {
        const car = getCarConfig('comet');
        const rawInput = this.input.getInput();

        // If frozen in countdown 3-2-1, disallow throttle forward
        const input: VehicleInput = this.isCountdown
          ? { ...rawInput, throttle: 0, nitro: false }
          : rawInput;

        // Check ability button 'E'
        if (this.input.isAbilityPressed() && this.currentAbility && !this.isCountdown) {
          this.network.send({
            v: 1,
            t: 'ability:use',
            seq: input.seq,
          });
        }

        // Check respawn button 'R'
        if (this.input.isRespawnPressed()) {
          this.network.send({
            v: 1,
            t: 'player:respawn',
          });
        }

        // Send input packet to server if connected
        this.network.send({
          v: 1,
          t: 'vehicle:input',
          seq: input.seq,
          throttle: input.throttle,
          steering: input.steering,
          brake: input.brake,
          drift: input.drift,
          nitro: input.nitro,
        });

        // Client prediction: step physics locally using identical math
        stepVehicle(this.localState, input, car, this.env, safeDt, { frozen: this.isCountdown });

        const q = yawToQuaternion(this.localState.yaw);
        this.localVisual.setTransform([this.localState.x, this.localState.y, this.localState.z], q);
        this.localVisual.updateEffects(this.localState.shieldActive, this.localState.nitroActive);

        const speedKmh = Math.round(this.localState.speed * 3.6);
        this.callbacks.onSpeedUpdate(speedKmh);

        sounds.updateEngine(speedKmh, this.localState.nitroActive);
        sounds.playDrift(this.localState.drift);

        this.camera.update(safeDt, speedKmh);
      }
    });
  }

  public setQuality(preset: 'low' | 'medium' | 'high') {
    switch (preset) {
      case 'low':
        this.app.graphicsDevice.maxPixelRatio = 0.8;
        break;
      case 'medium':
        this.app.graphicsDevice.maxPixelRatio = 1.0;
        break;
      case 'high':
        this.app.graphicsDevice.maxPixelRatio = window.devicePixelRatio || 1.5;
        break;
    }
    this.app.resizeCanvas();
  }
}
