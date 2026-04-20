import * as THREE from 'three';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

export function isMobile() {
  return isIOS() || isAndroid();
}

export function openAR(painting) {
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

  // Navigate immediately — do NOT await anything before navigating
  // iOS Safari blocks navigation after async operations
  if (isIOS()) {
    const usdzUrl    = `${window.location.origin}/ar/${id}.usdz`;
    const viewerUrl  = `/ar-viewer.html?model=${encodeURIComponent(glbUrl)}&title=${encodeURIComponent(painting.title)}`;

    // Try native AR Quick Look first (needs .usdz)
    // If no .usdz, go straight to model-viewer
    const a = document.createElement('a');
    a.setAttribute('rel', 'ar');
    a.href = usdzUrl;
    const img = document.createElement('img');
    img.src = painting.image;
    img.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0';
    a.appendChild(img);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1000);

    // Fallback: if Quick Look doesn't open within 500ms, go to model-viewer
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.href = viewerUrl;
      }
    }, 500);
    return;
  }

  if (isAndroid()) {
    const viewerUrl = `/ar-viewer.html?model=${encodeURIComponent(glbUrl)}&title=${encodeURIComponent(painting.title)}`;
    window.location.href = viewerUrl;
  }
}

function showDesktopARMessage() {
  _toast('Open on your phone to view this work in your space');
}

function showToast(msg) {
  _toast(msg);
}

function _toast(msg) {
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