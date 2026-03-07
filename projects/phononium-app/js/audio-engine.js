const PRESETS = {
  pureTone: {
    subGain: 0,
    detune: 0,
    filterType: 'lowpass',
    filterFrequency: 5200,
    filterQ: 0.4,
    lfoRate: 4,
    baseVibrato: 3,
    noise: 0,
    drone: false,
    response: 0.012
  },
  synthLead: {
    subGain: 0.3,
    detune: 7,
    filterType: 'lowpass',
    filterFrequency: 2300,
    filterQ: 2.4,
    lfoRate: 5.2,
    baseVibrato: 8,
    noise: 0,
    drone: false,
    response: 0.01
  },
  ambientPad: {
    subGain: 0.42,
    detune: -5,
    filterType: 'lowpass',
    filterFrequency: 1320,
    filterQ: 1.1,
    lfoRate: 4.3,
    baseVibrato: 6,
    noise: 0,
    drone: false,
    response: 0.028
  },
  fluteStyle: {
    subGain: 0.18,
    detune: 2,
    filterType: 'bandpass',
    filterFrequency: 1620,
    filterQ: 1.5,
    lfoRate: 5.6,
    baseVibrato: 9,
    noise: 0.03,
    drone: false,
    response: 0.014
  },
  tanpuraDrone: {
    subGain: 0.24,
    detune: 0,
    filterType: 'lowpass',
    filterFrequency: 1800,
    filterQ: 0.8,
    lfoRate: 4.5,
    baseVibrato: 4,
    noise: 0,
    drone: true,
    response: 0.018
  }
};

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function stopNode(node) {
  if (!node) return;
  try {
    if (typeof node.stop === 'function') node.stop();
  } catch (error) {}
  try {
    node.disconnect();
  } catch (error) {}
}

