import * as pc from 'playcanvas';

export class ChaseCamera {
  public cameraEntity: pc.Entity;
  private targetEntity: pc.Entity | null = null;
  private currentPos = new pc.Vec3();
  private currentLookAt = new pc.Vec3();

  // Configurable chase camera parameters (PRD 7)
  public distance = 8.0;
  public height = 3.2;
  public lookAtOffset = 1.0;
  public posLerp = 0.12;
  public rotLerp = 0.15;

  constructor(app: pc.Application) {
    this.cameraEntity = new pc.Entity('MainCamera');
    this.cameraEntity.addComponent('camera', {
      clearColor: new pc.Color(0.79, 0.87, 0.93),
      farClip: 1400,
      nearClip: 0.2,
      fov: 65,
    });

    app.root.addChild(this.cameraEntity);
  }

  public setTarget(target: pc.Entity) {
    this.targetEntity = target;
    const targetPos = target.getPosition();
    const rot = target.getRotation();
    // In our coordinate space: +Z is forward, -Z is behind vehicle.
    const backVector = new pc.Vec3(0, 0, -1);
    rot.transformVector(backVector, backVector);

    this.currentPos.set(
      targetPos.x + backVector.x * this.distance,
      targetPos.y + this.height,
      targetPos.z + backVector.z * this.distance,
    );
    this.currentLookAt.set(targetPos.x, targetPos.y + this.lookAtOffset, targetPos.z);
    this.cameraEntity.setPosition(this.currentPos);
    this.cameraEntity.lookAt(this.currentLookAt);
  }

  public update(dt: number, speedKmh: number = 0) {
    if (!this.targetEntity) return;

    const targetPos = this.targetEntity.getPosition();
    const rot = this.targetEntity.getRotation();

    // In physics/world: car's forward is +Z, rear is -Z
    const forwardVector = new pc.Vec3(0, 0, 1);
    const backVector = new pc.Vec3(0, 0, -1);
    rot.transformVector(forwardVector, forwardVector);
    rot.transformVector(backVector, backVector);

    // Dynamic distance & FOV based on speed
    const speedRatio = Math.min(1.5, Math.max(0, speedKmh / 160));
    const dynamicDistance = this.distance + speedRatio * 2.0;
    const dynamicHeight = this.height + speedRatio * 0.4;

    // Desired camera position behind vehicle (along rear vector)
    const desiredX = targetPos.x + backVector.x * dynamicDistance;
    const desiredY = targetPos.y + dynamicHeight;
    const desiredZ = targetPos.z + backVector.z * dynamicDistance;

    // Smooth position interpolation
    this.currentPos.x += (desiredX - this.currentPos.x) * this.posLerp;
    this.currentPos.y += (desiredY - this.currentPos.y) * this.posLerp;
    this.currentPos.z += (desiredZ - this.currentPos.z) * this.posLerp;

    this.cameraEntity.setPosition(this.currentPos);

    // Look at target ahead of vehicle
    const targetLookAtX = targetPos.x + forwardVector.x * 3.5;
    const targetLookAtY = targetPos.y + this.lookAtOffset;
    const targetLookAtZ = targetPos.z + forwardVector.z * 3.5;

    this.currentLookAt.x += (targetLookAtX - this.currentLookAt.x) * this.rotLerp;
    this.currentLookAt.y += (targetLookAtY - this.currentLookAt.y) * this.rotLerp;
    this.currentLookAt.z += (targetLookAtZ - this.currentLookAt.z) * this.rotLerp;

    this.cameraEntity.lookAt(this.currentLookAt);

    // Dynamic FOV punch for speed
    if (this.cameraEntity.camera) {
      this.cameraEntity.camera.fov = 65 + speedRatio * 15;
    }
  }
}
