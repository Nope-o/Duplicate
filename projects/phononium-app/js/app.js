import { ToneEngine } from './audio-engine.js';
import { MotionSensorController, CONTROL_MODES, computeMotionResponse } from './motion.js';
import { SonicCanvas } from './visualizer.js';
import {
  NOTE_NAMES,
  INDIAN_NOTES,
  clamp,
  midiToFrequency,
  getNoteDataFromFrequency,
  buildBaseNoteOptions,
  snapMidiToScale,
  formatFrequency
} from './music.js';

const STORAGE_KEY = 'phononium-settings-v1';
const GUIDE_STORAGE_KEY_PREFIX = 'phononium-guide-seen-v1';
const DEFAULTS = {
  instrument: 'pureTone',
  waveform: 'sine',
  volume: 70,
  mode: 'thereminFlow',
  sensitivity: 100,
  range: 24,
  scale: 'chromatic',
  vibrato: 32,
  octaveLock: false,
  sustain: true,
  baseNote: 0,
  octave: 4
};

const MODE_HINTS = {
  skyPitch: 'Lift or lower the phone to climb or descend in pitch.',
  horizonGlide: 'Sweep left and right for wide melodic slides.',
  orbitControl: 'Rotate the device to contour pitch and modulation.',
  gravityBend: 'Use tilt like a bend wheel for continuous pitch drift.',
  thereminFlow: 'Blend tilt, glide, and rotation for the most expressive control.'
};

const SCALE_LABELS = {
  chromatic: 'Chromatic',
  major: 'Major',
  minor: 'Minor',
  yaman: 'Raga Yaman',
  pentatonic: 'Pentatonic'
};

function isMobileLikeDevice() {
  return typeof window !== 'undefined'
    && ((window.matchMedia?.('(pointer: coarse)')?.matches ?? false) || window.innerWidth < 720);
}

const IS_COMPACT_DEVICE = isMobileLikeDevice();

function getGuideProfile() {
  if (isMobileLikeDevice()) {
    return {
      key: 'mobile',
      badge: 'Phone / Tablet Guide',
      title: 'How Phononium works on your phone',
      lead: 'Phone mode is built around motion first, with the stage surface kept as backup when sensors are unavailable.',
      primaryMode: 'Move and tilt the phone',
      primaryText: 'Press Start Sound, then raise, tilt, rotate, or glide the phone to change pitch in real time.',
      fallbackMode: 'Use the stage when needed',
      fallbackText: 'If motion is blocked, drag on the pitch stage to keep playing while you switch to a secure URL.',
      steps: [
        {
          title: 'Start sound first',
          text: 'Press Start Sound first. Phononium attempts to arm motion during the same tap so the browser can unlock audio and sensors together.'
        },
        {
          title: 'Confirm speaker output',
          text: 'Use Test Speaker once before performing so you know the browser audio path is active.'
        },
        {
          title: 'Shape pitch with movement',
          text: 'SkyPitch reacts to lift, Horizon Glide reacts to side motion, and Theremin Flow blends multiple axes for the richest control.'
        }
      ]
    };
  }

  return {
    key: 'desktop',
    badge: 'Laptop / Desktop Guide',
    title: 'How Phononium works on your laptop',
    lead: 'Desktop mode uses the same sound engine, but replaces motion input with a controllable stage surface and keyboard fallback.',
    primaryMode: 'Drag on the stage',
    primaryText: 'Use the pitch stage as your primary controller. Horizontal and vertical movement shape the live note.',
    fallbackMode: 'Use arrow keys for fine moves',
    fallbackText: 'Arrow keys keep pitch adjustments precise when you want controlled steps instead of freehand movement.',
    steps: [
      {
        title: 'Start audio first',
        text: 'Press Start Sound or Test Speaker first so the browser unlocks audio before you begin moving around the stage.'
      },
      {
        title: 'Play from the pitch stage',
        text: 'Drag across the stage to sweep pitch and use the active control mode to decide how movement is interpreted.'
      },
      {
        title: 'Tune response in Settings',
        text: 'Use the settings sheet to change scale lock, pitch range, vibrato, and instrument character without crowding the main screen.'
      }
    ]
  };
}

function getGuideStorageKey() {
  return `${GUIDE_STORAGE_KEY_PREFIX}:${getGuideProfile().key}`;
}

function shouldAutoOpenGuide() {
  try {
    return localStorage.getItem(getGuideStorageKey()) !== '1';
  } catch (error) {
    return true;
  }
}

function markGuideSeen() {
  try {
    localStorage.setItem(getGuideStorageKey(), '1');
  } catch (error) {}
}

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch (error) {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {}
}

