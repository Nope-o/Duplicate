import { clamp } from './music.js';

export class SonicCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches || false;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.isCoarsePointer ? 1.5 : 2);
    this.trail = [];
    this.lastTrailTs = 0;
    this.lastTrailFrequency = 0;
    this.maxTrailPoints = this.isCoarsePointer ? 72 : 120;
    this.barCount = this.isCoarsePointer ? 28 : 44;
    this.stars = Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: 0.6 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.5
    }));
    this.lastResize = { width: 0, height: 0 };
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || this.canvas.width));
    const height = Math.max(260, Math.round(rect.height || this.canvas.height));
    if (this.lastResize.width === width && this.lastResize.height === height) return;
    this.lastResize = { width, height };
    this.canvas.width = Math.round(width * this.pixelRatio);
    this.canvas.height = Math.round(height * this.pixelRatio);
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  pushTrailPoint(frequency) {
    if (!Number.isFinite(frequency)) return;
    const now = performance.now();
    if ((now - this.lastTrailTs) < 65 && Math.abs(frequency - this.lastTrailFrequency) < 0.5) {
      return;
    }

    this.lastTrailTs = now;
    this.lastTrailFrequency = frequency;
    this.trail.push({ time: now, frequency });
    const cutoff = now - 5000;
    while (this.trail.length && this.trail[0].time < cutoff) {
      this.trail.shift();
    }
    if (this.trail.length > this.maxTrailPoints) {
      this.trail.splice(0, this.trail.length - this.maxTrailPoints);
    }
  }

  render({ analyserData, noteData, meta }) {
    this.resize();
    const ctx = this.ctx;
    const width = this.lastResize.width;
    const height = this.lastResize.height;

    ctx.clearRect(0, 0, width, height);
    this.drawBackdrop(ctx, width, height);

    this.drawGrid(ctx, width, height);
    this.drawWaveform(ctx, width, height, analyserData?.timeDomain);
    this.drawSpectrum(ctx, width, height, analyserData?.frequencyData);
    this.drawTrail(ctx, width, height, noteData?.frequency);
    this.drawMeter(ctx, width, height, noteData, meta);
  }

  drawBackdrop(ctx, width, height) {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#040916');
    bg.addColorStop(0.55, '#081221');
    bg.addColorStop(1, '#0a1326');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const glowA = ctx.createRadialGradient(width * 0.18, height * 0.16, 0, width * 0.18, height * 0.16, width * 0.32);
    glowA.addColorStop(0, 'rgba(103, 232, 249, 0.16)');
    glowA.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, width, height);

    const glowB = ctx.createRadialGradient(width * 0.82, height * 0.22, 0, width * 0.82, height * 0.22, width * 0.28);
    glowB.addColorStop(0, 'rgba(168, 85, 247, 0.14)');
    glowB.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    this.stars.forEach((star) => {
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += height / 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawWaveform(ctx, width, height, timeDomain) {
    if (!timeDomain || !timeDomain.length) return;
    const topBand = height * 0.28;
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.95)';
    for (let i = 0; i < timeDomain.length; i += 1) {
      const x = (i / (timeDomain.length - 1)) * width;
      const sample = timeDomain[i] / 255;
      const y = topBand * 0.5 + (sample - 0.5) * topBand * 0.78;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawSpectrum(ctx, width, height, frequencyData) {
    if (!frequencyData || !frequencyData.length) return;
    const barAreaTop = height * 0.34;
    const barAreaHeight = height * 0.24;
    const bars = this.barCount;
    const step = Math.max(1, Math.floor(frequencyData.length / bars));
    const barWidth = width / bars;
    const fill = ctx.createLinearGradient(0, barAreaTop, 0, barAreaTop + barAreaHeight);
    fill.addColorStop(0, 'rgba(168, 85, 247, 0.88)');
    fill.addColorStop(1, 'rgba(52, 211, 153, 0.08)');
    ctx.save();
    ctx.fillStyle = fill;
    for (let i = 0; i < bars; i += 1) {
      const value = frequencyData[i * step] / 255;
      const barHeight = value * barAreaHeight;
      const x = i * barWidth + 2;
      const y = barAreaTop + barAreaHeight - barHeight;
      ctx.fillRect(x, y, Math.max(2, barWidth - 4), barHeight);
    }
    ctx.restore();
  }

  drawTrail(ctx, width, height, currentFrequency) {
    if (currentFrequency) {
      this.pushTrailPoint(currentFrequency);
    }
    if (!this.trail.length) return;

    const now = performance.now();
    const minFreq = 110;
    const maxFreq = 880;
    const plotTop = height * 0.62;
    const plotHeight = height * 0.26;

    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.9)';

    this.trail.forEach((point, index) => {
      const age = clamp((now - point.time) / 5000, 0, 1);
      const x = width - age * width;
      const normalized = clamp((point.frequency - minFreq) / (maxFreq - minFreq), 0, 1);
      const y = plotTop + plotHeight - normalized * plotHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const latest = this.trail[this.trail.length - 1];
    const latestNorm = clamp((latest.frequency - minFreq) / (maxFreq - minFreq), 0, 1);
    const latestY = plotTop + plotHeight - latestNorm * plotHeight;
    ctx.fillStyle = 'rgba(52, 211, 153, 0.95)';
    ctx.beginPath();
    ctx.arc(width - 8, latestY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawMeter(ctx, width, height, noteData, meta) {
    const centerX = width * 0.78;
    const centerY = height * 0.28;
    const radius = Math.min(width, height) * 0.12;
    const cents = clamp(noteData?.cents || 0, -50, 50);
    const angle = (-Math.PI * 0.75) + ((cents + 50) / 100) * (Math.PI * 1.5);

    ctx.save();
    const ring = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    ring.addColorStop(0, '#67e8f9');
    ring.addColorStop(0.5, '#a855f7');
    ring.addColorStop(1, '#34d399');
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = ring;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI * 0.75, angle);
    ctx.stroke();

    ctx.fillStyle = '#f8fbff';
    ctx.font = '700 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(noteData?.western || '--', centerX, centerY - 6);
    ctx.fillStyle = '#9fb3d9';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText(meta?.modeLabel || 'Mode', centerX, centerY + 18);
    ctx.restore();
  }
}
