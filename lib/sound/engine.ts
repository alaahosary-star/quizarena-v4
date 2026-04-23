'use client';

/**
 * محرك الصوت الكامل — مبني على Web Audio API
 * لا يحتاج أي ملفات صوتية خارجية
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public volume = 1;

  private init(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  private tone(freq: number, dur = 0.15, type: OscillatorType = 'sine', vol = 0.2) {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol * this.volume;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  click() { this.tone(800, 0.06, 'square', 0.12); }
  select() { this.tone(600, 0.1, 'sine', 0.15); }
  tick() { this.tone(1200, 0.05, 'square', 0.1); }

  correct() {
    this.tone(523.25, 0.12, 'sine', 0.22);
    setTimeout(() => this.tone(659.25, 0.12, 'sine', 0.22), 120);
    setTimeout(() => this.tone(783.99, 0.2, 'sine', 0.25), 240);
  }

  wrong() {
    this.tone(220, 0.15, 'sawtooth', 0.18);
    setTimeout(() => this.tone(180, 0.25, 'sawtooth', 0.18), 150);
  }

  winner() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.18, 'triangle', 0.25), i * 140));
  }

  join() {
    this.tone(440, 0.08, 'sine', 0.15);
    setTimeout(() => this.tone(554, 0.08, 'sine', 0.15), 80);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
  }
}

export const sfx = new SoundEngine();
