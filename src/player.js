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
    if (window.matchMedia('(pointer: coarse)').matches) {
      const manager = nipplejs.create({
        zone: document.getElementById('joystick-zone'),
        mode: 'static',
        position: { left: '55px', top: '55px' },
        size: 100,
        color: 'rgba(255,255,255,0.3)',
      });
      manager.on('move', (_, data) => {
        if (!data.vector) return;
        this.joystick.x =  data.vector.x;
        this.joystick.y = -data.vector.y;
      });
      manager.on('end', () => { this.joystick.x = 0; this.joystick.y = 0; });
    }
  }

  // ── Touch look (right half of screen) ────────────────────────────────────

  _initTouchLook() {
    const canvas = document.getElementById('canvas');
    const jsZone = document.getElementById('joystick-zone').getBoundingClientRect();
    let lastTouch = null;

    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX > window.innerWidth * 0.4) {
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
    this.isZoomed = true;
    this.zoomProgress = 0;
    this.zoomTarget = { pos: pos.clone(), lookAt: lookAt.clone() };
    this.zoomOriginPos.copy(this.camera.position);
    this.zoomOriginQuat.copy(this.camera.quaternion);
    document.getElementById('info-card').classList.remove('visible');
    document.getElementById('zoom-hint').classList.add('show');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  exitZoom() {
    this.isZoomed = false;
    this.zoomTarget = null;
    document.getElementById('zoom-hint').classList.remove('show');
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
    const jx = this.joystick.x;
    const jz = -this.joystick.y;  // nipple forward = negative
    const mx = kx + jx;
    const mz = kz + jz;

    if (Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01) {
      const speed = PLAYER_SPEED * Math.min(Math.hypot(mx, mz), 1);

      // Forward direction from camera (flat, no Y component)
      this.camera.getWorldDirection(this.moveDir);
      this.moveDir.y = 0;
      this.moveDir.normalize();

      const right = new THREE.Vector3().crossVectors(this.moveDir, new THREE.Vector3(0, 1, 0));

      const desiredX = this.camera.position.x + (this.moveDir.x * mz + right.x * mx) * speed * dt;
      const desiredZ = this.camera.position.z + (this.moveDir.z * mz + right.z * mx) * speed * dt;

      // Slide collision: try full move, then axis-only
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
    if (!this.zoomTarget) return;
    this.zoomProgress = Math.min(1, this.zoomProgress + dt * 1.6);
    const t = smoothStep(this.zoomProgress);

    this.camera.position.lerpVectors(this.zoomOriginPos, this.zoomTarget.pos, t);

    // Smoothly look at painting
    const lookQuat = new THREE.Quaternion();
    const m = new THREE.Matrix4();
    m.lookAt(this.zoomTarget.pos, this.zoomTarget.lookAt, new THREE.Vector3(0, 1, 0));
    lookQuat.setFromRotationMatrix(m);
    this.camera.quaternion.slerp(lookQuat, t);
  }
}

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}