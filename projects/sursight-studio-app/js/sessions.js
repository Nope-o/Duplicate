import { nearestNote, makeSargamMapper, midiToFreq, noteNameForMidi } from './music-math.js';
import { CONFIG } from './constants.js';
import { settings } from './settings.js';

const SESSION_STORAGE_KEY = 'pitchSessions';
const LEGACY_STORAGE_KEYS = ['surSightSessions', 'sursightSessions'];
const SESSION_REPLAY_VOICES = {
  violin: {
    label: 'Violin',
    filterType: 'lowpass',
    filterFrequency: 2800,
    filterQ: 0.95,
    attackMs: 34,
    outputGain: 1.08,
    vibrato: { rate: 5.4, depth: 11 },
    noise: { level: 0.009, filterType: 'bandpass', frequency: 2100, q: 0.8 },
    voices: [
      {
        ratio: 1,
        level: 0.6,
        detune: -4,
        harmonics: [1.0, 0.78, 0.54, 0.39, 0.28, 0.19, 0.14, 0.09]
      },
      {
        ratio: 1,
        level: 0.46,
        detune: 5,
        harmonics: [1.0, 0.63, 0.37, 0.24, 0.16, 0.1]
      }
    ]
  },
  clarinet: {
    label: 'Clarinet',
    filterType: 'lowpass',
    filterFrequency: 1700,
    filterQ: 1.2,
    attackMs: 24,
    outputGain: 0.96,
    vibrato: { rate: 4.2, depth: 4.5 },
    voices: [
      {
        ratio: 1,
        level: 0.56,
        detune: 0,
        harmonics: [1.0, 0.04, 0.62, 0.03, 0.34, 0.02, 0.22, 0.015, 0.13]
      },
      {
        ratio: 1,
        level: 0.2,
        detune: 3,
        harmonics: [1.0, 0.02, 0.28, 0.01, 0.16, 0.008, 0.1]
      }
    ]
  },
  flute: {
    label: 'Flute',
    filterType: 'lowpass',
    filterFrequency: 3200,
    filterQ: 0.48,
    attackMs: 42,
    outputGain: 1.02,
    vibrato: { rate: 4.8, depth: 5.5 },
    noise: { level: 0.006, filterType: 'bandpass', frequency: 2600, q: 0.55 },
    voices: [
      {
        ratio: 1,
        level: 0.72,
        detune: 0,
        harmonics: [1.0, 0.16, 0.09, 0.035, 0.02, 0.012]
      },
      {
        ratio: 1,
        level: 0.18,
        detune: 2,
        harmonics: [1.0, 0.08, 0.04, 0.02]
      }
    ]
  },
  clean: {
    label: 'Clean Synth',
    filterType: 'lowpass',
    filterFrequency: 2100,
    filterQ: 0.35,
    attackMs: 18,
    outputGain: 0.92,
    voices: [
      {
        ratio: 1,
        level: 0.72,
        detune: 0,
        harmonics: [1.0, 0.18, 0.06, 0.02]
      },
      {
        ratio: 1,
        level: 0.18,
        detune: 3,
        harmonics: [1.0, 0.06, 0.03]
      }
    ]
  }
};

class SessionManager {
  constructor() {
    this.sessions = [];
    this.playbackTimeouts = [];
    this.isPlaying = false;
    this.currentPlaybackId = null;
    this.currentPlaybackPoint = null;
    this.playbackVoiceNodes = [];
    this.playbackMasterGain = null;
    this.playbackFilter = null;
    this.playbackCompressor = null;
    this.playbackVibratoOscillator = null;
    this.playbackVibratoGain = null;
    this.playbackNoiseSource = null;
    this.playbackNoiseGain = null;
    this.playbackNoiseFilter = null;
    this.playbackAudioCtx = null;
    this.ownsPlaybackAudioCtx = false;
    this.playbackToneEnabled = true;
    this.playbackSpeed = 1;
    this.loadSessions();
  }

  getPlaybackVoiceKey() {
    const voice = settings.get('sessionReplayVoice');
    return Object.prototype.hasOwnProperty.call(SESSION_REPLAY_VOICES, voice) ? voice : 'violin';
  }

  getPlaybackVoiceProfile() {
    return SESSION_REPLAY_VOICES[this.getPlaybackVoiceKey()];
  }

  getPlaybackVoiceLabel() {
    return this.getPlaybackVoiceProfile().label;
  }

  getPlaybackLevelRatio() {
    const raw = Number(settings.get('sessionReplayLevel'));
    const level = Number.isFinite(raw) ? raw : 78;
    return Math.max(0.35, Math.min(1, level / 100));
  }

