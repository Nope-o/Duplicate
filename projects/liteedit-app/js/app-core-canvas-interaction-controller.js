export function createCanvasInteractionController({
  state,
  dom,
  clamp,
  distanceBetweenTouches,
  activeImage,
  getCanvasCoords,
  setTextAddPlacementActive,
  placeNewTextBoxAtPoint,
  shouldUsePanGesture,
  beginCanvasPan,
  updateCanvasPan,
  endCanvasPan,
  canPanCanvas,
  getTextDetectionIndexAtPoint,
  selectTextDetection,
  beginTextBlockDrag,
  updateTextBlockDrag,
  endTextBlockDrag,
  normalizeCropRect,
  getCropHandleAtPoint,
  getCropCursorAtPoint,
  isPointInsideCropRect,
  syncCropActionButtons,
  updateCropCursor,
  getCropRatioValue,
  buildAspectRectFromAnchor,
  clampCropRectToCanvas,
  prepareForDirectCanvasEdit,
  pushHistory,
  renderCanvas,
  updateActionAvailability,
  drawStroke,
  blurBrushStroke,
  markImageModified,
  requestThumbnailsRender,
  updateUndoRedoState,
  updateExportSizeEstimate,
  updateCanvasCursor,
  setCanvasZoom
}) {
  function onPointerDown(e) {
    const img = activeImage();
    const p = getCanvasCoords(e);
    if (!img) return;
    if (state.textAddPlacementActive && state.userMode === 'advanced' && state.tool !== 'crop') {
      if (placeNewTextBoxAtPoint(p)) {
        setTextAddPlacementActive(false);
      }
      e.preventDefault();
      return;
    }
    if (shouldUsePanGesture(e)) {
      state.drawing = false;
      state.lastPoint = null;
      if (beginCanvasPan(e)) {
        dom.canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }
    if (state.tool !== 'crop' && state.userMode === 'advanced') {
      const hitIndex = getTextDetectionIndexAtPoint(p);
      if (hitIndex >= 0) {
        selectTextDetection(hitIndex, true);
        beginTextBlockDrag(hitIndex, p);
        state.drawing = false;
        state.lastPoint = null;
        dom.canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }

    const drawableTool = state.tool === 'crop'
      || state.tool === 'pen'
      || state.tool === 'highlighter'
      || state.tool === 'blur';
    if (!drawableTool) {
      state.drawing = false;
      state.lastPoint = null;
      return;
    }

    state.drawing = true;
    state.lastPoint = p;

    if (state.tool === 'crop') {
      const existing = normalizeCropRect(state.cropRect);
      const handle = getCropHandleAtPoint(p, existing);
      if (handle && existing) {
        state.cropInteraction = {
          mode: 'resize',
          handle,
          startPoint: p,
          startRect: { ...existing }
        };
        dom.canvas.style.cursor = getCropCursorAtPoint(p, existing);
      } else if (existing && isPointInsideCropRect(p, existing)) {
        state.cropInteraction = {
          mode: 'move',
          dragOffsetX: p.x - existing.x,
          dragOffsetY: p.y - existing.y,
          startRect: { ...existing }
        };
        dom.canvas.style.cursor = 'move';
      } else {
        state.cropStart = p;
        state.cropRect = { x: p.x, y: p.y, w: 1, h: 1 };
        state.cropInteraction = { mode: 'new' };
        dom.canvas.style.cursor = 'crosshair';
      }
      syncCropActionButtons();
    } else {
      prepareForDirectCanvasEdit(img);
      const actionLabel = state.tool === 'pen'
        ? 'Pen stroke'
        : state.tool === 'highlighter'
          ? 'Highlighter stroke'
          : state.tool === 'blur'
            ? 'Blur brush'
            : 'Edit';
      pushHistory(img, actionLabel);
    }

    dom.canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    const img = activeImage();
    if (!img) return;
    if (state.canvasPan && state.canvasPan.active) {
      updateCanvasPan(e);
      e.preventDefault();
      return;
    }
    const p = getCanvasCoords(e);
    if (state.textDrag) {
      updateTextBlockDrag(p);
      e.preventDefault();
      return;
    }
    if (state.tool === 'crop' && !state.drawing) {
      updateCropCursor(p);
      return;
    }
    if (!state.drawing) {
      if ((state.tool === 'hand' || state.keyboardPanActive) && canPanCanvas()) {
        dom.canvas.style.cursor = 'grab';
        return;
      }
      if (state.tool !== 'crop' && state.userMode === 'advanced') {
        dom.canvas.style.cursor = getTextDetectionIndexAtPoint(p) >= 0 ? 'pointer' : 'default';
      }
      return;
    }

    if (state.tool === 'crop') {
      const aspectRatio = getCropRatioValue();
      const interaction = state.cropInteraction || { mode: 'new' };
      if (interaction.mode === 'move' && state.cropRect) {
        const rect = normalizeCropRect(state.cropRect);
        const nextX = clamp(
          p.x - interaction.dragOffsetX,
          0,
          Math.max(0, dom.canvas.width - rect.w)
        );
        const nextY = clamp(
          p.y - interaction.dragOffsetY,
          0,
          Math.max(0, dom.canvas.height - rect.h)
        );
        state.cropRect = { x: nextX, y: nextY, w: rect.w, h: rect.h };
      } else if (interaction.mode === 'resize' && interaction.startRect) {
        const startRect = interaction.startRect;
        const isCornerHandle = interaction.handle.length === 2;
        if (aspectRatio && isCornerHandle) {
          let anchor = { x: startRect.x, y: startRect.y };
          if (interaction.handle === 'nw') anchor = { x: startRect.x + startRect.w, y: startRect.y + startRect.h };
          if (interaction.handle === 'ne') anchor = { x: startRect.x, y: startRect.y + startRect.h };
          if (interaction.handle === 'sw') anchor = { x: startRect.x + startRect.w, y: startRect.y };
          if (interaction.handle === 'se') anchor = { x: startRect.x, y: startRect.y };
          state.cropRect = clampCropRectToCanvas(
            buildAspectRectFromAnchor(anchor.x, anchor.y, p.x, p.y, aspectRatio)
          );
          renderCanvas();
          updateActionAvailability();
          return;
        }
        let left = startRect.x;
        let right = startRect.x + startRect.w;
        let top = startRect.y;
        let bottom = startRect.y + startRect.h;

        if (interaction.handle.includes('w')) left = p.x;
        if (interaction.handle.includes('e')) right = p.x;
        if (interaction.handle.includes('n')) top = p.y;
        if (interaction.handle.includes('s')) bottom = p.y;

        const minSize = 3;
        if (Math.abs(right - left) < minSize) {
          if (interaction.handle.includes('w')) left = right - minSize;
          else right = left + minSize;
        }
        if (Math.abs(bottom - top) < minSize) {
          if (interaction.handle.includes('n')) top = bottom - minSize;
          else bottom = top + minSize;
        }

        state.cropRect = clampCropRectToCanvas({
          x: Math.min(left, right),
          y: Math.min(top, bottom),
          w: Math.abs(right - left),
          h: Math.abs(bottom - top)
        });
      } else {
        const sx = state.cropStart.x;
        const sy = state.cropStart.y;
        const nextRect = aspectRatio
          ? buildAspectRectFromAnchor(sx, sy, p.x, p.y, aspectRatio)
          : {
            x: Math.min(sx, p.x),
            y: Math.min(sy, p.y),
            w: Math.abs(p.x - sx),
            h: Math.abs(p.y - sy)
          };
        state.cropRect = clampCropRectToCanvas(nextRect);
      }
      renderCanvas();
      updateActionAvailability();
      syncCropActionButtons();
      if (dom.applyCropBtn && state.cropRect) {
        const r = normalizeCropRect(state.cropRect);
        dom.applyCropBtn.disabled = !(r && r.w > 0 && r.h > 0);
      }
      return;
    } else if (state.tool === 'pen' || state.tool === 'highlighter') {
      drawStroke(img, state.lastPoint, p, state.tool);
    } else if (state.tool === 'blur') {
      const radius = parseInt(dom.brushSize.value, 10) / 2;
      const opacityValue = parseInt(dom.blurStrength.value, 10);
      const strength = clamp(Math.round((Number.isFinite(opacityValue) ? opacityValue : 35) / 10), 1, 12);
      blurBrushStroke(img, state.lastPoint, p, radius, strength);
    }

    state.lastPoint = p;
    markImageModified(img);
    renderCanvas();
    requestThumbnailsRender(false);
  }

  function onPointerUp(e) {
    if (state.canvasPan && state.canvasPan.active) {
      endCanvasPan();
      try {
        dom.canvas.releasePointerCapture(e.pointerId);
      } catch (error) {}
      return;
    }
    if (state.textDrag) {
      endTextBlockDrag();
      state.lastPoint = null;
      state.cropStart = null;
      try {
        dom.canvas.releasePointerCapture(e.pointerId);
      } catch (error) {}
      return;
    }
    if (!state.drawing) return;
    state.drawing = false;

    if (state.tool === 'crop') {
      state.cropInteraction = null;
      state.cropRect = clampCropRectToCanvas(state.cropRect);
      renderCanvas();
      updateActionAvailability();
      syncCropActionButtons();
      updateCropCursor(getCanvasCoords(e));
    } else {
      updateUndoRedoState();
      updateExportSizeEstimate();
    }

    state.lastPoint = null;
    state.cropStart = null;
    dom.canvas.releasePointerCapture(e.pointerId);
    updateCanvasCursor();
  }

  function onCanvasWheelZoom(event) {
    if (!activeImage()) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
    setCanvasZoom(state.viewport.zoom * factor, event.clientX, event.clientY);
  }

  function onCanvasTouchStart(event) {
    if (!activeImage() || event.touches.length !== 2) return;
    const view = state.viewport;
    view.pinchActive = true;
    view.pinchStartDistance = distanceBetweenTouches(event.touches[0], event.touches[1]);
    view.pinchStartZoom = view.zoom;
    event.preventDefault();
  }

  function onCanvasTouchMove(event) {
    if (!activeImage()) return;
    const view = state.viewport;
    if (!view.pinchActive || event.touches.length !== 2) return;
    const currentDistance = distanceBetweenTouches(event.touches[0], event.touches[1]);
    if (!Number.isFinite(currentDistance) || currentDistance <= 0) return;
    const scale = currentDistance / Math.max(1, view.pinchStartDistance);
    const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
    setCanvasZoom(view.pinchStartZoom * scale, centerX, centerY);
    event.preventDefault();
  }

  function onCanvasTouchEnd(event) {
    const view = state.viewport;
    if (event.touches.length < 2) {
      view.pinchActive = false;
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onCanvasWheelZoom,
    onCanvasTouchStart,
    onCanvasTouchMove,
    onCanvasTouchEnd
  };
}
