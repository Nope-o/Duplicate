let cachedTextDetector = null;
let cachedOcrEngine = null;
let cachedOcrEnginePromise = null;

function clampTextRect(rect, canvas) {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const maxW = Math.max(0, canvas.width - x);
  const maxH = Math.max(0, canvas.height - y);
  const w = Math.max(0, Math.min(Math.ceil(rect.w), maxW));
  const h = Math.max(0, Math.min(Math.ceil(rect.h), maxH));
  return { x, y, w, h };
}

function expandTextRect(rect, pad, canvas) {
  if (!rect) return null;
  if (!Number.isFinite(pad) || pad <= 0) {
    return clampTextRect(rect, canvas);
  }
  return clampTextRect({
    x: rect.x - pad,
    y: rect.y - pad,
    w: rect.w + (pad * 2),
    h: rect.h + (pad * 2)
  }, canvas);
}

function mergeTextRects(canvas, ...rects) {
  const valid = rects.filter((rect) => rect && rect.w > 0 && rect.h > 0);
  if (valid.length === 0) return null;
  const minX = Math.min(...valid.map((rect) => rect.x));
  const minY = Math.min(...valid.map((rect) => rect.y));
  const maxX = Math.max(...valid.map((rect) => rect.x + rect.w));
  const maxY = Math.max(...valid.map((rect) => rect.y + rect.h));
  return clampTextRect({
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY)
  }, canvas);
}

function splitRectIntoWordBoxes(rect, rawText) {
  const text = String(rawText || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return [{
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      text: ''
    }];
  }
  const words = text.split(' ').filter(Boolean);
  if (words.length <= 1 || rect.w < 20) {
    return [{
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      text
    }];
  }

  const wordWeights = words.map((word) => Math.max(1.2, word.length));
  const gapWeight = 0.38;
  const totalWeight = wordWeights.reduce((sum, value) => sum + value, 0) + (gapWeight * (words.length - 1));
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return [{
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      text
    }];
  }

  const pxPerWeight = rect.w / totalWeight;
  const out = [];
  let cursor = rect.x;
  for (let i = 0; i < words.length; i += 1) {
    const remaining = (rect.x + rect.w) - cursor;
    const idealWordW = Math.max(8, Math.round(wordWeights[i] * pxPerWeight));
    const wordW = i === words.length - 1
      ? Math.max(8, remaining)
      : Math.max(8, Math.min(idealWordW, Math.max(8, remaining - ((words.length - i - 1) * 8))));
    out.push({
      x: Math.round(cursor),
      y: rect.y,
      w: Math.max(8, wordW),
      h: rect.h,
      text: words[i]
    });
    cursor += wordW;
    if (i < words.length - 1) {
      const gapW = Math.max(2, Math.round(gapWeight * pxPerWeight));
      cursor += gapW;
    }
  }
  return out;
}

function dedupeDetections(detections) {
  const sorted = detections
    .filter(Boolean)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const out = [];
  sorted.forEach((item) => {
    const key = `${item.text}|${Math.round(item.x / 2)}|${Math.round(item.y / 2)}|${Math.round(item.w / 2)}|${Math.round(item.h / 2)}`;
    if (out.some((entry) => entry.__key === key)) return;
    const next = { ...item };
    next.__key = key;
    out.push(next);
  });
  return out.map((entry) => {
    const clean = { ...entry };
    delete clean.__key;
    return clean;
  });
}

function normalizeTextDetectionResult(result, canvas, granularity = 'word') {
  const box = result && result.boundingBox;
  if (!box) return [];
  const normalized = clampTextRect({
    x: box.x || 0,
    y: box.y || 0,
    w: box.width || 0,
    h: box.height || 0
  }, canvas);
  if (normalized.w < 8 || normalized.h < 8) return [];
  const text = String((result && result.rawValue) || '').replace(/\s+/g, ' ').trim();
  if (granularity === 'line') {
    return [{
      x: normalized.x,
      y: normalized.y,
      w: normalized.w,
      h: normalized.h,
      text
    }];
  }
  return splitRectIntoWordBoxes(normalized, text);
}

