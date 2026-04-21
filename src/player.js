import * as THREE from 'three';
import nipplejs from 'nipplejs';
import { MOVE_ZONES, PLAYER_SPEED } from './config.js';

export class Player {
  constructor(camera) {
    this.camera = camera;

    // Movement state
    this.locked = false; // true during intro animation
    this.keys    = { fwd: false, back: false, left: false, right: false };
    this.joystick = { x: 0, y: 0 };
    this.velocity = new THREE.Vector3();
    this.moveDir  = new THREE.Vector3();

    // Look state (for non-pointer-lock fallback and mobile)
    this.euler    = new THREE.Euler(0, 0, 0, 'YXZ');
    this.isLocked = false;

    // Zoom state
    this.isZoomed = false;
    this.zoomTarget = null;  // { pos: Vector3, lookAt: Vector3 }
    this.zoomProgress = 0;
    this.zoomOriginPos = new THREE.Vector3();
    this.zoomOriginQuat = new THREE.Quaternion();

    this._initPointerLock();
    this._initKeyboard();
    this._initNavButtons();
    this._initMobileJoystick();
    this._initTouchLook();
  }

  // ── Pointer lock ──────────────────────────────────────────────────────────

  _initPointerLock() {
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('click', () => {
      if (!this.isZoomed && !this.isLocked) {
        document.documentElement.requestPointerLock();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = !!document.pointerLockElement;
      document.getElementById('crosshair').classList.toggle('show', this.isLocked);
    });
    document.addEventListener('mousemove', (e) => this._onMouseMove(e));
  }

  _onMouseMove(e) {
    if (!this.isLocked || this.isZoomed) return;
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= e.movementX * 0.0022;
    this.euler.x -= e.movementY * 0.0022;
    this.euler.x  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  _initKeyboard() {
    const map = {
      KeyW: 'fwd', ArrowUp: 'fwd',
      KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
    };
    document.addEventListener('keydown', (e) => {
      if (map[e.code]) this.keys[map[e.code]] = true;
      if (e.code === 'Escape' && this.isZoomed) this.exitZoom();
    });
    document.addEventListener('keyup', (e) => {
      if (map[e.code]) this.keys[map[e.code]] = false;
    });
  }

  // ── Nav arrow buttons (desktop non-pointer-lock) ──────────────────────────

  _initNavButtons() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const dir = btn.dataset.dir;
      const keyMap = { fwd: 'fwd', back: 'back', left: 'left', right: 'right' };
      const key = keyMap[dir];

      const press   = () => { this.keys[key] = true;  btn.classList.add('pressed'); };
      const release = () => { this.keys[key] = false; btn.classList.remove('pressed'); };

      btn.addEventListener('touchstart',  (e) => { e.preventDefault(); press();   }, { passive: false });
      btn.addEventListener('touchend',    (e) => { e.preventDefault(); release(); }, { passive: false });
      btn.addEventListener('touchcancel', (e) => { e.preventDefault(); release(); }, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup',   release);
      btn.addEventListener('mouseleave', release);
    });
  }

  // ── Mobile joystick ───────────────────────────────────────────────────────

  _initMobileJoystick() {
    // Only on iOS — Android uses touch-look (swipe left side)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (!isIOS) return;

    const zone = document.getElementById('joystick-zone');
    if (!zone) return;

    const manager = nipplejs.create({
      zone: zone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      size: 96,
      color: 'rgba(255,255,255,0.28)',
    });
    manager.on('move', (_, data) => {
      if (!data.vector) return;
      this.joystick.x =  data.vector.x;
      this.joystick.y = -data.vector.y;
    });
    manager.on('end', () => { this.joystick.x = 0; this.joystick.y = 0; });
  }

  // ── Touch look (right half of screen) ────────────────────────────────────

