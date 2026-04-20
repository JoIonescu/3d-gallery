// AR "View in your space" — iOS AR Quick Look (.usdz) + Android Scene Viewer (.glb)
// Generates a flat painting plane on the fly using Three.js GLTFExporter

import * as THREE from 'three';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

export function isMobile() {
  return isIOS() || isAndroid();
}

// Build a minimal GLB in memory: flat plane with painting texture
async function buildPaintingGLB(painting) {
  const { GLTFExporter } = await import('https://unpkg.com/three@0.163.0/examples/jsm/exporters/GLTFExporter.js');

  const scene    = new THREE.Scene();
  const { w, h } = painting.size;

  // Load painting texture
  const texture = await new Promise((resolve) => {
    new THREE.TextureLoader().load(
      painting.image,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; resolve(tex); },
      undefined,
      () => resolve(null)
    );
  });

  const mat = new THREE.MeshStandardMaterial({
    color: texture ? 0xffffff : painting.color,
    map: texture || null,
    roughness: 0.8,
  });

  // Painting canvas
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  scene.add(canvas);

  // Simple black frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
  const frame    = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.04), frameMat);
  frame.position.z = -0.022;
  scene.add(frame);

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (glb) => resolve(new Blob([glb], { type: 'model/gltf-binary' })),
      (err) => reject(err),
      { binary: true }
    );
  });
}

export async function openAR(painting) {
  if (!isIOS() && !isAndroid()) {
    showDesktopARMessage();
    return;
  }

  if (isIOS() && !isSafari()) {
    showToast('Open in Safari to use AR');
    return;
  }

  const id     = String(painting.id + 1).padStart(2, '0');
  const glbUrl = `${window.location.origin}/ar/${id}.glb`;

  // Check if .glb exists
  try {
    const check = await fetch(glbUrl, { method: 'HEAD' });
    if (!check.ok) {
      showToast('AR not available for this painting yet');
      return;
    }
  } catch(e) {
    showToast('AR not available for this painting yet');
    return;
  }

  // Open model-viewer page — works on both iOS Safari and Android Chrome
  const viewerUrl = `/ar-viewer.html?model=${encodeURIComponent(glbUrl)}&title=${encodeURIComponent(painting.title)}`;
  window.open(viewerUrl, '_blank');
}

function showToast(msg) {
  let el = document.getElementById('ar-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ar-toast';
    el.style.cssText = [
      'position:fixed', 'bottom:120px', 'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(10,10,10,0.92)',
      'border:0.5px solid rgba(255,255,255,0.15)',
      'color:rgba(255,255,255,0.8)',
      'font-size:12px', 'letter-spacing:0.08em',
      'padding:13px 22px', 'z-index:999',
      'pointer-events:none',
      'opacity:0', 'transition:opacity 0.4s ease',
      'white-space:nowrap', 'text-align:center',
      'max-width:280px', 'line-height:1.5',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 3500);
}

function showDesktopARMessage() {
  let el = document.getElementById('ar-desktop-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ar-desktop-msg';
    el.style.cssText = [
      'position:fixed',
      'bottom:32px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(10,10,10,0.92)',
      'border:0.5px solid rgba(255,255,255,0.15)',
      'color:rgba(255,255,255,0.75)',
      'font-size:12px',
      'letter-spacing:0.12em',
      'padding:14px 24px',
      'z-index:999',
      'pointer-events:none',
      'transition:opacity 0.4s ease',
      'white-space:nowrap',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = 'Open on your phone to view this work in your space';
  el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.opacity = '0'; }, 3200);
}

function showARLoading(show) {
  let el = document.getElementById('ar-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ar-loading';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:999;font-size:13px;letter-spacing:0.15em;color:rgba(255,255,255,0.7);text-transform:uppercase;';
    el.textContent = 'Preparing AR…';
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
}