  createPlaybackWave(ctx, harmonics = []) {
    const length = Math.max(2, harmonics.length + 1);
    const real = new Float32Array(length);
    const imag = new Float32Array(length);
    harmonics.forEach((amplitude, index) => {
      imag[index + 1] = Number(amplitude) || 0;
    });
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  createNoiseSource(ctx, profile, destination) {
    if (!profile || !destination) return null;

    const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * 2), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.45;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = profile.filterType || 'bandpass';
    filter.frequency.setValueAtTime(profile.frequency || 2200, ctx.currentTime);
    filter.Q.setValueAtTime(profile.q || 0.6, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(profile.level || 0.004, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(ctx.currentTime);

    return { source, filter, gain };
  }

  getSaSemitone() {
    const saSelect = document.getElementById('saSelect');
    const parsed = saSelect ? parseInt(saSelect.value, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatTimestampForFilename(inputDate) {
    const d = inputDate instanceof Date ? inputDate : new Date(inputDate || Date.now());
    const date = Number.isNaN(d.getTime()) ? new Date() : d;
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}_${pad2(date.getHours())}-${pad2(date.getMinutes())}-${pad2(date.getSeconds())}`;
  }

  formatDuration(seconds) {
    const s = Math.max(0, Math.round(parseFloat(seconds) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  escapeCsvValue(value) {
    const text = value == null ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadCsv(filename, headers, rows) {
    const csvText = [headers, ...rows]
      .map((row) => row.map((cell) => this.escapeCsvValue(cell)).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(filename, blob);
  }

  getFrequencyBounds(data) {
    const freqs = data.map((d) => Number(d.freq)).filter((f) => Number.isFinite(f) && f > 0);
    if (freqs.length === 0) return { min: 100, max: 400 };

    let min = Math.min(...freqs);
    let max = Math.max(...freqs);
    if (max - min < 1) {
      const center = (max + min) / 2;
      min = center - 0.5;
      max = center + 0.5;
    }
    const pad = (max - min) * 0.08;
    return { min: Math.max(0, min - pad), max: max + pad };
  }

  getTimeTicks(durationSec, target = 7) {
    if (!Number.isFinite(durationSec) || durationSec <= 0) return [0];
    const roughStep = durationSec / Math.max(2, target);
    const steps = [0.25, 0.5, 1, 2, 5, 10, 15, 20, 30, 60, 120, 180];
    const step = steps.find((s) => s >= roughStep) || Math.ceil(roughStep / 60) * 60;
    const ticks = [];
    for (let t = 0; t <= durationSec + 1e-9; t += step) {
      ticks.push(Number(t.toFixed(3)));
    }
    if (ticks[ticks.length - 1] < durationSec) {
      ticks.push(Number(durationSec.toFixed(3)));
    }
    return ticks;
  }

  formatTimeTick(seconds, step) {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}:${String(secs).padStart(2, '0')}`;
    }
    if (step < 1) return `${seconds.toFixed(1)}s`;
    return `${Math.round(seconds)}s`;
  }

  getYAxisNoteTicks(freqBounds, maxTickCount = 8) {
    const minMidi = nearestNote(freqBounds.min).midi;
    const maxMidi = nearestNote(freqBounds.max).midi;
    const allTicks = [];

    for (let midi = minMidi; midi <= maxMidi; midi += 1) {
      allTicks.push({ midi, freq: midiToFreq(midi) });
    }

    if (allTicks.length === 0) {
      return [{ midi: minMidi, freq: midiToFreq(minMidi) }];
    }

    const step = Math.max(1, Math.ceil(allTicks.length / Math.max(1, maxTickCount)));
    const reduced = allTicks.filter((_, index) => index % step === 0);
    const last = allTicks[allTicks.length - 1];

    if (reduced[reduced.length - 1]?.midi !== last.midi) {
      reduced.push(last);
    }

    return reduced;
  }

  drawTimelineChart(canvas, data, options = {}) {
    const points = this.normalizeDataPoints(data);
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const compact = Boolean(options.compact);
    const width = options.width || canvas.width || 1200;
    const height = options.height || canvas.height || 640;
    const dpr = options.dpr || (compact ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    canvas.width = Math.max(2, Math.floor(width * dpr));
    canvas.height = Math.max(2, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = compact
      ? {
          background: 'rgba(7, 11, 26, 0.75)',
          grid: 'rgba(148, 163, 184, 0.18)',
          axis: 'rgba(226, 232, 240, 0.85)',
          text: '#d1d9e6',
          line: '#6ee7ff'
        }
      : {
          background: '#ffffff',
          grid: '#e5e7eb',
          axis: '#111827',
          text: '#111827',
          line: '#0ea5e9'
        };

    const pad = compact
      ? { left: 34, right: 10, top: 10, bottom: 20 }
      : { left: 160, right: 24, top: 56, bottom: 70 };

    const plotW = Math.max(1, width - pad.left - pad.right);
    const plotH = Math.max(1, height - pad.top - pad.bottom);
    const maxTimeMs = points[points.length - 1].time;
    const durationSec = Math.max(0.1, maxTimeMs / 1000);
    const freqBounds = this.getFrequencyBounds(points);
    const freqRange = Math.max(1e-9, freqBounds.max - freqBounds.min);
    const x = (timeMs) => pad.left + (Math.max(0, timeMs) / (durationSec * 1000)) * plotW;
    const y = (freq) => pad.top + ((freqBounds.max - freq) / freqRange) * plotH;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    const timeTicks = this.getTimeTicks(durationSec, compact ? 4 : 8);
    const timeStep = timeTicks.length > 1 ? timeTicks[1] - timeTicks[0] : 1;

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    timeTicks.forEach((tick) => {
      const px = x(tick * 1000);
      ctx.beginPath();
      ctx.moveTo(px, pad.top);
      ctx.lineTo(px, pad.top + plotH);
      ctx.stroke();
      if (!compact) {
        ctx.fillStyle = palette.text;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.formatTimeTick(tick, timeStep), px, pad.top + plotH + 8);
      }
    });

    if (compact) {
      const yTickCount = 3;
      for (let i = 0; i <= yTickCount; i += 1) {
        const ratio = i / yTickCount;
        const tickFreq = freqBounds.min + ratio * freqRange;
        const py = y(tickFreq);
        ctx.beginPath();
        ctx.moveTo(pad.left, py);
        ctx.lineTo(pad.left + plotW, py);
        ctx.stroke();
      }
    } else {
      const sargamMapper = makeSargamMapper(this.getSaSemitone());
      const noteTicks = this.getYAxisNoteTicks(freqBounds, 8);
      noteTicks.forEach(({ midi, freq }) => {
        const py = y(freq);
        const sg = sargamMapper(midi);
        ctx.beginPath();
        ctx.moveTo(pad.left, py);
        ctx.lineTo(pad.left + plotW, py);
        ctx.stroke();

        ctx.fillStyle = palette.text;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${sg.hindi || '--'} ${sg.name || '--'}`, pad.left - 10, py);
      });
    }

    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = compact ? 1 : 1.2;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    const avgGapMs = points.length > 1 ? maxTimeMs / (points.length - 1) : 0;
    const gapThreshold = Math.max(300, avgGapMs * 6);

    ctx.strokeStyle = palette.line;
    ctx.lineWidth = compact ? 1.6 : 2.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let prevTime = null;
    points.forEach((point) => {
      const px = x(point.time);
      const py = y(point.freq);
      if (prevTime === null || point.time - prevTime > gapThreshold) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
      prevTime = point.time;
    });
    ctx.stroke();

    if (!compact) {
      ctx.fillStyle = palette.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '600 20px sans-serif';
      ctx.fillText(options.title || 'Pitch Timeline', pad.left, 30);
      ctx.font = '13px sans-serif';
      ctx.fillText(options.subtitle || `Duration ${durationSec.toFixed(2)}s • ${points.length} points`, pad.left, 48);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '13px sans-serif';
      ctx.fillText('Time (seconds)', pad.left + plotW / 2, height - 28);

      ctx.save();
      ctx.translate(24, pad.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Notes (Hindi • English)', 0, 0);
      ctx.restore();
    }
  }

  renderTimelinePreviews(container) {
    container.querySelectorAll('.session-timeline-mini[data-session-id]').forEach((canvas) => {
      const sessionId = Number(canvas.dataset.sessionId);
      const session = this.sessions.find((item) => item.id === sessionId);
      if (!session || !Array.isArray(session.data) || session.data.length === 0) return;
      this.drawTimelineChart(canvas, session.data, {
        compact: true,
        width: canvas.width || 420,
        height: canvas.height || 110
      });
    });
  }

  exportSessionTimelineImage(session, baseFilename) {
    const canvas = document.createElement('canvas');
    this.drawTimelineChart(canvas, session.data, {
      compact: false,
      width: 1600,
      height: 900,
      title: `Session Timeline • ${new Date(session.date).toLocaleString()}`,
      subtitle: `X-axis = Time (seconds) | Avg ${session.avgFreq} Hz | Range ${session.range} Hz`
    });

    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) this.downloadBlob(`${baseFilename}_timeline.png`, blob);
      }, 'image/png');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${baseFilename}_timeline.png`;
    a.click();
  }

  normalizeDataPoints(rawData) {
    if (!Array.isArray(rawData)) return [];
    return rawData
      .map((point) => ({
        time: Number(point?.time),
        freq: Number(point?.freq),
        clarity: Number(point?.clarity) || 0,
        rms: Number(point?.rms) || 0
      }))
      .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.freq) && point.freq > 0)
      .sort((a, b) => a.time - b.time);
  }

  buildSessionFromData(raw) {
    const data = this.normalizeDataPoints(raw?.data || []);
    if (data.length === 0) return null;

    const freqs = data.map((d) => d.freq);
    const avgFreq = freqs.reduce((sum, f) => sum + f, 0) / freqs.length;
    const minFreq = Math.min(...freqs);
    const maxFreq = Math.max(...freqs);
    const range = maxFreq - minFreq;
    const avgClarity = data.reduce((sum, d) => sum + d.clarity, 0) / data.length;
    const avgRms = data.reduce((sum, d) => sum + d.rms, 0) / data.length;
    const avgNote = nearestNote(avgFreq);
    const duration = data[data.length - 1].time / 1000;

    return {
      id: Number.isFinite(Number(raw?.id)) ? Number(raw.id) : Date.now(),
      date: raw?.date || new Date().toISOString(),
      duration: duration.toFixed(2),
      avgNote: `${avgNote.name}${avgNote.octave}`,
      avgFreq: avgFreq.toFixed(2),
      minFreq: minFreq.toFixed(2),
      maxFreq: maxFreq.toFixed(2),
      range: range.toFixed(2),
      avgClarity: avgClarity.toFixed(3),
      avgRms: avgRms.toFixed(4),
      dataPoints: data.length,
      data
    };
  }

  loadSessions() {
    try {
      const keysToTry = [SESSION_STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
      let parsed = [];

      for (const key of keysToTry) {
        const stored = localStorage.getItem(key);
        if (!stored) continue;
        const candidate = JSON.parse(stored);
        if (Array.isArray(candidate)) {
          parsed = candidate;
          if (key !== SESSION_STORAGE_KEY) {
            localStorage.setItem(SESSION_STORAGE_KEY, stored);
          }
          break;
        }
      }

      this.sessions = parsed
        .map((s) => this.buildSessionFromData(s))
        .filter(Boolean)
        .slice(0, CONFIG.MAX_SESSIONS);
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.sessions = [];
    }
  }

  saveSessions() {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.sessions));
    } catch (error) {
      console.error('Error saving sessions:', error);
      alert('Failed to save session. Storage may be full.');
    }
  }

  saveSession(recordedData) {
    if (!recordedData || recordedData.length === 0) return;
    const session = this.buildSessionFromData({ data: recordedData, date: new Date().toISOString(), id: Date.now() });
    if (!session) return;

    this.sessions.unshift(session);
    if (this.sessions.length > CONFIG.MAX_SESSIONS) {
      this.sessions.length = CONFIG.MAX_SESSIONS;
    }

    this.saveSessions();
    this.renderSessions();
  }

  updateHeaderIndicator() {
    const indicator = document.getElementById('sessionHeaderIndicator');
    const countEl = document.getElementById('sessionHeaderCount');
    const tabBadge = document.getElementById('sessionsTabBadge');

    const count = Array.isArray(this.sessions) ? this.sessions.length : 0;
    if (indicator && countEl) {
      countEl.textContent = String(count);
      indicator.hidden = count <= 0;
      indicator.setAttribute(
        'aria-label',
        count > 0 ? `Open recorded sessions (${count})` : 'No recorded sessions'
      );
      indicator.title = count > 0 ? `${count} recorded session${count === 1 ? '' : 's'}` : 'No recorded sessions';
    }

    if (tabBadge) {
      tabBadge.textContent = String(count);
      tabBadge.hidden = count <= 0;
    }
  }

  openSessionsTab() {
    if (!this.sessions.length) return;
    const sessionsTabButton = document.querySelector('.tab[data-tab="sessions"]');
    const sessionsTab = document.getElementById('sessionsTab');
    const tabsContainer = document.querySelector('.tabs');
    const header = document.querySelector('.app-header');
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';

    sessionsTabButton?.click();

    window.requestAnimationFrame(() => {
      sessionsTabButton?.scrollIntoView({
        behavior,
        block: 'nearest',
        inline: 'center'
      });

      window.requestAnimationFrame(() => {
        const target = sessionsTab || tabsContainer;
        if (!target) return;
        const headerOffset = (header?.offsetHeight || 0) + 14;
        const targetTop = window.scrollY + target.getBoundingClientRect().top - headerOffset;
        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior
        });
      });
    });
  }

