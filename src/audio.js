// Music player using Web Audio API + ArrayBuffer
// This prevents iOS/Android from showing a media player on the lock screen
// The OS only intercepts HTMLAudioElement — Web Audio is invisible to it

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

    document.getElementById('audio-btn').addEventListener('click', () => this.toggle());
  }

  async start() {
    if (this.started) return;
    this.started = true;

    try {
      this.ctx      = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.55;
      this.gainNode.connect(this.ctx.destination);

      if (this.ctx.state === 'suspended') await this.ctx.resume();

      // Preload both tracks as ArrayBuffers — OS never sees these as media
      for (const track of this.tracks) {
        const response = await fetch(track);
        const arrayBuf = await response.arrayBuffer();
        const decoded  = await this.ctx.decodeAudioData(arrayBuf);
        this.buffers.push(decoded);
      }

      this._playBuffer(0);
    } catch(e) {
      console.warn('Audio failed:', e);
    }
  }

  _playBuffer(index) {
    if (!this.ctx || this.buffers.length === 0) return;
    this.current = index % this.buffers.length;

    if (this.source) {
      try { this.source.disconnect(); } catch(e) {}
    }

    const source  = this.ctx.createBufferSource();
    source.buffer = this.buffers[this.current];
    source.connect(this.gainNode);
    source.start(0);
    source.onended = () => this._playBuffer(this.current + 1);
    this.source = source;

    document.getElementById('audio-btn').textContent = this.muted ? '♪' : '♫';
  }

  toggle() {
    const btn = document.getElementById('audio-btn');
    if (!this.started) { this.start(); return; }

    this.muted = !this.muted;
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(
        this.muted ? 0 : 0.55,
        this.ctx.currentTime + 0.6
      );
    }
    btn.classList.toggle('muted', this.muted);
    btn.textContent = this.muted ? '♪' : '♫';
  }
}