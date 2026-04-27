import * as THREE from 'three';
import { ROOMS, PAINTINGS, WALL_H, DOOR_W, DOOR_H, HANG_H } from './config.js';

export const paintingObjects = [];
const isMobile = window.matchMedia('(pointer: coarse)').matches;

// ── Texture generators ────────────────────────────────────────────────────────

function makeMarbleTexture() {
  // Sine + turbulence marble — based on classic procedural technique
  // Produces realistic flowing veins with natural turbulence
  const size = isMobile ? 256 : 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d   = img.data;

  // Smooth noise via value noise with bilinear interpolation
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

  // Turbulence = sum of noise at multiple frequencies
  function turbulence(x, y, initialSize) {
    let val  = 0;
    let sz   = initialSize;
    while (sz >= 1) {
      val += smoothNoise(x / sz, y / sz) * sz;
      sz  /= 2;
    }
    return val / initialSize;
  }

  // Marble colour palette — warm Carrara white/grey
  const palette = [
    [247, 244, 239], // near white
    [230, 225, 215], // warm grey
    [215, 208, 196], // mid grey
    [200, 192, 180], // darker vein
    [235, 230, 222], // light transition
  ];

  const xPeriod = 4.0;   // vein frequency X
  const yPeriod = 8.0;   // vein frequency Y
  const turbPow = 4.5;   // turbulence strength
  const turbSz  = size / 4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const turb = turbulence(x, y, turbSz);
      const xyVal = (x * xPeriod / size) + (y * yPeriod / size) + turbPow * turb;
      // abs(sin) creates sharp veins, smoothed with cos blend
      const sineVal = Math.abs(Math.sin(xyVal * Math.PI));

      // Map sine to palette
      const t   = sineVal;
      const idx = Math.floor(t * (palette.length - 1));
      const f   = t * (palette.length - 1) - idx;
      const c0  = palette[Math.min(idx,     palette.length-1)];
      const c1  = palette[Math.min(idx + 1, palette.length-1)];

      const r = Math.round(c0[0] * (1-f) + c1[0] * f);
      const g = Math.round(c0[1] * (1-f) + c1[1] * f);
      const b = Math.round(c0[2] * (1-f) + c1[2] * f);

      const i = (y * size + x) * 4;
      d[i]   = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeWallTexture() {
  // Solid #F7F9FC — clean gallery white, very subtle grain only
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#F7F9FC';
  ctx.fillRect(0, 0, 256, 256);
  // Barely-there grain so it doesn't look like flat CSS
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 3;
    img.data[i]   = Math.min(255, Math.max(240, img.data[i]   + n));
    img.data[i+1] = Math.min(255, Math.max(243, img.data[i+1] + n));
    img.data[i+2] = Math.min(255, Math.max(248, img.data[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeDadoTexture() {
  // Slightly darker / more matte for the lower wall panel
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

function makeCofferTexture(size) {
  // Coffered ceiling — recessed grid
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f4ef';
  ctx.fillRect(0, 0, size, size);

  const cell = size / 4;
  const border = size / 32;
  ctx.strokeStyle = 'rgba(180,175,165,0.5)';
  ctx.lineWidth   = border;

  for (let r = 0; r < 4; r++) {
    for (let col = 0; col < 4; col++) {
      const x = col * cell + border * 1.5;
      const y = r   * cell + border * 1.5;
      const w = cell - border * 3;
      const h = cell - border * 3;
      ctx.strokeRect(x, y, w, h);
      // Inner recess shadow
      ctx.strokeStyle = 'rgba(140,135,128,0.2)';
      ctx.lineWidth = border * 0.5;
      ctx.strokeRect(x + border, y + border, w - border * 2, h - border * 2);
      ctx.strokeStyle = 'rgba(180,175,165,0.5)';
      ctx.lineWidth = border;
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

  const wallTex = makeWallTexture();
  wallTex.repeat.set(3, 1.5);

  const dadoTex = makeDadoTexture();
  dadoTex.repeat.set(4, 1);

  const cofferTex = makeCofferTexture(512);
  cofferTex.repeat.set(3, 3);

  matLib = {
    floor  : new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.04, metalness: 0.12, envMapIntensity: 2.0 }),
    ceiling: new THREE.MeshStandardMaterial({ map: cofferTex, roughness: 0.98, metalness: 0.0  }),
    wall   : new THREE.MeshStandardMaterial({ map: wallTex,   roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide }),
    dado   : new THREE.MeshStandardMaterial({ map: dadoTex,   roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide }),
    frame  : new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.35, metalness: 0.45 }),
    molding: new THREE.MeshStandardMaterial({ color: 0xeef0f4, roughness: 0.7  }),
    dado_rail: new THREE.MeshStandardMaterial({ color: 0xddd8cf, roughness: 0.5, metalness: 0.05 }),
    skirting: new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.6 }),
    rail   : new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.85 }),
    light  : new THREE.MeshStandardMaterial({ color: 0xfff8e8, emissive: new THREE.Color(0xfff8e8), emissiveIntensity: 0.9 }),
  };
  return matLib;
}