  animateSessionSaved(sourceEl = null) {
    window.requestAnimationFrame(() => {
      const headerIndicator = document.getElementById('sessionHeaderIndicator');
      const tabBadge = document.getElementById('sessionsTabBadge');
      const destination = headerIndicator && !headerIndicator.hidden ? headerIndicator : tabBadge;
      if (!destination || destination.hidden) return;

      const sourceRect = sourceEl?.getBoundingClientRect?.();
      const destinationRect = destination.getBoundingClientRect();
      const startX = sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth / 2;
      const startY = sourceRect ? sourceRect.top + sourceRect.height / 2 : Math.max(120, window.innerHeight * 0.55);
      const endX = destinationRect.left + destinationRect.width / 2;
      const endY = destinationRect.top + destinationRect.height / 2;

      const chip = document.createElement('div');
      chip.className = 'session-save-flight';
      chip.setAttribute('aria-hidden', 'true');
      chip.innerHTML = `
        <span class="session-save-flight-icon">📝</span>
        <span class="session-save-flight-text">Saved</span>
      `;

      chip.style.left = `${startX}px`;
      chip.style.top = `${startY}px`;
      chip.style.setProperty('--flight-x', `${endX - startX}px`);
      chip.style.setProperty('--flight-y', `${endY - startY}px`);
      document.body.appendChild(chip);

      window.requestAnimationFrame(() => {
        chip.classList.add('is-flying');
      });

      const pulseTarget = (el) => {
        if (!el || el.hidden) return;
        el.classList.remove('is-receiving');
        void el.offsetWidth;
        el.classList.add('is-receiving');
        window.setTimeout(() => el.classList.remove('is-receiving'), 850);
      };

      window.setTimeout(() => {
        pulseTarget(headerIndicator);
        pulseTarget(tabBadge);
      }, 560);

      window.setTimeout(() => {
        chip.remove();
      }, 980);
    });
  }