  _initTouchLook() {
    const canvas = document.getElementById('canvas');
    const jsZone = document.getElementById('joystick-zone').getBoundingClientRect();
    let lastTouch = null;

    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.65) {
          lastTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!lastTouch || this.isZoomed) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== lastTouch.id) continue;
        const dx = t.clientX - lastTouch.x;
        const dy = t.clientY - lastTouch.y;
        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= dx * 0.003;
        this.euler.x -= dy * 0.003;
        this.euler.x  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.euler.x));
        this.camera.quaternion.setFromEuler(this.euler);
        lastTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lastTouch?.id) lastTouch = null;
      }
    }, { passive: true });
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  zoomTo(pos, lookAt) {
    this.isZoomed      = true;
    this.zoomProgress  = 0;
    this.zoomPhase     = 'in';   // 'in' | 'out'
    this.zoomTarget    = { pos: pos.clone(), lookAt: lookAt.clone() };
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
    // Animate back out instead of snapping
    this.zoomPhase    = 'out';
    this.zoomProgress = 0;
    this.zoomReturnPos  = this.camera.position.clone();
    this.zoomReturnQuat = this.camera.quaternion.clone();
    document.getElementById('zoom-hint').classList.remove('show');
    const mBtnOut = document.getElementById('zoom-exit-mobile');
    if (mBtnOut) mBtnOut.classList.remove('show');
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

    // Resolve movement input
    const kx = (this.keys.right ? 1 : 0) - (this.keys.left  ? 1 : 0);
    const kz = (this.keys.fwd   ? 1 : 0) - (this.keys.back  ? 1 : 0);

    // Joystick: X=strafe left/right, Y=forward/back (up=forward)
    const jx =  this.joystick.x;
    const jz = -this.joystick.y; // nipple up = positive y = move forward

    const mx = kx + jx;
    const mz = kz + jz;

    if (Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01) {
      const speed = PLAYER_SPEED * Math.min(Math.hypot(mx, mz), 1);

      this.camera.getWorldDirection(this.moveDir);
      this.moveDir.y = 0;
      this.moveDir.normalize();

      const right = new THREE.Vector3().crossVectors(this.moveDir, new THREE.Vector3(0, 1, 0));

      const desiredX = this.camera.position.x + (this.moveDir.x * mz + right.x * mx) * speed * dt;
      const desiredZ = this.camera.position.z + (this.moveDir.z * mz + right.z * mx) * speed * dt;

      if (this._canMoveTo(desiredX, desiredZ)) {
        this.camera.position.x = desiredX;
        this.camera.position.z = desiredZ;
      } else if (this._canMoveTo(desiredX, this.camera.position.z)) {
        this.camera.position.x = desiredX;
      } else if (this._canMoveTo(this.camera.position.x, desiredZ)) {
        this.camera.position.z = desiredZ;
      }
    }
  }

  _updateZoom(dt) {
    if (this.zoomPhase === 'in') {
      if (!this.zoomTarget) return;
      this.zoomProgress = Math.min(1, this.zoomProgress + dt * 0.85);
      const t = cubicEaseInOut(this.zoomProgress);

      this.camera.position.lerpVectors(this.zoomOriginPos, this.zoomTarget.pos, t);



      // Look at painting centre
      const lookQuat = new THREE.Quaternion();
      const m = new THREE.Matrix4();
      m.lookAt(
        this.zoomTarget.pos,
        this.zoomTarget.lookAt,
        new THREE.Vector3(0, 1, 0)
      );
      lookQuat.setFromRotationMatrix(m);
      this.camera.quaternion.slerp(lookQuat, Math.min(1, t * 1.4));

    } else if (this.zoomPhase === 'out') {
      this.zoomProgress = Math.min(1, this.zoomProgress + dt * 0.85);
      const t = cubicEaseInOut(this.zoomProgress);

      this.camera.position.lerpVectors(this.zoomReturnPos, this.zoomOriginPos, t);
      this.camera.quaternion.slerp(this.zoomOriginQuat, t);



      if (this.zoomProgress >= 1) {

        this.isZoomed   = false;
        this.zoomPhase  = null;
        this.zoomTarget = null;
        document.documentElement.requestPointerLock().catch(() => {});
      }
    }
  }
}

function _setVignette(alpha) {
  let el = document.getElementById('zoom-vignette');
  if (!el) {
    el = document.createElement('div');
    el.id = 'zoom-vignette';
    el.style.cssText = [
      'position:fixed', 'inset:0',
      'background:rgba(0,0,0,0)',
      'pointer-events:none',
      'z-index:49',
      'transition:background 0.1s',
    ].join(';');
    document.body.appendChild(el);
  }
  el.style.background = `rgba(0,0,0,${alpha.toFixed(3)})`;
}

function cubicEaseInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}