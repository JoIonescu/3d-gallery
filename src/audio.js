// Generative ambient music — warm jazz-influenced gallery soundtrack
// Walking bass line + soft piano plucks + pad + reverb
// All generated via Web Audio API, no files, no licensing

export class AudioManager {
  constructor() {
    this.ctx     = null;
    this.master  = null;
    this.started = false;
    this.muted   = false;
    this._seqTimer = null;
    document.getElementById('audio-btn').addEventListener('click', () => this.toggle());
  }

  start() {
    if (this.started) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => this._build());
      } else {
        this._build();
      }
    } catch(e) { console.warn('Audio init failed:', e); }
  }

  _build() {
    if (this.started) return;
    this.started = true;
    const { ctx } = this;

    // Master
    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.46, ctx.currentTime + 5);
    this.master.connect(ctx.destination);

    // Hall reverb
    const revBuf = ctx.createBuffer(2, ctx.sampleRate * 3.5, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = revBuf.getChannelData(c);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = revBuf;
    const revGain = ctx.createGain();
    revGain.gain.value = 0.48;
    this.reverb.connect(revGain);
    revGain.connect(this.master);

    // Warm pad — slow sine chord (Dm7: D F A C)
    this._buildPad([146.83, 174.61, 220.00, 261.63]);

    // Start sequencer — walking bass + piano plucks
    this._runSequencer();

    document.getElementById('audio-btn').textContent = '♫';
  }

  _buildPad(freqs) {
    const { ctx } = this;
    for (const freq of freqs) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const lpf  = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      lpf.type = 'lowpass';
      lpf.frequency.value = freq * 2.2;
      gain.gain.value = 0.055;

      // Very slow tremolo
      const lfo = ctx.createOscillator();
      const lg  = ctx.createGain();
      lfo.frequency.value = 0.025 + Math.random() * 0.03;
      lg.gain.value = 0.3;
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start();

      osc.connect(lpf); lpf.connect(gain);
      gain.connect(this.master);
      gain.connect(this.reverb);
      osc.start();
    }
  }

  // Piano-like pluck using a short sine burst with fast decay
  _pluck(freq, time, gainVal = 0.18, duration = 1.4) {
    const { ctx } = this;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    // Slight pitch drop — piano string characteristic
    osc.frequency.exponentialRampToValueAtTime(freq * 0.998, time + duration);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    // Add a harmonic for richness
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.01, time);
    gain2.gain.setValueAtTime(0, time);
    gain2.gain.linearRampToValueAtTime(gainVal * 0.3, time + 0.006);
    gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.6);

    osc.connect(gain);   gain.connect(this.master);  gain.connect(this.reverb);
    osc2.connect(gain2); gain2.connect(this.reverb);
    osc.start(time);  osc.stop(time + duration + 0.1);
    osc2.start(time); osc2.stop(time + duration * 0.7);
  }

  // Bass pluck — lower, shorter decay
  _bass(freq, time) {
    const { ctx } = this;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const lpf  = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.995, time + 0.8);

    lpf.type = 'lowpass';
    lpf.frequency.value = 400;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.28, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);

    osc.connect(lpf); lpf.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverb);
    osc.start(time); osc.stop(time + 1.0);
  }

  _runSequencer() {
    const { ctx } = this;
    // Dm7 jazz walking pattern — relaxed 60bpm feel
    // Notes: D2 F2 A2 C3 E3 G3 — gentle jazz voicings
    const BEAT = 1.8; // seconds per beat — slow, gallery pace

    // Bass walking line — loops every 8 beats
    const bassLine = [
      73.42,  // D2
      87.31,  // F2
      98.00,  // G2
      110.00, // A2
      87.31,  // F2
      73.42,  // D2
      82.41,  // E2
      77.78,  // Eb2 — chromatic passing note
    ];

    // Melody notes — sparse piano chords on beats 1 and 5
    // Dm9 voicing: D4 F4 A4 C5 E5
    const chordVoicings = [
      [293.66, 349.23, 440.00],        // D4 F4 A4
      [349.23, 440.00, 523.25],        // F4 A4 C5
      [293.66, 392.00, 493.88],        // D4 G4 B4
      [261.63, 349.23, 440.00],        // C4 F4 A4
    ];

    let beat = 0;
    let chordIdx = 0;

    const schedule = () => {
      if (!this.started || this.muted) {
        this._seqTimer = setTimeout(schedule, 500);
        return;
      }

      const now = ctx.currentTime + 0.05;

      // Bass note every beat
      this._bass(bassLine[beat % bassLine.length], now);

      // Piano chord every 4 beats, sparse
      if (beat % 4 === 0) {
        const chord = chordVoicings[chordIdx % chordVoicings.length];
        // Slightly arpeggiate — not all at once
        chord.forEach((freq, i) => {
          this._pluck(freq, now + i * 0.04, 0.10, 2.2);
        });
        chordIdx++;
      }

      // Occasional high melody note — sparse, tasteful
      if (beat % 8 === 3 || beat % 8 === 6) {
        const melodyNotes = [587.33, 659.25, 523.25, 622.25, 554.37];
        const note = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
        this._pluck(note, now + 0.1, 0.07, 1.8);
      }

      beat++;
      this._seqTimer = setTimeout(schedule, BEAT * 1000);
    };

    // Start after pad fades in
    this._seqTimer = setTimeout(schedule, 2000);
  }

  toggle() {
    const btn = document.getElementById('audio-btn');
    if (!this.started) { this.start(); return; }
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    this.muted = !this.muted;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(
      this.muted ? 0 : 0.46,
      this.ctx.currentTime + 0.8
    );
    btn.classList.toggle('muted', this.muted);
    btn.textContent = this.muted ? '♪' : '♫';
  }
}