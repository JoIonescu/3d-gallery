import * as THREE from 'three';
import { ROOMS, PAINTINGS, WALL_H, DOOR_W, DOOR_H, HANG_H } from './config.js';

export const paintingObjects = [];
const isMobile = window.matchMedia('(pointer: coarse)').matches;

// ── Texture generators ────────────────────────────────────────────────────────

function makeMarbleTexture() {
  const size = isMobile ? 256 : 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d   = img.data;

  const NW = 64;
  const noise = new Float32Array(NW * NW);
  for (let i = 0; i < noise.length; i++) noise[i] = Math.random();

  function smoothNoise(x, y) {
    const ix = Math.floor(x) & (NW - 1);
    const iy = Math.floor(y) & (NW - 1);
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const n00 = noise[iy       * NW + ix];
    const n10 = noise[iy       * NW + ((ix+1) & (NW-1))];
    const n01 = noise[((iy+1) & (NW-1)) * NW + ix];
    const n11 = noise[((iy+1) & (NW-1)) * NW + ((ix+1) & (NW-1))];
    return n00*(1-ux)*(1-uy) + n10*ux*(1-uy) + n01*(1-ux)*uy + n11*ux*uy;
  }

  function turbulence(x, y, initialSize) {
    let val = 0, sz = initialSize;
    while (sz >= 1) { val += smoothNoise(x / sz, y / sz) * sz; sz /= 2; }
    return val / initialSize;
  }

  const palette = [
    [247, 244, 239],
    [230, 225, 215],
    [215, 208, 196],
    [200, 192, 180],
    [235, 230, 222],
  ];

  const xPeriod = 4.0, yPeriod = 8.0, turbPow = 4.5, turbSz = size / 4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const turb    = turbulence(x, y, turbSz);
      const xyVal   = (x * xPeriod / size) + (y * yPeriod / size) + turbPow * turb;
      const sineVal = Math.abs(Math.sin(xyVal * Math.PI));
      const t   = sineVal;
      const idx = Math.floor(t * (palette.length - 1));
      const f   = t * (palette.length - 1) - idx;
      const c0  = palette[Math.min(idx,     palette.length-1)];
      const c1  = palette[Math.min(idx + 1, palette.length-1)];
      const r = Math.round(c0[0] * (1-f) + c1[0] * f);
      const g = Math.round(c0[1] * (1-f) + c1[1] * f);
      const b = Math.round(c0[2] * (1-f) + c1[2] * f);
      const i = (y * size + x) * 4;
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Nero Marquina dark marble — always 512px (hero element), sharp thin veins
function makeDarkMarbleTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d   = img.data;

  // Higher-res noise grid for sharper detail
  const NW = 128;
  const noise = new Float32Array(NW * NW);
  for (let i = 0; i < noise.length; i++) noise[i] = Math.random();

  function smoothNoise(x, y) {
    const ix = Math.floor(x) & (NW - 1);
    const iy = Math.floor(y) & (NW - 1);
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const n00 = noise[iy       * NW + ix];
    const n10 = noise[iy       * NW + ((ix+1) & (NW-1))];
    const n01 = noise[((iy+1) & (NW-1)) * NW + ix];
    const n11 = noise[((iy+1) & (NW-1)) * NW + ((ix+1) & (NW-1))];
    return n00*(1-ux)*(1-uy) + n10*ux*(1-uy) + n01*(1-ux)*uy + n11*ux*uy;
  }

  // Fractional Brownian Motion — multi-octave noise for natural turbulence
  function fbm(x, y, oct) {
    let v = 0, a = 0.5, f = 1, mx = 0;
    for (let i = 0; i < oct; i++) {
      v += smoothNoise(x * f, y * f) * a;
      mx += a; a *= 0.5; f *= 2.1;
    }
    return v / mx;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      // Multi-scale turbulence distortion
      const turb = fbm(nx * 3.2, ny * 3.2, 7);

      // Primary veins — diagonal, thin white
      const v1 = Math.abs(Math.sin((nx * 5.5 + ny * 9.0 + turb * 7.0) * Math.PI));
      // Secondary veins — cross-diagonal, gold tint
      const v2 = Math.abs(Math.sin((nx * 2.8 - ny * 4.5 + turb * 4.5) * Math.PI));
      // Tertiary — micro cracks, very faint
      const v3 = Math.abs(Math.sin((nx * 11  + ny * 6.0 + turb * 3.0) * Math.PI));

      // Math.pow with high exponent = very narrow sharp veins
      const vein1 = Math.pow(1.0 - v1, 22); // sharp white veins
      const vein2 = Math.pow(1.0 - v2, 32); // sharper gold veins
      const vein3 = Math.pow(1.0 - v3, 40); // micro cracks, faint

      // Subtle base variation — not pure black, slight depth
      const baseMicro = fbm(nx * 6, ny * 6, 4) * 0.06;

      // Base: near-black, very slight warm undertone
      let r = 7  + baseMicro * 14;
      let g = 5  + baseMicro * 9;
      let b = 4  + baseMicro * 7;

      // White/cream veins (primary)
      r += vein1 * 235;
      g += vein1 * 228;
      b += vein1 * 218;

      // Warm gold veins (secondary)
      r += vein2 * 200;
      g += vein2 * 152;
      b += vein2 * 40;

      // Hairline micro cracks (tertiary) — cool white
      r += vein3 * 140;
      g += vein3 * 138;
      b += vein3 * 135;

      const i = (y * size + x) * 4;
      d[i]   = Math.min(255, Math.round(r));
      d[i+1] = Math.min(255, Math.round(g));
      d[i+2] = Math.min(255, Math.round(b));
      d[i+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Pure white wall — no warmth, minimal grain
function makeWallTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 256);
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 2;
    img.data[i]   = Math.min(255, Math.max(253, img.data[i]   + n));
    img.data[i+1] = Math.min(255, Math.max(253, img.data[i+1] + n));
    img.data[i+2] = Math.min(255, Math.max(254, img.data[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeDadoTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e2ddd6';
  ctx.fillRect(0, 0, 256, 256);
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 7;
    img.data[i]   = Math.min(255, Math.max(200, img.data[i]   + n));
    img.data[i+1] = Math.min(255, Math.max(196, img.data[i+1] + n));
    img.data[i+2] = Math.min(255, Math.max(188, img.data[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Near-white ceiling — very faint coffer lines, light base
function makeCofferTexture(size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f9f8f6';
  ctx.fillRect(0, 0, size, size);

  const cell   = size / 4;
  const border = size / 32;

  for (let r = 0; r < 4; r++) {
    for (let col = 0; col < 4; col++) {
      const x = col * cell + border * 1.5;
      const y = r   * cell + border * 1.5;
      const w = cell - border * 3;
      const h = cell - border * 3;
      ctx.strokeStyle = 'rgba(185,180,172,0.18)';
      ctx.lineWidth   = border;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(165,160,152,0.08)';
      ctx.lineWidth   = border * 0.5;
      ctx.strokeRect(x + border, y + border, w - border * 2, h - border * 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ── Material library ──────────────────────────────────────────────────────────

let matLib = null;
function getMaterials() {
  if (matLib) return matLib;

  const marbleTex = makeMarbleTexture();
  marbleTex.repeat.set(3, 3);

  const darkMarbleTex = makeDarkMarbleTexture();
  darkMarbleTex.repeat.set(2, 1);

  const wallTex = makeWallTexture();
  wallTex.repeat.set(3, 1.5);

  const dadoTex = makeDadoTexture();
  dadoTex.repeat.set(4, 1);

  const cofferTex = makeCofferTexture(512);
  cofferTex.repeat.set(3, 3);

  matLib = {
    floor  : new THREE.MeshStandardMaterial({ map: marbleTex,     roughness: 0.04, metalness: 0.12, envMapIntensity: 2.0 }),
    // Ceiling: near-white base, very subtle coffer pattern, soft emissive glow
    ceiling: new THREE.MeshStandardMaterial({
      map: cofferTex,
      roughness: 0.98,
      metalness: 0.0,
      emissive: new THREE.Color(0xeeeae4),
      emissiveIntensity: 0.14,
    }),
    // Walls: pure white with subtle emissive so warm lights don't yellow them
    wall   : new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.90,
      metalness: 0.0,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0xf8f9fc),
      emissiveIntensity: 0.10,
    }),
    dado      : new THREE.MeshStandardMaterial({ map: dadoTex,       roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide }),
    darkMarble: new THREE.MeshStandardMaterial({ map: darkMarbleTex, roughness: 0.06, metalness: 0.35, envMapIntensity: 3.0 }),
    frame     : new THREE.MeshStandardMaterial({ color: 0x0d0d0d,    roughness: 0.35, metalness: 0.45 }),
    molding   : new THREE.MeshStandardMaterial({ color: 0xeef0f4,    roughness: 0.7  }),
    dado_rail : new THREE.MeshStandardMaterial({ color: 0xddd8cf,    roughness: 0.5,  metalness: 0.05 }),
    skirting  : new THREE.MeshStandardMaterial({ color: 0xf0ece4,    roughness: 0.6 }),
    rail      : new THREE.MeshStandardMaterial({ color: 0x888888,    roughness: 0.2,  metalness: 0.85 }),
    light     : new THREE.MeshStandardMaterial({ color: 0xfff8e8, emissive: new THREE.Color(0xfff8e8), emissiveIntensity: 0.9 }),
  };
  return matLib;
}

// ── Wall section builder ──────────────────────────────────────────────────────

const CROWN_H = 0.14;

function buildWallSection(length, mat, withDoor = false) {
  const g = new THREE.Group();

  if (!withDoor) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(length, WALL_H), mat.wall);
    wall.position.set(0, WALL_H / 2, 0);
    wall.receiveShadow = true;
    g.add(wall);
  } else {
    const lW   = (length - DOOR_W) / 2;
    const topH = WALL_H - DOOR_H;

    if (lW > 0.01) {
      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(lW, WALL_H), mat.wall);
      leftWall.position.set(-(DOOR_W / 2 + lW / 2), WALL_H / 2, 0);
      g.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(lW, WALL_H), mat.wall);
      rightWall.position.set(DOOR_W / 2 + lW / 2, WALL_H / 2, 0);
      g.add(rightWall);
    }

    if (topH > 0.01) {
      const top = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, topH), mat.wall);
      top.position.set(0, DOOR_H + topH / 2, 0);
      g.add(top);
    }

    const DEPTH = 0.32;
    const leftT = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, DOOR_H), mat.wall);
    leftT.rotation.y = Math.PI / 2;
    leftT.position.set(-DOOR_W / 2, DOOR_H / 2, -DEPTH / 2);
    g.add(leftT);

    const rightT = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, DOOR_H), mat.wall);
    rightT.rotation.y = -Math.PI / 2;
    rightT.position.set(DOOR_W / 2, DOOR_H / 2, -DEPTH / 2);
    g.add(rightT);

    const topT = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DEPTH), mat.wall);
    topT.rotation.x = Math.PI / 2;
    topT.position.set(0, DOOR_H, -DEPTH / 2);
    g.add(topT);

    const archDefs = [
      { w: 0.055, h: DOOR_H,        x: -(DOOR_W / 2 + 0.028), y: DOOR_H / 2 },
      { w: 0.055, h: DOOR_H,        x:  (DOOR_W / 2 + 0.028), y: DOOR_H / 2 },
      { w: DOOR_W + 0.11, h: 0.055, x: 0,                     y: DOOR_H + 0.028 },
    ];
    for (const s of archDefs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 0.04), mat.molding);
      m.position.set(s.x, s.y, 0.02);
      g.add(m);
    }
  }

  if (!withDoor) {
    const crown = new THREE.Mesh(new THREE.BoxGeometry(length, CROWN_H, 0.07), mat.molding);
    crown.position.set(0, WALL_H - CROWN_H / 2, 0.035);
    g.add(crown);
  } else {
    const lW = (length - DOOR_W) / 2;
    if (lW > 0.01) {
      for (const side of [-1, 1]) {
        const sx = side * (DOOR_W / 2 + lW / 2);
        const crown = new THREE.Mesh(new THREE.BoxGeometry(lW, CROWN_H, 0.07), mat.molding);
        crown.position.set(sx, WALL_H - CROWN_H / 2, 0.035);
        g.add(crown);
      }
    }
  }

  return g;
}

