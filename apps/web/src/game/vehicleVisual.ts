import * as pc from 'playcanvas';

export class VehicleVisual {
  public root: pc.Entity;
  private bodyMesh: pc.Entity;
  private wheels: pc.Entity[] = [];
  private shieldBubble: pc.Entity | null = null;
  private nitroTrail: pc.Entity | null = null;
  private bodyMaterial: pc.StandardMaterial;

  constructor(app: pc.Application, name: string, colorHex: string) {
    this.root = new pc.Entity(name);

    // Car Body Material (Glossy Automotive Finish)
    this.bodyMaterial = new pc.StandardMaterial();
    this.bodyMaterial.diffuse = new pc.Color().fromString(colorHex || '#e63946');
    this.bodyMaterial.specular = new pc.Color(0.9, 0.9, 0.9);
    this.bodyMaterial.shininess = 80;
    this.bodyMaterial.metalness = 0.55;
    this.bodyMaterial.useMetalness = true;
    this.bodyMaterial.update();

    // Secondary Accent Material (Carbon / Dark Trim)
    const trimMat = new pc.StandardMaterial();
    trimMat.diffuse = new pc.Color(0.08, 0.09, 0.1);
    trimMat.metalness = 0.8;
    trimMat.useMetalness = true;
    trimMat.shininess = 60;
    trimMat.update();

    // Wheel Material (Rubber + Rim)
    const tireMat = new pc.StandardMaterial();
    tireMat.diffuse = new pc.Color(0.12, 0.12, 0.14);
    tireMat.shininess = 20;
    tireMat.update();

    const rimMat = new pc.StandardMaterial();
    rimMat.diffuse = new pc.Color(0.85, 0.85, 0.9);
    rimMat.metalness = 0.9;
    rimMat.useMetalness = true;
    rimMat.shininess = 90;
    rimMat.update();

    // Windshield & Windows (Tinted Glass)
    const glassMat = new pc.StandardMaterial();
    glassMat.diffuse = new pc.Color(0.05, 0.1, 0.18);
    glassMat.opacity = 0.85;
    glassMat.blendType = pc.BLEND_NORMAL;
    glassMat.shininess = 95;
    glassMat.specular = new pc.Color(1, 1, 1);
    glassMat.update();

    // Headlight Material (Glowing Cyan-White)
    const headlightMat = new pc.StandardMaterial();
    headlightMat.diffuse = new pc.Color(0.9, 0.95, 1.0);
    headlightMat.emissive = new pc.Color(0.8, 0.9, 1.0);
    headlightMat.update();

    // Taillight Material (Glowing Red)
    const taillightMat = new pc.StandardMaterial();
    taillightMat.diffuse = new pc.Color(0.9, 0.05, 0.05);
    taillightMat.emissive = new pc.Color(0.9, 0.05, 0.05);
    taillightMat.update();

    // --- CAR BODY SCULPTING (FRONT IS +Z, REAR IS -Z) ---

    // 1. Lower Main Chassis
    this.bodyMesh = new pc.Entity('Chassis');
    this.bodyMesh.addComponent('render', {
      type: 'box',
      material: this.bodyMaterial,
      castShadows: true,
    });
    this.bodyMesh.setLocalScale(1.85, 0.45, 4.0);
    this.bodyMesh.setLocalPosition(0, 0.38, 0);
    this.root.addChild(this.bodyMesh);

    // 2. Aerodynamic Hood (Sloping forward towards +Z)
    const hood = new pc.Entity('Hood');
    hood.addComponent('render', {
      type: 'box',
      material: this.bodyMaterial,
      castShadows: true,
    });
    hood.setLocalScale(1.7, 0.28, 1.4);
    hood.setLocalPosition(0, 0.52, 1.1);
    hood.setLocalEulerAngles(-4, 0, 0);
    this.root.addChild(hood);

    // 3. Cabin & Greenhouse (Centered towards rear)
    const cabin = new pc.Entity('Cabin');
    cabin.addComponent('render', {
      type: 'box',
      material: glassMat,
      castShadows: true,
    });
    cabin.setLocalScale(1.4, 0.5, 2.1);
    cabin.setLocalPosition(0, 0.82, -0.2);
    this.root.addChild(cabin);

    // 4. Roof Plate
    const roof = new pc.Entity('Roof');
    roof.addComponent('render', {
      type: 'box',
      material: this.bodyMaterial,
      castShadows: true,
    });
    roof.setLocalScale(1.36, 0.08, 1.5);
    roof.setLocalPosition(0, 1.08, -0.3);
    this.root.addChild(roof);

    // 5. Rear Spoiler / Wing
    const wing = new pc.Entity('RearWing');
    wing.addComponent('render', {
      type: 'box',
      material: trimMat,
      castShadows: true,
    });
    wing.setLocalScale(1.8, 0.06, 0.45);
    wing.setLocalPosition(0, 0.95, -1.85);
    this.root.addChild(wing);

    // Wing Struts
    const strutL = new pc.Entity('WingStrutL');
    strutL.addComponent('render', { type: 'box', material: trimMat });
    strutL.setLocalScale(0.08, 0.35, 0.15);
    strutL.setLocalPosition(-0.6, 0.76, -1.85);
    this.root.addChild(strutL);

    const strutR = new pc.Entity('WingStrutR');
    strutR.addComponent('render', { type: 'box', material: trimMat });
    strutR.setLocalScale(0.08, 0.35, 0.15);
    strutR.setLocalPosition(0.6, 0.76, -1.85);
    this.root.addChild(strutR);

    // 6. Front Headlights (+Z front face)
    const lightL = new pc.Entity('HeadlightL');
    lightL.addComponent('render', { type: 'box', material: headlightMat });
    lightL.setLocalScale(0.35, 0.14, 0.08);
    lightL.setLocalPosition(-0.65, 0.48, 2.01);
    this.root.addChild(lightL);

    const lightR = new pc.Entity('HeadlightR');
    lightR.addComponent('render', { type: 'box', material: headlightMat });
    lightR.setLocalScale(0.35, 0.14, 0.08);
    lightR.setLocalPosition(0.65, 0.48, 2.01);
    this.root.addChild(lightR);

    // 7. Rear Taillights (-Z rear face)
    const tailL = new pc.Entity('TaillightL');
    tailL.addComponent('render', { type: 'box', material: taillightMat });
    tailL.setLocalScale(0.4, 0.12, 0.08);
    tailL.setLocalPosition(-0.65, 0.52, -2.01);
    this.root.addChild(tailL);

    const tailR = new pc.Entity('TaillightR');
    tailR.addComponent('render', { type: 'box', material: taillightMat });
    tailR.setLocalScale(0.4, 0.12, 0.08);
    tailR.setLocalPosition(0.65, 0.52, -2.01);
    this.root.addChild(tailR);

    // 8. 4 Wheels with Rims
    const wheelPositions = [
      [-0.98, 0.32, 1.25], // Front-Left
      [0.98, 0.32, 1.25],  // Front-Right
      [-0.98, 0.34, -1.25], // Rear-Left
      [0.98, 0.34, -1.25],  // Rear-Right
    ];

    wheelPositions.forEach((pos, idx) => {
      const wheelHolder = new pc.Entity(`WheelHolder_${idx}`);
      wheelHolder.setLocalPosition(pos[0]!, pos[1]!, pos[2]!);

      // Tire
      const tire = new pc.Entity(`Tire_${idx}`);
      tire.addComponent('render', {
        type: 'cylinder',
        material: tireMat,
      });
      tire.setLocalScale(0.32, 0.68, 0.68);
      tire.setLocalEulerAngles(0, 0, 90);
      wheelHolder.addChild(tire);

      // Rim Cap
      const rim = new pc.Entity(`Rim_${idx}`);
      rim.addComponent('render', {
        type: 'cylinder',
        material: rimMat,
      });
      rim.setLocalScale(0.33, 0.44, 0.44);
      rim.setLocalEulerAngles(0, 0, 90);
      wheelHolder.addChild(rim);

      this.root.addChild(wheelHolder);
      this.wheels.push(wheelHolder);
    });

    // 9. Shield Bubble (Additive glowing sphere)
    const shield = new pc.Entity('ShieldBubble');
    const shieldMat = new pc.StandardMaterial();
    shieldMat.diffuse = new pc.Color(0.2, 0.6, 1.0);
    shieldMat.opacity = 0.45;
    shieldMat.blendType = pc.BLEND_ADDITIVE;
    shieldMat.shininess = 100;
    shieldMat.update();

    shield.addComponent('render', {
      type: 'sphere',
      material: shieldMat,
    });
    shield.setLocalScale(3.4, 2.6, 4.8);
    shield.setLocalPosition(0, 0.7, 0);
    shield.enabled = false;
    this.root.addChild(shield);
    this.shieldBubble = shield;

    // 10. Nitro flame at exhaust (-Z)
    const nitro = new pc.Entity('NitroFlame');
    const nitroMat = new pc.StandardMaterial();
    nitroMat.diffuse = new pc.Color(0.1, 0.8, 1.0);
    nitroMat.emissive = new pc.Color(0.3, 0.9, 1.0);
    nitroMat.opacity = 0.85;
    nitroMat.blendType = pc.BLEND_ADDITIVE;
    nitroMat.update();

    nitro.addComponent('render', {
      type: 'cone',
      material: nitroMat,
    });
    nitro.setLocalScale(0.45, 1.8, 0.45);
    nitro.setLocalEulerAngles(-90, 0, 0); // Pointing out backwards (-Z)
    nitro.setLocalPosition(0, 0.35, -2.5);
    nitro.enabled = false;
    this.root.addChild(nitro);
    this.nitroTrail = nitro;

    app.root.addChild(this.root);
  }

  public updateColor(hex: string) {
    this.bodyMaterial.diffuse = new pc.Color().fromString(hex);
    this.bodyMaterial.update();
  }

  public setTransform(pos: [number, number, number], quat: [number, number, number, number]) {
    this.root.setPosition(pos[0], pos[1], pos[2]);
    this.root.setRotation(quat[0], quat[1], quat[2], quat[3]);
  }

  public updateEffects(shield: boolean, nitro: boolean) {
    if (this.shieldBubble) {
      this.shieldBubble.enabled = shield;
      if (shield) {
        this.shieldBubble.rotate(0, 2, 0);
      }
    }
    if (this.nitroTrail) {
      this.nitroTrail.enabled = nitro;
    }
  }

  public destroy() {
    this.root.destroy();
  }
}
