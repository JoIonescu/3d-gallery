// Music via Web Audio API + ArrayBuffer (no lock screen player)
// Loading is non-blocking — starts preloading immediately, plays when ready

export class AudioManager {
  constructor() {
    this.tracks   = ['/chill1.mp3', '/chill2.mp3'];
    this.current  = 0;
    this.ctx      = null;
    this.source   = null;
    this.gainNode = null;
    this.started  = false;
    this.muted    = false;
    this.buffers  = [];
    this._ready   = false;

    document.getElementById('audio-btn').addEventListener('click', () => this.toggle());
  }

  // Non-blocking start — preloads in background, plays when done
  start() {
    if (this.started) return;
    this.started = true;

    try {
      this.ctx      = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0;
      this.gainNode.connect(this.ctx.destination);

      if (this.ctx.state === 'suspended') this.ctx.resume();

      // Load tracks in background — does not block UI
      this._loadAll();
    } catch(e) {
      console.warn('Audio init failed:', e);
    }
  }

  async _loadAll() {
    try {
      for (const track of this.tracks) {
        const res  = await fetch(track);
        const buf  = await res.arrayBuffer();
        const dec  = await this.ctx.decodeAudioData(buf);
        this.buffers.push(dec);
      }
      this._ready = true;
      this._playBuffer(0);
      // Fade in
      this.gainNode.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 2);
      document.getElementById('audio-btn').textContent = '♫';
    } catch(e) {
      console.warn('Audio load failed:', e);
    }
  }

  _playBuffer(index) {
    if (!this._ready || !this.ctx) return;
    this.current = index % this.buffers.length;

    if (this.source) {
      try { this.source.onended = null; this.source.disconnect(); } catch(e) {}
    }

    const src  = this.ctx.createBufferSource();
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
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(
        this.muted ? 0 : 0.55, this.ctx.currentTime + 0.6
      );
    }
    btn.classList.toggle('muted', this.muted);
    btn.textContent = this.muted ? '♪' : '♫';
  }
}