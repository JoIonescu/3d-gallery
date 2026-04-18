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

  if (isIOS()) {
    // iOS AR Quick Look requires a .usdz file served from a real URL
    // Best approach: link to a pre-generated .usdz in /public/ar/
    // If it doesn't exist yet, show a friendly message
    const usdzPath = `/ar/${painting.id}.usdz`;
    const anchor   = document.createElement('a');
    anchor.setAttribute('rel', 'ar');
    anchor.href = usdzPath;

    // AR Quick Look is triggered by clicking an <a rel="ar"> with a child <img>
    const img = document.createElement('img');
    img.src   = painting.image;
    img.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
    anchor.appendChild(img);
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => document.body.removeChild(anchor), 500);

  } else if (isAndroid()) {
    // Android Scene Viewer — needs a publicly accessible .glb URL
    // For local dev, we generate it on the fly
    try {
      showARLoading(true);
      const blob   = await buildPaintingGLB(painting);
      const url    = URL.createObjectURL(blob);
      const intent = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred&title=${encodeURIComponent(painting.title)}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;end;`;
      window.location.href = intent;
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      alert('AR is not available on this device or browser.');
    } finally {
      showARLoading(false);
    }
  } else {
    alert('AR is available on iOS Safari and Android Chrome.');
  }
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