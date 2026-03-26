import { catmullRom } from './math';

export type MapType = 'grassland' | 'city' | 'highway' | 'monaco' | 'chicago';

export function generateTrack(mapType: MapType = 'grassland') {
  let controlPoints = [];

  if (mapType === 'monaco') {
    // Monaco-style tight street circuit
    controlPoints = [
      { x: 0, y: 0 },
      { x: 1000, y: -200 },
      { x: 1500, y: -800 },
      { x: 2000, y: -1000 },
      { x: 2500, y: -500 },
      { x: 2200, y: 500 },
      { x: 1800, y: 1000 },
      { x: 1500, y: 1500 },
      { x: 800, y: 1200 },
      { x: 200, y: 1500 },
      { x: -500, y: 1000 },
      { x: -800, y: 500 },
    ];
  } else if (mapType === 'chicago') {
    // Chicago-style grid layout with sharp 90-degree turns
    controlPoints = [
      { x: 0, y: 0 },
      { x: 2000, y: 0 },
      { x: 2500, y: 500 },
      { x: 2500, y: 2000 },
      { x: 2000, y: 2500 },
      { x: 500, y: 2500 },
      { x: 0, y: 2000 },
      { x: 0, y: 1500 },
      { x: -1000, y: 1500 },
      { x: -1500, y: 1000 },
      { x: -1500, y: 500 },
      { x: -1000, y: 0 },
    ];
  } else {
    // Default track
    controlPoints = [
      { x: 0, y: 0 },
      { x: 1500, y: -500 },
      { x: 3000, y: 0 },
      { x: 3500, y: 2000 },
      { x: 2000, y: 3500 },
      { x: 0, y: 4000 },
      { x: -1000, y: 2500 },
      { x: -500, y: 1000 },
    ];
  }

  const waypoints = [];
  const boostPads = [];
  const scenery = [];
  const numSegments = 25;
  for (let i = 0; i < controlPoints.length; i++) {
    const p0 = controlPoints[(i - 1 + controlPoints.length) % controlPoints.length];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % controlPoints.length];
    const p3 = controlPoints[(i + 2) % controlPoints.length];
    for (let t = 0; t < 1; t += 1 / numSegments) {
      waypoints.push(catmullRom(p0, p1, p2, p3, t));
    }
  }

  for (let i = 0; i < waypoints.length; i++) {
    if (i % 40 === 20) {
      const next = waypoints[(i + 1) % waypoints.length];
      const angle = Math.atan2(next.y - waypoints[i].y, next.x - waypoints[i].x);
      boostPads.push({ x: waypoints[i].x, y: waypoints[i].y, angle });
    }
  }

  // Calculate bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const wp of waypoints) {
    if (wp.x < minX) minX = wp.x;
    if (wp.x > maxX) maxX = wp.x;
    if (wp.y < minY) minY = wp.y;
    if (wp.y > maxY) maxY = wp.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  // Generate scenery
  for (let i = 0; i < 300; i++) {
    const x = (Math.random() - 0.5) * (width + 4000) + centerX;
    const y = (Math.random() - 0.5) * (height + 4000) + centerY;
    
    // Check distance to track to avoid placing scenery on the road
    let tooClose = false;
    for (const wp of waypoints) {
      if (Math.hypot(x - wp.x, y - wp.y) < 300) {
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      const scale = 0.5 + Math.random() * 1.5;
      scenery.push({ x, y, scale, type: Math.random() > 0.5 ? 1 : 2 });
    }
  }

  return { waypoints, boostPads, scenery, mapType };
}
