import * as pc from 'playcanvas';
import {
  createAlpineValleyMap,
  createAlpineValleyTrack,
  terrainHeightAt,
  type MapDefinition,
  type Track,
  type MapPickup,
} from '@horizon/shared';

export class WorldManager {
  public app: pc.Application;
  public map: MapDefinition;
  public track: Track;
  public pickupPositions: MapPickup[] = [];
  private roadEntity: pc.Entity | null = null;
  private groundEntity: pc.Entity | null = null;
  private waterEntity: pc.Entity | null = null;
  private propEntities: pc.Entity[] = [];

  constructor(app: pc.Application) {
    this.app = app;
    this.map = createAlpineValleyMap();
    this.track = createAlpineValleyTrack();

    this.pickupPositions = this.map.pickupFractions.map((fraction, index) => {
      const s = fraction * this.track.length;
      const p = this.track.pointAt(s);
      const rightX = p.tz;
      const rightZ = -p.tx;
      const lateral = (index % 2 === 0 ? 1 : -1) * Math.min(2.6, this.map.roadWidth * 0.2);
      return {
        id: index,
        s,
        lateral,
        x: p.x + rightX * lateral,
        y: p.y + 0.9,
        z: p.z + rightZ * lateral,
      };
    });
  }

  public buildScenicWorld() {
    this.setupLightingAndAtmosphere();
    this.buildTerrain();
    this.buildRoadMesh();
    this.buildLake();
    this.buildSceneryProps();
  }

  private setupLightingAndAtmosphere() {
    // Atmospheric fog matching PRD 10/11
    if (this.app.scene.fog) {
      this.app.scene.fog.type = pc.FOG_EXP2;
      this.app.scene.fog.color = new pc.Color().fromString(this.map.environment.fogColor);
      this.app.scene.fog.density = 0.0015;
    }

    // Ambient light
    this.app.scene.ambientLight = new pc.Color(0.42, 0.46, 0.52);

    // Directional sunlight
    const sun = new pc.Entity('Sun');
    sun.addComponent('light', {
      type: 'directional',
      color: new pc.Color().fromString(this.map.environment.sunColor),
      castShadows: true,
      shadowBias: 0.15,
      normalOffsetBias: 0.05,
      shadowDistance: 300,
      shadowResolution: 2048,
    });
    sun.setEulerAngles(48, 135, 0);
    this.app.root.addChild(sun);
  }

  private buildTerrain() {
    const terrain = new pc.Entity('Terrain');
    const width = 1600;
    const height = 1600;
    const segments = 120; // High resolution smooth terrain

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfW = width / 2;
    const halfH = height / 2;

    for (let i = 0; i <= segments; i++) {
      const x = -halfW + (width * i) / segments;
      const u = i / segments;

      for (let j = 0; j <= segments; j++) {
        const z = -halfH + (height * j) / segments;
        const v = j / segments;

        // Use the EXACT shared terrainHeightAt formula as the physics engine
        const y = terrainHeightAt(this.track, this.map.lake, x, z);

        positions.push(x, y, z);
        normals.push(0, 1, 0); // Will recalculate smooth normals
        uvs.push(u * 20, v * 20);

        if (i < segments && j < segments) {
          const row1 = i * (segments + 1) + j;
          const row2 = (i + 1) * (segments + 1) + j;
          indices.push(row1, row2, row1 + 1);
          indices.push(row1 + 1, row2, row2 + 1);
        }
      }
    }

    // Compute vertex normals for lighting
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i]! * 3;
      const i1 = indices[i + 1]! * 3;
      const i2 = indices[i + 2]! * 3;

      const v0x = positions[i0]!, v0y = positions[i0 + 1]!, v0z = positions[i0 + 2]!;
      const v1x = positions[i1]!, v1y = positions[i1 + 1]!, v1z = positions[i1 + 2]!;
      const v2x = positions[i2]!, v2y = positions[i2 + 1]!, v2z = positions[i2 + 2]!;

      const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
      const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;

      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;

