import { PROXIMITY_DIST } from './config.js';
import { openAR, isMobile } from './ar.js';

export class InfoCard {
  constructor(player) {
    this.player          = player;
    this.current         = null;
    this.pendingPainting = null;
    this.hoverTimer      = 0;
    this.HOVER_DELAY     = 0.4;
    this._activeZoomTarget = null;

    this.card    = document.getElementById('info-card');
    this.titleEl = document.getElementById('ic-title');
    this.yearEl  = document.getElementById('ic-year');
    this.metaEl  = document.getElementById('ic-meta');
    this.descEl  = document.getElementById('ic-desc');
    this.zoomBtn = document.getElementById('ic-zoom');
    this.closeBtn= document.getElementById('ic-close');
    this.arBtn   = document.getElementById('ic-ar');

    this.closeBtn.addEventListener('click', () => this.hide());
    this.zoomBtn.addEventListener('click',  () => {
      if (this._activeZoomTarget) {
        this.player.zoomTo(
          this._activeZoomTarget.viewPos,
          this._activeZoomTarget.viewTarget
        );
      }
    });

    // Show AR button only on mobile
    if (this.arBtn) {
      if (isMobile()) {
        this.arBtn.style.display = 'block';
        this.arBtn.addEventListener('click', () => {
          if (this.current) openAR(this.current);
        });
      } else {
        this.arBtn.style.display = 'none';
      }
    }
  }

  update(nearestObj, dt) {
    if (this.player.isZoomed) { this.hide(); return; }

    if (!nearestObj) {
      this.pendingPainting = null;
      this.hoverTimer = 0;
      if (this.current) this.hide();
      return;
    }

    if (nearestObj.painting.id === this.current?.id) return;

    if (nearestObj.painting.id === this.pendingPainting?.id) {
      this.hoverTimer += dt;
      if (this.hoverTimer >= this.HOVER_DELAY) this._show(nearestObj);
    } else {
      this.pendingPainting   = nearestObj.painting;
      this._activeZoomTarget = nearestObj;
      this.hoverTimer = 0;
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