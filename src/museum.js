import * as THREE from 'three';
import { ROOMS, PAINTINGS, WALL_H, DOOR_W, DOOR_H, HANG_H } from './config.js';

export const paintingObjects = [];

// ── Texture generators ──────────────────────────────────────────────────────

function makeMarbleTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');

  // Base: cool white-grey marble
  ctx.fillStyle = '#e8e4de';
  ctx.fillRect(0, 0, 512, 512);

  // Marble vein layers — dark and light
  const veins = [
    { color: 'rgba(180,170,158,0.55)', width: 2.5 },
    { color: 'rgba(140,130,120,0.35)', width: 1.2 },
    { color: 'rgba(210,205,198,0.6)',  width: 1.8 },
    { color: 'rgba(100, 95, 88,0.25)', width: 0.8 },
    { color: 'rgba(255,252,248,0.7)',  width: 1.5 },
  ];

  function veinPath(ctx, startX, startY, color, lineWidth) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let x = startX, y = startY;
    const steps = 18 + Math.floor(Math.random() * 12);
    for (let i = 0; i < steps; i++) {
      x += (Math.random() - 0.42) * 48;
      y += (Math.random() - 0.3)  * 36;
      const cx1 = x + (Math.random() - 0.5) * 30;
      const cy1 = y + (Math.random() - 0.5) * 30;
      ctx.quadraticCurveTo(cx1, cy1, x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    ctx.stroke();
  }

  for (let v = 0; v < 28; v++) {
    const vein = veins[v % veins.length];
    veinPath(ctx, Math.random() * 512, Math.random() * 512, vein.color, vein.width + Math.random());
  }

  // Subtle noise for stone grain
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    img.data[i]   = Math.min(255, Math.max(0, img.data[i]   + n));
    img.data[i+1] = Math.min(255, Math.max(0, img.data[i+1] + n));
    img.data[i+2] = Math.min(255, Math.max(0, img.data[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeWallTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2ede6';
  ctx.fillRect(0, 0, 512, 512);
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[i]   = Math.min(255, Math.max(220, img.data[i]   + n));
    img.data[i+1] = Math.min(255, Math.max(215, img.data[i+1] + n));
    img.data[i+2] = Math.min(255, Math.max(205, img.data[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeCeilingTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f8f6f2';
  ctx.fillRect(0, 0, 256, 256);
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 5;
    img.data[i]   = Math.min(255, Math.max(240, img.data[i]   + n));
    img.data[i+1] = Math.min(255, Math.max(238, img.data[i+1] + n));
    img.data[i+2] = Math.min(255, Math.max(234, img.data[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ── Materials ────────────────────────────────────────────────────────────────

let matLib = null;
function getMaterials() {
  if (matLib) return matLib;
  const marbleTex = makeMarbleTexture();
  marbleTex.repeat.set(3, 3);
  const wallTex = makeWallTexture();
  wallTex.repeat.set(3, 1.5);
  const ceilTex = makeCeilingTexture();
  ceilTex.repeat.set(4, 4);
  matLib = {
    floor  : new THREE.MeshStandardMaterial({ map: marbleTex,  roughness: 0.06, metalness: 0.18, envMapIntensity: 1.5 }),
    ceiling: new THREE.MeshStandardMaterial({ map: ceilTex,    roughness: 0.95, metalness: 0.0  }),
    wall   : new THREE.MeshStandardMaterial({ map: wallTex,    roughness: 0.88, metalness: 0.0, side: THREE.DoubleSide }),
    frame  : new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.35, metalness: 0.45 }),
    molding: new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.7  }),
    rail   : new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.2,  metalness: 0.85 }),
    light  : new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: new THREE.Color(0xffffee), emissiveIntensity: 0.6 }),
  };
  return matLib;
}

// ── Wall helpers ─────────────────────────────────────────────────────────────

function wallPanel(w, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  return m;
}

function addMoldings(group, length, mat) {
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.18, 0.05), mat.molding);
  skirt.position.set(0, 0.09, 0.025);
  group.add(skirt);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(length, 0.14, 0.06), mat.molding);
  crown.position.set(0, WALL_H - 0.07, 0.03);
  group.add(crown);
}

function buildSolidWall(length, mat) {
  const g = new THREE.Group();
  const m = wallPanel(length, WALL_H, mat.wall);
  m.position.set(0, WALL_H / 2, 0);
  g.add(m);
  addMoldings(g, length, mat);
  return g;
}

