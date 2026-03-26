import { TRACK_WIDTH, MAX_NITRO } from './constants';
import { ParticleSystem } from './ParticleSystem';

export type VehicleModel = 'lambo' | 'porsche' | 'sportbike' | 'dirtbike' | 'cruiser' | 'generic';

export class Vehicle {
  x: number;
  y: number;
  angle: number;
  angularVelocity: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  friction: number;
  turnSpeed: number;
  color: string;
  isPlayer: boolean;
  isBike: boolean;
  model: VehicleModel;
  width: number;
  length: number;
  lap: number;
  nitro: number;
  isBoosting: boolean;
  isDrifting: boolean;
  nitroJustActivated: boolean;
  lastProgress: number;
  passedHalfway: boolean;

  constructor(x: number, y: number, color: string, isPlayer = false, model: VehicleModel = 'generic') {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.angularVelocity = 0;
    this.speed = 0;
    this.model = model;
    this.isBike = ['sportbike', 'dirtbike', 'cruiser'].includes(model);
    
    // Default stats
    this.maxSpeed = 10;
    this.acceleration = 0.2;
    this.turnSpeed = 0.05;
    this.width = 24;
    this.length = 48;
    this.friction = 0.98;

    if (model === 'lambo') {
      this.maxSpeed = 12;
      this.acceleration = 0.25;
      this.turnSpeed = 0.04;
      this.width = 26;
      this.length = 52;
    } else if (model === 'porsche') {
      this.maxSpeed = 10;
      this.acceleration = 0.22;
      this.turnSpeed = 0.06;
      this.width = 24;
      this.length = 48;
    } else if (model === 'sportbike') {
      this.maxSpeed = 12;
      this.acceleration = 0.3;
      this.turnSpeed = 0.07;
      this.width = 12;
      this.length = 36;
    } else if (model === 'dirtbike') {
      this.maxSpeed = 9;
      this.acceleration = 0.35;
      this.turnSpeed = 0.09;
      this.width = 14;
      this.length = 38;
    } else if (model === 'cruiser') {
      this.maxSpeed = 10;
      this.acceleration = 0.18;
      this.turnSpeed = 0.04;
      this.width = 16;
      this.length = 44;
    } else if (this.isBike) {
      this.maxSpeed = 10;
      this.acceleration = 0.25;
      this.turnSpeed = 0.07;
      this.width = 12;
      this.length = 36;
    }
    
    if (!isPlayer) {
      this.maxSpeed *= 0.85; // AI is slightly slower
    }
    
    this.color = color;
    this.isPlayer = isPlayer;
    this.lap = 0;
    this.nitro = MAX_NITRO;
    this.isBoosting = false;
    this.isDrifting = false;
    this.nitroJustActivated = false;
    this.lastProgress = 0;
    this.passedHalfway = false;
  }

  update(keys: Record<string, boolean>, waypoints: any[], allVehicles: Vehicle[], particles: ParticleSystem, boostPads: any[]) {
    // Find closest waypoint
    let minDist = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const dist = Math.hypot(this.x - wp.x, this.y - wp.y);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    const onGrass = minDist > TRACK_WIDTH / 2;
    let grassFriction = 0.85;
    if (this.model === 'dirtbike') grassFriction = 0.92;
    const currentFriction = onGrass ? grassFriction : (this.isDrifting ? 0.95 : this.friction);
    
    const lapMultiplier = this.isPlayer ? 1 : 1 + (this.lap * 0.05);
    const currentMaxSpeed = onGrass ? this.maxSpeed * (this.model === 'dirtbike' ? 0.6 : 0.4) : (this.isBoosting ? this.maxSpeed * 1.5 : this.maxSpeed * lapMultiplier);

    if (this.isPlayer) {
      if (keys['accelerate']) this.speed += this.acceleration;
      if (keys['brake']) this.speed -= this.acceleration * 1.5;
      
      this.isDrifting = keys['brake'] && (keys['left'] || keys['right']) && this.speed > 10;
      
      if (this.isDrifting && !onGrass) {
        this.nitro = Math.min(MAX_NITRO, this.nitro + 0.2);
        // Drift sparks
        const backX = this.x - Math.cos(this.angle) * this.length / 2;
        const backY = this.y - Math.sin(this.angle) * this.length / 2;
        particles.emit(backX, backY, -Math.cos(this.angle)*2, -Math.sin(this.angle)*2, '#fbbf24', 2, 3, 10);
      }

      if (keys['nitro'] && this.nitro > 0 && !onGrass && this.speed > 5) {
        if (!this.isBoosting) {
          this.nitroJustActivated = true;
        }
        this.isBoosting = true;
        this.nitro -= 0.5;
        // Nitro flames
        const backX = this.x - Math.cos(this.angle) * this.length / 2;
        const backY = this.y - Math.sin(this.angle) * this.length / 2;
        particles.emit(backX, backY, -Math.cos(this.angle)*5, -Math.sin(this.angle)*5, '#06b6d4', 3, 5, 15);
      } else {
        this.isBoosting = false;
        if (this.nitro < MAX_NITRO && !this.isDrifting) this.nitro += 0.05;
      }

      const turnFactor = Math.min(Math.abs(this.speed) / (this.maxSpeed * 0.3), 1);
      const actualTurnSpeed = this.isDrifting ? this.turnSpeed * 1.5 : this.turnSpeed;
      
      // Fix inverted controls: pressing left should increase angle (turn counter-clockwise)
      const turnInput = (keys['left'] ? 1 : 0) - (keys['right'] ? 1 : 0);
      const targetAngularVelocity = turnInput * actualTurnSpeed * turnFactor * Math.sign(this.speed);
      
      this.angularVelocity += (targetAngularVelocity - this.angularVelocity) * 0.15;
      this.angle += this.angularVelocity;
    } else {
      // AI Logic
      const targetIndex = (closestIndex + 8) % waypoints.length;
      const target = waypoints[targetIndex];

      const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Avoid other vehicles
      let avoidAngle = 0;
      for (const other of allVehicles) {
        if (other === this) continue;
        const dist = Math.hypot(other.x - this.x, other.y - this.y);
        if (dist < 150) {
          const angleToOther = Math.atan2(other.y - this.y, other.x - this.x);
          let diff = angleToOther - this.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) < Math.PI / 2) {
            avoidAngle -= Math.sign(diff) * 0.5 * (150 - dist) / 150;
          }
        }
      }

