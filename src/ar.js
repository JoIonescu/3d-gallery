// AR — View in your space
// Uses model-viewer for both iOS Safari and Android
// No async before navigation — preserves user gesture on iOS

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
    _toast('Open on your phone to view this work in your space');
    return;
  }

  if (isIOS() && !isSafari()) {
    _toast('Open in Safari to use AR');
    return;
  }

  // Build the model-viewer URL — no async, navigate immediately
  const id        = String(painting.id + 1).padStart(2, '0');
  const glbUrl    = `${window.location.origin}/ar/${id}.glb`;
  const viewerUrl = `/ar-viewer.html?model=${encodeURIComponent(glbUrl)}&title=${encodeURIComponent(painting.title)}`;

  // Navigate directly — preserves user gesture, works on all mobile browsers
  window.location.href = viewerUrl;
}

function _toast(msg) {
  let el = document.getElementById('ar-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ar-toast';
    el.style.cssText = [
      'position:fixed','bottom:120px','left:50%',
      'transform:translateX(-50%)',
      'background:rgba(10,10,10,0.92)',
      'border:0.5px solid rgba(255,255,255,0.15)',
      'color:rgba(255,255,255,0.8)',
      'font-size:12px','letter-spacing:0.08em',
      'padding:13px 22px','z-index:999',
      'pointer-events:none',
      'opacity:0','transition:opacity 0.4s ease',
      'max-width:280px','line-height:1.5','text-align:center',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 3500);
}