function buildDoorWall(length, mat) {
  const g    = new THREE.Group();
  const lW   = (length - DOOR_W) / 2;
  const topH = WALL_H - DOOR_H;
  const DEPTH = 0.32; // wall thickness in world units

  if (lW > 0.01) {
    const left = wallPanel(lW, WALL_H, mat.wall);
    left.position.set(-(DOOR_W / 2 + lW / 2), WALL_H / 2, 0);
    g.add(left);
    const right = wallPanel(lW, WALL_H, mat.wall);
    right.position.set(DOOR_W / 2 + lW / 2, WALL_H / 2, 0);
    g.add(right);
  }
  if (topH > 0.01) {
    const top = wallPanel(DOOR_W, topH, mat.wall);
    top.position.set(0, DOOR_H + topH / 2, 0);
    g.add(top);
  }

  // ── Doorway tunnel sides (give the opening physical depth) ──
  const tunnelMat = mat.wall.clone();
  // Left inner wall
  const leftTunnel = new THREE.Mesh(
    new THREE.PlaneGeometry(DEPTH, DOOR_H), tunnelMat
  );
  leftTunnel.rotation.y = Math.PI / 2;
  leftTunnel.position.set(-(DOOR_W / 2), DOOR_H / 2, -DEPTH / 2);
  g.add(leftTunnel);
  // Right inner wall
  const rightTunnel = new THREE.Mesh(
    new THREE.PlaneGeometry(DEPTH, DOOR_H), tunnelMat
  );
  rightTunnel.rotation.y = -Math.PI / 2;
  rightTunnel.position.set(DOOR_W / 2, DOOR_H / 2, -DEPTH / 2);
  g.add(rightTunnel);
  // Top inner ceiling
  const topTunnel = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR_W, DEPTH), mat.ceiling
  );
  topTunnel.rotation.x = Math.PI / 2;
  topTunnel.position.set(0, DOOR_H, -DEPTH / 2);
  g.add(topTunnel);

  // Architrave (door frame trim)
  const archThick = 0.055;
  const archDefs = [
    { w: archThick, h: DOOR_H,                 x: -(DOOR_W / 2 + archThick / 2), y: DOOR_H / 2 },
    { w: archThick, h: DOOR_H,                 x:  (DOOR_W / 2 + archThick / 2), y: DOOR_H / 2 },
    { w: DOOR_W + archThick * 2, h: archThick, x: 0, y: DOOR_H + archThick / 2 },
  ];
  for (const s of archDefs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 0.05), mat.molding);
    m.position.set(s.x, s.y, 0.025);
    g.add(m);
  }

  addMoldings(g, length, mat);
  return g;
}

function placeWall(scene, group, px, pz, rotY) {
  group.position.set(px, 0, pz);
  group.rotation.y = rotY;
  scene.add(group);
}

// ── Room builder ─────────────────────────────────────────────────────────────

function buildRoom(scene, room, mat) {
  const { cx, cz, w, d, solidWalls, doorWalls } = room;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0, cz);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, WALL_H, cz);
  scene.add(ceil);

  const wallDefs = {
    north: [cx,         cz - d / 2, 0,             w],
    south: [cx,         cz + d / 2, Math.PI,       w],
    east:  [cx + w / 2, cz,        -Math.PI / 2,   d],
    west:  [cx - w / 2, cz,         Math.PI / 2,   d],
  };

  for (const side of solidWalls) {
    const [px, pz2, rotY, len] = wallDefs[side];
    placeWall(scene, buildSolidWall(len, mat), px, pz2, rotY);
  }
  for (const side of doorWalls) {
    const [px, pz2, rotY, len] = wallDefs[side];
    placeWall(scene, buildDoorWall(len, mat), px, pz2, rotY);
  }

  // Ceiling rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 0.04, 0.04), mat.rail);
  rail.position.set(cx, WALL_H - 0.02, cz);
  scene.add(rail);

  // Ceiling light housings
  const spacing = 4;
  const count   = Math.floor((w - 1) / spacing);
  for (let i = 0; i < count; i++) {
    const lx = cx - (count - 1) * spacing / 2 + i * spacing;
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.08, 8), mat.rail);
    housing.position.set(lx, WALL_H - 0.06, cz);
    scene.add(housing);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), mat.light);
    bulb.position.set(lx, WALL_H - 0.1, cz);
    scene.add(bulb);
  }
}