  renderSessions() {
    const container = document.getElementById('sessionsList');
    if (!container) return;
    this.syncPlaybackControls();
    this.updateHeaderIndicator();
    if (!this.isPlaying) {
      this.clearPlaybackStatus();
    }

    if (this.sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3>No recordings yet</h3>
          <p>Click "Record" while the microphone is active to capture your practice sessions</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.sessions.map((s) => {
      const playingThis = this.isPlaying && this.currentPlaybackId === s.id;
      const sessionDate = new Date(s.date);
      const sessionName = Number.isNaN(sessionDate.getTime())
        ? 'Session'
        : `Session ${sessionDate.toLocaleString()}`;

      return `
        <div class="session-item ${playingThis ? 'is-playing' : ''}">
          <div class="session-info">
            <div class="session-name">${sessionName}</div>
            <div class="session-meta">Duration ${this.formatDuration(s.duration)} • ${s.dataPoints || 0} points</div>
            <div class="session-grid">
              <div class="session-metric">
                <span class="label">Avg Note</span>
                <span class="value">${s.avgNote || '--'}</span>
              </div>
              <div class="session-metric">
                <span class="label">Avg Freq</span>
                <span class="value">${s.avgFreq || '--'} Hz</span>
              </div>
              <div class="session-metric">
                <span class="label">Range</span>
                <span class="value">${s.range || '--'} Hz</span>
              </div>
              <div class="session-metric">
                <span class="label">Clarity</span>
                <span class="value">${s.avgClarity || '--'}</span>
              </div>
            </div>
            <canvas class="session-timeline-mini" data-session-id="${s.id}" width="420" height="110" aria-label="Timeline preview for this session"></canvas>
          </div>
          <div class="session-actions">
            <button class="icon-btn" onclick="sessions.togglePlayback(${s.id})" aria-label="${playingThis ? 'Stop playback' : 'Play session'}" title="${playingThis ? 'Stop playback' : 'Play session'}">
              ${playingThis ? '⏹️ Stop' : '▶️ Play'}
            </button>
            <button class="icon-btn" onclick="sessions.downloadSession(${s.id})" aria-label="Export this session" title="Export this session to Excel-compatible CSV">⬇️ Export</button>
            <button class="icon-btn" onclick="sessions.deleteSession(${s.id})" aria-label="Delete session" title="Delete session">🗑️ Delete</button>
          </div>
        </div>
      `;
    }).join('');
    this.renderTimelinePreviews(container);
  }

  togglePlayback(id) {
    if (this.isPlaying && this.currentPlaybackId === id) {
      this.stopPlayback();
    } else {
      this.playSession(id);
    }
  }

  syncPlaybackControls() {
    const toneBtn = document.getElementById('sessionToneToggle');
    if (toneBtn) {
      toneBtn.textContent = this.playbackToneEnabled ? 'Tone Replay On' : 'Tone Replay Off';
      toneBtn.setAttribute('aria-pressed', this.playbackToneEnabled ? 'true' : 'false');
      toneBtn.classList.toggle('is-active', this.playbackToneEnabled);
    }

    document.querySelectorAll('.session-speed-btn[data-speed]').forEach((btn) => {
      const speed = Number(btn.dataset.speed);
      btn.classList.toggle('is-active', speed === this.playbackSpeed);
      btn.setAttribute('aria-pressed', speed === this.playbackSpeed ? 'true' : 'false');
    });
  }

  setPlaybackVoice(voice) {
    const nextVoice = Object.prototype.hasOwnProperty.call(SESSION_REPLAY_VOICES, voice) ? voice : 'violin';
    if (settings.get('sessionReplayVoice') !== nextVoice) {
      settings.set('sessionReplayVoice', nextVoice);
    }

    if (this.playbackToneEnabled && this.isPlaying) {
      this.rebuildPlaybackTone();
    } else {
      this.clearPlaybackStatus();
    }
  }

  setPlaybackLevel(level) {
    const parsed = Number(level);
    const safeLevel = Math.max(35, Math.min(100, Number.isFinite(parsed) ? parsed : 78));
    if (Number(settings.get('sessionReplayLevel')) !== safeLevel) {
      settings.set('sessionReplayLevel', safeLevel);
    }

    if (this.playbackToneEnabled && this.playbackAudioCtx && this.playbackMasterGain) {
      const now = this.playbackAudioCtx.currentTime;
      const levelRatio = this.getPlaybackLevelRatio();
      const currentGain = this.currentPlaybackPoint
        ? this.computePlaybackTargetGain(this.currentPlaybackPoint.clarity, levelRatio)
        : 0.0001;
      this.playbackMasterGain.gain.cancelScheduledValues(now);
      this.playbackMasterGain.gain.setTargetAtTime(currentGain, now, 0.03);
    }
    this.clearPlaybackStatus();
  }

  async toggleToneReplay(forceValue = null) {
    const nextValue = typeof forceValue === 'boolean' ? forceValue : !this.playbackToneEnabled;
    if (nextValue === this.playbackToneEnabled) {
      this.syncPlaybackControls();
      return;
    }

    this.playbackToneEnabled = nextValue;
    this.syncPlaybackControls();

    if (!this.isPlaying) {
      this.clearPlaybackStatus();
      return;
    }

    if (!this.playbackToneEnabled) {
      this.stopPlaybackTone();
      const session = this.sessions.find((entry) => entry.id === this.currentPlaybackId) || null;
      this.updatePlaybackStatus(session, this.currentPlaybackPoint, 'Visual replay • tone muted');
      return;
    }

    const hasTone = await this.ensurePlaybackTone();
    if (hasTone && this.currentPlaybackPoint) {
      this.updatePlaybackTone(this.currentPlaybackPoint.freq, this.currentPlaybackPoint.clarity);
    }
    const session = this.sessions.find((entry) => entry.id === this.currentPlaybackId) || null;
    this.updatePlaybackStatus(session, this.currentPlaybackPoint, hasTone ? 'Tone replay active' : 'Visual replay only');
  }

  setPlaybackSpeed(speed) {
    const allowed = [0.5, 1, 1.5];
    const nextSpeed = allowed.includes(Number(speed)) ? Number(speed) : 1;
    if (nextSpeed === this.playbackSpeed) {
      this.syncPlaybackControls();
      return;
    }

    this.playbackSpeed = nextSpeed;
    this.syncPlaybackControls();

    if (this.isPlaying && this.currentPlaybackId !== null) {
      const replayId = this.currentPlaybackId;
      this.playSession(replayId);
      return;
    }

    this.clearPlaybackStatus();
  }

  async rebuildPlaybackTone() {
    if (!this.isPlaying || !this.playbackToneEnabled) return;
    const point = this.currentPlaybackPoint;
    this.stopPlaybackTone();
    const hasTone = await this.ensurePlaybackTone();
    if (hasTone && point) {
      this.updatePlaybackTone(point.freq, point.clarity);
    }
    const session = this.sessions.find((entry) => entry.id === this.currentPlaybackId) || null;
    this.updatePlaybackStatus(session, point, hasTone ? 'Replay voice updated' : 'Visual replay only');
  }

  updatePlaybackStatus(session, point = null, customText = '') {
    const status = document.getElementById('sessionPlaybackStatus');
    const pitchEl = document.getElementById('sessionPlaybackPitch');
    const metaEl = document.getElementById('sessionPlaybackMeta');
    if (!status || !pitchEl || !metaEl) return;

    status.hidden = false;

    if (!point) {
      pitchEl.textContent = customText || 'Preparing playback...';
      metaEl.textContent = session
        ? `Replaying ${new Date(session.date).toLocaleString()} • ${this.playbackSpeed}x • ${this.playbackToneEnabled ? `${this.getPlaybackVoiceLabel()} on` : 'Tone muted'}`
        : 'Preparing playback monitor.';
      return;
    }

    const note = nearestNote(point.freq);
    const saSemi = this.getSaSemitone();
    const sargam = makeSargamMapper(saSemi)(note.midi);
    const displayNote = noteNameForMidi(note.midi, saSemi);
    const centsLabel = `${note.cents > 0 ? '+' : ''}${note.cents.toFixed(1)}¢`;

    pitchEl.textContent = `${point.freq.toFixed(2)} Hz • ${displayNote}`;
    metaEl.textContent = `${sargam.name || '--'} • ${sargam.hindi || '--'} • ${centsLabel} • ${this.formatTimeTick(point.time / 1000, 0.25)} • ${this.playbackSpeed}x • ${this.playbackToneEnabled ? this.getPlaybackVoiceLabel() : 'Muted'}`;
  }

  clearPlaybackStatus() {
    const status = document.getElementById('sessionPlaybackStatus');
    const pitchEl = document.getElementById('sessionPlaybackPitch');
    const metaEl = document.getElementById('sessionPlaybackMeta');
    if (pitchEl) pitchEl.textContent = 'Session playback ready';
    if (metaEl) metaEl.textContent = `Select any session to replay note, frequency, and Sargam data • ${this.playbackSpeed}x • ${this.playbackToneEnabled ? this.getPlaybackVoiceLabel() : 'Tone muted'}`;
    if (status) status.hidden = false;
  }

  async ensurePlaybackTone() {
    if (this.playbackVoiceNodes.length && this.playbackMasterGain && this.playbackAudioCtx) {
      return true;
    }

    const SharedAudioContext = window.audio?.getAudioContext?.();
    let ctx = SharedAudioContext || this.playbackAudioCtx;

    if (ctx?.state === 'closed') {
      if (ctx === this.playbackAudioCtx) {
        this.playbackAudioCtx = null;
      }
      ctx = SharedAudioContext || null;
    }

    if (!ctx) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return false;
      ctx = new AudioContextCtor();
      this.playbackAudioCtx = ctx;
      this.ownsPlaybackAudioCtx = true;
    } else if (SharedAudioContext && ctx === SharedAudioContext) {
      this.playbackAudioCtx = ctx;
      this.ownsPlaybackAudioCtx = false;
    }

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (_) {}
    }

