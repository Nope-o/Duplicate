const PRESETS = {
  pureTone: {
    mainGain: 0.92,
    subGain: 0.08,
    subRatio: 1,
    subType: 'sine',
    harmonicGain: 0.1,
    harmonicRatio: 2,
    harmonicType: 'sine',
    detune: 0,
    filterType: 'lowpass',
    filterBase: 2200,
    filterTracking: 4.8,
    filterBrightness: 2600,
    filterMin: 500,
    filterMax: 7600,
    filterQ: 0.35,
    lowShelfFreq: 190,
    lowShelfGain: 1.5,
    lowShelfBoost: 2.5,
    presenceFreq: 1700,
    presenceGain: 0.8,
    presenceBoost: 1.4,
    lfoRate: 4,
    baseVibrato: 2.5,
    noise: 0,
    drone: false,
    response: 0.012,
    drive: 0.08,
    postDriveGain: 0.95,
    outputGain: 1.25,
    lowCompensation: 0.22
  },
  synthLead: {
    mainGain: 0.82,
    subGain: 0.34,
    subRatio: 0.5,
    subType: 'square',
    harmonicGain: 0.18,
    harmonicRatio: 2,
    harmonicType: 'sawtooth',
    detune: 7,
    filterType: 'lowpass',
    filterBase: 700,
    filterTracking: 6.2,
    filterBrightness: 2800,
    filterMin: 360,
    filterMax: 7200,
    filterQ: 2.1,
    lowShelfFreq: 210,
    lowShelfGain: 2.5,
    lowShelfBoost: 3.5,
    presenceFreq: 2100,
    presenceGain: 2.8,
    presenceBoost: 2.5,
    lfoRate: 5.2,
    baseVibrato: 7.5,
    noise: 0,
    drone: false,
    response: 0.01,
    drive: 0.65,
    postDriveGain: 0.78,
    outputGain: 1.55,
    lowCompensation: 0.26
  },
  ambientPad: {
    mainGain: 0.78,
    subGain: 0.42,
    subRatio: 0.5,
    subType: 'triangle',
    harmonicGain: 0.16,
    harmonicRatio: 2,
    harmonicType: 'triangle',
    detune: -6,
    filterType: 'lowpass',
    filterBase: 560,
    filterTracking: 5.8,
    filterBrightness: 2100,
    filterMin: 300,
    filterMax: 5400,
    filterQ: 0.9,
    lowShelfFreq: 180,
    lowShelfGain: 3.2,
    lowShelfBoost: 4.4,
    presenceFreq: 1500,
    presenceGain: 1.2,
    presenceBoost: 1.6,
    lfoRate: 4.1,
    baseVibrato: 5.8,
    noise: 0,
    drone: false,
    response: 0.028,
    drive: 0.18,
    postDriveGain: 0.9,
    outputGain: 1.45,
    lowCompensation: 0.28
  },
  fluteStyle: {
    mainGain: 0.86,
    subGain: 0.06,
    subRatio: 1,
    subType: 'sine',
    harmonicGain: 0.28,
    harmonicRatio: 2,
    harmonicType: 'sine',
    detune: 1.5,
    filterType: 'bandpass',
    filterBase: 420,
    filterTracking: 5.5,
    filterBrightness: 1000,
    filterMin: 380,
    filterMax: 4800,
    filterQ: 0.8,
    lowShelfFreq: 220,
    lowShelfGain: 1.8,
    lowShelfBoost: 3.1,
    presenceFreq: 2500,
    presenceGain: 3.2,
    presenceBoost: 2.2,
    lfoRate: 5.8,
    baseVibrato: 10,
    noise: 0.05,
    noiseFrequency: 1400,
    noiseQ: 0.7,
    drone: false,
    response: 0.014,
    drive: 0.06,
    postDriveGain: 0.92,
    outputGain: 1.48,
    lowCompensation: 0.3
  },
  tanpuraDrone: {
    mainGain: 0.76,
    subGain: 0.28,
    subRatio: 1,
    subType: 'triangle',
    harmonicGain: 0.34,
    harmonicRatio: 2,
    harmonicType: 'triangle',
    detune: 0,
    filterType: 'lowpass',
    filterBase: 620,
    filterTracking: 4.6,
    filterBrightness: 1500,
    filterMin: 360,
    filterMax: 4600,
    filterQ: 0.7,
    lowShelfFreq: 170,
    lowShelfGain: 3.4,
    lowShelfBoost: 4.8,
    presenceFreq: 1300,
    presenceGain: 0.8,
    presenceBoost: 1.2,
    lfoRate: 4.4,
    baseVibrato: 3.8,
    noise: 0,
    drone: true,
    droneGain: 0.16,
    response: 0.018,
    drive: 0.12,
    postDriveGain: 0.94,
    outputGain: 1.52,
    lowCompensation: 0.34
  }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createDriveCurve(amount = 0) {
  const sampleCount = 1024;
  const curve = new Float32Array(sampleCount);
  const drive = 4 + amount * 36;
  const normalizer = Math.tanh(drive);

  for (let i = 0; i < sampleCount; i += 1) {
    const x = (i * 2) / (sampleCount - 1) - 1;
    curve[i] = Math.tanh(drive * x) / normalizer;
  }

  return curve;
}

function getSubWaveform(waveform, preset) {
  if (preset.subType) return preset.subType;
  return waveform === 'sine' ? 'triangle' : waveform;
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
    this.outputGain = null;
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
    this.lastAppliedFrequency = NaN;
    this.lastAppliedVibratoCents = NaN;
    this.lastAppliedBrightness = NaN;
    this.timeDomainData = null;
    this.frequencyData = null;
    this.isCompactDevice = typeof window !== 'undefined'
      && (window.matchMedia?.('(pointer: coarse)')?.matches || window.innerWidth < 820);
  }

  getPreset(name = this.currentPresetName) {
    return PRESETS[name] || PRESETS.pureTone;
  }

  getLowFrequencyRatio(frequency) {
    return clamp((240 - Math.min(Math.max(frequency, 70), 240)) / 240, 0, 1);
  }

  getBodyFrequency(preset, frequency) {
    const ratio = preset.subRatio ?? 1;
    if (ratio >= 1) return frequency * ratio;
    return frequency < 180 ? frequency : frequency * ratio;
  }

  getTargetLevel(preset, frequency) {
    const lowRatio = this.getLowFrequencyRatio(frequency);
    const loudnessBoost = 1 + lowRatio * (preset.lowCompensation ?? 0.2);
    return clamp(this.currentVolume * (preset.outputGain ?? 1.2) * loudnessBoost, 0, 1.85);
  }

  getTargetFilterFrequency(preset, frequency, brightness) {
    const tracked = (preset.filterBase ?? 700)
      + frequency * (preset.filterTracking ?? 4)
      + brightness * (preset.filterBrightness ?? 1800);
    return clamp(tracked, preset.filterMin ?? 260, preset.filterMax ?? 7200);
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
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.002;
      this.compressor.release.value = 0.12;

      this.outputGain = this.context.createGain();
      this.outputGain.gain.value = 1.18;

      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = this.isCompactDevice ? 512 : 2048;
      this.analyser.smoothingTimeConstant = 0.68;
      this.timeDomainData = new Uint8Array(this.analyser.fftSize);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.outputGain);
      this.outputGain.connect(this.analyser);
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
    stopNode(this.voice.harmonicOsc);
    stopNode(this.voice.lfoOsc);
    stopNode(this.voice.noiseSource);
    stopNode(this.voice.droneRootOsc);
    stopNode(this.voice.droneFifthOsc);
    try {
      this.voice.mainGain.disconnect();
      this.voice.subGain.disconnect();
      this.voice.harmonicGain.disconnect();
      this.voice.voiceGain.disconnect();
      this.voice.filter.disconnect();
      this.voice.lowShelf.disconnect();
      this.voice.presenceShelf.disconnect();
      this.voice.driveShaper.disconnect();
      this.voice.postDriveGain.disconnect();
      this.voice.vibratoGain.disconnect();
      if (this.voice.noiseGain) this.voice.noiseGain.disconnect();
      if (this.voice.noiseFilter) this.voice.noiseFilter.disconnect();
      if (this.voice.droneGain) this.voice.droneGain.disconnect();
    } catch (error) {}
    this.voice = null;
  }

  buildVoice(presetName, waveform) {
    if (!this.context) return;
    this.destroyVoice();

    const preset = this.getPreset(presetName);
    const time = this.context.currentTime;

    const mainOsc = this.context.createOscillator();
    const subOsc = this.context.createOscillator();
    const harmonicOsc = this.context.createOscillator();
    const lfoOsc = this.context.createOscillator();
    const mainGain = this.context.createGain();
    const subGain = this.context.createGain();
    const harmonicGain = this.context.createGain();
    const vibratoGain = this.context.createGain();
    const voiceGain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const lowShelf = this.context.createBiquadFilter();
    const presenceShelf = this.context.createBiquadFilter();
    const driveShaper = this.context.createWaveShaper();
    const postDriveGain = this.context.createGain();

    mainOsc.type = waveform;
    subOsc.type = getSubWaveform(waveform, preset);
    harmonicOsc.type = preset.harmonicType || 'sine';

    mainOsc.frequency.value = this.currentFrequency;
    subOsc.frequency.value = this.getBodyFrequency(preset, this.currentFrequency);
    harmonicOsc.frequency.value = this.currentFrequency * (preset.harmonicRatio ?? 2);
    subOsc.detune.value = preset.detune;

    filter.type = preset.filterType;
    filter.frequency.value = this.getTargetFilterFrequency(preset, this.currentFrequency, 0.5);
    filter.Q.value = preset.filterQ;

    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = preset.lowShelfFreq;
    lowShelf.gain.value = preset.lowShelfGain;

    presenceShelf.type = 'highshelf';
    presenceShelf.frequency.value = preset.presenceFreq;
    presenceShelf.gain.value = preset.presenceGain;

    driveShaper.curve = createDriveCurve(preset.drive);
    driveShaper.oversample = this.isCompactDevice ? 'none' : '2x';

    mainGain.gain.value = preset.mainGain;
    subGain.gain.value = preset.subGain;
    harmonicGain.gain.value = preset.harmonicGain;
    voiceGain.gain.value = 0.0001;
    postDriveGain.gain.value = preset.postDriveGain;
    this.masterGain.gain.setTargetAtTime(this.toneEnabled ? this.getTargetLevel(preset, this.currentFrequency) : 0, time, 0.02);

    lfoOsc.type = 'sine';
    lfoOsc.frequency.value = preset.lfoRate;
    vibratoGain.gain.value = preset.baseVibrato;

    lfoOsc.connect(vibratoGain);
    vibratoGain.connect(mainOsc.detune);
    vibratoGain.connect(subOsc.detune);
    vibratoGain.connect(harmonicOsc.detune);

    mainOsc.connect(mainGain);
    subOsc.connect(subGain);
    harmonicOsc.connect(harmonicGain);
    mainGain.connect(voiceGain);
    subGain.connect(voiceGain);
    harmonicGain.connect(voiceGain);
    voiceGain.connect(filter);
    filter.connect(lowShelf);
    lowShelf.connect(presenceShelf);
    presenceShelf.connect(driveShaper);
    driveShaper.connect(postDriveGain);
    postDriveGain.connect(this.masterGain);

    let noiseSource = null;
    let noiseGain = null;
    let noiseFilter = null;
    if (preset.noise > 0) {
      noiseSource = this.context.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;
      noiseSource.loop = true;
      noiseFilter = this.context.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = preset.noiseFrequency || 1600;
      noiseFilter.Q.value = preset.noiseQ || 0.9;
      noiseGain = this.context.createGain();
      noiseGain.gain.value = preset.noise;
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(presenceShelf);
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
      droneGain.gain.value = preset.droneGain || 0.14;
      droneRootOsc.frequency.value = this.anchorFrequency * 0.5;
      droneFifthOsc.frequency.value = this.anchorFrequency * 0.75;
      droneRootOsc.connect(droneGain);
      droneFifthOsc.connect(droneGain);
      droneGain.connect(lowShelf);
      droneRootOsc.start();
      droneFifthOsc.start();
    }

    mainOsc.start();
    subOsc.start();
    harmonicOsc.start();
    lfoOsc.start();

    if (this.toneEnabled) {
      voiceGain.gain.setTargetAtTime(0.98, time, preset.response * 3);
    }

    this.voice = {
      preset,
      mainOsc,
      subOsc,
      harmonicOsc,
      lfoOsc,
      vibratoGain,
      mainGain,
      subGain,
      harmonicGain,
      voiceGain,
      filter,
      lowShelf,
      presenceShelf,
      driveShaper,
      postDriveGain,
      noiseSource,
      noiseGain,
      noiseFilter,
      droneRootOsc,
      droneFifthOsc,
      droneGain
    };
  }

  applyMasterLevel(time = this.context?.currentTime ?? 0, ramp = 0.04) {
    if (!this.context || !this.masterGain) return;
    const preset = this.voice?.preset || this.getPreset();
    const target = this.toneEnabled ? this.getTargetLevel(preset, this.currentFrequency) : 0;
    this.masterGain.gain.cancelScheduledValues(time);
    this.masterGain.gain.setTargetAtTime(target, time, ramp);
  }

  async toggleTone(force) {
    await this.ensureContext();
    const next = typeof force === 'boolean' ? force : !this.toneEnabled;
    this.toneEnabled = next;
    if (!this.voice) return this.toneEnabled;
    const time = this.context.currentTime;
    const preset = this.voice.preset;
    const target = next ? 0.98 : 0.0001;
    const ramp = next ? preset.response * 3 : preset.response * 2;
    this.voice.voiceGain.gain.cancelScheduledValues(time);
    this.voice.voiceGain.gain.setTargetAtTime(target, time, ramp);
    this.applyMasterLevel(time, next ? 0.03 : 0.04);
    return this.toneEnabled;
  }

  async playPreviewPing() {
    await this.ensureContext();
    const preset = this.getPreset();
    const time = this.context.currentTime;
    const baseFrequency = this.currentFrequency || 440;

    const mainOsc = this.context.createOscillator();
    const harmonicOsc = this.context.createOscillator();
    const mainGain = this.context.createGain();
    const harmonicGain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const shelf = this.context.createBiquadFilter();
    const drive = this.context.createWaveShaper();
    const output = this.context.createGain();

    mainOsc.type = this.currentWaveform === 'sine' ? 'triangle' : this.currentWaveform;
    harmonicOsc.type = preset.harmonicType || 'sine';
    mainOsc.frequency.setValueAtTime(baseFrequency, time);
    mainOsc.frequency.exponentialRampToValueAtTime(baseFrequency * 1.16, time + 0.16);
    harmonicOsc.frequency.setValueAtTime(baseFrequency * 2, time);
    harmonicOsc.frequency.exponentialRampToValueAtTime(baseFrequency * 2.15, time + 0.16);

    filter.type = 'lowpass';
    filter.frequency.value = clamp(baseFrequency * 5.4, 1400, 5200);
    filter.Q.value = 0.8;

    shelf.type = 'lowshelf';
    shelf.frequency.value = 200;
    shelf.gain.value = 3;

    drive.curve = createDriveCurve(0.2);
    drive.oversample = this.isCompactDevice ? 'none' : '2x';

    mainGain.gain.setValueAtTime(0.0001, time);
    harmonicGain.gain.setValueAtTime(0.0001, time);
    output.gain.setValueAtTime(0.0001, time);

    mainGain.gain.exponentialRampToValueAtTime(0.22, time + 0.018);
    harmonicGain.gain.exponentialRampToValueAtTime(Math.max(0.08, preset.harmonicGain * 0.7), time + 0.018);
    output.gain.exponentialRampToValueAtTime(0.34, time + 0.02);

    mainGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.36);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
    output.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);

    mainOsc.connect(mainGain);
    harmonicOsc.connect(harmonicGain);
    mainGain.connect(filter);
    harmonicGain.connect(filter);
    filter.connect(shelf);
    shelf.connect(drive);
    drive.connect(output);
    output.connect(this.compressor);

    mainOsc.start(time);
    harmonicOsc.start(time);
    mainOsc.stop(time + 0.42);
    harmonicOsc.stop(time + 0.42);
  }

  async updateSettings({ presetName, waveform, volume }) {
    await this.ensureContext();
    const presetChanged = presetName && presetName !== this.currentPresetName;
    const waveformChanged = waveform && waveform !== this.currentWaveform;

    if (typeof volume === 'number') {
      this.currentVolume = volume;
      this.applyMasterLevel(this.context.currentTime, 0.04);
    }

    if (presetChanged || waveformChanged) {
      this.currentPresetName = presetName || this.currentPresetName;
      this.currentWaveform = waveform || this.currentWaveform;
      this.buildVoice(this.currentPresetName, this.currentWaveform);
      this.lastAppliedFrequency = NaN;
      this.lastAppliedVibratoCents = NaN;
      this.lastAppliedBrightness = NaN;
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
    const frequencyThreshold = this.isCompactDevice ? 0.18 : 0.08;
    const vibratoThreshold = this.isCompactDevice ? 0.45 : 0.2;
    const brightnessThreshold = this.isCompactDevice ? 0.03 : 0.015;
    if (
      Number.isFinite(this.lastAppliedFrequency)
      && Math.abs(frequency - this.lastAppliedFrequency) < frequencyThreshold
      && Math.abs(vibratoCents - this.lastAppliedVibratoCents) < vibratoThreshold
      && Math.abs(brightness - this.lastAppliedBrightness) < brightnessThreshold
    ) {
      return;
    }

    this.lastAppliedFrequency = frequency;
    this.lastAppliedVibratoCents = vibratoCents;
    this.lastAppliedBrightness = brightness;
    const time = this.context.currentTime;
    const preset = this.voice.preset;
    const lowRatio = this.getLowFrequencyRatio(frequency);
    const targetFilterFrequency = this.getTargetFilterFrequency(preset, frequency, brightness);

    this.voice.mainOsc.frequency.setTargetAtTime(frequency, time, preset.response);
    this.voice.subOsc.frequency.setTargetAtTime(this.getBodyFrequency(preset, frequency), time, preset.response * 1.1);
    this.voice.harmonicOsc.frequency.setTargetAtTime(frequency * (preset.harmonicRatio ?? 2), time, preset.response * 0.9);

    this.voice.mainGain.gain.setTargetAtTime(preset.mainGain, time, 0.05);
    this.voice.subGain.gain.setTargetAtTime(preset.subGain * (1 + lowRatio * 0.16), time, 0.05);
    this.voice.harmonicGain.gain.setTargetAtTime(preset.harmonicGain * (0.92 + brightness * 0.42), time, 0.05);

    this.voice.filter.frequency.setTargetAtTime(targetFilterFrequency, time, 0.04);
    this.voice.lowShelf.gain.setTargetAtTime((preset.lowShelfGain ?? 0) + lowRatio * (preset.lowShelfBoost ?? 0), time, 0.05);
    this.voice.presenceShelf.gain.setTargetAtTime((preset.presenceGain ?? 0) + brightness * (preset.presenceBoost ?? 0), time, 0.05);
    this.voice.postDriveGain.gain.setTargetAtTime((preset.postDriveGain ?? 0.9) + lowRatio * 0.08, time, 0.05);
    this.voice.vibratoGain.gain.setTargetAtTime(preset.baseVibrato + vibratoCents, time, 0.04);

    if (this.voice.noiseGain) {
      this.voice.noiseGain.gain.setTargetAtTime((preset.noise ?? 0) * (0.7 + brightness * 0.5), time, 0.05);
    }

    this.applyMasterLevel(time, 0.05);
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
