function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgba(hex, alpha = 1) {
  const safeHex = String(hex || '').trim();
  const fullHex = safeHex.length === 4
    ? `#${safeHex[1]}${safeHex[1]}${safeHex[2]}${safeHex[2]}${safeHex[3]}${safeHex[3]}`
    : safeHex;
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!match) return `rgba(15, 23, 42, ${alpha})`;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  const safeAlpha = clampValue(Number.isFinite(alpha) ? alpha : 1, 0, 1);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export function drawTextOverlayAtPoint({
  ctx,
  text,
  point,
  canvasWidth,
  canvasHeight,
  fontSize,
  textColor = '#111827',
  useBackground = true,
  bgColor = '#ffffff',
  bgOpacity = 0.78
}) {
  const content = String(text || '').trim();
  if (!ctx || !content || !Number.isFinite(canvasWidth) || !Number.isFinite(canvasHeight)) {
    return null;
  }
  const safeFontSize = clampValue(parseInt(fontSize, 10) || 36, 10, 220);
  const safeOpacity = clampValue(Number(bgOpacity) || 0.78, 0.12, 1);
  const px = point && Number.isFinite(point.x) ? point.x : (canvasWidth / 2);
  const py = point && Number.isFinite(point.y) ? point.y : (canvasHeight / 2);

  ctx.save();
  ctx.font = `700 ${safeFontSize}px "Segoe UI", Arial, Helvetica, sans-serif`;
  ctx.textBaseline = 'top';
  const textWidth = Math.max(1, Math.ceil(ctx.measureText(content).width));
  const textHeight = Math.max(1, Math.ceil(safeFontSize * 1.18));
  const padX = Math.max(8, Math.round(safeFontSize * 0.32));
  const padY = Math.max(6, Math.round(safeFontSize * 0.22));
  const boxW = textWidth + (padX * 2);
  const boxH = textHeight + (padY * 2);
  const x = clampValue(Math.round(px - (boxW / 2)), 0, Math.max(0, canvasWidth - boxW));
  const y = clampValue(Math.round(py - (boxH / 2)), 0, Math.max(0, canvasHeight - boxH));

  if (useBackground) {
    ctx.fillStyle = hexToRgba(bgColor, safeOpacity);
    const radius = Math.max(8, Math.round(safeFontSize * 0.26));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, boxW, boxH, radius);
    } else {
      ctx.rect(x, y, boxW, boxH);
    }
    ctx.fill();
  }

  ctx.fillStyle = textColor;
  ctx.fillText(content, x + padX, y + padY);
  ctx.restore();

  return {
    x,
    y,
    w: boxW,
    h: boxH,
    textWidth,
    textHeight,
    fontSize: safeFontSize
  };
}
