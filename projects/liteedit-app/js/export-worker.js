const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

self.onmessage = async (event) => {
  const data = event.data || {};
  const { id, bitmap, type, quality } = data;
  if (!id || !bitmap) {
    self.postMessage({ id, error: 'Missing bitmap' });
    return;
  }
  try {
    const mimeType = supportedTypes.has(type) ? type : 'image/png';
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    self.postMessage({ id, blob, actualType: blob.type || mimeType }, [blob]);
  } catch (error) {
    self.postMessage({ id, error: error && error.message ? error.message : 'Worker export failed' });
  } finally {
    if (typeof bitmap.close === 'function') {
      try {
        bitmap.close();
      } catch (error) {}
    }
  }
};
