export function createUiFlowController({
  state,
  dom,
  maxTotalPixels,
  isMobileView,
  loadFilesIntoState,
  setStatus,
  showToast,
  openModal,
  closeModal
}) {
  let liveCaptureStream = null;
  let liveCapturePreset = 'photo';

  function openCameraSheet() {
    openModal(dom.cameraSheet);
  }

  function closeCameraSheet() {
    closeModal(dom.cameraSheet);
  }

  function stopLiveCaptureStream() {
    if (!liveCaptureStream) return;
    const tracks = typeof liveCaptureStream.getTracks === 'function'
      ? liveCaptureStream.getTracks()
      : [];
    tracks.forEach((track) => {
      try {
        track.stop();
      } catch (error) {}
    });
    liveCaptureStream = null;
    if (dom.liveCaptureVideo) {
      dom.liveCaptureVideo.srcObject = null;
    }
  }

  function closeLiveCaptureModal() {
    stopLiveCaptureStream();
    closeModal(dom.liveCaptureModal);
  }

  function shouldUseNativeMobileCamera() {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return isMobileView() || coarsePointer;
  }

  async function openLiveCaptureModal(preset = 'photo') {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      throw new Error('Live capture unsupported');
    }
    if (!dom.liveCaptureVideo) {
      throw new Error('Live capture UI missing');
    }

    const desiredFacing = preset === 'scan' ? 'environment' : 'user';
    const fallbackFacing = desiredFacing === 'environment' ? 'user' : 'environment';
    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: desiredFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch (error) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: fallbackFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    }

    liveCapturePreset = preset;
    liveCaptureStream = stream;
    dom.liveCaptureVideo.srcObject = stream;
    openModal(dom.liveCaptureModal);
    try {
      await dom.liveCaptureVideo.play();
    } catch (error) {}
    setStatus('Camera ready. Capture an image.');
  }

  async function captureLiveFrame() {
    if (!dom.liveCaptureVideo) return;
    const video = dom.liveCaptureVideo;
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    if (!width || !height) {
      showToast('Camera is still starting. Try again.', 'info');
      return;
    }

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = width;
    captureCanvas.height = height;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) {
      showToast('Capture failed. Please retry.', 'error');
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      captureCanvas.toBlob(resolve, 'image/jpeg', 0.92);
    });
    if (!blob) {
      showToast('Unable to capture image.', 'error');
      return;
    }

    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    closeLiveCaptureModal();
    await loadFilesIntoState([file], 'Camera capture complete', { cameraPreset: liveCapturePreset });
  }

  async function startCaptureFlow(preset = 'photo') {
    state.cameraPreset = preset;
    if (shouldUseNativeMobileCamera()) {
      if (preset === 'scan') {
        dom.cameraScanInput.click();
      } else {
        dom.cameraPhotoInput.click();
      }
      return;
    }

    try {
      await openLiveCaptureModal(preset);
    } catch (error) {
      console.error('Live camera failed:', error);
      showToast('Webcam unavailable. Falling back to picker.', 'info');
      dom.cameraPhotoInput.click();
    }
  }

  function openImportSheet() {
    openModal(dom.importSheet);
  }

  function closeImportSheet() {
    closeModal(dom.importSheet);
  }

  function openSettingsSheet() {
    openModal(dom.settingsSheet);
    if (dom.openSettingsBtn) {
      dom.openSettingsBtn.classList.add('active');
      dom.openSettingsBtn.setAttribute('aria-pressed', 'true');
    }
  }

  function closeSettingsSheet() {
    closeModal(dom.settingsSheet);
    if (dom.openSettingsBtn) {
      dom.openSettingsBtn.classList.remove('active');
      dom.openSettingsBtn.setAttribute('aria-pressed', 'false');
    }
  }

  function openHelpSheet() {
    openModal(dom.helpSheet);
  }

  function closeHelpSheet() {
    closeModal(dom.helpSheet);
  }

  function buildReportIssueSnapshot() {
    const now = new Date();
    const images = state.images.map((img, index) => ({
      index: index + 1,
      width: img.canvas.width,
      height: img.canvas.height,
      sizeKB: Number.isFinite(parseFloat(img.sizeKB)) ? Number(parseFloat(img.sizeKB).toFixed(2)) : null,
      mimeType: img.mimeType || 'unknown',
      dirty: !!img.dirty,
      largeImage: !!img.largeImage,
      pixelCount: img.pixelCount || img.canvas.width * img.canvas.height
    }));
    return {
      generatedAt: now.toISOString(),
      app: 'LiteEdit',
      snapshotVersion: 2,
      theme: state.theme,
      userMode: state.userMode,
      imageCount: images.length,
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
        deviceMemory: navigator.deviceMemory || null,
        hardwareConcurrency: navigator.hardwareConcurrency || null
      },
      display: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio
      },
      images,
      export: {
        mode: state.exportMode,
        preset: state.exportPreset,
        bulkExportMode: state.bulkExportMode,
        bulkAdvancedMode: state.bulkAdvancedMode,
        bulkPdfMode: state.bulkPdfMode,
        bulkUseTemplate: state.bulkUseNameTemplate,
        bulkNameTemplate: state.bulkNameTemplate,
        bulkNameSuffix: state.bulkNameSuffix
      },
      text: {
        ocrLanguage: state.ocrLanguage,
        confidenceThreshold: state.textConfidenceThreshold,
        strictness: state.textStrictness
      },
      performance: {
        importOptimize: state.importOptimize,
        importMaxEdge: state.importMaxEdge,
        totalPixels: state.images.reduce((sum, img) => sum + (img.pixelCount || (img.canvas.width * img.canvas.height)), 0),
        maxTotalPixels: maxTotalPixels
      },
      privacy: {
        excludes: [
          'Image pixel data',
          'Clipboard file data',
          'User-entered replacement text values'
        ]
      }
    };
  }

  function openReportIssueSheet() {
    if (!dom.reportIssueSheet || !dom.reportIssueText) return;
    const snapshot = buildReportIssueSnapshot();
    dom.reportIssueText.value = JSON.stringify(snapshot, null, 2);
    openModal(dom.reportIssueSheet);
  }

  function closeReportIssueSheet() {
    closeModal(dom.reportIssueSheet);
  }

  return {
    openCameraSheet,
    closeCameraSheet,
    stopLiveCaptureStream,
    closeLiveCaptureModal,
    shouldUseNativeMobileCamera,
    openLiveCaptureModal,
    captureLiveFrame,
    startCaptureFlow,
    openImportSheet,
    closeImportSheet,
    openSettingsSheet,
    closeSettingsSheet,
    openHelpSheet,
    closeHelpSheet,
    buildReportIssueSnapshot,
    openReportIssueSheet,
    closeReportIssueSheet
  };
}
