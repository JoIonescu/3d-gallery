// Music player — plays chill1.mp3 and chill2.mp3 back to back, loops forever

export class AudioManager {
  constructor() {
    this.tracks  = ['/chill1.mp3', '/chill2.mp3'];
    this.current = 0;
    this.audio   = null;
    this.started = false;
    this.muted   = false;

    document.getElementById('audio-btn').addEventListener('click', () => this.toggle());
  }

  start() {
    if (this.started) return;
    this.started = true;
    this._play(0);
  }

  _play(index) {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }

    this.current = index % this.tracks.length;
    const audio  = new Audio(this.tracks[this.current]);
    this.audio   = audio;

    audio.volume = this.muted ? 0 : 0.55;
    audio.preload = 'auto';

    // When track ends, play next one
    audio.addEventListener('ended', () => {
      this._play(this.current + 1);
    });

    audio.disableRemotePlayback = true;
    try { audio.remote.disableRemotePlayback(); } catch(e) {}

    audio.play().catch(e => {
      console.warn('Audio play failed:', e);
    });

    // Aggressively suppress OS media player on Android
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      const noOp = () => {};
      const actions = ['play','pause','stop','seekbackward','seekforward',
                       'seekto','previoustrack','nexttrack','skipad'];
      for (const action of actions) {
        try { navigator.mediaSession.setActionHandler(action, noOp); } catch(e) {}
      }
      // Override playback state after short delay
      setTimeout(() => {
        try { navigator.mediaSession.playbackState = 'none'; } catch(e) {}
      }, 500);
    }

    document.getElementById('audio-btn').textContent = this.muted ? '♪' : '♫';
  }

  toggle() {
    const btn = document.getElementById('audio-btn');
    if (!this.started) { this.start(); return; }

    this.muted = !this.muted;

    if (this.audio) {
      // Smooth fade
      const target = this.muted ? 0 : 0.55;
      this._fadeTo(target);
    }

    btn.classList.toggle('muted', this.muted);
    btn.textContent = this.muted ? '♪' : '♫';
  }

  _fadeTo(targetVol) {
    if (!this.audio) return;
    const step    = targetVol > this.audio.volume ? 0.03 : -0.03;
    const fade    = setInterval(() => {
      if (!this.audio) { clearInterval(fade); return; }
      const next = this.audio.volume + step;
      if ((step > 0 && next >= targetVol) || (step < 0 && next <= targetVol)) {
        this.audio.volume = Math.max(0, Math.min(1, targetVol));
        clearInterval(fade);
      } else {
        this.audio.volume = Math.max(0, Math.min(1, next));
      }
    }, 30);
  }
}