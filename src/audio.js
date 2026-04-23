// Platform-aware audio:
// iOS: HTMLAudioElement — plays even when silent switch is on
// Android/Desktop: Web Audio API — avoids OS lock screen media player

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isIOSSafari = isIOS && /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

export class AudioManager {
  constructor() {
    this.tracks  = ['/chill1.mp3', '/chill2.mp3'];
    this.current = 0;
    this.started = false;
    this.muted   = false;

    // iOS path
    this.audio   = null;

    // Web Audio path
    this.ctx      = null;
    this.gainNode = null;
    this.source   = null;
    this.buffers  = [];
    this._ready   = false;

    document.getElementById('audio-btn').addEventListener('click', () => this.toggle());
  }

  start() {
    if (this.started) return;
    this.started = true;

    if (isIOSSafari) {
      this._startIOS();
    } else {
      this._startWebAudio();
    }
  }

  // ── iOS: HTMLAudioElement ─────────────────────────────────────────────────
  _startIOS() {
    this._playTrackIOS(0);
  }

  _playTrackIOS(index) {
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
    }
    this.current = index % this.tracks.length;
    const a = new Audio(this.tracks[this.current]);
    this.audio = a;
    a.volume = this.muted ? 0 : 0.55;
    a.onended = () => this._playTrackIOS(this.current + 1);
    a.play().catch(e => console.warn('iOS audio play failed:', e));
    document.getElementById('audio-btn').textContent = this.muted ? '♪' : '♫';
  }

  // ── Web Audio: ArrayBuffer (no lock screen) ──────────────────────────────
  _startWebAudio() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0;
      this.gainNode.connect(this.ctx.destination);
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this._loadAll();
    } catch(e) {
      console.warn('Web Audio init failed:', e);
    }
  }

  async _loadAll() {
    try {
      for (const track of this.tracks) {
        const res = await fetch(track);
        const buf = await res.arrayBuffer();
        const dec = await this.ctx.decodeAudioData(buf);
        this.buffers.push(dec);
      }
      this._ready = true;
      this._playBuffer(0);
      this.gainNode.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 2);
      document.getElementById('audio-btn').textContent = this.muted ? '♪' : '♫';
    } catch(e) {
      console.warn('Web Audio load failed:', e);
    }
  }

  _playBuffer(index) {
    if (!this._ready || !this.ctx) return;
    this.current = index % this.buffers.length;
    if (this.source) {
      try { this.source.onended = null; this.source.disconnect(); } catch(e) {}
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[this.current];
    src.connect(this.gainNode);
    src.start(0);
    src.onended = () => this._playBuffer(this.current + 1);
    this.source = src;
  }

  toggle() {
    const btn = document.getElementById('audio-btn');
    if (!this.started) { this.start(); return; }

    this.muted = !this.muted;

    if (isIOSSafari && this.audio) {
      this.audio.volume = this.muted ? 0 : 0.55;
    } else if (this.gainNode && this.ctx) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(
        this.muted ? 0 : 0.55, this.ctx.currentTime + 0.6
      );
    }

    btn.classList.toggle('muted', this.muted);
    btn.textContent = this.muted ? '♪' : '♫';
  }
}