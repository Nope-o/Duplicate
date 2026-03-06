import { CONFIG } from './constants.js';
import { audio } from './audio.js';
import { detectPitch, PitchSmoother, SignalDetector } from './pitch-detection.js';
import { visualization } from './visualization.js';
import { recording } from './recording.js';
import { sessions } from './sessions.js';
import { exercises } from './exercises.js';
import { metronome } from './metronome.js';
import { stats } from './stats.js';
import { ui } from './ui.js';
import { settings } from './settings.js';
import { performanceInsights } from './performance-insights.js';
import { trackEvent as trackAnalyticsEvent } from './analytics.js';

class PitchVisualizerApp {
  constructor() {
    this.running = false;
    this.animationFrameId = null;
    this.timeDomainBuffer = null;
    this.pitchSmoother = new PitchSmoother(0.3);
    this.signalDetector = new SignalDetector();
    this.isPracticeMode = false;
    this.isExerciseMode = false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      console.warn('App already initialized');
      return;
    }

    try {
      console.log('🎵 Initializing SurSight Studio...');
      console.log('→ Initializing UI...');
      ui.initialize();
      console.log('→ Initializing visualizations...');
      visualization.initialize();
      console.log('→ Loading sessions...');
      sessions.renderSessions();
      exercises.renderBestStatsBadges?.();
      console.log('→ Setting up event listeners...');
      this.setupEventListeners();
      this.setupBasicSourceProtection();
      this.restoreUIState();
      this.setupVisibilityHandler();
      this.checkMicrophonePermission();
      this.initialized = true;
      console.log('✅ SurSight Studio initialized successfully');
      trackAnalyticsEvent('sursight_opened', { version: '2.4.14' }, { dedupeKey: 'sursight_opened_once' });
      this.updateAdvancedEmptyState();
      this.checkFirstTimeUser();
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      this.handleInitializationError(error);
    }
  }

  setupEventListeners() {
    window.addEventListener('audioStarted', () => {
      console.log('🎙️ Audio started');
      trackAnalyticsEvent('tool_session_started', {
        source: 'sursight_studio',
        sa: settings.get('sa'),
        difficulty: settings.get('exerciseDifficulty'),
        octave: settings.get('exerciseRegister')
      });
      this.running = true;
      this.timeDomainBuffer = null;
      this.pitchSmoother.reset();
      this.signalDetector.reset();
      performanceInsights.resetLiveState();
      this.updateAdvancedEmptyState();
      this.startMainLoop();
    });

    window.addEventListener('audioStopped', () => {
      console.log('🛑 Audio stopped');
      trackAnalyticsEvent('tool_session_stopped', { source: 'sursight_studio' });
      this.running = false;
      this.stopMainLoop();
      this.resetState();
      this.updateAdvancedEmptyState();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcut(e);
    });

    // Window beforeunload (warn if recording)
    window.addEventListener('beforeunload', (e) => {
      if (recording.getRecordingState()) {
        e.preventDefault();
        e.returnValue = 'You have an active recording. Are you sure you want to leave?';
      }
    });
  }

  setupBasicSourceProtection() {
    // Beginner-level deterrent only: blocks easy inspect actions in browser UI.
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
      const key = String(e.key || '').toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // F12 (DevTools)
      if (key === 'f12') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl/Cmd + Shift + I/J/C/K (Inspect/Console/Styles/Search)
      const isCtrlShiftDevtools = ctrlOrMeta && shift && ['i', 'j', 'c', 'k'].includes(key);
      // Cmd + Option + I/J/C/K (macOS DevTools variants)
      const isMacAltDevtools = e.metaKey && alt && ['i', 'j', 'c', 'k'].includes(key);
      // Ctrl/Cmd + U (View Source)
      const isViewSource = ctrlOrMeta && key === 'u';

      if (isCtrlShiftDevtools || isMacAltDevtools || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  handleKeyboardShortcut(e) {
    // Don't trigger if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key.toLowerCase()) {
      case ' ': // Space - Start/Stop
        e.preventDefault();
        if (audio.isRunning()) {
          audio.stop();
        } else {
          audio.start();
        }
        break;
      case 'r': // R - Toggle recording
        if (audio.isRunning()) {
          recording.toggle();
        }
        break;
      case 'p': // P - Toggle practice mode
        this.togglePracticeMode();
        break;
      case 'h': // H - Show help
        ui.showHelp();
        break;
      case 'escape': // ESC - Exit practice mode or close overlays
        if (this.isExerciseMode) {
          exercises.stop();
        }
        ui.hideHelp();
        break;
    }
  }

  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('⏸️ Tab hidden - pausing rendering');
        // Pause rendering when tab is hidden (save battery/CPU)
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
      } else {
        console.log('▶️ Tab visible - resuming rendering');
        // Resume rendering when tab is visible
        if (this.running && !this.animationFrameId) {
          this.startMainLoop();
        }
      }
    });
  }

  async checkMicrophonePermission() {
    try {
      // Check if Permissions API is supported
      if (!navigator.permissions) {
        console.log('Permissions API not supported');
        return;
      }

      const result = await navigator.permissions.query({ name: 'microphone' });
      
      console.log(`🎤 Microphone permission: ${result.state}`);

      if (result.state === 'denied') {
        const overlay = document.getElementById('permissionOverlay');
        if (overlay) overlay.style.display = 'flex';
      }

      // Listen for permission changes
      result.addEventListener('change', () => {
        console.log(`🎤 Microphone permission changed to: ${result.state}`);
        if (result.state === 'granted') {
          ui.hidePermissionOverlay();
        }
      });
    } catch (error) {
      console.log('Permission API not fully supported:', error.message);
      // Not critical - user will be prompted when clicking start
    }
  }

  checkFirstTimeUser() {
    const hasVisited = localStorage.getItem('sursightStudioVisited');
    if (!hasVisited) {
      console.log('👋 First time user detected');
      localStorage.setItem('sursightStudioVisited', 'true');
      setTimeout(() => {
        ui.showHelp();
      }, 700);
    }
  }

  getTimeDomainBuffer(analyser) {
    if (!analyser) return null;
    const size = analyser.fftSize;
    if (!(this.timeDomainBuffer instanceof Float32Array) || this.timeDomainBuffer.length !== size) {
      this.timeDomainBuffer = new Float32Array(size);
    }
    return this.timeDomainBuffer;
  }

  startMainLoop() {
    if (!this.running) {
      console.warn('Cannot start loop - not running');
      return;
    }

    if (this.animationFrameId) {
      console.warn('Loop already running');
      return;
    }

    console.log('🔄 Starting main loop');

    const loop = () => {
      if (!this.running) return;

      try {
        if (!visualization.shouldRenderFrame()) {
          this.animationFrameId = requestAnimationFrame(loop);
          return;
        }
        const analyser = audio.getAnalyser();
        if (!analyser) {
          console.warn('No analyser available');
          this.animationFrameId = requestAnimationFrame(loop);
          return;
        }
        const buffer = this.getTimeDomainBuffer(analyser);
        if (!buffer) {
          this.animationFrameId = requestAnimationFrame(loop);
          return;
        }
        analyser.getFloatTimeDomainData(buffer);
        const minF = settings.get('lowCut');
        const rmsGateVal = settings.get('rmsGate') / 1000;
        const clarityGateVal = settings.get('clarityGate') / 100;
        const sampleRate = audio.getSampleRate();
        const pitchResult = detectPitch(buffer, sampleRate, minF, rmsGateVal, clarityGateVal);
        const now = performance.now();
        const hasSignal = this.signalDetector.update(pitchResult.freq > 0, now);
        let displayFreq = 0;
        if (hasSignal && pitchResult.freq > 0) {
          displayFreq = this.pitchSmoother.smooth(pitchResult.freq);
        } else if (!hasSignal) {
          this.pitchSmoother.reset();
          displayFreq = 0;
        }
        const insightState = performanceInsights.update({
          analyser,
          sampleRate,
          freq: displayFreq || pitchResult.freq,
          clarity: pitchResult.clarity,
          rms: pitchResult.rms,
          hasSignal,
          timestamp: now
        });

        this.updateSystems(displayFreq, pitchResult, analyser, {
          running: this.running,
          hasSignal,
          rawFreq: pitchResult.freq,
          clarity: pitchResult.clarity,
          rms: pitchResult.rms,
          rmsGate: rmsGateVal,
          clarityGate: clarityGateVal
        }, insightState);
      } catch (error) {
        console.error('Error in main loop:', error);
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  updateSystems(displayFreq, pitchResult, analyser, signalState, insightState = null) {
    visualization.addPitchPoint(displayFreq);
    if (recording.getRecordingState()) {
      const freqForRecording = displayFreq > 0 ? displayFreq : (pitchResult.freq > 0 ? pitchResult.freq : 0);
      recording.addDataPoint(freqForRecording, pitchResult.clarity, pitchResult.rms);
    }
    if (exercises.getCurrentExercise()) {
      exercises.updateProgress(displayFreq, pitchResult.clarity);
    }
    ui.updateReadout(displayFreq, pitchResult.clarity, pitchResult.rms, signalState, insightState);
    stats.update(visualization.pitchHistory, visualization.timelineDuration);
    if (this.isExerciseMode) {
      const exerciseHint = exercises.getExerciseVisualHint
        ? exercises.getExerciseVisualHint()
        : null;
      visualization.drawPitchTimeline('exerciseTimeline', exerciseHint);
      return;
    }
    visualization.drawPitchTimeline();
    if (this.isAdvancedGraphsVisible()) {
      visualization.drawSpectrum(analyser);
      visualization.drawWaveform(analyser);
      visualization.drawHarmonics(analyser);
      visualization.drawIntonationHeatmap();
    }
  }
  isAdvancedGraphsVisible() {
    const graphs = document.getElementById('advancedGraphs');
    if (!graphs) return false;
    return window.getComputedStyle(graphs).display !== 'none';
  }

  stopMainLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resetState() {
    this.timeDomainBuffer = null;
    this.pitchSmoother.reset();
    this.signalDetector.reset();
    performanceInsights.resetLiveState();
    visualization.clearHistory();
    ui.updateReadout(0, 0, 0, { running: false }, null);

    if (recording.getRecordingState()) {
      recording.stop();
    }
  }

  togglePracticeMode() {
    if (this.isExerciseMode) {
      this.exitExerciseMode();
      return;
    }
    this.enterExerciseMode();
  }

  enterExerciseMode() {
    if (this.isExerciseMode) return;
    trackAnalyticsEvent('practice_mode_entered', {
      sa: settings.get('sa'),
      difficulty: settings.get('exerciseDifficulty'),
      octave: settings.get('exerciseRegister')
    });
    this.isExerciseMode = true;
    this.isPracticeMode = true;

    const mainView = document.getElementById('mainView');
    const practiceView = document.getElementById('practiceView');
    const practiceBtn = document.getElementById('practiceBtn');
    if (mainView) mainView.style.display = 'none';
    if (practiceView) practiceView.style.display = 'flex';
    if (practiceBtn) practiceBtn.textContent = '⛌ Exit Practice';

    const exerciseTimeline = document.getElementById('exerciseTimeline');
    if (exerciseTimeline) {
      visualization.canvases.exerciseTimeline = exerciseTimeline;
      visualization.contexts.exerciseTimeline = exerciseTimeline.getContext('2d');
      visualization.fitCanvas(exerciseTimeline);
      const exerciseHint = exercises.getExerciseVisualHint
        ? exercises.getExerciseVisualHint()
        : null;
      visualization.drawPitchTimeline('exerciseTimeline', exerciseHint);
      requestAnimationFrame(() => {
        visualization.fitCanvas(exerciseTimeline);
        const nextHint = exercises.getExerciseVisualHint
          ? exercises.getExerciseVisualHint()
          : null;
        visualization.drawPitchTimeline('exerciseTimeline', nextHint);
      });
    }

    ui.isPracticeMode = true;
  }

  exitExerciseMode() {
    trackAnalyticsEvent('practice_mode_exited');
    this.isExerciseMode = false;
    this.isPracticeMode = false;

    const mainView = document.getElementById('mainView');
    const practiceView = document.getElementById('practiceView');
    const practiceBtn = document.getElementById('practiceBtn');
    if (mainView) mainView.style.display = 'block';
    if (practiceView) practiceView.style.display = 'none';
    if (practiceBtn) practiceBtn.textContent = '🔲 Practice';

    ui.isPracticeMode = false;
  }

  startExerciseSession(exerciseType) {
    trackAnalyticsEvent('exercise_started', {
      exercise_type: exerciseType,
      sa: settings.get('sa'),
      difficulty: settings.get('exerciseDifficulty'),
      octave: settings.get('exerciseRegister')
    });
    this.enterExerciseMode();
    exercises.start(exerciseType);
  }

  goBack() {
    if (document.referrer && document.referrer !== window.location.href) {
      history.back();
    } else {
      window.location.href = '../';
    }
  }

  showHelp() {
    ui.showHelp();
  }

  openContact() {
    window.open('https://madhav-kataria.com/#contact', '_blank', 'noopener,noreferrer');
  }

  resetSettings() {
    const shouldReset = window.confirm('Reset all settings to default values?');
    if (!shouldReset) return;
    settings.reset();
    window.location.reload();
  }

  hideHelp() {
    ui.hideHelp();
  }

  hidePermissionOverlay() {
    ui.hidePermissionOverlay();
  }

  toggleMobileControls() {
    const panel = document.getElementById('mobileControlsPanel');
    const btn = document.getElementById('mobileControlsToggle');
    if (panel && btn) {
      panel.classList.toggle('active');
      const isOpen = panel.classList.contains('active');
      btn.classList.toggle('active', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      settings.set('mobileControlsOpen', isOpen);
    }
  }

  restoreUIState() {
    const panel = document.getElementById('mobileControlsPanel');
    const btn = document.getElementById('mobileControlsToggle');
    if (!panel || !btn) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const shouldOpen = isMobile && settings.get('mobileControlsOpen');

    panel.classList.toggle('active', shouldOpen);
    btn.classList.toggle('active', shouldOpen);
    btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

    if (!isMobile && settings.get('mobileControlsOpen')) {
      settings.set('mobileControlsOpen', false);
    }
  }

  toggleAdvancedGraphs() {
    const graphs = document.getElementById('advancedGraphs');
    const btn = document.getElementById('showMoreBtn');
    if (graphs && btn) {
      const isHidden = graphs.style.display === 'none' || !graphs.style.display;
      
      if (isHidden) {
        trackAnalyticsEvent('advanced_analysis_opened');
        graphs.style.display = 'block';
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
          <path d="M8 4v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Hide Advanced Analysis`;
        if (window.visualization) {
          setTimeout(() => {
            window.visualization.fitAllCanvases();
            this.updateAdvancedEmptyState();
          }, 100);
        }
      } else {
        trackAnalyticsEvent('advanced_analysis_closed');
        graphs.style.display = 'none';
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
          <path d="M8 4v8m-4-4h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Show Advanced Analysis`;
      }
    }
  }

  toggleSettingsSidebar() {
    const sidebar = document.getElementById('settingsSidebar');
    if (sidebar) {
      sidebar.classList.toggle('active');
      
      // Prevent body scroll when sidebar is open
      if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  openSettings() {
    this.toggleSettingsSidebar();
  }

  updateAdvancedEmptyState() {
    const empty = document.getElementById('advancedEmptyState');
    if (!empty) return;
    empty.style.display = this.running ? 'none' : 'flex';
  }

  handleInitializationError(error) {
    const errorHtml = `
      <div style="position: fixed; inset: 0; background: rgba(11, 16, 32, 0.95); 
                  display: flex; align-items: center; justify-content: center; 
                  z-index: 10000; padding: 20px;">
        <div style="background: #1a2548; padding: 30px; border-radius: 20px; 
                    max-width: 500px; text-align: center; border: 1px solid #6ee7ff;">
          <h2 style="color: #ef4444; margin-bottom: 20px;">⚠️ Initialization Error</h2>
          <p style="color: #e5e7eb; margin-bottom: 20px;">
            Failed to initialize the application. Please try:
          </p>
          <ul style="color: #94a3b8; text-align: left; margin-bottom: 20px;">
            <li>Refreshing the page</li>
            <li>Clearing browser cache</li>
            <li>Using a different browser (Chrome/Firefox/Edge recommended)</li>
            <li>Checking browser console for details</li>
          </ul>
          <button onclick="location.reload()" 
                  style="background: linear-gradient(135deg, #6ee7ff, #a78bfa); 
                         color: #07101b; border: none; padding: 12px 24px; 
                         border-radius: 12px; font-weight: 700; cursor: pointer;">
            Reload Page
          </button>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            Error: ${error.message}
          </p>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', errorHtml);
  }
  getStatus() {
    return {
      initialized: this.initialized,
      running: this.running,
      audioActive: audio.isRunning(),
      recording: recording.getRecordingState(),
      practiceMode: this.isPracticeMode,
      exerciseMode: this.isExerciseMode,
      sessionCount: sessions.sessions.length,
      currentExercise: exercises.getCurrentExercise(),
      metronomeActive: metronome.getState()
    };
  }

  debug() {
    console.group('🔍 SurSight Studio Debug Info');
    console.log('Status:', this.getStatus());
    console.log('Audio Context:', audio.getAudioContext());
    console.log('Sample Rate:', audio.getSampleRate());
    console.log('Pitch History Length:', visualization.pitchHistory.length);
    console.log('Config:', CONFIG);
    console.groupEnd();
  }
}

const app = new PitchVisualizerApp();
window.app = app;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.initialize().catch(error => {
      console.error('Failed to initialize app:', error);
    });
  });
} else {
  // DOM already loaded
  app.initialize().catch(error => {
    console.error('Failed to initialize app:', error);
  });
}

console.log(`
🎹 Keyboard Shortcuts:
  Space   - Start/Stop microphone
  R       - Toggle recording
  P       - Toggle practice mode
  H       - Show help
  ESC     - Exit practice mode / Close overlays

💡 Type 'app.debug()' in console for debug info
`);
export default app;
