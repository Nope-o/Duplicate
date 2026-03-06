const STORAGE_KEY = 'pitchVisualizerSettings';

const DEFAULT_SETTINGS = {
  sa: 0,
  lowCut: 70,
  rmsGate: 5,
  clarityGate: 35,
  historyDuration: 5,
  smoothingFactor: 30,
  fpsLimit: 30,
  exerciseDifficulty: 'normal',
  exerciseRegister: 'low',
  darkMode: true,
  showHarmonics: true,
  autoTuneVisualization: true,
  showFormants: false,
  autoTonicDetection: false,
  playExerciseTargetPrompt: true,
  sessionReplayVoice: 'violin',
  sessionReplayLevel: 78,
  mobileControlsOpen: false
};

const SCHEMA = {
  sa: 'number',
  lowCut: 'number',
  rmsGate: 'number',
  clarityGate: 'number',
  historyDuration: 'number',
  smoothingFactor: 'number',
  fpsLimit: 'number',
  exerciseDifficulty: 'string',
  exerciseRegister: 'string',
  darkMode: 'boolean',
  showHarmonics: 'boolean',
  autoTuneVisualization: 'boolean',
  showFormants: 'boolean',
  autoTonicDetection: 'boolean',
  playExerciseTargetPrompt: 'boolean',
  sessionReplayVoice: 'string',
  sessionReplayLevel: 'number',
  mobileControlsOpen: 'boolean'
};

class SettingsStore {
  constructor() {
    this.values = { ...DEFAULT_SETTINGS };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(DEFAULT_SETTINGS).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(parsed, key)) {
            this.values[key] = this.coerce(key, parsed[key]);
          }
        });
      }

      // Migrate older keys still present in localStorage.
      const legacyDarkMode = localStorage.getItem('darkMode');
      if (legacyDarkMode !== null) {
        this.values.darkMode = legacyDarkMode !== 'false';
      }

      const legacyAutoTonic = localStorage.getItem('autoTonicDetection');
      if (legacyAutoTonic !== null && !raw) {
        this.values.autoTonicDetection = legacyAutoTonic === 'true';
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
      this.values = { ...DEFAULT_SETTINGS };
    }

    this.save();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  coerce(key, value) {
    const type = SCHEMA[key];
    if (type === 'boolean') return Boolean(value);

    if (type === 'number') {
      const n = Number(value);
      return Number.isFinite(n) ? n : DEFAULT_SETTINGS[key];
    }

    return value;
  }

  get(key) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) return undefined;
    return this.values[key];
  }

  set(key, value) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) return;
    this.values[key] = this.coerce(key, value);
    this.save();
  }

  reset() {
    this.values = { ...DEFAULT_SETTINGS };
    this.save();
  }
}

export const settings = new SettingsStore();

window.settings = settings;
