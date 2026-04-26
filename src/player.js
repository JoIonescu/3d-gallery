import * as THREE from 'three';
import { MOVE_ZONES } from './config.js';

// ── Street View style navigation ─────────────────────────────────────────────
// Desktop: drag to look, click floor to move, scroll to move forward
// Mobile:  swipe to look, tap floor to move

export class Player {
  constructor(camera) {
    this.camera   = camera;
    this.euler    = new THREE.Euler(0, 0, 0, 'YXZ');
    this.isLocked = false;
    this.locked   = false; // true during intro animation

    // Smooth walk-to target
    this._walkTarget  = null;  // Vector3 destination
    this._walkOrigin  = null;
    this._walkProgress = 0;
    this._walkDuration = 0;

    // Scroll forward
    this._scrollVel = 0;

    // Zoom state (for view detail)
    this.isZoomed       = false;
    this.zoomPhase      = null;
    this.zoomProgress   = 0;
    this.zoomTarget     = null;
    this.zoomOriginPos  = new THREE.Vector3();
    this.zoomOriginQuat = new THREE.Quaternion();
    this.zoomReturnPos  = new THREE.Vector3();
    this.zoomReturnQuat = new THREE.Quaternion();

    this._initPointerLock();
    this._initMouseDrag();
    this._initScroll();
    this._initTouchLook();
  }

