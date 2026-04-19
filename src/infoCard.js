import { PROXIMITY_DIST } from './config.js';
import { openAR, isMobile } from './ar.js';

export class InfoCard {
  constructor(player) {
    this.player            = player;
    this.current           = null;
    this.pendingPainting   = null;
    this.hoverTimer        = 0;
    this.HOVER_DELAY       = 0.4;
    this._activeZoomTarget = null;
    this._dismissed        = false; // true after Close — prevents immediate reopen
    this._dismissedId      = null;  // which painting was dismissed

    this.card     = document.getElementById('info-card');
    this.titleEl  = document.getElementById('ic-title');
    this.yearEl   = document.getElementById('ic-year');
    this.metaEl   = document.getElementById('ic-meta');
    this.descEl   = document.getElementById('ic-desc');
    this.zoomBtn  = document.getElementById('ic-zoom');
    this.closeBtn = document.getElementById('ic-close');
    this.arBtn     = document.getElementById('ic-ar');
    this.enquireBtn = document.getElementById('ic-enquire');

    this.closeBtn.addEventListener('click', () => this._onClose());
    this.zoomBtn.addEventListener('click', () => {
      if (this._activeZoomTarget) {
        this.player.zoomTo(
          this._activeZoomTarget.viewPos,
          this._activeZoomTarget.viewTarget
        );
      }
    });

    if (this.arBtn) {
      this.arBtn.style.display = 'block';
      this.arBtn.addEventListener('click', () => {
        if (this.current) openAR(this.current);
      });
    }
  }

  _onClose() {
    // Remember which painting was dismissed so it doesn't reopen immediately
    this._dismissed  = true;
    this._dismissedId = this.current?.id ?? null;
    this.hide();
  }

  update(nearestObj, dt) {
    if (this.player.isZoomed) { this.hide(); return; }

    if (!nearestObj) {
      // Player walked away — reset dismissed state so card shows next time
      this.pendingPainting = null;
      this.hoverTimer      = 0;
      this._dismissed      = false;
      this._dismissedId    = null;
      if (this.current) this.hide();
      return;
    }

    // If this painting was dismissed, don't show again until player walks away
    if (this._dismissed && nearestObj.painting.id === this._dismissedId) return;

    // Different painting approached — reset dismissed
    if (nearestObj.painting.id !== this._dismissedId) {
      this._dismissed   = false;
      this._dismissedId = null;
    }

    if (nearestObj.painting.id === this.current?.id) return;

    if (nearestObj.painting.id === this.pendingPainting?.id) {
      this.hoverTimer += dt;
      if (this.hoverTimer >= this.HOVER_DELAY) this._show(nearestObj);
    } else {
      this.pendingPainting   = nearestObj.painting;
      this._activeZoomTarget = nearestObj;
      this.hoverTimer        = 0;
      if (this.current) this.hide();
    }
  }

  _show(obj) {
    const p = obj.painting;
    this.current           = p;
    this._activeZoomTarget = obj;

    this.titleEl.textContent = p.title;
    this.yearEl.textContent  = p.year;
    this.metaEl.innerHTML    = `${p.medium}<br>${p.dimensions}`;
    this.descEl.textContent  = p.description;

    // Show enquire button if painting has a contact link
    if (this.enquireBtn) {
      if (p.enquire) {
        this.enquireBtn.href = p.enquire;
        this.enquireBtn.style.display = 'block';
      } else {
        this.enquireBtn.style.display = 'none';
      }
    }

    this.card.classList.add('visible');
  }

  hide() {
    this.current = null;
    this.card.classList.remove('visible');
  }
}

export function findNearest(paintingObjects, cameraPos) {
  let nearest = null;
  let minDist = PROXIMITY_DIST;
  for (const obj of paintingObjects) {
    const d = cameraPos.distanceTo(obj.mesh.position);
    if (d < minDist) { nearest = obj; minDist = d; }
  }
  return nearest;
}