const settings = loadSettings();
const state = {
  ...settings,
  audioOn: false,
  motionEnabled: false,
  motionSignalLive: false,
  motionAttempted: false,
  motionError: '',
  keyboardOffset: 0,
  pointer: { active: false, x: 0, y: 0 },
  anchorFrame: { alpha: 0, beta: 0, gamma: 0 },
  currentFrequency: midiToFrequency(12 * (settings.octave + 1) + settings.baseNote),
  currentNoteData: getNoteDataFromFrequency(midiToFrequency(12 * (settings.octave + 1) + settings.baseNote)),
  lastVisualFrame: 0,
  lastReadoutFrame: 0,
  lastRenderSignature: ''
};

const RENDER_BUDGET_MS = 1000 / (IS_COMPACT_DEVICE ? 22 : 30);
const READOUT_BUDGET_MS = 1000 / (IS_COMPACT_DEVICE ? 20 : 24);
const domCache = new Map();

const dom = {
  audioToggleBtn: document.getElementById('audioToggleBtn'),
  testToneBtn: document.getElementById('testToneBtn'),
  audioHint: document.getElementById('audioHint'),
  anchorBtnHero: document.getElementById('anchorBtnHero'),
  heroHelper: document.getElementById('heroHelper'),
  enableMotionBtn: document.getElementById('enableMotionBtn'),
  permissionBanner: document.getElementById('permissionBanner'),
  permissionHeadline: document.getElementById('permissionHeadline'),
  permissionStatus: document.getElementById('permissionStatus'),
  openGuideBtn: document.getElementById('openGuideBtn'),
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  openSettingsBtnSecondary: document.getElementById('openSettingsBtnSecondary'),
  settingsModal: document.getElementById('settingsModal'),
  settingsBackdrop: document.getElementById('settingsBackdrop'),
  settingsSheet: document.getElementById('settingsSheet'),
  openGuideBtnSecondary: document.getElementById('openGuideBtnSecondary'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  guideModal: document.getElementById('guideModal'),
  guideBackdrop: document.getElementById('guideBackdrop'),
  guideSheet: document.getElementById('guideSheet'),
  closeGuideBtn: document.getElementById('closeGuideBtn'),
  guideOpenSettingsBtn: document.getElementById('guideOpenSettingsBtn'),
  guideStartBtn: document.getElementById('guideStartBtn'),
  guideDeviceBadge: document.getElementById('guideDeviceBadge'),
  guideTitle: document.getElementById('guideTitle'),
  guideLead: document.getElementById('guideLead'),
  guidePrimaryMode: document.getElementById('guidePrimaryMode'),
  guidePrimaryText: document.getElementById('guidePrimaryText'),
  guideFallbackMode: document.getElementById('guideFallbackMode'),
  guideFallbackText: document.getElementById('guideFallbackText'),
  guideSteps: document.getElementById('guideSteps'),
  westernNote: document.getElementById('westernNote'),
  indianNote: document.getElementById('indianNote'),
  hindiNote: document.getElementById('hindiNote'),
  frequencyValue: document.getElementById('frequencyValue'),
  centsValue: document.getElementById('centsValue'),
  modeBadge: document.getElementById('modeBadge'),
  sourceBadge: document.getElementById('sourceBadge'),
  controlSummary: document.getElementById('controlSummary'),
  rangeValueLabel: document.getElementById('rangeValueLabel'),
  motionVector: document.getElementById('motionVector'),
  sensorStatus: document.getElementById('sensorStatus'),
  engineStatus: document.getElementById('engineStatus'),
  surfaceTip: document.getElementById('surfaceTip'),
  anchorBadge: document.getElementById('anchorBadge'),
  anchorDetail: document.getElementById('anchorDetail'),
  motionSurface: document.getElementById('motionSurface'),
  sonicCanvas: document.getElementById('sonicCanvas'),
  instrumentSelect: document.getElementById('instrumentSelect'),
  waveformSelect: document.getElementById('waveformSelect'),
  volumeInput: document.getElementById('volumeInput'),
  volumeValue: document.getElementById('volumeValue'),
  modeSelect: document.getElementById('modeSelect'),
  sensitivityInput: document.getElementById('sensitivityInput'),
  sensitivityValue: document.getElementById('sensitivityValue'),
  rangeInput: document.getElementById('rangeInput'),
  rangeValue: document.getElementById('rangeValue'),
  scaleSelect: document.getElementById('scaleSelect'),
  vibratoInput: document.getElementById('vibratoInput'),
  vibratoValue: document.getElementById('vibratoValue'),
  octaveLockToggle: document.getElementById('octaveLockToggle'),
  sustainToggle: document.getElementById('sustainToggle'),
  baseNoteSelect: document.getElementById('baseNoteSelect'),
  octaveSelect: document.getElementById('octaveSelect'),
  anchorBtn: document.getElementById('anchorBtn'),
  resetAnchorBtn: document.getElementById('resetAnchorBtn')
};

const toneEngine = new ToneEngine();
const motionController = new MotionSensorController();
const sonicCanvas = new SonicCanvas(dom.sonicCanvas);
let lastFocusedElement = null;
let runtimeFrameId = 0;

function setNodeText(element, value) {
  if (!element) return;
  const next = String(value);
  if (domCache.get(element) === next) return;
  domCache.set(element, next);
  element.textContent = next;
}

function setChipState(element, tone) {
  if (!element) return;
  element.dataset.state = tone;
}

function setHeroHelper(message) {
  if (!dom.heroHelper) return;
  setNodeText(dom.heroHelper, message);
}

function getNeutralMotionResponse() {
  return {
    source: 'Ready',
    vector: { x: 0, y: 0, z: 0 },
    brightness: 0.5,
    vibratoCents: 0,
    semitoneOffset: 0
  };
}

function getControlSummary() {
  if (state.audioOn && state.motionEnabled && motionController.hasRecentSignal()) {
    return 'Performance ready';
  }
  if (state.audioOn && state.motionEnabled) {
    return 'Sound live • awaiting motion';
  }
  if (state.audioOn) {
    return 'Sound live • fallback ready';
  }
  return 'Awaiting first gesture';
}

function startRuntime() {
  if (runtimeFrameId) return;
  state.lastVisualFrame = 0;
  state.lastReadoutFrame = 0;
  state.lastRenderSignature = '';
  runtimeFrameId = requestAnimationFrame(tick);
}

function stopRuntime() {
  if (runtimeFrameId) {
    cancelAnimationFrame(runtimeFrameId);
    runtimeFrameId = 0;
  }
  motionController.stop();
  state.motionEnabled = false;
  state.motionSignalLive = false;
  state.keyboardOffset = 0;
  state.pointer = { active: false, x: 0, y: 0 };

  const anchorFrequency = midiToFrequency(getAnchorMidi());
  const anchorNoteData = getNoteDataFromFrequency(anchorFrequency);
  state.currentFrequency = anchorFrequency;
  state.currentNoteData = anchorNoteData;
  renderReadout(anchorNoteData, getNeutralMotionResponse());
  sonicCanvas.render({
    analyserData: null,
    noteData: anchorNoteData,
    meta: { modeLabel: CONTROL_MODES[state.mode] }
  });
  setStatusText();
  updatePermissionBanner();
}

function updateActionStates() {
  dom.audioToggleBtn.textContent = state.audioOn ? 'Stop Sound' : 'Start Sound';
  dom.audioToggleBtn.classList.toggle('is-live', state.audioOn);
  dom.audioToggleBtn.setAttribute('aria-pressed', state.audioOn ? 'true' : 'false');

  dom.enableMotionBtn.textContent = !motionController.secureContext && motionController.supported
    ? 'Need HTTPS'
    : 'Retry Motion';
  dom.enableMotionBtn.classList.toggle('is-enabled', state.motionEnabled);
  dom.enableMotionBtn.setAttribute('aria-pressed', state.motionEnabled ? 'true' : 'false');

  dom.anchorBtn.classList.toggle('is-ready', true);
  dom.anchorBtnHero.classList.toggle('is-ready', true);
}

function syncOverlayState() {
  const hasOpenOverlay = Boolean(
    (dom.settingsModal && !dom.settingsModal.hidden)
    || (dom.guideModal && !dom.guideModal.hidden)
  );
  document.body.classList.toggle('settings-open', hasOpenOverlay);
}

function populateGuideContent() {
  const profile = getGuideProfile();
  setNodeText(dom.guideDeviceBadge, profile.badge);
  setNodeText(dom.guideTitle, profile.title);
  setNodeText(dom.guideLead, profile.lead);
  setNodeText(dom.guidePrimaryMode, profile.primaryMode);
  setNodeText(dom.guidePrimaryText, profile.primaryText);
  setNodeText(dom.guideFallbackMode, profile.fallbackMode);
  setNodeText(dom.guideFallbackText, profile.fallbackText);

  if (dom.guideSteps) {
    dom.guideSteps.innerHTML = profile.steps
      .map((step) => `<li><strong>${step.title}</strong><span>${step.text}</span></li>`)
      .join('');
  }
}

function setSettingsOpen(open, options = {}) {
  if (!dom.settingsModal) return;
  const { restoreFocus = true } = options;

  if (open) {
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dom.guideModal) dom.guideModal.hidden = true;
    dom.settingsModal.hidden = false;
    syncOverlayState();
    requestAnimationFrame(() => {
      dom.closeSettingsBtn?.focus();
    });
    return;
  }

  dom.settingsModal.hidden = true;
  syncOverlayState();
  if (restoreFocus && lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

function setGuideOpen(open, options = {}) {
  if (!dom.guideModal) return;
  const { remember = false, restoreFocus = true } = options;

  if (open) {
    populateGuideContent();
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dom.settingsModal) dom.settingsModal.hidden = true;
    dom.guideModal.hidden = false;
    syncOverlayState();
    requestAnimationFrame(() => {
      dom.guideStartBtn?.focus();
    });
    return;
  }

  dom.guideModal.hidden = true;
  if (remember) {
    markGuideSeen();
  }
  syncOverlayState();
  if (restoreFocus && lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

function isTextInputTarget(target) {
  return target instanceof Element
    && Boolean(target.closest('input, select, textarea, [contenteditable="true"]'));
}

function applyControlValues() {
  buildBaseNoteOptions(dom.baseNoteSelect, Number(state.baseNote));
  dom.instrumentSelect.value = state.instrument;
  dom.waveformSelect.value = state.waveform;
  dom.volumeInput.value = state.volume;
  dom.volumeValue.textContent = `${state.volume}%`;
  dom.modeSelect.value = state.mode;
  dom.sensitivityInput.value = state.sensitivity;
  dom.sensitivityValue.textContent = `${(state.sensitivity / 100).toFixed(2)}x`;
  dom.rangeInput.value = state.range;
  dom.rangeValue.textContent = `${state.range} semitones`;
  dom.rangeValueLabel.textContent = `${state.range} st`;
  dom.scaleSelect.value = state.scale;
  dom.vibratoInput.value = state.vibrato;
  dom.vibratoValue.textContent = `${state.vibrato}%`;
  dom.octaveLockToggle.checked = Boolean(state.octaveLock);
  dom.sustainToggle.checked = Boolean(state.sustain);
  dom.octaveSelect.value = String(state.octave);
}

function getAnchorMidi() {
  return 12 * (Number(state.octave) + 1) + Number(state.baseNote);
}

function updateAnchorLabels() {
  const note = NOTE_NAMES[Number(state.baseNote)];
  const indian = INDIAN_NOTES[Number(state.baseNote)];
  setNodeText(dom.anchorBadge, `${indian.latin} / ${note}${state.octave}`);
  setNodeText(dom.anchorDetail, `Current posture anchored to ${note}${state.octave} / ${indian.latin} (${indian.hindi})`);
}

function persist() {
  saveSettings({
    instrument: state.instrument,
    waveform: state.waveform,
    volume: state.volume,
    mode: state.mode,
    sensitivity: state.sensitivity,
    range: state.range,
    scale: state.scale,
    vibrato: state.vibrato,
    octaveLock: state.octaveLock,
    sustain: state.sustain,
    baseNote: Number(state.baseNote),
    octave: Number(state.octave)
  });
}

function setStatusText() {
  setNodeText(dom.modeBadge, CONTROL_MODES[state.mode]);
  setNodeText(dom.controlSummary, getControlSummary());
  const snapshot = motionController.getSnapshot();

  if (!state.audioOn) {
    setNodeText(dom.sensorStatus, 'Start Sound to begin');
    setChipState(dom.sensorStatus, 'idle');
  } else if (!snapshot.secureContext && motionController.supported) {
    setNodeText(dom.sensorStatus, 'HTTPS required for motion');
    setChipState(dom.sensorStatus, 'idle');
  } else if (state.motionEnabled && motionController.hasRecentSignal()) {
    setNodeText(dom.sensorStatus, 'Motion active');
    setChipState(dom.sensorStatus, 'active');
  } else if (state.motionEnabled) {
    setNodeText(dom.sensorStatus, 'Motion enabled');
    setChipState(dom.sensorStatus, 'fallback');
  } else if (motionController.supported) {
    setNodeText(dom.sensorStatus, 'Fallback controls ready');
    setChipState(dom.sensorStatus, 'fallback');
  } else {
    setNodeText(dom.sensorStatus, 'Motion not supported');
    setChipState(dom.sensorStatus, 'idle');
  }

  if (state.audioOn) {
    setNodeText(dom.engineStatus, `Sound live • ${dom.instrumentSelect.options[dom.instrumentSelect.selectedIndex].text}`);
    setChipState(dom.engineStatus, 'active');
  } else {
    setNodeText(dom.engineStatus, 'Sound idle');
    setChipState(dom.engineStatus, 'idle');
  }

  dom.surfaceTip.textContent = !state.audioOn
    ? 'Start Sound to activate the live motion stage. On laptops, you can still drag here or use arrow keys after the sound starts.'
    : state.motionEnabled
    ? `${MODE_HINTS[state.mode]} Touch the stage any time for fine correction.`
    : !snapshot.secureContext && motionController.supported
      ? `${MODE_HINTS[state.mode]} Motion needs HTTPS or localhost on mobile, so use the stage until the app is opened on a secure URL.`
      : `${MODE_HINTS[state.mode]} Until motion is enabled, drag on the stage or use arrow keys.`;

  if (state.audioOn && state.motionEnabled) {
    setHeroHelper('The instrument is armed. Move the phone to shape pitch, or use the stage for finer correction.');
  } else if (state.audioOn) {
    setHeroHelper('Sound is live. If motion is blocked, use the stage or arrow keys to keep the instrument playable.');
  } else if (!snapshot.secureContext && motionController.supported) {
    setHeroHelper('This browser is on an insecure URL, so phone motion is blocked. Open Phononium on HTTPS or localhost to use sensors.');
  } else {
    setHeroHelper('Start Sound to begin. If motion is available, Phononium will join it automatically.');
  }

  updateActionStates();
}

function updatePermissionBanner() {
  if (!dom.permissionBanner) return;
  const showMotionBanner = isMobileLikeDevice();

  if (!showMotionBanner) {
    dom.permissionBanner.hidden = true;
    return;
  }

  if (!motionController.supported) {
    setNodeText(dom.permissionHeadline, 'Motion not detected');
    setPermissionStatus('This device/browser is not exposing motion sensors, so Phononium will stay on touch controls.', 'error');
    dom.permissionBanner.hidden = false;
    return;
  }

  if (!motionController.secureContext && motionController.supported) {
    setNodeText(dom.permissionHeadline, 'Motion needs HTTPS');
    setPermissionStatus('Open Phononium on HTTPS or localhost to use phone sensors.', 'error');
    dom.permissionBanner.hidden = false;
    return;
  }

  if (state.audioOn && state.motionAttempted && state.motionError) {
    setNodeText(dom.permissionHeadline, 'Motion needs attention');
    setPermissionStatus(state.motionError, 'error');
    dom.permissionBanner.hidden = false;
    return;
  }

  dom.permissionBanner.hidden = true;
}

function setPermissionStatus(message = '', tone = '') {
  if (!dom.permissionStatus) return;
  setNodeText(dom.permissionStatus, message);
  dom.permissionStatus.hidden = !message;
  dom.permissionStatus.classList.remove('is-error', 'is-success');
  if (tone === 'error') dom.permissionStatus.classList.add('is-error');
  if (tone === 'success') dom.permissionStatus.classList.add('is-success');
}

function compactPermissionMessage(message, fallback) {
  const source = String(message || fallback || '').trim();
  if (!source) return '';
  const firstSentence = source.split(/(?<=[.?!])\s+/)[0]?.trim() || source;
  return /[.?!]$/.test(firstSentence) ? firstSentence : `${firstSentence}.`;
}

function setAudioHint(message = '', tone = '') {
  if (!dom.audioHint) return;
  setNodeText(dom.audioHint, message);
  dom.audioHint.classList.remove('is-error', 'is-success');
  if (tone === 'error') dom.audioHint.classList.add('is-error');
  if (tone === 'success') dom.audioHint.classList.add('is-success');
}

async function syncAudioSettings() {
  await toneEngine.updateSettings({
    presetName: state.instrument,
    waveform: state.waveform,
    volume: state.volume / 100
  });
  toneEngine.setAnchorFrequency(midiToFrequency(getAnchorMidi()));
}

async function ensureMotionForPlayback() {
  state.motionAttempted = true;
  state.motionError = '';

  if (!isMobileLikeDevice()) {
    updatePermissionBanner();
    return { granted: false, reason: '' };
  }

  if (!motionController.supported) {
    state.motionEnabled = false;
    state.motionError = 'This device/browser is not exposing motion sensors, so Phononium will stay on touch controls.';
    updatePermissionBanner();
    return { granted: false, reason: state.motionError };
  }

  if (!motionController.secureContext) {
    state.motionEnabled = false;
    state.motionError = 'Open Phononium on HTTPS or localhost to use phone sensors.';
    updatePermissionBanner();
    return { granted: false, reason: state.motionError };
  }

  const result = motionController.permissionRequired
    ? await motionController.requestPermission()
    : (motionController.start(), { granted: true, reason: '' });

  state.motionEnabled = result.granted || motionController.active;
  state.motionSignalLive = false;
  state.motionError = state.motionEnabled
    ? ''
    : compactPermissionMessage(result.reason, 'Motion could not be enabled in this browser.');
  updatePermissionBanner();
  return result;
}

async function toggleAudio() {
  try {
    dom.audioToggleBtn.disabled = true;
    if (!state.audioOn) {
      const motionPromise = ensureMotionForPlayback();
      await syncAudioSettings();
      state.audioOn = await toneEngine.toggleTone(true);
      await motionPromise;
      startRuntime();
      setAudioHint(
        'Sound engine is active. If you still hear nothing, raise media volume or disable silent mode on the phone.',
        'success'
      );
    } else {
      state.audioOn = await toneEngine.toggleTone(false);
      stopRuntime();
      setAudioHint('Sound engine stopped.', '');
    }
  } catch (error) {
    state.audioOn = false;
    stopRuntime();
    setChipState(dom.engineStatus, 'idle');
    setNodeText(dom.engineStatus, 'Audio start failed');
    setAudioHint(error?.message || 'Audio could not start in this browser.', 'error');
  } finally {
    dom.audioToggleBtn.disabled = false;
    setStatusText();
  }
}

async function playTestTone() {
  try {
    dom.testToneBtn.disabled = true;
    await syncAudioSettings();
    await toneEngine.playPreviewPing();
    setNodeText(dom.engineStatus, 'Speaker test played');
    setChipState(dom.engineStatus, 'fallback');
    setAudioHint('Speaker test sound played. If you hear nothing, the device/browser is muting web audio.', 'success');
    setHeroHelper('Speaker path confirmed. Start Sound when you want the motion and touch controls to become audible.');
  } catch (error) {
    setNodeText(dom.engineStatus, 'Speaker test failed');
    setChipState(dom.engineStatus, 'idle');
    setAudioHint(error?.message || 'Speaker test could not start.', 'error');
  } finally {
    dom.testToneBtn.disabled = false;
  }
}

async function enableMotion() {
  if (!state.audioOn) {
    setPermissionStatus('Start Sound first, then retry motion if needed.', '');
    dom.permissionBanner.hidden = false;
    return;
  }
  dom.enableMotionBtn.disabled = true;
  dom.enableMotionBtn.textContent = 'Retrying...';
  await ensureMotionForPlayback();
  setStatusText();
  dom.enableMotionBtn.disabled = false;
}

function captureAnchor() {
  const snapshot = motionController.getSnapshot();
  state.anchorFrame = { ...snapshot.orientation };
  toneEngine.setAnchorFrequency(midiToFrequency(getAnchorMidi()));
  updateAnchorLabels();
  setAudioHint(`Pitch anchor set to ${NOTE_NAMES[Number(state.baseNote)]}${state.octave} / ${INDIAN_NOTES[Number(state.baseNote)].latin}.`, 'success');
  setHeroHelper('Pitch Anchor updated. The current posture is now treated as your musical home position.');
  if (navigator.vibrate) {
    navigator.vibrate(24);
  }
}

function resetAnchor() {
  state.anchorFrame = { alpha: 0, beta: 0, gamma: 0 };
  updateAnchorLabels();
  setAudioHint('Pitch anchor reset to a neutral device posture.', '');
  setHeroHelper('Pitch Anchor reset. Re-anchor the posture if you want a specific note at the current device position.');
}

function bindPointerFallback() {
  const updateFromEvent = (event) => {
    const rect = dom.motionSurface.getBoundingClientRect();
    const point = event.touches?.[0] || event;
    const x = ((point.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((point.clientY - rect.top) / rect.height) * 2 - 1;
    state.pointer = {
      active: true,
      x: clamp(x, -1, 1),
      y: clamp(y, -1, 1)
    };
  };

  dom.motionSurface.addEventListener('pointerdown', (event) => {
    dom.motionSurface.setPointerCapture?.(event.pointerId);
    dom.motionSurface.classList.add('is-active');
    updateFromEvent(event);
  });
  dom.motionSurface.addEventListener('pointermove', (event) => {
    if (!state.pointer.active) return;
    updateFromEvent(event);
  });
  const clearPointer = () => {
    state.pointer = { active: false, x: 0, y: 0 };
    dom.motionSurface.classList.remove('is-active');
  };
  dom.motionSurface.addEventListener('pointerup', clearPointer);
  dom.motionSurface.addEventListener('pointercancel', clearPointer);

  dom.motionSurface.addEventListener('touchstart', updateFromEvent, { passive: true });
  dom.motionSurface.addEventListener('touchmove', updateFromEvent, { passive: true });
  dom.motionSurface.addEventListener('touchend', clearPointer, { passive: true });
}

function bindKeyboardFallback() {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dom.guideModal && !dom.guideModal.hidden) {
      event.preventDefault();
      setGuideOpen(false, { remember: true });
      return;
    }

    if (event.key === 'Escape' && dom.settingsModal && !dom.settingsModal.hidden) {
      event.preventDefault();
      setSettingsOpen(false);
      return;
    }

    if ((dom.settingsModal && !dom.settingsModal.hidden) || (dom.guideModal && !dom.guideModal.hidden)) {
      return;
    }

    if (isTextInputTarget(event.target)) {
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
    }
    if (event.key === 'ArrowLeft') state.keyboardOffset = clamp(state.keyboardOffset - 1, -state.range, state.range);
    if (event.key === 'ArrowRight') state.keyboardOffset = clamp(state.keyboardOffset + 1, -state.range, state.range);
    if (event.key === 'ArrowUp') state.keyboardOffset = clamp(state.keyboardOffset + 0.5, -state.range, state.range);
    if (event.key === 'ArrowDown') state.keyboardOffset = clamp(state.keyboardOffset - 0.5, -state.range, state.range);
  });
}

function bindControls() {
  dom.audioToggleBtn.addEventListener('click', toggleAudio);
  dom.testToneBtn.addEventListener('click', playTestTone);
  dom.enableMotionBtn.addEventListener('click', enableMotion);
  dom.openGuideBtn?.addEventListener('click', () => setGuideOpen(true));
  dom.openSettingsBtn?.addEventListener('click', () => setSettingsOpen(true));
  dom.openSettingsBtnSecondary?.addEventListener('click', () => setSettingsOpen(true));
  dom.openGuideBtnSecondary?.addEventListener('click', () => setGuideOpen(true));
  dom.closeSettingsBtn?.addEventListener('click', () => setSettingsOpen(false));
  dom.settingsBackdrop?.addEventListener('click', () => setSettingsOpen(false));
  dom.closeGuideBtn?.addEventListener('click', () => setGuideOpen(false, { remember: true }));
  dom.guideBackdrop?.addEventListener('click', () => setGuideOpen(false, { remember: true }));
  dom.guideStartBtn?.addEventListener('click', () => setGuideOpen(false, { remember: true }));
  dom.guideOpenSettingsBtn?.addEventListener('click', () => {
    setGuideOpen(false, { remember: true, restoreFocus: false });
    setSettingsOpen(true, { restoreFocus: false });
  });
  dom.anchorBtn.addEventListener('click', captureAnchor);
  dom.anchorBtnHero.addEventListener('click', captureAnchor);
  dom.resetAnchorBtn.addEventListener('click', resetAnchor);

  dom.instrumentSelect.addEventListener('change', async (event) => {
    state.instrument = event.target.value;
    persist();
    await syncAudioSettings();
    setStatusText();
  });

  dom.waveformSelect.addEventListener('change', async (event) => {
    state.waveform = event.target.value;
    persist();
    await syncAudioSettings();
  });

  dom.volumeInput.addEventListener('input', async (event) => {
    state.volume = Number(event.target.value);
    dom.volumeValue.textContent = `${state.volume}%`;
    persist();
    await syncAudioSettings();
  });

  dom.modeSelect.addEventListener('change', (event) => {
    state.mode = event.target.value;
    persist();
    setStatusText();
  });

  dom.sensitivityInput.addEventListener('input', (event) => {
    state.sensitivity = Number(event.target.value);
    dom.sensitivityValue.textContent = `${(state.sensitivity / 100).toFixed(2)}x`;
    persist();
  });

  dom.rangeInput.addEventListener('input', (event) => {
    state.range = Number(event.target.value);
    dom.rangeValue.textContent = `${state.range} semitones`;
    dom.rangeValueLabel.textContent = `${state.range} st`;
    state.keyboardOffset = clamp(state.keyboardOffset, -state.range, state.range);
    persist();
  });

  dom.scaleSelect.addEventListener('change', (event) => {
    state.scale = event.target.value;
    persist();
    setAudioHint(`${SCALE_LABELS[state.scale]} scale selected.`, '');
    setStatusText();
  });

  dom.vibratoInput.addEventListener('input', (event) => {
    state.vibrato = Number(event.target.value);
    dom.vibratoValue.textContent = `${state.vibrato}%`;
    persist();
  });

  dom.octaveLockToggle.addEventListener('change', (event) => {
    state.octaveLock = event.target.checked;
    persist();
  });

  dom.sustainToggle.addEventListener('change', (event) => {
    state.sustain = event.target.checked;
    persist();
    if (!state.sustain && state.audioOn) {
      toggleAudio();
    }
  });

  dom.baseNoteSelect.addEventListener('change', (event) => {
    state.baseNote = Number(event.target.value);
    updateAnchorLabels();
    persist();
    captureAnchor();
  });

  dom.octaveSelect.addEventListener('change', (event) => {
    state.octave = Number(event.target.value);
    updateAnchorLabels();
    persist();
    captureAnchor();
  });
}

function renderReadout(noteData, motionResponse) {
  setNodeText(dom.westernNote, noteData.noteName);
  setNodeText(dom.indianNote, noteData.indian.latin);
  setNodeText(dom.hindiNote, noteData.indian.hindi);
  setNodeText(dom.frequencyValue, formatFrequency(noteData.frequency));
  setNodeText(dom.centsValue, `${noteData.cents >= 0 ? '+' : ''}${noteData.cents}¢`);
  setNodeText(dom.sourceBadge, motionResponse.source === 'Ready' ? 'Touch / Keys Ready' : motionResponse.source);
  setNodeText(dom.motionVector, `${motionResponse.vector.x.toFixed(2)} / ${motionResponse.vector.y.toFixed(2)} / ${motionResponse.vector.z.toFixed(2)}`);
  dom.motionSurface.classList.toggle('is-sensor-live', motionResponse.source === 'Motion');
}

function tick(now = performance.now()) {
  if (!state.audioOn) {
    runtimeFrameId = 0;
    return;
  }

  const motionSignalLive = state.motionEnabled && motionController.hasRecentSignal();
  if (motionSignalLive !== state.motionSignalLive) {
    state.motionSignalLive = motionSignalLive;
    setStatusText();
  }

  const anchorMidi = getAnchorMidi();
  const motionResponse = computeMotionResponse({
    mode: state.mode,
    anchorFrame: state.anchorFrame,
    sensorSnapshot: motionController.getSnapshot(),
    pointerState: state.pointer,
    keyboardOffset: state.keyboardOffset,
    sensitivity: state.sensitivity / 100,
    pitchRange: state.range
  });

  let targetMidi = anchorMidi + motionResponse.semitoneOffset;
  targetMidi = snapMidiToScale(targetMidi, state.scale, anchorMidi % 12);

  if (state.octaveLock) {
    const octaveStart = 12 * (Number(state.octave) + 1);
    targetMidi = clamp(targetMidi, octaveStart, octaveStart + 11.999);
  }

  const frequency = midiToFrequency(targetMidi);
  const noteData = getNoteDataFromFrequency(frequency);
  state.currentFrequency = frequency;
  state.currentNoteData = noteData;

  const vibratoCents = motionResponse.vibratoCents * (state.vibrato / 100);
  toneEngine.updateFrequency(frequency, {
    vibratoCents,
    brightness: motionResponse.brightness
  });

  if ((now - state.lastReadoutFrame) >= READOUT_BUDGET_MS) {
    renderReadout(noteData, motionResponse);
    state.lastReadoutFrame = now;
  }

  const renderSignature = `${noteData.noteName}|${noteData.cents}|${motionResponse.source}|${CONTROL_MODES[state.mode]}|${Math.round(frequency * 10)}`;
  if ((now - state.lastVisualFrame) >= RENDER_BUDGET_MS || renderSignature !== state.lastRenderSignature) {
    sonicCanvas.render({
      analyserData: toneEngine.getAnalyserData(),
      noteData,
      meta: { modeLabel: CONTROL_MODES[state.mode] }
    });
    state.lastVisualFrame = now;
    state.lastRenderSignature = renderSignature;
  }

  runtimeFrameId = requestAnimationFrame(tick);
}

function init() {
  applyControlValues();
  updateAnchorLabels();
  setSettingsOpen(false);
  setGuideOpen(false, { restoreFocus: false });
  populateGuideContent();

  renderReadout(state.currentNoteData, getNeutralMotionResponse());
  sonicCanvas.render({
    analyserData: null,
    noteData: state.currentNoteData,
    meta: { modeLabel: CONTROL_MODES[state.mode] }
  });
  setStatusText();
  updatePermissionBanner();
  bindControls();
  bindPointerFallback();
  bindKeyboardFallback();

  window.addEventListener('resize', () => sonicCanvas.resize());
  if (shouldAutoOpenGuide()) {
    requestAnimationFrame(() => {
      setGuideOpen(true, { restoreFocus: false });
    });
  }
}

init();
