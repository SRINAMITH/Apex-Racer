import * as THREE from 'three';
import { generateTrack } from './Track';
import { Vehicle, VehicleModel } from './Vehicle';
import { ParticleSystem } from './ParticleSystem';
import { AudioSystem } from './Audio';
import { Renderer } from './Renderer';
import { Minimap } from './Minimap';
import { TOTAL_LAPS } from './constants';

export class GameEngine {
  canvas: HTMLCanvasElement;
  minimapCanvas: HTMLCanvasElement;
  renderer: Renderer;
  audio: AudioSystem;
  particles: ParticleSystem;
  minimap: Minimap;
  
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  
  waypoints: any[] = [];
  boostPads: any[] = [];
  vehicles: Vehicle[] = [];
  player!: Vehicle;
  
  keys: Record<string, boolean> = {};
  
  gameState: 'menu' | 'countdown' | 'playing' | 'finished' | 'paused' = 'menu';
  countdown = 3;
  raceTime = 0;
  lastTime = 0;
  animationFrameId = 0;
  cameraShake = 0;
  
  onStateChange: (state: any) => void;
  
  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement, mapType: string, onStateChange: (state: any) => void) {
    this.canvas = canvas;
    this.minimapCanvas = minimapCanvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.renderer = new Renderer(canvas, this.scene, this.camera);
    this.audio = new AudioSystem();
    this.particles = new ParticleSystem(this.scene);
    this.minimap = new Minimap(minimapCanvas);
    this.onStateChange = onStateChange;
    
    const trackData = generateTrack(mapType as any);
    this.waypoints = trackData.waypoints;
    this.boostPads = trackData.boostPads;
    
    this.renderer.initTrack(this.waypoints, this.boostPads, trackData.scenery, trackData.mapType);
    this.minimap.init(this.waypoints);
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    this.lastTime = performance.now();
    this.loop(performance.now());
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    cancelAnimationFrame(this.animationFrameId);
    this.audio.stopEngine();
    this.renderer.destroy();
  }

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys['accelerate'] = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys['brake'] = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys['left'] = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys['right'] = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys['nitro'] = true;
  };

  handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys['accelerate'] = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys['brake'] = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys['left'] = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys['right'] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys['nitro'] = false;
  };

  setTouchKey(key: string, value: boolean) {
    this.keys[key] = value;
  }

  startGame(model: VehicleModel) {
    this.audio.init();
    
    // Clear existing vehicle meshes
    this.renderer.clearVehicles();
    
    const startX = this.waypoints[0].x;
    const startY = this.waypoints[0].y;
    
    this.player = new Vehicle(startX, startY, '#06b6d4', true, model);
    this.player.angle = Math.atan2(this.waypoints[1].y - startY, this.waypoints[1].x - startX);
    
    this.vehicles = [
      this.player,
      new Vehicle(startX - 50, startY + 50, '#ef4444', false, 'porsche'),
      new Vehicle(startX + 50, startY + 50, '#eab308', false, 'sportbike'),
      new Vehicle(startX - 100, startY + 100, '#10b981', false, 'lambo'),
      new Vehicle(startX + 100, startY + 100, '#8b5cf6', false, 'dirtbike'),
    ];
    
    this.vehicles.forEach(v => {
      if (v !== this.player) v.angle = this.player.angle;
      this.renderer.addVehicle(v);
    });

    this.gameState = 'countdown';
    this.countdown = 3;
    this.raceTime = 0;
    
    this.updateState();
    this.runCountdown();
  }

  resetToMenu() {
    this.gameState = 'menu';
    this.audio.stopEngine();
    this.renderer.clearVehicles();
    this.player = undefined as any;
    this.vehicles = [];
    this.updateState();
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.audio.stopEngine();
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.audio.startEngine(this.player.isBike);
      this.lastTime = performance.now();
    }
    this.updateState();
  }

  runCountdown() {
    if (this.gameState !== 'countdown') return;

    if (this.countdown > 0) {
      setTimeout(() => {
        if (this.gameState !== 'countdown') return;
        this.countdown--;
        this.updateState();
        this.runCountdown();
      }, 1000);
    } else {
      this.gameState = 'playing';
      this.audio.startEngine(this.player.isBike);
      this.updateState();
    }
  }

  updateState() {
    // Calculate position
    const sorted = [...this.vehicles].sort((a, b) => {
      if (b.lap !== a.lap) return b.lap - a.lap;
      return b.lastProgress - a.lastProgress;
    });
    const position = sorted.indexOf(this.player) + 1;

    this.onStateChange({
      gameState: this.gameState,
      countdown: this.countdown,
      lap: Math.min(this.player?.lap + 1 || 1, TOTAL_LAPS),
      speed: Math.abs(Math.round(this.player?.speed * 10 || 0)),
      nitro: this.player?.nitro || 0,
      position,
      totalVehicles: this.vehicles.length || 1,
      time: this.raceTime
    });
  }

  loop = (time: number) => {
    this.animationFrameId = requestAnimationFrame(this.loop);
    
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.renderer.resize(window.innerWidth, window.innerHeight);

    if (this.gameState === 'playing') {
      this.raceTime += dt;
      
      if (this.cameraShake > 0) {
        this.cameraShake -= dt * 30;
        if (this.cameraShake < 0) this.cameraShake = 0;
      }

      this.vehicles.forEach(v => v.update(this.keys, this.waypoints, this.vehicles, this.particles, this.boostPads));
      this.particles.update();
      
      // Collisions
      for (let i = 0; i < this.vehicles.length; i++) {
        for (let j = i + 1; j < this.vehicles.length; j++) {
          const v1 = this.vehicles[i];
          const v2 = this.vehicles[j];
          const dist = Math.hypot(v1.x - v2.x, v1.y - v2.y);
          const minDist = (v1.width + v2.width) / 1.5;
          if (dist < minDist) {
            const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
            const overlap = minDist - dist;
            v1.x -= Math.cos(angle) * overlap / 2;
            v1.y -= Math.sin(angle) * overlap / 2;
            v2.x += Math.cos(angle) * overlap / 2;
            v2.y += Math.sin(angle) * overlap / 2;
            
            const tempSpeed = v1.speed;
            v1.speed = v2.speed * 0.8;
            v2.speed = tempSpeed * 0.8;

            if (v1.isPlayer || v2.isPlayer) {
              this.audio.playCrash();
              this.cameraShake = 20;
            }
          }
        }
      }

      this.audio.updateEngine(this.player.speed, this.player.maxSpeed, this.player.isBike);

      if (this.player.lap >= TOTAL_LAPS) {
        this.gameState = 'finished';
        this.audio.stopEngine();
        
        const bestTime = localStorage.getItem('nitroRushBestTime');
        if (!bestTime || this.raceTime < parseFloat(bestTime)) {
          localStorage.setItem('nitroRushBestTime', this.raceTime.toString());
        }
      }
      
      if (this.player.isBoosting) {
        this.audio.playNitro();
      }
      
      if (this.player.nitroJustActivated) {
        this.renderer.flash = 1;
        this.player.nitroJustActivated = false;
      }
      
      this.updateState();
    }

    if (this.player) {
      this.renderer.updateCamera(this.player, this.cameraShake);
      this.renderer.updateVehicles(this.vehicles);
      this.minimap.draw(this.vehicles, this.player);
    } else {
      // Menu camera
      const cx = this.waypoints[0]?.x || 0;
      const cy = this.waypoints[0]?.y || 0;
      this.camera.position.x = cx + Math.cos(time / 2000) * 800;
      this.camera.position.y = cy + Math.sin(time / 2000) * 800;
      this.camera.position.z = 400;
      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(cx, cy, 0);
    }
    this.renderer.render();
  };
}