function placeWall(scene, group, px, pz, rotY) {
  group.position.set(px, 0, pz);
  group.rotation.y = rotY;
  scene.add(group);
}

// ── Museum bench ─────────────────────────────────────────────────────────────

function buildBench(scene, x, z, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const seatMat = new THREE.MeshStandardMaterial({ color: 0x8b6340, roughness: 0.55, metalness: 0.0 });
  const legMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3,  metalness: 0.7 });
  const BL = 1.6, BW = 0.38, SH = 0.44, ST = 0.06;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(BL, ST, BW), seatMat);
  seat.position.set(0, SH, 0);
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x7a5530, roughness: 0.45 });
  for (const tx of [-BL/2 + 0.015, BL/2 - 0.015]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, ST + 0.004, BW), trimMat);
    trim.position.set(tx, SH, 0);
    group.add(trim);
  }

  const LW = 0.04, LH = SH - ST / 2, LD = 0.04;
  for (const [lx, lz] of [
    [ BL/2 - 0.12,  BW/2 - 0.06],
    [ BL/2 - 0.12, -BW/2 + 0.06],
    [-BL/2 + 0.12,  BW/2 - 0.06],
    [-BL/2 + 0.12, -BW/2 + 0.06],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(LW, LH, LD), legMat);
    leg.position.set(lx, LH / 2, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  const stretcherL = BL - 0.24;
  for (const sz of [BW/2 - 0.06, -BW/2 + 0.06]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(stretcherL, 0.025, 0.025), legMat);
    s.position.set(0, 0.1, sz);
    group.add(s);
  }

  scene.add(group);
}

