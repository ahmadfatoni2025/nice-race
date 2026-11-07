// Synthesized procedural audio using Web Audio API (PRD 13)
// Lightweight, zero network bandwidth, zero external assets required.

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private driftNoise: AudioNode | null = null;
  private driftGain: GainNode | null = null;

  public masterVolume = 0.8;
  public sfxVolume = 0.8;
  public muted = false;

  private initCtx() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.initEngineSound();
  }

  private initEngineSound() {
    if (!this.ctx || !this.masterGain) return;
    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 40;

      // Filter to shape raw sawtooth into engine rumble
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public resume() {
    if (!this.ctx) {
      this.initCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateEngine(speedKmh: number, isNitro: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const norm = Math.min(1.5, Math.max(0, speedKmh / 160));
    const targetFreq = 45 + norm * 150 + (isNitro ? 40 : 0);
    const targetVol = this.muted ? 0 : Math.min(0.25, 0.04 + norm * 0.16);

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.05);
  }

  public stopEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  public playDrift(active: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    if (active) {
      if (!this.driftGain) {
        // Synthesize white noise buffer
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 3;

        this.driftGain = this.ctx.createGain();
        this.driftGain.gain.value = 0.08;

        noise.connect(filter);
        filter.connect(this.driftGain);
        this.driftGain.connect(this.sfxGain);
        noise.start();
        this.driftNoise = noise;
      } else {
        this.driftGain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.05);
      }
    } else if (this.driftGain) {
      this.driftGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  public playNitro() {
    this.playTone(320, 720, 0.6, 'sine', 0.3);
  }

  public playShield() {
    this.playTone(200, 600, 0.4, 'triangle', 0.25);
  }

  public playShockwave() {
    this.playTone(150, 60, 0.5, 'sawtooth', 0.4);
  }

  public playMineDrop() {
    this.playTone(600, 200, 0.2, 'sine', 0.2);
  }

  public playMineHit() {
    this.playTone(120, 40, 0.6, 'sawtooth', 0.5);
  }

  public playPickup() {
    this.playArpeggio([440, 554, 659, 880], 0.06);
  }

  public playCheckpoint() {
    this.playArpeggio([523, 659, 784], 0.08);
  }

  public playLap() {
    this.playArpeggio([523, 659, 784, 1046], 0.09);
  }

  public playCountdownBeep(high = false) {
    this.playTone(high ? 880 : 440, high ? 880 : 440, 0.18, 'sine', 0.3);
  }

  public playFinish() {
    this.playArpeggio([523, 659, 784, 1046, 1318], 0.12);
  }

  private playTone(startFreq: number, endFreq: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio playback catch
    }
  }

  private playArpeggio(freqs: number[], noteDuration: number) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    freqs.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq, noteDuration * 1.5, 'sine', 0.22);
      }, idx * noteDuration * 1000);
    });
  }

  public setMute(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }
}

export const sounds = new SoundManager();

