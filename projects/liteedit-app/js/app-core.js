    import {
      clamp,
      distanceBetweenTouches,
      formatBytes
    } from './app-core-utils.js';
    import {
      isLikelyImageFile,
      normalizeImageMimeType
    } from './app-core-file-utils.js';
    import {
      ADJUST_TILE_SIZE,
      HISTORY_LIMIT,
      LARGE_IMAGE_PIXEL_THRESHOLD,
      MAX_FILES,
      MAX_TOTAL_PIXELS,
      SOCIAL_PRESETS,
      TOOL_PRESETS
    } from './app-core-constants.js';
    import {
      canvasToBlobSafe,
      decodeImageFile,
      loadImageElementFromBlob,
      nextFrame,
      releaseDrawable
    } from './app-core-media-utils.js';
    import {
      createSessionController
    } from './app-core-session-controller.js';
    import {
      createTextController
    } from './app-core-text-controller.js';
    import {
      createExportController
    } from './app-core-export-controller.js';
    import {
      createModalController
    } from './app-core-modal-controller.js';
    import {
      createCanvasInteractionController
    } from './app-core-canvas-interaction-controller.js';
    import {
      createUiFlowController
    } from './app-core-ui-flow-controller.js';
    import {
      createKeyboardController
    } from './app-core-keyboard-controller.js';

    const CONTROL_COLLAPSE_STORAGE_KEY = 'liteedit_collapsed_sections_v1';

    const state = {
      images: [],
      selectedIndex: -1,
      tool: 'pen',
      lastNonHandTool: 'pen',
      drawing: false,
      cropStart: null,
      cropRect: null,
      cropInteraction: null,
      lastPoint: null,
      cameraPreset: 'photo',
      comparePreviewActive: false,
      splitCompareActive: localStorage.getItem('liteedit_split_compare_active') === 'true',
      splitComparePosition: clamp(parseInt(localStorage.getItem('liteedit_split_compare_position') || '50', 10) || 50, 10, 90),
      keyboardPanActive: false,
      canvasPan: null,
      exportMode: localStorage.getItem('liteedit_export_mode') || 'single',
      exportPreset: localStorage.getItem('liteedit_export_preset') || 'custom',
      bulkPdfMode: localStorage.getItem('liteedit_bulk_pdf_mode') || 'combined',
      bulkExportMode: localStorage.getItem('liteedit_bulk_export_mode') || 'zip',
      bulkAdvancedMode: localStorage.getItem('liteedit_bulk_advanced_mode') || 'none',
      bulkSequentialBase: localStorage.getItem('liteedit_bulk_sequential_base') || 'Name',
      bulkShowImages: localStorage.getItem('liteedit_bulk_show_images') || 'show',
      bulkUseNameTemplate: localStorage.getItem('liteedit_bulk_use_name_template') === 'true',
      bulkNameTemplate: localStorage.getItem('liteedit_bulk_name_template') || '{name}_{n}',
      bulkNameSuffix: localStorage.getItem('liteedit_bulk_name_suffix') || '',
      bulkFormatOverrides: {},
      userMode: localStorage.getItem('liteedit_user_mode') || 'simple',
      importOptimize: localStorage.getItem('liteedit_import_optimize') !== 'false',
      importMaxEdge: parseInt(localStorage.getItem('liteedit_import_max_edge') || '4096', 10),
      resizeMethod: localStorage.getItem('liteedit_resize_method') || 'lanczos3',
      resizeFitMethod: localStorage.getItem('liteedit_resize_fit_method') || 'stretch',
      activeModal: null,
      modalFocusOrigin: null,
      sessionRestoring: false,
      adjustmentPreview: {
        active: false,
        imageId: null,
        baseCanvas: null,
        previewCanvas: null
      },
      mobileAdjustOverlayActive: false,
      theme: localStorage.getItem('liteedit_theme') || 'light',
      detectingText: false,
      textSelectionIndex: -1,
      adjustmentStepSelectionIndex: -1,
      textFontFamily: localStorage.getItem('liteedit_text_font_family') || 'auto',
      textConfidenceThreshold: clamp(parseInt(localStorage.getItem('liteedit_text_confidence_threshold') || '30', 10) || 30, 0, 95),
      textStrictness: localStorage.getItem('liteedit_text_strictness') || 'balanced',
      ocrLanguage: localStorage.getItem('liteedit_ocr_language') || 'eng',
      penColor: localStorage.getItem('liteedit_pen_color') || '#60a5fa',
      highlighterColor: localStorage.getItem('liteedit_highlighter_color') || '#facc15',
      cropRatio: localStorage.getItem('liteedit_crop_ratio') || 'free',
      advancedResourcesLoaded: false,
      advancedResourcesPromise: null,
      controlsVisible: localStorage.getItem('liteedit_controls_visible') === null
        ? !window.matchMedia('(max-width: 900px)').matches
        : localStorage.getItem('liteedit_controls_visible') !== 'false',
      thumbsVisible: localStorage.getItem('liteedit_thumbs_visible') !== 'false',
      toolsVisible: localStorage.getItem('liteedit_tools_visible') === null
        ? !window.matchMedia('(max-width: 900px)').matches
        : localStorage.getItem('liteedit_tools_visible') !== 'false',
      viewport: {
        zoom: 1,
        minZoom: 0.6,
        maxZoom: 5,
        offsetX: 0,
        offsetY: 0,
        pinchActive: false,
        pinchStartDistance: 0,
        pinchStartZoom: 1
      },
      renderBudget: {
        pending: false,
        scheduled: false,
        timerId: 0,
        lastRenderTs: 0,
        minIntervalMs: 48
      },
      textQuickSelectionIndex: -1,
      textDrag: null,
      textReplaceSizeScale: clamp(parseInt(localStorage.getItem('liteedit_text_replace_scale') || '110', 10) || 110, 70, 170),
      textAddPlacementActive: false
    };

    const dom = {
      appRoot: document.getElementById('appRoot'),
      fileInput: document.getElementById('fileInput'),
      addMediaBtn: document.getElementById('addMediaBtn'),
      panelAddMediaBtn: document.getElementById('panelAddMediaBtn'),
      panelHideThumbsBtn: document.getElementById('panelHideThumbsBtn'),
      showUploadsBtn: document.getElementById('showUploadsBtn'),
      showUploadsCount: document.getElementById('showUploadsCount'),
      showControlsBtn: document.getElementById('showControlsBtn'),
      openSettingsBtn: document.getElementById('openSettingsBtn'),
      openExportBtn: document.getElementById('openExportBtn'),
      mobileImportBtn: document.getElementById('mobileImportBtn'),
      mobileExportBtn: document.getElementById('mobileExportBtn'),
      openExportFromSettingsBtn: document.getElementById('openExportFromSettingsBtn'),
      contactDeveloperBtn: document.getElementById('contactDeveloperBtn'),
      importSheet: document.getElementById('importSheet'),
      importImageBtn: document.getElementById('importImageBtn'),
      importFolderBtn: document.getElementById('importFolderBtn'),
      importCaptureBtn: document.getElementById('importCaptureBtn'),
      cancelImportSheetBtn: document.getElementById('cancelImportSheetBtn'),
      exportSheet: document.getElementById('exportSheet'),
      closeExportSheetBtn: document.getElementById('closeExportSheetBtn'),
      cancelExportSheetBtn: document.getElementById('cancelExportSheetBtn'),
      settingsSheet: document.getElementById('settingsSheet'),
      closeSettingsSheetBtn: document.getElementById('closeSettingsSheetBtn'),
      cancelSettingsSheetBtn: document.getElementById('cancelSettingsSheetBtn'),
      helpSheet: document.getElementById('helpSheet'),
      openHelpSheetBtn: document.getElementById('openHelpSheetBtn'),
      closeHelpSheetBtn: document.getElementById('closeHelpSheetBtn'),
      cancelHelpSheetBtn: document.getElementById('cancelHelpSheetBtn'),
      exportModeSingleBtn: document.getElementById('exportModeSingleBtn'),
      exportModeBulkBtn: document.getElementById('exportModeBulkBtn'),
      bulkExportModeInput: document.getElementById('bulkExportModeInput'),
      bulkAdvancedInput: document.getElementById('bulkAdvancedInput'),
      bulkSequentialGroup: document.getElementById('bulkSequentialGroup'),
      bulkSequentialBaseInput: document.getElementById('bulkSequentialBaseInput'),
      bulkUseTemplateInput: document.getElementById('bulkUseTemplateInput'),
      bulkTemplateGroup: document.getElementById('bulkTemplateGroup'),
      bulkNameTemplateInput: document.getElementById('bulkNameTemplateInput'),
      bulkSuffixGroup: document.getElementById('bulkSuffixGroup'),
      bulkNameSuffixInput: document.getElementById('bulkNameSuffixInput'),
      bulkShowImagesInput: document.getElementById('bulkShowImagesInput'),
      bulkFilesPanel: document.getElementById('bulkFilesPanel'),
      bulkPdfOptions: document.getElementById('bulkPdfOptions'),
      pdfBulkModeCombined: document.getElementById('pdfBulkModeCombined'),
      pdfBulkModeSeparate: document.getElementById('pdfBulkModeSeparate'),
      simpleModeBtn: document.getElementById('simpleModeBtn'),
      advancedModeBtn: document.getElementById('advancedModeBtn'),
      cameraPhotoInput: document.getElementById('cameraPhotoInput'),
      cameraScanInput: document.getElementById('cameraScanInput'),
      cameraSheet: document.getElementById('cameraSheet'),
      cameraPhotoBtn: document.getElementById('cameraPhotoBtn'),
      cameraScanBtn: document.getElementById('cameraScanBtn'),
      cancelCameraSheetBtn: document.getElementById('cancelCameraSheetBtn'),
      closeCameraSheetBtn: document.getElementById('closeCameraSheetBtn'),
      liveCaptureModal: document.getElementById('liveCaptureModal'),
      liveCaptureVideo: document.getElementById('liveCaptureVideo'),
      captureLiveBtn: document.getElementById('captureLiveBtn'),
      cancelLiveCaptureBtn: document.getElementById('cancelLiveCaptureBtn'),
      closeLiveCaptureBtn: document.getElementById('closeLiveCaptureBtn'),
      mobileAdjustOverlay: document.getElementById('mobileAdjustOverlay'),
      mobileAdjustPreviewCanvas: document.getElementById('mobileAdjustPreviewCanvas'),
      folderInput: document.getElementById('folderInput'),
      thumbs: document.getElementById('thumbs'),
      countInfo: document.getElementById('countInfo'),
      canvas: document.getElementById('mainCanvas'),
      canvasZone: document.getElementById('canvasZone'),
      compareTools: document.getElementById('compareTools'),
      compareHoldBtn: document.getElementById('compareHoldBtn'),
      toggleSplitCompareBtn: document.getElementById('toggleSplitCompareBtn'),
      compareSplitSlider: document.getElementById('compareSplitSlider'),
      zoomInBtn: document.getElementById('zoomInBtn'),
      zoomOutBtn: document.getElementById('zoomOutBtn'),
      zoomResetBtn: document.getElementById('zoomResetBtn'),
      emptyState: document.getElementById('emptyState'),
      emptyUploadBtn: document.getElementById('emptyUploadBtn'),
      emptyPasteBtn: document.getElementById('emptyPasteBtn'),
      emptyCaptureBtn: document.getElementById('emptyCaptureBtn'),
      cropTip: document.getElementById('cropTip'),
      toggleThumbsBtn: document.getElementById('toggleThumbsBtn'),
      floatingThumbsBtn: document.getElementById('floatingThumbsBtn'),
      floatingToolsBtn: document.getElementById('floatingToolsBtn'),
      floatingControlsBtn: document.getElementById('floatingControlsBtn'),
      workflowImportBtn: document.getElementById('workflowImportBtn'),
      workflowEditBtn: document.getElementById('workflowEditBtn'),
      workflowTextBtn: document.getElementById('workflowTextBtn'),
      workflowExportBtn: document.getElementById('workflowExportBtn'),
      sectionNav: document.querySelector('.section-nav'),
      themeLightBtn: document.getElementById('themeLightBtn'),
      themeDarkBtn: document.getElementById('themeDarkBtn'),
      importOptimizeInput: document.getElementById('importOptimizeInput'),
      importMaxEdgeInput: document.getElementById('importMaxEdgeInput'),
      statusBox: document.getElementById('statusBox'),
      liveImageInfo: document.getElementById('liveImageInfo'),
      brushSize: document.getElementById('brushSize'),
      brushSizeVal: document.getElementById('brushSizeVal'),
      blurStrength: document.getElementById('blurStrength'),
      blurStrengthVal: document.getElementById('blurStrengthVal'),
      highlighterColorInput: document.getElementById('highlighterColorInput'),
      cropRatioInput: document.getElementById('cropRatioInput'),
      applyCropBtn: document.getElementById('applyCropBtn'),
      cancelCropBtn: document.getElementById('cancelCropBtn'),
      hideToolsBtn: document.getElementById('hideToolsBtn'),
      hideControlsBtn: document.getElementById('hideControlsBtn'),
      widthInput: document.getElementById('widthInput'),
      heightInput: document.getElementById('heightInput'),
      keepAspect: document.getElementById('keepAspect'),
      applyResizeBtn: document.getElementById('applyResizeBtn'),
      resizeMethodInput: document.getElementById('resizeMethodInput'),
      resizeFitInput: document.getElementById('resizeFitInput'),
      brightnessInput: document.getElementById('brightnessInput'),
      contrastInput: document.getElementById('contrastInput'),
      saturationInput: document.getElementById('saturationInput'),
      globalBlurInput: document.getElementById('globalBlurInput'),
      applyAdjustBtn: document.getElementById('applyAdjustBtn'),
      applyAdjustAllBtn: document.getElementById('applyAdjustAllBtn'),
      updateAdjustStepBtn: document.getElementById('updateAdjustStepBtn'),
      removeAdjustStepBtn: document.getElementById('removeAdjustStepBtn'),
      clearAdjustStackBtn: document.getElementById('clearAdjustStackBtn'),
      adjustmentStackList: document.getElementById('adjustmentStackList'),
      resetAdjustBtn: document.getElementById('resetAdjustBtn'),
      applyResizeAllBtn: document.getElementById('applyResizeAllBtn'),
      socialPresetInput: document.getElementById('socialPresetInput'),
      applySocialPresetBtn: document.getElementById('applySocialPresetBtn'),
      cropPresetInput: document.getElementById('cropPresetInput'),
      applyCropPresetBtn: document.getElementById('applyCropPresetBtn'),
      rotateLeftBtn: document.getElementById('rotateLeftBtn'),
      rotateRightBtn: document.getElementById('rotateRightBtn'),
      flipXBtn: document.getElementById('flipXBtn'),
      flipYBtn: document.getElementById('flipYBtn'),
      resetImageBtn: document.getElementById('resetImageBtn'),
      undoBtn: document.getElementById('undoBtn'),
      redoBtn: document.getElementById('redoBtn'),
      floatingUndoBtn: document.getElementById('floatingUndoBtn'),
      floatingRedoBtn: document.getElementById('floatingRedoBtn'),
      formatInput: document.getElementById('formatInput'),
      renameInput: document.getElementById('renameInput'),
      detectTextBtn: document.getElementById('detectTextBtn'),
      ocrLanguageInput: document.getElementById('ocrLanguageInput'),
      textConfidenceInput: document.getElementById('textConfidenceInput'),
      textConfidenceVal: document.getElementById('textConfidenceVal'),
      textStrictnessInput: document.getElementById('textStrictnessInput'),
      clearTextBoxesBtn: document.getElementById('clearTextBoxesBtn'),
      detectedTextSelect: document.getElementById('detectedTextSelect'),
      replaceTextInput: document.getElementById('replaceTextInput'),
      textSizeScaleInput: document.getElementById('textSizeScaleInput'),
      textSizeScaleVal: document.getElementById('textSizeScaleVal'),
      textBoxXInput: document.getElementById('textBoxXInput'),
      textBoxYInput: document.getElementById('textBoxYInput'),
      applyTextBoxPositionBtn: document.getElementById('applyTextBoxPositionBtn'),
      centerTextBoxBtn: document.getElementById('centerTextBoxBtn'),
      smartTextFontField: document.getElementById('smartTextFontField'),
      textFontFamilySelect: document.getElementById('textFontFamilySelect'),
      smartTextAutoSizeInput: document.getElementById('smartTextAutoSizeInput'),
      applyTextReplaceBtn: document.getElementById('applyTextReplaceBtn'),
      detectTextSupportNote: document.getElementById('detectTextSupportNote'),
      addTextInput: document.getElementById('addTextInput'),
      addTextSizeInput: document.getElementById('addTextSizeInput'),
      addTextColorInput: document.getElementById('addTextColorInput'),
      addTextBoxBgInput: document.getElementById('addTextBoxBgInput'),
      addTextBgColorInput: document.getElementById('addTextBgColorInput'),
      addTextBgOpacityInput: document.getElementById('addTextBgOpacityInput'),
      addTextBgOpacityVal: document.getElementById('addTextBgOpacityVal'),
      startAddTextBtn: document.getElementById('startAddTextBtn'),
      cancelAddTextBtn: document.getElementById('cancelAddTextBtn'),
      addTextHint: document.getElementById('addTextHint'),
      textQuickEditor: document.getElementById('textQuickEditor'),
      textQuickInput: document.getElementById('textQuickInput'),
      textQuickApplyBtn: document.getElementById('textQuickApplyBtn'),
      textQuickCloseBtn: document.getElementById('textQuickCloseBtn'),
      textQuickKeepSizeInput: document.getElementById('textQuickKeepSizeInput'),
      quickAutoBtn: document.getElementById('quickAutoBtn'),
      quickResetBtn: document.getElementById('quickResetBtn'),
      qualityInput: document.getElementById('qualityInput'),
      stripMetaInput: document.getElementById('stripMetaInput'),
      exportPresetInput: document.getElementById('exportPresetInput'),
      exportSizeInfo: document.getElementById('exportSizeInfo'),
      exportSummary: document.getElementById('exportSummary'),
      exportProgress: document.getElementById('exportProgress'),
      exportProgressFill: document.getElementById('exportProgressFill'),
      exportProgressText: document.getElementById('exportProgressText'),
      exportSavings: document.getElementById('exportSavings'),
      exportSavingsFill: document.getElementById('exportSavingsFill'),
      exportSavingsText: document.getElementById('exportSavingsText'),
      largeImageBadge: document.getElementById('largeImageBadge'),
      toastStack: document.getElementById('toastStack'),
      cancelExportQueueBtn: document.getElementById('cancelExportQueueBtn'),
      downloadBtn: document.getElementById('downloadBtn'),
      downloadAllBtn: document.getElementById('downloadAllBtn'),
      reportIssueBtn: document.getElementById('reportIssueBtn'),
      reportIssueSheet: document.getElementById('reportIssueSheet'),
      reportIssueText: document.getElementById('reportIssueText'),
      copyReportIssueBtn: document.getElementById('copyReportIssueBtn'),
      downloadReportIssueBtn: document.getElementById('downloadReportIssueBtn'),
      closeReportIssueBtn: document.getElementById('closeReportIssueBtn'),
      cancelReportIssueBtn: document.getElementById('cancelReportIssueBtn'),
      toolButtons: Array.from(document.querySelectorAll('.tool-btn'))
    };

    let exportEstimateToken = 0;
    let thumbRenderFrameId = null;
    let thumbHydrateFrameId = null;
    let thumbHydrateToken = 0;
    let pendingThumbHydration = [];
    let exportEngineModule = null;
    let exportEnginePromise = null;
    let exportQueue = null;
    let textToolsModule = null;
    let textToolsPromise = null;
    let canvasToolsModule = null;
    let canvasToolsPromise = null;
    let sessionStoreModule = null;
    let sessionStorePromise = null;
    let importJobToken = 0;
    let sessionController = null;
    let textController = null;
    let exportController = null;
    let modalController = null;
    let canvasInteractionController = null;
    let uiFlowController = null;
    let keyboardController = null;
    let collapsedSectionState = {};

    function setStatus(text) {
      dom.statusBox.textContent = text;
    }

    function dismissToast(toastEl) {
      if (!toastEl || toastEl.dataset.leaving === 'true') return;
      toastEl.dataset.leaving = 'true';
      toastEl.classList.add('leaving');
      window.setTimeout(() => {
        if (toastEl && toastEl.parentNode) {
          toastEl.remove();
        }
      }, 170);
    }

    function showToast(message, type = 'info', duration = 2600) {
      if (!dom.toastStack) return;
      const safeMessage = String(message || '').trim();
      if (!safeMessage) return;
      const safeType = type === 'error' || type === 'success' ? type : 'info';
      const duplicate = Array.from(dom.toastStack.querySelectorAll('.toast')).find(
        (toastEl) => toastEl.dataset.toastMessage === safeMessage && toastEl.dataset.toastType === safeType
      );
      if (duplicate) {
        dismissToast(duplicate);
      }
      const toast = document.createElement('div');
      toast.className = `toast ${safeType}`;
      toast.dataset.toastMessage = safeMessage;
      toast.dataset.toastType = safeType;
      toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');
      toast.setAttribute('aria-live', safeType === 'error' ? 'assertive' : 'polite');
      toast.setAttribute('aria-atomic', 'true');

      const messageNode = document.createElement('div');
      messageNode.className = 'toast-message';
      messageNode.textContent = safeMessage;
      toast.appendChild(messageNode);

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'toast-close';
      closeBtn.setAttribute('aria-label', 'Dismiss notification');
      closeBtn.textContent = '×';
      toast.appendChild(closeBtn);

      let removeTimer = null;
      const clearRemoveTimer = () => {
        if (removeTimer) {
          clearTimeout(removeTimer);
          removeTimer = null;
        }
      };
      const startRemoveTimer = (timeoutMs = duration) => {
        clearRemoveTimer();
        removeTimer = window.setTimeout(() => {
          dismissToast(toast);
        }, Math.max(600, timeoutMs));
      };

      closeBtn.addEventListener('click', () => {
        clearRemoveTimer();
        dismissToast(toast);
      });
      toast.addEventListener('mouseenter', clearRemoveTimer);
      toast.addEventListener('mouseleave', () => startRemoveTimer(1200));
      toast.addEventListener('focusin', clearRemoveTimer);
      toast.addEventListener('focusout', () => startRemoveTimer(1200));

      dom.toastStack.appendChild(toast);
      startRemoveTimer(duration);

      const allToasts = Array.from(dom.toastStack.querySelectorAll('.toast'));
      if (allToasts.length > 4) {
        allToasts.slice(0, allToasts.length - 4).forEach((item) => dismissToast(item));
      }
    }

    function readCollapsedSectionState() {
      try {
        const raw = localStorage.getItem(CONTROL_COLLAPSE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed;
      } catch (error) {
        return {};
      }
    }

    function persistCollapsedSectionState() {
      try {
        localStorage.setItem(CONTROL_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedSectionState));
      } catch (error) {}
    }

    function setControlSectionCollapsed(section, collapsed, { persist = true } = {}) {
      if (!section) return;
      const body = section.querySelector('.fieldset-body');
      const toggle = section.querySelector('.legend-toggle');
      if (!body || !toggle) return;
      const next = !!collapsed;
      section.classList.toggle('is-collapsed', next);
      body.hidden = next;
      toggle.setAttribute('aria-expanded', next ? 'false' : 'true');
      const icon = toggle.querySelector('.legend-toggle-icon');
      if (icon) {
        icon.textContent = next ? '+' : '−';
      }
      if (persist && section.id) {
        collapsedSectionState[section.id] = next;
        persistCollapsedSectionState();
      }
    }

    function openControlSection(sectionId, { ensureAdvanced = false } = {}) {
      if (ensureAdvanced && state.userMode !== 'advanced') {
        applyUserMode('advanced');
      }
      const section = document.getElementById(sectionId);
      if (!section) return;
      setControlSectionCollapsed(section, false);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function initializeControlSections() {
      collapsedSectionState = readCollapsedSectionState();
      const sections = Array.from(document.querySelectorAll('.right-panel .controls .fieldset[id]'));
      const compactLayout = window.matchMedia('(max-width: 900px)').matches;
      sections.forEach((section, index) => {
        if (section.dataset.collapseReady === 'true') return;
        const legend = section.querySelector(':scope > .legend');
        if (!legend) return;
        const legendText = legend.textContent || section.id;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'legend-toggle';
        toggle.innerHTML = `
          <span class="legend">${legendText}</span>
          <span class="legend-toggle-icon" aria-hidden="true">−</span>
        `;
        legend.replaceWith(toggle);

        const body = document.createElement('div');
        body.className = 'fieldset-body';
        while (toggle.nextSibling) {
          body.appendChild(toggle.nextSibling);
        }
        section.appendChild(body);

        let collapsed = false;
        if (Object.prototype.hasOwnProperty.call(collapsedSectionState, section.id)) {
          collapsed = !!collapsedSectionState[section.id];
        } else if (compactLayout) {
          collapsed = index > 1 || section.id === 'outputSection';
          if (section.id === 'quickEditSection') collapsed = false;
        }
        setControlSectionCollapsed(section, collapsed, { persist: false });

        toggle.addEventListener('click', () => {
          setControlSectionCollapsed(section, !section.classList.contains('is-collapsed'));
        });
        section.dataset.collapseReady = 'true';
      });

      if (dom.sectionNav && dom.sectionNav.dataset.collapseBound !== 'true') {
        dom.sectionNav.addEventListener('click', (event) => {
          const link = event.target && event.target.closest ? event.target.closest('a[href^="#"]') : null;
          if (!link) return;
          const target = document.querySelector(link.getAttribute('href'));
          if (target && target.classList.contains('fieldset')) {
            setControlSectionCollapsed(target, false);
          }
        });
        dom.sectionNav.dataset.collapseBound = 'true';
      }
    }

    function getSessionController() {
      if (!sessionController) {
        sessionController = createSessionController({
          state,
          clamp,
          normalizeTextStrictness,
          ensureSessionStoreLoaded,
          cloneAdjustmentStep,
          canvasSnapshot,
          loadImageElementFromBlob,
          canvasToBlobSafe,
          sanitizeFileName,
          largeImagePixelThreshold: LARGE_IMAGE_PIXEL_THRESHOLD,
          setStatus,
          showToast,
          selectImage,
          requestThumbnailsRender,
          updateActionAvailability,
          renderCanvas
        });
      }
      return sessionController;
    }

    async function clearSessionSnapshot() {
      await getSessionController().clearSessionSnapshot();
    }

    function scheduleSessionAutosave(options = {}) {
      getSessionController().scheduleSessionAutosave(options);
    }

    async function attemptSessionRestore() {
      return getSessionController().attemptSessionRestore();
    }

    function normalizeExportPreset(value) {
      if (value === 'web' || value === 'whatsapp' || value === 'instagram' || value === 'print') {
        return value;
      }
      return 'custom';
    }

    function normalizeOcrLanguage(value) {
      return value === 'eng+hin' ? 'eng+hin' : 'eng';
    }

    function normalizeTextStrictness(value) {
      if (value === 'strict' || value === 'loose') return value;
      return 'balanced';
    }

    function isTypingTarget(target) {
      if (!target) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      return !!target.closest('[contenteditable="true"]');
    }

    function persistExportPreferences() {
      if (!dom.formatInput || !dom.qualityInput || !dom.stripMetaInput || !dom.exportPresetInput) return;
      localStorage.setItem('liteedit_export_format', dom.formatInput.value);
      localStorage.setItem('liteedit_export_quality', String(dom.qualityInput.value));
      localStorage.setItem('liteedit_export_strip_meta', dom.stripMetaInput.checked ? 'true' : 'false');
      localStorage.setItem('liteedit_export_preset', normalizeExportPreset(dom.exportPresetInput.value));
    }

    function markExportPresetCustom() {
      if (!dom.exportPresetInput) return;
      dom.exportPresetInput.value = 'custom';
      state.exportPreset = 'custom';
      persistExportPreferences();
    }

    function applyExportPreset(preset, { silent = false, persist = true } = {}) {
      if (!dom.exportPresetInput || !dom.formatInput || !dom.qualityInput || !dom.stripMetaInput) return;
      const normalized = normalizeExportPreset(preset);
      state.exportPreset = normalized;
      dom.exportPresetInput.value = normalized;

      if (normalized === 'web') {
        dom.formatInput.value = 'image/webp';
        dom.qualityInput.value = '82';
        dom.stripMetaInput.checked = true;
      } else if (normalized === 'whatsapp') {
        dom.formatInput.value = 'image/jpeg';
        dom.qualityInput.value = '78';
        dom.stripMetaInput.checked = true;
      } else if (normalized === 'instagram') {
        dom.formatInput.value = 'image/jpeg';
        dom.qualityInput.value = '88';
        dom.stripMetaInput.checked = true;
      } else if (normalized === 'print') {
        dom.formatInput.value = 'image/png';
        dom.qualityInput.value = '100';
        dom.stripMetaInput.checked = false;
      }

      updateBulkPdfModeVisibility();
      if (shouldRenderBulkPanelNow()) {
        renderBulkFilesPanel();
      }
      updateExportSizeEstimate();
      if (persist) {
        persistExportPreferences();
      }
      if (!silent && normalized !== 'custom') {
        showToast(`Export preset applied: ${normalized}`, 'success');
      }
    }

    function getModalController() {
      if (!modalController) {
        modalController = createModalController({
          state,
          dom,
          stopLiveCaptureStream
        });
      }
      return modalController;
    }

    function getFocusableIn(el) {
      return getModalController().getFocusableIn(el);
    }

    function openModal(el, origin = document.activeElement) {
      getModalController().openModal(el, origin);
    }

    function closeModal(el) {
      getModalController().closeModal(el);
    }

    function normalizeBulkExportMode(value) {
      return value === 'multiple' ? 'multiple' : 'zip';
    }

    function normalizeBulkAdvancedMode(value) {
      return value === 'sequential' ? 'sequential' : 'none';
    }

    function normalizeBulkShowMode(value) {
      return value === 'hide' ? 'hide' : 'show';
    }

    function pruneBulkFormatOverrides() {
      const ids = new Set(state.images.map((img) => img.id));
      Object.keys(state.bulkFormatOverrides).forEach((imageId) => {
        if (!ids.has(imageId)) {
          delete state.bulkFormatOverrides[imageId];
        }
      });
    }

    function getBulkExportFormatForImage(img) {
      if (!img) return getExportFormat();
      const override = state.bulkFormatOverrides[img.id];
      if (!override) return getExportFormat();
      const option = Array.from(dom.formatInput.options || []).find((entry) => entry.value === override);
      if (!option || option.disabled) return getExportFormat();
      return override;
    }

    function updateBulkOptionsUI() {
      if (dom.bulkExportModeInput) {
        dom.bulkExportModeInput.value = normalizeBulkExportMode(state.bulkExportMode);
      }
      if (dom.bulkAdvancedInput) {
        dom.bulkAdvancedInput.value = normalizeBulkAdvancedMode(state.bulkAdvancedMode);
      }
      if (dom.bulkShowImagesInput) {
        dom.bulkShowImagesInput.value = normalizeBulkShowMode(state.bulkShowImages);
      }
      if (dom.bulkSequentialBaseInput) {
        dom.bulkSequentialBaseInput.value = state.bulkSequentialBase;
      }
      if (dom.bulkUseTemplateInput) {
        dom.bulkUseTemplateInput.checked = !!state.bulkUseNameTemplate;
      }
      if (dom.bulkNameTemplateInput) {
        dom.bulkNameTemplateInput.value = state.bulkNameTemplate || '{name}_{n}';
      }
      if (dom.bulkNameSuffixInput) {
        dom.bulkNameSuffixInput.value = state.bulkNameSuffix || '';
      }
      const showSequential = state.exportMode === 'bulk'
        && state.bulkExportMode === 'zip'
        && state.bulkAdvancedMode === 'sequential';
      if (dom.bulkSequentialGroup) {
        dom.bulkSequentialGroup.classList.toggle('active', showSequential);
      }
      if (dom.bulkTemplateGroup) {
        dom.bulkTemplateGroup.classList.toggle('active', !!state.bulkUseNameTemplate);
      }
      if (dom.bulkSuffixGroup) {
        dom.bulkSuffixGroup.classList.toggle('active', !!state.bulkUseNameTemplate);
      }
      const showBulkPanel = state.exportMode === 'bulk' && state.bulkShowImages === 'show';
      if (dom.bulkFilesPanel) {
        dom.bulkFilesPanel.classList.toggle('hidden', !showBulkPanel);
      }
      if (dom.bulkPdfOptions) {
        const bulkFormatHasPdf = state.images.some((img) => getBulkExportFormatForImage(img) === 'application/pdf');
        const showPdfControls = state.exportMode === 'bulk' && bulkFormatHasPdf;
        dom.bulkPdfOptions.style.display = showPdfControls ? 'grid' : 'none';
      }
    }

    function shouldRenderBulkPanelNow() {
      return state.exportMode === 'bulk'
        && !!dom.exportSheet
        && dom.exportSheet.classList.contains('active');
    }

    function createBulkFormatSelect(selectedType) {
      const select = document.createElement('select');
      select.className = 'bulk-file-format-select';
      const options = Array.from(dom.formatInput.options || []);
      options.forEach((option) => {
        const clone = document.createElement('option');
        clone.value = option.value;
        clone.textContent = option.textContent;
        clone.disabled = option.disabled;
        select.appendChild(clone);
      });
      const preferred = options.find((option) => option.value === selectedType && !option.disabled);
      if (preferred) {
        select.value = selectedType;
      } else {
        const fallback = options.find((option) => !option.disabled);
        if (fallback) select.value = fallback.value;
      }
      return select;
    }

    function renderBulkFilesPanel() {
      if (!dom.bulkFilesPanel) return;
      dom.bulkFilesPanel.innerHTML = '';
      if (state.images.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'bulk-files-empty';
        empty.textContent = 'No files loaded.';
        dom.bulkFilesPanel.appendChild(empty);
        return;
      }

      pruneBulkFormatOverrides();

      state.images.forEach((img, index) => {
        const row = document.createElement('article');
        row.className = 'bulk-file-row';
        row.dataset.imageId = img.id;

        const thumb = document.createElement('img');
        thumb.className = 'bulk-file-thumb';
        thumb.alt = img.name;
        thumb.loading = 'lazy';
        thumb.decoding = 'async';
        thumb.src = getThumbnailDataUrl(img);
        row.appendChild(thumb);

        const meta = document.createElement('div');
        meta.className = 'bulk-file-meta';

        const title = document.createElement('div');
        title.className = 'bulk-file-title';
        title.textContent = `${index + 1}. ${img.canvas.width}x${img.canvas.height}`;
        meta.appendChild(title);

        const details = document.createElement('div');
        details.className = 'bulk-file-details';
        const sourceMimeType = img.mimeType || (img.file && img.file.type) || 'image/jpeg';
        const originalType = extensionForType(sourceMimeType).toUpperCase();
        details.textContent = `Original: ${originalType} | ${formatBytes(getOriginalBytesForImage(img))}`;
        meta.appendChild(details);

        const progress = document.createElement('div');
        progress.className = 'bulk-file-progress';
        progress.textContent = img.exportStatus || 'Queued';
        meta.appendChild(progress);

        const config = document.createElement('div');
        config.className = 'bulk-file-config';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'bulk-file-name-input';
        nameInput.value = img.name;
        nameInput.placeholder = 'Final file name';
        config.appendChild(nameInput);

        const selectedType = getBulkExportFormatForImage(img);
        const formatSelect = createBulkFormatSelect(selectedType);
        config.appendChild(formatSelect);

        meta.appendChild(config);
        row.appendChild(meta);
        dom.bulkFilesPanel.appendChild(row);
      });
    }

    function updateExportSummary() {
      if (!dom.exportSummary) return;
      const formatLabel = (dom.formatInput.selectedOptions[0] && dom.formatInput.selectedOptions[0].textContent) || 'JPG';
      const quality = parseInt(dom.qualityInput.value, 10) || 90;
      const bulkLabel = state.bulkExportMode === 'multiple' ? 'Multiple' : 'ZIP';
      const modeLabel = state.exportMode === 'bulk' ? `Bulk (${bulkLabel})` : 'Single';
      const bulkHasPdf = state.exportMode === 'bulk'
        && state.images.some((img) => getBulkExportFormatForImage(img) === 'application/pdf');
      const pdfModeLabel = bulkHasPdf
        ? ` | PDF: ${state.bulkPdfMode === 'combined' ? 'Combined' : 'Separate'}`
        : '';
      const files = state.images.length;
      const selected = activeImage() ? activeImage().name : 'None';
      const sizeInfo = dom.exportSizeInfo.textContent.replace('Estimated size: ', '');
      dom.exportSummary.textContent = `Mode: ${modeLabel}${pdfModeLabel} | Files: ${files} | Selected: ${selected} | Format: ${formatLabel} | Quality: ${quality}% | Size: ${sizeInfo}`;
    }

    function getOriginalBytesForImage(img) {
      if (!img || !img.file) return 0;
      return Number.isFinite(img.file.size) ? img.file.size : 0;
    }

    function getOriginalBytesForAll() {
      return state.images.reduce((sum, img) => sum + getOriginalBytesForImage(img), 0);
    }

    function setExportSavings(originalBytes = 0, outputBytes = 0) {
      if (!dom.exportSavingsFill || !dom.exportSavingsText) return;
      if (!outputBytes || outputBytes <= 0) {
        dom.exportSavingsFill.style.width = '0%';
        dom.exportSavingsText.textContent = 'Size saving: --';
        return;
      }
      if (!originalBytes || originalBytes <= 0) {
        dom.exportSavingsFill.style.width = '0%';
        dom.exportSavingsText.textContent = `Export size: ${formatBytes(outputBytes)} (original size unavailable)`;
        return;
      }

      const savedBytes = originalBytes - outputBytes;
      const savedPct = (savedBytes / originalBytes) * 100;
      const clampedPct = Math.max(0, Math.min(100, savedPct));

      if (savedBytes >= 0) {
        dom.exportSavingsFill.style.width = `${clampedPct.toFixed(1)}%`;
        dom.exportSavingsText.textContent = `Saved ${clampedPct.toFixed(1)}% | ${formatBytes(originalBytes)} -> ${formatBytes(outputBytes)} (${formatBytes(savedBytes)} smaller)`;
      } else {
        dom.exportSavingsFill.style.width = '0%';
        dom.exportSavingsText.textContent = `Size increased ${Math.abs(savedPct).toFixed(1)}% | ${formatBytes(originalBytes)} -> ${formatBytes(outputBytes)}`;
      }
    }

    function setExportProgress(current, total, label = 'Processing export...') {
      if (!dom.exportProgress || !dom.exportProgressFill || !dom.exportProgressText) return;
      if (!total || total <= 0) {
        dom.exportProgress.classList.remove('active');
        dom.exportProgressFill.style.width = '0%';
        dom.exportProgressText.textContent = 'Preparing export...';
        return;
      }
      const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
      dom.exportProgress.classList.add('active');
      dom.exportProgressFill.style.width = `${pct}%`;
      dom.exportProgressText.textContent = `${label} ${current}/${total} (${pct}%)`;
      if (current >= total) {
        window.setTimeout(() => {
          dom.exportProgress.classList.remove('active');
        }, 800);
      }
    }

    function setBulkRowStatus(img, status) {
      if (!img) return;
      img.exportStatus = status;
      if (!dom.bulkFilesPanel) return;
      const row = dom.bulkFilesPanel.querySelector(`[data-image-id="${img.id}"]`);
      if (!row) return;
      const label = row.querySelector('.bulk-file-progress');
      if (label) {
        label.textContent = status;
      }
    }

    function resetBulkStatuses() {
      state.images.forEach((img) => {
        img.exportStatus = 'Queued';
      });
      if (shouldRenderBulkPanelNow()) {
        renderBulkFilesPanel();
      }
    }

    function hasPendingExports() {
      return state.images.some((img) => img.dirty && (img.revision || 0) > (img.lastExportRevision || 0));
    }

    function updateActionAvailability() {
      const img = activeImage();
      const hasImage = !!img;
      const hasAny = state.images.length > 0;
      const detections = getTextDetectionsForImage(img);
      const hasTextSelection = state.textSelectionIndex >= 0 && state.textSelectionIndex < detections.length;
      const adjustmentStack = hasImage ? getAdjustmentStackForImage(img) : [];
      const hasAdjustmentStep = adjustmentStack.length > 0;
      const hasAdjustmentSelection = hasAdjustmentStep
        && state.adjustmentStepSelectionIndex >= 0
        && state.adjustmentStepSelectionIndex < adjustmentStack.length;
      [
        dom.downloadBtn,
        dom.applyResizeBtn,
        dom.applyResizeAllBtn,
        dom.rotateLeftBtn,
        dom.rotateRightBtn,
        dom.flipXBtn,
        dom.flipYBtn,
        dom.resetImageBtn,
        dom.applyAdjustBtn,
        dom.applyAdjustAllBtn,
        dom.updateAdjustStepBtn,
        dom.removeAdjustStepBtn,
        dom.clearAdjustStackBtn,
        dom.resetAdjustBtn,
        dom.quickAutoBtn,
        dom.quickResetBtn,
        dom.undoBtn,
        dom.redoBtn,
        dom.floatingUndoBtn,
        dom.floatingRedoBtn
      ].forEach((btn) => {
        if (btn) btn.disabled = !hasImage;
      });
      syncCropActionButtons();

      if (dom.renameInput) dom.renameInput.disabled = !hasImage;
      if (dom.widthInput) dom.widthInput.disabled = !hasImage;
      if (dom.heightInput) dom.heightInput.disabled = !hasImage;
      if (dom.keepAspect) dom.keepAspect.disabled = !hasImage;
      if (dom.resizeMethodInput) dom.resizeMethodInput.disabled = !hasImage;
      if (dom.resizeFitInput) dom.resizeFitInput.disabled = !hasImage;
      if (dom.downloadAllBtn) dom.downloadAllBtn.disabled = !hasAny;
      if (dom.openExportBtn) dom.openExportBtn.disabled = !hasAny;
      if (dom.mobileExportBtn) dom.mobileExportBtn.disabled = !hasAny;
      if (dom.openExportFromSettingsBtn) dom.openExportFromSettingsBtn.disabled = !hasAny;
      if (dom.compareHoldBtn) {
        dom.compareHoldBtn.disabled = !hasImage;
        dom.compareHoldBtn.classList.toggle('active', hasImage && state.comparePreviewActive);
        dom.compareHoldBtn.setAttribute('aria-pressed', hasImage && state.comparePreviewActive ? 'true' : 'false');
      }
      if (dom.toggleSplitCompareBtn) {
        dom.toggleSplitCompareBtn.disabled = !hasImage;
      }
      if (dom.compareSplitSlider) {
        dom.compareSplitSlider.disabled = !hasImage || !state.splitCompareActive;
      }
      if (dom.bulkExportModeInput) dom.bulkExportModeInput.disabled = !hasAny;
      if (dom.bulkAdvancedInput) dom.bulkAdvancedInput.disabled = !hasAny;
      if (dom.bulkShowImagesInput) dom.bulkShowImagesInput.disabled = !hasAny;
      if (dom.bulkSequentialBaseInput) dom.bulkSequentialBaseInput.disabled = !hasAny || state.bulkExportMode !== 'zip';
      if (dom.bulkUseTemplateInput) dom.bulkUseTemplateInput.disabled = !hasAny;
      if (dom.bulkNameTemplateInput) dom.bulkNameTemplateInput.disabled = !hasAny || !state.bulkUseNameTemplate;
      if (dom.bulkNameSuffixInput) dom.bulkNameSuffixInput.disabled = !hasAny || !state.bulkUseNameTemplate;
      if (dom.exportPresetInput) dom.exportPresetInput.disabled = !hasAny;
      if (dom.cancelExportQueueBtn) {
        dom.cancelExportQueueBtn.disabled = !(exportQueue && exportQueue.active);
      }
      if (dom.detectTextBtn) dom.detectTextBtn.disabled = !hasImage || state.detectingText;
      if (dom.ocrLanguageInput) dom.ocrLanguageInput.disabled = !hasImage || state.detectingText;
      if (dom.textConfidenceInput) dom.textConfidenceInput.disabled = !hasImage || state.detectingText;
      if (dom.textStrictnessInput) dom.textStrictnessInput.disabled = !hasImage;
      if (dom.clearTextBoxesBtn) dom.clearTextBoxesBtn.disabled = !hasImage || detections.length === 0;
      if (dom.detectedTextSelect) dom.detectedTextSelect.disabled = !hasImage || detections.length === 0;
      if (dom.replaceTextInput) dom.replaceTextInput.disabled = !hasImage || !hasTextSelection;
      if (dom.textFontFamilySelect) dom.textFontFamilySelect.disabled = !hasImage || !hasTextSelection;
      if (dom.smartTextAutoSizeInput) dom.smartTextAutoSizeInput.disabled = !hasImage || !hasTextSelection;
      if (dom.applyTextReplaceBtn) dom.applyTextReplaceBtn.disabled = !hasImage || !hasTextSelection;
      if (dom.updateAdjustStepBtn) dom.updateAdjustStepBtn.disabled = !hasAdjustmentSelection;
      if (dom.removeAdjustStepBtn) dom.removeAdjustStepBtn.disabled = !hasAdjustmentSelection;
      if (dom.clearAdjustStackBtn) dom.clearAdjustStackBtn.disabled = !hasAdjustmentStep;
      dom.toolButtons.forEach((btn) => {
        btn.disabled = !hasImage;
      });
      if (dom.adjustmentStackList) {
        dom.adjustmentStackList.classList.toggle('disabled', !hasImage);
      }
    }

    function applyTheme(mode) {
      document.body.classList.toggle('dark', mode === 'dark');
      if (dom.themeLightBtn && dom.themeDarkBtn) {
        dom.themeLightBtn.classList.toggle('active', mode !== 'dark');
        dom.themeDarkBtn.classList.toggle('active', mode === 'dark');
      }
      localStorage.setItem('liteedit_theme', mode);
    }

    function applyImportSettings() {
      dom.importOptimizeInput.checked = !!state.importOptimize;
      const safeEdge = Math.max(1024, Math.min(6000, parseInt(state.importMaxEdge, 10) || 4096));
      state.importMaxEdge = safeEdge;
      dom.importMaxEdgeInput.value = String(safeEdge);
      localStorage.setItem('liteedit_import_optimize', state.importOptimize ? 'true' : 'false');
      localStorage.setItem('liteedit_import_max_edge', String(safeEdge));
    }

    function applyResizeSettings() {
      const method = state.resizeMethod === 'triangle'
        || state.resizeMethod === 'mitchell'
        || state.resizeMethod === 'pixelated'
        ? state.resizeMethod
        : 'lanczos3';
      const fit = state.resizeFitMethod === 'contain' ? 'contain' : 'stretch';
      state.resizeMethod = method;
      state.resizeFitMethod = fit;
      if (dom.resizeMethodInput) dom.resizeMethodInput.value = method;
      if (dom.resizeFitInput) dom.resizeFitInput.value = fit;
      localStorage.setItem('liteedit_resize_method', method);
      localStorage.setItem('liteedit_resize_fit_method', fit);
    }

    function ensureExportEngineLoaded() {
      if (exportEngineModule) return exportEnginePromise || Promise.resolve(exportEngineModule);
      if (exportEnginePromise) return exportEnginePromise;

      exportEnginePromise = import('./export-engine.js')
        .then(async (module) => {
          exportEngineModule = module;
          await module.ensureExportVendorsLoaded();
          return module;
        })
        .catch((error) => {
          exportEnginePromise = null;
          exportEngineModule = null;
          throw error;
        });

      return exportEnginePromise;
    }

    function ensureTextToolsLoaded() {
      if (textToolsModule) return textToolsPromise || Promise.resolve(textToolsModule);
      if (textToolsPromise) return textToolsPromise;

      textToolsPromise = import('./text-tools.js')
        .then((module) => {
          textToolsModule = module;
          return module;
        })
        .catch((error) => {
          textToolsPromise = null;
          textToolsModule = null;
          throw error;
        });

      return textToolsPromise;
    }

    function ensureCanvasToolsLoaded() {
      if (canvasToolsModule) return canvasToolsPromise || Promise.resolve(canvasToolsModule);
      if (canvasToolsPromise) return canvasToolsPromise;

      canvasToolsPromise = import('./canvas-tools.js')
        .then((module) => {
          canvasToolsModule = module;
          return module;
        })
        .catch((error) => {
          canvasToolsPromise = null;
          canvasToolsModule = null;
          throw error;
        });

      return canvasToolsPromise;
    }

    function ensureSessionStoreLoaded() {
      if (sessionStoreModule) return sessionStorePromise || Promise.resolve(sessionStoreModule);
      if (sessionStorePromise) return sessionStorePromise;

      sessionStorePromise = import('./session-store.js')
        .then((module) => {
          sessionStoreModule = module;
          return module;
        })
        .catch((error) => {
          sessionStorePromise = null;
          sessionStoreModule = null;
          throw error;
        });

      return sessionStorePromise;
    }

    function ensureAdvancedResourcesLoaded() {
      if (state.advancedResourcesLoaded) return state.advancedResourcesPromise || Promise.resolve();
      if (state.advancedResourcesPromise) return state.advancedResourcesPromise;

      state.advancedResourcesPromise = Promise.all([
        import('./advanced-bindings.js'),
        ensureTextToolsLoaded(),
        ensureCanvasToolsLoaded()
      ])
        .then(([module]) => {
          module.bindLiteEditAdvanced({
            dom,
            state,
            callbacks: {
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
            }
          });
          state.advancedResourcesLoaded = true;
          syncTextEditPanel();
          updateActionAvailability();
        })
        .catch((error) => {
          state.advancedResourcesPromise = null;
          console.error('Failed to load advanced resources:', error);
          showToast('Could not load advanced tools. Please refresh and retry.', 'error');
          setStatus('Advanced tools failed to load');
        });

      return state.advancedResourcesPromise;
    }

    function runWhenIdle(task, timeout = 1200) {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => {
          try {
            task();
          } catch (error) {}
        }, { timeout });
        return;
      }
      window.setTimeout(() => {
        try {
          task();
        } catch (error) {}
      }, Math.min(350, timeout));
    }

    function scheduleLazyWarmups() {
      runWhenIdle(() => {
        if (state.userMode === 'advanced') {
          void ensureAdvancedResourcesLoaded();
        }
      }, 1800);
      runWhenIdle(() => {
        if (state.images.length > 0) {
          void ensureExportEngineLoaded();
        }
      }, 2600);
    }

    function applyUserMode(mode) {
      const nextMode = mode === 'advanced' ? 'advanced' : 'simple';
      state.userMode = nextMode;
      if (nextMode === 'simple' && state.textAddPlacementActive) {
        setTextAddPlacementActive(false);
      }
      dom.appRoot.classList.toggle('basic-mode', nextMode === 'simple');
      dom.simpleModeBtn.classList.toggle('active', nextMode === 'simple');
      dom.advancedModeBtn.classList.toggle('active', nextMode === 'advanced');
      dom.simpleModeBtn.setAttribute('aria-selected', nextMode === 'simple' ? 'true' : 'false');
      dom.advancedModeBtn.setAttribute('aria-selected', nextMode === 'advanced' ? 'true' : 'false');

      const adjustmentsSection = document.getElementById('adjustmentsSection');
      const geometrySection = document.getElementById('geometrySection');
      const textSection = document.getElementById('textSection');
      const quickSection = document.getElementById('quickEditSection');
      const outputSection = document.getElementById('outputSection');

      if (nextMode === 'simple') {
        if (state.tool === 'hand') {
          setTool(state.lastNonHandTool || 'pen');
        }
        applyToolsVisibility(false);
        if (adjustmentsSection) setControlSectionCollapsed(adjustmentsSection, true, { persist: false });
        if (geometrySection) setControlSectionCollapsed(geometrySection, true, { persist: false });
        if (textSection) setControlSectionCollapsed(textSection, true, { persist: false });
        if (quickSection) setControlSectionCollapsed(quickSection, false, { persist: false });
        if (outputSection) setControlSectionCollapsed(outputSection, false, { persist: false });
        document.querySelectorAll('.advanced-options-drawer').forEach((drawer) => {
          drawer.open = false;
        });
      } else if (!isMobileView()) {
        void ensureAdvancedResourcesLoaded();
        // Desktop advanced mode should always expose full editing controls.
        applyToolsVisibility(true);
        applyControlsVisibility(true);
        if (adjustmentsSection) setControlSectionCollapsed(adjustmentsSection, false, { persist: false });
        if (geometrySection) setControlSectionCollapsed(geometrySection, false, { persist: false });
      } else {
        void ensureAdvancedResourcesLoaded();
      }

      localStorage.setItem('liteedit_user_mode', nextMode);
      updateActionAvailability();
      syncTextEditPanel({ preserveNoSelection: true });
      syncTextQuickEditor();
    }

    function isMobileView() {
      return window.matchMedia('(max-width: 900px)').matches;
    }

    function applyCanvasViewport() {
      if (!dom.canvas) return;
      const view = state.viewport;
      const transform = `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.zoom})`;
      dom.canvas.style.transform = transform;
      if (dom.zoomResetBtn) {
        dom.zoomResetBtn.textContent = `${Math.round(view.zoom * 100)}%`;
      }
    }

    function getCanvasScaleBounds(nextZoom = state.viewport.zoom) {
      const canvasRect = dom.canvas.getBoundingClientRect();
      const zoneRect = dom.canvasZone.getBoundingClientRect();
      const baseWidth = canvasRect.width / state.viewport.zoom || canvasRect.width;
      const baseHeight = canvasRect.height / state.viewport.zoom || canvasRect.height;
      const scaledWidth = baseWidth * nextZoom;
      const scaledHeight = baseHeight * nextZoom;
      const overflowX = Math.max(0, scaledWidth - zoneRect.width);
      const overflowY = Math.max(0, scaledHeight - zoneRect.height);
      return {
        limitX: Math.max(40, overflowX * 0.6 + 24),
        limitY: Math.max(40, overflowY * 0.6 + 24)
      };
    }

    function clampViewportOffset() {
      const view = state.viewport;
      const bounds = getCanvasScaleBounds();
      view.offsetX = clamp(view.offsetX, -bounds.limitX, bounds.limitX);
      view.offsetY = clamp(view.offsetY, -bounds.limitY, bounds.limitY);
    }

    function resetViewport({ keepZoom = false } = {}) {
      const view = state.viewport;
      if (!keepZoom) {
        view.zoom = 1;
      }
      view.offsetX = 0;
      view.offsetY = 0;
      view.pinchActive = false;
      applyCanvasViewport();
      updateCanvasCursor();
    }

    function setCanvasZoom(nextZoom, anchorClientX = null, anchorClientY = null) {
      const img = activeImage();
      if (!img) return;

      const view = state.viewport;
      const prevZoom = view.zoom;
      const zoom = clamp(nextZoom, view.minZoom, view.maxZoom);
      if (!Number.isFinite(zoom) || Math.abs(zoom - prevZoom) < 0.0001) return;

      if (anchorClientX != null && anchorClientY != null) {
        const rect = dom.canvas.getBoundingClientRect();
        const baseLeft = rect.left - view.offsetX;
        const baseTop = rect.top - view.offsetY;
        const pointX = (anchorClientX - rect.left) / prevZoom;
        const pointY = (anchorClientY - rect.top) / prevZoom;
        view.offsetX = anchorClientX - baseLeft - pointX * zoom;
        view.offsetY = anchorClientY - baseTop - pointY * zoom;
      }

      view.zoom = zoom;
      clampViewportOffset();
      applyCanvasViewport();
      updateCanvasCursor();
    }

    function canPanCanvas() {
      return !!activeImage() && state.viewport.zoom > 1.01;
    }

    function updateCanvasCursor() {
      if (!dom.canvas) return;
      if (state.canvasPan && state.canvasPan.active) {
        dom.canvas.style.cursor = 'grabbing';
        return;
      }
      if (state.textAddPlacementActive && state.userMode === 'advanced') {
        dom.canvas.style.cursor = 'crosshair';
        return;
      }
      if (state.tool === 'crop') {
        dom.canvas.style.cursor = 'crosshair';
        return;
      }
      if ((state.tool === 'hand' || state.keyboardPanActive) && canPanCanvas()) {
        dom.canvas.style.cursor = 'grab';
        return;
      }
      dom.canvas.style.cursor = 'default';
    }

    function beginCanvasPan(pointerEvent) {
      if (!canPanCanvas()) return false;
      state.canvasPan = {
        active: true,
        pointerId: pointerEvent.pointerId,
        startClientX: pointerEvent.clientX,
        startClientY: pointerEvent.clientY,
        startOffsetX: state.viewport.offsetX,
        startOffsetY: state.viewport.offsetY
      };
      updateCanvasCursor();
      return true;
    }

    function updateCanvasPan(pointerEvent) {
      const pan = state.canvasPan;
      if (!pan || !pan.active) return;
      const dx = pointerEvent.clientX - pan.startClientX;
      const dy = pointerEvent.clientY - pan.startClientY;
      state.viewport.offsetX = pan.startOffsetX + dx;
      state.viewport.offsetY = pan.startOffsetY + dy;
      clampViewportOffset();
      applyCanvasViewport();
    }

    function endCanvasPan() {
      if (!state.canvasPan) return;
      state.canvasPan.active = false;
      state.canvasPan = null;
      updateCanvasCursor();
    }

    function shouldUsePanGesture(pointerEvent) {
      if (!pointerEvent || pointerEvent.button !== 0) return false;
      if (!activeImage()) return false;
      if (state.tool === 'hand') return canPanCanvas();
      if (state.keyboardPanActive) return canPanCanvas();
      return false;
    }

    function setComparePreviewActive(active) {
      if (!activeImage()) return;
      const next = !!active;
      if (state.comparePreviewActive === next) return;
      state.comparePreviewActive = next;
      if (dom.compareHoldBtn) {
        dom.compareHoldBtn.classList.toggle('active', next);
        dom.compareHoldBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      }
      renderCanvas();
    }

    function setSplitCompareActive(active) {
      const next = !!active;
      state.splitCompareActive = next;
      localStorage.setItem('liteedit_split_compare_active', next ? 'true' : 'false');
      if (dom.toggleSplitCompareBtn) {
        dom.toggleSplitCompareBtn.classList.toggle('active', next);
        dom.toggleSplitCompareBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      }
      if (dom.compareTools) {
        dom.compareTools.classList.toggle('split-active', next);
      }
      if (dom.compareSplitSlider) {
        dom.compareSplitSlider.disabled = !activeImage() || !next;
      }
      renderCanvas();
      updateActionAvailability();
      if (state.images.length > 0) {
        scheduleSessionAutosave();
      }
    }

    function setSplitComparePosition(value) {
      const next = clamp(parseInt(value, 10) || 50, 10, 90);
      state.splitComparePosition = next;
      localStorage.setItem('liteedit_split_compare_position', String(next));
      if (dom.compareSplitSlider) {
        dom.compareSplitSlider.value = String(next);
      }
      if (state.splitCompareActive && !state.comparePreviewActive) {
        renderCanvas();
      } else {
        updateLiveImageInfo();
      }
      if (state.images.length > 0) {
        scheduleSessionAutosave();
      }
    }

    function stepCanvasZoom(direction) {
      const rect = dom.canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const step = direction > 0 ? 1.15 : 1 / 1.15;
      setCanvasZoom(state.viewport.zoom * step, cx, cy);
    }

    function updateDockButtons() {
      if (dom.floatingThumbsBtn) {
        dom.floatingThumbsBtn.classList.toggle('active', state.thumbsVisible);
      }
      dom.floatingToolsBtn.classList.toggle('active', state.toolsVisible);
      dom.floatingControlsBtn.classList.toggle('active', state.controlsVisible);
    }

    function applyControlsVisibility(visible) {
      state.controlsVisible = !!visible;
      if (isMobileView()) {
        dom.appRoot.classList.toggle('controls-hidden', false);
        dom.appRoot.classList.toggle('mobile-controls-open', state.controlsVisible);
      } else {
        dom.appRoot.classList.toggle('mobile-controls-open', false);
        dom.appRoot.classList.toggle('controls-hidden', !state.controlsVisible);
      }
      if (dom.showControlsBtn) {
        dom.showControlsBtn.setAttribute('aria-hidden', state.controlsVisible ? 'true' : 'false');
      }
      updateDockButtons();
      localStorage.setItem('liteedit_controls_visible', state.controlsVisible ? 'true' : 'false');
    }

    function applyThumbsVisibility(visible) {
      state.thumbsVisible = !!visible;
      dom.appRoot.classList.toggle('thumbs-hidden', !state.thumbsVisible);
      if (dom.toggleThumbsBtn) {
        dom.toggleThumbsBtn.classList.toggle('active', state.thumbsVisible);
        dom.toggleThumbsBtn.setAttribute('aria-pressed', state.thumbsVisible ? 'true' : 'false');
      }
      if (dom.panelHideThumbsBtn) {
        dom.panelHideThumbsBtn.setAttribute('aria-pressed', state.thumbsVisible ? 'false' : 'true');
      }
      if (dom.showUploadsBtn) {
        dom.showUploadsBtn.setAttribute('aria-hidden', state.thumbsVisible ? 'true' : 'false');
      }
      updateDockButtons();
      localStorage.setItem('liteedit_thumbs_visible', state.thumbsVisible ? 'true' : 'false');
    }

    function applyToolsVisibility(visible) {
      state.toolsVisible = !!visible;
      if (isMobileView()) {
        dom.appRoot.classList.toggle('tools-hidden', false);
        dom.appRoot.classList.toggle('mobile-tools-open', state.toolsVisible);
      } else {
        dom.appRoot.classList.toggle('tools-hidden', !state.toolsVisible);
        dom.appRoot.classList.toggle('mobile-tools-open', false);
      }
      updateDockButtons();
      localStorage.setItem('liteedit_tools_visible', state.toolsVisible ? 'true' : 'false');
    }

    function activeImage() {
      return state.images[state.selectedIndex] || null;
    }

    function getImageBaseName(name) {
      const dot = String(name || '').lastIndexOf('.');
      return dot > 0 ? name.slice(0, dot) : String(name || '');
    }

    function ensureImageAdjustmentModel(img) {
      if (!img) return;
      if (!Array.isArray(img.adjustmentStack)) {
        img.adjustmentStack = [];
      }
      if (!img.adjustmentBaseCanvas) {
        img.adjustmentBaseCanvas = null;
      }
    }

    function normalizeAdjustmentStep(step) {
      return {
        brightness: clamp(parseInt(step && step.brightness, 10) || 100, 40, 180),
        contrast: clamp(parseInt(step && step.contrast, 10) || 100, 40, 200),
        saturation: clamp(parseInt(step && step.saturation, 10) || 100, 0, 220),
        globalBlur: clamp(parseInt(step && step.globalBlur, 10) || 0, 0, 12)
      };
    }

    function isNeutralAdjustmentStep(step) {
      const normalized = normalizeAdjustmentStep(step);
      return normalized.brightness === 100
        && normalized.contrast === 100
        && normalized.saturation === 100
        && normalized.globalBlur === 0;
    }

    function cloneAdjustmentStep(step) {
      const normalized = normalizeAdjustmentStep(step);
      return {
        brightness: normalized.brightness,
        contrast: normalized.contrast,
        saturation: normalized.saturation,
        globalBlur: normalized.globalBlur
      };
    }

    function getAdjustmentStackForImage(img = activeImage()) {
      if (!img) return [];
      ensureImageAdjustmentModel(img);
      return img.adjustmentStack;
    }

    function renderAdjustmentStackList() {
      if (!dom.adjustmentStackList) return;
      const img = activeImage();
      if (!img) {
        dom.adjustmentStackList.innerHTML = '<div class="adjustment-stack-empty">Select an image to manage steps.</div>';
        return;
      }
      const stack = getAdjustmentStackForImage(img);
      if (stack.length === 0) {
        dom.adjustmentStackList.innerHTML = '<div class="adjustment-stack-empty">No adjustment steps yet.</div>';
        return;
      }
      const selectedIndex = clamp(state.adjustmentStepSelectionIndex, -1, stack.length - 1);
      if (selectedIndex !== state.adjustmentStepSelectionIndex) {
        state.adjustmentStepSelectionIndex = selectedIndex;
      }
      dom.adjustmentStackList.innerHTML = '';
      stack.forEach((rawStep, index) => {
        const step = normalizeAdjustmentStep(rawStep);
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `adjustment-stack-item${index === state.adjustmentStepSelectionIndex ? ' active' : ''}`;
        item.innerHTML = `
          <div class="adjustment-stack-item-title">Step ${index + 1}</div>
          <div class="adjustment-stack-item-meta">
            <span>B ${step.brightness}%</span>
            <span>C ${step.contrast}%</span>
            <span>S ${step.saturation}%</span>
            <span>Blur ${step.globalBlur}px</span>
          </div>
        `;
        item.addEventListener('click', () => {
          state.adjustmentStepSelectionIndex = index;
          dom.brightnessInput.value = String(step.brightness);
          dom.contrastInput.value = String(step.contrast);
          dom.saturationInput.value = String(step.saturation);
          dom.globalBlurInput.value = String(step.globalBlur);
          renderAdjustmentStackList();
          setStatus(`Adjustment step ${index + 1} selected`);
          updateActionAvailability();
        });
        dom.adjustmentStackList.appendChild(item);
      });
    }

    function clearAdjustmentModel(img, { keepCanvas = true } = {}) {
      if (!img) return;
      ensureImageAdjustmentModel(img);
      if (!keepCanvas && img.adjustmentBaseCanvas) {
        img.canvas = cloneCanvas(img.adjustmentBaseCanvas);
      }
      img.adjustmentStack = [];
      img.adjustmentBaseCanvas = null;
      if (img === activeImage()) {
        state.adjustmentStepSelectionIndex = -1;
        renderAdjustmentStackList();
      }
    }

    function rebuildCanvasFromAdjustmentStack(img) {
      if (!img) return false;
      ensureImageAdjustmentModel(img);
      if (!img.adjustmentBaseCanvas || img.adjustmentStack.length === 0) return false;
      let working = cloneCanvas(img.adjustmentBaseCanvas);
      img.adjustmentStack.forEach((rawStep) => {
        working = buildAdjustedCanvas(working, normalizeAdjustmentStep(rawStep));
      });
      img.canvas = working;
      markImageModified(img);
      return true;
    }

    function appendAdjustmentStepToImage(img, step, { silent = false } = {}) {
      if (!img) return false;
      const normalized = normalizeAdjustmentStep(step);
      if (isNeutralAdjustmentStep(normalized)) {
        if (!silent) {
          showToast('Adjustment step skipped (no visual change).', 'info');
        }
        return false;
      }
      ensureImageAdjustmentModel(img);
      if (!img.adjustmentBaseCanvas) {
        img.adjustmentBaseCanvas = cloneCanvas(img.canvas);
      }
      pushHistory(img);
      img.adjustmentStack.push(cloneAdjustmentStep(normalized));
      state.adjustmentStepSelectionIndex = img.adjustmentStack.length - 1;
      rebuildCanvasFromAdjustmentStack(img);
      clearTextDetectionsForImage(img, { silent: true });
      if (img === activeImage()) {
        renderCanvas();
        renderAdjustmentStackList();
      }
      requestThumbnailsRender(true);
      updateUndoRedoState();
      updateExportSizeEstimate();
      if (!silent) {
        setStatus(`Adjustment step ${img.adjustmentStack.length} added`);
      }
      return true;
    }

    function updateSelectedAdjustmentStep() {
      const img = activeImage();
      if (!img) return;
      ensureImageAdjustmentModel(img);
      if (img.adjustmentStack.length === 0 || state.adjustmentStepSelectionIndex < 0 || state.adjustmentStepSelectionIndex >= img.adjustmentStack.length) {
        showToast('Select an adjustment step first.', 'info');
        return;
      }
      const replacement = getAdjustmentValues();
      pushHistory(img);
      img.adjustmentStack[state.adjustmentStepSelectionIndex] = cloneAdjustmentStep(replacement);
      rebuildCanvasFromAdjustmentStack(img);
      clearTextDetectionsForImage(img, { silent: true });
      renderCanvas();
      renderAdjustmentStackList();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      updateExportSizeEstimate();
      setStatus(`Adjustment step ${state.adjustmentStepSelectionIndex + 1} updated`);
    }

    function removeSelectedAdjustmentStep() {
      const img = activeImage();
      if (!img) return;
      ensureImageAdjustmentModel(img);
      if (img.adjustmentStack.length === 0 || state.adjustmentStepSelectionIndex < 0 || state.adjustmentStepSelectionIndex >= img.adjustmentStack.length) {
        showToast('Select an adjustment step first.', 'info');
        return;
      }
      pushHistory(img);
      img.adjustmentStack.splice(state.adjustmentStepSelectionIndex, 1);
      if (img.adjustmentStack.length === 0) {
        clearAdjustmentModel(img, { keepCanvas: false });
        markImageModified(img);
        refreshDirtyState(img);
      } else {
        state.adjustmentStepSelectionIndex = Math.max(0, Math.min(state.adjustmentStepSelectionIndex, img.adjustmentStack.length - 1));
        rebuildCanvasFromAdjustmentStack(img);
      }
      clearTextDetectionsForImage(img, { silent: true });
      renderCanvas();
      renderAdjustmentStackList();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      updateExportSizeEstimate();
      setStatus('Adjustment step removed');
    }

    function clearAdjustmentStepsForActiveImage() {
      const img = activeImage();
      if (!img) return;
      ensureImageAdjustmentModel(img);
      if (img.adjustmentStack.length === 0) {
        showToast('No adjustment steps to clear.', 'info');
        return;
      }
      pushHistory(img);
      clearAdjustmentModel(img, { keepCanvas: false });
      markImageModified(img);
      refreshDirtyState(img);
      clearTextDetectionsForImage(img, { silent: true });
      renderCanvas();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      updateExportSizeEstimate();
      setStatus('Adjustment steps cleared');
    }

    function invalidateAdjustmentStackForImage(img) {
      if (!img) return;
      ensureImageAdjustmentModel(img);
      if (img.adjustmentStack.length === 0 && !img.adjustmentBaseCanvas) return;
      img.adjustmentStack = [];
      img.adjustmentBaseCanvas = null;
      if (img === activeImage()) {
        state.adjustmentStepSelectionIndex = -1;
        renderAdjustmentStackList();
      }
    }

    function prepareForDirectCanvasEdit(img) {
      if (!img) return;
      clearAdjustmentPreview();
      invalidateAdjustmentStackForImage(img);
    }

    function isTextDetectorSupported() {
      return typeof window.TextDetector === 'function' || !!(window.Tesseract && typeof window.Tesseract.recognize === 'function');
    }

    function getTextDetectionsForImage(img = activeImage()) {
      if (!img) return [];
      if (!Array.isArray(img.textDetections)) {
        img.textDetections = [];
      }
      return img.textDetections;
    }

    function getSelectedTextDetection() {
      const detections = getTextDetectionsForImage();
      if (state.textSelectionIndex < 0 || state.textSelectionIndex >= detections.length) {
        return null;
      }
      return detections[state.textSelectionIndex];
    }

    function getTextController() {
      if (!textController) {
        textController = createTextController({
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
        });
      }
      return textController;
    }

    function syncSelectedTextBoxPositionFields() {
      getTextController().syncSelectedTextBoxPositionFields();
    }

    function applySelectedTextBoxPosition({ center = false } = {}) {
      getTextController().applySelectedTextBoxPosition({ center });
    }

    function setTextAddPlacementActive(active) {
      getTextController().setTextAddPlacementActive(active);
    }

    function placeNewTextBoxAtPoint(point) {
      return getTextController().placeNewTextBoxAtPoint(point);
    }

    function focusReplacementInput(preferQuick = false) {
      const tryFocus = (input) => {
        if (!input || input.disabled) return false;
        try {
          input.focus({ preventScroll: true });
        } catch (error) {
          input.focus();
        }
        if (typeof input.select === 'function') {
          input.select();
        }
        return true;
      };

      if (preferQuick && dom.textQuickEditor && dom.textQuickEditor.classList.contains('active')) {
        if (tryFocus(dom.textQuickInput)) return true;
      }
      if (tryFocus(dom.replaceTextInput)) return true;
      if (tryFocus(dom.textQuickInput)) return true;
      return false;
    }

    function hasValidCropSelection() {
      const rect = normalizeCropRect(state.cropRect);
      if (!rect) return false;
      return Number.isFinite(rect.w) && Number.isFinite(rect.h) && rect.w > 0 && rect.h > 0;
    }

    function syncCropActionButtons() {
      const hasImage = !!activeImage();
      if (dom.applyCropBtn) {
        const canApplyCrop = hasImage && hasValidCropSelection();
        dom.applyCropBtn.disabled = !canApplyCrop;
        dom.applyCropBtn.classList.toggle('crop-ready', canApplyCrop && state.tool === 'crop');
      }
      if (dom.cancelCropBtn) {
        dom.cancelCropBtn.disabled = !hasImage || state.tool !== 'crop';
      }
    }

    function clearTextDetectionsForImage(img = activeImage(), { silent = false, recordHistory = false, actionLabel = 'Clear text boxes' } = {}) {
      if (!img) return;
      if (recordHistory && Array.isArray(img.textDetections) && img.textDetections.length > 0) {
        pushHistory(img, actionLabel);
      }
      img.textDetections = [];
      if (img === activeImage()) {
        state.textSelectionIndex = -1;
        if (dom.detectedTextSelect) dom.detectedTextSelect.value = '';
        if (dom.replaceTextInput) dom.replaceTextInput.value = '';
        syncTextEditPanel();
        renderCanvas();
      }
      if (recordHistory) {
        updateUndoRedoState();
      }
      if (!silent) {
        setStatus('Detected text tokens cleared');
      }
    }

    function selectTextDetection(index, syncInput = false) {
      const detections = getTextDetectionsForImage();
      if (detections.length === 0) {
        state.textSelectionIndex = -1;
        syncSelectedTextBoxPositionFields();
        syncTextEditPanel();
        renderCanvas();
        return false;
      }

      const safeIndex = Math.max(0, Math.min(index, detections.length - 1));
      state.textSelectionIndex = safeIndex;
      const selected = detections[safeIndex];
      if (dom.detectedTextSelect) {
        dom.detectedTextSelect.value = String(safeIndex);
      }
      if (syncInput && dom.replaceTextInput) {
        dom.replaceTextInput.value = selected.text || '';
      }
      syncSelectedTextBoxPositionFields();
      syncTextEditPanel();
      renderCanvas();
      if (syncInput) {
        focusReplacementInput(true);
      }
      return true;
    }

    function selectTextDetectionAtPoint(point) {
      const selectedIndex = getTextDetectionIndexAtPoint(point);
      if (selectedIndex < 0) return false;
      selectTextDetection(selectedIndex, true);
      setStatus(`Selected text token ${selectedIndex + 1}`);
      return true;
    }

    function getTextDetectionIndexAtPoint(point) {
      const detections = getTextDetectionsForImage();
      if (detections.length === 0) return -1;
      let bestIndex = -1;
      let bestScore = Number.POSITIVE_INFINITY;
      for (let i = detections.length - 1; i >= 0; i -= 1) {
        const box = detections[i];
        const tolerance = Math.max(3, Math.min(14, Math.round(Math.min(box.w, box.h) * 0.22)));
        const left = box.x - tolerance;
        const right = box.x + box.w + tolerance;
        const top = box.y - tolerance;
        const bottom = box.y + box.h + tolerance;
        if (
          point.x >= left && point.x <= right
          && point.y >= top && point.y <= bottom
        ) {
          const centerX = box.x + (box.w / 2);
          const centerY = box.y + (box.h / 2);
          const dx = point.x - centerX;
          const dy = point.y - centerY;
          const score = (dx * dx) + (dy * dy);
          if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }
      }
      return bestIndex;
    }

    function beginTextBlockDrag(index, point) {
      const detections = getTextDetectionsForImage();
      const box = detections[index];
      if (!box) return false;
      state.textDrag = {
        index,
        offsetX: point.x - box.x,
        offsetY: point.y - box.y,
        hasHistoryEntry: false
      };
      dom.canvas.style.cursor = 'move';
      return true;
    }

    function updateTextBlockDrag(point) {
      if (!state.textDrag) return false;
      const detections = getTextDetectionsForImage();
      const box = detections[state.textDrag.index];
      if (!box) return false;
      if (!state.textDrag.hasHistoryEntry) {
        const img = activeImage();
        if (img) {
          pushHistory(img, 'Move text box');
          state.textDrag.hasHistoryEntry = true;
        }
      }
      const nextX = clamp(point.x - state.textDrag.offsetX, 0, Math.max(0, dom.canvas.width - box.w));
      const nextY = clamp(point.y - state.textDrag.offsetY, 0, Math.max(0, dom.canvas.height - box.h));
      box.x = Math.round(nextX);
      box.y = Math.round(nextY);
      syncSelectedTextBoxPositionFields();
      syncTextQuickEditor();
      renderCanvas();
      return true;
    }

    function endTextBlockDrag() {
      if (!state.textDrag) return;
      const committed = !!state.textDrag.hasHistoryEntry;
      state.textDrag = null;
      dom.canvas.style.cursor = 'default';
      syncSelectedTextBoxPositionFields();
      if (committed) {
        updateUndoRedoState();
        setStatus('Text box moved');
      }
      scheduleSessionAutosave();
      syncTextQuickEditor();
    }

    function hideTextQuickEditor() {
      if (!dom.textQuickEditor) return;
      dom.textQuickEditor.classList.remove('active');
      dom.textQuickEditor.setAttribute('aria-hidden', 'true');
      state.textQuickSelectionIndex = -1;
    }

    function positionTextQuickEditor(selection) {
      if (!dom.textQuickEditor || !selection || !dom.canvasZone || !dom.canvas) return;
      const zoneRect = dom.canvasZone.getBoundingClientRect();
      const canvasRect = dom.canvas.getBoundingClientRect();
      if (zoneRect.width <= 0 || zoneRect.height <= 0 || canvasRect.width <= 0 || canvasRect.height <= 0) return;

      const scaleX = canvasRect.width / Math.max(1, dom.canvas.width);
      const scaleY = canvasRect.height / Math.max(1, dom.canvas.height);
      const anchorX = canvasRect.left - zoneRect.left + (selection.x + (selection.w / 2)) * scaleX;
      const aboveY = canvasRect.top - zoneRect.top + (selection.y * scaleY) - 12;
      const belowY = canvasRect.top - zoneRect.top + ((selection.y + selection.h) * scaleY) + 12;

      const editorW = Math.max(220, dom.textQuickEditor.offsetWidth || 260);
      const editorH = Math.max(54, dom.textQuickEditor.offsetHeight || 74);
      const maxLeft = Math.max(8, zoneRect.width - editorW - 8);
      let left = clamp(anchorX - (editorW / 2), 8, maxLeft);

      let top = aboveY - editorH;
      if (top < 8) {
        top = belowY;
      }
      top = clamp(top, 8, Math.max(8, zoneRect.height - editorH - 8));

      dom.textQuickEditor.style.left = `${Math.round(left)}px`;
      dom.textQuickEditor.style.top = `${Math.round(top)}px`;
    }

    function syncTextQuickEditor() {
      if (!dom.textQuickEditor || !dom.textQuickInput) return;
      const img = activeImage();
      const detections = getTextDetectionsForImage(img);
      const hasSelection = !!img
        && state.userMode === 'advanced'
        && state.tool !== 'crop'
        && state.textSelectionIndex >= 0
        && state.textSelectionIndex < detections.length;
      if (!hasSelection) {
        hideTextQuickEditor();
        return;
      }

      const selected = detections[state.textSelectionIndex];
      const selectionChanged = state.textQuickSelectionIndex !== state.textSelectionIndex;
      if (selectionChanged) {
        dom.textQuickInput.value = selected.text || '';
      } else if (document.activeElement !== dom.textQuickInput) {
        const fallbackText = selected.text || '';
        dom.textQuickInput.value = (dom.replaceTextInput && dom.replaceTextInput.value) || fallbackText;
      }

      dom.textQuickEditor.classList.add('active');
      dom.textQuickEditor.setAttribute('aria-hidden', 'false');
      positionTextQuickEditor(selected);
      state.textQuickSelectionIndex = state.textSelectionIndex;
    }

    function syncTextEditPanel(options = {}) {
      const preserveNoSelection = !!(options && options.preserveNoSelection);
      const hasImage = !!activeImage();
      const supported = isTextDetectorSupported();
      const detections = getTextDetectionsForImage();

      if (!preserveNoSelection && detections.length > 0 && (state.textSelectionIndex < 0 || state.textSelectionIndex >= detections.length)) {
        state.textSelectionIndex = 0;
      }
      if (detections.length === 0) {
        state.textSelectionIndex = -1;
      }

      if (dom.detectTextSupportNote) {
        dom.detectTextSupportNote.textContent = supported
          ? 'Detect text, then drag white boxes to reposition or edit from the token list.'
          : 'Native text detection is unavailable. OCR fallback will load when you tap Detect Text.';
      }

      if (dom.detectedTextSelect) {
        dom.detectedTextSelect.innerHTML = '';
        if (!hasImage) {
          dom.detectedTextSelect.innerHTML = '<option value="">No image selected</option>';
        } else if (detections.length === 0) {
          dom.detectedTextSelect.innerHTML = '<option value="">No text detected</option>';
        } else {
          detections.forEach((detection, idx) => {
            const option = document.createElement('option');
            const preview = (detection.text || '').replace(/\s+/g, ' ').trim();
            const snippet = preview ? preview.slice(0, 28) : `Token ${idx + 1}`;
            const confidenceTag = Number.isFinite(detection.confidence)
              ? ` (${Math.round(detection.confidence)}%)`
              : '';
            option.value = String(idx);
            option.textContent = `${idx + 1}. ${snippet}${preview.length > 28 ? '...' : ''}${confidenceTag}`;
            dom.detectedTextSelect.appendChild(option);
          });
          if (state.textSelectionIndex >= 0) {
            dom.detectedTextSelect.value = String(state.textSelectionIndex);
          }
        }
      }

      const hasSelection = state.textSelectionIndex >= 0 && state.textSelectionIndex < detections.length;
      if (dom.detectTextBtn) {
        dom.detectTextBtn.disabled = !hasImage || state.detectingText;
        dom.detectTextBtn.textContent = state.detectingText ? 'Detecting...' : 'Detect Text';
      }
      if (dom.textConfidenceInput) {
        dom.textConfidenceInput.value = String(clamp(state.textConfidenceThreshold, 0, 95));
      }
      if (dom.textConfidenceVal) {
        dom.textConfidenceVal.textContent = String(clamp(state.textConfidenceThreshold, 0, 95));
      }
      if (dom.textStrictnessInput) {
        dom.textStrictnessInput.value = normalizeTextStrictness(state.textStrictness);
      }
      if (dom.textSizeScaleInput) {
        dom.textSizeScaleInput.value = String(state.textReplaceSizeScale);
      }
      if (dom.textSizeScaleVal) {
        dom.textSizeScaleVal.textContent = String(state.textReplaceSizeScale);
      }
      if (dom.clearTextBoxesBtn) dom.clearTextBoxesBtn.disabled = !hasImage || detections.length === 0;
      if (dom.detectedTextSelect) dom.detectedTextSelect.disabled = !hasImage || detections.length === 0;
      if (dom.replaceTextInput) dom.replaceTextInput.disabled = !hasImage || !hasSelection;
      if (dom.smartTextFontField) {
        dom.smartTextFontField.style.display = hasSelection ? 'grid' : 'none';
      }
      if (dom.textFontFamilySelect) {
        dom.textFontFamilySelect.disabled = !hasImage || !hasSelection;
        if (!hasSelection) {
          dom.textFontFamilySelect.value = 'auto';
        } else if ([...dom.textFontFamilySelect.options].some((option) => option.value === state.textFontFamily)) {
          dom.textFontFamilySelect.value = state.textFontFamily;
        } else {
          state.textFontFamily = 'auto';
          dom.textFontFamilySelect.value = 'auto';
        }
      }
      if (dom.smartTextAutoSizeInput) dom.smartTextAutoSizeInput.disabled = !hasImage || !hasSelection;
      if (dom.applyTextReplaceBtn) dom.applyTextReplaceBtn.disabled = !hasImage || !hasSelection;
      if (dom.startAddTextBtn) {
        dom.startAddTextBtn.disabled = !hasImage || state.userMode !== 'advanced';
      }
      if (dom.cancelAddTextBtn) {
        dom.cancelAddTextBtn.disabled = !state.textAddPlacementActive;
      }
      if (dom.addTextBgOpacityInput && dom.addTextBgOpacityVal) {
        const opacityVal = clamp(parseInt(dom.addTextBgOpacityInput.value || '78', 10) || 78, 15, 100);
        dom.addTextBgOpacityVal.textContent = String(opacityVal);
      }
      syncSelectedTextBoxPositionFields();
      syncTextQuickEditor();
    }

    function applyConfidenceThresholdToCurrentDetections() {
      const img = activeImage();
      if (!img) return;
      const detections = getTextDetectionsForImage(img);
      if (detections.length === 0) return;
      const threshold = clamp(parseInt(state.textConfidenceThreshold, 10) || 0, 0, 95);
      const filtered = detections.filter((entry) => {
        if (!Number.isFinite(entry && entry.confidence)) return true;
        return entry.confidence >= threshold;
      });
      if (filtered.length === detections.length) return;
      img.textDetections = filtered;
      if (state.textSelectionIndex >= filtered.length) {
        state.textSelectionIndex = filtered.length > 0 ? filtered.length - 1 : -1;
      }
      syncTextEditPanel();
      renderCanvas();
      setStatus(`Filtered text tokens by confidence: ${threshold}%+`);
    }

    async function detectTextBlocks() {
      const img = activeImage();
      if (!img) {
        showToast('Select an image first.', 'error');
        return;
      }
      state.detectingText = true;
      syncTextEditPanel();
      setStatus('Detecting text...');

      try {
        const textTools = await ensureTextToolsLoaded();
        const detections = await textTools.detectTextBlocks(img.canvas, {
          granularity: 'word',
          language: state.ocrLanguage
        });
        const threshold = clamp(parseInt(state.textConfidenceThreshold, 10) || 0, 0, 95);
        const filteredDetections = detections.filter((entry) => {
          if (!Number.isFinite(entry && entry.confidence)) return true;
          return entry.confidence >= threshold;
        });
        if (typeof textTools.estimateTextStyle === 'function') {
          filteredDetections.forEach((detection) => {
            detection.style = textTools.estimateTextStyle(img.canvas, detection, detection.text);
          });
        }

        img.textDetections = filteredDetections;
        state.textSelectionIndex = filteredDetections.length > 0 ? 0 : -1;
        if (filteredDetections.length > 0 && dom.replaceTextInput) {
          dom.replaceTextInput.value = filteredDetections[0].text || '';
        } else if (dom.replaceTextInput) {
          dom.replaceTextInput.value = '';
        }

        setStatus(filteredDetections.length > 0
          ? `Detected ${filteredDetections.length} text token${filteredDetections.length > 1 ? 's' : ''}`
          : 'No readable text tokens found');
        showToast(
          filteredDetections.length > 0
            ? `Detected ${filteredDetections.length} text token${filteredDetections.length > 1 ? 's' : ''}.`
            : 'No text detected.',
          filteredDetections.length > 0 ? 'success' : 'info'
        );
        if (filteredDetections.length > 0) {
          window.setTimeout(() => {
            focusReplacementInput(true);
          }, 0);
        }
      } catch (error) {
        console.error('Text detection failed:', error);
        const message = (error && error.message) ? error.message : 'Text detection failed for this image.';
        showToast(message, 'error');
        setStatus('Text detection failed');
      } finally {
        state.detectingText = false;
        syncTextEditPanel();
        renderCanvas();
      }
    }

    function drawTextDetections(ctx) {
      if (state.userMode !== 'advanced') return;
      const detections = getTextDetectionsForImage();
      if (detections.length === 0) return;
      if (!textToolsModule || typeof textToolsModule.drawTextDetections !== 'function') return;
      textToolsModule.drawTextDetections(ctx, detections, state.textSelectionIndex);
    }

    function resolveTextFontFamily() {
      if (state.textFontFamily && state.textFontFamily !== 'auto') {
        return state.textFontFamily;
      }
      return '"Segoe UI", Arial, Helvetica, sans-serif';
    }

    async function applySmartTextReplace(options = {}) {
      const img = activeImage();
      const selected = getSelectedTextDetection();
      if (!img || !selected) {
        showToast('Select a detected text token first.', 'error');
        return;
      }

      const replacementValue = options && typeof options.replacement === 'string'
        ? options.replacement
        : ((dom.replaceTextInput && dom.replaceTextInput.value) || '');
      const replacement = String(replacementValue).trim();
      if (!replacement) {
        showToast('Enter replacement text first.', 'error');
        return;
      }

      let textTools;
      try {
        textTools = await ensureTextToolsLoaded();
      } catch (error) {
        console.error('Text tools failed to load:', error);
        showToast('Could not load text tools.', 'error');
        return;
      }

      const overrideAutoFit = options && typeof options.autoFit === 'boolean' ? options.autoFit : null;
      let autoFit = overrideAutoFit !== null
        ? overrideAutoFit
        : !!(dom.smartTextAutoSizeInput && dom.smartTextAutoSizeInput.checked);
      let lockSourceSize = !!(options && options.lockSourceSize);
      let expandWidthToFit = true;
      const strictness = normalizeTextStrictness(state.textStrictness);
      if (strictness === 'strict') {
        lockSourceSize = true;
        if (overrideAutoFit === null) autoFit = false;
        expandWidthToFit = false;
      } else if (strictness === 'loose') {
        lockSourceSize = false;
        if (overrideAutoFit === null) autoFit = true;
        expandWidthToFit = true;
      }
      const closeEditor = !!(options && options.closeEditor);
      const fontFamily = resolveTextFontFamily();
      const sizeScale = clamp(state.textReplaceSizeScale, 70, 170) / 100;

      prepareForDirectCanvasEdit(img);
      pushHistory(img, 'Replace text');
      let result;
      try {
        result = textTools.applySmartTextReplace({
          canvas: img.canvas,
          selectionRect: selected,
          sourceText: selected.text,
          sourceStyle: selected.style || null,
          replacement,
          fontFamily,
          autoFit,
          lockSourceSize,
          expandWidthToFit,
          sizeScale
        });
      } catch (error) {
        console.error('Text replacement failed:', error);
        if (img.history.length > 0) {
          img.history.pop();
        }
        showToast('Text replacement failed.', 'error');
        return;
      }
      if (!result || !result.applied) {
        if (img.history.length > 0) {
          img.history.pop();
        }
        showToast(result && result.reason ? result.reason : 'Text replacement failed.', 'error');
        return;
      }

      selected.text = replacement;
      if (result.rect) {
        selected.x = result.rect.x;
        selected.y = result.rect.y;
        selected.w = result.rect.w;
        selected.h = result.rect.h;
      }
      if (result.style) {
        selected.style = result.style;
      }
      if (dom.replaceTextInput) {
        dom.replaceTextInput.value = replacement;
      }
      if (dom.textQuickInput) {
        dom.textQuickInput.value = replacement;
      }
      syncSelectedTextBoxPositionFields();
      markImageModified(img);
      requestThumbnailsRender(true);
      renderCanvas();
      updateUndoRedoState();
      updateExportSizeEstimate();
      if (closeEditor) {
        state.textSelectionIndex = -1;
        if (dom.detectedTextSelect) dom.detectedTextSelect.value = '';
        hideTextQuickEditor();
        syncTextEditPanel({ preserveNoSelection: true });
      } else {
        syncTextEditPanel();
      }
      setStatus('Text updated with preserved style and placement');
      showToast('Text replaced successfully.', 'success');
    }

    function getUiFlowController() {
      if (!uiFlowController) {
        uiFlowController = createUiFlowController({
          state,
          dom,
          maxTotalPixels: MAX_TOTAL_PIXELS,
          isMobileView,
          loadFilesIntoState,
          setStatus,
          showToast,
          openModal,
          closeModal
        });
      }
      return uiFlowController;
    }

    function openCameraSheet() {
      getUiFlowController().openCameraSheet();
    }

    function closeCameraSheet() {
      getUiFlowController().closeCameraSheet();
    }

    function stopLiveCaptureStream() {
      getUiFlowController().stopLiveCaptureStream();
    }

    function closeLiveCaptureModal() {
      getUiFlowController().closeLiveCaptureModal();
    }

    function shouldUseNativeMobileCamera() {
      return getUiFlowController().shouldUseNativeMobileCamera();
    }

    async function openLiveCaptureModal(preset = 'photo') {
      await getUiFlowController().openLiveCaptureModal(preset);
    }

    async function captureLiveFrame() {
      await getUiFlowController().captureLiveFrame();
    }

    async function startCaptureFlow(preset = 'photo') {
      await getUiFlowController().startCaptureFlow(preset);
    }

    function openImportSheet() {
      getUiFlowController().openImportSheet();
    }

    function closeImportSheet() {
      getUiFlowController().closeImportSheet();
    }

    function openSettingsSheet() {
      getUiFlowController().openSettingsSheet();
    }

    function closeSettingsSheet() {
      getUiFlowController().closeSettingsSheet();
    }

    function openHelpSheet() {
      getUiFlowController().openHelpSheet();
    }

    function closeHelpSheet() {
      getUiFlowController().closeHelpSheet();
    }

    function buildReportIssueSnapshot() {
      return getUiFlowController().buildReportIssueSnapshot();
    }

    function openReportIssueSheet() {
      getUiFlowController().openReportIssueSheet();
    }

    function closeReportIssueSheet() {
      getUiFlowController().closeReportIssueSheet();
    }

    function buildReportIssueFilename() {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      return `liteedit-report-${yyyy}${mm}${dd}-${hh}${mi}.json`;
    }

    function downloadTextFile(text, filename, mimeType = 'application/json') {
      const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }

    function applyExportMode(mode) {
      const nextMode = mode === 'bulk' ? 'bulk' : 'single';
      state.exportMode = nextMode;
      dom.exportSheet.classList.toggle('mode-single', nextMode === 'single');
      dom.exportSheet.classList.toggle('mode-bulk', nextMode === 'bulk');
      dom.exportModeSingleBtn.classList.toggle('active', nextMode === 'single');
      dom.exportModeBulkBtn.classList.toggle('active', nextMode === 'bulk');
      dom.downloadBtn.style.display = nextMode === 'single' ? 'inline-flex' : 'none';
      dom.downloadAllBtn.style.display = nextMode === 'bulk' ? 'inline-flex' : 'none';
      if (dom.cancelExportQueueBtn) {
        dom.cancelExportQueueBtn.style.display = nextMode === 'bulk' ? 'inline-flex' : 'none';
      }
      localStorage.setItem('liteedit_export_mode', nextMode);
      updateBulkPdfModeVisibility();
      updateBulkOptionsUI();
      if (nextMode === 'bulk') {
        renderBulkFilesPanel();
      }
      updateExportSummary();
      updateActionAvailability();
    }

    function applyBulkPdfMode(mode) {
      const nextMode = mode === 'separate' ? 'separate' : 'combined';
      state.bulkPdfMode = nextMode;
      dom.pdfBulkModeCombined.checked = nextMode === 'combined';
      dom.pdfBulkModeSeparate.checked = nextMode === 'separate';
      localStorage.setItem('liteedit_bulk_pdf_mode', nextMode);
      updateBulkPdfModeVisibility();
      updateExportSummary();
    }

    function applyBulkExportMode(mode) {
      const nextMode = normalizeBulkExportMode(mode);
      state.bulkExportMode = nextMode;
      localStorage.setItem('liteedit_bulk_export_mode', nextMode);
      updateBulkOptionsUI();
      updateActionAvailability();
      updateExportSummary();
    }

    function applyBulkAdvancedMode(mode) {
      const nextMode = normalizeBulkAdvancedMode(mode);
      state.bulkAdvancedMode = nextMode;
      localStorage.setItem('liteedit_bulk_advanced_mode', nextMode);
      updateBulkOptionsUI();
      updateActionAvailability();
      updateExportSummary();
    }

    function applyBulkShowImages(mode) {
      const nextMode = normalizeBulkShowMode(mode);
      state.bulkShowImages = nextMode;
      localStorage.setItem('liteedit_bulk_show_images', nextMode);
      updateBulkOptionsUI();
      if (shouldRenderBulkPanelNow() && nextMode === 'show') {
        renderBulkFilesPanel();
      }
    }

    function applyBulkSequentialBase(value) {
      const sanitized = sanitizeFileName(value || '').replace(/\.[^.]+$/, '').trim();
      state.bulkSequentialBase = sanitized || 'Name';
      localStorage.setItem('liteedit_bulk_sequential_base', state.bulkSequentialBase);
      if (dom.bulkSequentialBaseInput) {
        dom.bulkSequentialBaseInput.value = state.bulkSequentialBase;
      }
    }

    function applyBulkNameTemplateEnabled(enabled) {
      state.bulkUseNameTemplate = !!enabled;
      localStorage.setItem('liteedit_bulk_use_name_template', state.bulkUseNameTemplate ? 'true' : 'false');
      if (dom.bulkUseTemplateInput) {
        dom.bulkUseTemplateInput.checked = state.bulkUseNameTemplate;
      }
      updateBulkOptionsUI();
      updateActionAvailability();
      updateExportSummary();
    }

    function applyBulkNameTemplateValue(value) {
      const raw = String(value || '').trim();
      state.bulkNameTemplate = raw || '{name}_{n}';
      localStorage.setItem('liteedit_bulk_name_template', state.bulkNameTemplate);
      if (dom.bulkNameTemplateInput) {
        dom.bulkNameTemplateInput.value = state.bulkNameTemplate;
      }
      updateExportSummary();
    }

    function applyBulkNameSuffixValue(value) {
      const normalized = sanitizeFileName(value || '').replace(/\.[^.]+$/, '').trim();
      state.bulkNameSuffix = normalized;
      localStorage.setItem('liteedit_bulk_name_suffix', state.bulkNameSuffix);
      if (dom.bulkNameSuffixInput) {
        dom.bulkNameSuffixInput.value = state.bulkNameSuffix;
      }
      updateExportSummary();
    }

    function updateBulkPdfModeVisibility() {
      updateBulkOptionsUI();
    }

    async function refreshExportFormatAvailability() {
      if (!exportEngineModule || typeof exportEngineModule.canEncodeType !== 'function') return;
      const currentValue = dom.formatInput.value;
      const options = Array.from(dom.formatInput.options);
      const imageOptions = options.filter((option) => option.value.startsWith('image/'));
      const supportMap = new Map();

      await Promise.all(imageOptions.map(async (option) => {
        const value = option.value;
        let supported = false;
        try {
          supported = await exportEngineModule.canEncodeType(value);
        } catch (error) {
          supported = false;
        }
        supportMap.set(value, supported);
      }));

      let fallbackValue = currentValue;
      for (const option of options) {
        if (!option.dataset.baseLabel) {
          option.dataset.baseLabel = option.textContent;
        }
        if (!option.value.startsWith('image/')) {
          option.disabled = false;
          option.textContent = option.dataset.baseLabel;
          continue;
        }
        const supported = !!supportMap.get(option.value);
        option.disabled = !supported;
        option.textContent = supported
          ? option.dataset.baseLabel
          : `${option.dataset.baseLabel} (unsupported)`;
        if (!supported && fallbackValue === option.value) {
          fallbackValue = '';
        }
      }

      if (!fallbackValue) {
        const firstEnabled = options.find((option) => !option.disabled);
        if (firstEnabled) {
          fallbackValue = firstEnabled.value;
        }
      }

      if (fallbackValue && dom.formatInput.value !== fallbackValue) {
        dom.formatInput.value = fallbackValue;
      }
      updateBulkOptionsUI();
      if (shouldRenderBulkPanelNow()) {
        renderBulkFilesPanel();
      }
    }

    async function openExportSheet() {
      if (state.images.length === 0) {
        setStatus('Add an image before exporting.');
        showToast('Add at least one image to export.', 'error');
        return;
      }
      setExportProgress(0, 0);
      setExportSavings(0, 0);
      const autoMode = state.images.length > 1 ? 'bulk' : 'single';
      applyExportMode(autoMode);
      applyBulkPdfMode(state.bulkPdfMode);
      applyBulkExportMode(state.bulkExportMode);
      applyBulkAdvancedMode(state.bulkAdvancedMode);
      applyBulkShowImages(state.bulkShowImages);
      applyBulkSequentialBase(state.bulkSequentialBase);
      openModal(dom.exportSheet);
      if (!activeImage() && state.images.length > 0) {
        selectImage(0);
      }
      try {
        await ensureExportEngineLoaded();
        await refreshExportFormatAvailability();
      } catch (error) {
        console.error('Export engine failed to load:', error);
        showToast('Export tools could not load. Check network and retry.', 'error');
        return;
      }
      renderBulkFilesPanel();
      resetBulkStatuses();
      if (dom.cancelExportQueueBtn) {
        dom.cancelExportQueueBtn.disabled = true;
      }
      updateExportSizeEstimate();
      updateExportSummary();
    }

    function closeExportSheet() {
      closeModal(dom.exportSheet);
    }

    function enhanceDocumentCanvas(canvas) {
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lum = (lum - 108) * 1.38 + 108; // contrast boost
        if (lum > 208) lum = 255;
        else if (lum < 38) lum = 0;
        const out = Math.max(0, Math.min(255, lum));
        data[i] = out;
        data[i + 1] = out;
        data[i + 2] = out;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    function buildImportCanvas(decodedImage) {
      const sourceW = decodedImage.sourceW;
      const sourceH = decodedImage.sourceH;
      let targetW = sourceW;
      let targetH = sourceH;

      if (state.importOptimize) {
        const edge = Math.max(1024, Math.min(6000, parseInt(state.importMaxEdge, 10) || 4096));
        const ratio = Math.min(edge / sourceW, edge / sourceH, 1);
        targetW = Math.max(1, Math.round(sourceW * ratio));
        targetH = Math.max(1, Math.round(sourceH * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(decodedImage.drawable, 0, 0, targetW, targetH);
      return {
        canvas,
        wasDownscaled: targetW !== sourceW || targetH !== sourceH,
        sourceW,
        sourceH,
        mimeType: decodedImage.mimeType || ''
      };
    }

    function createImageState(file, decodedImage, options = {}) {
      let importResult;
      try {
        importResult = buildImportCanvas(decodedImage);
      } finally {
        releaseDrawable(decodedImage.drawable);
      }
      const baseCanvas = importResult.canvas;
      if (options.cameraPreset === 'scan') {
        enhanceDocumentCanvas(baseCanvas);
      }
      const pixelCount = baseCanvas.width * baseCanvas.height;
      const largeImage = pixelCount >= LARGE_IMAGE_PIXEL_THRESHOLD;

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        mimeType: importResult.mimeType || normalizeImageMimeType(file),
        name: file.name,
        sizeKB: (file.size / 1024).toFixed(1),
        originalCanvas: cloneCanvas(baseCanvas),
        originalSnapshot: canvasSnapshot(baseCanvas),
        canvas: baseCanvas,
        history: [],
        future: [],
        dirty: false,
        revision: 0,
        lastExportRevision: 0,
        sourceWidth: importResult.sourceW,
        sourceHeight: importResult.sourceH,
        wasDownscaledOnImport: importResult.wasDownscaled,
        largeImage,
        pixelCount,
        adjustmentStack: [],
        adjustmentBaseCanvas: null,
        textDetections: [],
        thumbRevision: -1,
        thumbDataUrl: ''
      };
    }

    function cloneCanvas(source) {
      const copy = document.createElement('canvas');
      copy.width = source.width;
      copy.height = source.height;
      copy.getContext('2d').drawImage(source, 0, 0);
      return copy;
    }

    function getThumbnailDataUrl(img) {
      if (img.thumbRevision === img.revision && img.thumbDataUrl) {
        return img.thumbDataUrl;
      }
      const maxSide = 128;
      const ratio = Math.min(maxSide / img.canvas.width, maxSide / img.canvas.height, 1);
      const w = Math.max(1, Math.round(img.canvas.width * ratio));
      const h = Math.max(1, Math.round(img.canvas.height * ratio));
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = w;
      thumbCanvas.height = h;
      const tctx = thumbCanvas.getContext('2d');
      tctx.drawImage(img.canvas, 0, 0, w, h);
      img.thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);
      img.thumbRevision = img.revision;
      return img.thumbDataUrl;
    }

    function markImageModified(img) {
      if (!img) return;
      img.dirty = true;
      img.revision += 1;
      img.thumbRevision = -1;
      scheduleSessionAutosave();
    }

    function refreshDirtyState(img) {
      if (!img) return;
      if (img.canvas.width !== img.originalCanvas.width || img.canvas.height !== img.originalCanvas.height) {
        img.dirty = true;
        return;
      }
      img.dirty = canvasSnapshot(img.canvas) !== img.originalSnapshot;
    }

    function shouldUseMobileAdjustOverlay() {
      return window.matchMedia('(max-width: 900px) and (pointer: coarse)').matches;
    }

    function getRenderSourceCanvas() {
      const img = activeImage();
      if (!img) return null;
      if (state.comparePreviewActive && img.originalCanvas) {
        return img.originalCanvas;
      }
      const preview = state.adjustmentPreview;
      return (preview.active && preview.imageId === img.id && preview.previewCanvas)
        ? preview.previewCanvas
        : img.canvas;
    }

    function getEditedRenderCanvas() {
      const img = activeImage();
      if (!img) return null;
      const preview = state.adjustmentPreview;
      return (preview.active && preview.imageId === img.id && preview.previewCanvas)
        ? preview.previewCanvas
        : img.canvas;
    }

    function getSplitCompareX(canvasWidth) {
      const ratio = clamp(parseInt(state.splitComparePosition, 10) || 50, 10, 90) / 100;
      return clamp(Math.round(canvasWidth * ratio), 1, Math.max(1, canvasWidth - 1));
    }

    function syncMobileAdjustOverlay() {
      if (!state.mobileAdjustOverlayActive) return;
      const source = getRenderSourceCanvas();
      if (!source) return;
      const target = dom.mobileAdjustPreviewCanvas;
      const maxW = Math.max(1, Math.round(window.innerWidth - 28));
      const maxH = Math.max(1, Math.round(window.innerHeight - 70));
      const ratio = Math.min(maxW / source.width, maxH / source.height, 1);
      const w = Math.max(1, Math.round(source.width * ratio));
      const h = Math.max(1, Math.round(source.height * ratio));
      if (target.width !== w || target.height !== h) {
        target.width = w;
        target.height = h;
      }
      const ctx = target.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
    }

    function showMobileAdjustOverlay() {
      if (!shouldUseMobileAdjustOverlay()) return;
      state.mobileAdjustOverlayActive = true;
      dom.mobileAdjustOverlay.classList.add('active');
      dom.mobileAdjustOverlay.setAttribute('aria-hidden', 'false');
      syncMobileAdjustOverlay();
    }

    function hideMobileAdjustOverlay() {
      state.mobileAdjustOverlayActive = false;
      dom.mobileAdjustOverlay.classList.remove('active');
      dom.mobileAdjustOverlay.setAttribute('aria-hidden', 'true');
    }

    function clearAdjustmentPreview() {
      state.adjustmentPreview.active = false;
      state.adjustmentPreview.imageId = null;
      state.adjustmentPreview.baseCanvas = null;
      state.adjustmentPreview.previewCanvas = null;
      hideMobileAdjustOverlay();
    }

    function getAdjustmentValues() {
      return {
        brightness: parseInt(dom.brightnessInput.value, 10),
        contrast: parseInt(dom.contrastInput.value, 10),
        saturation: parseInt(dom.saturationInput.value, 10),
        globalBlur: parseInt(dom.globalBlurInput.value, 10)
      };
    }

    function buildAdjustedCanvas(baseCanvas, values) {
      const temp = document.createElement('canvas');
      temp.width = baseCanvas.width;
      temp.height = baseCanvas.height;
      const tctx = temp.getContext('2d');
      tctx.filter = `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturation}%) blur(${values.globalBlur}px)`;
      if (baseCanvas.width * baseCanvas.height >= LARGE_IMAGE_PIXEL_THRESHOLD) {
        const tileSize = ADJUST_TILE_SIZE;
        for (let y = 0; y < baseCanvas.height; y += tileSize) {
          for (let x = 0; x < baseCanvas.width; x += tileSize) {
            const w = Math.min(tileSize, baseCanvas.width - x);
            const h = Math.min(tileSize, baseCanvas.height - y);
            tctx.drawImage(baseCanvas, x, y, w, h, x, y, w, h);
          }
        }
      } else {
        tctx.drawImage(baseCanvas, 0, 0);
      }
      return temp;
    }

    function startAdjustmentPreview() {
      const img = activeImage();
      if (!img) return false;
      const preview = state.adjustmentPreview;
      if (preview.active && preview.imageId === img.id) return true;
      preview.active = true;
      preview.imageId = img.id;
      preview.baseCanvas = cloneCanvas(img.canvas);
      preview.previewCanvas = null;
      return true;
    }

    function updateAdjustmentPreview() {
      const img = activeImage();
      if (!img) return;
      if (!startAdjustmentPreview()) return;
      const preview = state.adjustmentPreview;
      preview.previewCanvas = buildAdjustedCanvas(preview.baseCanvas, getAdjustmentValues());
      renderCanvas();
      syncMobileAdjustOverlay();
      setStatus('Previewing adjustments...');
    }

    function commitAdjustmentPreview() {
      const img = activeImage();
      const preview = state.adjustmentPreview;
      if (!img || !preview.active || preview.imageId !== img.id || !preview.previewCanvas) {
        return;
      }
      const applied = appendAdjustmentStepToImage(img, getAdjustmentValues(), { silent: true });
      clearAdjustmentPreview();
      if (!applied) {
        renderCanvas();
        setStatus('Adjustment preview dismissed');
        return;
      }
      setStatus('Adjustment step added');
    }

    function finalizeAdjustmentGesture() {
      if (!state.adjustmentPreview.active) {
        hideMobileAdjustOverlay();
        return;
      }
      if (state.adjustmentPreview.previewCanvas) {
        commitAdjustmentPreview();
      } else {
        clearAdjustmentPreview();
        renderCanvas();
      }
    }

    function requestThumbnailsRender(immediate = false) {
      if (immediate) {
        if (thumbRenderFrameId) {
          cancelAnimationFrame(thumbRenderFrameId);
          thumbRenderFrameId = null;
        }
        if (thumbHydrateFrameId) {
          cancelAnimationFrame(thumbHydrateFrameId);
          thumbHydrateFrameId = null;
        }
        pendingThumbHydration = [];
        renderThumbnails();
        return;
      }
      if (thumbRenderFrameId) return;
      thumbRenderFrameId = requestAnimationFrame(() => {
        thumbRenderFrameId = null;
        renderThumbnails();
      });
    }

    function scheduleThumbHydration() {
      if (thumbHydrateFrameId || pendingThumbHydration.length === 0) return;
      const activeToken = thumbHydrateToken;
      thumbHydrateFrameId = requestAnimationFrame(() => {
        thumbHydrateFrameId = null;
        if (activeToken !== thumbHydrateToken) return;
        const endTime = performance.now() + 8;
        let processed = 0;
        while (pendingThumbHydration.length > 0 && performance.now() < endTime && processed < 4) {
          const item = pendingThumbHydration.shift();
          if (!item || !item.imgEl || !item.imgState || activeToken !== thumbHydrateToken) continue;
          item.imgEl.src = getThumbnailDataUrl(item.imgState);
          processed += 1;
        }
        if (pendingThumbHydration.length > 0 && activeToken === thumbHydrateToken) {
          scheduleThumbHydration();
        }
      });
    }

    function canvasSnapshot(sourceCanvas) {
      return sourceCanvas.toDataURL('image/png');
    }

    function cloneTextDetectionsSnapshot(detections) {
      if (!Array.isArray(detections)) return [];
      return detections.map((item) => ({ ...item }));
    }

    function createHistoryEntry(imgState, action = 'Edit') {
      const nextAction = typeof action === 'string' && action.trim() ? action.trim() : 'Edit';
      return {
        snapshot: canvasSnapshot(imgState.canvas),
        action: nextAction,
        textDetections: cloneTextDetectionsSnapshot(imgState.textDetections),
        textSelectionIndex: imgState === activeImage() ? state.textSelectionIndex : -1
      };
    }

    function readHistoryEntry(entry) {
      if (typeof entry === 'string') {
        return {
          snapshot: entry,
          action: 'Edit',
          textDetections: null,
          textSelectionIndex: -1
        };
      }
      if (!entry || typeof entry !== 'object') return null;
      const snapshot = typeof entry.snapshot === 'string'
        ? entry.snapshot
        : (typeof entry.dataUrl === 'string' ? entry.dataUrl : '');
      if (!snapshot) return null;
      return {
        snapshot,
        action: typeof entry.action === 'string' && entry.action.trim() ? entry.action.trim() : 'Edit',
        textDetections: Array.isArray(entry.textDetections) ? cloneTextDetectionsSnapshot(entry.textDetections) : null,
        textSelectionIndex: Number.isInteger(entry.textSelectionIndex) ? entry.textSelectionIndex : -1
      };
    }

    async function restoreFromHistoryEntry(imgState, entry) {
      const normalized = readHistoryEntry(entry);
      if (!normalized) return null;
      await restoreFromDataUrl(imgState, normalized.snapshot);
      if (Array.isArray(normalized.textDetections)) {
        imgState.textDetections = cloneTextDetectionsSnapshot(normalized.textDetections);
      } else {
        imgState.textDetections = [];
      }
      if (imgState === activeImage()) {
        if (imgState.textDetections.length === 0) {
          state.textSelectionIndex = -1;
        } else {
          state.textSelectionIndex = clamp(
            normalized.textSelectionIndex >= 0 ? normalized.textSelectionIndex : 0,
            0,
            imgState.textDetections.length - 1
          );
        }
      }
      return normalized;
    }

    function getHistoryEntryAction(entry) {
      const normalized = readHistoryEntry(entry);
      return normalized ? normalized.action : 'Edit';
    }

    function restoreFromDataUrl(imgState, dataUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          imgState.canvas.width = img.width;
          imgState.canvas.height = img.height;
          const ctx = imgState.canvas.getContext('2d');
          ctx.clearRect(0, 0, img.width, img.height);
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.src = dataUrl;
      });
    }

    function pushHistory(imgState, action = 'Edit') {
      if (!imgState) return;
      imgState.history.push(createHistoryEntry(imgState, action));
      if (imgState.history.length > HISTORY_LIMIT) imgState.history.shift();
      imgState.future.length = 0;
    }

    function updateUndoRedoState() {
      const img = activeImage();
      const undoCount = img ? img.history.length : 0;
      const redoCount = img ? img.future.length : 0;
      const canUndo = undoCount > 0;
      const canRedo = redoCount > 0;
      const nextUndoAction = canUndo ? getHistoryEntryAction(img.history[img.history.length - 1]) : '';
      const nextRedoAction = canRedo ? getHistoryEntryAction(img.future[img.future.length - 1]) : '';
      const applyHistoryButtonState = (button, enabled, count, action, label) => {
        if (!button) return;
        button.disabled = !enabled;
        button.dataset.count = enabled ? String(Math.min(count, 99)) : '';
        button.title = enabled ? `${label}: ${action}` : label;
        button.setAttribute('aria-label', enabled
          ? `${label}. ${count} step${count > 1 ? 's' : ''} available. Next action: ${action}.`
          : `${label} unavailable`);
      };
      applyHistoryButtonState(dom.undoBtn, canUndo, undoCount, nextUndoAction, 'Undo');
      applyHistoryButtonState(dom.redoBtn, canRedo, redoCount, nextRedoAction, 'Redo');
      applyHistoryButtonState(dom.floatingUndoBtn, canUndo, undoCount, nextUndoAction, 'Undo');
      applyHistoryButtonState(dom.floatingRedoBtn, canRedo, redoCount, nextRedoAction, 'Redo');
      updateActionAvailability();
    }

    function syncInputsFromImage() {
      const img = activeImage();
      if (!img) return;
      dom.widthInput.value = img.canvas.width;
      dom.heightInput.value = img.canvas.height;
      dom.renameInput.value = img.name;
      ensureImageAdjustmentModel(img);
      if (img.adjustmentStack.length === 0) {
        state.adjustmentStepSelectionIndex = -1;
      } else if (state.adjustmentStepSelectionIndex < 0 || state.adjustmentStepSelectionIndex >= img.adjustmentStack.length) {
        state.adjustmentStepSelectionIndex = img.adjustmentStack.length - 1;
      }
      renderAdjustmentStackList();
      syncTextEditPanel();
    }

    function sanitizeFileName(value) {
      const cleaned = String(value || '')
        .trim()
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ');
      return cleaned.slice(0, 120);
    }

    function applyRename(options = {}) {
      const { silent = false } = options;
      const img = activeImage();
      if (!img) return;
      const nextName = sanitizeFileName(dom.renameInput.value);
      if (!nextName) {
        dom.renameInput.value = img.name;
        if (!silent) {
          setStatus('File name cannot be empty');
        }
        return;
      }
      if (nextName === img.name) return;
      img.name = nextName;
      if (!silent) {
        requestThumbnailsRender(true);
      }
      if (!silent) {
        setStatus(`File name set to ${img.name}`);
      }
      if (shouldRenderBulkPanelNow()) {
        renderBulkFilesPanel();
      }
      updateExportSummary();
      scheduleSessionAutosave();
    }


    function updateLargeImageBadge(img = activeImage()) {
      if (!dom.largeImageBadge) return;
      if (!img || !img.largeImage) {
        dom.largeImageBadge.hidden = true;
        dom.largeImageBadge.textContent = '';
        return;
      }
      const pixels = img.pixelCount || (img.canvas.width * img.canvas.height);
      const megaPixels = pixels / 1000000;
      dom.largeImageBadge.hidden = false;
      dom.largeImageBadge.textContent = `Large Image Mode • ${megaPixels.toFixed(1)} MP • Render budget active`;
    }

    function updateLiveImageInfo() {
      const img = activeImage();
      if (!img) {
        dom.liveImageInfo.textContent = '';
        dom.liveImageInfo.style.display = 'none';
        dom.exportSizeInfo.textContent = 'Estimated size: --';
        updateLargeImageBadge(null);
        return;
      }
      const optimizedTag = img.wasDownscaledOnImport
        ? ` | Optimized from ${img.sourceWidth}x${img.sourceHeight}`
        : '';
      const compareTag = state.comparePreviewActive ? ' | Comparing original' : '';
      const splitTag = state.splitCompareActive ? ` | Split ${state.splitComparePosition}%` : '';
      const largeTag = img.largeImage ? ' | Large image mode' : '';
      dom.liveImageInfo.textContent = `${img.canvas.width}x${img.canvas.height} | Source ${img.sizeKB} KB${optimizedTag}${largeTag}${compareTag}${splitTag}`;
      dom.liveImageInfo.style.display = 'inline-flex';
      updateLargeImageBadge(img);
    }

    async function updateExportSizeEstimate() {
      if (!dom.exportSheet.classList.contains('active')) {
        updateExportSummary();
        return;
      }
      const img = activeImage();
      if (!img) {
        setExportSavings(0, 0);
        updateExportSummary();
        return;
      }

      if (state.exportMode === 'bulk') {
        setExportSavings(0, 0);
        if (dom.exportSavingsText) {
          dom.exportSavingsText.textContent = 'Size saving comparison appears after bulk export.';
        }
      }

      const token = ++exportEstimateToken;
      const requestedType = getExportFormat();
      const quality = getQuality();

      try {
        if (requestedType === 'application/pdf') {
          const pdfBlob = await exportCanvasToPdfBlob(img.canvas, quality);
          if (!pdfBlob || token !== exportEstimateToken) return;
          dom.exportSizeInfo.textContent = `Estimated size: ${formatBytes(pdfBlob.size)} (PDF)`;
          if (state.exportMode === 'single') {
            setExportSavings(getOriginalBytesForImage(img), pdfBlob.size);
          }
          updateExportSummary();
          return;
        }

        const { blob, actualType } = await exportCanvasToBlob(img.canvas, requestedType, quality);
        if (!blob || token !== exportEstimateToken) return;
        dom.exportSizeInfo.textContent = `Estimated size: ${formatBytes(blob.size)} (${extensionForType(actualType).toUpperCase()})`;
        if (state.exportMode === 'single') {
          setExportSavings(getOriginalBytesForImage(img), blob.size);
        }
        updateExportSummary();
      } catch (error) {
        console.error('Failed to estimate export size:', error);
        dom.exportSizeInfo.textContent = 'Estimated size: unavailable';
        updateExportSummary();
      }
    }

    function renderThumbnails() {
      dom.thumbs.innerHTML = '';
      dom.countInfo.textContent = `${state.images.length} / ${MAX_FILES}`;
      if (dom.showUploadsCount) {
        dom.showUploadsCount.textContent = String(state.images.length);
      }
      if (dom.showUploadsBtn) {
        const plural = state.images.length === 1 ? '' : 's';
        dom.showUploadsBtn.setAttribute('aria-label', `Show uploads panel (${state.images.length} image${plural})`);
      }

      thumbHydrateToken += 1;
      if (thumbHydrateFrameId) {
        cancelAnimationFrame(thumbHydrateFrameId);
        thumbHydrateFrameId = null;
      }
      pendingThumbHydration = [];
      const activeIndex = state.selectedIndex;

      state.images.forEach((img, index) => {
        const node = document.createElement('div');
        node.className = `thumb${index === state.selectedIndex ? ' active' : ''}`;
        node.innerHTML = `
          <img alt="${img.name}" loading="lazy" decoding="async">
          <div class="thumb-meta">
            <div class="thumb-name">${img.name}</div>
            <div class="thumb-size">${img.sizeKB} KB <span class="thumb-dirty${img.dirty ? ' active' : ''}">Edited</span></div>
          </div>
          <button class="x-btn" title="Remove image">×</button>
        `;

        const thumbImageEl = node.querySelector('img');
        if (thumbImageEl) {
          if (img.thumbRevision === img.revision && img.thumbDataUrl) {
            thumbImageEl.src = img.thumbDataUrl;
          } else if (index === activeIndex) {
            thumbImageEl.src = getThumbnailDataUrl(img);
          } else {
            pendingThumbHydration.push({ imgState: img, imgEl: thumbImageEl });
          }
        }

        node.addEventListener('click', (e) => {
          if (e.target.classList.contains('x-btn')) return;
          selectImage(index);
        });

        node.querySelector('.x-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          removeImage(index);
        });

        dom.thumbs.appendChild(node);
      });

      scheduleThumbHydration();

      dom.downloadAllBtn.disabled = state.images.length === 0;
      if (shouldRenderBulkPanelNow()) {
        renderBulkFilesPanel();
      }
      updateActionAvailability();
    }

    function selectImage(index) {
      if (!state.images[index]) return;
      clearAdjustmentPreview();
      resetViewport();
      state.selectedIndex = index;
      state.cropRect = null;
      state.textSelectionIndex = -1;
      syncInputsFromImage();
      requestThumbnailsRender(true);
      renderCanvas();
      updateUndoRedoState();
      setStatus(`Selected: ${state.images[index].name}`);
      updateExportSizeEstimate();
      updateExportSummary();
      if (shouldRenderBulkPanelNow()) {
        renderBulkFilesPanel();
      }
      updateActionAvailability();
      scheduleSessionAutosave();
    }

    function removeImage(index) {
      const img = state.images[index];
      if (!img) return;
      clearAdjustmentPreview();
      delete state.bulkFormatOverrides[img.id];
      state.images.splice(index, 1);

      if (state.images.length === 0) {
        state.selectedIndex = -1;
        state.textSelectionIndex = -1;
        requestThumbnailsRender(true);
        renderCanvas();
        setStatus('No image selected');
        updateLiveImageInfo();
        setExportSavings(0, 0);
        updateExportSummary();
        renderBulkFilesPanel();
        updateActionAvailability();
        scheduleSessionAutosave({ immediate: true });
        return;
      }

      if (index <= state.selectedIndex) {
        state.selectedIndex = Math.max(0, state.selectedIndex - 1);
      }
      state.textSelectionIndex = -1;

      requestThumbnailsRender(true);
      syncInputsFromImage();
      renderCanvas();
      updateUndoRedoState();
      updateLiveImageInfo();
      updateExportSummary();
      if (shouldRenderBulkPanelNow()) {
        renderBulkFilesPanel();
      }
      updateActionAvailability();
      scheduleSessionAutosave({ immediate: true });
    }

    function shouldUseStrictRenderBudget() {
      const img = activeImage();
      return !!(img && img.largeImage);
    }

    function scheduleBudgetedRender() {
      const budget = state.renderBudget;
      budget.pending = true;
      if (budget.scheduled) return;
      budget.scheduled = true;

      const runRender = () => {
        budget.timerId = 0;
        budget.scheduled = false;
        if (!budget.pending) return;
        budget.pending = false;
        renderCanvasNow();
        budget.lastRenderTs = performance.now();
        if (budget.pending) {
          scheduleBudgetedRender();
        }
      };

      const elapsed = performance.now() - budget.lastRenderTs;
      const wait = Math.max(0, budget.minIntervalMs - elapsed);
      if (wait > 0) {
        budget.timerId = window.setTimeout(() => {
          requestAnimationFrame(runRender);
        }, wait);
        return;
      }
      requestAnimationFrame(runRender);
    }

    function renderCanvas(options = {}) {
      const force = !!(options && options.force);
      if (!force && shouldUseStrictRenderBudget()) {
        scheduleBudgetedRender();
        return;
      }
      const budget = state.renderBudget;
      budget.pending = false;
      if (budget.timerId) {
        clearTimeout(budget.timerId);
        budget.timerId = 0;
      }
      budget.scheduled = false;
      renderCanvasNow();
      budget.lastRenderTs = performance.now();
    }

    function renderCanvasNow() {
      const img = activeImage();
      if (!img) {
        state.comparePreviewActive = false;
        resetViewport();
        dom.appRoot.classList.add('empty-launch');
        dom.appRoot.classList.remove('compare-active');
        dom.appRoot.classList.remove('split-compare-active');
        dom.appRoot.classList.remove('large-image-mode');
        dom.canvas.style.display = 'none';
        dom.emptyState.style.display = 'block';
        dom.cropTip.style.display = 'none';
        if (dom.compareTools) {
          dom.compareTools.classList.toggle('split-active', !!state.splitCompareActive);
        }
        if (dom.toggleSplitCompareBtn) {
          dom.toggleSplitCompareBtn.classList.toggle('active', !!state.splitCompareActive);
          dom.toggleSplitCompareBtn.setAttribute('aria-pressed', state.splitCompareActive ? 'true' : 'false');
        }
        hideTextQuickEditor();
        dom.renameInput.value = '';
        state.textSelectionIndex = -1;
        syncTextEditPanel();
        updateLiveImageInfo();
        return;
      }

      const sourceCanvas = getRenderSourceCanvas();
      const editedCanvas = getEditedRenderCanvas();
      const splitActive = !!(state.splitCompareActive && !state.comparePreviewActive && img.originalCanvas && editedCanvas);

      dom.canvas.width = sourceCanvas.width;
      dom.canvas.height = sourceCanvas.height;
      const ctx = dom.canvas.getContext('2d');
      ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
      if (splitActive) {
        const splitX = getSplitCompareX(dom.canvas.width);
        ctx.drawImage(editedCanvas, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, dom.canvas.height);
        ctx.clip();
        ctx.drawImage(img.originalCanvas, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(splitX + 0.5, 0);
        ctx.lineTo(splitX + 0.5, dom.canvas.height);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        const label = 'Before | After';
        const labelWidth = ctx.measureText(label).width + 18;
        const labelX = clamp(splitX - Math.round(labelWidth / 2), 8, Math.max(8, dom.canvas.width - labelWidth - 8));
        const labelY = 10;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, 24, 999);
          ctx.fill();
        } else {
          ctx.fillRect(labelX, labelY, labelWidth, 24);
        }
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
        ctx.fillText(label, labelX + 9, labelY + 16);
        ctx.restore();
      } else {
        ctx.drawImage(sourceCanvas, 0, 0);
      }

      if (state.cropRect && !state.comparePreviewActive) {
        const r = normalizeCropRect(state.cropRect);
        state.cropRect = r;
        drawCropOverlay(ctx, r);
      }

      if (!state.comparePreviewActive) {
        drawTextDetections(ctx);
      }

      dom.emptyState.style.display = 'none';
      dom.appRoot.classList.remove('empty-launch');
      dom.appRoot.classList.toggle('compare-active', state.comparePreviewActive);
      dom.appRoot.classList.toggle('split-compare-active', splitActive);
      dom.appRoot.classList.toggle('large-image-mode', !!img.largeImage);
      if (dom.compareTools) {
        dom.compareTools.classList.toggle('split-active', !!state.splitCompareActive);
      }
      if (dom.toggleSplitCompareBtn) {
        dom.toggleSplitCompareBtn.classList.toggle('active', !!state.splitCompareActive);
        dom.toggleSplitCompareBtn.setAttribute('aria-pressed', state.splitCompareActive ? 'true' : 'false');
      }
      dom.canvas.style.display = 'block';
      updateCanvasCursor();
      applyCanvasViewport();
      dom.cropTip.style.display = (state.tool === 'crop' && !state.comparePreviewActive) ? 'block' : 'none';
      syncTextQuickEditor();
      syncMobileAdjustOverlay();
      updateLiveImageInfo();
    }

    function getCanvasCoords(evt) {
      const rect = dom.canvas.getBoundingClientRect();
      const x = (evt.clientX - rect.left) * (dom.canvas.width / rect.width);
      const y = (evt.clientY - rect.top) * (dom.canvas.height / rect.height);
      return { x, y };
    }

    function normalizeCropRect(rect) {
      if (!rect) return null;
      const x = Math.min(rect.x, rect.x + rect.w);
      const y = Math.min(rect.y, rect.y + rect.h);
      const w = Math.abs(rect.w);
      const h = Math.abs(rect.h);
      return { x, y, w, h };
    }

    function drawCropOverlay(ctx, rect) {
      const r = normalizeCropRect(rect);
      if (!r) return;
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.28)';
      ctx.beginPath();
      ctx.rect(0, 0, dom.canvas.width, dom.canvas.height);
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill('evenodd');

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([]);

      const thirdX = r.w / 3;
      const thirdY = r.h / 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i += 1) {
        const x = r.x + thirdX * i;
        const y = r.y + thirdY * i;
        ctx.beginPath();
        ctx.moveTo(x, r.y);
        ctx.lineTo(x, r.y + r.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r.x, y);
        ctx.lineTo(r.x + r.w, y);
        ctx.stroke();
      }

      const handleRadius = Math.max(5, Math.min(12, 9 / Math.max(0.7, state.viewport.zoom)));
      const points = [
        { x: r.x, y: r.y },
        { x: r.x + r.w / 2, y: r.y },
        { x: r.x + r.w, y: r.y },
        { x: r.x, y: r.y + r.h / 2 },
        { x: r.x + r.w, y: r.y + r.h / 2 },
        { x: r.x, y: r.y + r.h },
        { x: r.x + r.w / 2, y: r.y + r.h },
        { x: r.x + r.w, y: r.y + r.h }
      ];
      points.forEach((p) => {
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.arc(p.x, p.y, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      const cropLabel = `${Math.max(1, Math.round(r.w))} x ${Math.max(1, Math.round(r.h))}`;
      ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
      const labelPadX = 8;
      const labelPadY = 6;
      const textWidth = ctx.measureText(cropLabel).width;
      const labelWidth = textWidth + labelPadX * 2;
      const labelHeight = 24;
      const labelX = Math.max(8, Math.min(r.x, dom.canvas.width - labelWidth - 8));
      const labelY = Math.max(8, r.y - labelHeight - 6);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.lineWidth = 1;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 999);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
        ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
      }
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(cropLabel, labelX + labelPadX, labelY + labelPadY + 10);
      ctx.restore();
    }

    function getCropHandleAtPoint(point, rect) {
      if (!rect) return null;
      const r = normalizeCropRect(rect);
      const hitRadius = Math.max(10, Math.min(22, 18 / Math.max(0.7, state.viewport.zoom)));
      const handles = [
        { key: 'nw', x: r.x, y: r.y },
        { key: 'n', x: r.x + r.w / 2, y: r.y },
        { key: 'ne', x: r.x + r.w, y: r.y },
        { key: 'w', x: r.x, y: r.y + r.h / 2 },
        { key: 'e', x: r.x + r.w, y: r.y + r.h / 2 },
        { key: 'sw', x: r.x, y: r.y + r.h },
        { key: 's', x: r.x + r.w / 2, y: r.y + r.h },
        { key: 'se', x: r.x + r.w, y: r.y + r.h }
      ];
      const found = handles.find((h) => Math.hypot(point.x - h.x, point.y - h.y) <= hitRadius);
      return found ? found.key : null;
    }

    function getCropCursorAtPoint(point, rect) {
      const handle = getCropHandleAtPoint(point, rect);
      if (handle) {
        if (handle === 'nw' || handle === 'se') return 'nwse-resize';
        if (handle === 'ne' || handle === 'sw') return 'nesw-resize';
        if (handle === 'n' || handle === 's') return 'ns-resize';
        if (handle === 'e' || handle === 'w') return 'ew-resize';
      }
      if (isPointInsideCropRect(point, rect)) return 'move';
      return 'crosshair';
    }

    function updateCropCursor(point) {
      if (state.tool !== 'crop') return;
      dom.canvas.style.cursor = getCropCursorAtPoint(point, state.cropRect);
    }

    function isPointInsideCropRect(point, rect) {
      if (!rect) return false;
      const r = normalizeCropRect(rect);
      return point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h;
    }

    function clampCropRectToCanvas(rect) {
      const r = normalizeCropRect(rect);
      if (!r) return null;
      const x = clamp(r.x, 0, Math.max(0, dom.canvas.width - 1));
      const y = clamp(r.y, 0, Math.max(0, dom.canvas.height - 1));
      const maxW = Math.max(1, dom.canvas.width - x);
      const maxH = Math.max(1, dom.canvas.height - y);
      const w = clamp(r.w, 1, maxW);
      const h = clamp(r.h, 1, maxH);
      return { x, y, w, h };
    }

    function getCropRatioValue() {
      const raw = (dom.cropRatioInput && dom.cropRatioInput.value) || state.cropRatio || 'free';
      if (raw === 'free') return null;
      const parts = raw.split(':').map((value) => parseFloat(value));
      if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) || parts[0] <= 0 || parts[1] <= 0) {
        return null;
      }
      return parts[0] / parts[1];
    }

    function setCropRatioValue(ratioLabel) {
      const allowed = Array.from(dom.cropRatioInput.options || []).some((option) => option.value === ratioLabel);
      const next = allowed ? ratioLabel : 'free';
      state.cropRatio = next;
      dom.cropRatioInput.value = next;
      localStorage.setItem('liteedit_crop_ratio', next);
    }

    function createCenteredCropRect(width, height, ratio) {
      if (!ratio || !Number.isFinite(ratio) || ratio <= 0) {
        return { x: 0, y: 0, w: width, h: height };
      }
      let cropW = width;
      let cropH = Math.round(cropW / ratio);
      if (cropH > height) {
        cropH = height;
        cropW = Math.round(cropH * ratio);
      }
      cropW = clamp(cropW, 1, width);
      cropH = clamp(cropH, 1, height);
      return {
        x: Math.max(0, Math.round((width - cropW) / 2)),
        y: Math.max(0, Math.round((height - cropH) / 2)),
        w: cropW,
        h: cropH
      };
    }

    function applyCropPreset() {
      const img = activeImage();
      const preset = (dom.cropPresetInput && dom.cropPresetInput.value) || 'free';
      setCropRatioValue(preset);
      if (!img) {
        setStatus(`Crop preset set to ${preset}`);
        return;
      }
      const ratio = getCropRatioValue();
      state.cropRect = createCenteredCropRect(img.canvas.width, img.canvas.height, ratio);
      setTool('crop');
      renderCanvas();
      syncCropActionButtons();
      setStatus(preset === 'free' ? 'Free crop enabled' : `Crop preset applied (${preset})`);
    }

    function applySocialPreset() {
      const presetKey = dom.socialPresetInput ? dom.socialPresetInput.value : 'none';
      if (!presetKey || presetKey === 'none' || !SOCIAL_PRESETS[presetKey]) {
        setStatus('Select a social preset first');
        return;
      }
      const preset = SOCIAL_PRESETS[presetKey];
      dom.widthInput.value = String(preset.width);
      dom.heightInput.value = String(preset.height);
      if (dom.keepAspect) {
        dom.keepAspect.checked = false;
      }
      if (preset.cropRatio) {
        setCropRatioValue(preset.cropRatio);
      }
      applyResize();
      setStatus(`Social preset applied: ${preset.width} x ${preset.height}`);
      showToast('Social preset applied.', 'success');
    }

    function applyAspectToDelta(dx, dy, ratio) {
      if (!ratio || !Number.isFinite(ratio)) return { dx, dy };
      const safeDx = Math.abs(dx) < 0.0001 ? (dx >= 0 ? 0.0001 : -0.0001) : dx;
      const safeDy = Math.abs(dy) < 0.0001 ? (dy >= 0 ? 0.0001 : -0.0001) : dy;
      const absDx = Math.abs(safeDx);
      const absDy = Math.abs(safeDy);
      let nextDx = safeDx;
      let nextDy = safeDy;
      if (absDx / absDy > ratio) {
        nextDy = Math.sign(safeDy) * (absDx / ratio);
      } else {
        nextDx = Math.sign(safeDx) * (absDy * ratio);
      }
      return { dx: nextDx, dy: nextDy };
    }

    function buildAspectRectFromAnchor(anchorX, anchorY, pointX, pointY, ratio) {
      const adjusted = applyAspectToDelta(pointX - anchorX, pointY - anchorY, ratio);
      return {
        x: Math.min(anchorX, anchorX + adjusted.dx),
        y: Math.min(anchorY, anchorY + adjusted.dy),
        w: Math.abs(adjusted.dx),
        h: Math.abs(adjusted.dy)
      };
    }

    function getToolLabel(toolName) {
      if (toolName === 'pen') return 'Pen';
      if (toolName === 'highlighter') return 'Highlighter';
      if (toolName === 'blur') return 'Blur brush';
      if (toolName === 'crop') return 'Crop';
      if (toolName === 'hand') return 'Pan';
      return 'Tool';
    }

    function setTool(nextTool, { showStatus = false } = {}) {
      const requestedTool = nextTool;
      let resolvedTool = nextTool;
      if (requestedTool === 'hand' && state.tool === 'hand') {
        resolvedTool = state.lastNonHandTool || 'pen';
      }

      state.tool = resolvedTool;
      if (resolvedTool !== 'hand') {
        state.lastNonHandTool = resolvedTool;
        if (state.canvasPan && state.canvasPan.active) {
          endCanvasPan();
        }
      }
      if (state.textAddPlacementActive && resolvedTool !== 'hand') {
        setTextAddPlacementActive(false);
      }
      state.cropRect = null;
      state.cropInteraction = null;
      dom.toolButtons.forEach((btn) => {
        const active = btn.dataset.tool === resolvedTool;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      const handToolBtn = dom.toolButtons.find((btn) => btn.dataset.tool === 'hand');
      if (handToolBtn) {
        const handActive = resolvedTool === 'hand';
        const handLabel = handActive
          ? 'Pan canvas active. Tap again to exit.'
          : 'Pan canvas (toggle)';
        handToolBtn.title = handLabel;
        handToolBtn.setAttribute('aria-label', handLabel);
      }
      dom.appRoot.classList.toggle('crop-tool-active', resolvedTool === 'crop');
      dom.appRoot.classList.toggle('draw-tool-idle', !(resolvedTool === 'pen' || resolvedTool === 'highlighter' || resolvedTool === 'blur'));
      dom.appRoot.classList.toggle('draw-tool-blur', resolvedTool === 'blur');
      dom.appRoot.classList.toggle('hand-tool-active', resolvedTool === 'hand');

       const preset = TOOL_PRESETS[resolvedTool];
       if (preset) {
        if (dom.brushSize) {
          dom.brushSize.value = String(preset.size);
          dom.brushSizeVal.textContent = String(preset.size);
        }
        if (dom.blurStrength) {
          dom.blurStrength.value = String(preset.opacity);
          dom.blurStrengthVal.textContent = `${preset.opacity}%`;
        }
        if (resolvedTool === 'pen') {
          state.penColor = state.penColor || preset.color;
          localStorage.setItem('liteedit_pen_color', state.penColor);
        } else if (resolvedTool === 'highlighter') {
          state.highlighterColor = state.highlighterColor || preset.color;
          localStorage.setItem('liteedit_highlighter_color', state.highlighterColor);
        }
      }

      if (dom.highlighterColorInput) {
        if (resolvedTool === 'pen') {
          dom.highlighterColorInput.value = state.penColor;
        } else if (resolvedTool === 'highlighter') {
          dom.highlighterColorInput.value = state.highlighterColor;
        } else if (resolvedTool === 'blur') {
          dom.highlighterColorInput.value = state.penColor;
        }
      }
      updateCanvasCursor();
      dom.cropTip.style.display = resolvedTool === 'crop' ? 'block' : 'none';
      updateActionAvailability();
      syncCropActionButtons();
      renderCanvas();
      if (showStatus) {
        if (requestedTool === 'hand' && resolvedTool !== 'hand') {
          setStatus('Pan mode off');
        } else if (resolvedTool === 'hand') {
          setStatus(canPanCanvas()
            ? 'Pan mode on. Drag the image. Tap hand again to exit.'
            : 'Pan mode selected. Zoom in to drag, tap hand again to exit.');
        } else {
          setStatus(`${getToolLabel(resolvedTool)} tool selected`);
        }
      }
    }

    function blurBrush(imgState, cx, cy, radius, strength) {
      if (!canvasToolsModule || typeof canvasToolsModule.blurBrushOnCanvas !== 'function') return;
      canvasToolsModule.blurBrushOnCanvas(imgState.canvas, cx, cy, radius, strength);
    }

    function blurBrushStroke(imgState, from, to, radius, strength) {
      if (!imgState || !from || !to) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (!Number.isFinite(distance) || distance <= 0.001) {
        blurBrush(imgState, to.x, to.y, radius, strength);
        return;
      }
      const step = Math.max(1, radius * 0.25);
      const segments = Math.max(1, Math.ceil(distance / step));
      for (let i = 1; i <= segments; i += 1) {
        const t = i / segments;
        const x = from.x + dx * t;
        const y = from.y + dy * t;
        blurBrush(imgState, x, y, radius, strength);
      }
    }

    function drawStroke(imgState, from, to, mode) {
      const size = parseInt(dom.brushSize.value, 10);
      if (!canvasToolsModule || typeof canvasToolsModule.drawStrokeOnCanvas !== 'function') return;
      const opacityValue = parseInt(dom.blurStrength.value, 10);
      const penAlpha = clamp(
        Number.isFinite(opacityValue) ? opacityValue / 100 : 1,
        0.1,
        1
      );
      const highlighterAlpha = clamp(
        Number.isFinite(opacityValue) ? opacityValue / 100 : 0.35,
        0.1,
        0.85
      );
      canvasToolsModule.drawStrokeOnCanvas(imgState.canvas, from, to, mode, size, {
        penColor: state.penColor,
        penAlpha,
        highlighterColor: state.highlighterColor,
        highlighterAlpha
      });
    }

    function resolveResizeMethod() {
      const method = dom.resizeMethodInput ? dom.resizeMethodInput.value : state.resizeMethod;
      if (method === 'triangle' || method === 'mitchell' || method === 'pixelated') return method;
      return 'lanczos3';
    }

    function resolveResizeFitMethod() {
      const fit = dom.resizeFitInput ? dom.resizeFitInput.value : state.resizeFitMethod;
      return fit === 'contain' ? 'contain' : 'stretch';
    }

    function configureResizeQuality(ctx, method) {
      if (method === 'pixelated') {
        ctx.imageSmoothingEnabled = false;
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = method === 'triangle'
        ? 'low'
        : method === 'mitchell'
          ? 'medium'
          : 'high';
    }

    function progressiveDownscale(sourceCanvas, targetW, targetH, method) {
      if (method === 'pixelated') return sourceCanvas;
      let current = sourceCanvas;
      let currentW = sourceCanvas.width;
      let currentH = sourceCanvas.height;

      const needsDownscale = targetW < currentW || targetH < currentH;
      if (!needsDownscale) return sourceCanvas;

      while (currentW * 0.5 > targetW && currentH * 0.5 > targetH) {
        const nextW = Math.max(targetW, Math.floor(currentW * 0.5));
        const nextH = Math.max(targetH, Math.floor(currentH * 0.5));
        const step = document.createElement('canvas');
        step.width = nextW;
        step.height = nextH;
        const stepCtx = step.getContext('2d');
        configureResizeQuality(stepCtx, method);
        stepCtx.drawImage(current, 0, 0, currentW, currentH, 0, 0, nextW, nextH);
        current = step;
        currentW = nextW;
        currentH = nextH;
      }

      return current;
    }

    function buildResizedCanvas(sourceCanvas, targetW, targetH, method, fitMethod) {
      const resized = document.createElement('canvas');
      resized.width = targetW;
      resized.height = targetH;
      const ctx = resized.getContext('2d');
      configureResizeQuality(ctx, method);

      if (fitMethod === 'contain') {
        const scale = Math.min(targetW / sourceCanvas.width, targetH / sourceCanvas.height);
        const drawW = Math.max(1, Math.round(sourceCanvas.width * scale));
        const drawH = Math.max(1, Math.round(sourceCanvas.height * scale));
        const dx = Math.round((targetW - drawW) / 2);
        const dy = Math.round((targetH - drawH) / 2);
        const scaledSource = progressiveDownscale(sourceCanvas, drawW, drawH, method);
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(
          scaledSource,
          0,
          0,
          scaledSource.width,
          scaledSource.height,
          dx,
          dy,
          drawW,
          drawH
        );
        return resized;
      }

      const scaledSource = progressiveDownscale(sourceCanvas, targetW, targetH, method);
      ctx.drawImage(
        scaledSource,
        0,
        0,
        scaledSource.width,
        scaledSource.height,
        0,
        0,
        targetW,
        targetH
      );
      return resized;
    }

    function applyResize() {
      const img = activeImage();
      if (!img) return;

      const nextW = Math.max(1, parseInt(dom.widthInput.value, 10) || img.canvas.width);
      const nextH = Math.max(1, parseInt(dom.heightInput.value, 10) || img.canvas.height);
      const resizeMethod = resolveResizeMethod();
      const fitMethod = resolveResizeFitMethod();

      if (nextW === img.canvas.width && nextH === img.canvas.height && fitMethod === 'stretch') return;

      prepareForDirectCanvasEdit(img);
      pushHistory(img);
      img.canvas = buildResizedCanvas(img.canvas, nextW, nextH, resizeMethod, fitMethod);
      markImageModified(img);
      clearTextDetectionsForImage(img, { silent: true });
      renderCanvas();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      setStatus(`Resized to ${nextW} x ${nextH} (${resizeMethod}, ${fitMethod})`);
      updateExportSizeEstimate();
    }

    function applyResizeToAll() {
      if (state.images.length === 0) return;
      const nextW = Math.max(1, parseInt(dom.widthInput.value, 10) || activeImage().canvas.width);
      const nextH = Math.max(1, parseInt(dom.heightInput.value, 10) || activeImage().canvas.height);
      const resizeMethod = resolveResizeMethod();
      const fitMethod = resolveResizeFitMethod();
      let changed = 0;

      state.images.forEach((img) => {
        if (nextW === img.canvas.width && nextH === img.canvas.height && fitMethod === 'stretch') {
          return;
        }
        prepareForDirectCanvasEdit(img);
        pushHistory(img);
        img.canvas = buildResizedCanvas(img.canvas, nextW, nextH, resizeMethod, fitMethod);
        markImageModified(img);
        clearTextDetectionsForImage(img, { silent: true });
        changed += 1;
      });

      if (changed === 0) {
        setStatus('Resize all skipped (same dimensions).');
        return;
      }

      syncInputsFromImage();
      renderCanvas();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      setStatus(`Resized ${changed} image${changed > 1 ? 's' : ''} to ${nextW} x ${nextH}`);
      showToast(`Resize applied to ${changed} image${changed > 1 ? 's' : ''}.`, 'success');
      updateExportSizeEstimate();
    }

    function applyAdjustments() {
      clearAdjustmentPreview();
      const img = activeImage();
      if (!img) return;
      appendAdjustmentStepToImage(img, getAdjustmentValues());
    }

    function applyAdjustmentsToAll() {
      if (state.images.length === 0) return;
      const values = normalizeAdjustmentStep(getAdjustmentValues());
      if (isNeutralAdjustmentStep(values)) {
        showToast('Adjustment step skipped (no visual change).', 'info');
        return;
      }
      let changed = 0;
      state.images.forEach((img) => {
        ensureImageAdjustmentModel(img);
        if (!img.adjustmentBaseCanvas) {
          img.adjustmentBaseCanvas = cloneCanvas(img.canvas);
        }
        pushHistory(img);
        img.adjustmentStack.push(cloneAdjustmentStep(values));
        rebuildCanvasFromAdjustmentStack(img);
        clearTextDetectionsForImage(img, { silent: true });
        changed += 1;
      });
      state.adjustmentStepSelectionIndex = activeImage() && activeImage().adjustmentStack
        ? activeImage().adjustmentStack.length - 1
        : -1;
      renderCanvas();
      renderAdjustmentStackList();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      setStatus(`Applied adjustments to ${changed} image${changed > 1 ? 's' : ''}`);
      showToast(`Adjustments applied to ${changed} image${changed > 1 ? 's' : ''}.`, 'success');
      updateExportSizeEstimate();
    }


    function estimateImageToneMetrics(canvas) {
      const sampleMax = 220;
      const sampleScale = Math.min(1, sampleMax / Math.max(canvas.width, canvas.height));
      const sampleW = Math.max(24, Math.round(canvas.width * sampleScale));
      const sampleH = Math.max(24, Math.round(canvas.height * sampleScale));
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = sampleW;
      sampleCanvas.height = sampleH;
      const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(canvas, 0, 0, sampleW, sampleH);
      const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
      const total = sampleW * sampleH;
      if (!total) return null;

      let sumLum = 0;
      let sumLumSq = 0;
      let sumSat = 0;
      let deepShadowCount = 0;
      let strongHighlightCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sumLum += lum;
        sumLumSq += lum * lum;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        sumSat += sat;

        if (lum < 32) deepShadowCount += 1;
        if (lum > 225) strongHighlightCount += 1;
      }

      const avgLum = sumLum / total;
      const variance = Math.max(0, sumLumSq / total - avgLum * avgLum);
      const contrastStd = Math.sqrt(variance);
      const avgSat = sumSat / total;
      return {
        avgLum,
        contrastStd,
        avgSat,
        shadowRatio: deepShadowCount / total,
        highlightRatio: strongHighlightCount / total
      };
    }

    function computeAdaptiveQuickAdjustments(canvas) {
      const metrics = estimateImageToneMetrics(canvas);
      if (!metrics) {
        return {
          brightness: 106,
          contrast: 112,
          saturation: 106,
          globalBlur: 0
        };
      }

      const targetLum = 132;
      const targetContrast = 58;
      const brightness = 100
        + (targetLum - metrics.avgLum) * 0.28
        + (metrics.shadowRatio - 0.2) * 12
        - (metrics.highlightRatio - 0.18) * 18;
      const contrast = 100
        + (targetContrast - metrics.contrastStd) * 0.78
        + (metrics.shadowRatio + metrics.highlightRatio - 0.36) * 14;
      const saturation = 100
        + (0.34 - metrics.avgSat) * 48
        + (metrics.avgLum < 92 ? 5 : 0)
        - (metrics.highlightRatio > 0.28 ? 4 : 0);

      return {
        brightness: Math.round(clamp(brightness, 84, 124)),
        contrast: Math.round(clamp(contrast, 92, 136)),
        saturation: Math.round(clamp(saturation, 92, 134)),
        globalBlur: 0
      };
    }

    function applyQuickAutoEnhance() {
      const img = activeImage();
      if (!img) return;
      const next = computeAdaptiveQuickAdjustments(img.canvas);
      dom.brightnessInput.value = next.brightness;
      dom.contrastInput.value = next.contrast;
      dom.saturationInput.value = next.saturation;
      dom.globalBlurInput.value = next.globalBlur;
      applyAdjustments();
      setStatus('Quick auto enhance applied');
    }

    function resetQuickAdjustments() {
      const img = activeImage();
      dom.brightnessInput.value = 100;
      dom.contrastInput.value = 100;
      dom.saturationInput.value = 100;
      dom.globalBlurInput.value = 0;
      clearAdjustmentPreview();
      if (!img) {
        renderCanvas();
        updateExportSizeEstimate();
        setStatus('Quick adjustments reset');
        return;
      }
      resetToOriginal();
      setStatus('Quick reset applied');
    }

    function rotateImage(direction) {
      const img = activeImage();
      if (!img) return;

      prepareForDirectCanvasEdit(img);
      pushHistory(img);
      const src = img.canvas;
      const next = document.createElement('canvas');
      next.width = src.height;
      next.height = src.width;
      const ctx = next.getContext('2d');
      ctx.translate(next.width / 2, next.height / 2);
      ctx.rotate(direction * Math.PI / 2);
      ctx.drawImage(src, -src.width / 2, -src.height / 2);
      img.canvas = next;
      markImageModified(img);
      clearTextDetectionsForImage(img, { silent: true });
      syncInputsFromImage();
      renderCanvas();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      setStatus(direction > 0 ? 'Rotated right' : 'Rotated left');
      updateExportSizeEstimate();
    }

    function flipImage(horizontal) {
      const img = activeImage();
      if (!img) return;

      prepareForDirectCanvasEdit(img);
      pushHistory(img);
      const src = img.canvas;
      const next = document.createElement('canvas');
      next.width = src.width;
      next.height = src.height;
      const ctx = next.getContext('2d');
      if (horizontal) {
        ctx.translate(src.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, src.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(src, 0, 0);
      img.canvas = next;
      markImageModified(img);
      clearTextDetectionsForImage(img, { silent: true });
      renderCanvas();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      setStatus(horizontal ? 'Flipped horizontal' : 'Flipped vertical');
      updateExportSizeEstimate();
    }

    function resetToOriginal() {
      const img = activeImage();
      if (!img) return;
      prepareForDirectCanvasEdit(img);
      pushHistory(img);
      img.canvas = cloneCanvas(img.originalCanvas);
      img.dirty = false;
      img.revision += 1;
      img.thumbRevision = -1;
      clearTextDetectionsForImage(img, { silent: true });
      syncInputsFromImage();
      renderCanvas();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      setStatus('Reset to original image');
      updateExportSizeEstimate();
      scheduleSessionAutosave();
    }

    function applyCropFromRect() {
      const img = activeImage();
      if (!img || !state.cropRect) {
        cancelCropSelection({ silent: true });
        return;
      }

      state.cropRect = clampCropRectToCanvas(state.cropRect);
      const { x, y, w, h } = state.cropRect;
      if (w < 3 || h < 3) {
        cancelCropSelection({ silent: true });
        return;
      }
      if (!canvasToolsModule || typeof canvasToolsModule.cropCanvas !== 'function') {
        setStatus('Crop tool unavailable. Reload and try again.');
        cancelCropSelection({ silent: true });
        return;
      }

      prepareForDirectCanvasEdit(img);
      pushHistory(img);
      const cropped = canvasToolsModule.cropCanvas(img.canvas, { x, y, w, h });
      img.canvas = cropped;
      markImageModified(img);
      clearTextDetectionsForImage(img, { silent: true });
      cancelCropSelection({ silent: true });
      syncInputsFromImage();
      renderCanvas();
      requestThumbnailsRender(true);
      updateUndoRedoState();
      setStatus('Crop applied');
      updateExportSizeEstimate();
      syncCropActionButtons();
    }

    function cancelCropSelection({ silent = false } = {}) {
      const wasCropTool = state.tool === 'crop';
      state.drawing = false;
      state.cropStart = null;
      state.cropInteraction = null;
      state.cropRect = null;
      if (wasCropTool) {
        setTool('pen');
      } else {
        renderCanvas();
        syncCropActionButtons();
      }
      if (!silent) {
        setStatus('Crop cancelled');
      }
    }

    async function undo() {
      const img = activeImage();
      if (!img || img.history.length === 0) return;
      clearAdjustmentPreview();
      const previous = img.history.pop();
      img.future.push(createHistoryEntry(img, getHistoryEntryAction(previous)));
      const restoredEntry = await restoreFromHistoryEntry(img, previous);
      invalidateAdjustmentStackForImage(img);
      refreshDirtyState(img);
      img.revision += 1;
      img.thumbRevision = -1;
      syncTextEditPanel({ preserveNoSelection: true });
      renderCanvas();
      requestThumbnailsRender(true);
      syncInputsFromImage();
      updateUndoRedoState();
      setStatus(`Undo complete${restoredEntry ? ` (${restoredEntry.action})` : ''}`);
      updateExportSizeEstimate();
      scheduleSessionAutosave();
    }

    async function redo() {
      const img = activeImage();
      if (!img || img.future.length === 0) return;
      clearAdjustmentPreview();
      const next = img.future.pop();
      img.history.push(createHistoryEntry(img, getHistoryEntryAction(next)));
      if (img.history.length > HISTORY_LIMIT) img.history.shift();
      const restoredEntry = await restoreFromHistoryEntry(img, next);
      invalidateAdjustmentStackForImage(img);
      refreshDirtyState(img);
      img.revision += 1;
      img.thumbRevision = -1;
      syncTextEditPanel({ preserveNoSelection: true });
      renderCanvas();
      requestThumbnailsRender(true);
      syncInputsFromImage();
      updateUndoRedoState();
      setStatus(`Redo complete${restoredEntry ? ` (${restoredEntry.action})` : ''}`);
      updateExportSizeEstimate();
      scheduleSessionAutosave();
    }

    function getExportController() {
      if (!exportController) {
        exportController = createExportController({
          state,
          dom,
          sanitizeFileName,
          getImageBaseName,
          getExportEngineModule: () => exportEngineModule
        });
      }
      return exportController;
    }

    function getExportFormat() {
      return getExportController().getExportFormat();
    }

    function getQuality() {
      return getExportController().getQuality();
    }

    function extensionForType(type) {
      return getExportController().extensionForType(type);
    }

    function buildFilename(name, type) {
      return getExportController().buildFilename(name, type);
    }

    async function exportCanvasToBlob(canvas, type, quality) {
      const engine = await ensureExportEngineLoaded();
      return engine.exportCanvasToBlob(canvas, type, quality);
    }

    async function exportCanvasToPdfBlob(canvas, quality) {
      const engine = await ensureExportEngineLoaded();
      return engine.exportCanvasToPdfBlob(canvas, quality);
    }

    async function exportAllToPdfBlob(images, quality, onProgress = null, shouldCancel = null) {
      const engine = await ensureExportEngineLoaded();
      return engine.exportAllToPdfBlob(images, quality, onProgress, shouldCancel);
    }

    async function saveExportBlob(blob, filename) {
      const engine = await ensureExportEngineLoaded();
      await engine.saveBlob(blob, filename);
    }

    async function downloadCurrent() {
      const img = activeImage();
      if (!img) return;
      const type = getExportFormat();
      const quality = getQuality();
      const stripMetadata = dom.stripMetaInput.checked;
      const originalBytes = getOriginalBytesForImage(img);
      dom.downloadBtn.disabled = true;

      try {
        if (type === 'application/pdf') {
          const pdfBlob = await exportCanvasToPdfBlob(img.canvas, quality);
          if (!pdfBlob) {
            if (exportQueue.cancelled) {
              setStatus('Export cancelled');
              showToast('Export cancelled.', 'info');
              return;
            }
            setStatus('PDF export unavailable');
            showToast('PDF export unavailable on this browser.', 'error');
            return;
          }
          await saveExportBlob(pdfBlob, buildFilename(img.name, 'application/pdf'));
          img.lastExportRevision = img.revision;
          setExportSavings(originalBytes, pdfBlob.size);
          setStatus('Export successful');
          closeExportSheet();
          showToast('Export successful.', 'success');
          updateExportSummary();
          return;
        }

        // If user keeps metadata, image unchanged, and type unchanged, return original file.
        if (!stripMetadata && !img.dirty && img.file && (img.mimeType || img.file.type) === type) {
          await saveExportBlob(img.file, buildFilename(img.name, type));
          img.lastExportRevision = img.revision;
          setExportSavings(originalBytes, getOriginalBytesForImage(img));
          setStatus('Export successful');
          closeExportSheet();
          showToast('Export successful.', 'success');
          updateExportSummary();
          return;
        }

        const { blob, actualType } = await exportCanvasToBlob(img.canvas, type, quality);
        if (!blob) {
          setStatus('Export failed');
          showToast('Export failed. Try another format.', 'error');
          return;
        }
        await saveExportBlob(blob, buildFilename(img.name, actualType));
        img.lastExportRevision = img.revision;
        setExportSavings(originalBytes, blob.size);
        setStatus('Export successful');
        closeExportSheet();
        showToast('Export successful.', 'success');
        updateExportSummary();
      } finally {
        dom.downloadBtn.disabled = false;
        updateActionAvailability();
      }
    }

    function getBulkSequentialBaseName() {
      return getExportController().getBulkSequentialBaseName();
    }

    function shouldUseSequentialZipNames() {
      return getExportController().shouldUseSequentialZipNames();
    }

    function formatDateToken(date = new Date()) {
      return getExportController().formatDateToken(date);
    }

    function formatTimeToken(date = new Date()) {
      return getExportController().formatTimeToken(date);
    }

    function buildNameFromTemplate(template, values) {
      return getExportController().buildNameFromTemplate(template, values);
    }

    function makeUniqueFilename(rawName, usedNames) {
      return getExportController().makeUniqueFilename(rawName, usedNames);
    }

    function buildBulkFilename(img, index, outputType, usedNames) {
      return getExportController().buildBulkFilename(img, index, outputType, usedNames);
    }

    async function exportImageForType(img, outputType, quality, stripMetadata) {
      if (outputType === 'application/pdf') {
        const pdfBlob = await exportCanvasToPdfBlob(img.canvas, quality);
        if (!pdfBlob) return null;
        return {
          blob: pdfBlob,
          outputType: 'application/pdf'
        };
      }

      if (!stripMetadata && !img.dirty && img.file && (img.mimeType || img.file.type) === outputType) {
        return {
          blob: img.file,
          outputType
        };
      }

      const encoded = await exportCanvasToBlob(img.canvas, outputType, quality);
      if (!encoded || !encoded.blob) return null;
      return {
        blob: encoded.blob,
        outputType: encoded.actualType || outputType
      };
    }

    async function saveBulkEntriesAsMultiple(entries, total) {
      let completed = 0;
      for (const entry of entries) {
        if (exportQueue && exportQueue.cancelled) break;
        await saveExportBlob(entry.blob, entry.filename);
        completed += 1;
        if (exportQueue) exportQueue.completed = completed;
        setExportProgress(completed, total, 'Saving files...');
        await nextFrame();
      }
    }

    async function saveBulkEntriesAsZip(entries) {
      const zipEngine = await ensureExportEngineLoaded();
      const zip = await zipEngine.createZip();
      const folder = zip.folder('liteedit_exports');
      entries.forEach((entry) => {
        folder.file(entry.filename, entry.blob);
      });
      if (exportQueue && exportQueue.cancelled) {
        throw new Error('Export cancelled');
      }
      return zip.generateAsync({ type: 'blob' });
    }

    async function downloadAllExports() {
      if (state.images.length === 0) return;

      const quality = getQuality();
      const stripMetadata = dom.stripMetaInput.checked;
      const total = state.images.length;
      const totalOriginalBytes = getOriginalBytesForAll();
      exportQueue = {
        active: true,
        cancelled: false,
        total,
        completed: 0
      };
      if (dom.cancelExportQueueBtn) {
        dom.cancelExportQueueBtn.disabled = false;
      }
      resetBulkStatuses();
      dom.downloadAllBtn.disabled = true;
      dom.downloadBtn.disabled = true;
      const original = dom.downloadAllBtn.textContent;
      dom.downloadAllBtn.textContent = 'Processing...';
      setExportProgress(0, total, 'Preparing...');

      try {
        const typesByImage = state.images.map((img) => getBulkExportFormatForImage(img));
        const allPdf = typesByImage.length > 0 && typesByImage.every((entry) => entry === 'application/pdf');
        if (allPdf && state.bulkPdfMode === 'combined') {
          if (exportQueue.cancelled) {
            setStatus('Export cancelled');
            showToast('Export cancelled.', 'info');
            return;
          }
          const pdfBlob = await exportAllToPdfBlob(
            state.images,
            quality,
            (current, limit) => {
              setExportProgress(current, limit, 'Rendering combined PDF...');
            },
            () => exportQueue && exportQueue.cancelled
          );
          if (!pdfBlob) {
            setStatus('PDF export unavailable');
            showToast('PDF export unavailable on this browser.', 'error');
            return;
          }
          if (exportQueue.cancelled) {
            setStatus('Export cancelled');
            showToast('Export cancelled.', 'info');
            return;
          }
          await saveExportBlob(pdfBlob, 'liteedit_exports.pdf');
          state.images.forEach((img) => {
            img.lastExportRevision = img.revision;
            setBulkRowStatus(img, 'Done');
          });
          setExportSavings(totalOriginalBytes, pdfBlob.size);
          setExportProgress(total, total, 'Combined PDF ready');
          setStatus('Export successful');
          closeExportSheet();
          showToast('Export successful.', 'success');
          updateExportSummary();
          return;
        }

        const usedNames = new Set();
        const entries = [];
        let completed = 0;
        for (let index = 0; index < state.images.length; index += 1) {
          const img = state.images[index];
          if (exportQueue.cancelled) {
            setBulkRowStatus(img, 'Cancelled');
            break;
          }
          const outputType = typesByImage[index];
          setBulkRowStatus(img, 'Processing...');
          const exported = await exportImageForType(img, outputType, quality, stripMetadata);
          if (exported && exported.blob) {
            entries.push({
              blob: exported.blob,
              filename: buildBulkFilename(img, index, exported.outputType, usedNames)
            });
            img.lastExportRevision = img.revision;
            setBulkRowStatus(img, 'Ready');
          } else {
            setBulkRowStatus(img, 'Skipped');
          }
          completed += 1;
          exportQueue.completed = completed;
          setExportProgress(completed, total, 'Preparing files...');
        }

        if (exportQueue.cancelled) {
          setStatus('Export cancelled');
          showToast('Export cancelled.', 'info');
          return;
        }

        if (entries.length === 0) {
          setStatus('Export failed');
          showToast('No files were exported. Please retry.', 'error');
          return;
        }

        if (state.bulkExportMode === 'multiple') {
          await saveBulkEntriesAsMultiple(entries, total);
          const totalBytes = entries.reduce((sum, entry) => sum + (entry.blob && entry.blob.size ? entry.blob.size : 0), 0);
          setExportSavings(totalOriginalBytes, totalBytes);
          setExportProgress(total, total, 'Export complete');
          state.images.forEach((img) => {
            if (!img.exportStatus || img.exportStatus === 'Ready') {
              setBulkRowStatus(img, 'Done');
            }
          });
          setStatus('Export successful');
          closeExportSheet();
          showToast('Export successful.', 'success');
          updateExportSummary();
          return;
        }

        const zipBlob = await saveBulkEntriesAsZip(entries);
        if (exportQueue.cancelled) {
          setStatus('Export cancelled');
          showToast('Export cancelled.', 'info');
          return;
        }
        await saveExportBlob(zipBlob, 'liteedit_exports.zip');
        setExportSavings(totalOriginalBytes, zipBlob.size);
        setExportProgress(total, total, 'Export complete');
        state.images.forEach((img) => {
          if (!img.exportStatus || img.exportStatus === 'Ready') {
            setBulkRowStatus(img, 'Done');
          }
        });
        setStatus('Export successful');
        closeExportSheet();
        showToast('Export successful.', 'success');
        updateExportSummary();
      } catch (err) {
        console.error(err);
        setStatus('Bulk export failed');
        showToast('Bulk export failed. Please retry.', 'error');
      } finally {
        exportQueue.active = false;
        if (dom.cancelExportQueueBtn) {
          dom.cancelExportQueueBtn.disabled = true;
        }
        dom.downloadAllBtn.disabled = false;
        dom.downloadBtn.disabled = !activeImage();
        dom.downloadAllBtn.textContent = original;
        setExportProgress(0, 0);
        updateActionAvailability();
      }
    }

    function handleUpload(event) {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;
      void loadFilesIntoState(files, 'Upload complete');
      event.target.value = '';
    }

    function extractImageFilesFromClipboardData(dataTransfer) {
      if (!dataTransfer) return [];
      const items = Array.from(dataTransfer.items || []);
      const files = [];
      items.forEach((item) => {
        if (!item || item.kind !== 'file' || !item.type || !item.type.startsWith('image/')) return;
        const file = item.getAsFile();
        if (file) files.push(file);
      });
      return files;
    }

    function shouldIgnorePasteCapture(target) {
      if (!target || !(target instanceof Element)) return false;
      if (target.closest('#replaceTextInput') || target.closest('#textQuickInput')) return true;
      return target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target.hasAttribute('contenteditable')
        || !!target.closest('[contenteditable="true"]');
    }

    async function readImageFileFromClipboardApi() {
      if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') return null;
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        if (!blob) continue;
        const ext = extensionForType(imageType);
        return new File([blob], `clipboard-${Date.now()}.${ext}`, { type: imageType });
      }
      return null;
    }

    async function importFromClipboardButton() {
      try {
        const file = await readImageFileFromClipboardApi();
        if (!file) {
          showToast('No image found in clipboard.', 'info');
          setStatus('Clipboard has no image data');
          return;
        }
        await loadFilesIntoState([file], 'Clipboard import complete');
      } catch (error) {
        console.error('Clipboard import failed:', error);
        showToast('Clipboard access was blocked. Try Ctrl+V / Command+V inside the editor.', 'error');
        setStatus('Clipboard permission required');
      }
    }

    async function tryAutoImportClipboardOnStart() {
      if (state.images.length > 0) return;
      if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') return;
      if (!navigator.permissions || typeof navigator.permissions.query !== 'function') return;
      try {
        const permission = await navigator.permissions.query({ name: 'clipboard-read' });
        if (!permission || permission.state !== 'granted') return;
        const file = await readImageFileFromClipboardApi();
        if (!file) return;
        await loadFilesIntoState([file], 'Clipboard image loaded');
        showToast('Loaded image from clipboard.', 'success');
      } catch (error) {
        // Ignore clipboard permission or browser support errors silently.
      }
    }

    function handleDocumentPaste(event) {
      if (!event) return;
      if (shouldIgnorePasteCapture(event.target)) return;
      const files = extractImageFilesFromClipboardData(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      void loadFilesIntoState(files, 'Clipboard import complete');
    }

    async function loadFilesIntoState(files, statusLabel = 'Upload complete', options = {}) {
      if (!files.length) return;

      const available = MAX_FILES - state.images.length;
      if (available <= 0) {
        setStatus(`Maximum ${MAX_FILES} images allowed.`);
        showToast(`Maximum ${MAX_FILES} images allowed.`, 'error');
        return;
      }

      const accepted = files.filter(isLikelyImageFile).slice(0, available);
      if (accepted.length === 0) {
        setStatus('No supported images found');
        return;
      }

      const jobToken = ++importJobToken;
      const selectedBeforeImport = state.selectedIndex;
      const previousCount = state.images.length;
      let addedCount = 0;
      let downscaledCount = 0;
      let decodeFailures = 0;
      let blockedByMemory = 0;

      const currentTotalPixels = state.images.reduce((sum, img) => sum + (img.pixelCount || (img.canvas.width * img.canvas.height)), 0);
      let totalPixels = currentTotalPixels;

      for (let index = 0; index < accepted.length; index += 1) {
        if (jobToken !== importJobToken) return;
        const file = accepted[index];
        setStatus(`Importing ${index + 1}/${accepted.length}: ${file.name}`);
        try {
          const decodedImage = await decodeImageFile(file);
          if (jobToken !== importJobToken) {
            releaseDrawable(decodedImage.drawable);
            return;
          }
          const imgState = createImageState(file, decodedImage, options);
          if ((totalPixels + imgState.pixelCount) > MAX_TOTAL_PIXELS) {
            blockedByMemory += 1;
            showToast('Memory guard: skipping one large image to keep LiteEdit stable.', 'info');
            continue;
          }
          totalPixels += imgState.pixelCount;
          if (imgState.wasDownscaledOnImport) downscaledCount += 1;
          state.images.push(imgState);
          addedCount += 1;
        } catch (error) {
          decodeFailures += 1;
          console.error(`Failed to import ${file.name}:`, error);
        }
        await nextFrame();
      }

      if (jobToken !== importJobToken) return;
      if (addedCount === 0) {
        setStatus('No supported images found');
        showToast('Could not decode selected files.', 'error');
        updateActionAvailability();
        return;
      }

      if (selectedBeforeImport === -1 && previousCount === 0) {
        selectImage(0);
      } else {
        requestThumbnailsRender(true);
        updateActionAvailability();
        updateExportSummary();
      }

      const skipped = files.length - addedCount;
      if (skipped > 0) {
        setStatus(`${statusLabel} (${addedCount} added, ${skipped} skipped)`);
        showToast(`${addedCount} added, ${skipped} skipped.`, 'info');
      } else {
        setStatus(`${statusLabel} (${addedCount} added)`);
        showToast(`${statusLabel}: ${addedCount} image${addedCount > 1 ? 's' : ''}.`, 'success');
      }

      if (downscaledCount > 0) {
        showToast(`Optimized ${downscaledCount} large image${downscaledCount > 1 ? 's' : ''} for smoother editing.`, 'success');
      }
      if (blockedByMemory > 0) {
        showToast(`Skipped ${blockedByMemory} image${blockedByMemory > 1 ? 's' : ''} due to memory guard.`, 'info');
      }
      if (decodeFailures > 0) {
        showToast(`${decodeFailures} file${decodeFailures > 1 ? 's' : ''} failed to decode.`, 'error');
      }
      scheduleSessionAutosave({ immediate: true });
      scheduleLazyWarmups();
    }

    function handleFolderUpload(event) {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;
      void loadFilesIntoState(files, 'Folder import complete');
      event.target.value = '';
    }

    function handleCameraCapture(event, preset) {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;
      const label = preset === 'scan' ? 'Document scan complete' : 'Camera photo added';
      void loadFilesIntoState(files, label, { cameraPreset: preset });
      event.target.value = '';
    }

    function hasUnsavedEdits() {
      return hasPendingExports();
    }

    function extractImageFilesFromDataTransfer(dataTransfer) {
      if (!dataTransfer) return [];
      const files = Array.from(dataTransfer.files || []);
      return files.filter(isLikelyImageFile);
    }

    function handleDropImport(event) {
      event.preventDefault();
      event.stopPropagation();
      dom.canvasZone.classList.remove('drag-over');
      const files = extractImageFilesFromDataTransfer(event.dataTransfer);
      if (files.length === 0) {
        setStatus('Drop images to import');
        return;
      }
      void loadFilesIntoState(files, 'Drop import complete');
    }

    function getCanvasInteractionController() {
      if (!canvasInteractionController) {
        canvasInteractionController = createCanvasInteractionController({
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
        });
      }
      return canvasInteractionController;
    }

    // Canvas pointer handlers for pen/highlighter/blur/crop
    function onPointerDown(e) {
      getCanvasInteractionController().onPointerDown(e);
    }

    function onPointerMove(e) {
      getCanvasInteractionController().onPointerMove(e);
    }

    function onPointerUp(e) {
      getCanvasInteractionController().onPointerUp(e);
    }

    function onCanvasWheelZoom(event) {
      getCanvasInteractionController().onCanvasWheelZoom(event);
    }

    function onCanvasTouchStart(event) {
      getCanvasInteractionController().onCanvasTouchStart(event);
    }

    function onCanvasTouchMove(event) {
      getCanvasInteractionController().onCanvasTouchMove(event);
    }

    function onCanvasTouchEnd(event) {
      getCanvasInteractionController().onCanvasTouchEnd(event);
    }

    function getKeyboardController() {
      if (!keyboardController) {
        keyboardController = createKeyboardController({
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
        });
      }
      return keyboardController;
    }

    function onDocumentKeyDown(event) {
      getKeyboardController().onDocumentKeyDown(event);
    }

    function onDocumentKeyUp(event) {
      getKeyboardController().onDocumentKeyUp(event);
    }

    function onWindowBlur() {
      getKeyboardController().onWindowBlur();
    }

    function bindEvents() {
      dom.fileInput.addEventListener('change', handleUpload);
      dom.folderInput.addEventListener('change', handleFolderUpload);
      if (dom.emptyUploadBtn) {
        dom.emptyUploadBtn.addEventListener('click', () => {
          dom.fileInput.click();
        });
      }
      if (dom.emptyPasteBtn) {
        dom.emptyPasteBtn.addEventListener('click', () => {
          void importFromClipboardButton();
        });
      }
      if (dom.emptyCaptureBtn) {
        dom.emptyCaptureBtn.addEventListener('click', () => {
          void startCaptureFlow('photo');
        });
      }
      dom.simpleModeBtn.addEventListener('click', () => applyUserMode('simple'));
      dom.advancedModeBtn.addEventListener('click', () => applyUserMode('advanced'));
      dom.openSettingsBtn.addEventListener('click', openSettingsSheet);
      dom.openExportBtn.addEventListener('click', openExportSheet);
      dom.mobileImportBtn.addEventListener('click', openImportSheet);
      dom.mobileExportBtn.addEventListener('click', openExportSheet);
      dom.openExportFromSettingsBtn.addEventListener('click', openExportSheet);
      dom.contactDeveloperBtn.addEventListener('click', () => {
        window.location.href = '../../#contact';
      });
      if (dom.workflowImportBtn) {
        dom.workflowImportBtn.addEventListener('click', openImportSheet);
      }
      if (dom.workflowEditBtn) {
        dom.workflowEditBtn.addEventListener('click', () => {
          openControlSection('adjustmentsSection');
        });
      }
      if (dom.workflowTextBtn) {
        dom.workflowTextBtn.addEventListener('click', () => {
          openControlSection('textSection', { ensureAdvanced: true });
        });
      }
      if (dom.workflowExportBtn) {
        dom.workflowExportBtn.addEventListener('click', () => {
          void openExportSheet();
        });
      }
      if (dom.addMediaBtn) {
        dom.addMediaBtn.addEventListener('click', openImportSheet);
      }
      if (dom.panelAddMediaBtn) {
        dom.panelAddMediaBtn.addEventListener('click', openImportSheet);
      }
      if (dom.panelHideThumbsBtn) {
        dom.panelHideThumbsBtn.addEventListener('click', () => applyThumbsVisibility(false));
      }
      if (dom.showUploadsBtn) {
        dom.showUploadsBtn.addEventListener('click', () => applyThumbsVisibility(true));
      }
      if (dom.showControlsBtn) {
        dom.showControlsBtn.addEventListener('click', () => applyControlsVisibility(true));
      }
      dom.importImageBtn.addEventListener('click', () => {
        closeImportSheet();
        dom.fileInput.click();
      });
      dom.importFolderBtn.addEventListener('click', () => {
        closeImportSheet();
        dom.folderInput.click();
      });
      dom.importCaptureBtn.addEventListener('click', () => {
        closeImportSheet();
        openCameraSheet();
      });
      dom.cancelImportSheetBtn.addEventListener('click', closeImportSheet);
      dom.importSheet.addEventListener('click', (event) => {
        if (event.target === dom.importSheet) closeImportSheet();
      });
      dom.closeExportSheetBtn.addEventListener('click', closeExportSheet);
      dom.cancelExportSheetBtn.addEventListener('click', closeExportSheet);
      dom.exportSheet.addEventListener('click', (event) => {
        if (event.target === dom.exportSheet) closeExportSheet();
      });
      if (dom.closeSettingsSheetBtn) {
        dom.closeSettingsSheetBtn.addEventListener('click', closeSettingsSheet);
      }
      if (dom.cancelSettingsSheetBtn) {
        dom.cancelSettingsSheetBtn.addEventListener('click', closeSettingsSheet);
      }
      if (dom.settingsSheet) {
        dom.settingsSheet.addEventListener('click', (event) => {
          if (event.target === dom.settingsSheet) closeSettingsSheet();
        });
      }
      if (dom.openHelpSheetBtn) {
        dom.openHelpSheetBtn.addEventListener('click', openHelpSheet);
      }
      if (dom.reportIssueBtn) {
        dom.reportIssueBtn.addEventListener('click', openReportIssueSheet);
      }
      if (dom.closeHelpSheetBtn) {
        dom.closeHelpSheetBtn.addEventListener('click', closeHelpSheet);
      }
      if (dom.cancelHelpSheetBtn) {
        dom.cancelHelpSheetBtn.addEventListener('click', closeHelpSheet);
      }
      if (dom.helpSheet) {
        dom.helpSheet.addEventListener('click', (event) => {
          if (event.target === dom.helpSheet) closeHelpSheet();
        });
      }
      if (dom.closeReportIssueBtn) {
        dom.closeReportIssueBtn.addEventListener('click', closeReportIssueSheet);
      }
      if (dom.cancelReportIssueBtn) {
        dom.cancelReportIssueBtn.addEventListener('click', closeReportIssueSheet);
      }
      if (dom.copyReportIssueBtn) {
        dom.copyReportIssueBtn.addEventListener('click', async () => {
          if (!dom.reportIssueText) return;
          try {
            await navigator.clipboard.writeText(dom.reportIssueText.value);
            showToast('Report snapshot copied.', 'success');
          } catch (error) {
            showToast('Copy failed. Please select and copy manually.', 'error');
          }
        });
      }
      if (dom.downloadReportIssueBtn) {
        dom.downloadReportIssueBtn.addEventListener('click', () => {
          if (!dom.reportIssueText || !dom.reportIssueText.value.trim()) {
            showToast('No snapshot available to download.', 'info');
            return;
          }
          downloadTextFile(dom.reportIssueText.value, buildReportIssueFilename());
          showToast('Snapshot JSON downloaded.', 'success');
        });
      }
      if (dom.reportIssueSheet) {
        dom.reportIssueSheet.addEventListener('click', (event) => {
          if (event.target === dom.reportIssueSheet) closeReportIssueSheet();
        });
      }
      dom.exportModeSingleBtn.addEventListener('click', () => applyExportMode('single'));
      dom.exportModeBulkBtn.addEventListener('click', () => applyExportMode('bulk'));
      dom.pdfBulkModeCombined.addEventListener('change', () => applyBulkPdfMode('combined'));
      dom.pdfBulkModeSeparate.addEventListener('change', () => applyBulkPdfMode('separate'));
      if (dom.bulkExportModeInput) {
        dom.bulkExportModeInput.addEventListener('change', () => {
          applyBulkExportMode(dom.bulkExportModeInput.value);
        });
      }
      if (dom.bulkAdvancedInput) {
        dom.bulkAdvancedInput.addEventListener('change', () => {
          applyBulkAdvancedMode(dom.bulkAdvancedInput.value);
        });
      }
      if (dom.bulkShowImagesInput) {
        dom.bulkShowImagesInput.addEventListener('change', () => {
          applyBulkShowImages(dom.bulkShowImagesInput.value);
        });
      }
      if (dom.bulkSequentialBaseInput) {
        dom.bulkSequentialBaseInput.addEventListener('change', () => {
          applyBulkSequentialBase(dom.bulkSequentialBaseInput.value);
          updateExportSummary();
        });
      }
      if (dom.bulkUseTemplateInput) {
        dom.bulkUseTemplateInput.addEventListener('change', () => {
          applyBulkNameTemplateEnabled(dom.bulkUseTemplateInput.checked);
        });
      }
      if (dom.bulkNameTemplateInput) {
        dom.bulkNameTemplateInput.addEventListener('input', () => {
          applyBulkNameTemplateValue(dom.bulkNameTemplateInput.value);
        });
        dom.bulkNameTemplateInput.addEventListener('change', () => {
          applyBulkNameTemplateValue(dom.bulkNameTemplateInput.value);
        });
      }
      if (dom.bulkNameSuffixInput) {
        dom.bulkNameSuffixInput.addEventListener('input', () => {
          applyBulkNameSuffixValue(dom.bulkNameSuffixInput.value);
        });
        dom.bulkNameSuffixInput.addEventListener('change', () => {
          applyBulkNameSuffixValue(dom.bulkNameSuffixInput.value);
        });
      }
      if (dom.bulkFilesPanel) {
        dom.bulkFilesPanel.addEventListener('input', (event) => {
          const target = event.target;
          const row = target && target.closest ? target.closest('.bulk-file-row') : null;
          if (!row) return;
          const imageId = row.dataset.imageId;
          const img = state.images.find((entry) => entry.id === imageId);
          if (!img) return;
          if (target.classList.contains('bulk-file-name-input')) {
            const nextName = sanitizeFileName(target.value);
            if (!nextName) return;
            if (img.name !== nextName) {
              img.name = nextName;
              if (dom.renameInput && activeImage() && activeImage().id === img.id) {
                dom.renameInput.value = img.name;
              }
              updateExportSummary();
              scheduleSessionAutosave();
            }
          }
        });
        dom.bulkFilesPanel.addEventListener('change', (event) => {
          const target = event.target;
          const row = target && target.closest ? target.closest('.bulk-file-row') : null;
          if (!row) return;
          const imageId = row.dataset.imageId;
          const img = state.images.find((entry) => entry.id === imageId);
          if (!img) return;
          if (target.classList.contains('bulk-file-name-input')) {
            const nextName = sanitizeFileName(target.value);
            target.value = nextName || img.name;
            if (nextName && img.name !== nextName) {
              img.name = nextName;
              if (dom.renameInput && activeImage() && activeImage().id === img.id) {
                dom.renameInput.value = img.name;
              }
              requestThumbnailsRender(true);
              updateExportSummary();
              scheduleSessionAutosave();
            }
            return;
          }
          if (target.classList.contains('bulk-file-format-select')) {
            state.bulkFormatOverrides[img.id] = target.value;
            updateBulkPdfModeVisibility();
            updateExportSummary();
            updateExportSizeEstimate();
          }
        });
      }
      dom.cameraPhotoBtn.addEventListener('click', () => {
        closeCameraSheet();
        void startCaptureFlow('photo');
      });
      dom.cameraScanBtn.addEventListener('click', () => {
        closeCameraSheet();
        void startCaptureFlow('scan');
      });
      dom.cancelCameraSheetBtn.addEventListener('click', closeCameraSheet);
      dom.closeCameraSheetBtn.addEventListener('click', closeCameraSheet);
      dom.cameraSheet.addEventListener('click', (event) => {
        if (event.target === dom.cameraSheet) closeCameraSheet();
      });
      if (dom.captureLiveBtn) {
        dom.captureLiveBtn.addEventListener('click', () => {
          void captureLiveFrame();
        });
      }
      if (dom.cancelLiveCaptureBtn) {
        dom.cancelLiveCaptureBtn.addEventListener('click', closeLiveCaptureModal);
      }
      if (dom.closeLiveCaptureBtn) {
        dom.closeLiveCaptureBtn.addEventListener('click', closeLiveCaptureModal);
      }
      if (dom.liveCaptureModal) {
        dom.liveCaptureModal.addEventListener('click', (event) => {
          if (event.target === dom.liveCaptureModal) closeLiveCaptureModal();
        });
      }
      dom.cameraPhotoInput.addEventListener('change', (event) => handleCameraCapture(event, 'photo'));
      dom.cameraScanInput.addEventListener('change', (event) => handleCameraCapture(event, 'scan'));
      document.addEventListener('keydown', onDocumentKeyDown);
      document.addEventListener('keyup', onDocumentKeyUp);
      window.addEventListener('blur', onWindowBlur);

      dom.themeLightBtn.addEventListener('click', () => applyTheme('light'));
      dom.themeDarkBtn.addEventListener('click', () => applyTheme('dark'));
      dom.importOptimizeInput.addEventListener('change', () => {
        state.importOptimize = !!dom.importOptimizeInput.checked;
        applyImportSettings();
        showToast(`Import optimization ${state.importOptimize ? 'enabled' : 'disabled'}.`, 'info');
      });
      dom.importMaxEdgeInput.addEventListener('change', () => {
        state.importMaxEdge = parseInt(dom.importMaxEdgeInput.value, 10) || 4096;
        applyImportSettings();
        showToast(`Max import edge set to ${state.importMaxEdge}px.`, 'info');
      });

      if (dom.toggleThumbsBtn) {
        dom.toggleThumbsBtn.addEventListener('click', () => {
          applyThumbsVisibility(!state.thumbsVisible);
        });
      }

      if (dom.floatingThumbsBtn) {
        dom.floatingThumbsBtn.addEventListener('click', () => {
          applyThumbsVisibility(!state.thumbsVisible);
        });
      }

      dom.floatingToolsBtn.addEventListener('click', () => {
        applyToolsVisibility(!state.toolsVisible);
      });

      dom.floatingControlsBtn.addEventListener('click', () => {
        applyControlsVisibility(!state.controlsVisible);
      });

      dom.hideControlsBtn.addEventListener('click', () => applyControlsVisibility(false));

      dom.widthInput.addEventListener('input', () => {
        if (!dom.keepAspect.checked) return;
        const img = activeImage();
        if (!img) return;
        const w = parseInt(dom.widthInput.value, 10);
        if (!Number.isFinite(w) || w <= 0) return;
        const ratio = img.canvas.height / img.canvas.width;
        dom.heightInput.value = Math.max(1, Math.round(w * ratio));
      });

      dom.heightInput.addEventListener('input', () => {
        if (!dom.keepAspect.checked) return;
        const img = activeImage();
        if (!img) return;
        const h = parseInt(dom.heightInput.value, 10);
        if (!Number.isFinite(h) || h <= 0) return;
        const ratio = img.canvas.width / img.canvas.height;
        dom.widthInput.value = Math.max(1, Math.round(h * ratio));
      });

      if (dom.resizeMethodInput) {
        dom.resizeMethodInput.addEventListener('change', () => {
          state.resizeMethod = resolveResizeMethod();
          applyResizeSettings();
        });
      }

      if (dom.resizeFitInput) {
        dom.resizeFitInput.addEventListener('change', () => {
          state.resizeFitMethod = resolveResizeFitMethod();
          applyResizeSettings();
        });
      }

      dom.applyResizeBtn.addEventListener('click', applyResize);
      if (dom.applyResizeAllBtn) {
        dom.applyResizeAllBtn.addEventListener('click', applyResizeToAll);
      }
      dom.applyAdjustBtn.addEventListener('click', applyAdjustments);
      if (dom.applyAdjustAllBtn) {
        dom.applyAdjustAllBtn.addEventListener('click', applyAdjustmentsToAll);
      }
      if (dom.updateAdjustStepBtn) {
        dom.updateAdjustStepBtn.addEventListener('click', updateSelectedAdjustmentStep);
      }
      if (dom.removeAdjustStepBtn) {
        dom.removeAdjustStepBtn.addEventListener('click', removeSelectedAdjustmentStep);
      }
      if (dom.clearAdjustStackBtn) {
        dom.clearAdjustStackBtn.addEventListener('click', clearAdjustmentStepsForActiveImage);
      }
      if (dom.applyCropBtn) {
        dom.applyCropBtn.addEventListener('click', applyCropFromRect);
      }
      if (dom.cancelCropBtn) {
        dom.cancelCropBtn.addEventListener('click', cancelCropSelection);
      }
      if (dom.applyCropPresetBtn) {
        dom.applyCropPresetBtn.addEventListener('click', applyCropPreset);
      }
      if (dom.applySocialPresetBtn) {
        dom.applySocialPresetBtn.addEventListener('click', applySocialPreset);
      }
      if (dom.textConfidenceInput) {
        dom.textConfidenceInput.addEventListener('input', () => {
          state.textConfidenceThreshold = clamp(parseInt(dom.textConfidenceInput.value, 10) || 0, 0, 95);
          if (dom.textConfidenceVal) {
            dom.textConfidenceVal.textContent = String(state.textConfidenceThreshold);
          }
        });
        dom.textConfidenceInput.addEventListener('change', () => {
          state.textConfidenceThreshold = clamp(parseInt(dom.textConfidenceInput.value, 10) || 0, 0, 95);
          localStorage.setItem('liteedit_text_confidence_threshold', String(state.textConfidenceThreshold));
          applyConfidenceThresholdToCurrentDetections();
          syncTextEditPanel();
          scheduleSessionAutosave();
        });
      }
      if (dom.textStrictnessInput) {
        dom.textStrictnessInput.addEventListener('change', () => {
          state.textStrictness = normalizeTextStrictness(dom.textStrictnessInput.value);
          dom.textStrictnessInput.value = state.textStrictness;
          localStorage.setItem('liteedit_text_strictness', state.textStrictness);
          setStatus(`Text style matching: ${state.textStrictness}`);
          scheduleSessionAutosave();
        });
      }
      if (dom.textSizeScaleInput) {
        dom.textSizeScaleInput.addEventListener('input', () => {
          state.textReplaceSizeScale = clamp(parseInt(dom.textSizeScaleInput.value, 10) || 110, 70, 170);
          if (dom.textSizeScaleVal) {
            dom.textSizeScaleVal.textContent = String(state.textReplaceSizeScale);
          }
        });
        dom.textSizeScaleInput.addEventListener('change', () => {
          state.textReplaceSizeScale = clamp(parseInt(dom.textSizeScaleInput.value, 10) || 110, 70, 170);
          localStorage.setItem('liteedit_text_replace_scale', String(state.textReplaceSizeScale));
          setStatus(`Replacement size set to ${state.textReplaceSizeScale}%`);
        });
      }
      if (dom.textBoxXInput) {
        dom.textBoxXInput.addEventListener('change', () => {
          applySelectedTextBoxPosition();
        });
      }
      if (dom.textBoxYInput) {
        dom.textBoxYInput.addEventListener('change', () => {
          applySelectedTextBoxPosition();
        });
      }
      if (dom.applyTextBoxPositionBtn) {
        dom.applyTextBoxPositionBtn.addEventListener('click', () => {
          applySelectedTextBoxPosition();
        });
      }
      if (dom.centerTextBoxBtn) {
        dom.centerTextBoxBtn.addEventListener('click', () => {
          applySelectedTextBoxPosition({ center: true });
        });
      }
      if (dom.addTextBgOpacityInput) {
        dom.addTextBgOpacityInput.addEventListener('input', () => {
          if (dom.addTextBgOpacityVal) {
            const value = clamp(parseInt(dom.addTextBgOpacityInput.value || '78', 10) || 78, 15, 100);
            dom.addTextBgOpacityVal.textContent = String(value);
          }
        });
      }
      if (dom.startAddTextBtn) {
        dom.startAddTextBtn.addEventListener('click', () => {
          if (!activeImage()) {
            showToast('Select an image first.', 'error');
            return;
          }
          applyUserMode('advanced');
          setTextAddPlacementActive(true);
          setStatus('Tap on image to place text');
        });
      }
      if (dom.cancelAddTextBtn) {
        dom.cancelAddTextBtn.addEventListener('click', () => {
          setTextAddPlacementActive(false);
          setStatus('Text placement cancelled');
        });
      }
      if (dom.highlighterColorInput) {
        dom.highlighterColorInput.addEventListener('change', () => {
          const selected = dom.highlighterColorInput.value || '#facc15';
          state.penColor = selected;
          state.highlighterColor = selected;
          localStorage.setItem('liteedit_pen_color', state.penColor);
          localStorage.setItem('liteedit_highlighter_color', state.highlighterColor);
          setStatus('Drawing color updated');
        });
      }
      if (dom.ocrLanguageInput) {
        dom.ocrLanguageInput.addEventListener('change', () => {
          state.ocrLanguage = normalizeOcrLanguage(dom.ocrLanguageInput.value);
          dom.ocrLanguageInput.value = state.ocrLanguage;
          localStorage.setItem('liteedit_ocr_language', state.ocrLanguage);
          setStatus(`Text detection language: ${state.ocrLanguage === 'eng+hin' ? 'English + Hindi' : 'English'}`);
        });
      }
      if (dom.cropRatioInput) {
        dom.cropRatioInput.addEventListener('change', () => {
          setCropRatioValue(dom.cropRatioInput.value || 'free');
          if (state.tool === 'crop' && state.cropRect) {
            renderCanvas();
          }
        });
      }
      dom.quickAutoBtn.addEventListener('click', applyQuickAutoEnhance);
      dom.quickResetBtn.addEventListener('click', resetQuickAdjustments);
      [dom.brightnessInput, dom.contrastInput, dom.saturationInput, dom.globalBlurInput].forEach((slider) => {
        slider.addEventListener('pointerdown', () => {
          startAdjustmentPreview();
          showMobileAdjustOverlay();
        });
        slider.addEventListener('input', updateAdjustmentPreview);
        slider.addEventListener('change', commitAdjustmentPreview);
        slider.addEventListener('pointerup', finalizeAdjustmentGesture);
        slider.addEventListener('pointercancel', finalizeAdjustmentGesture);
        slider.addEventListener('touchend', finalizeAdjustmentGesture, { passive: true });
      });
      dom.resetAdjustBtn.addEventListener('click', () => {
        resetQuickAdjustments();
      });

      dom.rotateLeftBtn.addEventListener('click', () => rotateImage(-1));
      dom.rotateRightBtn.addEventListener('click', () => rotateImage(1));
      dom.flipXBtn.addEventListener('click', () => flipImage(true));
      dom.flipYBtn.addEventListener('click', () => flipImage(false));
      dom.resetImageBtn.addEventListener('click', resetToOriginal);

      dom.undoBtn.addEventListener('click', undo);
      dom.redoBtn.addEventListener('click', redo);
      if (dom.floatingUndoBtn) {
        dom.floatingUndoBtn.addEventListener('click', undo);
      }
      if (dom.floatingRedoBtn) {
        dom.floatingRedoBtn.addEventListener('click', redo);
      }

      dom.downloadBtn.addEventListener('click', downloadCurrent);
      dom.downloadAllBtn.addEventListener('click', downloadAllExports);
      if (dom.cancelExportQueueBtn) {
        dom.cancelExportQueueBtn.addEventListener('click', () => {
          if (!exportQueue || !exportQueue.active) {
            setStatus('No export in progress');
            return;
          }
          exportQueue.cancelled = true;
          setStatus('Export cancellation requested');
          showToast('Stopping export after current file.', 'info');
        });
      }
      if (dom.exportPresetInput) {
        dom.exportPresetInput.addEventListener('change', () => {
          applyExportPreset(dom.exportPresetInput.value, { silent: false, persist: true });
        });
      }
      dom.formatInput.addEventListener('change', () => {
        markExportPresetCustom();
        updateBulkPdfModeVisibility();
        if (shouldRenderBulkPanelNow()) {
          renderBulkFilesPanel();
        }
        updateExportSizeEstimate();
      });
      dom.qualityInput.addEventListener('input', () => {
        markExportPresetCustom();
        updateExportSizeEstimate();
      });
      dom.stripMetaInput.addEventListener('change', () => {
        markExportPresetCustom();
        updateExportSizeEstimate();
      });
      dom.renameInput.addEventListener('input', () => applyRename({ silent: true }));
      dom.renameInput.addEventListener('change', () => applyRename());
      if (dom.textQuickInput) {
        dom.textQuickInput.addEventListener('input', () => {
          if (dom.replaceTextInput) {
            dom.replaceTextInput.value = dom.textQuickInput.value;
          }
        });
        dom.textQuickInput.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void applySmartTextReplace({
              replacement: dom.textQuickInput.value,
              autoFit: !(dom.textQuickKeepSizeInput && dom.textQuickKeepSizeInput.checked),
              lockSourceSize: !!(dom.textQuickKeepSizeInput && dom.textQuickKeepSizeInput.checked),
              closeEditor: true
            });
          } else if (event.key === 'Escape') {
            event.preventDefault();
            state.textSelectionIndex = -1;
            syncTextEditPanel({ preserveNoSelection: true });
            renderCanvas();
          }
        });
      }
      if (dom.textQuickApplyBtn) {
        dom.textQuickApplyBtn.addEventListener('click', () => {
          void applySmartTextReplace({
            replacement: dom.textQuickInput ? dom.textQuickInput.value : '',
            autoFit: !(dom.textQuickKeepSizeInput && dom.textQuickKeepSizeInput.checked),
            lockSourceSize: !!(dom.textQuickKeepSizeInput && dom.textQuickKeepSizeInput.checked),
            closeEditor: true
          });
        });
      }
      if (dom.textQuickCloseBtn) {
        dom.textQuickCloseBtn.addEventListener('click', () => {
          state.textSelectionIndex = -1;
          syncTextEditPanel({ preserveNoSelection: true });
          renderCanvas();
        });
      }
      if (dom.replaceTextInput) {
        dom.replaceTextInput.addEventListener('input', () => {
          if (dom.textQuickInput && document.activeElement !== dom.textQuickInput) {
            dom.textQuickInput.value = dom.replaceTextInput.value;
          }
        });
        dom.replaceTextInput.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          void applySmartTextReplace({ replacement: dom.replaceTextInput.value });
        });
      }

      dom.canvasZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dom.canvasZone.classList.add('drag-over');
        setStatus('Drop images to import');
      });
      dom.canvasZone.addEventListener('dragleave', () => {
        dom.canvasZone.classList.remove('drag-over');
      });
      dom.canvasZone.addEventListener('drop', handleDropImport);
      dom.canvasZone.addEventListener('wheel', onCanvasWheelZoom, { passive: false });
      dom.canvasZone.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
      dom.canvasZone.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
      dom.canvasZone.addEventListener('touchend', onCanvasTouchEnd, { passive: true });
      dom.canvasZone.addEventListener('touchcancel', onCanvasTouchEnd, { passive: true });
      dom.canvas.addEventListener('pointerdown', onPointerDown);
      dom.canvas.addEventListener('pointermove', onPointerMove);
      dom.canvas.addEventListener('pointerup', onPointerUp);
      dom.canvas.addEventListener('pointercancel', onPointerUp);
      if (dom.compareHoldBtn) {
        const endComparePreview = (event = null) => {
          if (
            event
            && Number.isFinite(event.pointerId)
            && typeof dom.compareHoldBtn.hasPointerCapture === 'function'
            && dom.compareHoldBtn.hasPointerCapture(event.pointerId)
          ) {
            try {
              dom.compareHoldBtn.releasePointerCapture(event.pointerId);
            } catch (error) {}
          }
          setComparePreviewActive(false);
        };

        dom.compareHoldBtn.addEventListener('pointerdown', (event) => {
          if (dom.compareHoldBtn.disabled) return;
          if (event.pointerType !== 'touch' && event.button !== 0) return;
          setComparePreviewActive(true);
          if (Number.isFinite(event.pointerId)) {
            try {
              dom.compareHoldBtn.setPointerCapture(event.pointerId);
            } catch (error) {}
          }
          event.preventDefault();
        });
        dom.compareHoldBtn.addEventListener('pointerup', endComparePreview);
        dom.compareHoldBtn.addEventListener('pointercancel', endComparePreview);
        dom.compareHoldBtn.addEventListener('lostpointercapture', endComparePreview);
        dom.compareHoldBtn.addEventListener('keydown', (event) => {
          if (event.key !== ' ' && event.key !== 'Enter') return;
          if (dom.compareHoldBtn.disabled) return;
          setComparePreviewActive(true);
          event.stopPropagation();
          event.preventDefault();
        });
        dom.compareHoldBtn.addEventListener('keyup', (event) => {
          if (event.key !== ' ' && event.key !== 'Enter') return;
          setComparePreviewActive(false);
          event.stopPropagation();
          event.preventDefault();
        });
        dom.compareHoldBtn.addEventListener('blur', () => setComparePreviewActive(false));
      }
      if (dom.toggleSplitCompareBtn) {
        dom.toggleSplitCompareBtn.addEventListener('click', () => {
          setSplitCompareActive(!state.splitCompareActive);
        });
      }
      if (dom.compareSplitSlider) {
        dom.compareSplitSlider.addEventListener('input', () => {
          setSplitComparePosition(dom.compareSplitSlider.value);
        });
      }
      if (dom.zoomInBtn) {
        dom.zoomInBtn.addEventListener('click', () => stepCanvasZoom(1));
      }
      if (dom.zoomOutBtn) {
        dom.zoomOutBtn.addEventListener('click', () => stepCanvasZoom(-1));
      }
      if (dom.zoomResetBtn) {
        dom.zoomResetBtn.addEventListener('click', () => resetViewport());
      }
      window.addEventListener('dragover', (event) => event.preventDefault());
      window.addEventListener('drop', (event) => {
        if (!dom.canvasZone.contains(event.target)) {
          event.preventDefault();
        }
      });
      document.addEventListener('paste', handleDocumentPaste);
      window.addEventListener('beforeunload', (event) => {
        if (!hasUnsavedEdits()) return;
        event.preventDefault();
        event.returnValue = '';
      });

      window.addEventListener('resize', () => {
        applyControlsVisibility(state.controlsVisible);
        applyToolsVisibility(state.toolsVisible);
        clampViewportOffset();
        applyCanvasViewport();
        syncTextQuickEditor();
        if (!shouldUseMobileAdjustOverlay()) {
          hideMobileAdjustOverlay();
        } else {
          syncMobileAdjustOverlay();
        }
      });
    }

    function init() {
      applyTheme(state.theme);
      applyImportSettings();
      applyResizeSettings();
      state.exportPreset = normalizeExportPreset(state.exportPreset);
      if (state.exportPreset === 'custom') {
        const savedFormat = localStorage.getItem('liteedit_export_format');
        const savedQuality = parseInt(localStorage.getItem('liteedit_export_quality') || '', 10);
        const savedStripMeta = localStorage.getItem('liteedit_export_strip_meta');
        if (dom.formatInput && savedFormat && Array.from(dom.formatInput.options || []).some((option) => option.value === savedFormat)) {
          dom.formatInput.value = savedFormat;
        }
        if (dom.qualityInput && Number.isFinite(savedQuality)) {
          dom.qualityInput.value = String(clamp(savedQuality, 40, 100));
        }
        if (dom.stripMetaInput && (savedStripMeta === 'true' || savedStripMeta === 'false')) {
          dom.stripMetaInput.checked = savedStripMeta === 'true';
        }
      }
      applyExportPreset(state.exportPreset, { silent: true, persist: false });
      localStorage.setItem('liteedit_export_preset', state.exportPreset);
      state.ocrLanguage = normalizeOcrLanguage(state.ocrLanguage);
      if (dom.ocrLanguageInput) {
        dom.ocrLanguageInput.value = state.ocrLanguage;
      }
      localStorage.setItem('liteedit_ocr_language', state.ocrLanguage);
      if (dom.highlighterColorInput) {
        const options = Array.from(dom.highlighterColorInput.options || []);
        const supportsPen = options.some((option) => option.value === state.penColor);
        const supportsHighlighter = options.some((option) => option.value === state.highlighterColor);
        if (!supportsPen) {
          state.penColor = '#60a5fa';
          localStorage.setItem('liteedit_pen_color', state.penColor);
        }
        if (!supportsHighlighter) {
          state.highlighterColor = '#facc15';
          localStorage.setItem('liteedit_highlighter_color', state.highlighterColor);
        }
        dom.highlighterColorInput.value = state.penColor;
      }
      if (dom.cropRatioInput) {
        const valid = Array.from(dom.cropRatioInput.options || []).some((option) => option.value === state.cropRatio);
        if (!valid) {
          state.cropRatio = 'free';
          localStorage.setItem('liteedit_crop_ratio', state.cropRatio);
        }
        dom.cropRatioInput.value = state.cropRatio;
      }
      if (dom.textConfidenceInput) {
        dom.textConfidenceInput.value = String(clamp(state.textConfidenceThreshold, 0, 95));
      }
      if (dom.textConfidenceVal) {
        dom.textConfidenceVal.textContent = String(clamp(state.textConfidenceThreshold, 0, 95));
      }
      if (dom.textStrictnessInput) {
        state.textStrictness = normalizeTextStrictness(state.textStrictness);
        dom.textStrictnessInput.value = state.textStrictness;
      }
      state.textReplaceSizeScale = clamp(state.textReplaceSizeScale, 70, 170);
      localStorage.setItem('liteedit_text_replace_scale', String(state.textReplaceSizeScale));
      if (dom.textSizeScaleInput) {
        dom.textSizeScaleInput.value = String(state.textReplaceSizeScale);
      }
      if (dom.textSizeScaleVal) {
        dom.textSizeScaleVal.textContent = String(state.textReplaceSizeScale);
      }
      if (dom.addTextBgOpacityInput && dom.addTextBgOpacityVal) {
        const opacityValue = clamp(parseInt(dom.addTextBgOpacityInput.value || '78', 10) || 78, 15, 100);
        dom.addTextBgOpacityInput.value = String(opacityValue);
        dom.addTextBgOpacityVal.textContent = String(opacityValue);
      }
      applyExportMode(state.exportMode);
      applyBulkPdfMode(state.bulkPdfMode);
      applyBulkExportMode(state.bulkExportMode);
      applyBulkAdvancedMode(state.bulkAdvancedMode);
      applyBulkShowImages(state.bulkShowImages);
      applyBulkSequentialBase(state.bulkSequentialBase);
      applyThumbsVisibility(state.thumbsVisible);
      applyControlsVisibility(state.controlsVisible);
      applyToolsVisibility(state.toolsVisible);
      initializeControlSections();
      applyUserMode(state.userMode);
      bindEvents();
      setSplitComparePosition(state.splitComparePosition);
      setSplitCompareActive(state.splitCompareActive);
      setTool(state.tool);
      requestThumbnailsRender(true);
      renderCanvas();
      updateLiveImageInfo();
      updateUndoRedoState();
      updateExportSummary();
      updateActionAvailability();
      syncTextEditPanel();
      setStatus('Ready. Upload images to start.');
      scheduleLazyWarmups();
      void attemptSessionRestore().then((restored) => {
        if (!restored) {
          void tryAutoImportClipboardOnStart();
        }
      });
    }

    init();