// ── Wall section builder ──────────────────────────────────────────────────────

const DADO_H    = 1.1;   // dado panel height from floor
const DADO_RAIL = 0.08;  // rail thickness
const CROWN_H   = 0.14;  // crown molding height

function buildWallSection(length, mat, withDoor = false) {
  const g = new THREE.Group();

  if (!withDoor) {
    // Upper wall (above dado rail)
    const upperH = WALL_H - DADO_H - DADO_RAIL - CROWN_H;
    const upper  = new THREE.Mesh(new THREE.PlaneGeometry(length, upperH), mat.wall);
    upper.position.set(0, DADO_H + DADO_RAIL + upperH / 2, 0);
    upper.receiveShadow = true;
    g.add(upper);

    // Lower dado panel
    const dado = new THREE.Mesh(new THREE.PlaneGeometry(length, DADO_H), mat.dado);
    dado.position.set(0, DADO_H / 2, 0);
    dado.receiveShadow = true;
    g.add(dado);
  } else {
    // Door wall — panels on sides, top panel above door
    const lW   = (length - DOOR_W) / 2;
    const topH = WALL_H - DOOR_H;

    if (lW > 0.01) {
      // Left panels
      const leftUpper = new THREE.Mesh(
        new THREE.PlaneGeometry(lW, WALL_H - DADO_H - DADO_RAIL - CROWN_H), mat.wall
      );
      leftUpper.position.set(-(DOOR_W / 2 + lW / 2), DADO_H + DADO_RAIL + (WALL_H - DADO_H - DADO_RAIL - CROWN_H) / 2, 0);
      g.add(leftUpper);

      const leftDado = new THREE.Mesh(new THREE.PlaneGeometry(lW, DADO_H), mat.dado);
      leftDado.position.set(-(DOOR_W / 2 + lW / 2), DADO_H / 2, 0);
      g.add(leftDado);

      // Right panels
      const rightUpper = new THREE.Mesh(
        new THREE.PlaneGeometry(lW, WALL_H - DADO_H - DADO_RAIL - CROWN_H), mat.wall
      );
      rightUpper.position.set(DOOR_W / 2 + lW / 2, DADO_H + DADO_RAIL + (WALL_H - DADO_H - DADO_RAIL - CROWN_H) / 2, 0);
      g.add(rightUpper);

      const rightDado = new THREE.Mesh(new THREE.PlaneGeometry(lW, DADO_H), mat.dado);
      rightDado.position.set(DOOR_W / 2 + lW / 2, DADO_H / 2, 0);
      g.add(rightDado);
    }

    // Top panel above door
    if (topH > 0.01) {
      const top = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, topH), mat.wall);
      top.position.set(0, DOOR_H + topH / 2, 0);
      g.add(top);
    }

    // Door tunnel depth
    const DEPTH = 0.32;
    const leftT = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, DOOR_H), mat.dado);
    leftT.rotation.y = Math.PI / 2;
    leftT.position.set(-DOOR_W / 2, DOOR_H / 2, -DEPTH / 2);
    g.add(leftT);

    const rightT = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, DOOR_H), mat.dado);
    rightT.rotation.y = -Math.PI / 2;
    rightT.position.set(DOOR_W / 2, DOOR_H / 2, -DEPTH / 2);
    g.add(rightT);

    const topT = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DEPTH), mat.dado);
    topT.rotation.x = Math.PI / 2;
    topT.position.set(0, DOOR_H, -DEPTH / 2);
    g.add(topT);

    // Door architrave
    const archDefs = [
      { w: 0.055, h: DOOR_H,                x: -(DOOR_W / 2 + 0.028), y: DOOR_H / 2 },
      { w: 0.055, h: DOOR_H,                x:  (DOOR_W / 2 + 0.028), y: DOOR_H / 2 },
      { w: DOOR_W + 0.11, h: 0.055,         x: 0,                     y: DOOR_H + 0.028 },
    ];
    for (const s of archDefs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 0.04), mat.molding);
      m.position.set(s.x, s.y, 0.02);
      g.add(m);
    }
  }

  if (!withDoor) {
    // Full-length dado rail, skirting, crown on solid walls
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, DADO_RAIL, 0.06), mat.dado_rail);
    rail.position.set(0, DADO_H + DADO_RAIL / 2, 0.03);
    g.add(rail);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.05), mat.skirting);
    skirt.position.set(0, 0.06, 0.025);
    g.add(skirt);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(length, CROWN_H, 0.07), mat.molding);
    crown.position.set(0, WALL_H - CROWN_H / 2, 0.035);
    g.add(crown);
  } else {
    // Door walls — rails and moldings only on side panels, not across door opening
    const lW = (length - DOOR_W) / 2;
    if (lW > 0.01) {
      for (const side of [-1, 1]) {
        const sx = side * (DOOR_W / 2 + lW / 2);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(lW, DADO_RAIL, 0.06), mat.dado_rail);
        rail.position.set(sx, DADO_H + DADO_RAIL / 2, 0.03);
        g.add(rail);

        const skirt = new THREE.Mesh(new THREE.BoxGeometry(lW, 0.12, 0.05), mat.skirting);
        skirt.position.set(sx, 0.06, 0.025);
        g.add(skirt);

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
// Realistic low bench: dark steel legs, warm oak seat, no backrest (museum style)

function buildBench(scene, x, z, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const seatMat = new THREE.MeshStandardMaterial({ color: 0x8b6340, roughness: 0.55, metalness: 0.0  });
  const legMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3,  metalness: 0.7  });

  const BL = 1.6;  // bench length
  const BW = 0.38; // bench width
  const SH = 0.44; // seat height
  const ST = 0.06; // seat thickness

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(BL, ST, BW), seatMat);
  seat.position.set(0, SH, 0);
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);

  // Seat edge bevel strips (top face trim)
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x7a5530, roughness: 0.45 });
  for (const [tx, tw] of [[-BL/2 + 0.015, 0.03], [BL/2 - 0.015, 0.03]]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, ST + 0.004, BW), trimMat);
    trim.position.set(tx, SH, 0);
    group.add(trim);
  }

  // Four legs — rectangular steel profile
  const LW = 0.04, LH = SH - ST / 2, LD = 0.04;
  const legPositions = [
    [ BL/2 - 0.12,  BW/2 - 0.06],
    [ BL/2 - 0.12, -BW/2 + 0.06],
    [-BL/2 + 0.12,  BW/2 - 0.06],
    [-BL/2 + 0.12, -BW/2 + 0.06],
  ];
  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(LW, LH, LD), legMat);
    leg.position.set(lx, LH / 2, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Cross stretcher — connects legs for rigidity, looks realistic
  const stretcherH = 0.1;
  const stretcherL = BL - 0.24;
  for (const sz of [BW/2 - 0.06, -BW/2 + 0.06]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(stretcherL, 0.025, 0.025), legMat);
    s.position.set(0, stretcherH, sz);
    group.add(s);
  }

  scene.add(group);
}