      normals[i0]! += nx; normals[i0 + 1]! += ny; normals[i0 + 2]! += nz;
      normals[i1]! += nx; normals[i1 + 1]! += ny; normals[i1 + 2]! += nz;
      normals[i2]! += nx; normals[i2 + 1]! += ny; normals[i2 + 2]! += nz;
    }

    // Normalize
    for (let i = 0; i < normals.length; i += 3) {
      const nx = normals[i]!, ny = normals[i + 1]!, nz = normals[i + 2]!;
      const len = Math.hypot(nx, ny, nz) || 1;
      normals[i] = nx / len;
      normals[i + 1] = ny / len;
      normals[i + 2] = nz / len;
    }

    const terrainMesh = new pc.Mesh(this.app.graphicsDevice);
    terrainMesh.setPositions(positions);
    terrainMesh.setNormals(normals);
    terrainMesh.setUvs(0, uvs);
    terrainMesh.setIndices(indices);
    terrainMesh.update();

    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color().fromString(this.map.environment.groundLow);
    mat.specular = new pc.Color(0.04, 0.04, 0.04);
    mat.shininess = 15;
    mat.update();

    const meshInstance = new pc.MeshInstance(terrainMesh, mat);
    terrain.addComponent('render', {
      meshInstances: [meshInstance],
    });

    this.app.root.addChild(terrain);
    this.groundEntity = terrain;
  }

  private buildRoadMesh() {
    const samples = 450;
    const roadWidth = this.map.roadWidth;
    const halfWidth = roadWidth / 2;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const totalLen = this.track.length;

    for (let i = 0; i <= samples; i++) {
      const frac = i / samples;
      const s = (frac * totalLen) % totalLen;
      const p = this.track.pointAt(s);

      const tx = p.tx;
      const tz = p.tz;
      const rx = tz;
      const rz = -tx;

      const yOffset = 0.12; // Raised cleanly above ground terrain

      const lx = p.x - rx * halfWidth;
      const ly = p.y + yOffset;
      const lz = p.z - rz * halfWidth;

      const rxPos = p.x + rx * halfWidth;
      const ry = p.y + yOffset;
      const rzPos = p.z + rz * halfWidth;

      positions.push(lx, ly, lz);
      positions.push(rxPos, ry, rzPos);

      normals.push(0, 1, 0);
      normals.push(0, 1, 0);

      uvs.push(0, frac * 60);
      uvs.push(1, frac * 60);

      if (i < samples) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      }
    }

    const mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(positions);
    mesh.setNormals(normals);
    mesh.setUvs(0, uvs);
    mesh.setIndices(indices);
    mesh.update();

    const roadMat = new pc.StandardMaterial();
    roadMat.diffuse = new pc.Color(0.18, 0.19, 0.22);
    roadMat.specular = new pc.Color(0.25, 0.25, 0.25);
    roadMat.shininess = 30;
    roadMat.update();

    const roadInstance = new pc.MeshInstance(mesh, roadMat);
    const road = new pc.Entity('Road');
    road.addComponent('render', {
      meshInstances: [roadInstance],
    });

    this.app.root.addChild(road);
    this.roadEntity = road;

    // Road Curbs / Guardrails along sides
    this.buildRoadCurbs(samples, totalLen, roadWidth);

    // Arch
    this.buildStartFinishLine();
  }

  private buildRoadCurbs(samples: number, totalLen: number, roadWidth: number) {
    const curbMat = new pc.StandardMaterial();
    curbMat.diffuse = new pc.Color(0.85, 0.85, 0.85);
    curbMat.shininess = 20;
    curbMat.update();

    const leftPositions: number[] = [];
    const rightPositions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    const halfWidth = roadWidth / 2;
    const curbWidth = 0.6;

    for (let i = 0; i <= samples; i++) {
      const frac = i / samples;
      const s = (frac * totalLen) % totalLen;
      const p = this.track.pointAt(s);

      const rx = p.tz;
      const rz = -p.tx;
      const yOffset = 0.15;

      // Left curb strip
      const lInnerX = p.x - rx * halfWidth;
      const lInnerZ = p.z - rz * halfWidth;
      const lOuterX = p.x - rx * (halfWidth + curbWidth);
      const lOuterZ = p.z - rz * (halfWidth + curbWidth);

      leftPositions.push(lInnerX, p.y + yOffset, lInnerZ);
      leftPositions.push(lOuterX, p.y + yOffset, lOuterZ);
      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(0, frac * 60, 1, frac * 60);

      if (i < samples) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      }
    }

    const leftMesh = new pc.Mesh(this.app.graphicsDevice);
    leftMesh.setPositions(leftPositions);
    leftMesh.setNormals(normals);
    leftMesh.setUvs(0, uvs);
    leftMesh.setIndices(indices);
    leftMesh.update();

    const curbEntity = new pc.Entity('RoadCurbs');
    curbEntity.addComponent('render', {
      meshInstances: [new pc.MeshInstance(leftMesh, curbMat)],
    });
    this.app.root.addChild(curbEntity);
  }

  private buildStartFinishLine() {
    const pStart = this.track.pointAt(0);
    const arch = new pc.Entity('StartFinishArch');
    arch.setPosition(pStart.x, pStart.y + 4.5, pStart.z);

    const bannerMat = new pc.StandardMaterial();
    bannerMat.diffuse = new pc.Color(0.95, 0.8, 0.15);
    bannerMat.shininess = 60;
    bannerMat.update();

    const beam = new pc.Entity('ArchBeam');
    beam.addComponent('render', { type: 'box', material: bannerMat });
    beam.setLocalScale(this.map.roadWidth + 4, 1.2, 1.2);
    arch.addChild(beam);

    const leftPillar = new pc.Entity('PillarL');
    leftPillar.addComponent('render', { type: 'box', material: bannerMat });
    leftPillar.setLocalScale(1, 9, 1);
    leftPillar.setLocalPosition(-(this.map.roadWidth / 2 + 1.5), -4.5, 0);
    arch.addChild(leftPillar);

    const rightPillar = new pc.Entity('PillarR');
    rightPillar.addComponent('render', { type: 'box', material: bannerMat });
    rightPillar.setLocalScale(1, 9, 1);
    rightPillar.setLocalPosition(this.map.roadWidth / 2 + 1.5, -4.5, 0);
    arch.addChild(rightPillar);

    const yaw = Math.atan2(pStart.tx, pStart.tz) * (180 / Math.PI);
    arch.setEulerAngles(0, yaw, 0);

    this.app.root.addChild(arch);
  }

  private buildLake() {
    const lake = new pc.Entity('Lake');
    const radius = this.map.lake.radius;

    const waterMat = new pc.StandardMaterial();
    waterMat.diffuse = new pc.Color(0.1, 0.35, 0.58);
    waterMat.opacity = 0.88;
    waterMat.blendType = pc.BLEND_NORMAL;
    waterMat.shininess = 95;
    waterMat.specular = new pc.Color(0.9, 0.95, 1.0);
    waterMat.update();

    lake.addComponent('render', {
      type: 'cylinder',
      material: waterMat,
    });
    lake.setLocalScale(radius * 2, 0.2, radius * 2);
    lake.setPosition(this.map.lake.x, this.map.lake.waterY, this.map.lake.z);

    this.app.root.addChild(lake);
    this.waterEntity = lake;
  }

  private buildSceneryProps() {
    const trunkMat = new pc.StandardMaterial();
    trunkMat.diffuse = new pc.Color(0.28, 0.16, 0.08);
    trunkMat.update();

    const foliageMat = new pc.StandardMaterial();
    foliageMat.diffuse = new pc.Color().fromString(this.map.environment.treeColor);
    foliageMat.shininess = 10;
    foliageMat.update();

    const foliageAltMat = new pc.StandardMaterial();
    foliageAltMat.diffuse = new pc.Color().fromString(this.map.environment.treeColorAlt);
    foliageAltMat.shininess = 10;
    foliageAltMat.update();

    const treeCount = 200;
    const len = this.track.length;

    for (let i = 0; i < treeCount; i++) {
      const s = (i / treeCount) * len;
      const p = this.track.pointAt(s);

      const side = (i % 2 === 0 ? 1 : -1);
      const dist = 13 + (Math.sin(i * 1337) * 0.5 + 0.5) * 50;
      const rx = p.tz;
      const rz = -p.tx;

      const tx = p.x + rx * side * dist;
      const tz = p.z + rz * side * dist;
      const ty = terrainHeightAt(this.track, this.map.lake, tx, tz);

      // Don't place tree under lake
      if (ty < this.map.lake.waterY) continue;

      const tree = new pc.Entity(`Tree_${i}`);
      tree.setPosition(tx, ty, tz);

      const trunk = new pc.Entity('Trunk');
      trunk.addComponent('render', { type: 'cylinder', material: trunkMat });
      trunk.setLocalScale(0.65, 2.8, 0.65);
      trunk.setLocalPosition(0, 1.4, 0);
      tree.addChild(trunk);

      const foliage = new pc.Entity('Foliage');
      foliage.addComponent('render', {
        type: 'cone',
        material: i % 2 === 0 ? foliageMat : foliageAltMat,
      });
      const scale = 2.8 + ((i % 5) * 0.4);
      foliage.setLocalScale(scale, scale * 2.3, scale);
      foliage.setLocalPosition(0, 2.6 + scale, 0);
      tree.addChild(foliage);

      this.app.root.addChild(tree);
      this.propEntities.push(tree);
    }
  }
}
