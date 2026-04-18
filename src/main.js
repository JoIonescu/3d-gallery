import * as THREE from 'three';
import { buildMuseum } from './museum.js';
import { Player }       from './player.js';
import { InfoCard, findNearest } from './infoCard.js';
import { AudioManager } from './audio.js';
import { ROOM_ZONES }   from './config.js';

// ── Renderer ────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── Scene & Camera ──────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 120);
camera.position.set(0, 1.7, 7);
camera.lookAt(0, 1.7, 0);

// ── Build museum ─────────────────────────────────────────────────────────────
const loadingFill = document.getElementById('loading-fill');
loadingFill.style.width = '40%';

const paintingObjects = buildMuseum(scene);
loadingFill.style.width = '100%';

// ── Modules ──────────────────────────────────────────────────────────────────
const player   = new Player(camera);
const infoCard = new InfoCard(player);
const audio    = new AudioManager();

// ── Enter screen ─────────────────────────────────────────────────────────────
const loadingEl = document.getElementById('loading');
const enterEl   = document.getElementById('enter');
const enterBtn  = document.getElementById('enter-btn');
const audioBtn  = document.getElementById('audio-btn');

setTimeout(() => {
  loadingEl.classList.add('fade');
  setTimeout(() => {
    loadingEl.style.display = 'none';
    enterEl.classList.add('show');
  }, 800);
}, 600);

function enterGallery() {
  enterEl.classList.remove('show');
  enterEl.style.display = 'none';
  audioBtn.classList.add('show');
  audio.start();
  document.documentElement.requestPointerLock().catch(() => {});
}

enterBtn.addEventListener('click', enterGallery);
enterEl.addEventListener('click',  (e) => { if (e.target === enterEl) enterGallery(); });

// ── Room label ───────────────────────────────────────────────────────────────
const roomLabelEl = document.getElementById('room-label');
let   lastRoomId  = -1;

function updateRoomLabel(x, z) {
  const room = ROOM_ZONES.find(r => x > r.xMin && x < r.xMax && z > r.zMin && z < r.zMax);
  if (!room) return;
  if (room.id === lastRoomId) return;
  lastRoomId = room.id;
  roomLabelEl.style.opacity = '0';
  setTimeout(() => {
    roomLabelEl.textContent = room.name;
    roomLabelEl.style.opacity = '1';
  }, 300);
}

// ── Render loop ───────────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  player.update(dt);

  const nearest = findNearest(paintingObjects, camera.position);
  infoCard.update(nearest, dt);

  updateRoomLabel(camera.position.x, camera.position.z);

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);