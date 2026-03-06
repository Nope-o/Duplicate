// ===== UI System =====

import { NOTE_NAMES, SARGAM_BASE } from './constants.js';
import { nearestNote, makeSargamMapper, noteNameForMidi } from './music-math.js';
import { settings } from './settings.js';

class UISystem {
  constructor() {
    this.keyElements = [];
    this.hindiKeyElements = [];
    this.practiceKeyElements = [];
    this.practiceHindiKeyElements = [];
    this.isPracticeMode = false;
    this.autoTonicCandidate = null;
    this.autoTonicCandidateSince = 0;
    this.autoTonicLastApplied = 0;
    this.helpDismissHandler = null;
  }

  initialize() {
    this.setupSaSelect();
    this.setupKeyboards();
    this.setupControls();
    this.setupTabs();
    this.setupSettings();
  }

  setupSaSelect() {
    const saSelect = document.getElementById('saSelect');
    const saSelectMobile = document.getElementById('saSelectMobile');
    const saSelectSettings = document.getElementById('saSelectSettings');
    
    if (!saSelect) return;

    NOTE_NAMES.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = name;
      saSelect.appendChild(option);
      
      // Also populate mobile select
      if (saSelectMobile) {
        const optionMobile = document.createElement('option');
        optionMobile.value = index;
        optionMobile.textContent = name;
        saSelectMobile.appendChild(optionMobile);
      }

      // Populate settings select
      if (saSelectSettings) {
        const optionSettings = document.createElement('option');
        optionSettings.value = index;
        optionSettings.textContent = name;
        saSelectSettings.appendChild(optionSettings);
      }
    });

    this.setSaSemitone(settings.get('sa'), { persist: false, redraw: true });

    const bindSaChange = (el) => {
      if (!el) return;
      el.addEventListener('change', () => {
        this.setSaSemitone(el.value, { persist: true, redraw: true });
      });
    };

    bindSaChange(saSelect);
    bindSaChange(saSelectMobile);
    bindSaChange(saSelectSettings);
  }

  setSaSemitone(value, { persist = true, redraw = true } = {}) {
    const parsed = parseInt(value, 10);
    const semitone = Number.isFinite(parsed) ? Math.max(0, Math.min(11, parsed)) : 0;

    const saSelect = document.getElementById('saSelect');
    const saSelectMobile = document.getElementById('saSelectMobile');
    const saSelectSettings = document.getElementById('saSelectSettings');

    if (saSelect) saSelect.value = String(semitone);
    if (saSelectMobile) saSelectMobile.value = String(semitone);
    if (saSelectSettings) saSelectSettings.value = String(semitone);

    if (persist) {
      settings.set('sa', semitone);
    }

    if (window.exercises?.syncTargetsToSettings) {
      window.exercises.syncTargetsToSettings();
    }
    window.exercises?.renderBestStatsBadges?.();

    this.refreshKeyLabels();

    if (redraw && window.visualization) {
      const exerciseHint = window.exercises?.getExerciseVisualHint
        ? window.exercises.getExerciseVisualHint()
        : null;
      window.visualization.drawPitchTimeline();
      if (window.app?.isExerciseMode) {
        window.visualization.drawPitchTimeline('exerciseTimeline', exerciseHint);
      }
    }
  }

  setupKeyboards() {
    const kbd = document.getElementById('kbd');
    const kbdHindi = document.getElementById('kbdHindi');
    const kbdPractice = document.getElementById('kbdPractice');
    const kbdHindiPractice = document.getElementById('kbdHindiPractice');

    if (kbd) {
      for (let i = 0; i < 12; i++) {
        const key = document.createElement('div');
        key.className = 'key';
        key.innerHTML = `<div>${NOTE_NAMES[i]}</div><small></small>`;
        kbd.appendChild(key);
        this.keyElements.push(key);
      }
    }

    if (kbdHindi) {
      for (let i = 0; i < 12; i++) {
        const key = document.createElement('div');
        key.className = 'key';
        const sargam = SARGAM_BASE.find(s => s.semis === i);
        key.innerHTML = `<div>${sargam?.hindi || '--'}</div><small></small>`;
        kbdHindi.appendChild(key);
        this.hindiKeyElements.push(key);
      }
    }

    if (kbdPractice) {
      for (let i = 0; i < 12; i++) {
        const key = document.createElement('div');
        key.className = 'key';
        key.innerHTML = `<div>${NOTE_NAMES[i]}</div><small></small>`;
        kbdPractice.appendChild(key);
        this.practiceKeyElements.push(key);
      }
    }

    if (kbdHindiPractice) {
      for (let i = 0; i < 12; i++) {
        const key = document.createElement('div');
        key.className = 'key';
        const sargam = SARGAM_BASE.find(s => s.semis === i);
        key.innerHTML = `<div>${sargam?.hindi || '--'}</div><small></small>`;
        kbdHindiPractice.appendChild(key);
        this.practiceHindiKeyElements.push(key);
      }
    }

    this.refreshKeyLabels();
  }

  refreshKeyLabels() {
    const saSelect = document.getElementById('saSelect');
    const saSemi = saSelect ? parseInt(saSelect.value, 10) : 0;
    const mapper = makeSargamMapper(saSemi);

    for (let i = 0; i < 12; i++) {
      if (this.keyElements[i]) {
        this.keyElements[i].querySelector('small').textContent = '';
      }
      if (this.practiceKeyElements[i]) {
        this.practiceKeyElements[i].querySelector('small').textContent = '';
      }
      mapper(60 + i);
    }
  }

  setupControls() {
    // Low cut filter
    const lowCut = document.getElementById('lowCut');
    const lowCutVal = document.getElementById('lowCutVal');
    const lowCutMobile = document.getElementById('lowCutMobile');
    const lowCutValMobile = document.getElementById('lowCutValMobile');
    const lowCutSettings = document.getElementById('lowCutSettings');
    const lowCutValSettings = document.getElementById('lowCutValSettings');
    const applyLowCut = (value) => {
      const v = Math.max(50, Math.min(200, parseInt(value, 10) || 70));
      if (lowCut) lowCut.value = String(v);
      if (lowCutMobile) lowCutMobile.value = String(v);
      if (lowCutSettings) lowCutSettings.value = String(v);
      if (lowCutVal) lowCutVal.textContent = `${v}Hz`;
      if (lowCutValMobile) lowCutValMobile.textContent = `${v}Hz`;
      if (lowCutValSettings) lowCutValSettings.textContent = `${v}Hz`;
      settings.set('lowCut', v);
      window.audio?.updateLowCutFilter(v);
    };
    if (lowCut) lowCut.addEventListener('input', () => applyLowCut(lowCut.value));
    if (lowCutMobile) lowCutMobile.addEventListener('input', () => applyLowCut(lowCutMobile.value));
    if (lowCutSettings) lowCutSettings.addEventListener('input', () => applyLowCut(lowCutSettings.value));
    applyLowCut(settings.get('lowCut'));

    // RMS gate
    const rmsGate = document.getElementById('rmsGate');
    const rmsGateVal = document.getElementById('rmsGateVal');
    const rmsGateMobile = document.getElementById('rmsGateMobile');
    const rmsGateValMobile = document.getElementById('rmsGateValMobile');
    const rmsGateSettings = document.getElementById('rmsGateSettings');
    const rmsGateValSettings = document.getElementById('rmsGateValSettings');
    const applyRmsGate = (value) => {
      const v = Math.max(1, Math.min(50, parseInt(value, 10) || 5));
      const display = (v / 1000).toFixed(3);
      if (rmsGate) rmsGate.value = String(v);
      if (rmsGateMobile) rmsGateMobile.value = String(v);
      if (rmsGateSettings) rmsGateSettings.value = String(v);
      if (rmsGateVal) rmsGateVal.textContent = display;
      if (rmsGateValMobile) rmsGateValMobile.textContent = display;
      if (rmsGateValSettings) rmsGateValSettings.textContent = display;
      settings.set('rmsGate', v);
    };
    if (rmsGate) rmsGate.addEventListener('input', () => applyRmsGate(rmsGate.value));
    if (rmsGateMobile) rmsGateMobile.addEventListener('input', () => applyRmsGate(rmsGateMobile.value));
    if (rmsGateSettings) rmsGateSettings.addEventListener('input', () => applyRmsGate(rmsGateSettings.value));
    applyRmsGate(settings.get('rmsGate'));

    // Clarity gate
    const clarityGate = document.getElementById('clarityGate');
    const clarityGateVal = document.getElementById('clarityGateVal');
    const clarityGateMobile = document.getElementById('clarityGateMobile');
    const clarityGateValMobile = document.getElementById('clarityGateValMobile');
    const clarityGateSettings = document.getElementById('clarityGateSettings');
    const clarityGateValSettings = document.getElementById('clarityGateValSettings');
    const applyClarityGate = (value) => {
      const v = Math.max(20, Math.min(80, parseInt(value, 10) || 35));
      const display = (v / 100).toFixed(2);
      if (clarityGate) clarityGate.value = String(v);
      if (clarityGateMobile) clarityGateMobile.value = String(v);
      if (clarityGateSettings) clarityGateSettings.value = String(v);
      if (clarityGateVal) clarityGateVal.textContent = display;
      if (clarityGateValMobile) clarityGateValMobile.textContent = display;
      if (clarityGateValSettings) clarityGateValSettings.textContent = display;
      settings.set('clarityGate', v);
    };
    if (clarityGate) clarityGate.addEventListener('input', () => applyClarityGate(clarityGate.value));
    if (clarityGateMobile) clarityGateMobile.addEventListener('input', () => applyClarityGate(clarityGateMobile.value));
    if (clarityGateSettings) clarityGateSettings.addEventListener('input', () => applyClarityGate(clarityGateSettings.value));
    applyClarityGate(settings.get('clarityGate'));

    // History duration
    const historyDuration = document.getElementById('historyDuration');
    const historyDurationVal = document.getElementById('historyDurationVal');
    const applyHistoryDuration = (value) => {
      const v = Math.max(3, Math.min(15, parseInt(value, 10) || 5));
      if (historyDuration) historyDuration.value = String(v);
      if (historyDurationVal) historyDurationVal.textContent = `${v}s`;
      settings.set('historyDuration', v);
      if (window.visualization) {
        window.visualization.setTimelineDuration(v * 1000);
      }
    };
    if (historyDuration && historyDurationVal) {
      historyDuration.addEventListener('input', () => applyHistoryDuration(historyDuration.value));
    }
    applyHistoryDuration(settings.get('historyDuration'));

    // Smoothing factor
    const smoothingFactor = document.getElementById('smoothingFactor');
    const smoothingFactorVal = document.getElementById('smoothingFactorVal');
    const applySmoothingFactor = (value) => {
      const parsed = parseInt(value, 10);
      const v = Math.max(0, Math.min(90, Number.isFinite(parsed) ? parsed : 30));
      const factor = v / 100;
      if (smoothingFactor) smoothingFactor.value = String(v);
      if (smoothingFactorVal) smoothingFactorVal.textContent = factor.toFixed(1);
      settings.set('smoothingFactor', v);
      if (window.app?.pitchSmoother) {
        window.app.pitchSmoother.setSmoothingFactor(factor);
      }
    };
    if (smoothingFactor && smoothingFactorVal) {
      smoothingFactor.addEventListener('input', () => applySmoothingFactor(smoothingFactor.value));
    }
    applySmoothingFactor(settings.get('smoothingFactor'));

    // Metronome BPM
    const metronomeBpm = document.getElementById('metronomeBpm');
    const metronomeBpmVal = document.getElementById('metronomeBpmVal');
    const metronomeBeats = document.getElementById('metronomeBeats');
    if (metronomeBpm && metronomeBpmVal) {
      metronomeBpm.addEventListener('input', () => {
        if (window.metronome?.setBPM) {
          window.metronome.setBPM(parseInt(metronomeBpm.value, 10), { restartIfRunning: false });
        } else {
          metronomeBpmVal.textContent = metronomeBpm.value;
        }
      });
      metronomeBpm.addEventListener('change', () => {
        if (window.metronome?.setBPM) {
          window.metronome.setBPM(parseInt(metronomeBpm.value, 10), { restartIfRunning: true });
        }
      });
      if (window.metronome?.setBPM) {
        window.metronome.setBPM(parseInt(metronomeBpm.value, 10), { restartIfRunning: false });
      } else {
        metronomeBpmVal.textContent = metronomeBpm.value;
      }
    }
    if (metronomeBeats) {
      metronomeBeats.addEventListener('change', () => {
        if (window.metronome?.setBeats) {
          window.metronome.setBeats(parseInt(metronomeBeats.value, 10), { restartIfRunning: true });
        }
      });
      if (window.metronome?.setBeats) {
        window.metronome.setBeats(parseInt(metronomeBeats.value, 10), { restartIfRunning: false });
      }
    }

    // FPS limit
    const fpsLimit = document.getElementById('fpsLimit');
    const applyFpsLimit = (value) => {
      const fps = Math.max(10, Math.min(120, parseInt(value, 10) || 30));
      if (fpsLimit) fpsLimit.value = String(fps);
      settings.set('fpsLimit', fps);
      if (window.visualization) {
        window.visualization.setFPSLimit(fps);
      }
    };
    if (fpsLimit) {
      fpsLimit.addEventListener('change', () => applyFpsLimit(fpsLimit.value));
    }
    applyFpsLimit(settings.get('fpsLimit'));

    const sessionReplayVoice = document.getElementById('sessionReplayVoice');
    const sessionReplayLevel = document.getElementById('sessionReplayLevel');
    const sessionReplayLevelVal = document.getElementById('sessionReplayLevelVal');
    const allowedReplayVoices = ['violin', 'clarinet', 'flute', 'clean'];
    const applySessionReplayVoice = (value) => {
      const voice = allowedReplayVoices.includes(value) ? value : 'violin';
      if (sessionReplayVoice) sessionReplayVoice.value = voice;
      settings.set('sessionReplayVoice', voice);
      window.sessions?.setPlaybackVoice?.(voice);
    };
    const applySessionReplayLevel = (value) => {
      const parsed = parseInt(value, 10);
      const level = Math.max(35, Math.min(100, Number.isFinite(parsed) ? parsed : 78));
      if (sessionReplayLevel) sessionReplayLevel.value = String(level);
      if (sessionReplayLevelVal) sessionReplayLevelVal.textContent = `${level}%`;
      settings.set('sessionReplayLevel', level);
      window.sessions?.setPlaybackLevel?.(level);
    };
    if (sessionReplayVoice) {
      sessionReplayVoice.addEventListener('change', () => applySessionReplayVoice(sessionReplayVoice.value));
    }
    if (sessionReplayLevel) {
      sessionReplayLevel.addEventListener('input', () => applySessionReplayLevel(sessionReplayLevel.value));
    }
    applySessionReplayVoice(settings.get('sessionReplayVoice'));
    applySessionReplayLevel(settings.get('sessionReplayLevel'));

    // Exercise difficulty
    const exerciseDifficulty = document.getElementById('exerciseDifficulty');
    const exerciseDifficultyInline = document.getElementById('exerciseDifficultyInline');
    const exerciseRegister = document.getElementById('exerciseRegister');
    const exerciseRegisterInline = document.getElementById('exerciseRegisterInline');
    const allowedDifficulties = ['beginner', 'normal', 'strict'];
    const allowedRegisters = ['low', 'mid', 'high'];
    const applyExerciseDifficulty = (value) => {
      const level = allowedDifficulties.includes(value) ? value : 'normal';
      if (exerciseDifficulty) exerciseDifficulty.value = level;
      if (exerciseDifficultyInline) exerciseDifficultyInline.value = level;
      settings.set('exerciseDifficulty', level);
      if (window.exercises?.syncDifficultyToSettings) {
        window.exercises.syncDifficultyToSettings();
      }
      window.exercises?.renderBestStatsBadges?.();
    };
    if (exerciseDifficulty) {
      exerciseDifficulty.addEventListener('change', () => {
        applyExerciseDifficulty(exerciseDifficulty.value);
      });
    }
    if (exerciseDifficultyInline) {
      exerciseDifficultyInline.addEventListener('change', () => {
        applyExerciseDifficulty(exerciseDifficultyInline.value);
      });
    }
    applyExerciseDifficulty(settings.get('exerciseDifficulty'));

    const applyExerciseRegister = (value) => {
      const register = allowedRegisters.includes(value) ? value : 'low';
      if (exerciseRegister) exerciseRegister.value = register;
      if (exerciseRegisterInline) exerciseRegisterInline.value = register;
      settings.set('exerciseRegister', register);
      if (window.exercises?.syncTargetsToSettings) {
        window.exercises.syncTargetsToSettings();
      }
      window.exercises?.renderBestStatsBadges?.();
    };
    if (exerciseRegister) {
      exerciseRegister.addEventListener('change', () => {
        applyExerciseRegister(exerciseRegister.value);
      });
    }
    if (exerciseRegisterInline) {
      exerciseRegisterInline.addEventListener('change', () => {
        applyExerciseRegister(exerciseRegisterInline.value);
      });
    }
    applyExerciseRegister(settings.get('exerciseRegister'));

    // Dark mode toggle
    const darkMode = document.getElementById('darkMode');
    if (darkMode) {
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      const applyTheme = (dark) => {
        document.body.classList.toggle('light-mode', !dark);
        document.body.classList.toggle('dark-mode-forced', dark);
        if (themeMeta) {
          themeMeta.setAttribute('content', dark ? '#0b1020' : '#f5f8fc');
        }
      };

      const isDark = settings.get('darkMode');
      darkMode.checked = isDark;
      applyTheme(isDark);

      darkMode.addEventListener('change', () => {
        const dark = darkMode.checked;
        settings.set('darkMode', dark);
        applyTheme(dark);
      });
    }
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active from all tabs
        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });

        // Remove active from all tab contents
        document.querySelectorAll('.tab-content').forEach(c => {
          c.classList.remove('active');
        });

        // Activate clicked tab
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        // Activate corresponding content
        const tabName = tab.dataset.tab;
        const content = document.getElementById(tabName + 'Tab');
        if (content) {
          content.classList.add('active');
        }
      });
    });

    // Swipe navigation for mobile
    this.setupSwipeNavigation();
  }

  setupSwipeNavigation() {
    let startX = 0;
    let startY = 0;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', (e) => {
      // Don't swipe during recording
      if (window.recording?.getRecordingState()) return;

      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      // Check if horizontal swipe (not vertical scroll)
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;

      const tabs = Array.from(document.querySelectorAll('.tab'));
      const activeIndex = tabs.findIndex(t => t.classList.contains('active'));

      if (dx < 0 && activeIndex < tabs.length - 1) {
        tabs[activeIndex + 1].click();
      } else if (dx > 0 && activeIndex > 0) {
        tabs[activeIndex - 1].click();
      }
    });
  }

  setupSettings() {
    const bindCheckboxSetting = (id, key, onChange) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.checked = Boolean(settings.get(key));
      if (typeof onChange === 'function') {
        onChange(el.checked);
      }

      el.addEventListener('change', () => {
        settings.set(key, el.checked);
        if (typeof onChange === 'function') {
          onChange(el.checked);
        }
      });
    };

    bindCheckboxSetting('showHarmonics', 'showHarmonics');
    bindCheckboxSetting('autoTuneVisualization', 'autoTuneVisualization');
    bindCheckboxSetting('showFormants', 'showFormants');
    bindCheckboxSetting('playExerciseTargetPrompt', 'playExerciseTargetPrompt');

    const autoTonicDetection = document.getElementById('autoTonicDetection');
    if (autoTonicDetection) {
      const enabled = settings.get('autoTonicDetection');
      autoTonicDetection.checked = enabled;

      autoTonicDetection.addEventListener('change', () => {
        settings.set('autoTonicDetection', autoTonicDetection.checked);
        this.resetAutoTonicState();
      });
    }
  }

  resetAutoTonicState() {
    this.autoTonicCandidate = null;
    this.autoTonicCandidateSince = 0;
    this.autoTonicLastApplied = 0;
  }

  tryAutoDetectTonic(midi, cents, clarity) {
    const autoTonicDetection = document.getElementById('autoTonicDetection');
    if (!autoTonicDetection || !autoTonicDetection.checked) {
      this.autoTonicCandidate = null;
      this.autoTonicCandidateSince = 0;
      return;
    }

    // Require a stable, in-tune note before detecting tonic.
    const stablePitch = Math.abs(cents) <= 12 && clarity >= 0.6;
    if (!stablePitch) {
      this.autoTonicCandidate = null;
      this.autoTonicCandidateSince = 0;
      return;
    }

    const semitone = ((midi % 12) + 12) % 12;
    const now = performance.now();

    if (this.autoTonicCandidate !== semitone) {
      this.autoTonicCandidate = semitone;
      this.autoTonicCandidateSince = now;
      return;
    }

    // Hold the same note long enough, then apply with a cooldown.
    if (now - this.autoTonicCandidateSince < 1200) return;
    if (now - this.autoTonicLastApplied < 2500) return;

    const saSelect = document.getElementById('saSelect');
    const saSelectMobile = document.getElementById('saSelectMobile');
    if (!saSelect) return;

    if (parseInt(saSelect.value, 10) !== semitone || (saSelectMobile && parseInt(saSelectMobile.value, 10) !== semitone)) {
      this.setSaSemitone(semitone, { persist: true, redraw: true });
    }

    this.autoTonicLastApplied = now;
  }

  updateReadout(freq, clarity, rms, signalState = null, insightState = null) {
    const freqEl = document.getElementById('freq');
    const noteEl = document.getElementById('note');
    const sargamEl = document.getElementById('sargam');
    const qualityEl = document.getElementById('quality');
    const meterPointer = document.getElementById('meterPointer');
    const srEl = document.getElementById('sr');
    const rmsEl = document.getElementById('rms');
    const clarityEl = document.getElementById('clarity');

    // Update sample rate, RMS, clarity
    const sampleRate = window.audio?.getSampleRate() || 0;
    if (srEl) srEl.textContent = sampleRate ? `${sampleRate}Hz` : '--';
    if (rmsEl) rmsEl.textContent = rms.toFixed(4);
    if (clarityEl) clarityEl.textContent = clarity.toFixed(2);

    // Format frequency display
    const formatFreqHtml = (value) => {
      const [intPart, fracPart] = value.toFixed(2).split('.');
      return `<span class="freq-value"><span class="freq-int">${intPart}</span><span class="hz-decimal">.${fracPart}</span></span><span class="hz"> Hz</span>`;
    };

    const setQualityState = (text, stateClass) => {
      if (!qualityEl) return;
      qualityEl.classList.remove('status-idle', 'status-silent', 'status-unclear', 'status-active');
      qualityEl.classList.add(stateClass);
      qualityEl.textContent = text;
    };

    if (!freq) {
      if (freqEl) freqEl.innerHTML = formatFreqHtml(0);
      if (noteEl) noteEl.textContent = '--';
      if (sargamEl) sargamEl.textContent = 'Sa —';

      if (signalState && signalState.running === false) {
        setQualityState('Microphone stopped', 'status-idle');
      } else if (signalState && signalState.rms <= signalState.rmsGate) {
        setQualityState('Mic active - no voice detected', 'status-silent');
      } else if (signalState && signalState.rawFreq > 0 && signalState.hasSignal === false) {
        setQualityState('Detecting stable pitch...', 'status-silent');
      } else if (signalState && signalState.clarity < signalState.clarityGate) {
        setQualityState('Mic active - pitch unclear', 'status-unclear');
      } else {
        setQualityState('Listening...', 'status-idle');
      }

      if (meterPointer) meterPointer.style.left = '50%';
      this.updateMicInsightsPanel('', signalState?.running === true, insightState);

      this.keyElements.forEach(el => el.classList.remove('active'));
      this.hindiKeyElements.forEach(el => el.classList.remove('active'));
      if (this.isPracticeMode) {
        this.updatePracticeMode({
          freq: 0,
          cents: 0,
          name: '--',
          octave: '',
          sargam: { name: 'Sa —' },
          qualityText: qualityEl ? qualityEl.textContent : 'Microphone stopped',
          sampleRate,
          rms,
          clarity,
          keyIndex: null,
          insightState,
          hasPitch: false
        });
      }
      return;
    }

    const { midi, cents } = nearestNote(freq);
    this.tryAutoDetectTonic(midi, cents, clarity);

    const saSelect = document.getElementById('saSelect');
    const saSemi = saSelect ? parseInt(saSelect.value, 10) : 0;
    const sargam = makeSargamMapper(saSemi)(midi);
    const displayNote = noteNameForMidi(midi, saSemi);

    if (freqEl) freqEl.innerHTML = formatFreqHtml(freq);
    if (noteEl) noteEl.textContent = displayNote;
    if (sargamEl) sargamEl.textContent = sargam.name;
    setQualityState(`${cents > 0 ? '+' : ''}${cents.toFixed(1)}¢`, 'status-active');

    // Update meter
    if (meterPointer) {
      const x = Math.max(-50, Math.min(50, cents));
      meterPointer.style.left = `${x + 50}%`;
    }

    // Update keyboard
    const keyIndex = ((midi % 12) + 12) % 12;
    const sargamKeyIndex = ((midi - saSemi) % 12 + 12) % 12;
    this.keyElements.forEach((el, i) => {
      el.classList.toggle('active', i === keyIndex);
    });
    this.hindiKeyElements.forEach((el, i) => {
      el.classList.toggle('active', i === sargamKeyIndex);
    });
    this.updateMicInsightsPanel('', true, insightState);

    // Update practice mode if active
    if (this.isPracticeMode) {
      this.updatePracticeMode({
        freq,
        cents,
        displayNote,
        sargam,
        qualityText: `${cents > 0 ? '+' : ''}${cents.toFixed(1)}¢`,
        sampleRate,
        rms,
        clarity,
        keyIndex,
        sargamKeyIndex,
        insightState,
        hasPitch: true
      });
    }
  }

  updatePracticeMode({ freq, cents, displayNote, sargam, qualityText, sampleRate, rms, clarity, keyIndex, sargamKeyIndex, insightState, hasPitch }) {
    const practiceFreq = document.getElementById('practiceFreq');
    const practiceNote = document.getElementById('practiceNote');
    const practiceSargam = document.getElementById('practiceSargam');
    const practiceQuality = document.getElementById('practiceQuality');
    const meterPointerPractice = document.getElementById('meterPointerPractice');
    const practiceSr = document.getElementById('practiceSr');
    const practiceRms = document.getElementById('practiceRms');
    const practiceClarity = document.getElementById('practiceClarity');

    const formatFreqHtml = (value) => {
      const [intPart, fracPart] = value.toFixed(2).split('.');
      return `<span class="freq-value"><span class="freq-int">${intPart}</span><span class="hz-decimal">.${fracPart}</span></span><span class="hz"> Hz</span>`;
    };

    if (practiceFreq) practiceFreq.innerHTML = formatFreqHtml(freq || 0);
    if (practiceNote) practiceNote.textContent = freq ? displayNote : '--';
    if (practiceSargam) practiceSargam.textContent = freq ? sargam.name : 'Sa —';
    if (practiceQuality) practiceQuality.textContent = qualityText || 'Listening...';
    if (practiceSr) practiceSr.textContent = sampleRate ? `${sampleRate}Hz` : '--';
    if (practiceRms) practiceRms.textContent = (rms || 0).toFixed(4);
    if (practiceClarity) practiceClarity.textContent = (clarity || 0).toFixed(2);

    const exerciseHint = window.exercises?.getExerciseVisualHint
      ? window.exercises.getExerciseVisualHint()
      : null;
    const targetMidi = Number.isFinite(exerciseHint?.targetMidi) ? exerciseHint.targetMidi : null;
    const targetIndex = targetMidi === null ? null : ((targetMidi % 12) + 12) % 12;
    const saSelect = document.getElementById('saSelect');
    const saSemi = saSelect ? parseInt(saSelect.value, 10) : 0;
    const targetSargamIndex = targetMidi === null ? null : ((targetMidi - saSemi) % 12 + 12) % 12;

    if (meterPointerPractice) {
      if (!freq) {
        meterPointerPractice.style.left = '50%';
      } else {
        const x = Math.max(-50, Math.min(50, cents));
        meterPointerPractice.style.left = `${x + 50}%`;
      }
    }

    this.practiceKeyElements.forEach((el, i) => {
      el.classList.toggle('target-key', targetIndex !== null && i === targetIndex);
      el.classList.toggle('active', keyIndex !== null && i === keyIndex);
    });
    this.practiceHindiKeyElements.forEach((el, i) => {
      el.classList.toggle('target-key', targetSargamIndex !== null && i === targetSargamIndex);
      el.classList.toggle('active', sargamKeyIndex !== null && i === sargamKeyIndex);
    });

    if (keyIndex === null) {
      this.practiceKeyElements.forEach(el => el.classList.remove('active'));
      this.practiceHindiKeyElements.forEach(el => el.classList.remove('active'));
    }
    this.updateMicInsightsPanel('practice', Boolean(hasPitch), insightState);
  }

  updateMicInsightsPanel(prefix, isActive, insightState) {
    const idPrefix = prefix ? `${prefix}` : '';
    const toneEl = document.getElementById(`${idPrefix}ToneQuality`);
    const stabilityEl = document.getElementById(`${idPrefix}StabilityScore`);
    const biasEl = document.getElementById(`${idPrefix}BiasText`);
    const biasHintEl = document.getElementById(`${idPrefix}BiasHint`);
    const panelEl = document.getElementById(`${idPrefix}MicPowerStrip`);
    const panel = panelEl || document.getElementById('micPowerStrip');

    const hasInsight = insightState && typeof insightState === 'object';
    const tone = hasInsight ? Math.round(insightState.toneQuality || 0) : 0;
    const stability = hasInsight ? Math.round(insightState.stability || 0) : 0;
    const biasText = hasInsight && insightState.biasText ? insightState.biasText : 'Bias: learning';
    const biasHint = hasInsight && insightState.biasHint ? insightState.biasHint : 'Hold a steady note';

    if (toneEl) toneEl.textContent = isActive || hasInsight ? `${tone}` : '--';
    if (stabilityEl) stabilityEl.textContent = isActive || hasInsight ? `${stability}` : '--';
    if (biasEl) biasEl.textContent = biasText;
    if (biasHintEl) biasHintEl.textContent = biasHint;
    if (panel) panel.classList.toggle('is-idle', !isActive);
  }

  showHelp() {
    const overlay = document.getElementById('helpOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    // Close help on first touch/click anywhere.
    this.helpDismissHandler = () => this.hideHelp();
    setTimeout(() => {
      if (this.helpDismissHandler) {
        document.addEventListener('pointerdown', this.helpDismissHandler, { once: true, capture: true });
      }
    }, 0);
  }

  hideHelp() {
    const overlay = document.getElementById('helpOverlay');
    if (overlay) overlay.style.display = 'none';
    if (this.helpDismissHandler) {
      document.removeEventListener('pointerdown', this.helpDismissHandler, true);
      this.helpDismissHandler = null;
    }
  }

  hidePermissionOverlay() {
    const overlay = document.getElementById('permissionOverlay');
    if (overlay) overlay.style.display = 'none';
  }
}

// Create singleton
export const ui = new UISystem();

// Make globally accessible
window.ui = ui;