function averageColor(samples, fallback) {
  if (!samples || samples.length === 0) {
    return { ...fallback };
  }
  let r = 0;
  let g = 0;
  let b = 0;
  samples.forEach((sample) => {
    r += sample.r;
    g += sample.g;
    b += sample.b;
  });
  const total = samples.length;
  return {
    r: Math.round(r / total),
    g: Math.round(g / total),
    b: Math.round(b / total)
  };
}

function colorToCss(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function luminance(r, g, b) {
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function readPixel(data, width, x, y) {
  const idx = ((y * width) + x) * 4;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3]
  };
}

function paintBackgroundFromEdges(ctx, canvas, rect, fallbackFill) {
  const safeRect = clampTextRect(rect, canvas);
  if (safeRect.w < 1 || safeRect.h < 1) return;
  const preferredOffset = Math.max(2, Math.min(5, Math.round(Math.min(safeRect.w, safeRect.h) * 0.08)));
  const resolveTopY = () => {
    for (let d = preferredOffset; d >= 1; d -= 1) {
      const y = safeRect.y - d;
      if (y >= 0) return y;
    }
    return null;
  };
  const resolveBottomY = () => {
    for (let d = preferredOffset; d >= 1; d -= 1) {
      const y = safeRect.y + safeRect.h - 1 + d;
      if (y < canvas.height) return y;
    }
    return null;
  };
  const resolveLeftX = () => {
    for (let d = preferredOffset; d >= 1; d -= 1) {
      const x = safeRect.x - d;
      if (x >= 0) return x;
    }
    return null;
  };
  const resolveRightX = () => {
    for (let d = preferredOffset; d >= 1; d -= 1) {
      const x = safeRect.x + safeRect.w - 1 + d;
      if (x < canvas.width) return x;
    }
    return null;
  };

  try {
    const topY = resolveTopY();
    const bottomY = resolveBottomY();
    const leftX = resolveLeftX();
    const rightX = resolveRightX();
    const topData = Number.isFinite(topY)
      ? ctx.getImageData(safeRect.x, topY, safeRect.w, 1).data
      : null;
    const bottomData = Number.isFinite(bottomY)
      ? ctx.getImageData(safeRect.x, bottomY, safeRect.w, 1).data
      : null;
    const leftData = Number.isFinite(leftX)
      ? ctx.getImageData(leftX, safeRect.y, 1, safeRect.h).data
      : null;
    const rightData = Number.isFinite(rightX)
      ? ctx.getImageData(rightX, safeRect.y, 1, safeRect.h).data
      : null;

    const outData = ctx.createImageData(safeRect.w, safeRect.h);
    const out = outData.data;

    const sampleHorizontal = (arr, width, u) => {
      if (!arr) return null;
      const index = Math.max(0, Math.min(width - 1, Math.round(u * (width - 1))));
      return readPixel(arr, width, index, 0);
    };
    const sampleVertical = (arr, height, v) => {
      if (!arr) return null;
      const index = Math.max(0, Math.min(height - 1, Math.round(v * (height - 1))));
      return readPixel(arr, 1, 0, index);
    };

    for (let y = 0; y < safeRect.h; y += 1) {
      const v = safeRect.h <= 1 ? 0 : (y / (safeRect.h - 1));
      for (let x = 0; x < safeRect.w; x += 1) {
        const u = safeRect.w <= 1 ? 0 : (x / (safeRect.w - 1));
        const picks = [];

        const topPx = sampleHorizontal(topData, safeRect.w, u);
        if (topPx) picks.push({ color: topPx, weight: 1 - v });
        const bottomPx = sampleHorizontal(bottomData, safeRect.w, u);
        if (bottomPx) picks.push({ color: bottomPx, weight: v });
        const leftPx = sampleVertical(leftData, safeRect.h, v);
        if (leftPx) picks.push({ color: leftPx, weight: 1 - u });
        const rightPx = sampleVertical(rightData, safeRect.h, v);
        if (rightPx) picks.push({ color: rightPx, weight: u });

        let pixel = { r: 245, g: 245, b: 245 };
        if (picks.length > 0) {
          let wr = 0;
          let wg = 0;
          let wb = 0;
          let wt = 0;
          picks.forEach((entry) => {
            const w = Math.max(0.08, entry.weight);
            wr += entry.color.r * w;
            wg += entry.color.g * w;
            wb += entry.color.b * w;
            wt += w;
          });
          if (wt > 0) {
            pixel = {
              r: Math.round(wr / wt),
              g: Math.round(wg / wt),
              b: Math.round(wb / wt)
            };
          }
        }

        const idx = ((y * safeRect.w) + x) * 4;
        out[idx] = pixel.r;
        out[idx + 1] = pixel.g;
        out[idx + 2] = pixel.b;
        out[idx + 3] = 255;
      }
    }
    ctx.putImageData(outData, safeRect.x, safeRect.y);
  } catch (error) {
    ctx.fillStyle = fallbackFill;
    ctx.fillRect(safeRect.x, safeRect.y, safeRect.w, safeRect.h);
  }
}

