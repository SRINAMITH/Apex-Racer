export class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  engineOsc: OscillatorNode | null = null;
  engineGain: GainNode | null = null;
  bgmOsc: OscillatorNode | null = null;
  bgmGain: GainNode | null = null;
  isPlaying = false;
  volume = 0.5;

  init() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this.volume;
    } catch (e) {
      console.warn("Audio not supported");
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }
  }

  startEngine(isBike: boolean) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineOsc.type = isBike ? 'square' : 'sawtooth';
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.masterGain!);
    this.engineGain.gain.value = 0;
    this.engineOsc.start();

    // Background drone
    if (!this.bgmOsc) {
      this.bgmOsc = this.ctx.createOscillator();
      this.bgmGain = this.ctx.createGain();
      this.bgmOsc.type = 'sine';
      this.bgmOsc.frequency.value = 55; // Low A
      this.bgmOsc.connect(this.bgmGain);
      this.bgmGain.connect(this.masterGain!);
      this.bgmGain.gain.value = 0.1;
      this.bgmOsc.start();
    } else if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(0.1, this.ctx.currentTime, 0.1);
    }

    this.isPlaying = true;
  }

  updateEngine(speed: number, maxSpeed: number, isBike: boolean) {
    if (!this.isPlaying || !this.ctx || !this.engineOsc || !this.engineGain) return;
    const ratio = Math.abs(speed) / maxSpeed;
    const baseFreq = isBike ? 100 : 60;
    const freqMult = isBike ? 300 : 200;
    const freq = baseFreq + ratio * freqMult;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(0.05 + ratio * 0.1, this.ctx.currentTime, 0.1);
  }

  stopEngine() {
    if (!this.isPlaying || !this.ctx || !this.engineGain) return;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    this.isPlaying = false;
  }

  playCrash() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
    if (navigator.vibrate) navigator.vibrate(200);
  }

  playNitro() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 1);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }
}