// ── Room builder ──────────────────────────────────────────────────────────────

const ROOM_TONES = [
  { ambient: 0xfff8f0, fill: 0xfff6e8 },
  { ambient: 0xfff2e8, fill: 0xffe8d0 },
  { ambient: 0xf8f8ff, fill: 0xf0f4ff },
  { ambient: 0xfff0e0, fill: 0xffe4c0 },
];

function buildRoom(scene, room, mat) {
  const { cx, cz, w, d, solidWalls, doorWalls } = room;
  const tone = ROOM_TONES[room.id] || ROOM_TONES[0];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.001, cz);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, WALL_H, cz);
  scene.add(ceil);

  const trimMat = mat.molding;
  const trimH   = 0.06;
  const trims = [
    { w: w,     d: trimH, x: cx,                 z: cz - d/2 + trimH/2 },
    { w: w,     d: trimH, x: cx,                 z: cz + d/2 - trimH/2 },
    { w: trimH, d: d,     x: cx - w/2 + trimH/2, z: cz                 },
    { w: trimH, d: d,     x: cx + w/2 - trimH/2, z: cz                 },
  ];
  for (const t of trims) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, 0.04, t.d), trimMat);
    mesh.position.set(t.x, WALL_H - 0.02, t.z);
    scene.add(mesh);
  }

  if (room.id === 0) {
    buildBench(scene, cx, cz, 0);
    buildBench(scene, cx, cz, Math.PI);
  } else if (room.id === 1) {
    buildBench(scene, cx, cz + 3, 0);
  } else if (room.id === 2) {
    buildBench(scene, cx - 3, cz, Math.PI / 2);
  } else if (room.id === 3) {
    buildBench(scene, cx + 3, cz, -Math.PI / 2);
  }

  const wallDefs = {
    north: [cx,       cz - d/2, 0,          w],
    south: [cx,       cz + d/2, Math.PI,    w],
    east:  [cx + w/2, cz,      -Math.PI/2,  d],
    west:  [cx - w/2, cz,       Math.PI/2,  d],
  };

  for (const side of solidWalls) {
    const [px, pz2, rotY, len] = wallDefs[side];
    placeWall(scene, buildWallSection(len, mat, false), px, pz2, rotY);
  }
  for (const side of doorWalls) {
    const [px, pz2, rotY, len] = wallDefs[side];
    placeWall(scene, buildWallSection(len, mat, true), px, pz2, rotY);
  }

  const railMesh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 0.035, 0.035), mat.rail);
  railMesh.position.set(cx, WALL_H - 0.018, cz);
  scene.add(railMesh);

  const fill = new THREE.PointLight(tone.fill, 0.7, w * 1.4, 1.6);
  fill.position.set(cx, WALL_H - 0.5, cz);
  scene.add(fill);

  addCeilingSpots(scene, cx, cz, w, d, mat);
}