export class ToneEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.compressor = null;
    this.analyser = null;
    this.noiseBuffer = null;
    this.voice = null;
    this.isRunning = false;
    this.toneEnabled = false;
    this.currentPresetName = 'pureTone';
    this.currentWaveform = 'sine';
    this.currentVolume = 0.7;
    this.currentFrequency = 261.63;
    this.anchorFrequency = 261.63;
    this.timeDomainData = null;
    this.frequencyData = null;
  }

  async ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      this.context = new AudioContextClass({ latencyHint: 'interactive' });
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0;

      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 8;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.14;

      this.analyser = this.context.createAnalyser();
      const isCompactDevice = typeof window !== 'undefined'
        && (window.matchMedia?.('(pointer: coarse)')?.matches || window.innerWidth < 820);
      this.analyser.fftSize = isCompactDevice ? 1024 : 2048;
      this.analyser.smoothingTimeConstant = 0.68;
      this.timeDomainData = new Uint8Array(this.analyser.fftSize);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.context.destination);
      this.noiseBuffer = createNoiseBuffer(this.context);
    }

    if (!this.voice) {
      this.buildVoice(this.currentPresetName, this.currentWaveform);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.isRunning = true;
    return this.context;
  }

  destroyVoice() {
    if (!this.voice) return;
    stopNode(this.voice.mainOsc);
    stopNode(this.voice.subOsc);
    stopNode(this.voice.lfoOsc);
    stopNode(this.voice.noiseSource);
    stopNode(this.voice.droneRootOsc);
    stopNode(this.voice.droneFifthOsc);
    try {
      this.voice.voiceGain.disconnect();
      this.voice.filter.disconnect();
      this.voice.vibratoGain.disconnect();
      if (this.voice.noiseGain) this.voice.noiseGain.disconnect();
      if (this.voice.droneGain) this.voice.droneGain.disconnect();
    } catch (error) {}
    this.voice = null;
  }

  buildVoice(presetName, waveform) {
    if (!this.context) return;
    this.destroyVoice();

    const preset = PRESETS[presetName] || PRESETS.pureTone;
    const time = this.context.currentTime;

    const mainOsc = this.context.createOscillator();
    const subOsc = this.context.createOscillator();
    const lfoOsc = this.context.createOscillator();
    const mainGain = this.context.createGain();
    const subGain = this.context.createGain();
    const vibratoGain = this.context.createGain();
    const voiceGain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    mainOsc.type = waveform;
    subOsc.type = waveform === 'sine' ? 'triangle' : waveform;
    mainOsc.frequency.value = this.currentFrequency;
    subOsc.frequency.value = this.currentFrequency;
    subOsc.detune.value = preset.detune;

    filter.type = preset.filterType;
    filter.frequency.value = preset.filterFrequency;
    filter.Q.value = preset.filterQ;

    mainGain.gain.value = 0.9;
    subGain.gain.value = preset.subGain;
    voiceGain.gain.value = 0.0001;
    this.masterGain.gain.setTargetAtTime(this.toneEnabled ? this.currentVolume * 0.82 : 0, time, 0.02);

    lfoOsc.type = 'sine';
    lfoOsc.frequency.value = preset.lfoRate;
    vibratoGain.gain.value = preset.baseVibrato;

    lfoOsc.connect(vibratoGain);
    vibratoGain.connect(mainOsc.detune);
    vibratoGain.connect(subOsc.detune);

    mainOsc.connect(mainGain);
    subOsc.connect(subGain);
    mainGain.connect(voiceGain);
    subGain.connect(voiceGain);
    voiceGain.connect(filter);
    filter.connect(this.masterGain);

    let noiseSource = null;
    let noiseGain = null;
    if (preset.noise > 0) {
      noiseSource = this.context.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;
      noiseSource.loop = true;
      const noiseFilter = this.context.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1200;
      noiseGain = this.context.createGain();
      noiseGain.gain.value = preset.noise;
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(filter);
      noiseSource.start();
    }

    let droneRootOsc = null;
    let droneFifthOsc = null;
    let droneGain = null;
    if (preset.drone) {
      droneRootOsc = this.context.createOscillator();
      droneFifthOsc = this.context.createOscillator();
      droneGain = this.context.createGain();
      droneRootOsc.type = 'triangle';
      droneFifthOsc.type = 'sine';
      droneGain.gain.value = 0.12;
      droneRootOsc.frequency.value = this.anchorFrequency * 0.5;
      droneFifthOsc.frequency.value = this.anchorFrequency * 0.75;
      droneRootOsc.connect(droneGain);
      droneFifthOsc.connect(droneGain);
      droneGain.connect(this.masterGain);
      droneRootOsc.start();
      droneFifthOsc.start();
    }

    mainOsc.start();
    subOsc.start();
    lfoOsc.start();

    if (this.toneEnabled) {
      voiceGain.gain.setTargetAtTime(0.92, time, preset.response * 3);
    }

    this.voice = {
      preset,
      mainOsc,
      subOsc,
      lfoOsc,
      vibratoGain,
      mainGain,
      subGain,
      voiceGain,
      filter,
      noiseSource,
      noiseGain,
      droneRootOsc,
      droneFifthOsc,
      droneGain
    };
  }

  async toggleTone(force) {
    await this.ensureContext();
    const next = typeof force === 'boolean' ? force : !this.toneEnabled;
    this.toneEnabled = next;
    if (!this.voice) return this.toneEnabled;
    const time = this.context.currentTime;
    const preset = this.voice.preset;
    const target = next ? 0.92 : 0.0001;
    const ramp = next ? preset.response * 3 : preset.response * 2;
    this.voice.voiceGain.gain.cancelScheduledValues(time);
    this.voice.voiceGain.gain.setTargetAtTime(target, time, ramp);
    this.masterGain.gain.setTargetAtTime(next ? this.currentVolume * 0.82 : 0, time, next ? 0.03 : 0.04);
    return this.toneEnabled;
  }

  async playPreviewPing() {
    await this.ensureContext();
    const time = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.currentFrequency || 440, time);
    osc.frequency.exponentialRampToValueAtTime((this.currentFrequency || 440) * 1.4, time + 0.18);

    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    filter.Q.value = 0.7;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.18, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);

    osc.start(time);
    osc.stop(time + 0.34);
  }

  async updateSettings({ presetName, waveform, volume }) {
    await this.ensureContext();
    const presetChanged = presetName && presetName !== this.currentPresetName;
    const waveformChanged = waveform && waveform !== this.currentWaveform;

    if (typeof volume === 'number') {
      this.currentVolume = volume;
      const time = this.context.currentTime;
      this.masterGain.gain.setTargetAtTime(this.toneEnabled ? this.currentVolume * 0.82 : 0, time, 0.04);
    }

    if (presetChanged || waveformChanged) {
      this.currentPresetName = presetName || this.currentPresetName;
      this.currentWaveform = waveform || this.currentWaveform;
      this.buildVoice(this.currentPresetName, this.currentWaveform);
      this.updateFrequency(this.currentFrequency, { vibratoCents: 0, brightness: 0.5 });
      this.setAnchorFrequency(this.anchorFrequency);
    }
  }

  setAnchorFrequency(frequency) {
    this.anchorFrequency = frequency;
    if (!this.voice || !this.voice.droneRootOsc || !this.context) return;
    const time = this.context.currentTime;
    this.voice.droneRootOsc.frequency.setTargetAtTime(frequency * 0.5, time, 0.08);
    this.voice.droneFifthOsc.frequency.setTargetAtTime(frequency * 0.75, time, 0.08);
  }

  updateFrequency(frequency, { vibratoCents = 0, brightness = 0.5 } = {}) {
    if (!this.voice || !this.context) return;
    this.currentFrequency = frequency;
    const time = this.context.currentTime;
    const preset = this.voice.preset;
    this.voice.mainOsc.frequency.setTargetAtTime(frequency, time, preset.response);
    this.voice.subOsc.frequency.setTargetAtTime(frequency, time, preset.response * 1.15);
    this.voice.filter.frequency.setTargetAtTime(600 + brightness * 2800 + preset.filterFrequency * 0.22, time, 0.04);
    this.voice.vibratoGain.gain.setTargetAtTime(preset.baseVibrato + vibratoCents, time, 0.04);
  }

  getAnalyserData() {
    if (!this.analyser || !this.timeDomainData || !this.frequencyData) {
      return null;
    }
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    this.analyser.getByteFrequencyData(this.frequencyData);
    return { timeDomain: this.timeDomainData, frequencyData: this.frequencyData };
  }
}
