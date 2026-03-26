import * as THREE from 'three';
import { TRACK_WIDTH } from './constants';
import { Vehicle } from './Vehicle';
import { ParticleSystem } from './ParticleSystem';

export class Renderer {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  width: number;
  height: number;
  flash: number = 0;
  
  vehicleMeshes: Map<Vehicle, THREE.Group> = new Map();

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.canvas = canvas;
    this.scene = scene;
    this.camera = camera;
    this.width = canvas.width;
    this.height = canvas.height;
    
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x87CEEB); // Sky blue background
    
    // Fog for depth
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 50);
    this.scene.add(directionalLight);
    
    // Ground
    const groundGeo = new THREE.PlaneGeometry(10000, 10000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x064e3b }); // Dark green grass
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = 'ground';
    ground.position.z = -1; // Slightly below track
    this.scene.add(ground);
    
    // Grid Helper
    const gridHelper = new THREE.GridHelper(10000, 100);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -0.5;
    this.scene.add(gridHelper);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  initTrack(waypoints: any[], boostPads: any[], scenery: any[], mapType: string) {
    // Set environment based on map type
    const ground = this.scene.getObjectByName('ground') as THREE.Mesh;
    
    if (mapType === 'city' || mapType === 'chicago') {
      this.renderer.setClearColor(0x0f172a); // Night sky
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0015);
      // Ground color
      if (ground) ground.material = new THREE.MeshStandardMaterial({ color: 0x1e293b }); // Dark concrete
    } else if (mapType === 'highway') {
      this.renderer.setClearColor(0xfdba74); // Sunset orange
      this.scene.fog = new THREE.FogExp2(0xfdba74, 0.001);
      // Ground color
      if (ground) ground.material = new THREE.MeshStandardMaterial({ color: 0x78716c }); // Desert sand/dirt
    } else if (mapType === 'monaco') {
      this.renderer.setClearColor(0x38bdf8); // Bright sky blue
      this.scene.fog = new THREE.FogExp2(0x38bdf8, 0.001);
      // Ground color
      if (ground) ground.material = new THREE.MeshStandardMaterial({ color: 0x0284c7 }); // Ocean blue
    } else {
      // Grassland (default)
      this.renderer.setClearColor(0x87CEEB); // Sky blue
      this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);
      // Ground color
      if (ground) ground.material = new THREE.MeshStandardMaterial({ color: 0x064e3b }); // Dark green grass
    }

    // Basic track using a thick line
    const points = waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, 0));
    // Close the loop
    points.push(new THREE.Vector3(waypoints[0].x, waypoints[0].y, 0));
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, waypoints.length * 2, TRACK_WIDTH / 2, 8, true);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const trackMesh = new THREE.Mesh(tubeGeo, tubeMat);
    // Flatten the tube to make a road
    trackMesh.scale.z = 0.01;
    this.scene.add(trackMesh);
    
    // Start/Finish line
    const startGeo = new THREE.PlaneGeometry(TRACK_WIDTH, 20);
    const startMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const startMesh = new THREE.Mesh(startGeo, startMat);
    startMesh.position.set(waypoints[0].x, waypoints[0].y, 0.5);
    const angle = Math.atan2(waypoints[1].y - waypoints[0].y, waypoints[1].x - waypoints[0].x);
    startMesh.rotation.z = angle;
    this.scene.add(startMesh);
    
    // Boost Pads
    for (const pad of boostPads) {
      const padGeo = new THREE.PlaneGeometry(40, 40);
      const padMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.5 });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.set(pad.x, pad.y, 0.5);
      padMesh.rotation.z = pad.angle;
      this.scene.add(padMesh);
    }

    // Render Scenery
    const sceneryGroup = new THREE.Group();
    
    if (mapType === 'city' || mapType === 'chicago') {
      const buildingGeo = new THREE.BoxGeometry(100, 100, 1);
      const buildingMat1 = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
      const buildingMat2 = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
      
      for (const item of scenery) {
        const height = 200 + Math.random() * 600;
        const mesh = new THREE.Mesh(buildingGeo, item.type === 1 ? buildingMat1 : buildingMat2);
        mesh.position.set(item.x, item.y, height / 2);
        mesh.scale.set(item.scale, item.scale, height);
        mesh.rotation.z = Math.random() * Math.PI;
        sceneryGroup.add(mesh);
      }
    } else if (mapType === 'highway') {
      const rockGeo = new THREE.DodecahedronGeometry(50, 1);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.9 });
      
      for (const item of scenery) {
        const mesh = new THREE.Mesh(rockGeo, rockMat);
        mesh.position.set(item.x, item.y, 20 * item.scale);
        mesh.scale.set(item.scale, item.scale, item.scale * (0.5 + Math.random()));
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        sceneryGroup.add(mesh);
      }
    } else if (mapType === 'monaco') {
      // Monaco: Yachts and buildings
      const buildingGeo = new THREE.BoxGeometry(100, 100, 1);
      const buildingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }); // White buildings
      const yachtGeo = new THREE.ConeGeometry(30, 100, 4);
      const yachtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      
      for (const item of scenery) {
        if (item.type === 1) {
          // Building
          const height = 100 + Math.random() * 300;
          const mesh = new THREE.Mesh(buildingGeo, buildingMat);
          mesh.position.set(item.x, item.y, height / 2);
          mesh.scale.set(item.scale, item.scale, height);
          mesh.rotation.z = Math.random() * Math.PI;
          sceneryGroup.add(mesh);
        } else {
          // Yacht
          const mesh = new THREE.Mesh(yachtGeo, yachtMat);
          mesh.position.set(item.x, item.y, 15);
          mesh.rotation.x = Math.PI / 2;
          mesh.rotation.z = Math.random() * Math.PI;
          sceneryGroup.add(mesh);
        }
      }
    } else {
      // Grassland Trees
      const trunkGeo = new THREE.CylinderGeometry(5, 5, 20, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      const leavesGeo = new THREE.ConeGeometry(25, 60, 8);
      const leavesMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
      
      for (const item of scenery) {
        const tree = new THREE.Group();
        
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.rotation.x = Math.PI / 2;
        trunk.position.z = 10;
        
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.rotation.x = Math.PI / 2;
        leaves.position.z = 40;
        
        tree.add(trunk);
        tree.add(leaves);
        
        tree.position.set(item.x, item.y, 0);
        tree.scale.set(item.scale, item.scale, item.scale);
        sceneryGroup.add(tree);
      }
    }
    
    this.scene.add(sceneryGroup);
  }

  clearVehicles() {
    this.vehicleMeshes.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.vehicleMeshes.clear();
  }

  addVehicle(vehicle: Vehicle) {
    const group = new THREE.Group();
    
    if (vehicle.model === 'lambo') {
      // Lambo-like shape
      const bodyGeo = new THREE.BoxGeometry(vehicle.length, vehicle.width, 8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: vehicle.color, roughness: 0.2, metalness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.z = 6;
      
      const cabinGeo = new THREE.BoxGeometry(vehicle.length * 0.4, vehicle.width * 0.7, 6);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(-vehicle.length * 0.1, 0, 12);
      
      const spoilerGeo = new THREE.BoxGeometry(4, vehicle.width * 0.9, 2);
      const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
      const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
      spoiler.position.set(-vehicle.length * 0.45, 0, 12);
      
      group.add(body);
      group.add(cabin);
      group.add(spoiler);
    } else if (vehicle.model === 'porsche') {
      // Porsche-like shape (curvier)
      const bodyGeo = new THREE.CylinderGeometry(vehicle.width/2, vehicle.width/2, vehicle.length, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: vehicle.color, roughness: 0.3, metalness: 0.6 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.z = Math.PI / 2;
      body.position.z = 6;
      body.scale.z = 0.5; // Flatten it
      
      const cabinGeo = new THREE.SphereGeometry(vehicle.width * 0.4, 16, 16);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(-vehicle.length * 0.1, 0, 8);
      cabin.scale.x = 1.5;
      cabin.scale.z = 0.8;
      
      group.add(body);
      group.add(cabin);
    } else if (vehicle.isBike) {
      // Bike shape
      const bodyGeo = new THREE.BoxGeometry(vehicle.length * 0.8, vehicle.width, 10);
      const bodyMat = new THREE.MeshStandardMaterial({ color: vehicle.color, roughness: 0.4, metalness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.z = 8;
      
      const riderGeo = new THREE.BoxGeometry(vehicle.length * 0.3, vehicle.width * 0.8, 14);
      const riderMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
      const rider = new THREE.Mesh(riderGeo, riderMat);
      rider.position.set(-vehicle.length * 0.1, 0, 18);
      
      // Handlebars
      const handleGeo = new THREE.CylinderGeometry(1, 1, vehicle.width * 1.5, 8);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(vehicle.length * 0.2, 0, 16);
      
      group.add(body);
      group.add(rider);
      group.add(handle);
    } else {
      // Generic box
      const geo = new THREE.BoxGeometry(vehicle.length, vehicle.width, 10);
      const mat = new THREE.MeshStandardMaterial({ color: vehicle.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = 5;
      group.add(mesh);
    }
    
    // Add wheels to all vehicles
    const wheelGeo = new THREE.CylinderGeometry(4, 4, 3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    
    const wheelPositions = vehicle.isBike ? [
      [vehicle.length * 0.4, 0, 4], // Front
      [-vehicle.length * 0.4, 0, 4] // Back
    ] : [
      [vehicle.length * 0.3, vehicle.width * 0.5, 4], // Front Left
      [vehicle.length * 0.3, -vehicle.width * 0.5, 4], // Front Right
      [-vehicle.length * 0.3, vehicle.width * 0.5, 4], // Back Left
      [-vehicle.length * 0.3, -vehicle.width * 0.5, 4] // Back Right
    ];

    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      group.add(wheel);
    }
    
    this.scene.add(group);
    this.vehicleMeshes.set(vehicle, group);
  }

  updateVehicles(vehicles: Vehicle[]) {
    for (const vehicle of vehicles) {
      const mesh = this.vehicleMeshes.get(vehicle);
      if (mesh) {
        mesh.position.set(vehicle.x, vehicle.y, 0);
        mesh.rotation.z = vehicle.angle;
      }
    }
  }

  updateCamera(player: Vehicle, cameraShake: number) {
    // Follow camera
    const cameraDistance = 120;
    const cameraHeight = 80;
    
    // Position camera behind the player
    const targetX = player.x - Math.cos(player.angle) * cameraDistance;
    const targetY = player.y - Math.sin(player.angle) * cameraDistance;
    
    // Look slightly ahead of the player
    const lookAheadDist = 50;
    const lookAtX = player.x + Math.cos(player.angle) * lookAheadDist;
    const lookAtY = player.y + Math.sin(player.angle) * lookAheadDist;
    
    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;
    if (cameraShake > 0) {
      shakeX = (Math.random() - 0.5) * cameraShake * 0.5;
      shakeY = (Math.random() - 0.5) * cameraShake * 0.5;
      shakeZ = (Math.random() - 0.5) * cameraShake * 0.5;
    }

    // Smooth camera movement
    this.camera.position.x += (targetX - this.camera.position.x) * 0.05 + shakeX;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.05 + shakeY;
    this.camera.position.z = cameraHeight + shakeZ;
    
    // Always keep up vector as Z initially
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(lookAtX, lookAtY, 0);
    
    // Add some tilt based on turning
    const tilt = -player.angularVelocity * 1.5;
    this.camera.rotateZ(tilt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.renderer.dispose();
    this.scene.clear();
  }
}
