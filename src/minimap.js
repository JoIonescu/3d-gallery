import { PAINTINGS } from './config.js';

const SIZE    = 150;
const W_MIN_X = -27, W_MAX_X = 27;
const W_MIN_Z = -27, W_MAX_Z = 20;
const W_W     = W_MAX_X - W_MIN_X;
const W_D     = W_MAX_Z - W_MIN_Z;

function toMap(wx, wz) {
  return {
    x: ((wx - W_MIN_X) / W_W) * SIZE,
    y: ((wz - W_MIN_Z) / W_D) * SIZE,
  };
}

export class Minimap {
  constructor() {
    this.canvas        = document.createElement('canvas');
    this.canvas.width  = SIZE;
    this.canvas.height = SIZE;
    this.canvas.style.cssText = [
      'position:fixed',
      'bottom:90px',
      'right:24px',
      'width:150px',
      'height:150px',
      'border-radius:4px',
      'opacity:0.78',
      'pointer-events:none',
      'z-index:50',
      'display:none',
    ].join(';');
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this._buildStatic();
  }

  show() { this.canvas.style.display = 'block'; }
  hide() { this.canvas.style.display = 'none'; }

  _buildStatic() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Dark background
    ctx.fillStyle = 'rgba(8,7,6,0.92)';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Room definitions [x, z, w, d]
    const rooms = [
      [-10, -10, 20, 20],  // Central Hall
      [-8,  -26, 16, 16],  // North Gallery
      [10,   -7, 16, 14],  // East Gallery
      [-26,  -7, 16, 14],  // West Gallery
      [-1.8, 10, 3.6, 8],  // Corridor
    ];

    ctx.lineWidth = 0.5;
    for (const [rx, rz, rw, rd] of rooms) {
      const tl = toMap(rx, rz);
      const br = toMap(rx + rw, rz + rd);
      ctx.fillStyle   = 'rgba(240,236,229,0.06)';
      ctx.strokeStyle = 'rgba(240,236,229,0.28)';
      ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    }

    // Doorway gaps — erase wall lines at openings
    const gaps = [
      [-1.7, -10,  1.7, -10],  // Central ↔ North
      [10,   -1.7, 10,   1.7], // Central ↔ East
      [-10,  -1.7, -10,  1.7], // Central ↔ West
      [-1.7,  10,   1.7, 10],  // Central ↔ Corridor
    ];
    ctx.strokeStyle = 'rgba(8,7,6,0.95)';
    ctx.lineWidth   = 3;
    for (const [x1,z1,x2,z2] of gaps) {
      const a = toMap(x1, z1), b = toMap(x2, z2);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Painting dots
    const roomCentres = [
      [-10,-10,20,20], [-8,-26,16,16], [10,-7,16,14], [-26,-7,16,14]
    ];
    for (const p of PAINTINGS) {
      const r = roomCentres[p.room];
      if (!r) continue;
      const [rx,rz,rw,rd] = r;
      const rcx = rx + rw/2, rcz = rz + rd/2;
      let wx, wz;
      switch (p.wall) {
        case 'north': wx = rcx + p.offset; wz = rz + 0.5; break;
        case 'south': wx = rcx + p.offset; wz = rz + rd - 0.5; break;
        case 'east':  wx = rx + rw - 0.5;  wz = rcz + p.offset; break;
        case 'west':  wx = rx + 0.5;        wz = rcz + p.offset; break;
        default: continue;
      }
      const mp = toMap(wx, wz);
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251,208,14,0.75)';
      ctx.fill();
    }

    this._static = ctx.getImageData(0, 0, SIZE, SIZE);
  }

  update(camera) {
    if (!this._static) return;
    const ctx = this.ctx;
    ctx.putImageData(this._static, 0, 0);

    const px = camera.position.x;
    const pz = camera.position.z;
    const mp = toMap(px, pz);

    // Get forward direction from camera rotation Y
    const ry   = camera.rotation.y;
    const fwdX = -Math.sin(ry);
    const fwdZ = -Math.cos(ry);

    // Player dot
    ctx.beginPath();
    ctx.arc(mp.x, mp.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Direction arrow
    const len = 7;
    const ex  = mp.x + fwdX * len;
    const ey  = mp.y + fwdZ * len;
    ctx.beginPath();
    ctx.moveTo(mp.x, mp.y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Arrowhead
    const ang = Math.atan2(ey - mp.y, ex - mp.x);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 5 * Math.cos(ang - 0.5), ey - 5 * Math.sin(ang - 0.5));
    ctx.lineTo(ex - 5 * Math.cos(ang + 0.5), ey - 5 * Math.sin(ang + 0.5));
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}