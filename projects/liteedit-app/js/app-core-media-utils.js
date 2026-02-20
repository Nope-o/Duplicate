import {
  normalizeImageMimeType,
  sniffImageMimeType
} from './app-core-file-utils.js';

export function releaseDrawable(drawable) {
  if (drawable && typeof drawable.close === 'function') {
    drawable.close();
  }
}

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function loadImageElementFromBlob(blob) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = objectUrl;
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve(img)).catch(() => {});
      }
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function normalizeSvgBlob(blob) {
  try {
    const text = await blob.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== 'svg') return blob;
    if (svg.hasAttribute('width') && svg.hasAttribute('height')) return blob;
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) return blob;
    const values = viewBox.trim().split(/[\s,]+/).map(Number);
    if (values.length < 4 || !Number.isFinite(values[2]) || !Number.isFinite(values[3])) return blob;
    svg.setAttribute('width', String(values[2]));
    svg.setAttribute('height', String(values[3]));
    const serialized = new XMLSerializer().serializeToString(doc);
    return new Blob([serialized], { type: 'image/svg+xml' });
  } catch (error) {
    return blob;
  }
}

export async function decodeImageFile(file) {
  const sniffedMime = await sniffImageMimeType(file);
  const mimeType = normalizeImageMimeType(file, sniffedMime);
  if (!mimeType.startsWith('image/')) {
    throw new Error('Unsupported file type');
  }

  const decodeBlob = mimeType === 'image/svg+xml'
    ? await normalizeSvgBlob(file)
    : file;
  let drawable = null;

  if (typeof createImageBitmap === 'function') {
    try {
      drawable = await createImageBitmap(decodeBlob);
    } catch (error) {
      drawable = null;
    }
  }

  if (!drawable) {
    drawable = await loadImageElementFromBlob(decodeBlob);
  }

  const width = drawable.width || drawable.naturalWidth || 0;
  const height = drawable.height || drawable.naturalHeight || 0;
  if (!width || !height) {
    releaseDrawable(drawable);
    throw new Error('Could not read image dimensions');
  }

  return {
    drawable,
    mimeType,
    sourceW: width,
    sourceH: height
  };
}

export function canvasToBlobSafe(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve) => {
    if (!canvas) {
      resolve(null);
      return;
    }
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        try {
          const dataUrl = canvas.toDataURL(type, quality);
          const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
          if (!match) {
            resolve(null);
            return;
          }
          const bytes = atob(match[2]);
          const array = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i += 1) {
            array[i] = bytes.charCodeAt(i);
          }
          resolve(new Blob([array], { type: match[1] || type }));
        } catch (error) {
          resolve(null);
        }
      }, type, quality);
      return;
    }
    try {
      const dataUrl = canvas.toDataURL(type, quality);
      const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
      if (!match) {
        resolve(null);
        return;
      }
      const bytes = atob(match[2]);
      const array = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i += 1) {
        array[i] = bytes.charCodeAt(i);
      }
      resolve(new Blob([array], { type: match[1] || type }));
    } catch (error) {
      resolve(null);
    }
  });
}