// ── Room builder ──────────────────────────────────────────────────────────────

// Each room has a slightly different light warmth for depth
const ROOM_TONES = [
  { ambient: 0xfff8f0, fill: 0xfff6e8 }, // Central Hall — warm neutral
  { ambient: 0xfff2e8, fill: 0xffe8d0 }, // North — slightly warmer
  { ambient: 0xf8f8ff, fill: 0xf0f4ff }, // East — cooler, bluer
  { ambient: 0xfff0e0, fill: 0xffe4c0 }, // West — warmest, golden
];

function buildRoom(scene, room, mat) {
  const { cx, cz, w, d, solidWalls, doorWalls } = room;
  const tone = ROOM_TONES[room.id] || ROOM_TONES[0];

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.001, cz);
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling — coffered
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, WALL_H, cz);
  scene.add(ceil);

  // Ceiling border trim
  const trimMat = mat.molding;
  const trimH   = 0.06;
  const trims = [
    { w: w,   d: trimH, x: cx,       z: cz - d/2 + trimH/2 },
    { w: w,   d: trimH, x: cx,       z: cz + d/2 - trimH/2 },
    { w: trimH, d: d,   x: cx - w/2 + trimH/2, z: cz       },
    { w: trimH, d: d,   x: cx + w/2 - trimH/2, z: cz       },
  ];
  for (const t of trims) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, 0.04, t.d), trimMat);
    mesh.position.set(t.x, WALL_H - 0.02, t.z);
    scene.add(mesh);
  }

  // Benches — one in centre of each gallery room, facing paintings
  if (room.id === 0) {
    // Central Hall — two benches back to back in centre
    buildBench(scene, cx,     cz, 0);
    buildBench(scene, cx,     cz, Math.PI);
  } else if (room.id === 1) {
    buildBench(scene, cx, cz + 3, 0);
  } else if (room.id === 2) {
    buildBench(scene, cx - 3, cz, Math.PI / 2);
  } else if (room.id === 3) {
    buildBench(scene, cx + 3, cz, -Math.PI / 2);
  }

  const wallDefs = {
    north: [cx,         cz - d/2, 0,           w],
    south: [cx,         cz + d/2, Math.PI,     w],
    east:  [cx + w/2,   cz,      -Math.PI/2,   d],
    west:  [cx - w/2,   cz,       Math.PI/2,   d],
  };

  for (const side of solidWalls) {
    const [px, pz2, rotY, len] = wallDefs[side];
    placeWall(scene, buildWallSection(len, mat, false), px, pz2, rotY);
  }
  for (const side of doorWalls) {
    const [px, pz2, rotY, len] = wallDefs[side];
    placeWall(scene, buildWallSection(len, mat, true), px, pz2, rotY);
  }

  // Ceiling rail
  const railMesh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 0.035, 0.035), mat.rail);
  railMesh.position.set(cx, WALL_H - 0.018, cz);
  scene.add(railMesh);

  // Room fill light — unique tone per room
  const fill = new THREE.PointLight(tone.fill, 0.7, w * 1.4, 1.6);
  fill.position.set(cx, WALL_H - 0.5, cz);
  scene.add(fill);

  // Ceiling spotlights grid
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

      // Housing
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.065, 0.09, 10),
        mat.rail
      );
      housing.position.set(lx, WALL_H - 0.045, lz);
      scene.add(housing);

      // Emissive bulb
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

      // Spotlight — pools of light on floor
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

  // Outer frame
  const frameOuter = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.07), mat.frame
  );
  frameOuter.castShadow = true;
  frameOuter.receiveShadow = true;
  group.add(frameOuter);

  // Inner frame lip
  const frameInner = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
  );
  frameInner.position.z = -0.01;
  group.add(frameInner);

  // Canvas
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

    // Auto-resize frame to match real image aspect ratio
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

  // Spotlight on painting — warm, focused
  const fwd  = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, rotY, 0));
  const lPos = new THREE.Vector3(...pos)
    .add(fwd.clone().multiplyScalar(0.5))
    .add(new THREE.Vector3(0, 1.4, 0));

  const spot = new THREE.SpotLight(0xfff8f0, isMobile ? 3.0 : 4.5, 6, Math.PI / 3, 1.0, 1.5);
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
  // Very soft global ambient — real light comes from spots
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.28));

  // Hemisphere — warm ceiling bounce, cool floor bounce
  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x3a2810, 0.22));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildMuseum(scene, renderer) {
  // Store max anisotropy for texture loading
  window._maxAnisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  const mat = getMaterials();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.FogExp2(0x0d0b08, 0.02);

  addLighting(scene);
  for (const room of ROOMS) buildRoom(scene, room, mat);
  for (const p of PAINTINGS) buildPainting(scene, p, mat);
  buildCuratorialStatement(scene);

  return paintingObjects;
}