  // ── Pointer lock (desktop click-drag) ────────────────────────────────────
  _initPointerLock() {
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = !!document.pointerLockElement;
      document.getElementById('crosshair').classList.toggle('show', this.isLocked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || this.isZoomed || this.locked) return;
      this._applyMouseDelta(e.movementX, e.movementY);
    });
  }

  // ── Mouse drag fallback (no pointer lock needed) ─────────────────────────
  _initMouseDrag() {
    const canvas = document.getElementById('canvas');
    let dragging = false, lastX = 0, lastY = 0, moved = false;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragging = true; moved = false;
      lastX = e.clientX; lastY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!dragging || this.isZoomed || this.locked) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      this._applyMouseDelta(dx * 1.0, dy * 1.0);
      lastX = e.clientX; lastY = e.clientY;
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      dragging = false;
    });

    canvas.addEventListener('mouseleave', () => { dragging = false; });

    // Store moved flag for click detection in main.js
    canvas.addEventListener('click', () => {
      this._lastClickWasDrag = moved;
    });
  }

  _applyMouseDelta(dx, dy) {
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= dx * 0.003;
    this.euler.x -= dy * 0.003;
    this.euler.x  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  // ── Scroll wheel — move forward/backward ─────────────────────────────────
  _initScroll() {
    window.addEventListener('wheel', (e) => {
      if (this.isZoomed || this.locked) return;
      // Positive delta = scroll down = move forward
      this._scrollVel += e.deltaY * 0.004;
      this._scrollVel  = Math.max(-8, Math.min(8, this._scrollVel));
    }, { passive: true });
  }

  // ── Touch look (swipe anywhere to look) ──────────────────────────────────
  _initTouchLook() {
    const canvas = document.getElementById('canvas');
    let lastTouch = null;
    let touchMoved = false;

    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        lastTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
        touchMoved = false;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!lastTouch || this.isZoomed || this.locked) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== lastTouch.id) continue;
        const dx = t.clientX - lastTouch.x;
        const dy = t.clientY - lastTouch.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) touchMoved = true;
        this._applyMouseDelta(dx * 1.0, dy * 1.0);
        lastTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lastTouch?.id) {
          this._lastTouchWasSwipe = touchMoved;
          lastTouch = null;
        }
      }
    }, { passive: true });
  }

  // ── Walk to point ─────────────────────────────────────────────────────────
  walkTo(targetPos) {
    if (this.locked || this.isZoomed) return;

    // Clamp target to valid zone
    if (!this._canMoveTo(targetPos.x, targetPos.z)) return;

    const dist = this.camera.position.distanceTo(targetPos);
    if (dist < 0.3) return;

    this._walkOrigin   = this.camera.position.clone();
    this._walkTarget   = targetPos.clone();
    this._walkTarget.y = 1.7;
    this._walkProgress = 0;
    // Speed: ~4m/s — matches Street View feel
    this._walkDuration = Math.min(dist / 4.0, 2.5);
  }

  // ── Zoom (view detail) ────────────────────────────────────────────────────
  zoomTo(pos, lookAt) {
    this.isZoomed     = true;
    this.zoomPhase    = 'in';
    this.zoomProgress = 0;
    this.zoomTarget   = { pos: pos.clone(), lookAt: lookAt.clone() };
    this.zoomOriginPos.copy(this.camera.position);
    this.zoomOriginQuat.copy(this.camera.quaternion);
    document.getElementById('info-card').classList.remove('visible');
    document.getElementById('zoom-hint').classList.add('show');
    const mBtn = document.getElementById('zoom-exit-mobile');
    if (mBtn) mBtn.classList.add('show');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  exitZoom() {
    if (!this.isZoomed) return;
    this.zoomPhase    = 'out';
    this.zoomProgress = 0;
    this.zoomReturnPos.copy(this.camera.position);
    this.zoomReturnQuat.copy(this.camera.quaternion);
    document.getElementById('zoom-hint').classList.remove('show');
    const mBtn = document.getElementById('zoom-exit-mobile');
    if (mBtn) mBtn.classList.remove('show');
  }

  // ── Collision ─────────────────────────────────────────────────────────────
  _canMoveTo(x, z) {
    return MOVE_ZONES.some(zn =>
      x > zn.xMin && x < zn.xMax &&
      z > zn.zMin && z < zn.zMax
    );
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(dt) {
    if (this.locked) return;

    if (this.isZoomed) {
      this._updateZoom(dt);
      return;
    }

    // Scroll forward
    if (Math.abs(this._scrollVel) > 0.01) {
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();

      const step    = this._scrollVel * dt * 18;
      const newX    = this.camera.position.x + fwd.x * step;
      const newZ    = this.camera.position.z + fwd.z * step;

      if (this._canMoveTo(newX, newZ)) {
        this.camera.position.x = newX;
        this.camera.position.z = newZ;
      } else if (this._canMoveTo(newX, this.camera.position.z)) {
        this.camera.position.x = newX;
      } else if (this._canMoveTo(this.camera.position.x, newZ)) {
        this.camera.position.z = newZ;
      }

      this._scrollVel *= 0.88; // friction
      if (Math.abs(this._scrollVel) < 0.01) this._scrollVel = 0;
    }

    // Walk-to animation
    if (this._walkTarget) {
      this._walkProgress = Math.min(1, this._walkProgress + dt / this._walkDuration);
      const t = cubicEaseInOut(this._walkProgress);

      this.camera.position.lerpVectors(this._walkOrigin, this._walkTarget, t);

      if (this._walkProgress >= 1) {
        this._walkTarget = null;
      }
    }
  }

  _updateZoom(dt) {
    if (this.zoomPhase === 'in') {
      this.zoomProgress = Math.min(1, this.zoomProgress + dt * 1.1);
      const t = cubicEaseInOut(this.zoomProgress);
      this.camera.position.lerpVectors(this.zoomOriginPos, this.zoomTarget.pos, t);
      const lookQuat = new THREE.Quaternion();
      const m = new THREE.Matrix4();
      m.lookAt(this.zoomTarget.pos, this.zoomTarget.lookAt, new THREE.Vector3(0,1,0));
      lookQuat.setFromRotationMatrix(m);
      this.camera.quaternion.slerp(lookQuat, Math.min(1, t * 1.4));

    } else if (this.zoomPhase === 'out') {
      this.zoomProgress = Math.min(1, this.zoomProgress + dt * 1.1);
      const t = cubicEaseInOut(this.zoomProgress);
      this.camera.position.lerpVectors(this.zoomReturnPos, this.zoomOriginPos, t);
      this.camera.quaternion.slerp(this.zoomOriginQuat, t);

      if (this.zoomProgress >= 1) {
        this.isZoomed  = false;
        this.zoomPhase = null;
        this.zoomTarget = null;
        document.documentElement.requestPointerLock().catch(() => {});
      }
    }
  }
}

function cubicEaseInOut(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}