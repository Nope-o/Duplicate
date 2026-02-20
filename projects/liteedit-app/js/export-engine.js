const VENDOR_CDN = {
  jsZip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  fileSaver: 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  jsPdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
};

const vendorLoads = new Map();
const encodeSupportCache = new Map();

function loadScriptOnce(key, src, isReady) {
  if (isReady()) return Promise.resolve();
  if (vendorLoads.has(key)) return vendorLoads.get(key);

  const loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onload = () => {
      if (isReady()) {
        resolve();
        return;
      }
      reject(new Error(`Loaded ${key}, but API is unavailable.`));
    };
    script.onerror = () => reject(new Error(`Failed to load ${key} from CDN.`));
    document.head.appendChild(script);
  });

  vendorLoads.set(key, loader);
  return loader;
}

export async function ensureExportVendorsLoaded() {
  await Promise.all([
    loadScriptOnce('jsZip', VENDOR_CDN.jsZip, () => typeof window.JSZip === 'function'),
    loadScriptOnce('fileSaver', VENDOR_CDN.fileSaver, () => typeof window.saveAs === 'function'),
    loadScriptOnce('jsPdf', VENDOR_CDN.jsPdf, () => !!(window.jspdf && window.jspdf.jsPDF))
  ]);
}

export function extensionForType(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/avif') return 'avif';
  if (type === 'application/pdf') return 'pdf';
  return 'jpg';
}

export function buildFilename(name, type) {
  const ext = extensionForType(type);
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function encodeCanvasViaDataUrl(canvas, type, quality) {
  try {
    const requestedDataUrl = canvas.toDataURL(type, quality);
    const requestedBlob = dataUrlToBlob(requestedDataUrl);
    if (requestedBlob) {
      return {
        blob: requestedBlob,
        actualType: requestedBlob.type || type
      };
    }
  } catch (error) {
    // Ignore and fall back to PNG.
  }

  try {
    const pngDataUrl = canvas.toDataURL('image/png');
    const pngBlob = dataUrlToBlob(pngDataUrl);
    if (pngBlob) {
      return {
        blob: pngBlob,
        actualType: pngBlob.type || 'image/png'
      };
    }
  } catch (error) {
    return { blob: null, actualType: '' };
  }

  return { blob: null, actualType: '' };
}

export function exportCanvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob,
            actualType: blob.type || type
          });
          return;
        }
        resolve(encodeCanvasViaDataUrl(canvas, type, quality));
      }, type, quality);
      return;
    }

    resolve(encodeCanvasViaDataUrl(canvas, type, quality));
  });
}

export async function canEncodeType(type) {
  if (!type || !type.startsWith('image/')) return false;
  if (encodeSupportCache.has(type)) {
    return encodeSupportCache.get(type);
  }

  const probe = (async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1, 1);
    const { blob, actualType } = await exportCanvasToBlob(canvas, type, 0.8);
    if (!blob) return false;
    return actualType === type;
  })().catch(() => false);

  encodeSupportCache.set(type, probe);
  return probe;
}

export async function exportCanvasToPdfBlob(canvas, quality) {
  await ensureExportVendorsLoaded();
  const jsPdfApi = window.jspdf && window.jspdf.jsPDF;
  if (!jsPdfApi) return null;

  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  const doc = new jsPdfApi({
    orientation,
    unit: 'pt',
    format: [canvas.width, canvas.height],
    compress: true
  });
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  doc.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
  return doc.output('blob');
}

export async function exportAllToPdfBlob(images, quality, onProgress = null) {
  await ensureExportVendorsLoaded();
  const jsPdfApi = window.jspdf && window.jspdf.jsPDF;
  if (!jsPdfApi || images.length === 0) return null;

  const first = images[0].canvas;
  const doc = new jsPdfApi({
    orientation: first.width >= first.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [first.width, first.height],
    compress: true
  });

  for (let index = 0; index < images.length; index += 1) {
    const img = images[index];
    const canvas = img.canvas;
    if (index > 0) {
      doc.addPage(
        [canvas.width, canvas.height],
        canvas.width >= canvas.height ? 'landscape' : 'portrait'
      );
    }
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    doc.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
    if (typeof onProgress === 'function') {
      onProgress(index + 1, images.length);
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  return doc.output('blob');
}

export async function createZip() {
  await ensureExportVendorsLoaded();
  const ZipCtor = window.JSZip;
  if (!ZipCtor) {
    throw new Error('JSZip is unavailable.');
  }
  return new ZipCtor();
}

export async function saveBlob(blob, filename) {
  await ensureExportVendorsLoaded();
  if (typeof window.saveAs === 'function') {
    window.saveAs(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
