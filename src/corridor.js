import * as THREE from 'three';
import { CORRIDOR, WALL_H, DOOR_W, DOOR_H } from './config.js';

// ── Entrance corridor
// Narrow dark space south of Central Hall.
// A single warm strip of light at the north end pulls the visitor forward.

export function buildCorridor(scene) {
  const { cx, cz, w, d } = CORRIDOR;

  // Dark concrete-like wall material
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1a1816,
    roughness: 0.95,
    metalness: 0.0,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111010,
    roughness: 0.8,
    metalness: 0.05,
  });

  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0f0f0e,
    roughness: 1.0,
  });

  // Floor
  const floorLen = d - 1.2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, floorLen), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.001, cz + 0.6);
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling — stops well short of north doorway to avoid any z-fighting
  const ceilLen = d - 1.2;
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, ceilLen), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, WALL_H - 0.001, cz + 0.6);
  scene.add(ceil);

  // South wall (solid — entrance back wall with small opening for entry)
  _solidWall(scene, w, wallMat, cx, cz + d / 2, Math.PI);

  // East wall
  _solidWall(scene, d, wallMat, cx + w / 2, cz, -Math.PI / 2);

  // West wall
  _solidWall(scene, d, wallMat, cx - w / 2, cz, Math.PI / 2);

  // North wall — door opening into Central Hall
  _doorWall(scene, w, wallMat, cx, cz - d / 2, 0);

  // ── Lighting ──────────────────────────────────────────────────────────────
  // No corridor lights — the gallery's ambient light bleeds in naturally

  // ── Curatorial statement on left wall ────────────────────────────────────
  _buildCuratorialText(scene, cx, cz, w, d);
}

function _buildCuratorialText(scene, cx, cz, w, d) {
  const canvas = document.createElement('canvas');
  canvas.width  = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, 1024, 1536);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';

  // Title
  ctx.font = '600 38px -apple-system, Helvetica Neue, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText('Curatorial Statement', 60, 90);

  // Divider
  ctx.fillStyle = '#FBD00E';
  ctx.fillRect(60, 108, 180, 2);

  // Body text
  ctx.font = '300 24px -apple-system, Helvetica Neue, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';

  const lines = [
    '',
    'This body of work unfolds as a vivid',
    'exploration of inner landscapes, where',
    'identity, emotion, and perception take on',
    'organic and symbolic form. Moving fluidly',
    'across mixed media, collage, printmaking,',
    'and drawing, the artist constructs a visual',
    'language rooted in layering, intuition,',
    'and play.',
    '',
    'Recurring motifs: eyes, botanical forms,',
    'fragmented bodies, and hybrid figures,',
    'act as anchors within a shifting terrain.',
    'They suggest awareness, growth, and',
    'transformation, while also questioning how',
    'identity is formed, observed, and expressed.',
    'Figures appear both grounded and dissolving,',
    'caught between visibility and introspection,',
    'control and spontaneity.',
    '',
    'The works resist fixed narratives. Instead,',
    'they invite a slower engagement, where',
    'meaning emerges through texture, color,',
    'and association. Bright, almost electric',
    'palettes contrast with moments of quiet',
    'tension, creating a dynamic balance between',
    'the playful and the reflective.',
  ];

  let y = 140;
  for (const line of lines) {
    ctx.fillText(line, 60, y);
    y += 36;
  }

  const texture = new THREE.CanvasTexture(canvas);
  const mat     = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  // Place on west wall (left as visitor walks north)
  const panelW = 2.2;
  const panelH = 3.3;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), mat);

  // West wall of corridor: x = cx - w/2, face east (rotateY = PI/2)
  mesh.position.set(cx - w / 2 + 0.02, panelH / 2 + 0.4, cz + 0.5);
  mesh.rotation.y = Math.PI / 2;
  scene.add(mesh);
}

function _solidWall(scene, length, mat, px, pz, rotY) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(length, WALL_H), mat);
  mesh.position.set(px, WALL_H / 2, pz);
  mesh.rotation.y = rotY;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function _doorWall(scene, length, mat, px, pz, rotY) {
  const lW  = (length - DOOR_W) / 2;
  const group = new THREE.Group();
  group.position.set(px, 0, pz);
  group.rotation.y = rotY;

  // Side panels only — no top panel at all, full height opening
  if (lW > 0.01) {
    const left = new THREE.Mesh(new THREE.PlaneGeometry(lW, WALL_H), mat);
    left.position.set(-(DOOR_W / 2 + lW / 2), WALL_H / 2, 0);
    group.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(lW, WALL_H), mat);
    right.position.set(DOOR_W / 2 + lW / 2, WALL_H / 2, 0);
    group.add(right);
  }

  // Side tunnel depth panels — stop 0.05 short of ceiling to avoid z-fight
  const DEPTH = 0.3;
  const safeH = WALL_H - 0.08;

  const leftT = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, safeH), mat.clone());
  leftT.rotation.y = Math.PI / 2;
  leftT.position.set(-DOOR_W / 2, safeH / 2, -DEPTH / 2);
  group.add(leftT);

  const rightT = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, safeH), mat.clone());
  rightT.rotation.y = -Math.PI / 2;
  rightT.position.set(DOOR_W / 2, safeH / 2, -DEPTH / 2);
  group.add(rightT);

  scene.add(group);
}

function _dimOverhead(scene, cx, cz) {
  const light = new THREE.PointLight(0xc8d8ff, 0.15, 8, 2);
  light.position.set(cx, WALL_H - 0.1, cz);
  scene.add(light);
}

function _rectLight(scene, cx, cz) {
  const { RectAreaLight } = THREE;
  const rect = new RectAreaLight(0xc8d8ff, 0.4, 0.1, 6);
  rect.position.set(cx, WALL_H - 0.05, cz);
  rect.rotation.x = -Math.PI / 2;
  scene.add(rect);
}

// ── Intro camera animation ────────────────────────────────────────────────
// Called from main.js after Enter is clicked.
// Slowly pushes the camera forward from z=17 toward z=10 over ~4 seconds,
// then hands control to the player.

export function playIntroAnimation(camera, onComplete) {
  const startZ   = 17.2;
  const endZ     = 13.5;
  const duration = 2200; // ms — shorter feels more responsive
  const startTime = performance.now();

  // Lock player during animation
  camera.position.set(0, 1.7, startZ);
  camera.lookAt(0, 1.7, 0);

  function tick(now) {
    const elapsed  = now - startTime;
    const t        = Math.min(elapsed / duration, 1);
    const eased    = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out

    camera.position.z = startZ + (endZ - startZ) * eased;

    // Subtle upward tilt as you approach the light
    camera.position.y = 1.7 + Math.sin(eased * Math.PI * 0.5) * 0.08;
    camera.lookAt(0, 1.65, 0);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      camera.position.set(0, 1.7, endZ);
      onComplete();
    }
  }

  requestAnimationFrame(tick);
}