function buildCuratorialStatement(scene) {
  // 3D stone plate on wall with small yellow text
  // Plate sits flush on the south wall, left of the doorway

  // Dark marble/stone plate
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x1a1814, roughness: 0.4, metalness: 0.2,
  });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.04), plateMat);
  plate.position.set(-5.5, 2.1, 9.86);
  plate.rotation.y = Math.PI;
  scene.add(plate);

  // Thin gold border around plate
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xFBD00E, roughness: 0.3, metalness: 0.6 });
  const border = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.54, 0.02), borderMat);
  border.position.set(-5.5, 2.1, 9.84);
  border.rotation.y = Math.PI;
  scene.add(border);

  // Text canvas — smaller font, fits the plate
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);

  // Background match plate
  ctx.fillStyle = '#1a1814';
  ctx.fillRect(0, 0, 512, 128);

  // Text — smaller and centered
  ctx.font = 'bold 30px Questrial, Inter, sans-serif';
  ctx.fillStyle = '#FBD00E';
  ctx.textAlign = 'center';
  ctx.fillText('Curatorial Statement', 256, 52);

  // Subtitle hint
  ctx.font = '16px Inter, sans-serif';
  ctx.fillStyle = 'rgba(251,208,14,0.5)';
  ctx.fillText('Approach to read', 256, 82);

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.44), mat);
  mesh.position.set(-5.5, 2.1, 9.83);
  mesh.rotation.y = Math.PI;
  scene.add(mesh);

  const desc =`This body of work unfolds as a vivid exploration of inner landscapes, where identity, emotion, and perception take on organic and symbolic form. Moving fluidly across mixed media, collage, printmaking, and drawing, the artist constructs a visual language rooted in layering, intuition, and play.

Recurring motifs: eyes, botanical forms, fragmented bodies, and hybrid figures, act as anchors within a shifting terrain. They suggest awareness, growth, and transformation, while also questioning how identity is formed, observed, and expressed. Figures appear both grounded and dissolving, caught between visibility and introspection, control and spontaneity.

The works resist fixed narratives. Instead, they invite a slower engagement, where meaning emerges through texture, color, and association. Bright, almost electric palettes contrast with moments of quiet tension, creating a dynamic balance between the playful and the reflective.`;

  paintingObjects.push({
    mesh: { position: new THREE.Vector3(-5.5, 2.1, 9.88) },
    isCuratorial: true,
    painting: {
      id: 999,
      title: 'Curatorial Statement',
      year: '', medium: '', dimensions: '',
      description: desc,
      image: '', enquire: '',
    },
    viewPos: new THREE.Vector3(-5.5, 1.7, 7.5),
    viewTarget: new THREE.Vector3(-5.5, 2.1, 9.88),
  });
}