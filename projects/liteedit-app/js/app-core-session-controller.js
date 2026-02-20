export function createSessionController({
  state,
  clamp,
  normalizeTextStrictness,
  ensureSessionStoreLoaded,
  cloneAdjustmentStep,
  canvasSnapshot,
  loadImageElementFromBlob,
  canvasToBlobSafe,
  sanitizeFileName,
  largeImagePixelThreshold,
  setStatus,
  showToast,
  selectImage,
  requestThumbnailsRender,
  updateActionAvailability,
  renderCanvas
}) {
  let sessionAutosaveTimer = null;
  let sessionSaveCounter = 0;

  async function serializeImageForSession(img) {
    const originalBlob = await canvasToBlobSafe(img.originalCanvas, 'image/png', 0.9);
    const editedBlob = await canvasToBlobSafe(img.canvas, 'image/png', 0.9);
    if (!originalBlob || !editedBlob) return null;
    return {
      id: img.id,
      name: img.name,
      mimeType: img.mimeType || 'image/png',
      sizeKB: img.sizeKB,
      dirty: !!img.dirty,
      revision: img.revision || 0,
      lastExportRevision: img.lastExportRevision || 0,
      sourceWidth: img.sourceWidth || img.canvas.width,
      sourceHeight: img.sourceHeight || img.canvas.height,
      wasDownscaledOnImport: !!img.wasDownscaledOnImport,
      adjustmentStack: Array.isArray(img.adjustmentStack) ? img.adjustmentStack.map(cloneAdjustmentStep) : [],
      adjustmentBaseBlob: img.adjustmentBaseCanvas
        ? await canvasToBlobSafe(img.adjustmentBaseCanvas, 'image/png', 0.9)
        : null,
      originalBlob,
      editedBlob
    };
  }

  async function buildImageStateFromSessionEntry(entry) {
    const [originalDrawable, editedDrawable] = await Promise.all([
      loadImageElementFromBlob(entry.originalBlob),
      loadImageElementFromBlob(entry.editedBlob)
    ]);

    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = originalDrawable.width || originalDrawable.naturalWidth;
    originalCanvas.height = originalDrawable.height || originalDrawable.naturalHeight;
    originalCanvas.getContext('2d').drawImage(originalDrawable, 0, 0);

    const editedCanvas = document.createElement('canvas');
    editedCanvas.width = editedDrawable.width || editedDrawable.naturalWidth;
    editedCanvas.height = editedDrawable.height || editedDrawable.naturalHeight;
    editedCanvas.getContext('2d').drawImage(editedDrawable, 0, 0);

    const baseBlob = entry.adjustmentBaseBlob || null;
    let adjustmentBaseCanvas = null;
    if (baseBlob) {
      try {
        const baseDrawable = await loadImageElementFromBlob(baseBlob);
        adjustmentBaseCanvas = document.createElement('canvas');
        adjustmentBaseCanvas.width = baseDrawable.width || baseDrawable.naturalWidth;
        adjustmentBaseCanvas.height = baseDrawable.height || baseDrawable.naturalHeight;
        adjustmentBaseCanvas.getContext('2d').drawImage(baseDrawable, 0, 0);
      } catch (error) {
        adjustmentBaseCanvas = null;
      }
    }

    const safeName = sanitizeFileName(entry.name || `image-${Date.now()}`) || `image-${Date.now()}`;
    const file = new File([entry.editedBlob], safeName, { type: entry.editedBlob.type || 'image/png' });
    const pixelCount = editedCanvas.width * editedCanvas.height;
    const largeImage = pixelCount >= largeImagePixelThreshold;
    return {
      id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      mimeType: entry.mimeType || file.type || 'image/png',
      name: safeName,
      sizeKB: Number.isFinite(parseFloat(entry.sizeKB)) ? entry.sizeKB : (file.size / 1024).toFixed(1),
      originalCanvas,
      originalSnapshot: canvasSnapshot(originalCanvas),
      canvas: editedCanvas,
      history: [],
      future: [],
      dirty: !!entry.dirty,
      revision: Number.isFinite(entry.revision) ? entry.revision : 0,
      lastExportRevision: Number.isFinite(entry.lastExportRevision) ? entry.lastExportRevision : 0,
      sourceWidth: Number.isFinite(entry.sourceWidth) ? entry.sourceWidth : originalCanvas.width,
      sourceHeight: Number.isFinite(entry.sourceHeight) ? entry.sourceHeight : originalCanvas.height,
      wasDownscaledOnImport: !!entry.wasDownscaledOnImport,
      largeImage,
      pixelCount,
      adjustmentStack: Array.isArray(entry.adjustmentStack) ? entry.adjustmentStack.map(cloneAdjustmentStep) : [],
      adjustmentBaseCanvas,
      textDetections: [],
      thumbRevision: -1,
      thumbDataUrl: ''
    };
  }

  async function clearSessionSnapshot() {
    try {
      const sessionStore = await ensureSessionStoreLoaded();
      await sessionStore.clearSession();
    } catch (error) {
      // Ignore session cleanup failures.
    }
  }

  async function performSessionAutosave() {
    if (state.sessionRestoring) return;
    const saveToken = ++sessionSaveCounter;
    if (state.images.length === 0) {
      await clearSessionSnapshot();
      return;
    }
    try {
      const sessionStore = await ensureSessionStoreLoaded();
      const serializedImages = [];
      for (const img of state.images) {
        const entry = await serializeImageForSession(img);
        if (saveToken !== sessionSaveCounter) return;
        if (entry) serializedImages.push(entry);
      }
      if (serializedImages.length === 0) return;
      const payload = {
        version: 1,
        savedAt: Date.now(),
        selectedIndex: clamp(state.selectedIndex, 0, Math.max(0, serializedImages.length - 1)),
        splitCompareActive: !!state.splitCompareActive,
        splitComparePosition: clamp(state.splitComparePosition, 10, 90),
        textConfidenceThreshold: clamp(state.textConfidenceThreshold, 0, 95),
        textStrictness: normalizeTextStrictness(state.textStrictness),
        images: serializedImages
      };
      await sessionStore.writeSession(payload);
    } catch (error) {
      // Ignore autosave failures to keep editing uninterrupted.
    }
  }

  function scheduleSessionAutosave({ immediate = false } = {}) {
    if (state.sessionRestoring) return;
    if (sessionAutosaveTimer) {
      clearTimeout(sessionAutosaveTimer);
      sessionAutosaveTimer = null;
    }
    const delay = immediate ? 50 : 1800;
    sessionAutosaveTimer = window.setTimeout(() => {
      sessionAutosaveTimer = null;
      void performSessionAutosave();
    }, delay);
  }

  async function attemptSessionRestore() {
    if (state.images.length > 0) return false;
    let payload = null;
    try {
      const sessionStore = await ensureSessionStoreLoaded();
      payload = await sessionStore.readSession();
    } catch (error) {
      return false;
    }
    if (!payload || !Array.isArray(payload.images) || payload.images.length === 0) return false;
    const ageMs = Date.now() - (payload.savedAt || 0);
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > maxAge) {
      await clearSessionSnapshot();
      return false;
    }

    const shouldRestore = window.confirm('Restore your previous LiteEdit session?');
    if (!shouldRestore) {
      await clearSessionSnapshot();
      return false;
    }

    state.sessionRestoring = true;
    try {
      const restoredImages = [];
      for (const entry of payload.images) {
        if (!entry || !entry.originalBlob || !entry.editedBlob) continue;
        const imageState = await buildImageStateFromSessionEntry(entry);
        restoredImages.push(imageState);
      }
      if (restoredImages.length === 0) {
        await clearSessionSnapshot();
        return false;
      }
      state.images = restoredImages;
      state.selectedIndex = clamp(parseInt(payload.selectedIndex, 10) || 0, 0, restoredImages.length - 1);
      state.splitCompareActive = !!payload.splitCompareActive;
      state.splitComparePosition = clamp(parseInt(payload.splitComparePosition, 10) || state.splitComparePosition, 10, 90);
      state.textConfidenceThreshold = clamp(parseInt(payload.textConfidenceThreshold, 10) || state.textConfidenceThreshold, 0, 95);
      state.textStrictness = normalizeTextStrictness(payload.textStrictness || state.textStrictness);
      setStatus(`Restored ${restoredImages.length} image${restoredImages.length > 1 ? 's' : ''} from last session`);
      showToast('Previous session restored.', 'success');
      selectImage(state.selectedIndex);
      requestThumbnailsRender(true);
      updateActionAvailability();
      renderCanvas();
      return true;
    } catch (error) {
      await clearSessionSnapshot();
      return false;
    } finally {
      state.sessionRestoring = false;
    }
  }

  return {
    serializeImageForSession,
    buildImageStateFromSessionEntry,
    clearSessionSnapshot,
    performSessionAutosave,
    scheduleSessionAutosave,
    attemptSessionRestore
  };
}