// ── Ceiling spotlights ────────────────────────────────────────────────────────

function addCeilingSpots(scene, cx, cz, w, d, mat) {
  const spacingX = 4, spacingZ = 4;
  const countX   = Math.max(1, Math.floor((w - 2) / spacingX));
  const countZ   = Math.max(1, Math.floor((d - 2) / spacingZ));

  for (let xi = 0; xi < countX; xi++) {
    for (let zi = 0; zi < countZ; zi++) {
      const lx = cx - (countX - 1) * spacingX / 2 + xi * spacingX;
      const lz = cz - (countZ - 1) * spacingZ / 2 + zi * spacingZ;

      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.065, 0.09, 10),
        mat.rail
      );
      housing.position.set(lx, WALL_H - 0.045, lz);
      scene.add(housing);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xfff8e8,
          emissive: new THREE.Color(0xfff8e8),
          emissiveIntensity: 1.0,
        })
      );
      bulb.position.set(lx, WALL_H - 0.11, lz);
      scene.add(bulb);

      const spot = new THREE.SpotLight(0xfff5e0, isMobile ? 1.8 : 2.2, 8, Math.PI / 7, 0.45, 1.5);
      spot.position.set(lx, WALL_H - 0.11, lz);
      const t = new THREE.Object3D();
      t.position.set(lx, 0, lz);
      scene.add(t);
      spot.target = t;
      spot.castShadow = false;
      scene.add(spot);
    }
  }
}

