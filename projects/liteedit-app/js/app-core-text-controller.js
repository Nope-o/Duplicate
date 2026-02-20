import { drawTextOverlayAtPoint } from './app-core-text-overlay-utils.js';

export function createTextController({
  state,
  dom,
  clamp,
  activeImage,
  getSelectedTextDetection,
  syncTextQuickEditor,
  renderCanvas,
  scheduleSessionAutosave,
  setStatus,
  showToast,
  updateCanvasCursor,
  prepareForDirectCanvasEdit,
  pushHistory,
  markImageModified,
  updateUndoRedoState,
  updateExportSizeEstimate,
  requestThumbnailsRender
}) {
  function syncSelectedTextBoxPositionFields() {
    const selected = getSelectedTextDetection();
    const disabled = !selected;
    if (dom.textBoxXInput) {
      dom.textBoxXInput.disabled = disabled;
      dom.textBoxXInput.value = selected ? String(Math.round(selected.x)) : '';
    }
    if (dom.textBoxYInput) {
      dom.textBoxYInput.disabled = disabled;
      dom.textBoxYInput.value = selected ? String(Math.round(selected.y)) : '';
    }
    if (dom.applyTextBoxPositionBtn) dom.applyTextBoxPositionBtn.disabled = disabled;
    if (dom.centerTextBoxBtn) dom.centerTextBoxBtn.disabled = disabled;
  }

  function applySelectedTextBoxPosition({ center = false } = {}) {
    const selected = getSelectedTextDetection();
    const img = activeImage();
    if (!selected || !img) {
      showToast('Select a detected text box first.', 'error');
      return;
    }
    const canvasW = img.canvas.width;
    const canvasH = img.canvas.height;
    let nextX = selected.x;
    let nextY = selected.y;
    if (center) {
      nextX = Math.round((canvasW - selected.w) / 2);
      nextY = Math.round((canvasH - selected.h) / 2);
    } else {
      const rawX = parseInt(dom.textBoxXInput && dom.textBoxXInput.value, 10);
      const rawY = parseInt(dom.textBoxYInput && dom.textBoxYInput.value, 10);
      if (Number.isFinite(rawX)) nextX = rawX;
      if (Number.isFinite(rawY)) nextY = rawY;
    }
    const targetX = clamp(Math.round(nextX), 0, Math.max(0, canvasW - selected.w));
    const targetY = clamp(Math.round(nextY), 0, Math.max(0, canvasH - selected.h));
    if (targetX === selected.x && targetY === selected.y) {
      setStatus('Text box unchanged');
      return;
    }
    pushHistory(img, center ? 'Center text box' : 'Move text box');
    selected.x = targetX;
    selected.y = targetY;
    syncSelectedTextBoxPositionFields();
    syncTextQuickEditor();
    updateUndoRedoState();
    renderCanvas();
    scheduleSessionAutosave();
    setStatus(center ? 'Text box centered' : 'Text box moved');
  }

  function setTextAddPlacementActive(active) {
    state.textAddPlacementActive = !!active;
    if (dom.addTextHint) {
      dom.addTextHint.textContent = active
        ? 'Tap on the canvas to place text.'
        : 'Tap "Place On Image", then tap a position on canvas.';
    }
    if (dom.startAddTextBtn) {
      dom.startAddTextBtn.classList.toggle('active', !!active);
    }
    if (dom.cancelAddTextBtn) {
      dom.cancelAddTextBtn.disabled = !active;
    }
    if (active) {
      showToast('Tap on image to place new text.', 'info');
    }
    updateCanvasCursor();
  }

  function placeNewTextBoxAtPoint(point) {
    const img = activeImage();
    if (!img) return false;
    const rawText = (dom.addTextInput && dom.addTextInput.value) || '';
    const text = String(rawText).trim();
    if (!text) {
      showToast('Enter text to place first.', 'error');
      setTextAddPlacementActive(false);
      return false;
    }
    const textSize = clamp(parseInt(dom.addTextSizeInput && dom.addTextSizeInput.value, 10) || 36, 10, 220);
    const textColor = (dom.addTextColorInput && dom.addTextColorInput.value) || '#111827';
    const useBackground = !!(dom.addTextBoxBgInput && dom.addTextBoxBgInput.checked);
    const bgColor = (dom.addTextBgColorInput && dom.addTextBgColorInput.value) || '#ffffff';
    const bgOpacity = clamp((parseInt(dom.addTextBgOpacityInput && dom.addTextBgOpacityInput.value, 10) || 78) / 100, 0.12, 1);

    prepareForDirectCanvasEdit(img);
    pushHistory(img, 'Add text box');
    const ctx = img.canvas.getContext('2d');
    const overlayResult = drawTextOverlayAtPoint({
      ctx,
      text,
      point,
      canvasWidth: img.canvas.width,
      canvasHeight: img.canvas.height,
      fontSize: textSize,
      textColor,
      useBackground,
      bgColor,
      bgOpacity
    });
    if (!overlayResult) {
      if (img.history.length > 0) {
        img.history.pop();
      }
      showToast('Could not place text box.', 'error');
      return false;
    }

    markImageModified(img);
    updateUndoRedoState();
    updateExportSizeEstimate();
    requestThumbnailsRender(false);
    renderCanvas();
    scheduleSessionAutosave();
    setStatus('Text box placed');
    showToast('Text box added to image.', 'success');
    return true;
  }

  return {
    syncSelectedTextBoxPositionFields,
    applySelectedTextBoxPosition,
    setTextAddPlacementActive,
    placeNewTextBoxAtPoint
  };
}