function pickForegroundSamples(textPixels, backgroundLum) {
  if (!textPixels || textPixels.length === 0) return [];
  const sorted = [...textPixels].sort((a, b) => luminance(a.r, a.g, a.b) - luminance(b.r, b.g, b.b));
  const avgLum = sorted.reduce((sum, px) => sum + luminance(px.r, px.g, px.b), 0) / sorted.length;
  const darkText = avgLum <= backgroundLum;
  const sampleCount = Math.max(8, Math.floor(sorted.length * 0.38));
  return darkText
    ? sorted.slice(0, sampleCount)
    : sorted.slice(Math.max(0, sorted.length - sampleCount));
}

function estimateTextReplaceColors(canvas, rect) {
  const sample = canvas.getContext('2d').getImageData(rect.x, rect.y, rect.w, rect.h).data;
  const borderPixels = [];
  const textPixels = [];
  const fallbackBg = { r: 245, g: 245, b: 245 };

  const width = rect.w;
  const height = rect.h;
  const getPixel = (x, y) => {
    const idx = ((y * width) + x) * 4;
    return {
      r: sample[idx],
      g: sample[idx + 1],
      b: sample[idx + 2],
      a: sample[idx + 3]
    };
  };

  for (let x = 0; x < width; x += 1) {
    borderPixels.push(getPixel(x, 0));
    if (height > 1) borderPixels.push(getPixel(x, height - 1));
  }
  for (let y = 1; y < height - 1; y += 1) {
    borderPixels.push(getPixel(0, y));
    if (width > 1) borderPixels.push(getPixel(width - 1, y));
  }

  const bg = averageColor(borderPixels, fallbackBg);
  const bgLum = luminance(bg.r, bg.g, bg.b);
  const threshold = 24;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = getPixel(x, y);
      if (px.a < 16) continue;
      const pxLum = luminance(px.r, px.g, px.b);
      if (Math.abs(pxLum - bgLum) > threshold) {
        textPixels.push(px);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const fallbackText = bgLum > 140
    ? { r: 24, g: 24, b: 27 }
    : { r: 240, g: 240, b: 245 };
  const fgSamples = pickForegroundSamples(textPixels, bgLum);
  const fg = averageColor(fgSamples, fallbackText);
  const hasInkBounds = maxX >= minX && maxY >= minY;
  const inkBounds = hasInkBounds
    ? {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY
    }
    : {
      left: Math.max(0, Math.round(width * 0.12)),
      top: Math.max(0, Math.round(height * 0.2)),
      right: Math.max(0, width - Math.max(1, Math.round(width * 0.12)) - 1),
      bottom: Math.max(0, height - Math.max(1, Math.round(height * 0.2)) - 1)
    };
  const leftPad = Math.max(0, inkBounds.left);
  const rightPad = Math.max(0, width - inkBounds.right - 1);
  const alignTolerance = Math.max(2, Math.round(width * 0.14));
  let textAlign = 'left';
  if (Math.abs(leftPad - rightPad) <= alignTolerance) {
    textAlign = 'center';
  } else if (leftPad > rightPad) {
    textAlign = 'right';
  }
  const inkMidY = (inkBounds.top + inkBounds.bottom + 1) / 2;
  const verticalOffset = inkMidY - (height / 2);

  return {
    background: colorToCss(bg),
    foreground: colorToCss(fg),
    textAlign,
    verticalOffset,
    paddingLeft: leftPad,
    paddingRight: rightPad,
    inkBounds
  };
}

export function estimateTextStyle(canvas, selectionRect, sourceText = '') {
  if (!canvas || !selectionRect) return null;
  const rect = clampTextRect(selectionRect, canvas);
  if (rect.w < 6 || rect.h < 6) return null;
  const ctx = canvas.getContext('2d');
  const colors = estimateTextReplaceColors(canvas, rect);
  const textPadding = Math.max(2, Math.round(rect.h * 0.12));
  const paddingLeft = Math.max(textPadding, Number.isFinite(colors.paddingLeft) ? colors.paddingLeft : textPadding);
  const paddingRight = Math.max(textPadding, Number.isFinite(colors.paddingRight) ? colors.paddingRight : textPadding);
  const maxTextWidth = Math.max(4, rect.w - paddingLeft - paddingRight);
  const maxTextHeight = Math.max(4, rect.h - (textPadding * 2));
  const fallbackText = String(sourceText || '').trim() || 'Text';
  const fontWeight = rect.h > 30 ? 600 : 500;
  const fontSize = computeFittedFontSize({
    ctx,
    text: fallbackText,
    fontWeight,
    fontFamily: resolveTextFontFamily('auto'),
    minFont: 8,
    maxFont: Math.max(8, Math.round(rect.h * 1.32)),
    maxWidth: maxTextWidth,
    maxHeight: maxTextHeight
  });
  return {
    background: colors.background,
    foreground: colors.foreground,
    fontSize,
    fontWeight,
    textAlign: colors.textAlign || 'left',
    verticalOffset: Number.isFinite(colors.verticalOffset) ? colors.verticalOffset : 0,
    paddingLeft,
    paddingRight,
    inkBounds: colors.inkBounds || null
  };
}

function resolveTextFontFamily(fontFamily) {
  if (fontFamily && fontFamily !== 'auto') {
    return fontFamily;
  }
  return '"Segoe UI", Arial, Helvetica, sans-serif';
}

function measureTextHeight(ctx, text, fallbackSize) {
  const sampleText = text && text.trim() ? text : 'Mg';
  const metrics = ctx.measureText(sampleText);
  const ascent = Number.isFinite(metrics.actualBoundingBoxAscent) ? metrics.actualBoundingBoxAscent : fallbackSize * 0.8;
  const descent = Number.isFinite(metrics.actualBoundingBoxDescent) ? metrics.actualBoundingBoxDescent : fallbackSize * 0.24;
  return Math.max(1, ascent + descent);
}

function doesTextFitBounds(ctx, text, maxWidth, maxHeight, fallbackSize) {
  const width = ctx.measureText(text).width;
  const height = measureTextHeight(ctx, text, fallbackSize);
  return width <= maxWidth && height <= maxHeight;
}

function computeFittedFontSize({
  ctx,
  text,
  fontWeight,
  fontFamily,
  minFont,
  maxFont,
  maxWidth,
  maxHeight
}) {
  const content = String(text || '').trim() || 'Text';
  let low = minFont;
  let high = Math.max(minFont, Math.floor(maxFont));
  let best = minFont;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    ctx.font = `${fontWeight} ${mid}px ${fontFamily}`;
    if (doesTextFitBounds(ctx, content, maxWidth, maxHeight, mid)) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

export function isTextDetectorSupported() {
  return typeof window.TextDetector === 'function';
}

function hasPreloadedOcrEngine() {
  return !!(window.Tesseract && typeof window.Tesseract.recognize === 'function');
}

async function ensureOcrEngineLoaded() {
  if (cachedOcrEngine && typeof cachedOcrEngine.recognize === 'function') {
    return cachedOcrEngine;
  }
  if (hasPreloadedOcrEngine()) {
    cachedOcrEngine = window.Tesseract;
    return cachedOcrEngine;
  }
  if (cachedOcrEnginePromise) {
    return cachedOcrEnginePromise;
  }

  const candidates = [
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js',
    'https://unpkg.com/tesseract.js@5/dist/tesseract.esm.min.js'
  ];

  cachedOcrEnginePromise = (async () => {
    for (const url of candidates) {
      try {
        const mod = await import(url);
        const engine = mod?.default || mod?.Tesseract || mod;
        if (engine && typeof engine.recognize === 'function') {
          cachedOcrEngine = engine;
          return engine;
        }
      } catch (error) {}
    }
    throw new Error('OCR engine could not be loaded.');
  })();

  try {
    return await cachedOcrEnginePromise;
  } finally {
    if (!cachedOcrEngine) {
      cachedOcrEnginePromise = null;
    }
  }
}

function normalizeOcrBBox(entry) {
  const bbox = entry?.bbox || entry?.boundingBox || entry || {};
  const x0 = Number.isFinite(bbox.x0) ? bbox.x0 : (Number.isFinite(bbox.x) ? bbox.x : (Number.isFinite(bbox.left) ? bbox.left : 0));
  const y0 = Number.isFinite(bbox.y0) ? bbox.y0 : (Number.isFinite(bbox.y) ? bbox.y : (Number.isFinite(bbox.top) ? bbox.top : 0));
  const x1 = Number.isFinite(bbox.x1) ? bbox.x1 : (Number.isFinite(bbox.right) ? bbox.right : (Number.isFinite(bbox.width) ? x0 + bbox.width : x0));
  const y1 = Number.isFinite(bbox.y1) ? bbox.y1 : (Number.isFinite(bbox.bottom) ? bbox.bottom : (Number.isFinite(bbox.height) ? y0 + bbox.height : y0));
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.abs(x1 - x0),
    h: Math.abs(y1 - y0)
  };
}

function normalizeOcrResult(result, canvas, granularity = 'word') {
  const lines = Array.isArray(result?.data?.lines) ? result.data.lines : [];
  const words = Array.isArray(result?.data?.words) ? result.data.words : [];
  const source = granularity === 'word'
    ? (words.length > 0 ? words : lines)
    : (lines.length > 0 ? lines : words);
  const normalized = source
    .flatMap((item) => {
      const rect = normalizeOcrBBox(item);
      const bounded = clampTextRect(rect, canvas);
      if (bounded.w < 8 || bounded.h < 8) return [];
      const text = String(item?.text || '').replace(/\s+/g, ' ').trim();
      if (!text) return [];
      if (granularity === 'word') {
        return splitRectIntoWordBoxes(bounded, text);
      }
      return [{
        x: bounded.x,
        y: bounded.y,
        w: bounded.w,
        h: bounded.h,
        text
      }];
    });
  return dedupeDetections(normalized);
}

export async function detectTextBlocks(canvas, options = {}) {
  const granularity = options.granularity === 'line' ? 'line' : 'word';
  if (isTextDetectorSupported()) {
    if (!cachedTextDetector) {
      cachedTextDetector = new window.TextDetector();
    }
    const rawResults = await cachedTextDetector.detect(canvas);
    const normalized = rawResults
      .flatMap((result) => normalizeTextDetectionResult(result, canvas, granularity));
    return dedupeDetections(normalized);
  }

  const ocrEngine = await ensureOcrEngineLoaded();
  const ocrResult = await ocrEngine.recognize(canvas, 'eng');
  return normalizeOcrResult(ocrResult, canvas, granularity);
}

export function drawTextDetections(ctx, detections, selectedIndex) {
  if (!detections || detections.length === 0) return;
  detections.forEach((box, idx) => {
    const selected = idx === selectedIndex;
    ctx.save();
    ctx.lineWidth = selected ? 1.8 : 1;
    ctx.setLineDash(selected ? [] : [3, 3]);
    ctx.strokeStyle = selected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.58)';
    if (selected) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.restore();
  });
}

