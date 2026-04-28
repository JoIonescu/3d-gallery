import * as THREE from 'three';
import { buildMuseum }          from './museum.js';
import { buildCorridor, playIntroAnimation } from './corridor.js';
import { Player }               from './player.js';
import { InfoCard }              from './infoCard.js';
import { AudioManager }         from './audio.js';
import { Minimap }              from './minimap.js';
import { ROOM_ZONES, PLAYER_START } from './config.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const isMobile = window.matchMedia('(pointer: coarse)').matches;
const isLowEnd = isMobile && (navigator.hardwareConcurrency <= 4 || /Redmi|Techno|Samsung.*SM-A|Moto|Nokia/i.test(navigator.userAgent));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isLowEnd, powerPreference: 'high-performance' });
const vv = window.visualViewport;
const vw = vv ? Math.round(vv.width)  : window.innerWidth;
const vh = vv ? Math.round(vv.height) : window.innerHeight;
renderer.setSize(vw, vh);
renderer.setPixelRatio(isLowEnd ? 0.75 : Math.min(window.devicePixelRatio, 3));
renderer.shadowMap.enabled   = false;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  document.documentElement.style.setProperty('--app-height', h + 'px');
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => setTimeout(onResize, 50));
}

// ── Scene & Camera ────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 120);
camera.position.set(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);
camera.lookAt(0, 1.7, 0);

// ── Build world ───────────────────────────────────────────────────────────────
const loadingFill    = document.getElementById('loading-fill');
loadingFill.style.width = '40%';
const paintingObjects = buildMuseum(scene, renderer);
buildCorridor(scene);
loadingFill.style.width = '100%';

// Collect floor meshes for raycasting
const floorMeshes = [];
scene.traverse((obj) => {
  if (obj.isMesh && obj.rotation.x === -Math.PI / 2) {
    floorMeshes.push(obj);
  }
});

// ── Modules ───────────────────────────────────────────────────────────────────
const player   = new Player(camera);
const infoCard = new InfoCard(player);
const audio    = new AudioManager();
const minimap  = new Minimap();

window.__exitZoom = () => {
  player.exitZoom();
  const btn = document.getElementById('zoom-exit-mobile');
  if (btn) btn.classList.remove('show');
};

// ── Raycaster ─────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();

function getCanvasXY(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    ((clientX - rect.left) / rect.width)  *  2 - 1,
    ((clientY - rect.top)  / rect.height) * -2 + 1
  );
}

function handleClick(clientX, clientY) {
  if (player.locked || player.isZoomed) return;
  if (player._lastClickWasDrag || player._lastTouchWasSwipe) return;

  const m = getCanvasXY(clientX, clientY);
  raycaster.setFromCamera(m, camera);

  // 1. Check info plaques first — click plaque opens info card
  const allMeshes = [];
  scene.traverse((obj) => { if (obj.isMesh) allMeshes.push(obj); });
  const plaqueHits = raycaster.intersectObjects(allMeshes, false).filter(h => h.object.userData.isInfoPlaque);

  if (plaqueHits.length > 0) {
    const hit = plaqueHits[0].object;
    const paintingId = hit.userData.paintingId;
    const paintingObj = paintingObjects.find(o => o.painting.id === paintingId);
    if (paintingObj) {
      infoCard._show(paintingObj);
    }
    return;
  }

  // 2. Check painting frames — click painting also opens info card
  const paintingMeshes = paintingObjects.map(o => o.mesh).filter(m => m.children);
  const paintingHits   = raycaster.intersectObjects(paintingMeshes, true);
  if (paintingHits.length > 0) {
    let hitObj = null;
    for (const p of paintingObjects) {
      if (raycaster.intersectObject(p.mesh, true).length > 0) {
        hitObj = p;
        break;
      }
    }
    if (hitObj && !hitObj.isCuratorial) {
      infoCard._show(hitObj);
      return;
    }
  }

  // 3. Check floor — click floor to walk there
  const floorHits = raycaster.intersectObjects(floorMeshes);
  if (floorHits.length > 0) {
    const hit = floorHits[0].point;
    hit.y = 1.7;
    player.walkTo(hit);
    showWalkIndicator(floorHits[0].point);
  }
}

// Walk indicator
function showWalkIndicator(point) {
  let ind = scene.getObjectByName('walkIndicator');
  if (!ind) {
    const geo = new THREE.RingGeometry(0.12, 0.18, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.55, transparent: true, side: THREE.DoubleSide });
    ind = new THREE.Mesh(geo, mat);
    ind.name = 'walkIndicator';
    ind.rotation.x = -Math.PI / 2;
    scene.add(ind);
  }
  ind.position.set(point.x, 0.02, point.z);
  ind.material.opacity = 0.55;
  clearTimeout(ind._fade);
  ind._fade = setTimeout(() => {
    if (ind.material) ind.material.opacity = 0;
  }, 600);
}

canvas.addEventListener('click', (e) => {
  handleClick(e.clientX, e.clientY);
});

canvas.addEventListener('touchend', (e) => {
  if (e.changedTouches.length === 1) {
    const t = e.changedTouches[0];
    handleClick(t.clientX, t.clientY);
  }
}, { passive: true });

// ── iOS Safari AR tooltip ─────────────────────────────────────────────────────
function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }
function isSafari() { return /^((?!chrome|android).)*safari/i.test(navigator.userAgent); }

if (isIOS() && !isSafari()) {
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
    el.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:rgba(10,10,10,0.92);border:0.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:0.1em;padding:13px 22px;z-index:999;pointer-events:none;transition:opacity 0.4s ease;white-space:nowrap;opacity:0;';
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
  galleryActive = true;
  lastTime = performance.now();
  minimap.show();

  const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const _isIOSSafari = _isIOS && /^((?!chrome|android|crios|fxios|gsa).)*safari/i.test(navigator.userAgent);
  const _isMobile = _isIOS || /Android/.test(navigator.userAgent);
  if (!_isMobile || _isIOSSafari) audioBtn.classList.add('show');

  if (isMobile) {
    const hint = document.getElementById('move-hint');
    if (hint) {
      setTimeout(() => hint.classList.add('show'), 800);
      const fadeHint = () => { hint.classList.remove('show'); hint.classList.add('fade'); };
      setTimeout(fadeHint, 5000);
      window.addEventListener('touchmove', fadeHint, { once: true });
    }
  }

  if (!introPlayed) {
    introPlayed = true;
    player.locked = true;
    setTimeout(() => audio.start(), 800);
    playIntroAnimation(camera, () => {
      player.locked = false;
    });
  } else {
    audio.start();
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
let lastTime      = performance.now();
let galleryActive = false;

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (galleryActive && !player.locked) {
    player.update(dt);
    // Proximity sensor removed — info card opens via plaque click only
    updateRoomLabel(camera.position.x, camera.position.z);
  }

  if (galleryActive) {
    minimap.update(camera);
    const inCorridor = camera.position.z > 10;
    const targetExp  = inCorridor ? 0.55 : 1.08;
    renderer.toneMappingExposure += (targetExp - renderer.toneMappingExposure) * 0.03;
  }

  if (galleryActive) renderer.render(scene, camera);
}

requestAnimationFrame(animate);