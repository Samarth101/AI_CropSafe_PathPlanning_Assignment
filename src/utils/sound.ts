class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.04, delay = 0) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio restrictions silently
    }
  }

  playStep() {
    this.playTone(420, 0.045, 'triangle', 0.025);
  }

  playAlert() {
    this.playTone(310, 0.12, 'sawtooth', 0.035, 0);
    this.playTone(460, 0.14, 'triangle', 0.04, 0.09);
  }

  playSuccess() {
    this.playTone(523.25, 0.12, 'triangle', 0.045, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.045, 0.09);
    this.playTone(783.99, 0.22, 'triangle', 0.05, 0.18);
  }

  playMissionClear() {
    this.playTone(587.33, 0.1, 'sine', 0.04, 0);
    this.playTone(880, 0.18, 'sine', 0.045, 0.08);
  }
}

export const soundFx = new SoundEngine();
