export function bindLiteEditAdvanced({
  dom,
  state,
  callbacks
}) {
  const {
    detectTextBlocks,
    clearTextDetectionsForImage,
    selectTextDetection,
    applySmartTextReplace,
    applyToolsVisibility,
    setTool,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    setStatus
  } = callbacks;

  dom.detectTextBtn.addEventListener('click', detectTextBlocks);
  dom.clearTextBoxesBtn.addEventListener('click', () => clearTextDetectionsForImage());
  dom.detectedTextSelect.addEventListener('change', () => {
    const selectedIndex = parseInt(dom.detectedTextSelect.value, 10);
    if (!Number.isFinite(selectedIndex)) return;
    selectTextDetection(selectedIndex, true);
  });
  dom.applyTextReplaceBtn.addEventListener('click', applySmartTextReplace);
  dom.textFontFamilySelect.addEventListener('change', () => {
    state.textFontFamily = dom.textFontFamilySelect.value || 'auto';
    localStorage.setItem('liteedit_text_font_family', state.textFontFamily);
    setStatus(`Text font set to ${state.textFontFamily === 'auto' ? 'Auto Match' : 'manual override'}`);
  });

  dom.hideToolsBtn.addEventListener('click', () => applyToolsVisibility(false));
  dom.toolButtons.forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  dom.brushSize.addEventListener('input', () => {
    dom.brushSizeVal.textContent = dom.brushSize.value;
  });
  dom.blurStrength.addEventListener('input', () => {
    dom.blurStrengthVal.textContent = `${dom.blurStrength.value}%`;
  });

}
