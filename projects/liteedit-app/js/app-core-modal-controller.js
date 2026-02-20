export function createModalController({
  state,
  dom,
  stopLiveCaptureStream
}) {
  function getFocusableIn(el) {
    if (!el) return [];
    return Array.from(el.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
  }

  function getManagedModals() {
    return [
      dom.importSheet,
      dom.exportSheet,
      dom.settingsSheet,
      dom.helpSheet,
      dom.cameraSheet,
      dom.liveCaptureModal,
      dom.reportIssueSheet
    ].filter(Boolean);
  }

  function hasActiveModal() {
    return getManagedModals().some((entry) => entry.classList.contains('active'));
  }

  function syncBodyModalState() {
    const active = hasActiveModal();
    document.body.style.overflow = active ? 'hidden' : '';
    document.body.classList.toggle('modal-open', active);
  }

  function openModal(el, origin = document.activeElement) {
    if (!el) return;
    if (state.activeModal && state.activeModal !== el) {
      closeModal(state.activeModal);
    }
    state.modalFocusOrigin = origin || null;
    state.activeModal = el;
    el.setAttribute('role', el.getAttribute('role') || 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');
    syncBodyModalState();
    const focusable = getFocusableIn(el);
    if (focusable.length) {
      window.setTimeout(() => focusable[0].focus(), 0);
    }
  }

  function closeModal(el) {
    if (!el) return;
    if (el === dom.liveCaptureModal && typeof stopLiveCaptureStream === 'function') {
      stopLiveCaptureStream();
    }
    el.classList.remove('active');
    el.setAttribute('aria-hidden', 'true');
    if (state.activeModal === el) {
      state.activeModal = null;
    }
    syncBodyModalState();
    if (state.modalFocusOrigin && typeof state.modalFocusOrigin.focus === 'function') {
      state.modalFocusOrigin.focus();
    }
    state.modalFocusOrigin = null;
  }

  return {
    getFocusableIn,
    openModal,
    closeModal
  };
}
