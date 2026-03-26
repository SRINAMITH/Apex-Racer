import * as THREE from 'three';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;

  constructor(x: number, y: number, vx: number, vy: number, life: number, color: string, size: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
}

export class ParticleSystem {
  particles: Particle[] = [];
  scene: THREE.Scene;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;
  maxParticles = 10000;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    this.material = new THREE.PointsMaterial({
      size: 6,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.position.z = 2; // Slightly above ground
    this.scene.add(this.points);
  }

  emit(x: number, y: number, vx: number, vy: number, color: string, count: number, size: number, life: number) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const spreadVx = vx + (Math.random() - 0.5) * 4;
      const spreadVy = vy + (Math.random() - 0.5) * 4;
      this.particles.push(new Particle(x, y, spreadVx, spreadVy, life * (0.5 + Math.random() * 0.5), color, size * Math.random()));
    }
  }

  emitStatic(x: number, y: number, color: string, size: number, life: number) {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(new Particle(x, y, 0, 0, life, color, size));
    }
  }

  update() {
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);
    
    // Update Three.js buffers
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    
    const colorObj = new THREE.Color();
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = 0;
      
      colorObj.set(p.color);
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
    }
    
    // Hide unused particles by moving them far away
    for (let i = this.particles.length; i < this.maxParticles; i++) {
      positions[i * 3] = 999999;
      positions[i * 3 + 1] = 999999;
      positions[i * 3 + 2] = 999999;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