    if (ctx.state === 'closed') return false;
    const now = ctx.currentTime;
    const profile = this.getPlaybackVoiceProfile();
    const filter = ctx.createBiquadFilter();
    filter.type = profile.filterType || 'lowpass';
    filter.frequency.setValueAtTime(profile.filterFrequency || 1800, now);
    filter.Q.setValueAtTime(profile.filterQ || 0.4, now);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-26, now);
    compressor.knee.setValueAtTime(18, now);
    compressor.ratio.setValueAtTime(2.6, now);
    compressor.attack.setValueAtTime(0.008, now);
    compressor.release.setValueAtTime(0.14, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);

    filter.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    if (profile.vibrato) {
      const vibratoOscillator = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibratoOscillator.type = 'sine';
      vibratoOscillator.frequency.setValueAtTime(profile.vibrato.rate, now);
      vibratoGain.gain.setValueAtTime(profile.vibrato.depth, now);
      vibratoOscillator.connect(vibratoGain);
      vibratoOscillator.start(now);
      this.playbackVibratoOscillator = vibratoOscillator;
      this.playbackVibratoGain = vibratoGain;
    }

    this.playbackVoiceNodes = profile.voices.map((voice) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      if (voice.harmonics?.length) {
        oscillator.setPeriodicWave(this.createPlaybackWave(ctx, voice.harmonics));
      } else if (voice.type) {
        oscillator.type = voice.type;
      } else {
        oscillator.type = 'sine';
      }
      oscillator.frequency.value = 220 * voice.ratio;
      oscillator.detune.value = voice.detune || 0;
      gainNode.gain.setValueAtTime(voice.level, now);
      oscillator.connect(gainNode);
      gainNode.connect(filter);
      if (this.playbackVibratoGain) {
        this.playbackVibratoGain.connect(oscillator.detune);
      }
      oscillator.start(now);
      return { oscillator, gainNode, ratio: voice.ratio };
    });

    const noiseNodes = this.createNoiseSource(ctx, profile.noise, filter);
    if (noiseNodes) {
      this.playbackNoiseSource = noiseNodes.source;
      this.playbackNoiseFilter = noiseNodes.filter;
      this.playbackNoiseGain = noiseNodes.gain;
    }

    this.playbackFilter = filter;
    this.playbackCompressor = compressor;
    this.playbackMasterGain = masterGain;
    this.playbackAudioCtx = ctx;
    return true;
  }

  updatePlaybackTone(freq, clarity = 0) {
    if (!this.playbackVoiceNodes.length || !this.playbackMasterGain || !this.playbackAudioCtx) return;
    if (!Number.isFinite(freq) || freq <= 0) return;

    const now = this.playbackAudioCtx.currentTime;
    const safeFreq = Math.max(40, Math.min(2400, freq));
    const safeClarity = Math.max(0, Math.min(1, Number(clarity) || 0));
    const targetGain = this.computePlaybackTargetGain(safeClarity, this.getPlaybackLevelRatio());
    const voiceProfile = this.getPlaybackVoiceProfile();
    const targetFilter = Math.max(900, Math.min(4200, safeFreq * (voiceProfile.filterType === 'lowpass' ? 5.6 : 4.4)));
    const attackSeconds = Math.max(0.012, (voiceProfile.attackMs || 20) / 1000);

    this.playbackVoiceNodes.forEach((voice) => {
      voice.oscillator.frequency.cancelScheduledValues(now);
      voice.oscillator.frequency.setTargetAtTime(safeFreq * voice.ratio, now, 0.018);
    });

    this.playbackFilter?.frequency.cancelScheduledValues(now);
    this.playbackFilter?.frequency.setTargetAtTime(targetFilter, now, 0.04);
    this.playbackMasterGain.gain.cancelScheduledValues(now);
    this.playbackMasterGain.gain.setTargetAtTime(targetGain, now, attackSeconds);

    if (this.playbackNoiseGain) {
      const baseNoise = voiceProfile.noise?.level || 0;
      const shapedNoise = Math.max(0.0015, baseNoise * (0.82 + (1 - safeClarity) * 0.35));
      this.playbackNoiseGain.gain.cancelScheduledValues(now);
      this.playbackNoiseGain.gain.setTargetAtTime(shapedNoise, now, 0.05);
    }
  }

  computePlaybackTargetGain(clarity, levelRatio) {
    const scaledClarity = Math.max(0, Math.min(1, Number(clarity) || 0));
    const loudness = Math.max(0.35, Math.min(1, Number(levelRatio) || 0.78));
    const profileGain = this.getPlaybackVoiceProfile().outputGain || 1;
    return Math.max(0.045, Math.min(0.2, (0.06 + scaledClarity * 0.065) * loudness * 1.4 * profileGain));
  }

  stopPlaybackTone() {
    const voices = this.playbackVoiceNodes;
    const masterGain = this.playbackMasterGain;
    const filter = this.playbackFilter;
    const compressor = this.playbackCompressor;
    const vibratoOscillator = this.playbackVibratoOscillator;
    const vibratoGain = this.playbackVibratoGain;
    const noiseSource = this.playbackNoiseSource;
    const noiseGain = this.playbackNoiseGain;
    const noiseFilter = this.playbackNoiseFilter;
    const ctx = this.playbackAudioCtx;
    const ownContext = this.ownsPlaybackAudioCtx;

    this.playbackVoiceNodes = [];
    this.playbackMasterGain = null;
    this.playbackFilter = null;
    this.playbackCompressor = null;
    this.playbackVibratoOscillator = null;
    this.playbackVibratoGain = null;
    this.playbackNoiseSource = null;
    this.playbackNoiseGain = null;
    this.playbackNoiseFilter = null;

    if (voices.length && masterGain && ctx && ctx.state !== 'closed') {
      const now = ctx.currentTime;
      try {
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value || 0.0001), now);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        voices.forEach(({ oscillator }) => oscillator.stop(now + 0.1));
        if (noiseGain) {
          noiseGain.gain.cancelScheduledValues(now);
          noiseGain.gain.setValueAtTime(Math.max(0.0001, noiseGain.gain.value || 0.0001), now);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        }
        if (noiseSource) {
          noiseSource.stop(now + 0.1);
        }
        if (vibratoOscillator) {
          vibratoOscillator.stop(now + 0.1);
        }
      } catch (_) {
        voices.forEach(({ oscillator }) => {
          try { oscillator.stop(); } catch (__ ) {}
        });
        try { noiseSource?.stop(); } catch (__ ) {}
        try { vibratoOscillator?.stop(); } catch (__ ) {}
      }

      window.setTimeout(() => {
        voices.forEach(({ oscillator, gainNode }) => {
          try { oscillator.disconnect(); } catch (_) {}
          try { gainNode.disconnect(); } catch (_) {}
        });
        try { vibratoOscillator?.disconnect(); } catch (_) {}
        try { vibratoGain?.disconnect(); } catch (_) {}
        try { noiseSource?.disconnect(); } catch (_) {}
        try { noiseGain?.disconnect(); } catch (_) {}
        try { noiseFilter?.disconnect(); } catch (_) {}
        try { filter?.disconnect(); } catch (_) {}
        try { compressor?.disconnect(); } catch (_) {}
        try { masterGain.disconnect(); } catch (_) {}
      }, 160);
    } else if (voices.length) {
      voices.forEach(({ oscillator, gainNode }) => {
        try { oscillator.stop(); } catch (_) {}
        try { oscillator.disconnect(); } catch (_) {}
        try { gainNode.disconnect(); } catch (_) {}
      });
      try { vibratoOscillator?.stop(); } catch (_) {}
      try { vibratoOscillator?.disconnect(); } catch (_) {}
      try { vibratoGain?.disconnect(); } catch (_) {}
      try { noiseSource?.stop(); } catch (_) {}
      try { noiseSource?.disconnect(); } catch (_) {}
      try { noiseGain?.disconnect(); } catch (_) {}
      try { noiseFilter?.disconnect(); } catch (_) {}
      try { filter?.disconnect(); } catch (_) {}
      try { compressor?.disconnect(); } catch (_) {}
      try { masterGain?.disconnect(); } catch (_) {}
    }

    if (ownContext && ctx && ctx.state !== 'closed') {
      const playbackCtx = ctx;
      this.playbackAudioCtx = null;
      this.ownsPlaybackAudioCtx = false;
      window.setTimeout(() => {
        playbackCtx.close?.().catch?.(() => {});
      }, 180);
    }
  }

  async playSession(id) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session || !Array.isArray(session.data) || session.data.length === 0) return;

    this.stopPlayback();
    this.isPlaying = true;
    this.currentPlaybackId = id;
    this.currentPlaybackPoint = null;
    this.updatePlaybackStatus(session, null, 'Preparing audible replay...');
    window.exercises?.stopPreviewTone?.();

    const hasPlaybackTone = this.playbackToneEnabled ? await this.ensurePlaybackTone() : false;
    if (!this.isPlaying || this.currentPlaybackId !== id) {
      if (hasPlaybackTone && this.playbackToneEnabled) {
        this.stopPlaybackTone();
      }
      return;
    }
    if (this.playbackToneEnabled && !hasPlaybackTone) {
      this.updatePlaybackStatus(session, null, 'Visual replay only');
    } else if (!this.playbackToneEnabled) {
      this.updatePlaybackStatus(session, null, 'Visual replay • tone muted');
    }

    if (window.visualization) {
      window.visualization.clearHistory();
    }

    session.data.forEach((d) => {
      const timeout = setTimeout(() => {
        this.currentPlaybackPoint = d;
        if (window.visualization) {
          window.visualization.addPitchPoint(d.freq);
          window.visualization.drawPitchTimeline();
        }

        if (window.ui) {
          window.ui.updateReadout(d.freq, d.clarity, d.rms);
        }

        if (hasPlaybackTone && this.playbackToneEnabled) {
          this.updatePlaybackTone(d.freq, d.clarity);
        }

        this.updatePlaybackStatus(session, d);
      }, d.time / this.playbackSpeed);

      this.playbackTimeouts.push(timeout);
    });

    const endTimeout = setTimeout(() => {
      if (this.currentPlaybackId === id) {
        this.stopPlayback();
      }
    }, (parseFloat(session.duration || 0) * 1000) / this.playbackSpeed + 120);

    this.playbackTimeouts.push(endTimeout);
    this.renderSessions();
  }

  stopPlayback() {
    this.playbackTimeouts.forEach((t) => clearTimeout(t));
    this.playbackTimeouts = [];
    this.isPlaying = false;
    this.currentPlaybackId = null;
    this.currentPlaybackPoint = null;
    this.stopPlaybackTone();
    this.clearPlaybackStatus();
    if (!window.audio?.isRunning?.() && window.ui) {
      window.ui.updateReadout(0, 0, 0, { running: false }, null);
    }
    this.renderSessions();
  }

  buildSessionPointRows(session, sessionNumber, sargamMapper) {
    return session.data.map((d, index) => {
      const note = nearestNote(d.freq);
      const sargam = sargamMapper(note.midi);
      return [
        sessionNumber,
        session.id,
        session.date,
        this.formatDuration(session.duration),
        session.dataPoints,
        index + 1,
        (d.time / 1000).toFixed(3),
        `${note.name}${note.octave}`,
        note.cents.toFixed(1),
        d.freq.toFixed(2),
        sargam.name || '--',
        sargam.hindi || '--',
        Number(d.clarity || 0).toFixed(3),
        Number(d.rms || 0).toFixed(4),
        session.avgFreq,
        session.minFreq,
        session.maxFreq,
        session.range,
        session.avgClarity,
        session.avgRms
      ];
    });
  }

  downloadSession(id) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session || !Array.isArray(session.data) || session.data.length === 0) return;

    const sargamMapper = makeSargamMapper(this.getSaSemitone());
    const headers = [
      'Point #',
      'Time (s)',
      'Western Note',
      'Cents',
      'Frequency (Hz)',
      'Sargam (English)',
      'Sargam (Hindi)',
      'Clarity',
      'RMS'
    ];
    const rows = session.data.map((d, index) => {
      const n = nearestNote(d.freq);
      const sg = sargamMapper(n.midi);
      return [
        index + 1,
        (d.time / 1000).toFixed(3),
        `${n.name}${n.octave}`,
        n.cents.toFixed(1),
        d.freq.toFixed(2),
        sg.name || '--',
        sg.hindi || '--',
        Number(d.clarity || 0).toFixed(3),
        Number(d.rms || 0).toFixed(4)
      ];
    });

    const fileStamp = this.formatTimestampForFilename(session.date);
    const fileBase = `SurSight-Session_${fileStamp}`;
    this.downloadCsv(`${fileBase}.csv`, headers, rows);
    this.exportSessionTimelineImage(session, fileBase);
  }

  deleteSession(id) {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    if (this.currentPlaybackId === id) {
      this.stopPlayback();
    }

    this.sessions = this.sessions.filter((s) => s.id !== id);
    this.saveSessions();
    this.renderSessions();
  }

  clearAll() {
    if (!confirm('Clear all sessions? This cannot be undone.')) return;
    if (this.isPlaying) {
      this.stopPlayback();
    }

    this.sessions = [];
    this.saveSessions();
    this.renderSessions();
  }

  exportAll() {
    if (this.sessions.length === 0) {
      alert('No sessions to export');
      return;
    }

    const sargamMapper = makeSargamMapper(this.getSaSemitone());
    const headers = [
      'Session #',
      'Session ID',
      'Session Date (ISO)',
      'Duration',
      'Data Points',
      'Point #',
      'Time (s)',
      'Western Note',
      'Cents',
      'Frequency (Hz)',
      'Sargam (English)',
      'Sargam (Hindi)',
      'Clarity',
      'RMS',
      'Session Avg Freq (Hz)',
      'Session Min Freq (Hz)',
      'Session Max Freq (Hz)',
      'Session Range (Hz)',
      'Session Avg Clarity',
      'Session Avg RMS'
    ];

    const rows = this.sessions.flatMap((session, sessionIndex) =>
      this.buildSessionPointRows(session, sessionIndex + 1, sargamMapper)
    );

    const fileStamp = this.formatTimestampForFilename(new Date());
    this.downloadCsv(`SurSight-All-Sessions_${fileStamp}.csv`, headers, rows);
  }
}

export const sessions = new SessionManager();
window.sessions = sessions;