// ── Info plaque ───────────────────────────────────────────────────────────────

function makeInfoPlaqueTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 52;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0e0d0b';
  ctx.fillRect(0, 0, 256, 52);

  ctx.fillStyle = 'rgba(251,208,14,0.4)';
  ctx.fillRect(0, 0, 256, 1);

  ctx.beginPath();
  ctx.arc(26, 26, 13, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(251,208,14,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(251,208,14,0.65)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillStyle = '#FBD00E';
  ctx.textAlign = 'center';
  ctx.fillText('i', 26, 32);

  ctx.font = '13px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'left';
  ctx.fillText('View info', 48, 31);

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

let _plaqueTex = null;
function getPlaqueTex() {
  if (!_plaqueTex) _plaqueTex = makeInfoPlaqueTexture();
  return _plaqueTex;
}

// ── Painting builder ──────────────────────────────────────────────────────────

function getPaintingTransform(room, wall, offset) {
  const { cx, cz, w, d } = room;
  const GAP = 0.12;
  switch (wall) {
    case 'south': return { pos: [cx + offset, HANG_H, cz + d/2 - GAP], rotY: Math.PI };
    case 'north': return { pos: [cx + offset, HANG_H, cz - d/2 + GAP], rotY: 0 };
    case 'east':  return { pos: [cx + w/2 - GAP, HANG_H, cz + offset], rotY: -Math.PI/2 };
    case 'west':  return { pos: [cx - w/2 + GAP, HANG_H, cz + offset], rotY:  Math.PI/2 };
  }
}

function buildPainting(scene, painting, mat) {
  const room = ROOMS[painting.room];
  const { pos, rotY } = getPaintingTransform(room, painting.wall, painting.offset);
  const { w, h } = painting.size;

  const group = new THREE.Group();
  group.position.set(...pos);
  group.rotation.y = rotY;

  const frameOuter = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.07), mat.frame
  );
  frameOuter.castShadow = true;
  frameOuter.receiveShadow = true;
  group.add(frameOuter);

  const frameInner = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
  );
  frameInner.position.z = -0.01;
  group.add(frameInner);

  const canvas = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: painting.color, roughness: 0.85 })
  );
  canvas.position.z = 0.05;
  canvas.receiveShadow = false;
  group.add(canvas);

  new THREE.TextureLoader().load(painting.image, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = window._maxAnisotropy || 4;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    canvas.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });

    const iw = tex.image.naturalWidth  || tex.image.width  || 0;
    const ih = tex.image.naturalHeight || tex.image.height || 0;
    if (iw > 0 && ih > 0) {
      const targetH = painting.size.h;
      const autoW   = targetH * (iw / ih);

      canvas.geometry.dispose();
      canvas.geometry = new THREE.PlaneGeometry(autoW, targetH);

      frameOuter.geometry.dispose();
      frameOuter.geometry = new THREE.BoxGeometry(autoW + 0.16, targetH + 0.16, 0.07);

      frameInner.geometry.dispose();
      frameInner.geometry = new THREE.BoxGeometry(autoW + 0.04, targetH + 0.04, 0.09);
    }
  }, undefined, () => {});

  // Info plaque — clickable sign below each painting
  const plaqueMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.50, 0.09),
    new THREE.MeshBasicMaterial({ map: getPlaqueTex(), transparent: true })
  );
  plaqueMesh.position.set(0, -(h / 2 + 0.22), 0.06);
  plaqueMesh.userData.isInfoPlaque = true;
  plaqueMesh.userData.paintingId   = painting.id;
  group.add(plaqueMesh);

  // Painting spotlight — wider wash
  const fwd  = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, rotY, 0));
  const lPos = new THREE.Vector3(...pos)
    .add(fwd.clone().multiplyScalar(0.8))
    .add(new THREE.Vector3(0, 1.6, 0));

  const spot = new THREE.SpotLight(0xfff8f0, isMobile ? 3.0 : 4.5, 6, Math.PI / 2.2, 1.0, 1.5);
  spot.position.copy(lPos);
  const target = new THREE.Object3D();
  target.position.set(...pos);
  scene.add(target);
  spot.target = target;
  spot.castShadow = !isMobile;
  if (!isMobile) {
    spot.shadow.mapSize.set(512, 512);
    spot.shadow.bias = -0.001;
  }
  scene.add(spot);
  scene.add(group);

  const viewDir = fwd.clone();
  const viewPos = new THREE.Vector3(...pos).add(viewDir.clone().multiplyScalar(1.6));
  viewPos.y = 1.7;
  paintingObjects.push({ mesh: group, painting, viewPos, viewTarget: new THREE.Vector3(...pos) });
}