// ── Painting builder ─────────────────────────────────────────────────────────

function getPaintingTransform(room, wall, offset) {
  const { cx, cz, w, d } = room;
  const GAP = 0.06;
  switch (wall) {
    case 'south': return { pos: [cx + offset, HANG_H, cz + d / 2 - GAP], rotY: Math.PI };
    case 'north': return { pos: [cx + offset, HANG_H, cz - d / 2 + GAP], rotY: 0 };
    case 'east':  return { pos: [cx + w / 2 - GAP, HANG_H, cz + offset], rotY: -Math.PI / 2 };
    case 'west':  return { pos: [cx - w / 2 + GAP, HANG_H, cz + offset], rotY:  Math.PI / 2 };
  }
}

function buildPainting(scene, painting, mat) {
  const room = ROOMS[painting.room];
  const { pos, rotY } = getPaintingTransform(room, painting.wall, painting.offset);
  const { w, h } = painting.size;

  const group = new THREE.Group();
  group.position.set(...pos);
  group.rotation.y = rotY;

  const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.07), mat.frame);
  frameOuter.castShadow = true;
  group.add(frameOuter);

  const frameInner = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
  );
  frameInner.position.z = -0.01;
  group.add(frameInner);

  const canvas = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: painting.color, roughness: 0.8 })
  );
  canvas.position.z = 0.05;
  group.add(canvas);

  new THREE.TextureLoader().load(painting.image, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    canvas.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  }, undefined, () => {});

  // Spotlight
  const spot = new THREE.SpotLight(0xfff5e0, 5, 8, Math.PI / 9, 0.35, 1.8);
  const fwd  = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, rotY, 0));
  const lPos = new THREE.Vector3(...pos).add(fwd.clone().multiplyScalar(0.4)).add(new THREE.Vector3(0, 1.2, 0));
  spot.position.copy(lPos);
  const target = new THREE.Object3D();
  target.position.set(...pos);
  scene.add(target);
  spot.target = target;
  spot.castShadow = true;
  spot.shadow.mapSize.set(512, 512);
  scene.add(spot);
  scene.add(group);

  const viewDir = fwd.clone();
  const viewPos = new THREE.Vector3(...pos).add(viewDir.clone().multiplyScalar(2.4));
  viewPos.y = 1.7;
  paintingObjects.push({ mesh: group, painting, viewPos, viewTarget: new THREE.Vector3(...pos) });
}

// ── Lighting ─────────────────────────────────────────────────────────────────

function addCeilingSpot(scene, x, z, mat) {
  // Housing
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.07, 0.1, 10),
    mat.rail
  );
  housing.position.set(x, WALL_H - 0.05, z);
  scene.add(housing);

  // Emissive bulb — subtle warm glow
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfff8e8,
      emissive: new THREE.Color(0xfff8e8),
      emissiveIntensity: 0.9
    })
  );
  bulb.position.set(x, WALL_H - 0.12, z);
  scene.add(bulb);

  // Spotlight — illuminates floor, no visible cone
  const spot = new THREE.SpotLight(0xfff6e0, 1.8, 7, Math.PI / 7, 0.4, 1.6);
  spot.position.set(x, WALL_H - 0.12, z);
  const t = new THREE.Object3D();
  t.position.set(x, 0, z);
  scene.add(t);
  spot.target = t;
  spot.castShadow = false;
  scene.add(spot);
}

function addLighting(scene) {
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.35));
  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x3a2810, 0.28));

  const mat = getMaterials();

  // Ceiling spotlights grid per room
  const spotGrids = [
    // Central Hall — 4 spots
    [[-4,0],[ 4,0],[-4,0],[4,0]].map(([dx,dz])=>([dx, dz])),
    // North Gallery
    [[-3,-18],[3,-18]],
    // East Gallery
    [[18,-3],[18,3]],
    // West Gallery
    [[-18,-3],[-18,3]],
  ];
  for (const grid of spotGrids) {
    for (const [x,z] of grid) addCeilingSpot(scene, x, z, mat);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildMuseum(scene) {
  const mat = getMaterials();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.FogExp2(0x0d0b08, 0.022);
  for (const room of ROOMS) buildRoom(scene, room, mat);
  addLighting(scene);
  for (const p of PAINTINGS) buildPainting(scene, p, mat);
  return paintingObjects;
}