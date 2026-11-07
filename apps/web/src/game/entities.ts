import * as pc from 'playcanvas';
import type { PickupSnapshot, MineSnapshot } from '@horizon/shared';

export class EntityManager {
  private app: pc.Application;
  private pickupEntities = new Map<number, pc.Entity>();
  private mineEntities = new Map<string, pc.Entity>();

  private pickupMat: pc.StandardMaterial;
  private mineMat: pc.StandardMaterial;

  constructor(app: pc.Application) {
    this.app = app;

    // Glowing yellow/gold pickup box
    this.pickupMat = new pc.StandardMaterial();
    this.pickupMat.diffuse = new pc.Color(1.0, 0.85, 0.1);
    this.pickupMat.emissive = new pc.Color(0.8, 0.6, 0.0);
    this.pickupMat.shininess = 80;
    this.pickupMat.update();

    // Red warning mine
    this.mineMat = new pc.StandardMaterial();
    this.mineMat.diffuse = new pc.Color(0.9, 0.1, 0.1);
    this.mineMat.emissive = new pc.Color(0.6, 0.0, 0.0);
    this.mineMat.shininess = 60;
    this.mineMat.update();
  }

  public initPickups(pickups: Array<{ id: number; x: number; y: number; z: number }>) {
    pickups.forEach((p) => {
      if (this.pickupEntities.has(p.id)) return;

      const entity = new pc.Entity(`Pickup_${p.id}`);
      entity.addComponent('render', {
        type: 'box',
        material: this.pickupMat,
      });
      entity.setLocalScale(1.4, 1.4, 1.4);
      entity.setPosition(p.x, p.y + 0.6, p.z);

      this.app.root.addChild(entity);
      this.pickupEntities.set(p.id, entity);
    });
  }

  public updatePickups(pickups: PickupSnapshot[], dt: number) {
    pickups.forEach((snap) => {
      const entity = this.pickupEntities.get(snap.id);
      if (entity) {
        entity.enabled = snap.active;
        if (snap.active) {
          // Bob and rotate
          entity.rotate(45 * dt, 90 * dt, 20 * dt);
        }
      }
    });
  }

  public updateMines(mines: MineSnapshot[], dt: number) {
    const currentMineIds = new Set(mines.map((m) => m.id));

    // Remove deleted mines
    for (const [id, entity] of this.mineEntities.entries()) {
      if (!currentMineIds.has(id)) {
        entity.destroy();
        this.mineEntities.delete(id);
      }
    }

    // Add or update active mines
    mines.forEach((m) => {
      let entity = this.mineEntities.get(m.id);
      if (!entity) {
        entity = new pc.Entity(`Mine_${m.id}`);
        entity.addComponent('render', {
          type: 'cone',
          material: this.mineMat,
        });
        entity.setLocalScale(1.2, 0.8, 1.2);
        entity.setPosition(m.p[0], m.p[1] + 0.3, m.p[2]);
        this.app.root.addChild(entity);
        this.mineEntities.set(m.id, entity);
      } else {
        entity.setPosition(m.p[0], m.p[1] + 0.3, m.p[2]);
      }
    });
  }
}

