import * as THREE from 'three';
import { buildMuseum }          from './museum.js';
import { buildCorridor, playIntroAnimation } from './corridor.js';
import { Player }               from './player.js';
import { InfoCard, findNearest } from './infoCard.js';
import { AudioManager }         from './audio.js';
import { ROOM_ZONES, PLAYER_START } from './config.js';
import { Minimap } from './minimap.js';

// ── Renderer ─────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const isMobile  = window.matchMedia('(pointer: coarse)').matches;
const isLowEnd  = isMobile && (navigator.hardwareConcurrency <= 4 || /Redmi|Techno|Samsung.*SM-A|Moto|Nokia/i.test(navigator.userAgent));
if (isLowEnd) { console.log('Low-end device detected — performance mode'); }
const renderer  = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(isLowEnd ? 0.75 : Math.min(window.devicePixelRatio, 3));
renderer.shadowMap.enabled   = false;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

function onResize() {
  // Use visualViewport on iOS for correct size excluding browser chrome
  const vv = window.visualViewport;
  const w  = vv ? Math.round(vv.width)  : window.innerWidth;
  const h  = vv ? Math.round(vv.height) : window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 300));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', onResize);
}

// ── Scene & Camera ────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 120);
camera.position.set(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);
camera.lookAt(0, 1.7, 0);

// ── Build world ───────────────────────────────────────────────────────────────
const loadingFill = document.getElementById('loading-fill');
loadingFill.style.width = '40%';
const paintingObjects = buildMuseum(scene, renderer);
buildCorridor(scene);
loadingFill.style.width = '100%';

// ── Modules ───────────────────────────────────────────────────────────────────
const player   = new Player(camera);
const infoCard = new InfoCard(player);
window.__exitZoom = () => {
  player.exitZoom();
  const btn = document.getElementById('zoom-exit-mobile');
  if (btn) btn.classList.remove('show');
};
const audio    = new AudioManager();
const minimap  = new Minimap();

// ── iOS Safari AR tooltip ─────────────────────────────────────────────────────
function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }
function isSafari() { return /^((?!chrome|android).)*safari/i.test(navigator.userAgent); }

if (isIOS() && !isSafari()) {
  // Patch the AR button to show tooltip instead of launching AR
  document.addEventListener('DOMContentLoaded', () => {}, { once: true });
  const origBtn = document.getElementById('ic-ar');
  if (origBtn) {
    origBtn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      showToast('Open in Safari to use AR');
    }, true);
  }
}

function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = [
      'position:fixed', 'bottom:32px', 'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(10,10,10,0.92)',
      'border:0.5px solid rgba(255,255,255,0.15)',
      'color:rgba(255,255,255,0.8)',
      'font-size:12px', 'letter-spacing:0.1em',
      'padding:13px 22px', 'z-index:999',
      'pointer-events:none',
      'transition:opacity 0.4s ease',
      'white-space:nowrap',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// ── Loading & Enter ───────────────────────────────────────────────────────────
const loadingEl = document.getElementById('loading');
const enterEl   = document.getElementById('enter');
const enterBtn  = document.getElementById('enter-btn');
const audioBtn  = document.getElementById('audio-btn');

let introPlayed = false;

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
  galleryActive = true;
  lastTime = performance.now();
  audio.start();
  minimap.show();
  // Only show joystick on iOS — Android uses touch-look
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) document.getElementById('joystick-zone').classList.add('active');
  // Show movement hint on mobile, fade after 4s or first movement
  if (window.matchMedia('(pointer: coarse)').matches) {
    const hint = document.getElementById('move-hint');
    if (hint) {
      setTimeout(() => hint.classList.add('show'), 800);
      const fadeHint = () => {
        hint.classList.remove('show');
        hint.classList.add('fade');
        window.removeEventListener('touchmove', fadeHint);
      };
      setTimeout(fadeHint, 5000);
      window.addEventListener('touchmove', fadeHint, { once: true });
    }
  }

  if (!introPlayed) {
    introPlayed = true;
    player.locked = true; // freeze player during intro
    playIntroAnimation(camera, () => {
      player.locked = false;
      document.documentElement.requestPointerLock().catch(() => {});
    });
  } else {
    document.documentElement.requestPointerLock().catch(() => {});
  }
}

enterBtn.addEventListener('click', enterGallery);
enterEl.addEventListener('click', (e) => { if (e.target === enterEl) enterGallery(); });

// ── Room label ────────────────────────────────────────────────────────────────
const roomLabelEl = document.getElementById('room-label');
let   lastRoomId  = -1;

function updateRoomLabel(x, z) {
  const room = ROOM_ZONES.find(r => x > r.xMin && x < r.xMax && z > r.zMin && z < r.zMax);
  if (!room || room.id === lastRoomId) return;
  lastRoomId = room.id;
  roomLabelEl.style.opacity = '0';
  setTimeout(() => {
    roomLabelEl.textContent = room.name;
    roomLabelEl.style.transition = 'opacity 0.6s ease';
    roomLabelEl.style.opacity = '1';
  }, 300);
}

// ── Render loop ───────────────────────────────────────────────────────────────
let lastTime  = performance.now();
let galleryActive = false;

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (galleryActive && !player.locked) {
    player.update(dt);
    const nearest = findNearest(paintingObjects, camera.position);
    infoCard.update(nearest, dt);
    updateRoomLabel(camera.position.x, camera.position.z);
  }

  if (galleryActive) {
    minimap.update(camera);
    const inCorridor = camera.position.z > 10;
    const targetExp  = inCorridor ? 0.55 : 1.08;
    renderer.toneMappingExposure += (targetExp - renderer.toneMappingExposure) * 0.03;
  }

  // Render only after gallery entered (prevents corridor flash on load)
  if (galleryActive) renderer.render(scene, camera);
}

requestAnimationFrame(animate);