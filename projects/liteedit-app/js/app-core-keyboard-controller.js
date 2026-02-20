export function createKeyboardController({
  state,
  dom,
  isTypingTarget,
  getFocusableIn,
  updateCanvasCursor,
  openExportSheet,
  undo,
  redo,
  setTool,
  closeImportSheet,
  closeExportSheet,
  closeSettingsSheet,
  closeHelpSheet,
  closeReportIssueSheet,
  closeCameraSheet,
  closeLiveCaptureModal,
  setComparePreviewActive,
  endCanvasPan
}) {
  function onDocumentKeyDown(event) {
    const key = event.key;
    const lower = key.toLowerCase();
    const hasModifier = event.metaKey || event.ctrlKey;
    const typing = isTypingTarget(event.target);

    if (key === 'Tab' && state.activeModal) {
      const focusable = getFocusableIn(state.activeModal);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
        return;
      }
    }

    if (!typing && key === ' ') {
      state.keyboardPanActive = true;
      updateCanvasCursor();
      event.preventDefault();
    }

    if (!typing && !state.activeModal && hasModifier && lower === 's') {
      event.preventDefault();
      void openExportSheet();
      return;
    }

    if (!typing && !state.activeModal && hasModifier && lower === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        void redo();
      } else {
        void undo();
      }
      return;
    }

    if (!typing && !state.activeModal && hasModifier && lower === 'y') {
      event.preventDefault();
      void redo();
      return;
    }

    if (!typing && !state.activeModal && !hasModifier) {
      if (lower === 'e') {
        setTool('pen', { showStatus: true });
        return;
      }
      if (lower === 'h') {
        setTool('highlighter', { showStatus: true });
        return;
      }
      if (lower === 'b') {
        setTool('blur', { showStatus: true });
        return;
      }
      if (lower === 'c') {
        setTool('crop', { showStatus: true });
        return;
      }
      if (lower === 'v') {
        setTool('hand', { showStatus: true });
        return;
      }
    }

    if (key === 'Escape' && dom.importSheet.classList.contains('active')) {
      closeImportSheet();
      return;
    }
    if (key === 'Escape' && dom.exportSheet.classList.contains('active')) {
      closeExportSheet();
      return;
    }
    if (key === 'Escape' && dom.settingsSheet.classList.contains('active')) {
      closeSettingsSheet();
      return;
    }
    if (key === 'Escape' && dom.helpSheet.classList.contains('active')) {
      closeHelpSheet();
      return;
    }
    if (key === 'Escape' && dom.reportIssueSheet && dom.reportIssueSheet.classList.contains('active')) {
      closeReportIssueSheet();
      return;
    }
    if (key === 'Escape' && dom.cameraSheet.classList.contains('active')) {
      closeCameraSheet();
      return;
    }
    if (key === 'Escape' && dom.liveCaptureModal.classList.contains('active')) {
      closeLiveCaptureModal();
      return;
    }
    if (key === 'Escape' && state.comparePreviewActive) {
      setComparePreviewActive(false);
    }
    if (key === 'Escape' && !state.activeModal && state.tool === 'hand') {
      setTool('hand', { showStatus: true });
    }
  }

  function onDocumentKeyUp(event) {
    if (event.key === ' ') {
      state.keyboardPanActive = false;
      updateCanvasCursor();
    }
  }

  function onWindowBlur() {
    state.keyboardPanActive = false;
    endCanvasPan();
    updateCanvasCursor();
  }

  return {
    onDocumentKeyDown,
    onDocumentKeyUp,
    onWindowBlur
  };
}