// ── Global lighting ───────────────────────────────────────────────────────────

function addLighting(scene) {
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.28));
  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x3a2810, 0.22));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildMuseum(scene, renderer) {
  window._maxAnisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  const mat = getMaterials();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.FogExp2(0x0d0b08, 0.02);

  addLighting(scene);
  for (const room of ROOMS) buildRoom(scene, room, mat);
  for (const p of PAINTINGS) buildPainting(scene, p, mat);
  buildCuratorialStatement(scene, mat);

  return paintingObjects;
}

function buildCuratorialStatement(scene, mat) {
  // ── Plate geometry ───────────────────────────────────────────────────────
  // Larger, thicker box — reads as a real mounted gallery plaque
  const PW = 2.2, PH = 0.68, PD = 0.055;
  const px = -5.5, py = 2.1, pz = 9.86;

  // Marble plate — Nero Marquina material, near-mirror polish
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(PW, PH, PD),
    mat.darkMarble
  );
  plate.position.set(px, py, pz);
  plate.rotation.y = Math.PI;
  plate.userData.isCuratorialPlate = true; // click target
  scene.add(plate);

  // ── Gold border — 4 separate thin strips, like a real frame ──────────────
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0xD4A843, roughness: 0.12, metalness: 0.92,
  });
  const bT = 0.018; // border thickness
  const bD = PD + 0.004; // slightly proud of plate face
  const borders = [
    // top
    { w: PW + bT * 2, h: bT, x: px, y: py + PH / 2 + bT / 2 },
    // bottom
    { w: PW + bT * 2, h: bT, x: px, y: py - PH / 2 - bT / 2 },
    // left
    { w: bT, h: PH, x: px - PW / 2 - bT / 2, y: py },
    // right
    { w: bT, h: PH, x: px + PW / 2 + bT / 2, y: py },
  ];
  for (const b of borders) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, bD), borderMat);
    m.position.set(b.x, b.y, pz - 0.002);
    m.rotation.y = Math.PI;
    scene.add(m);
  }

  // ── Inner inset — slight recess shadow effect ─────────────────────────────
  const insetMat = new THREE.MeshStandardMaterial({
    color: 0x020100, roughness: 0.8, metalness: 0.0,
  });
  const inset = new THREE.Mesh(
    new THREE.BoxGeometry(PW - 0.06, PH - 0.06, 0.003),
    insetMat
  );
  inset.position.set(px, py, pz - PD / 2 - 0.001);
  inset.rotation.y = Math.PI;
  scene.add(inset);

  // ── Text canvas — 1024×256 for crisp rendering ────────────────────────────
  const TW = 1024, TH = 256;
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, TW, TH);

  // Decorative top rule line
  const lineY = 52;
  ctx.strokeStyle = 'rgba(212,168,67,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, lineY); ctx.lineTo(TW - 80, lineY); ctx.stroke();

  // Main title — letter-spaced caps, gold
  ctx.font = '500 38px Questrial, Georgia, serif';
  ctx.fillStyle = '#D4A843';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '0.18em';
  ctx.fillText('CURATORIAL STATEMENT', TW / 2, 106);

  // Thin divider below title
  ctx.strokeStyle = 'rgba(212,168,67,0.3)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(220, 124); ctx.lineTo(TW - 220, 124); ctx.stroke();

  // Subtitle — italic, lower opacity
  ctx.font = 'italic 300 22px Georgia, serif';
  ctx.fillStyle = 'rgba(212,168,67,0.52)';
  ctx.letterSpacing = '0.08em';
  ctx.fillText('Touch to read', TW / 2, 162);

  // Decorative bottom rule
  ctx.strokeStyle = 'rgba(212,168,67,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, TH - 52); ctx.lineTo(TW - 80, TH - 52); ctx.stroke();

  const tex     = new THREE.CanvasTexture(c);
  const textMat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, side: THREE.FrontSide,
  });
  const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.08, PH - 0.06), textMat);
  textMesh.position.set(px, py, pz - PD / 2 - 0.002);
  textMesh.rotation.y = Math.PI;
  textMesh.userData.isCuratorialPlate = true; // click target
  scene.add(textMesh);

  // ── Dedicated spot light — creates the characteristic shiny highlight ─────
  // Positioned above and slightly in front, angled down to catch the specular
  const plateSpot = new THREE.SpotLight(0xfff5e0, isMobile ? 3.5 : 5.0, 4.5, Math.PI / 10, 0.3, 1.4);
  plateSpot.position.set(px, py + 1.8, pz - 1.0);
  const plateTarget = new THREE.Object3D();
  plateTarget.position.set(px, py, pz);
  scene.add(plateTarget);
  plateSpot.target = plateTarget;
  scene.add(plateSpot);

  // ── Curatorial content ────────────────────────────────────────────────────
  const desc = `This body of work unfolds as a vivid exploration of inner landscapes, where identity, emotion, and perception take on organic and symbolic form. Moving fluidly across mixed media, collage, printmaking, and drawing, the artist constructs a visual language rooted in layering, intuition, and play.

Recurring motifs: eyes, botanical forms, fragmented bodies, and hybrid figures, act as anchors within a shifting terrain. They suggest awareness, growth, and transformation, while also questioning how identity is formed, observed, and expressed. Figures appear both grounded and dissolving, caught between visibility and introspection, control and spontaneity.

The works resist fixed narratives. Instead, they invite a slower engagement, where meaning emerges through texture, color, and association. Bright, almost electric palettes contrast with moments of quiet tension, creating a dynamic balance between the playful and the reflective.`;

  paintingObjects.push({
    mesh: { position: new THREE.Vector3(px, py, pz) },
    isCuratorial: true,
    painting: {
      id: 999,
      title: 'Curatorial Statement',
      year: '', medium: '', dimensions: '',
      description: desc,
      image: '', enquire: '',
    },
    viewPos:    new THREE.Vector3(px, 1.7, 7.5),
    viewTarget: new THREE.Vector3(px, py, pz),
  });
}