export function applySmartTextReplace({
  canvas,
  selectionRect,
  sourceText,
  sourceStyle,
  replacement,
  fontFamily,
  autoFit,
  lockSourceSize = false,
  expandWidthToFit = false
}) {
  if (!canvas || !selectionRect || !replacement) {
    return { applied: false, reason: 'Missing input.' };
  }

  let rect = clampTextRect(selectionRect, canvas);
  if (rect.w < 6 || rect.h < 6) {
    return { applied: false, reason: 'Detected text box is too small.' };
  }

  const ctx = canvas.getContext('2d');
  const inferredStyle = estimateTextStyle(canvas, rect, sourceText || replacement) || {};
  const colors = {
    // Prefer fresh background estimate to avoid stale patch colors.
    background: inferredStyle.background || (sourceStyle && sourceStyle.background) || '#f5f5f5',
    foreground: (sourceStyle && sourceStyle.foreground) || inferredStyle.foreground || '#111827'
  };
  const textAlign = (sourceStyle && sourceStyle.textAlign) || inferredStyle.textAlign || 'left';
  const verticalOffset = Number.isFinite(sourceStyle && sourceStyle.verticalOffset)
    ? sourceStyle.verticalOffset
    : (Number.isFinite(inferredStyle.verticalOffset) ? inferredStyle.verticalOffset : 0);
  const resolvedFont = resolveTextFontFamily(fontFamily);
  const fontWeight = (sourceStyle && Number.isFinite(sourceStyle.fontWeight) ? sourceStyle.fontWeight : null)
    || (inferredStyle && Number.isFinite(inferredStyle.fontWeight) ? inferredStyle.fontWeight : null)
    || (rect.h > 30 ? 600 : 500);
  const minFont = 8;
  const sourceFontSize = (sourceStyle && Number.isFinite(sourceStyle.fontSize) && sourceStyle.fontSize > 0)
    ? Math.round(sourceStyle.fontSize)
    : ((inferredStyle && Number.isFinite(inferredStyle.fontSize) && inferredStyle.fontSize > 0)
      ? Math.round(inferredStyle.fontSize)
      : Math.max(minFont, Math.round(rect.h * 0.74)));
  const stableSourceFontSize = Math.max(minFont, sourceFontSize + 1);
  let fontSize = stableSourceFontSize;
  const defaultPadding = Math.max(2, Math.round(rect.h * 0.12));
  const sourcePaddingLeft = Number.isFinite(sourceStyle && sourceStyle.paddingLeft)
    ? sourceStyle.paddingLeft
    : (Number.isFinite(inferredStyle.paddingLeft) ? inferredStyle.paddingLeft : defaultPadding);
  const sourcePaddingRight = Number.isFinite(sourceStyle && sourceStyle.paddingRight)
    ? sourceStyle.paddingRight
    : (Number.isFinite(inferredStyle.paddingRight) ? inferredStyle.paddingRight : defaultPadding);
  const leftPadding = Math.max(defaultPadding, Math.round(sourcePaddingLeft));
  const rightPadding = Math.max(defaultPadding, Math.round(sourcePaddingRight));
  let maxTextWidth = Math.max(4, rect.w - leftPadding - rightPadding);
  const maxTextHeight = Math.max(4, rect.h - (defaultPadding * 2));
  const referenceText = String(sourceText || replacement || '').trim() || replacement;

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = textAlign;
  const inferredFont = computeFittedFontSize({
    ctx,
    text: referenceText,
    fontWeight,
    fontFamily: resolvedFont,
    minFont,
    maxFont: Math.max(minFont, Math.round(rect.h * 1.32)),
    maxWidth: maxTextWidth,
    maxHeight: maxTextHeight
  });
  fontSize = Math.max(stableSourceFontSize, inferredFont);
  if (lockSourceSize) {
    fontSize = Math.max(stableSourceFontSize, Math.max(minFont, Math.round(rect.h * 0.78)));
  }

  const sourceInkBounds = (sourceStyle && sourceStyle.inkBounds) || inferredStyle.inkBounds || null;
  let sourceCleanupRect = null;
  if (sourceInkBounds) {
    const cleanupPad = Math.max(2, Math.round(rect.h * 0.16));
    const sourceInkWidth = Math.max(1, sourceInkBounds.right - sourceInkBounds.left + 1);
    const sourceInkHeight = Math.max(1, sourceInkBounds.bottom - sourceInkBounds.top + 1);
    const sourceInkRatio = (sourceInkWidth * sourceInkHeight) / Math.max(1, rect.w * rect.h);
    if (sourceInkRatio <= 0.78) {
      sourceCleanupRect = clampTextRect({
        x: rect.x + sourceInkBounds.left - cleanupPad,
        y: rect.y + sourceInkBounds.top - cleanupPad,
        w: sourceInkWidth + (cleanupPad * 2),
        h: sourceInkHeight + (cleanupPad * 2)
      }, canvas);
    }
  }
  if (!sourceCleanupRect && sourceText) {
    const sampleText = String(sourceText || '').trim();
    if (sampleText) {
      ctx.font = `${fontWeight} ${fontSize}px ${resolvedFont}`;
      const measured = Math.ceil(ctx.measureText(sampleText).width + leftPadding + rightPadding);
      const targetWidth = Math.max(8, Math.min(rect.w, measured));
      let cleanupX = rect.x;
      if (textAlign === 'center') {
        cleanupX = Math.round(rect.x + ((rect.w - targetWidth) / 2));
      } else if (textAlign === 'right') {
        cleanupX = Math.round((rect.x + rect.w) - targetWidth);
      }
      sourceCleanupRect = clampTextRect({
        x: cleanupX,
        y: rect.y,
        w: targetWidth,
        h: rect.h
      }, canvas);
    }
  }

  if (expandWidthToFit) {
    ctx.font = `${fontWeight} ${fontSize}px ${resolvedFont}`;
    const neededWidth = Math.ceil(ctx.measureText(replacement).width + leftPadding + rightPadding);
    if (neededWidth > rect.w) {
      const targetWidth = Math.min(canvas.width, Math.max(rect.w, neededWidth));
      let nextX = rect.x;
      if (textAlign === 'center') {
        nextX = rect.x - Math.round((targetWidth - rect.w) / 2);
      } else if (textAlign === 'right') {
        nextX = rect.x + rect.w - targetWidth;
      }
      if (nextX + targetWidth > canvas.width) {
        nextX = Math.max(0, canvas.width - targetWidth);
      }
      rect = clampTextRect({
        x: nextX,
        y: rect.y,
        w: targetWidth,
        h: rect.h
      }, canvas);
      maxTextWidth = Math.max(4, rect.w - leftPadding - rightPadding);
    }
  }

  if (autoFit && !lockSourceSize) {
    const preserveMinFont = Math.max(minFont, stableSourceFontSize);
    fontSize = computeFittedFontSize({
      ctx,
      text: replacement,
      fontWeight,
      fontFamily: resolvedFont,
      minFont: preserveMinFont,
      maxFont: fontSize,
      maxWidth: maxTextWidth * 1.06,
      maxHeight: maxTextHeight * 1.04
    });
    ctx.font = `${fontWeight} ${fontSize}px ${resolvedFont}`;
    if (!doesTextFitBounds(ctx, replacement, maxTextWidth, maxTextHeight, fontSize)) {
      fontSize = computeFittedFontSize({
        ctx,
        text: replacement,
        fontWeight,
        fontFamily: resolvedFont,
        minFont,
        maxFont: fontSize,
        maxWidth: maxTextWidth,
        maxHeight: maxTextHeight
      });
    }
    // Keep visual size stable; never shrink below source font size.
    fontSize = Math.max(stableSourceFontSize, fontSize);
  }
  ctx.font = `${fontWeight} ${fontSize}px ${resolvedFont}`;

  let textX = rect.x + leftPadding;
  if (textAlign === 'center') {
    textX = rect.x + (rect.w / 2);
  } else if (textAlign === 'right') {
    textX = rect.x + rect.w - rightPadding;
  }
  const textY = rect.y + (rect.h / 2) + verticalOffset;
  const renderedWidth = Math.max(1, Math.ceil(ctx.measureText(replacement).width));
  const renderedHeight = Math.max(1, Math.ceil(measureTextHeight(ctx, replacement, fontSize)));
  let renderedX = textX;
  if (textAlign === 'center') {
    renderedX = textX - (renderedWidth / 2);
  } else if (textAlign === 'right') {
    renderedX = textX - renderedWidth;
  }
  const renderedRect = clampTextRect({
    x: Math.floor(renderedX),
    y: Math.floor(textY - (renderedHeight / 2)),
    w: renderedWidth,
    h: renderedHeight
  }, canvas);
  const cleanupSeed = sourceCleanupRect || rect;
  const mergedCleanupRect = mergeTextRects(canvas, cleanupSeed, rect, renderedRect) || rect;
  const cleanupPad = Math.max(2, Math.round(Math.max(fontSize, rect.h) * 0.16));
  const cleanupRect = expandTextRect(mergedCleanupRect, cleanupPad, canvas);
  paintBackgroundFromEdges(ctx, canvas, cleanupRect, colors.background);

  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = colors.foreground;
  ctx.fillText(replacement, textX, textY);
  ctx.restore();

  return {
    applied: true,
    rect,
    style: {
      background: colors.background,
      foreground: colors.foreground,
      fontSize,
      fontWeight,
      textAlign,
      verticalOffset,
      paddingLeft: leftPadding,
      paddingRight: rightPadding,
      inkBounds: sourceInkBounds
    }
  };
}