      angleDiff += avoidAngle;

      const turnFactor = Math.min(Math.abs(this.speed) / (this.maxSpeed * 0.5), 1);
      
      let targetAngularVelocity = 0;
      if (angleDiff > 0.1) targetAngularVelocity = this.turnSpeed * turnFactor;
      else if (angleDiff < -0.1) targetAngularVelocity = -this.turnSpeed * turnFactor;
      
      this.angularVelocity += (targetAngularVelocity - this.angularVelocity) * 0.2;
      this.angle += this.angularVelocity;

      if (Math.abs(angleDiff) < 0.5) {
        this.speed += this.acceleration * 0.9;
        // Use nitro on straightaways
        if (Math.abs(angleDiff) < 0.1 && this.nitro > 0 && this.speed > this.maxSpeed * 0.8 && Math.random() < 0.05) {
          this.isBoosting = true;
        }
      } else {
        this.speed += this.acceleration * 0.4;
      }

      if (this.isBoosting) {
        this.nitro -= 0.5;
        if (this.nitro <= 0 || Math.abs(angleDiff) > 0.3) {
          this.isBoosting = false;
        }
        // Nitro flames
        const backX = this.x - Math.cos(this.angle) * this.length / 2;
        const backY = this.y - Math.sin(this.angle) * this.length / 2;
        particles.emit(backX, backY, -Math.cos(this.angle)*5, -Math.sin(this.angle)*5, '#06b6d4', 3, 5, 15);
      } else {
        if (this.nitro < MAX_NITRO) this.nitro += 0.02;
      }
    }

    this.speed *= currentFriction;
    if (this.speed > currentMaxSpeed) this.speed = currentMaxSpeed;
    if (this.speed < -currentMaxSpeed / 2) this.speed = -currentMaxSpeed / 2;

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Dirt marks on grass or drifting marks on track
    if (onGrass && Math.abs(this.speed) > 2) {
      if (this.isBike) {
        const backX = this.x - Math.cos(this.angle) * this.length / 2;
        const backY = this.y - Math.sin(this.angle) * this.length / 2;
        particles.emitStatic(backX, backY, '#3f2e1c', 3, 60);
      } else {
        const backX = this.x - Math.cos(this.angle) * this.length / 3;
        const backY = this.y - Math.sin(this.angle) * this.length / 3;
        const rightX = backX + Math.cos(this.angle + Math.PI/2) * this.width / 2;
        const rightY = backY + Math.sin(this.angle + Math.PI/2) * this.width / 2;
        const leftX = backX - Math.cos(this.angle + Math.PI/2) * this.width / 2;
        const leftY = backY - Math.sin(this.angle + Math.PI/2) * this.width / 2;
        particles.emitStatic(rightX, rightY, '#3f2e1c', 4, 60);
        particles.emitStatic(leftX, leftY, '#3f2e1c', 4, 60);
      }
    } else if (this.isDrifting && !onGrass && Math.abs(this.speed) > 5) {
      // Skid marks on track
      if (this.isBike) {
        const backX = this.x - Math.cos(this.angle) * this.length / 2;
        const backY = this.y - Math.sin(this.angle) * this.length / 2;
        particles.emitStatic(backX, backY, '#000000', 3, 80);
      } else {
        const backX = this.x - Math.cos(this.angle) * this.length / 3;
        const backY = this.y - Math.sin(this.angle) * this.length / 3;
        const rightX = backX + Math.cos(this.angle + Math.PI/2) * this.width / 2;
        const rightY = backY + Math.sin(this.angle + Math.PI/2) * this.width / 2;
        const leftX = backX - Math.cos(this.angle + Math.PI/2) * this.width / 2;
        const leftY = backY - Math.sin(this.angle + Math.PI/2) * this.width / 2;
        particles.emitStatic(rightX, rightY, '#000000', 4, 80);
        particles.emitStatic(leftX, leftY, '#000000', 4, 80);
      }
    }

    // Check boost pads
    for (const pad of boostPads) {
      const dist = Math.hypot(this.x - pad.x, this.y - pad.y);
      if (dist < 40) {
        this.speed = this.maxSpeed * 1.8;
        this.nitro = Math.min(MAX_NITRO, this.nitro + 1);
        if (this.isPlayer) {
          particles.emit(this.x, this.y, 0, 0, '#06b6d4', 10, 5, 20);
        }
      }
    }

    // Lap counting
    if (closestIndex > waypoints.length / 2) {
      this.passedHalfway = true;
    }
    if (closestIndex < 10 && this.lastProgress > waypoints.length - 10 && this.passedHalfway) {
      this.lap++;
      this.passedHalfway = false;
    }
    this.lastProgress = closestIndex;
  }

  // 3D rendering is handled by Renderer.ts
  // draw(ctx: CanvasRenderingContext2D) { ... }
}
