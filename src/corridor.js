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
  // Ambient — enough to see walls and floor clearly while walking
  const ambient = new THREE.AmbientLight(0x4a3828, 1.8);
  scene.add(ambient);

  // Midway light so visitor sees they are moving through a space
  const mid = new THREE.PointLight(0x8a6a40, 2.2, 14, 1.4);
  mid.position.set(cx, WALL_H * 0.65, cz + 2);
  scene.add(mid);

  // Warm glow at gallery entrance — strong beacon drawing visitor forward
  const glow = new THREE.PointLight(0xfff3d0, 4.0, 7, 1.6);
  glow.position.set(cx, WALL_H * 0.5, cz - d / 2 + 1.0);
  scene.add(glow);
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
  const duration = 2200;

  // Set camera to start position immediately
  camera.position.set(0, 1.7, startZ);
  camera.lookAt(0, 1.65, 0);

  let startTime = null; // set on first tick to avoid counting setup time

  function tick(now) {
    // Capture start time on very first frame — avoids counting enterGallery setup time
    if (startTime === null) { startTime = now; }

    const elapsed  = now - startTime;
    const t        = Math.min(elapsed / duration, 1);
    const eased    = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    camera.position.z = startZ + (endZ - startZ) * eased;
    camera.position.y = 1.7 + Math.sin(eased * Math.PI * 0.5) * 0.06;
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