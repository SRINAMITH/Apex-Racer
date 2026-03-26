import { Vehicle } from './Vehicle';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private waypoints: {x: number, y: number}[] = [];
  private minX = 0;
  private maxX = 0;
  private minY = 0;
  private maxY = 0;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context for minimap');
    this.ctx = ctx;
  }

  init(waypoints: {x: number, y: number}[]) {
    this.waypoints = waypoints;
    
    // Calculate bounds
    this.minX = Math.min(...waypoints.map(w => w.x));
    this.maxX = Math.max(...waypoints.map(w => w.x));
    this.minY = Math.min(...waypoints.map(w => w.y));
    this.maxY = Math.max(...waypoints.map(w => w.y));

    // Add padding
    const padding = 500;
    this.minX -= padding;
    this.maxX += padding;
    this.minY -= padding;
    this.maxY += padding;

    // Calculate scale and offset to fit in canvas
    const width = this.maxX - this.minX;
    const height = this.maxY - this.minY;
    
    const scaleX = this.canvas.width / width;
    const scaleY = this.canvas.height / height;
    
    this.scale = Math.min(scaleX, scaleY);
    
    this.offsetX = (this.canvas.width - width * this.scale) / 2 - this.minX * this.scale;
    this.offsetY = (this.canvas.height - height * this.scale) / 2 - this.minY * this.scale;
  }

  draw(vehicles: Vehicle[], player: Vehicle) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw track
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 4;
    
    for (let i = 0; i < this.waypoints.length; i++) {
      const wp = this.waypoints[i];
      const x = wp.x * this.scale + this.offsetX;
      const y = wp.y * this.scale + this.offsetY;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();

    // Draw vehicles
    for (const v of vehicles) {
      const x = v.x * this.scale + this.offsetX;
      const y = v.y * this.scale + this.offsetY;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, v === player ? 4 : 3, 0, Math.PI * 2);
      this.ctx.fillStyle = v === player ? '#06b6d4' : v.color;
      this.ctx.fill();
      
      if (v === player) {
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }
}
