const DOUBLE_ACTIVATION_DELAY = 280;
const DOUBLE_ACTIVATION_DISTANCE = 28;
const TOUCH_CLICK_IGNORE_WINDOW = 700;

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
}

function requestDocumentFullscreen() {
  const root = document.documentElement;
  if (root.requestFullscreen) return root.requestFullscreen();
  if (root.webkitRequestFullscreen) return root.webkitRequestFullscreen();
  if (root.msRequestFullscreen) return root.msRequestFullscreen();
  return Promise.reject(new Error('Fullscreen API not supported'));
}

function exitDocumentFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
  return Promise.reject(new Error('Fullscreen exit not supported'));
}

async function toggleDocumentFullscreen() {
  try {
    if (getFullscreenElement()) {
      await exitDocumentFullscreen();
      return;
    }
    await requestDocumentFullscreen();
  } catch (error) {}
}

function shouldIgnoreTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [data-no-fullscreen-gesture]'));
}

function createActivationTracker() {
  return { time: 0, x: 0, y: 0 };
}

function isDoubleActivation(tracker, x, y) {
  const now = Date.now();
  const dx = Math.abs(x - tracker.x);
  const dy = Math.abs(y - tracker.y);
  const matched = (now - tracker.time) <= DOUBLE_ACTIVATION_DELAY
    && dx <= DOUBLE_ACTIVATION_DISTANCE
    && dy <= DOUBLE_ACTIVATION_DISTANCE;

  tracker.time = now;
  tracker.x = x;
  tracker.y = y;

  if (!matched) return false;

  tracker.time = 0;
  tracker.x = 0;
  tracker.y = 0;
  return true;
}

if (!window.__portfolioFullscreenGestureInitialized) {
  window.__portfolioFullscreenGestureInitialized = true;

  if (document.body && !document.body.style.touchAction) {
    document.body.style.touchAction = 'manipulation';
  }

  const desktopTracker = createActivationTracker();
  const touchTracker = createActivationTracker();
  let lastTouchTimestamp = 0;

  document.addEventListener('click', (event) => {
    if ((Date.now() - lastTouchTimestamp) <= TOUCH_CLICK_IGNORE_WINDOW) return;
    if (shouldIgnoreTarget(event.target)) return;

    const x = typeof event.clientX === 'number' ? event.clientX : 0;
    const y = typeof event.clientY === 'number' ? event.clientY : 0;
    if (!isDoubleActivation(desktopTracker, x, y)) return;
    toggleDocumentFullscreen();
  }, true);

  document.addEventListener('touchend', (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    if (shouldIgnoreTarget(event.target)) return;

    lastTouchTimestamp = Date.now();
    if (!isDoubleActivation(touchTracker, touch.clientX, touch.clientY)) return;

    event.preventDefault();
    toggleDocumentFullscreen();
  }, { passive: false, capture: true });
}
